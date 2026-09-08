import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

function n(v: any): number {
  return v === null || v === undefined ? 0 : Number(v);
}
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * GET /api/dashboard/summary
 * One aggregated call for everything the dashboard needs, rather than the
 * frontend firing 6-7 separate requests on load.
 */
export async function getDashboardSummary(_req: Request, res: Response) {
  const today = todayUTC();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [totalEmployees, activeEmployees, todayAttendance, monthPayroll, recentEmployees, allActiveWithDob] =
    await Promise.all([
      prisma.employee.count(),
      prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } }),
      prisma.attendance.findMany({
        where: { date: today },
        include: { attendanceStatus: true },
      }),
      prisma.payroll.findMany({ where: { year, month }, select: { netSalary: true } }),
      prisma.employee.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, code: true, name: true, status: true, department: { select: { name: true } } },
      }),
      prisma.employee.findMany({
        where: { status: 'ACTIVE', dob: { not: null } },
        select: { id: true, code: true, name: true, dob: true },
      }),
    ]);

  // ---- Today's attendance breakdown ----
  const attendanceByStatus: Record<string, number> = {};
  todayAttendance.forEach((a) => {
    attendanceByStatus[a.attendanceStatus.code] = (attendanceByStatus[a.attendanceStatus.code] || 0) + 1;
  });
  const markedCount = todayAttendance.length;
  const activeCount = activeEmployees.length;
  const absentCount = Math.max(0, activeCount - markedCount);
  const presentCount = attendanceByStatus['PRESENT'] || 0;
  const attendancePercent = activeCount > 0 ? Math.round(((activeCount - absentCount) / activeCount) * 100) : 0;

  // ---- This month's salary expense ----
  const monthSalaryExpense = Math.round(monthPayroll.reduce((sum, p) => sum + n(p.netSalary), 0));

  // ---- Upcoming birthdays (next 5, sorted by days-until-next-birthday) ----
  const upcomingBirthdays = allActiveWithDob
    .map((e) => {
      const dob = e.dob!;
      const next = new Date(now.getFullYear(), dob.getUTCMonth(), dob.getUTCDate());
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(now.getFullYear() + 1);
      }
      return { code: e.code, name: e.name, nextBirthday: next.toISOString().slice(0, 10) };
    })
    .sort((a, b) => a.nextBirthday.localeCompare(b.nextBirthday))
    .slice(0, 5);

  res.json({
    totalEmployees,
    activeEmployees: activeCount,
    todayAttendance: {
      present: presentCount,
      absent: absentCount,
      halfDay: attendanceByStatus['HALF_DAY'] || 0,
      casualLeave: attendanceByStatus['CASUAL_LEAVE'] || 0,
      sickLeave: attendanceByStatus['SICK_LEAVE'] || 0,
      lossOfPay: attendanceByStatus['LOSS_OF_PAY'] || 0,
    },
    attendancePercent,
    monthSalaryExpense,
    monthLabel: `${month}/${year}`,
    upcomingBirthdays,
    recentEmployees: recentEmployees.map((e) => ({
      code: e.code,
      name: e.name,
      department: e.department?.name ?? null,
      status: e.status,
    })),
  });
}
