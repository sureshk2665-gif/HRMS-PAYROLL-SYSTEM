import { prisma } from '../config/prisma';

export interface AttendanceSummary {
  employeeId: number;
  totalDaysMarked: number;
  payableDays: number; // sum of payFraction across all marked days
  breakdown: Record<string, number>; // statusCode -> count of days
  lopDays: number; // days with payFraction === 0
  halfDays: number; // days with payFraction === 0.5 (and payRuleType HALF_PAY)
}

/**
 * Core of the leave rules engine: given an employee and a month, reads every
 * Attendance row for that period and reduces it to payable days using each
 * status's `payFraction` (1.0 = full pay, 0.5 = half pay, 0 = no pay).
 *
 * This is intentionally data-driven off `AttendanceStatus` rather than a
 * hardcoded switch statement — adding a new leave type or changing a pay
 * rule only requires an update to that table, not a code change. The
 * payroll engine (Step 5) calls this directly instead of re-deriving it.
 */
export async function computeAttendanceSummary(
  employeeId: number,
  year: number,
  month: number // 1-12
): Promise<AttendanceSummary> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1)); // first day of next month (exclusive)

  const records = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lt: endDate },
    },
    include: { attendanceStatus: true },
  });

  const breakdown: Record<string, number> = {};
  let payableDays = 0;
  let lopDays = 0;
  let halfDays = 0;

  for (const record of records) {
    const status = record.attendanceStatus;
    const fraction = Number(status.payFraction);

    breakdown[status.code] = (breakdown[status.code] || 0) + 1;
    payableDays += fraction;

    if (status.payRuleType === 'NO_PAY') lopDays += 1;
    if (status.payRuleType === 'HALF_PAY') halfDays += 1;
  }

  return {
    employeeId,
    totalDaysMarked: records.length,
    payableDays: Math.round(payableDays * 100) / 100,
    breakdown,
    lopDays,
    halfDays,
  };
}

/**
 * Bulk version — used by the monthly attendance report and by payroll
 * generation (Step 5) so every active employee's summary is computed in
 * one pass instead of N+1 queries.
 */
export async function computeAttendanceSummaryForAll(
  employeeIds: number[],
  year: number,
  month: number
): Promise<Map<number, AttendanceSummary>> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const records = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employeeIds },
      date: { gte: startDate, lt: endDate },
    },
    include: { attendanceStatus: true },
  });

  const map = new Map<number, AttendanceSummary>();
  for (const id of employeeIds) {
    map.set(id, { employeeId: id, totalDaysMarked: 0, payableDays: 0, breakdown: {}, lopDays: 0, halfDays: 0 });
  }

  for (const record of records) {
    const summary = map.get(record.employeeId)!;
    const status = record.attendanceStatus;
    const fraction = Number(status.payFraction);

    summary.breakdown[status.code] = (summary.breakdown[status.code] || 0) + 1;
    summary.payableDays = Math.round((summary.payableDays + fraction) * 100) / 100;
    if (status.payRuleType === 'NO_PAY') summary.lopDays += 1;
    if (status.payRuleType === 'HALF_PAY') summary.halfDays += 1;
    summary.totalDaysMarked += 1;
  }

  return map;
}
