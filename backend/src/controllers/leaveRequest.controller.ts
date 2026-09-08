import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logAudit } from '../services/audit.service';

/** GET /api/leave-requests?status=PENDING — list, newest first */
export async function listLeaveRequests(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const where = status ? { status: status as any } : {};

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { code: true, name: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ requests });
}

function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNote: z.string().trim().max(1000).optional().nullable(),
});

/**
 * POST /api/leave-requests/:id/review
 * Approving a request writes/overwrites an Attendance row for every date
 * in the range using the requested leave type — the same leave rules
 * engine (via AttendanceStatus.payFraction) that governs manually marked
 * attendance then applies automatically to these days too, so an approved
 * leave request flows straight into payroll without any extra step.
 * Rejecting just records the decision; no Attendance rows are touched.
 */
export async function reviewLeaveRequest(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { status, reviewNote } = parsed.data;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!request) return res.status(404).json({ error: 'Leave request not found' });
  if (request.status !== 'PENDING') {
    return res.status(409).json({ error: `This request was already ${request.status.toLowerCase()}` });
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      reviewNote: reviewNote || null,
      reviewedById: req.user!.userId,
      reviewedByName: req.user!.username,
      reviewedAt: new Date(),
    },
  });

  if (status === 'APPROVED') {
    const attendanceStatus = await prisma.attendanceStatus.findUnique({ where: { code: request.leaveTypeCode } });
    if (attendanceStatus) {
      const dates = dateRange(request.startDate, request.endDate);
      await prisma.$transaction(
        dates.map((date) =>
          prisma.attendance.upsert({
            where: { employeeId_date: { employeeId: request.employeeId, date } },
            update: { attendanceStatusId: attendanceStatus.id, remarks: `Approved leave request #${id}` },
            create: {
              employeeId: request.employeeId,
              date,
              attendanceStatusId: attendanceStatus.id,
              remarks: `Approved leave request #${id}`,
            },
          })
        )
      );
    }
  }

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'LeaveRequest',
    entityId: String(id),
    description: `${status === 'APPROVED' ? 'Approved' : 'Rejected'} leave request for ${request.employee.name} (${request.employee.code}), ${request.leaveTypeCode}, ${request.startDate.toISOString().slice(0, 10)} to ${request.endDate.toISOString().slice(0, 10)}`,
  });

  res.json({ request: updated });
}
