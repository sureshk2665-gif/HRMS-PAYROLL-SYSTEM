import api from './api';
import { PayrollRecord, AdjustmentEntry } from '../types/payroll';

export async function generatePayroll(year: number, month: number) {
  const { data } = await api.post<{ message: string; count: number }>('/payroll/generate', { year, month });
  return data;
}

export async function fetchPayrollForMonth(year: number, month: number) {
  const { data } = await api.get<{ payroll: PayrollRecord[]; totalNetSalary: number }>('/payroll', {
    params: { year, month },
  });
  return data;
}

export async function fetchPayrollForEmployee(employeeCode: string, year: number, month: number) {
  const { data } = await api.get<{ payroll: PayrollRecord }>(`/payroll/${employeeCode}`, {
    params: { year, month },
  });
  return data.payroll;
}

export async function fetchAdjustments(year: number, month: number) {
  const { data } = await api.get<{ entries: AdjustmentEntry[] }>('/payroll/adjustments', {
    params: { year, month },
  });
  return data.entries;
}

export async function saveAdjustments(year: number, month: number, entries: AdjustmentEntry[]) {
  const { data } = await api.post<{ message: string }>('/payroll/adjustments', {
    year,
    month,
    entries: entries.map((e) => ({
      employeeId: e.employeeId,
      otHours: e.otHours,
      lopOverride: e.lopOverride,
      advance: e.advance,
      tax: e.tax,
      otherAllowanceOneOff: e.otherAllowanceOneOff,
    })),
  });
  return data;
}

export async function emailPayslip(employeeCode: string, year: number, month: number) {
  const { data } = await api.post<{ message: string }>(
    `/payroll/${employeeCode}/email-slip`,
    {},
    { params: { year, month } }
  );
  return data;
}

export interface BulkEmailResult {
  sent: number;
  skipped: number;
  failed: number;
  details: { code: string; status: string; error?: string }[];
}

export async function emailAllPayslips(year: number, month: number) {
  const { data } = await api.post<BulkEmailResult>('/payroll/email-all', { year, month });
  return data;
}
