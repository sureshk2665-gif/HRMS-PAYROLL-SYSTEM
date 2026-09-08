import jwt from 'jsonwebtoken';

export type UserRole = 'MANAGER' | 'ACCOUNTANT' | 'HR_STAFF';

export interface UserTokenPayload {
  userId: number;
  username: string;
  role: UserRole;
}

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  console.warn('WARNING: JWT_SECRET is not set in the environment. Set it in .env before running in production.');
}

export function signUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET || 'dev-only-insecure-secret', {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyUserToken(token: string): UserTokenPayload {
  return jwt.verify(token, JWT_SECRET || 'dev-only-insecure-secret') as UserTokenPayload;
}
