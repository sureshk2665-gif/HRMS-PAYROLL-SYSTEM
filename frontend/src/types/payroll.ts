export interface PayrollRecord {
  id: number;
  employeeId: number;
  month: number;
  year: number;
  nowd: number;
  lopDays: string;
  daysWorking: string;
  noph: number;
  nopl: number;
  otHours: string;
  basicEarned: string;
  hraEarned: string;
  daEarned: string;
  specialEarned: string;
  medicalEarned: string;
  conveyanceEarned: string;
  washingEarned: string;
  otAmount: string;
  otherAllowance: string;
  scaleTotal: string;
  earningsTotal: string;
  esiDeduction: string;
  taxDeduction: string;
  rentDeduction: string;
  canteenDeduction: string;
  advanceDeduction: string;
  otherDeduction: string;
  pfDeduction: string;
  deductionsTotal: string;
  netSalary: string;
  employee: {
    code: string;
    name: string;
    department: { name: string } | null;
  };
}

export interface AdjustmentEntry {
  employeeId: number;
  code: string;
  name: string;
  otHours: number;
  lopOverride: number | null;
  advance: number;
  tax: number;
  otherAllowanceOneOff: number;
}
