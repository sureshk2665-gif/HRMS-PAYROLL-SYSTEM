import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ReportColumn {
  key: string;
  header: string;
  width?: number; // Excel column width
  align?: 'left' | 'right' | 'center';
}

/**
 * Builds an .xlsx buffer for any tabular report. Used by every report type
 * (Employee, Department, Attendance, Payroll, Salary, Leave) so export
 * formatting stays consistent across the app instead of being reimplemented
 * per report.
 */
export async function exportToExcel(
  sheetName: string,
  columns: ReportColumn[],
  rows: Record<string, any>[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HRMS Payroll System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4F2EE' } };

  rows.forEach((row) => {
    const newRow = sheet.addRow(row);
    columns.forEach((c, idx) => {
      if (c.align) newRow.getCell(idx + 1).alignment = { horizontal: c.align };
    });
  });

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Builds a simple landscape PDF table for any report — used for on-screen
 * "Export PDF" / "Print" actions where a full designed layout (like the
 * Step 6 salary slip) isn't needed, just a clean printable table.
 */
export function exportToPdfTable(
  title: string,
  columns: ReportColumn[],
  rows: Record<string, any>[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.font('Helvetica-Bold').fontSize(14).text(title, left, doc.page.margins.top);
    doc.font('Helvetica').fontSize(8).text(new Date().toLocaleString('en-IN'), left, doc.page.margins.top + 18);

    let y = doc.page.margins.top + 36;
    const colWidth = pageWidth / columns.length;
    const rowHeight = 16;

    function drawHeaderRow(rowY: number) {
      doc.rect(left, rowY, pageWidth, rowHeight).fillAndStroke('#e4f2ee', '#000000');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
      columns.forEach((c, i) => {
        doc.text(c.header, left + i * colWidth + 3, rowY + 4, { width: colWidth - 6 });
      });
    }

    drawHeaderRow(y);
    y += rowHeight;
    doc.font('Helvetica').fontSize(8);

    rows.forEach((row) => {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
        y = doc.page.margins.top;
        drawHeaderRow(y);
        y += rowHeight;
        doc.font('Helvetica').fontSize(8);
      }
      doc.rect(left, y, pageWidth, rowHeight).stroke();
      columns.forEach((c, i) => {
        const value = row[c.key] ?? '';
        doc.text(String(value), left + i * colWidth + 3, y + 4, {
          width: colWidth - 6,
          align: c.align || 'left',
        });
      });
      y += rowHeight;
    });

    doc.end();
  });
}
