import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

// Only these statuses make sense as something an employee would "request" —
// Present/Holiday/Weekly Off/Work From Home aren't requestable leave types.
const REQUESTABLE_LEAVE_CODES = [
  'CASUAL_LEAVE',
  'SICK_LEAVE',
  'PAID_LEAVE',
  'MATERNITY_LEAVE',
  'PATERNITY_LEAVE',
  'PERMISSION',
];

async function findEmployeeByToken(code: string, token: string) {
  const employee = await prisma.employee.findUnique({ where: { code } });
  if (!employee || !employee.leaveRequestToken || employee.leaveRequestToken !== token) {
    return null;
  }
  return employee;
}

/**
 * GET /api/public/leave-requests/:code/:token
 * Confirms the link is valid, returns the employee's name (for a "Hi,
 * <name>" confirmation on the form), the requestable leave types, and
 * their own past requests so they can see what's pending/approved/rejected
 * without needing any login.
 */
export async function getPublicLeaveRequestForm(req: Request, res: Response) {
  const { code, token } = req.params;
  const employee = await findEmployeeByToken(code, token);
  if (!employee) {
    return res.status(404).json({ error: 'This link is invalid or has expired. Please ask HR for a new one.' });
  }

  const [leaveTypes, myRequests] = await Promise.all([
    prisma.attendanceStatus.findMany({
      where: { code: { in: REQUESTABLE_LEAVE_CODES } },
      orderBy: { id: 'asc' },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  res.json({
    employeeName: employee.name,
    employeeCode: employee.code,
    leaveTypes: leaveTypes.map((s) => ({ code: s.code, label: s.label })),
    myRequests,
  });
}

const submitSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  leaveTypeCode: z.enum(REQUESTABLE_LEAVE_CODES as [string, ...string[]]),
  reason: z.string().trim().min(1, 'Please provide a reason').max(1000),
});

/**
 * POST /api/public/leave-requests/:code/:token
 * Submits a new leave request. Always created as PENDING — the employee
 * has no way to approve their own request, only a Manager/HR Staff user
 * can via the admin-side review endpoint.
 */
export async function submitPublicLeaveRequest(req: Request, res: Response) {
  const { code, token } = req.params;
  const employee = await findEmployeeByToken(code, token);
  if (!employee) {
    return res.status(404).json({ error: 'This link is invalid or has expired. Please ask HR for a new one.' });
  }

  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { startDate, endDate, leaveTypeCode, reason } = parsed.data;

  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'End date cannot be before start date' });
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      startDate: new Date(startDate + 'T00:00:00'),
      endDate: new Date(endDate + 'T00:00:00'),
      leaveTypeCode,
      reason,
      status: 'PENDING',
    },
  });

  res.status(201).json({ message: 'Your leave request has been submitted for review.', request });
}
