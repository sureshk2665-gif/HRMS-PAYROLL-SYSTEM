export interface Department {
  id: number;
  name: string;
  employeeCount: number;
  createdAt: string;
}

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type PaymentMode = 'NEFT_RTGS' | 'TRANSFER' | 'CASH_CHEQUE';

export interface Employee {
  id: number;
  code: string;
  name: string;
  photoUrl?: string | null;
  gender?: Gender | null;
  dob?: string | null;
  relativeName?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  joiningDate?: string | null;
  departmentId?: number | null;
  department?: { id: number; name: string } | null;
  designation?: string | null;
  employmentType: EmploymentType;
  status: EmployeeStatus;

  bankName?: string | null;
  branch?: string | null;
  accountNo?: string | null;
  ifsc?: string | null;
  pan?: string | null;
  aadhaar?: string | null;
  pfNumber?: string | null;
  esiNumber?: string | null;
  uan?: string | null;
  paymentMode: PaymentMode;

  basic: number;
  hra: number;
  da: number;
  specialAllow: number;
  medicalAllow: number;
  conveyance: number;
  washingAllow: number;
  otherAllow: number;
  otRatePerHour: number;

  pfDeduction: number;
  esiApplicable: boolean;
  professionalTax: number;
  canteenRatePerDay: number;
  rentDeduction: number;
  otherDeduction: number;

  elBalance: number;
  clBalance: number;

  createdAt: string;
  updatedAt: string;
}

export interface PaginatedEmployees {
  employees: Employee[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface EmployeeListParams {
  search?: string;
  departmentId?: number;
  status?: EmployeeStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'code' | 'name' | 'joiningDate' | 'createdAt';
  sortDir?: 'asc' | 'desc';
}
