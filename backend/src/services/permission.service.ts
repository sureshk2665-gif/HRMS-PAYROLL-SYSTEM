import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { UserRole } from '../utils/jwt';

/**
 * Resolves whether a user can perform `permissionKey`, in this order:
 *   1. A UserPermissionOverride for this exact person, if one exists —
 *      always wins, whether it grants or revokes.
 *   2. The RolePermission default for their role.
 *   3. Deny (fail-closed) if neither is configured — an unconfigured
 *      permission should never silently allow access.
 */
export async function hasPermission(userId: number, role: UserRole, permissionKey: string): Promise<boolean> {
  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) return false; // unknown permission key — fail closed

  const override = await prisma.userPermissionOverride.findUnique({
    where: { userId_permissionId: { userId, permissionId: permission.id } },
  });
  if (override) return override.allowed;

  const rolePermission = await prisma.rolePermission.findUnique({
    where: { role_permissionId: { role, permissionId: permission.id } },
  });
  return rolePermission?.allowed ?? false;
}

/**
 * Returns every permission key this user currently has access to (after
 * applying their overrides on top of their role's defaults). Used by
 * GET /api/auth/me and login so the frontend can show/hide UI without
 * hardcoding role checks. A permission change takes effect for that
 * person on their next page load/refresh (when /me re-runs) — not
 * instantly mid-session, since the frontend doesn't poll for this.
 */
export async function getEffectivePermissions(userId: number, role: UserRole): Promise<string[]> {
  const [allPermissions, rolePermissions, overrides] = await Promise.all([
    prisma.permission.findMany(),
    prisma.rolePermission.findMany({ where: { role } }),
    prisma.userPermissionOverride.findMany({ where: { userId } }),
  ]);

  const roleAllowed = new Set(rolePermissions.filter((rp) => rp.allowed).map((rp) => rp.permissionId));
  const overrideMap = new Map(overrides.map((o) => [o.permissionId, o.allowed]));

  const effective: string[] = [];
  for (const perm of allPermissions) {
    const override = overrideMap.get(perm.id);
    const allowed = override !== undefined ? override : roleAllowed.has(perm.id);
    if (allowed) effective.push(perm.key);
  }
  return effective;
}

/**
 * Express middleware: requires the authenticated user to hold
 * `permissionKey`. Must run after `requireAuth` (needs req.user).
 * Usage: router.post('/', requireAuth, requirePermission('employees.create'), createEmployee)
 */
export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const allowed = await hasPermission(req.user.userId, req.user.role, permissionKey);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}
