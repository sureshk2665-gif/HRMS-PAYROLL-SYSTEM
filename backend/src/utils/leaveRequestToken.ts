import crypto from 'crypto';

/** Generates a URL-safe random token for an employee's public leave-request link. */
export function generateLeaveRequestToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}
