import api from './api';

export interface PermissionDef {
  id: number;
  key: string;
  label: string;
  category: string;
}

export type RoleKey = 'MANAGER' | 'ACCOUNTANT' | 'HR_STAFF';

export async function fetchPermissionCatalog() {
  const { data } = await api.get<{ permissions: PermissionDef[] }>('/permissions/catalog');
  return data.permissions;
}

export async function fetchRoleMatrix() {
  const { data } = await api.get<{ permissions: PermissionDef[]; matrix: Record<string, Record<RoleKey, boolean>> }>(
    '/permissions/roles'
  );
  return data;
}

export async function updateRolePermission(role: RoleKey, permissionKey: string, allowed: boolean) {
  const { data } = await api.put('/permissions/roles', { role, permissionKey, allowed });
  return data;
}

export interface UserOverride {
  permissionKey: string;
  permissionLabel: string;
  allowed: boolean;
  setByName: string | null;
  updatedAt: string;
}

export async function fetchUserOverrides(userId: number) {
  const { data } = await api.get<{
    user: { id: number; username: string; role: RoleKey };
    overrides: UserOverride[];
    effectivePermissions: string[];
  }>(`/permissions/users/${userId}`);
  return data;
}

/** allowed: true = explicit grant, false = explicit revoke, null = clear override (use role default) */
export async function setUserPermissionOverride(userId: number, permissionKey: string, allowed: boolean | null) {
  const { data } = await api.put(`/permissions/users/${userId}`, { permissionKey, allowed });
  return data;
}
