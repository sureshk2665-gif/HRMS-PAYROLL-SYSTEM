import api from './api';

export type UserRole = 'MANAGER' | 'ACCOUNTANT' | 'HR_STAFF';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  permissions: string[];
}

export interface ManagedUser {
  id: number;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export async function loginRequest(username: string, password: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
    username,
    password,
  });
  return data;
}

export async function logoutRequest() {
  const { data } = await api.post<{ message: string }>('/auth/logout');
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await api.get<{ user: AuthUser }>('/auth/me');
  return data.user;
}

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  const { data } = await api.post<{ message: string }>('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return data;
}

// ---- User management (MANAGER only) ----

export async function fetchUsers() {
  const { data } = await api.get<{ users: ManagedUser[] }>('/auth/users');
  return data.users;
}

export async function createUserRequest(username: string, password: string, role: 'ACCOUNTANT' | 'HR_STAFF') {
  const { data } = await api.post<{ user: ManagedUser }>('/auth/users', { username, password, role });
  return data.user;
}

export async function setUserActiveStatusRequest(id: number, isActive: boolean) {
  const { data } = await api.patch<{ user: ManagedUser }>(`/auth/users/${id}/status`, { isActive });
  return data.user;
}

export async function resetUserPasswordRequest(id: number, newPassword: string) {
  const { data } = await api.post<{ message: string }>(`/auth/users/${id}/reset-password`, { newPassword });
  return data;
}

export async function deleteUserRequest(id: number) {
  const { data } = await api.delete<{ message: string }>(`/auth/users/${id}`);
  return data;
}
