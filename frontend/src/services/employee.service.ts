import api from './api';
import { Employee, PaginatedEmployees, EmployeeListParams } from '../types/employee';

export async function fetchEmployees(params: EmployeeListParams) {
  const { data } = await api.get<PaginatedEmployees>('/employees', { params });
  return data;
}

export async function fetchEmployee(code: string) {
  const { data } = await api.get<{ employee: Employee }>(`/employees/${code}`);
  return data.employee;
}

export async function createEmployee(payload: Partial<Employee>) {
  const { data } = await api.post<{ employee: Employee }>('/employees', payload);
  return data.employee;
}

export async function updateEmployee(code: string, payload: Partial<Employee>) {
  const { data } = await api.put<{ employee: Employee }>(`/employees/${code}`, payload);
  return data.employee;
}

export async function deleteEmployee(code: string) {
  const { data } = await api.delete<{ message: string }>(`/employees/${code}`);
  return data.message;
}

export async function generateLeaveRequestLink(code: string) {
  const { data } = await api.post<{ token: string; path: string }>(`/employees/${code}/leave-link`);
  return data;
}

export async function uploadEmployeePhoto(code: string, file: File) {
  const formData = new FormData();
  formData.append('photo', file);
  const { data } = await api.post<{ message: string; employee: { code: string; photoUrl: string } }>(
    `/employees/${code}/photo`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data.employee;
}

export async function downloadBulkImportTemplate() {
  const response = await api.get('/employees/bulk-import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee_bulk_import_template.xlsx';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export interface BulkImportRowError {
  row: number;
  employeeName: string;
  error: string;
}
export interface BulkImportResult {
  message: string;
  createdCount: number;
  errors: BulkImportRowError[];
}

export async function bulkImportEmployees(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<BulkImportResult>('/employees/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
