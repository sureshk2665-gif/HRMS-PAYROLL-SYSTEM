import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { prisma } from '../config/prisma';
import { generateNextEmployeeCode } from '../utils/employeeCode';

// Same formats enforced on the manual Employee form (employee.controller.ts) —
// kept in sync here so bulk-imported rows can't bypass validation that a
// manually created employee would be subject to.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;

// Upload handled in-memory (small spreadsheets only) — nothing needs to
// persist to disk here, we parse it directly then discard the buffer.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const bulkImportUploadMiddleware = upload.single('file');

// Column order/headers must match exactly what the template generates below.
const TEMPLATE_COLUMNS = [
  { key: 'name', header: 'Full Name *', width: 24, example: 'Ramesh Kumar' },
  { key: 'gender', header: 'Gender (Male/Female/Other)', width: 14, example: 'Male' },
  { key: 'dob', header: 'Date of Birth (YYYY-MM-DD)', width: 16, example: '1995-06-15' },
  { key: 'relativeName', header: 'Father/Husband Name', width: 20, example: 'Suresh Kumar' },
  { key: 'mobile', header: 'Mobile Number', width: 14, example: '9876543210' },
  { key: 'email', header: 'Email', width: 24, example: 'ramesh@example.com' },
  { key: 'address', header: 'Address', width: 30, example: '12 Main Street, Chennai' },
  { key: 'joiningDate', header: 'Joining Date (YYYY-MM-DD)', width: 16, example: '2026-01-01' },
  { key: 'department', header: 'Department *', width: 16, example: 'Sales' },
  { key: 'designation', header: 'Designation', width: 18, example: 'Sales Executive' },
  { key: 'employmentType', header: 'Employment Type (FULL_TIME/PART_TIME/CONTRACT)', width: 18, example: 'FULL_TIME' },
  { key: 'bankName', header: 'Bank Name', width: 18, example: 'Canara Bank' },
  { key: 'branch', header: 'Branch', width: 16, example: 'Anna Nagar' },
  { key: 'accountNo', header: 'Account Number', width: 18, example: '1234567890' },
  { key: 'ifsc', header: 'IFSC', width: 12, example: 'CNRB0001234' },
  { key: 'pan', header: 'PAN Number', width: 12, example: 'ABCDE1234F' },
  { key: 'aadhaar', header: 'Aadhaar Number', width: 16, example: '123456789012' },
  { key: 'pfNumber', header: 'PF Number', width: 16, example: '' },
  { key: 'esiNumber', header: 'ESI Number', width: 16, example: '' },
  { key: 'uan', header: 'UAN', width: 16, example: '' },
  { key: 'basic', header: 'Basic Salary *', width: 12, example: 15000 },
  { key: 'hra', header: 'HRA', width: 10, example: 5000 },
  { key: 'da', header: 'DA', width: 10, example: 0 },
  { key: 'specialAllow', header: 'Special Allowance', width: 12, example: 0 },
  { key: 'medicalAllow', header: 'Medical Allowance', width: 12, example: 0 },
  { key: 'conveyance', header: 'Conveyance', width: 10, example: 2000 },
  { key: 'washingAllow', header: 'Washing Allowance', width: 12, example: 0 },
  { key: 'otherAllow', header: 'Other Allowance', width: 12, example: 0 },
] as const;

/** GET /api/employees/bulk-import/template — downloadable .xlsx with headers + one example row */
export async function downloadBulkImportTemplate(_req: Request, res: Response) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Employees');

  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4F2EE' } };

  const exampleRow: Record<string, any> = {};
  TEMPLATE_COLUMNS.forEach((c) => (exampleRow[c.key] = c.example));
  const row = sheet.addRow(exampleRow);
  row.font = { italic: true, color: { argb: 'FF888888' } };

  const departments = await prisma.department.findMany({ select: { name: true }, orderBy: { name: 'asc' } });
  const notesSheet = workbook.addWorksheet('Read Me');
  notesSheet.columns = [{ header: 'Instructions', key: 'note', width: 90 }];
  notesSheet.getRow(1).font = { bold: true };
  [
    'Fill one row per employee below the header row (delete the example row first).',
    'Fields marked * are required. Employee Code is generated automatically — do not include it.',
    `Department must match an existing department name exactly. Current departments: ${departments.map((d) => d.name).join(', ')}`,
    'Dates must be in YYYY-MM-DD format (e.g. 2026-01-15).',
    'Employment Type must be exactly one of: FULL_TIME, PART_TIME, CONTRACT (defaults to FULL_TIME if blank).',
    'Salary fields (Basic, HRA, etc.) must be numbers, not text.',
    'PAN must be in the format ABCDE1234F. Aadhaar must be exactly 12 digits. IFSC must be 11 characters like CNRB0001234. Mobile must be a 10-digit number starting 6-9. Rows with an invalid format in these fields will be skipped with an error.',
    'After uploading, you can edit each employee individually (including adding a photo) from the Employees page.',
  ].forEach((note) => notesSheet.addRow({ note }));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="employee_bulk_import_template.xlsx"');
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(Buffer.from(buffer));
}

interface RowError {
  row: number;
  employeeName: string;
  error: string;
}

/**
 * POST /api/employees/bulk-import
 * Parses the uploaded .xlsx (same column layout as the template), validates
 * each row, and creates employees one by one so a single bad row doesn't
 * abort the whole batch — every good row still gets created, and every bad
 * row is reported back with a reason.
 */
export async function bulkImportEmployees(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded (expected form field "file")' });
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(req.file.buffer as any);
  } catch {
    return res.status(400).json({ error: 'Could not read the uploaded file — please upload a valid .xlsx file' });
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return res.status(400).json({ error: 'The uploaded file has no worksheet' });
  }

  const departments = await prisma.department.findMany();
  const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

  const headerRow = sheet.getRow(1);
  const keyByColumn: Record<number, string> = {};
  headerRow.eachCell((cell, colNumber) => {
    const match = TEMPLATE_COLUMNS.find((c) => c.header === String(cell.value).trim());
    if (match) keyByColumn[colNumber] = match.key;
  });

  const errors: RowError[] = [];
  let createdCount = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.values === undefined || (Array.isArray(row.values) && row.values.every((v) => v === null || v === undefined))) {
      continue; // skip fully blank rows
    }

    const data: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const key = keyByColumn[colNumber];
      if (key) data[key] = cell.value;
    });

    const name = String(data.name || '').trim();
    if (!name) {
      errors.push({ row: rowNumber, employeeName: '(blank)', error: 'Full Name is required' });
      continue;
    }

    try {
      const departmentName = String(data.department || '').trim();
      const department = departmentName ? departmentByName.get(departmentName.toLowerCase()) : undefined;
      if (departmentName && !department) {
        throw new Error(`Department "${departmentName}" does not exist — add it under Departments first`);
      }

      const basic = Number(data.basic);
      if (data.basic !== undefined && data.basic !== '' && isNaN(basic)) {
        throw new Error('Basic Salary must be a number');
      }

      const pan = data.pan ? String(data.pan).trim().toUpperCase() : null;
      if (pan && !PAN_REGEX.test(pan)) {
        throw new Error('PAN must be in the format ABCDE1234F');
      }
      const aadhaar = data.aadhaar ? String(data.aadhaar).trim() : null;
      if (aadhaar && !AADHAAR_REGEX.test(aadhaar)) {
        throw new Error('Aadhaar must be exactly 12 digits');
      }
      const ifsc = data.ifsc ? String(data.ifsc).trim().toUpperCase() : null;
      if (ifsc && !IFSC_REGEX.test(ifsc)) {
        throw new Error('IFSC must be 11 characters (e.g. CNRB0001234)');
      }
      const mobile = data.mobile ? String(data.mobile).trim() : null;
      if (mobile && !MOBILE_REGEX.test(mobile)) {
        throw new Error('Mobile number must be a valid 10-digit Indian number (starting 6-9)');
      }

      const code = await generateNextEmployeeCode();

      await prisma.employee.create({
        data: {
          code,
          name,
          gender: normalizeGender(data.gender),
          dob: parseExcelDate(data.dob),
          relativeName: data.relativeName ? String(data.relativeName) : null,
          mobile: mobile,
          email: data.email ? String(data.email) : null,
          address: data.address ? String(data.address) : null,
          joiningDate: parseExcelDate(data.joiningDate),
          departmentId: department?.id,
          designation: data.designation ? String(data.designation) : null,
          employmentType: normalizeEmploymentType(data.employmentType),
          bankName: data.bankName ? String(data.bankName) : null,
          branch: data.branch ? String(data.branch) : null,
          accountNo: data.accountNo ? String(data.accountNo) : null,
          ifsc: ifsc,
          pan: pan,
          aadhaar: aadhaar,
          pfNumber: data.pfNumber ? String(data.pfNumber) : null,
          esiNumber: data.esiNumber ? String(data.esiNumber) : null,
          uan: data.uan ? String(data.uan) : null,
          basic: Number(data.basic) || 0,
          hra: Number(data.hra) || 0,
          da: Number(data.da) || 0,
          specialAllow: Number(data.specialAllow) || 0,
          medicalAllow: Number(data.medicalAllow) || 0,
          conveyance: Number(data.conveyance) || 0,
          washingAllow: Number(data.washingAllow) || 0,
          otherAllow: Number(data.otherAllow) || 0,
        },
      });
      createdCount++;
    } catch (err: any) {
      errors.push({ row: rowNumber, employeeName: name, error: err.message || 'Unknown error creating this row' });
    }
  }

  res.json({
    message: `Imported ${createdCount} employee(s)${errors.length ? `, ${errors.length} row(s) skipped` : ''}`,
    createdCount,
    errors,
  });
}

function normalizeGender(value: any): 'MALE' | 'FEMALE' | 'OTHER' | undefined {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'MALE' || v === 'FEMALE' || v === 'OTHER') return v;
  return undefined;
}

function normalizeEmploymentType(value: any): 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' {
  const v = String(value || '').trim().toUpperCase();
  if (v === 'FULL_TIME' || v === 'PART_TIME' || v === 'CONTRACT') return v;
  return 'FULL_TIME';
}

function parseExcelDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return isNaN(parsed.getTime()) ? undefined : parsed;
}
