import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const querySchema = z.object({
  entityType: z.string().optional(),
  username: z.string().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGIN_FAILED']).optional(),
  fromDate: z.string().optional(), // YYYY-MM-DD
  toDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/audit-logs — MANAGER only. Filterable by entity type, username,
 * action, and date range; paginated since this table only grows.
 */
export async function listAuditLogs(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { entityType, username, action, fromDate, toDate, page, pageSize } = parsed.data;

  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (username) where.username = { contains: username };
  if (action) where.action = action;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate + 'T00:00:00');
    if (toDate) where.createdAt.lte = new Date(toDate + 'T23:59:59');
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** GET /api/audit-logs/entity-types — distinct entity types seen so far, for the filter dropdown */
export async function listAuditEntityTypes(_req: Request, res: Response) {
  const rows = await prisma.auditLog.findMany({
    distinct: ['entityType'],
    select: { entityType: true },
    orderBy: { entityType: 'asc' },
  });
  res.json({ entityTypes: rows.map((r) => r.entityType) });
}
