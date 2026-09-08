import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { generateNextEmployeeCode } from '../utils/employeeCode';
import { logAudit, diffFields } from '../services/audit.service';

// Reusable "optional but if present must match this format" helper — an
// empty string or null/undefined always passes (since these fields aren't
// mandatory), but a non-empty value that doesn't match the real-world
// format for that document is rejected with a clear message.
function optionalPattern(regex: RegExp, message: string) {
  return z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || regex.test(val), { message });
}

// PAN/IFSC are conventionally uppercase but people often type them lowercase —
// normalize before validating and storing, rather than rejecting valid input
// just because of letter case.
function optionalUppercasePattern(regex: RegExp, message: string) {
  return z.preprocess(
    (val) => (typeof val === 'string' ? val.toUpperCase() : val),
    z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || regex.test(val as string), { message })
  );
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/; // e.g. ABCDE1234F
const AADHAAR_REGEX = /^[0-9]{12}$/; // 12 digits, no spaces
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/; // e.g. CNRB0001234 (4 letters, 0, 6 alphanumeric)
const MOBILE_REGEX = /^[6-9][0-9]{9}$/; // 10-digit Indian mobile number starting 6-9

const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  photoUrl: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  dob: z.string().optional().nullable(), // ISO date string
  relativeName: z.string().optional().nullable(),
  mobile: optionalPattern(MOBILE_REGEX, 'Mobile number must be a valid 10-digit Indian number (starting 6-9)'),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  joiningDate: z.string().optional().nullable(),
  departmentId: z.number().int().optional().nullable(),
  designation: z.string().optional().nullable(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),

  // Bank & statutory
  bankName: z.string().optional().nullable(),
  branch: z.string().optional().nullable(),
  accountNo: z.string().optional().nullable(),
  ifsc: optionalUppercasePattern(IFSC_REGEX, 'IFSC must be 11 characters: 4 letters, a 0, then 6 letters/digits (e.g. CNRB0001234)'),
  pan: optionalUppercasePattern(PAN_REGEX, 'PAN must be in the format ABCDE1234F (5 letters, 4 digits, 1 letter)'),
  aadhaar: optionalPattern(AADHAAR_REGEX, 'Aadhaar must be exactly 12 digits, no spaces'),
  pfNumber: z.string().optional().nullable(),
  esiNumber: z.string().optional().nullable(),
  uan: z.string().optional().nullable(),
  paymentMode: z.enum(['NEFT_RTGS', 'TRANSFER', 'CASH_CHEQUE']).optional(),

  // Salary structure
  basic: z.number().min(0).optional(),
  hra: z.number().min(0).optional(),
  da: z.number().min(0).optional(),
  specialAllow: z.number().min(0).optional(),
  medicalAllow: z.number().min(0).optional(),
  conveyance: z.number().min(0).optional(),
  washingAllow: z.number().min(0).optional(),
  otherAllow: z.number().min(0).optional(),
  otRatePerHour: z.number().min(0).optional(),

  // Deduction config
  pfDeduction: z.number().min(0).optional(),
  esiApplicable: z.boolean().optional(),
  professionalTax: z.number().min(0).optional(),
  canteenRatePerDay: z.number().min(0).optional(),
  rentDeduction: z.number().min(0).optional(),
  otherDeduction: z.number().min(0).optional(),

  elBalance: z.number().min(0).optional(),
  clBalance: z.number().min(0).optional(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  departmentId: z.coerce.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.enum(['code', 'name', 'joiningDate', 'createdAt']).default('code'),
  sortDir: z.enum(['asc', 'desc']).default('asc'),
});

function toDate(value?: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/** GET /api/employees — search, filter, sort, paginate */
export async function listEmployees(req: Request, res: Response) {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { search, departmentId, status, page, pageSize, sortBy, sortDir } = parsed.data;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { mobile: { contains: search } },
      { designation: { contains: search } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  res.json({
    employees,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}

/** GET /api/employees/:code — full detail */
export async function getEmployee(req: Request, res: Response) {
  const employee = await prisma.employee.findUnique({
    where: { code: req.params.code },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  res.json({ employee });
}

/** POST /api/employees — create, code auto-generated */
export async function createEmployee(req: Request, res: Response) {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const data = parsed.data;

  if (data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) return res.status(400).json({ error: 'Selected department does not exist' });
  }

  const code = await generateNextEmployeeCode();

  const employee = await prisma.employee.create({
    data: {
      code,
      name: data.name,
      photoUrl: data.photoUrl || null,
      gender: data.gender || null,
      dob: toDate(data.dob),
      relativeName: data.relativeName || null,
      mobile: data.mobile || null,
      email: data.email || null,
      address: data.address || null,
      joiningDate: toDate(data.joiningDate),
      departmentId: data.departmentId || null,
      designation: data.designation || null,
      employmentType: data.employmentType || 'FULL_TIME',
      status: data.status || 'ACTIVE',

      bankName: data.bankName || null,
      branch: data.branch || null,
      accountNo: data.accountNo || null,
      ifsc: data.ifsc || null,
      pan: data.pan || null,
      aadhaar: data.aadhaar || null,
      pfNumber: data.pfNumber || null,
      esiNumber: data.esiNumber || null,
      uan: data.uan || null,
      paymentMode: data.paymentMode || 'NEFT_RTGS',

      basic: data.basic ?? 0,
      hra: data.hra ?? 0,
      da: data.da ?? 0,
      specialAllow: data.specialAllow ?? 0,
      medicalAllow: data.medicalAllow ?? 0,
      conveyance: data.conveyance ?? 0,
      washingAllow: data.washingAllow ?? 0,
      otherAllow: data.otherAllow ?? 0,
      otRatePerHour: data.otRatePerHour ?? 0,

      pfDeduction: data.pfDeduction ?? 0,
      esiApplicable: data.esiApplicable ?? true,
      professionalTax: data.professionalTax ?? 0,
      canteenRatePerDay: data.canteenRatePerDay ?? 0,
      rentDeduction: data.rentDeduction ?? 0,
      otherDeduction: data.otherDeduction ?? 0,

      elBalance: data.elBalance ?? 0,
      clBalance: data.clBalance ?? 0,
    },
    include: { department: { select: { id: true, name: true } } },
  });

  await logAudit({
    req,
    action: 'CREATE',
    entityType: 'Employee',
    entityId: employee.code,
    description: `Created employee ${employee.name} (${employee.code})`,
  });

  res.status(201).json({ employee });
}

/** PUT /api/employees/:code — update (code itself is immutable) */
export async function updateEmployee(req: Request, res: Response) {
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const data = parsed.data;

  const existing = await prisma.employee.findUnique({ where: { code: req.params.code } });
  if (!existing) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  if (data.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!dept) return res.status(400).json({ error: 'Selected department does not exist' });
  }

  const employee = await prisma.employee.update({
    where: { code: req.params.code },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
      ...(data.gender !== undefined && { gender: data.gender || null }),
      ...(data.dob !== undefined && { dob: toDate(data.dob) }),
      ...(data.relativeName !== undefined && { relativeName: data.relativeName || null }),
      ...(data.mobile !== undefined && { mobile: data.mobile || null }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.joiningDate !== undefined && { joiningDate: toDate(data.joiningDate) }),
      ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
      ...(data.designation !== undefined && { designation: data.designation || null }),
      ...(data.employmentType !== undefined && { employmentType: data.employmentType }),
      ...(data.status !== undefined && { status: data.status }),

      ...(data.bankName !== undefined && { bankName: data.bankName || null }),
      ...(data.branch !== undefined && { branch: data.branch || null }),
      ...(data.accountNo !== undefined && { accountNo: data.accountNo || null }),
      ...(data.ifsc !== undefined && { ifsc: data.ifsc || null }),
      ...(data.pan !== undefined && { pan: data.pan || null }),
      ...(data.aadhaar !== undefined && { aadhaar: data.aadhaar || null }),
      ...(data.pfNumber !== undefined && { pfNumber: data.pfNumber || null }),
      ...(data.esiNumber !== undefined && { esiNumber: data.esiNumber || null }),
      ...(data.uan !== undefined && { uan: data.uan || null }),
      ...(data.paymentMode !== undefined && { paymentMode: data.paymentMode }),

      ...(data.basic !== undefined && { basic: data.basic }),
      ...(data.hra !== undefined && { hra: data.hra }),
      ...(data.da !== undefined && { da: data.da }),
      ...(data.specialAllow !== undefined && { specialAllow: data.specialAllow }),
      ...(data.medicalAllow !== undefined && { medicalAllow: data.medicalAllow }),
      ...(data.conveyance !== undefined && { conveyance: data.conveyance }),
      ...(data.washingAllow !== undefined && { washingAllow: data.washingAllow }),
      ...(data.otherAllow !== undefined && { otherAllow: data.otherAllow }),
      ...(data.otRatePerHour !== undefined && { otRatePerHour: data.otRatePerHour }),

      ...(data.pfDeduction !== undefined && { pfDeduction: data.pfDeduction }),
      ...(data.esiApplicable !== undefined && { esiApplicable: data.esiApplicable }),
      ...(data.professionalTax !== undefined && { professionalTax: data.professionalTax }),
      ...(data.canteenRatePerDay !== undefined && { canteenRatePerDay: data.canteenRatePerDay }),
      ...(data.rentDeduction !== undefined && { rentDeduction: data.rentDeduction }),
      ...(data.otherDeduction !== undefined && { otherDeduction: data.otherDeduction }),

      ...(data.elBalance !== undefined && { elBalance: data.elBalance }),
      ...(data.clBalance !== undefined && { clBalance: data.clBalance }),
    },
    include: { department: { select: { id: true, name: true } } },
  });

  const changes = diffFields(existing as any, employee as any, [
    'id', 'createdAt', 'updatedAt', 'departmentId', 'department',
  ]);
  if (Object.keys(changes).length > 0) {
    await logAudit({
      req,
      action: 'UPDATE',
      entityType: 'Employee',
      entityId: employee.code,
      description: `Updated ${Object.keys(changes).length} field(s) for ${employee.name} (${employee.code})`,
      changes,
    });
  }

  res.json({ employee });
}
/** DELETE /api/employees/:code */
export async function deleteEmployee(req: Request, res: Response) {
  const existing = await prisma.employee.findUnique({ where: { code: req.params.code } });
  if (!existing) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  // Cascades to Attendance/Payroll/SalarySlip via the schema's onDelete: Cascade.
  await prisma.employee.delete({ where: { code: req.params.code } });

  await logAudit({
    req,
    action: 'DELETE',
    entityType: 'Employee',
    entityId: existing.code,
    description: `Deleted employee ${existing.name} (${existing.code})`,
  });

  res.json({ message: 'Employee deleted' });
}
