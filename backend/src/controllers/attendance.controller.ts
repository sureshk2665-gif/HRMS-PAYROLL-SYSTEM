import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { computeAttendanceSummaryForAll } from '../services/leaveRules.service';
import { logAudit } from '../services/audit.service';

function parseDateOnly(value: string): Date {
  // Store as a UTC date-only value so timezone drift never shifts which
  // calendar day an attendance record belongs to.
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const markAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  entries: z
    .array(
      z.object({
        employeeId: z.number().int(),
        attendanceStatusCode: z.string().min(1),
        remarks: z.string().optional().nullable(),
      })
    )
    .min(1, 'At least one attendance entry is required'),
});

/** GET /api/attendance/statuses — lookup list for the frontend dropdown */
export async function listAttendanceStatuses(_req: Request, res: Response) {
  const statuses = await prisma.attendanceStatus.findMany({ orderBy: { id: 'asc' } });
  res.json({ statuses });
}

/** GET /api/attendance/leave-types — lookup list, policy reference */
export async function listLeaveTypes(_req: Request, res: Response) {
  const leaveTypes = await prisma.leaveTypes.findMany({ orderBy: { id: 'asc' } });
  res.json({ leaveTypes });
}

/**
 * GET /api/attendance?date=YYYY-MM-DD
 * Returns every active employee alongside their attendance status for that
 * date (if any has been marked yet) — this is what the daily marking screen
 * renders. Employees with no record yet come back with `status: null` so
 * the frontend can default them to "Present" without lying about DB state.
 */
export async function getAttendanceForDate(req: Request, res: Response) {
  const dateParam = req.query.date as string | undefined;
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return res.status(400).json({ error: 'Query param "date" is required in YYYY-MM-DD format' });
  }
  const date = parseDateOnly(dateParam);

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, department: { select: { name: true } } },
  });

  const records = await prisma.attendance.findMany({
    where: { date, employeeId: { in: employees.map((e) => e.id) } },
    include: { attendanceStatus: true },
  });
  const recordByEmployee = new Map(records.map((r) => [r.employeeId, r]));

  const result = employees.map((e) => {
    const record = recordByEmployee.get(e.id);
    return {
      employeeId: e.id,
      code: e.code,
      name: e.name,
      department: e.department?.name ?? null,
      attendanceStatusCode: record?.attendanceStatus.code ?? null,
      remarks: record?.remarks ?? null,
    };
  });

  res.json({ date: dateParam, employees: result });
}

/**
 * POST /api/attendance
 * Bulk upsert: one call saves the whole day's sheet. Uses the unique
 * (employeeId, date) constraint from the schema, so re-saving the same
 * date always updates rather than duplicating rows — this is how
 * "attendance can be edited later" from the spec is satisfied.
 */
export async function markAttendance(req: Request, res: Response) {
  const parsed = markAttendanceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { date: dateStr, entries } = parsed.data;
  const date = parseDateOnly(dateStr);

  const statusCodes = [...new Set(entries.map((e) => e.attendanceStatusCode))];
  const statuses = await prisma.attendanceStatus.findMany({ where: { code: { in: statusCodes } } });
  const statusByCode = new Map(statuses.map((s) => [s.code, s]));

  const invalidCode = statusCodes.find((c) => !statusByCode.has(c));
  if (invalidCode) {
    return res.status(400).json({ error: `Unknown attendance status code: ${invalidCode}` });
  }

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: entry.employeeId, date } },
        update: {
          attendanceStatusId: statusByCode.get(entry.attendanceStatusCode)!.id,
          remarks: entry.remarks || null,
        },
        create: {
          employeeId: entry.employeeId,
          date,
          attendanceStatusId: statusByCode.get(entry.attendanceStatusCode)!.id,
          remarks: entry.remarks || null,
        },
      })
    )
  );

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'Attendance',
    entityId: dateStr,
    description: `Marked attendance for ${results.length} employee(s) on ${dateStr}`,
  });

  res.json({ message: `Attendance saved for ${dateStr}`, count: results.length });
}

/**
 * GET /api/attendance/report?year=2026&month=6
 * Monthly grid: every active employee x every marked date that month,
 * plus a payable-days summary per employee via the leave rules engine.
 */
export async function getMonthlyAttendanceReport(req: Request, res: Response) {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Query params "year" and "month" (1-12) are required' });
  }

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
  const employeeIds = employees.map((e) => e.id);

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const records = await prisma.attendance.findMany({
    where: { employeeId: { in: employeeIds }, date: { gte: startDate, lt: endDate } },
    include: { attendanceStatus: true },
    orderBy: { date: 'asc' },
  });

  // Build a per-employee, per-date grid: { employeeId: { 'YYYY-MM-DD': statusCode } }
  const grid: Record<number, Record<string, string>> = {};
  for (const id of employeeIds) grid[id] = {};
  for (const r of records) {
    const dateKey = r.date.toISOString().slice(0, 10);
    grid[r.employeeId][dateKey] = r.attendanceStatus.code;
  }

  const summaries = await computeAttendanceSummaryForAll(employeeIds, year, month);

  res.json({
    year,
    month,
    employees: employees.map((e) => ({
      employeeId: e.id,
      code: e.code,
      name: e.name,
      attendance: grid[e.id],
      summary: summaries.get(e.id),
    })),
  });
}
