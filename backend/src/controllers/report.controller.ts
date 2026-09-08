import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { computeAttendanceSummaryForAll } from '../services/leaveRules.service';
import { exportToExcel, exportToPdfTable, ReportColumn } from '../services/reportExport.service';
import { hasPermission } from '../services/permission.service';

const formatSchema = z.enum(['json', 'xlsx', 'pdf']).default('json');
const monthYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

function n(v: any): number {
  return v === null || v === undefined ? 0 : Number(v);
}

/**
 * Shared responder: sends JSON, or streams an xlsx/pdf export, for any
 * report. The route only requires `reports.view` (checked by
 * report.routes.ts before any of these handlers run) — exporting a file is
 * a separate, more sensitive action, so `reports.export` is checked here
 * specifically for the xlsx/pdf paths rather than gating the whole route.
 */
async function respondWithReport(
  req: Request,
  res: Response,
  reportTitle: string,
  filenameBase: string,
  columns: ReportColumn[],
  rows: Record<string, any>[]
) {
  const format = formatSchema.parse(req.query.format);

  if (format === 'xlsx' || format === 'pdf') {
    const canExport = await hasPermission(req.user!.userId, req.user!.role, 'reports.export');
    if (!canExport) {
      return res.status(403).json({ error: 'You do not have permission to export reports' });
    }
  }

  if (format === 'xlsx') {
    const buffer = await exportToExcel(reportTitle, columns, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
    return res.send(buffer);
  }

  if (format === 'pdf') {
    const buffer = await exportToPdfTable(reportTitle, columns, rows);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filenameBase}.pdf"`);
    return res.send(buffer);
  }

  res.json({ title: reportTitle, columns, rows });
}

/** GET /api/reports/employees?format= */
export async function employeeReport(req: Request, res: Response) {
  const employees = await prisma.employee.findMany({
    include: { department: true },
    orderBy: { code: 'asc' },
  });

  const columns: ReportColumn[] = [
    { key: 'code', header: 'Code', width: 12 },
    { key: 'name', header: 'Name', width: 24 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'designation', header: 'Designation', width: 18 },
    { key: 'status', header: 'Status', width: 12 },
    { key: 'mobile', header: 'Mobile', width: 16 },
    { key: 'joiningDate', header: 'Joining Date', width: 14 },
  ];

  const rows = employees.map((e) => ({
    code: e.code,
    name: e.name,
    department: e.department?.name ?? '-',
    designation: e.designation ?? '-',
    status: e.status,
    mobile: e.mobile ?? '-',
    joiningDate: e.joiningDate ? e.joiningDate.toISOString().slice(0, 10) : '-',
  }));

  await respondWithReport(req, res, 'Employee Report', 'employee_report', columns, rows);
}

/** GET /api/reports/departments?format= */
export async function departmentReport(req: Request, res: Response) {
  const departments = await prisma.department.findMany({
    include: { _count: { select: { employees: true } } },
    orderBy: { name: 'asc' },
  });

  const columns: ReportColumn[] = [
    { key: 'name', header: 'Department', width: 24 },
    { key: 'employeeCount', header: 'Employees', width: 14, align: 'right' },
  ];

  const rows = departments.map((d) => ({ name: d.name, employeeCount: d._count.employees }));

  await respondWithReport(req, res, 'Department Report', 'department_report', columns, rows);
}

/** GET /api/reports/attendance?year=&month=&format= */
export async function attendanceReport(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { year, month } = parsed.data;

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
  const summaries = await computeAttendanceSummaryForAll(employees.map((e) => e.id), year, month);

  const columns: ReportColumn[] = [
    { key: 'code', header: 'Code', width: 12 },
    { key: 'name', header: 'Name', width: 22 },
    { key: 'present', header: 'Present', width: 10, align: 'right' },
    { key: 'halfDay', header: 'Half Day', width: 10, align: 'right' },
    { key: 'lop', header: 'LOP', width: 8, align: 'right' },
    { key: 'payableDays', header: 'Payable Days', width: 14, align: 'right' },
  ];

  const rows = employees.map((e) => {
    const s = summaries.get(e.id)!;
    return {
      code: e.code,
      name: e.name,
      present: s.breakdown['PRESENT'] || 0,
      halfDay: s.halfDays,
      lop: s.lopDays,
      payableDays: s.payableDays,
    };
  });

  await respondWithReport(req, res, `Attendance Report — ${month}/${year}`, `attendance_report_${year}_${month}`, columns, rows);
}

/** GET /api/reports/payroll?year=&month=&format= */
export async function payrollReport(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { year, month } = parsed.data;

  const rows = await prisma.payroll.findMany({
    where: { year, month },
    include: { employee: { include: { department: true } } },
    orderBy: { employee: { code: 'asc' } },
  });

  const columns: ReportColumn[] = [
    { key: 'code', header: 'Code', width: 12 },
    { key: 'name', header: 'Name', width: 22 },
    { key: 'department', header: 'Department', width: 16 },
    { key: 'daysWorking', header: 'Days Worked', width: 12, align: 'right' },
    { key: 'lopDays', header: 'LOP', width: 8, align: 'right' },
    { key: 'earningsTotal', header: 'Earnings', width: 12, align: 'right' },
    { key: 'deductionsTotal', header: 'Deductions', width: 12, align: 'right' },
    { key: 'netSalary', header: 'Net Salary', width: 12, align: 'right' },
  ];

  const reportRows = rows.map((r) => ({
    code: r.employee.code,
    name: r.employee.name,
    department: r.employee.department?.name ?? '-',
    daysWorking: n(r.daysWorking),
    lopDays: n(r.lopDays),
    earningsTotal: n(r.earningsTotal),
    deductionsTotal: n(r.deductionsTotal),
    netSalary: n(r.netSalary),
  }));

  await respondWithReport(req, res, `Payroll Report — ${month}/${year}`, `payroll_report_${year}_${month}`, columns, reportRows);
}

/**
 * GET /api/reports/salary?format=
 * Distinct from the Payroll Report: this shows each employee's current
 * configured salary structure (the "scale"), not a specific month's
 * generated/prorated payroll — useful for salary review / audit purposes.
 */
export async function salaryReport(req: Request, res: Response) {
  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
  });

  const columns: ReportColumn[] = [
    { key: 'code', header: 'Code', width: 12 },
    { key: 'name', header: 'Name', width: 22 },
    { key: 'basic', header: 'Basic', width: 10, align: 'right' },
    { key: 'hra', header: 'HRA', width: 10, align: 'right' },
    { key: 'conveyance', header: 'Conveyance', width: 10, align: 'right' },
    { key: 'other', header: 'Other Allow.', width: 10, align: 'right' },
    { key: 'grossScale', header: 'Gross (Scale)', width: 12, align: 'right' },
  ];

  const rows = employees.map((e) => {
    const grossScale =
      n(e.basic) + n(e.hra) + n(e.da) + n(e.specialAllow) + n(e.medicalAllow) + n(e.conveyance) + n(e.washingAllow);
    return {
      code: e.code,
      name: e.name,
      basic: n(e.basic),
      hra: n(e.hra),
      conveyance: n(e.conveyance),
      other: n(e.otherAllow),
      grossScale,
    };
  });

  await respondWithReport(req, res, 'Salary Report', 'salary_report', columns, rows);
}

/** GET /api/reports/leave?year=&month=&format= — leave-type usage per employee */
export async function leaveReport(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { year, month } = parsed.data;

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true, elBalance: true, clBalance: true },
  });
  const summaries = await computeAttendanceSummaryForAll(employees.map((e) => e.id), year, month);

  const columns: ReportColumn[] = [
    { key: 'code', header: 'Code', width: 12 },
    { key: 'name', header: 'Name', width: 22 },
    { key: 'casualLeave', header: 'Casual Leave', width: 12, align: 'right' },
    { key: 'sickLeave', header: 'Sick Leave', width: 12, align: 'right' },
    { key: 'paidLeave', header: 'Paid Leave', width: 12, align: 'right' },
    { key: 'lop', header: 'LOP Days', width: 10, align: 'right' },
    { key: 'elBalance', header: 'EL Balance', width: 10, align: 'right' },
    { key: 'clBalance', header: 'CL Balance', width: 10, align: 'right' },
  ];

  const rows = employees.map((e) => {
    const s = summaries.get(e.id)!;
    return {
      code: e.code,
      name: e.name,
      casualLeave: s.breakdown['CASUAL_LEAVE'] || 0,
      sickLeave: s.breakdown['SICK_LEAVE'] || 0,
      paidLeave: s.breakdown['PAID_LEAVE'] || 0,
      lop: s.lopDays,
      elBalance: n(e.elBalance),
      clBalance: n(e.clBalance),
    };
  });

  await respondWithReport(req, res, `Leave Report — ${month}/${year}`, `leave_report_${year}_${month}`, columns, rows);
}
