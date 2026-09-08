import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { computeAttendanceSummary } from './leaveRules.service';

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v);
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function round0(n: number) {
  return Math.round(n);
}

export interface PayrollComputationResult {
  employeeId: number;
  nowd: number;
  lopDays: number;
  daysWorking: number;
  noph: number;
  nopl: number;
  otHours: number;
  basicEarned: number;
  hraEarned: number;
  daEarned: number;
  specialEarned: number;
  medicalEarned: number;
  conveyanceEarned: number;
  washingEarned: number;
  otAmount: number;
  otherAllowance: number;
  scaleTotal: number;
  earningsTotal: number;
  esiDeduction: number;
  taxDeduction: number;
  rentDeduction: number;
  canteenDeduction: number;
  advanceDeduction: number;
  otherDeduction: number;
  pfDeduction: number;
  deductionsTotal: number;
  netSalary: number;
}

/**
 * The payroll calculation engine. Given an employee + month/year, this:
 *  1. Reads the company-wide payroll constants (NOWD/NOPH/NOPL/ESI rate) from CompanySettings.
 *  2. Reads attendance-derived LOP days via the Step 4 leave rules engine (unless overridden).
 *  3. Reads any manual adjustments for that month (OT hours, advance, tax, etc.).
 *  4. Prorates each "scale" salary component (Basic/HRA/Conveyance/Washing/DA/Special/Medical)
 *     by (daysWorking / NOWD) — this mirrors the uploaded Visalam slip, where earnings shrink
 *     proportionally to LOP days rather than being a flat daily-rate deduction.
 *  5. Applies ESI (percentage of earnings, only if the employee is ESI-applicable), canteen
 *     (per-day rate × days worked), and any fixed/manual deductions.
 *
 * This does not write to the database — `generatePayrollForMonth` (below) does that,
 * so this function can also be reused for previews before committing a payroll run.
 */
export async function computePayrollForEmployee(
  employeeId: number,
  year: number,
  month: number
): Promise<PayrollComputationResult> {
  const [employee, settings, adjustment, attendanceSummary] = await Promise.all([
    prisma.employee.findUniqueOrThrow({ where: { id: employeeId } }),
    prisma.companySettings.findFirst(),
    prisma.payrollAdjustment.findUnique({
      where: { employeeId_month_year: { employeeId, month, year } },
    }),
    computeAttendanceSummary(employeeId, year, month),
  ]);

  const nowd = settings?.workingDaysMonth ?? 24;
  const noph = settings?.paidHolidays ?? 7;
  const nopl = settings?.paidLeaveDefault ?? 0;
  const esiRate = toNum(settings?.esiRate ?? 0.0075);

  const lopDays = adjustment?.lopOverride !== null && adjustment?.lopOverride !== undefined
    ? toNum(adjustment.lopOverride)
    : attendanceSummary.lopDays + attendanceSummary.halfDays * 0.5;

  const daysWorking = Math.max(0, nowd - lopDays);
  const factor = nowd > 0 ? daysWorking / nowd : 0;

  const basicEarned = round0(toNum(employee.basic) * factor);
  const hraEarned = round0(toNum(employee.hra) * factor);
  const daEarned = round0(toNum(employee.da) * factor);
  const specialEarned = round0(toNum(employee.specialAllow) * factor);
  const medicalEarned = round0(toNum(employee.medicalAllow) * factor);
  const conveyanceEarned = round0(toNum(employee.conveyance) * factor);
  const washingEarned = round0(toNum(employee.washingAllow) * factor);

  const otHours = toNum(adjustment?.otHours);
  const otAmount = round0(otHours * toNum(employee.otRatePerHour));
  const otherAllowance = round0(toNum(employee.otherAllow) + toNum(adjustment?.otherAllowanceOneOff));

  const scaleTotal = round0(
    toNum(employee.basic) + toNum(employee.hra) + toNum(employee.da) +
    toNum(employee.specialAllow) + toNum(employee.medicalAllow) +
    toNum(employee.conveyance) + toNum(employee.washingAllow)
  );

  const earningsTotal = round0(
    basicEarned + hraEarned + daEarned + specialEarned + medicalEarned +
    conveyanceEarned + washingEarned + otAmount + otherAllowance
  );

  const esiDeduction = employee.esiApplicable ? round0(earningsTotal * esiRate) : 0;
  const taxDeduction = round0(toNum(adjustment?.tax) + toNum(employee.professionalTax));
  const rentDeduction = round0(toNum(employee.rentDeduction));
  const canteenDeduction = round0(toNum(employee.canteenRatePerDay) * daysWorking);
  const advanceDeduction = round0(toNum(adjustment?.advance));
  const otherDeduction = round0(toNum(employee.otherDeduction));
  const pfDeduction = round0(toNum(employee.pfDeduction));

  const deductionsTotal = round0(
    esiDeduction + taxDeduction + rentDeduction + canteenDeduction +
    advanceDeduction + otherDeduction + pfDeduction
  );

  const netSalary = Math.max(0, round0(earningsTotal - deductionsTotal));

  return {
    employeeId,
    nowd,
    lopDays: round2(lopDays),
    daysWorking: round2(daysWorking),
    noph,
    nopl,
    otHours,
    basicEarned, hraEarned, daEarned, specialEarned, medicalEarned, conveyanceEarned, washingEarned,
    otAmount, otherAllowance, scaleTotal, earningsTotal,
    esiDeduction, taxDeduction, rentDeduction, canteenDeduction, advanceDeduction, otherDeduction, pfDeduction,
    deductionsTotal, netSalary,
  };
}

/**
 * Generates (or regenerates) payroll for every active employee for a given
 * month. Uses the Payroll table's @@unique([employeeId, month, year])
 * constraint to upsert — regenerating after an attendance correction
 * overwrites the existing row rather than creating a duplicate, satisfying
 * the spec's "Admin can regenerate payroll after attendance changes" rule.
 */
export async function generatePayrollForMonth(year: number, month: number) {
  const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });

  const results = [];
  for (const emp of employees) {
    const calc = await computePayrollForEmployee(emp.id, year, month);
    const row = await prisma.payroll.upsert({
      where: { employeeId_month_year: { employeeId: emp.id, month, year } },
      update: {
        nowd: calc.nowd,
        lopDays: calc.lopDays,
        daysWorking: calc.daysWorking,
        noph: calc.noph,
        nopl: calc.nopl,
        otHours: calc.otHours,
        basicEarned: calc.basicEarned,
        hraEarned: calc.hraEarned,
        daEarned: calc.daEarned,
        specialEarned: calc.specialEarned,
        medicalEarned: calc.medicalEarned,
        conveyanceEarned: calc.conveyanceEarned,
        washingEarned: calc.washingEarned,
        otAmount: calc.otAmount,
        otherAllowance: calc.otherAllowance,
        scaleTotal: calc.scaleTotal,
        earningsTotal: calc.earningsTotal,
        esiDeduction: calc.esiDeduction,
        taxDeduction: calc.taxDeduction,
        rentDeduction: calc.rentDeduction,
        canteenDeduction: calc.canteenDeduction,
        advanceDeduction: calc.advanceDeduction,
        otherDeduction: calc.otherDeduction,
        pfDeduction: calc.pfDeduction,
        deductionsTotal: calc.deductionsTotal,
        netSalary: calc.netSalary,
        status: 'GENERATED',
        regeneratedAt: new Date(),
      },
      create: {
        employeeId: emp.id,
        month,
        year,
        nowd: calc.nowd,
        lopDays: calc.lopDays,
        daysWorking: calc.daysWorking,
        noph: calc.noph,
        nopl: calc.nopl,
        otHours: calc.otHours,
        basicEarned: calc.basicEarned,
        hraEarned: calc.hraEarned,
        daEarned: calc.daEarned,
        specialEarned: calc.specialEarned,
        medicalEarned: calc.medicalEarned,
        conveyanceEarned: calc.conveyanceEarned,
        washingEarned: calc.washingEarned,
        otAmount: calc.otAmount,
        otherAllowance: calc.otherAllowance,
        scaleTotal: calc.scaleTotal,
        earningsTotal: calc.earningsTotal,
        esiDeduction: calc.esiDeduction,
        taxDeduction: calc.taxDeduction,
        rentDeduction: calc.rentDeduction,
        canteenDeduction: calc.canteenDeduction,
        advanceDeduction: calc.advanceDeduction,
        otherDeduction: calc.otherDeduction,
        pfDeduction: calc.pfDeduction,
        deductionsTotal: calc.deductionsTotal,
        netSalary: calc.netSalary,
        status: 'GENERATED',
      },
    });
    results.push(row);
  }
  return results;
}
