import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { generatePayrollForMonth } from '../services/payrollEngine.service';
import { logAudit } from '../services/audit.service';
import { emailPayslipToEmployee, emailAllPayslipsForMonth } from '../services/notification.service';

const monthYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/** POST /api/payroll/generate — { year, month } → generates/regenerates payroll for all active employees */
export async function generatePayroll(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const rows = await generatePayrollForMonth(year, month);

  await logAudit({
    req,
    action: 'CREATE',
    entityType: 'Payroll',
    entityId: `${year}-${month}`,
    description: `Generated payroll for ${rows.length} employee(s) for ${month}/${year}`,
  });

  res.json({ message: `Payroll generated for ${month}/${year}`, count: rows.length });
}

/** GET /api/payroll?year=&month= — payroll table for a month */
export async function getPayrollForMonth(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const rows = await prisma.payroll.findMany({
    where: { year, month },
    include: { employee: { select: { code: true, name: true, department: { select: { name: true } } } } },
    orderBy: { employee: { code: 'asc' } },
  });

  const totalNetSalary = rows.reduce((sum, r) => sum + Number(r.netSalary), 0);

  res.json({ year, month, payroll: rows, totalNetSalary: Math.round(totalNetSalary) });
}

/** GET /api/payroll/:employeeCode?year=&month= — single employee's payroll record (used by the slip) */
export async function getPayrollForEmployee(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { code: req.params.employeeCode } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const record = await prisma.payroll.findUnique({
    where: { employeeId_month_year: { employeeId: employee.id, month, year } },
    include: { employee: { include: { department: true } } },
  });
  if (!record) {
    return res.status(404).json({ error: 'Payroll has not been generated for this employee/month yet' });
  }

  res.json({ payroll: record });
}

// ---- Adjustments ----

const adjustmentEntrySchema = z.object({
  employeeId: z.number().int(),
  otHours: z.number().min(0).optional(),
  lopOverride: z.number().min(0).nullable().optional(),
  advance: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  otherAllowanceOneOff: z.number().min(0).optional(),
});
const saveAdjustmentsSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  entries: z.array(adjustmentEntrySchema).min(1),
});

/** GET /api/payroll/adjustments?year=&month= — manual adjustments for every active employee (defaults for unset ones) */
export async function getAdjustments(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { code: 'asc' },
    select: { id: true, code: true, name: true },
  });
  const adjustments = await prisma.payrollAdjustment.findMany({ where: { year, month } });
  const byEmployee = new Map(adjustments.map((a) => [a.employeeId, a]));

  res.json({
    year,
    month,
    entries: employees.map((e) => {
      const a = byEmployee.get(e.id);
      return {
        employeeId: e.id,
        code: e.code,
        name: e.name,
        otHours: a ? Number(a.otHours) : 0,
        lopOverride: a?.lopOverride !== null && a?.lopOverride !== undefined ? Number(a.lopOverride) : null,
        advance: a ? Number(a.advance) : 0,
        tax: a ? Number(a.tax) : 0,
        otherAllowanceOneOff: a ? Number(a.otherAllowanceOneOff) : 0,
      };
    }),
  });
}

/** POST /api/payroll/adjustments — bulk upsert, then the frontend triggers /generate to apply them */
export async function saveAdjustments(req: Request, res: Response) {
  const parsed = saveAdjustmentsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month, entries } = parsed.data;

  await prisma.$transaction(
    entries.map((e) =>
      prisma.payrollAdjustment.upsert({
        where: { employeeId_month_year: { employeeId: e.employeeId, month, year } },
        update: {
          otHours: e.otHours ?? 0,
          lopOverride: e.lopOverride ?? null,
          advance: e.advance ?? 0,
          tax: e.tax ?? 0,
          otherAllowanceOneOff: e.otherAllowanceOneOff ?? 0,
        },
        create: {
          employeeId: e.employeeId,
          year,
          month,
          otHours: e.otHours ?? 0,
          lopOverride: e.lopOverride ?? null,
          advance: e.advance ?? 0,
          tax: e.tax ?? 0,
          otherAllowanceOneOff: e.otherAllowanceOneOff ?? 0,
        },
      })
    )
  );

  await logAudit({
    req,
    action: 'UPDATE',
    entityType: 'PayrollAdjustment',
    entityId: `${year}-${month}`,
    description: `Saved payroll adjustments (OT/advance/tax/LOP overrides) for ${entries.length} employee(s), ${month}/${year}`,
  });

  res.json({ message: 'Adjustments saved' });
}

/** POST /api/payroll/:employeeCode/email-slip?year=&month= — emails one employee's salary slip */
export async function emailPayslip(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const result = await emailPayslipToEmployee(req.params.employeeCode, year, month, {
    userId: req.user!.userId,
    username: req.user!.username,
  });

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  await logAudit({
    req,
    action: 'CREATE',
    entityType: 'Notification',
    entityId: req.params.employeeCode,
    description: `Emailed salary slip to ${req.params.employeeCode} for ${month}/${year}`,
  });

  res.json({ message: 'Salary slip emailed successfully' });
}

/** POST /api/payroll/email-all — { year, month } — emails every generated payslip for that month */
export async function emailAllPayslips(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const result = await emailAllPayslipsForMonth(year, month, {
    userId: req.user!.userId,
    username: req.user!.username,
  });

  await logAudit({
    req,
    action: 'CREATE',
    entityType: 'Notification',
    entityId: `${year}-${month}`,
    description: `Bulk-emailed payslips for ${month}/${year}: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`,
  });

  res.json(result);
}
