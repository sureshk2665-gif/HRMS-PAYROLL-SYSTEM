import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import { amountInWordsINR } from '../utils/amountInWords';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function n(v: Prisma.Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v);
}
function money(v: number): string {
  return Math.round(v).toLocaleString('en-IN');
}

export interface SlipData {
  companyName: string;
  companyAddress: string;
  logoPath: string | null; // absolute filesystem path, resolved server-side from CompanySettings.logoUrl
  employeeName: string;
  employeeCode: string;
  paymentMode: string;
  esiNumber: string | null;
  month: number;
  year: number;
  nowd: number;
  lopDays: number;
  otHours: number;
  daysWorking: number;
  noph: number;
  nopl: number;
  elBalance: number;
  clBalance: number;
  // Scale (full monthly entitlement, not prorated)
  basicScale: number;
  hraScale: number;
  conveyanceScale: number;
  washingScale: number;
  // Earnings (prorated / actual for the month)
  basicEarned: number;
  hraEarned: number;
  conveyanceEarned: number;
  washingEarned: number;
  otAmount: number;
  otherAllowance: number;
  scaleTotal: number;
  earningsTotal: number;
  // Deductions
  esiDeduction: number;
  taxDeduction: number;
  rentDeduction: number;
  canteenDeduction: number;
  advanceDeduction: number;
  otherDeduction: number;
  deductionsTotal: number;
  netSalary: number;
}

/**
 * Builds the salary slip data object from a Payroll row + its related
 * Employee + CompanySettings — kept separate from the PDF drawing code so
 * Step 7's Excel/PDF reports can reuse the same shape if needed.
 */
export function buildSlipData(payroll: any, employee: any, settings: any): SlipData {
  let logoPath: string | null = null;
  if (settings?.logoUrl) {
    // logoUrl is stored as "/uploads/company/logo-xxx.png" — resolve it to
    // an actual filesystem path so PDFKit's doc.image() can read the file.
    const uploadsDir = process.env.UPLOADS_DIR || './uploads';
    const relativePath = settings.logoUrl.replace(/^\/uploads\//, '');
    logoPath = path.join(uploadsDir, relativePath);
  }

  return {
    companyName: settings?.companyName ?? 'Your Company Pvt Ltd',
    companyAddress: settings?.addressLine ?? '',
    logoPath,
    employeeName: employee.name,
    employeeCode: employee.code,
    paymentMode: employee.paymentMode === 'NEFT_RTGS' ? 'NEFT/RTGS' : employee.paymentMode === 'TRANSFER' ? 'TRANSFER' : 'CASH/CHEQUE',
    esiNumber: employee.esiNumber,
    month: payroll.month,
    year: payroll.year,
    nowd: payroll.nowd,
    lopDays: n(payroll.lopDays),
    otHours: n(payroll.otHours),
    daysWorking: n(payroll.daysWorking),
    noph: payroll.noph,
    nopl: payroll.nopl,
    elBalance: n(employee.elBalance),
    clBalance: n(employee.clBalance),
    basicScale: n(employee.basic),
    hraScale: n(employee.hra),
    conveyanceScale: n(employee.conveyance),
    washingScale: n(employee.washingAllow),
    basicEarned: n(payroll.basicEarned),
    hraEarned: n(payroll.hraEarned),
    conveyanceEarned: n(payroll.conveyanceEarned),
    washingEarned: n(payroll.washingEarned),
    otAmount: n(payroll.otAmount),
    otherAllowance: n(payroll.otherAllowance),
    scaleTotal: n(payroll.scaleTotal),
    earningsTotal: n(payroll.earningsTotal),
    esiDeduction: n(payroll.esiDeduction),
    taxDeduction: n(payroll.taxDeduction),
    rentDeduction: n(payroll.rentDeduction),
    canteenDeduction: n(payroll.canteenDeduction),
    advanceDeduction: n(payroll.advanceDeduction),
    otherDeduction: n(payroll.otherDeduction),
    deductionsTotal: n(payroll.deductionsTotal),
    netSalary: n(payroll.netSalary),
  };
}

/**
 * Draws the slip to match the uploaded Visalam Industries format:
 *   - Company name + address header
 *   - Employee name
 *   - "Jan-2026-NOWD 24  LOP 0  OT HOURS 0" line
 *   - "No of days working X  NOPH 7  NOPL 0" line
 *   - "EMP.CODE ...  MODE ...  ESI NO : ..." line
 *   - SCALE | EARNINGS | DEDUCTIONS grid with a Leave Avl column
 *   - TOTAL row + NET PAY
 *   - Amount in words + signature line
 *
 * Returns a Buffer so the controller can either stream it directly or
 * save it to disk for the SalarySlip.pdfPath record.
 */
export function generateSalarySlipPdf(data: SlipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 28 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;
    let y = doc.page.margins.top;

    // ---- Header ----
    if (data.logoPath && fs.existsSync(data.logoPath)) {
      try {
        const logoSize = 28;
        doc.image(data.logoPath, left + pageWidth / 2 - logoSize / 2, y, { width: logoSize, height: logoSize });
        y += logoSize + 4;
      } catch {
        // Corrupt/unreadable image file — fall back to text-only header rather than failing the whole PDF.
      }
    }
    doc.font('Helvetica-Bold').fontSize(11).text(data.companyName, left, y, { width: pageWidth, align: 'center' });
    y += 14;
    if (data.companyAddress) {
      doc.font('Helvetica').fontSize(7.5).text(data.companyAddress, left, y, { width: pageWidth, align: 'center' });
      y += 11;
    }
    doc.moveTo(left, y).lineTo(left + pageWidth, y).lineWidth(1).stroke();
    y += 6;

    // ---- Employee name ----
    doc.font('Helvetica-Bold').fontSize(9).text(data.employeeName, left, y);
    y += 13;

    // ---- Info lines (3 columns each) ----
    const monthLabel = `${MONTH_NAMES[data.month - 1]}-${data.year}`;
    const col1 = left;
    const col2 = left + pageWidth * 0.38;
    const col3 = left + pageWidth * 0.68;

    doc.font('Helvetica').fontSize(7.5);
    doc.text(`${monthLabel}-NOWD ${data.nowd}`, col1, y);
    doc.text(`LOP ${data.lopDays}`, col2, y);
    doc.text(`OT HOURS ${data.otHours}`, col3, y);
    y += 10;

    doc.text(`No of days working ${data.daysWorking}`, col1, y);
    doc.text(`NOPH ${data.noph}`, col2, y);
    doc.text(`NOPL ${data.nopl}`, col3, y);
    y += 10;

    doc.text(`EMP.CODE ${data.employeeCode}`, col1, y);
    doc.text(`MODE ${data.paymentMode}`, col2, y);
    doc.text(`ESI NO : ${data.esiNumber || '-'}`, col3, y);
    y += 12;

    // ---- Main grid: SCALE | EARNINGS | DEDUCTIONS | Leave Avl ----
    const tableTop = y;
    const scaleColW = pageWidth * 0.14;
    const earnLabelW = pageWidth * 0.30;
    const earnValW = pageWidth * 0.12;
    const dedLabelW = pageWidth * 0.24;
    const dedValW = pageWidth * 0.10;
    const leaveColW = pageWidth - scaleColW - earnLabelW - earnValW - dedLabelW - dedValW;

    const xScale = left;
    const xEarnLabel = xScale + scaleColW;
    const xEarnVal = xEarnLabel + earnLabelW;
    const xDedLabel = xEarnVal + earnValW;
    const xDedVal = xDedLabel + dedLabelW;
    const xLeave = xDedVal + dedValW;

    const rowH = 11;
    doc.font('Helvetica-Bold').fontSize(7);
    doc.rect(left, tableTop, pageWidth, rowH).fillAndStroke('#eeeeee', '#000000');
    doc.fillColor('#000000');
    doc.text('SCALE', xScale + 2, tableTop + 2, { width: scaleColW - 2 });
    doc.text('EARNINGS', xEarnLabel + 2, tableTop + 2, { width: earnLabelW + earnValW - 2 });
    doc.text('DEDUCTIONS', xDedLabel + 2, tableTop + 2, { width: dedLabelW + dedValW - 2 });
    doc.text('Leave Avl', xLeave + 2, tableTop + 2, { width: leaveColW - 2 });

    const rows: { scale?: number; earnLabel: string; earnVal: number; dedLabel: string; dedVal: number }[] = [
      { scale: data.basicScale, earnLabel: 'BASIC', earnVal: data.basicEarned, dedLabel: 'ESI', dedVal: data.esiDeduction },
      { scale: data.hraScale, earnLabel: 'HRA', earnVal: data.hraEarned, dedLabel: 'TAX', dedVal: data.taxDeduction },
      { scale: data.conveyanceScale, earnLabel: 'CONVEYANCE', earnVal: data.conveyanceEarned, dedLabel: 'RENT', dedVal: data.rentDeduction },
      { scale: data.washingScale, earnLabel: 'WASHING ALLOWANCE', earnVal: data.washingEarned, dedLabel: 'CANTEEN', dedVal: data.canteenDeduction },
      { earnLabel: 'OVER TIME', earnVal: data.otAmount, dedLabel: 'ADVANCE', dedVal: data.advanceDeduction },
      { earnLabel: 'OTHER ALLOWANCE', earnVal: data.otherAllowance, dedLabel: 'OTHERS', dedVal: data.otherDeduction },
    ];

    let rowY = tableTop + rowH;
    doc.font('Helvetica').fontSize(7);
    rows.forEach((row) => {
      doc.rect(left, rowY, pageWidth, rowH).stroke();
      if (row.scale !== undefined) {
        doc.text(money(row.scale), xScale + 2, rowY + 2, { width: scaleColW - 4 });
      }
      doc.text(`${row.earnLabel}  ${money(row.earnVal)}`, xEarnLabel + 2, rowY + 2, { width: earnLabelW + earnValW - 4 });
      doc.text(`${row.dedLabel}  ${money(row.dedVal)}`, xDedLabel + 2, rowY + 2, { width: dedLabelW + dedValW - 4 });
      rowY += rowH;
    });

    // Leave Avl spans the row height of the earnings/deductions block
    doc.font('Helvetica').fontSize(7);
    doc.text(`EL ${data.elBalance}`, xLeave + 2, tableTop + rowH + 2, { width: leaveColW - 4 });
    doc.text(`CL ${data.clBalance}`, xLeave + 2, tableTop + rowH + 12, { width: leaveColW - 4 });
    doc.rect(xLeave, tableTop + rowH, leaveColW, rowH * rows.length).stroke();

    // Total row
    doc.rect(left, rowY, pageWidth, rowH + 2).fillAndStroke('#f3f3f3', '#000000');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7);
    doc.text(money(data.scaleTotal), xScale + 2, rowY + 2, { width: scaleColW - 4 });
    doc.text(`TOTAL  ${money(data.earningsTotal)}`, xEarnLabel + 2, rowY + 2, { width: earnLabelW + earnValW - 4 });
    doc.text(money(data.deductionsTotal), xDedLabel + 2, rowY + 2, { width: dedLabelW + dedValW - 4 });
    doc.text(`NET PAY ${money(data.netSalary)}`, xLeave + 2, rowY + 2, { width: leaveColW + dedValW });
    rowY += rowH + 2;

    // Outer border for the whole grid
    doc.rect(left, tableTop, pageWidth, rowY - tableTop).lineWidth(1).stroke();

    y = rowY + 10;

    // ---- Amount in words ----
    doc.font('Helvetica').fontSize(7.5);
    doc.text(`In Words: ${amountInWordsINR(data.netSalary)}`, left, y, { width: pageWidth });
    y += 24;

    // ---- Signature line ----
    doc.font('Helvetica').fontSize(7.5);
    doc.text('Signature of the Employee : ____________________', left, y, { width: pageWidth, align: 'right' });

    doc.end();
  });
}
