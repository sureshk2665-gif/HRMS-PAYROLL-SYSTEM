import { Request } from 'express';
import { prisma } from '../config/prisma';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED';

interface LogAuditParams {
  req: Request;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  changes?: Record<string, { before: any; after: any }> | null;
  // Overrides for events where req.user isn't populated yet (e.g. login,
  // login failure) — the actor is the person attempting to log in, not
  // whoever req.user might resolve to (which is nobody, pre-auth).
  actorUserId?: number | null;
  actorUsername?: string;
}

/**
 * Records one audit log entry. Called explicitly at the point of mutation
 * in each controller rather than via generic middleware — Express has no
 * built-in way to know what a request is about to change without the
 * controller's own DB read, so the controller is the only place that
 * actually has "before" and "after" in hand at the same time.
 *
 * Never throws: a logging failure should never block the actual business
 * operation it's describing. Errors are swallowed and logged to the
 * console instead.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    const { req, action, entityType, entityId, description, changes, actorUserId, actorUsername } = params;
    await prisma.auditLog.create({
      data: {
        userId: actorUserId !== undefined ? actorUserId : req.user?.userId ?? null,
        username: actorUsername ?? req.user?.username ?? 'unknown',
        action,
        entityType,
        entityId: String(entityId),
        description,
        changes: changes ? (changes as any) : undefined,
        ipAddress: req.ip || req.socket.remoteAddress || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log (operation still succeeded):', err);
  }
}

/**
 * Compares two plain objects field-by-field and returns only the fields
 * that actually changed, in { field: { before, after } } shape. Used by
 * every UPDATE audit call so the log records exactly what moved rather
 * than a full before/after snapshot of the whole row (which would bury
 * the actual change in noise for wide tables like Employee).
 *
 * Fields present in `ignoreKeys` (e.g. updatedAt, passwordHash) are never
 * included, even if they differ.
 */
export function diffFields(
  before: Record<string, any>,
  after: Record<string, any>,
  ignoreKeys: string[] = []
): Record<string, { before: any; after: any }> {
  const changes: Record<string, { before: any; after: any }> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (ignoreKeys.includes(key)) continue;

    const beforeVal = normalizeForCompare(before[key]);
    const afterVal = normalizeForCompare(after[key]);

    if (beforeVal !== afterVal) {
      changes[key] = { before: before[key] ?? null, after: after[key] ?? null };
    }
  }

  return changes;
}

function normalizeForCompare(value: any): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  // Prisma Decimal fields stringify consistently via toString(); plain
  // numbers/strings/booleans are covered by the default String() below.
  return String(value);
}
