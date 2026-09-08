import api from './api';
import { Department } from '../types/employee';

export async function fetchDepartments() {
  const { data } = await api.get<{ departments: Department[] }>('/departments');
  return data.departments;
}

export async function createDepartment(name: string) {
  const { data } = await api.post<{ department: Department }>('/departments', { name });
  return data.department;
}

export async function updateDepartment(id: number, name: string) {
  const { data } = await api.put<{ department: Department }>(`/departments/${id}`, { name });
  return data.department;
}

export async function deleteDepartment(id: number) {
  const { data } = await api.delete<{ message: string }>(`/departments/${id}`);
  return data.message;
}
