import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { isEmailConfigured } from '../services/email.service';
import { isSmsConfigured } from '../services/sms.service';

const querySchema = z.object({
  category: z.enum(['PAYSLIP', 'BIRTHDAY']).optional(),
  channel: z.enum(['EMAIL', 'SMS']).optional(),
  status: z.enum(['SENT', 'FAILED', 'SKIPPED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** GET /api/notifications/logs */
export async function listNotificationLogs(req: Request, res: Response) {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { category, channel, status, page, pageSize } = parsed.data;

  const where: any = {};
  if (category) where.category = category;
  if (channel) where.channel = channel;
  if (status) where.status = status;

  const [total, logs] = await Promise.all([
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Attach employee name/code for display (notificationLog only stores employeeId).
  const employeeIds = [...new Set(logs.map((l) => l.employeeId).filter((id): id is number => id !== null))];
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, code: true, name: true },
  });
  const employeeById = new Map(employees.map((e) => [e.id, e]));

  res.json({
    logs: logs.map((l) => ({ ...l, employee: l.employeeId ? employeeById.get(l.employeeId) ?? null : null })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** GET /api/notifications/config-status — whether SMTP/SMS are actually configured (for the Settings page) */
export async function getNotificationConfigStatus(_req: Request, res: Response) {
  res.json({
    emailConfigured: isEmailConfigured(),
    smsConfigured: isSmsConfigured(),
  });
}
