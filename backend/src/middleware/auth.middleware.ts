import { Request, Response, NextFunction } from 'express';
import { verifyUserToken, UserTokenPayload, UserRole } from '../utils/jwt';
import { prisma } from '../config/prisma';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

/**
 * Protects a route: requires a valid `Authorization: Bearer <token>` header.
 * Also re-checks the account is still active on every request — if a
 * MANAGER deactivates someone mid-session, their existing token stops
 * working on the very next request instead of staying valid until expiry.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const payload = verifyUserToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account is inactive or no longer exists' });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restricts a route to specific roles. Must run after `requireAuth`.
 * Usage: router.post('/users', requireAuth, requireRole('MANAGER'), createUser)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}
