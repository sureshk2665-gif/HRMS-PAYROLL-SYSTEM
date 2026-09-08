import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAudit } from '../services/audit.service';
import { getEffectivePermissions } from '../services/permission.service';

// The MANAGER role can never lose these two — otherwise it's possible for
// every manager account to end up unable to manage users/permissions at
// all, with no way back in short of editing the database directly.
const MANAGER_PROTECTED_KEYS = ['users.manage', 'permissions.manage'];

/** GET /api/permissions/catalog — every permission, grouped by category */
export async function listPermissionCatalog(_req: Request, res: Response) {
  const permissions = await prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  res.json({ permissions });
}

/** GET /api/permissions/roles — the full role x permission matrix */
export async function getRolePermissionMatrix(_req: Request, res: Response) {
  const [permissions, rolePermissions] = await Promise.all([
    prisma.permission.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] }),
    prisma.rolePermission.findMany(),
  ]);

  const matrix: Record<string, Record<string, boolean>> = {};
  for (const perm of permissions) {
    matrix[perm.key] = { MANAGER: false, ACCOUNTANT: false, HR_STAFF: false };
  }
  for (const rp of rolePermissions) {
    const perm = permissions.find((p) => p.id === rp.permissionId);
    if (perm) matrix[perm.key][rp.role] = rp.allowed;
  }

  res.json({ permissions, matrix });
}

const updateRolePermissionSchema = z.object({
  role: z.enum(['MANAGER', 'ACCOUNTANT', 'HR_STAFF']),
  permissionKey: z.string(),
  allowed: z.boolean(),
});

/** PUT /api/permissions/roles — toggle one (role, permission) cell in the matrix */
export async function updateRolePermission(req: Request, res: Response) {
  const parsed = updateRolePermissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { role, permissionKey, allowed } = parsed.data;

  if (role === 'MANAGER' && MANAGER_PROTECTED_KEYS.includes(permissionKey) && !allowed) {
    return res.status(403).json({
      error: `"${permissionKey}" cannot be removed from the Manager role — this prevents every manager account from being locked out of user/permission management.`,
    });
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) return res.status(404).json({ error: 'Unknown permission key' });

  const updated = await prisma.rolePermission.upsert({
    where: { role_permissionId: { role, permissionId: permission.id } },
    update: { allowed },
    create: { role, permissionId: permission.id, allowed },
  });

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'RolePermission',
    entityId: `${role}:${permissionKey}`,
    description: `${allowed ? 'Granted' : 'Revoked'} "${permissionKey}" for role ${role}`,
  });

  res.json({ rolePermission: updated });
}

/** GET /api/permissions/users/:id — a specific user's overrides + effective permission list */
export async function getUserPermissionOverrides(req: Request, res: Response) {
  const userId = Number(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const [overrides, effective] = await Promise.all([
    prisma.userPermissionOverride.findMany({
      where: { userId },
      include: { permission: true },
    }),
    getEffectivePermissions(userId, user.role as any),
  ]);

  res.json({
    user: { id: user.id, username: user.username, role: user.role },
    overrides: overrides.map((o) => ({
      permissionKey: o.permission.key,
      permissionLabel: o.permission.label,
      allowed: o.allowed,
      setByName: o.setByName,
      updatedAt: o.updatedAt,
    })),
    effectivePermissions: effective,
  });
}

const setOverrideSchema = z.object({
  permissionKey: z.string(),
  allowed: z.boolean().nullable(), // null = remove the override, fall back to role default
});

/** PUT /api/permissions/users/:id — grant/revoke/clear one permission override for this person */
export async function setUserPermissionOverride(req: Request, res: Response) {
  const userId = Number(req.params.id);
  const parsed = setOverrideSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { permissionKey, allowed } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'MANAGER' && MANAGER_PROTECTED_KEYS.includes(permissionKey) && allowed === false) {
    return res.status(403).json({
      error: `"${permissionKey}" cannot be revoked from a Manager account — this prevents locking them out of user/permission management.`,
    });
  }

  const permission = await prisma.permission.findUnique({ where: { key: permissionKey } });
  if (!permission) return res.status(404).json({ error: 'Unknown permission key' });

  if (allowed === null) {
    await prisma.userPermissionOverride
      .delete({ where: { userId_permissionId: { userId, permissionId: permission.id } } })
      .catch(() => {}); // no-op if there was no override to clear
  } else {
    await prisma.userPermissionOverride.upsert({
      where: { userId_permissionId: { userId, permissionId: permission.id } },
      update: { allowed, setById: req.user!.userId, setByName: req.user!.username },
      create: {
        userId,
        permissionId: permission.id,
        allowed,
        setById: req.user!.userId,
        setByName: req.user!.username,
      },
    });
  }

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'UserPermissionOverride',
    entityId: String(userId),
    description:
      allowed === null
        ? `Cleared permission override "${permissionKey}" for ${user.username} (back to role default)`
        : `${allowed ? 'Granted' : 'Revoked'} "${permissionKey}" specifically for ${user.username}`,
  });

  res.json({ message: 'Updated' });
}
