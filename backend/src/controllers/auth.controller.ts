import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { signUserToken, UserRole } from '../utils/jwt';
import { logAudit } from '../services/audit.service';
import { getEffectivePermissions } from '../services/permission.service';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/** POST /api/auth/login */
export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { username, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    await logAudit({
      req, action: 'LOGIN_FAILED', entityType: 'Auth', entityId: username,
      description: `Failed login attempt for unknown username "${username}"`,
      actorUserId: null, actorUsername: username,
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  if (!user.isActive) {
    await logAudit({
      req, action: 'LOGIN_FAILED', entityType: 'Auth', entityId: username,
      description: `Login attempt on deactivated account "${username}"`,
      actorUserId: user.id, actorUsername: user.username,
    });
    return res.status(403).json({ error: 'This account has been deactivated. Contact your manager.' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    await logAudit({
      req, action: 'LOGIN_FAILED', entityType: 'Auth', entityId: username,
      description: `Failed login attempt (wrong password) for "${username}"`,
      actorUserId: user.id, actorUsername: user.username,
    });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signUserToken({ userId: user.id, username: user.username, role: user.role as UserRole });
  const permissions = await getEffectivePermissions(user.id, user.role as UserRole);

  await logAudit({
    req, action: 'LOGIN', entityType: 'Auth', entityId: username,
    description: `${user.username} logged in`,
    actorUserId: user.id, actorUsername: user.username,
  });

  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role, permissions },
  });
}

/** POST /api/auth/logout — stateless JWT, exists for symmetry/future blacklisting */
export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logged out successfully' });
}

/** GET /api/auth/me */
export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const permissions = await getEffectivePermissions(user.id, user.role as UserRole);
  res.json({ user: { ...user, permissions } });
}

/** POST /api/auth/change-password — any logged-in user can change their own password */
export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentMatches) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  await logAudit({
    req, action: 'UPDATE', entityType: 'User', entityId: String(user.id),
    description: `${user.username} changed their own password`,
  });

  res.json({ message: 'Password updated successfully' });
}

// ---- User management (MANAGER only) ----

const createUserSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ACCOUNTANT', 'HR_STAFF']), // Managers create staff accounts, never other managers via this endpoint
});

/** GET /api/auth/users — list all user accounts (MANAGER only) */
export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
  });
  res.json({ users });
}

/** POST /api/auth/users — create an ACCOUNTANT or HR_STAFF account (MANAGER only) */
export async function createUser(req: Request, res: Response) {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { username, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'A user with this username already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, passwordHash, role, createdById: req.user!.userId },
    select: { id: true, username: true, role: true, isActive: true, createdAt: true },
  });

  await logAudit({
    req, action: 'CREATE', entityType: 'User', entityId: String(user.id),
    description: `Created ${role} account "${username}"`,
  });

  res.status(201).json({ user });
}

/** PATCH /api/auth/users/:id/status — activate/deactivate an account (MANAGER only) */
export async function setUserActiveStatus(req: Request, res: Response) {
  const id = Number(req.params.id);
  const schema = z.object({ isActive: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'MANAGER') {
    return res.status(403).json({ error: 'Cannot deactivate a manager account' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, username: true, role: true, isActive: true },
  });

  await logAudit({
    req, action: 'UPDATE', entityType: 'User', entityId: String(id),
    description: `${updated.isActive ? 'Activated' : 'Deactivated'} account "${updated.username}"`,
    changes: { isActive: { before: target.isActive, after: updated.isActive } },
  });

  res.json({ user: updated });
}

/** POST /api/auth/users/:id/reset-password — MANAGER sets a new password for a staff account */
export async function resetUserPassword(req: Request, res: Response) {
  const id = Number(req.params.id);
  const schema = z.object({ newPassword: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'MANAGER') {
    return res.status(403).json({ error: 'Use Change Password for your own manager account' });
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  await logAudit({
    req, action: 'UPDATE', entityType: 'User', entityId: String(id),
    description: `Reset password for account "${target.username}"`,
  });

  res.json({ message: 'Password reset successfully' });
}

/** DELETE /api/auth/users/:id — remove a staff account (MANAGER only) */
export async function deleteUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'MANAGER') {
    return res.status(403).json({ error: 'Cannot delete a manager account' });
  }

  await prisma.user.delete({ where: { id } });

  await logAudit({
    req, action: 'DELETE', entityType: 'User', entityId: String(id),
    description: `Deleted ${target.role} account "${target.username}"`,
  });

  res.json({ message: 'User deleted' });
}
