import { Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { buildSlipData, generateSalarySlipPdf } from '../services/salarySlip.service';
import { amountInWordsINR } from '../utils/amountInWords';

const monthYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

/**
 * GET /api/payroll/:employeeCode/slip?year=&month=
 * Generates the PDF on demand from the stored Payroll row (so it always
 * reflects the figures that were actually generated, even if the
 * employee's current salary has since changed), saves it to disk, upserts
 * a SalarySlip record, and streams the PDF back for the browser to
 * display/download/print.
 */
export async function getSalarySlipPdf(req: Request, res: Response) {
  const parsed = monthYearSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { year, month } = parsed.data;

  const employee = await prisma.employee.findUnique({ where: { code: req.params.employeeCode } });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const payroll = await prisma.payroll.findUnique({
    where: { employeeId_month_year: { employeeId: employee.id, month, year } },
  });
  if (!payroll) {
    return res.status(404).json({ error: 'Payroll has not been generated for this employee/month yet' });
  }

  const settings = await prisma.companySettings.findFirst();
  const slipData = buildSlipData(payroll, employee, settings);
  const pdfBuffer = await generateSalarySlipPdf(slipData);

  // Persist the PDF to disk and record it, so it can be re-downloaded later
  // without recomputation, and reports (Step 7) can link directly to it.
  try {
    const dir = path.join(UPLOADS_DIR, 'salary-slips');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${employee.code}-${year}-${String(month).padStart(2, '0')}.pdf`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    await prisma.salarySlip.upsert({
      where: { employeeId_month_year: { employeeId: employee.id, month, year } },
      update: { pdfPath: filePath, amountInWords: amountInWordsINR(Number(payroll.netSalary)) },
      create: {
        employeeId: employee.id,
        payrollId: payroll.id,
        month,
        year,
        pdfPath: filePath,
        amountInWords: amountInWordsINR(Number(payroll.netSalary)),
      },
    });
  } catch (err) {
    // Non-fatal: even if disk persistence fails (e.g. read-only filesystem
    // in some environments), the user should still get the PDF in response.
    console.error('Failed to persist salary slip to disk:', err);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${employee.code}-${year}-${String(month).padStart(2, '0')}.pdf"`
  );
  res.send(pdfBuffer);
}
