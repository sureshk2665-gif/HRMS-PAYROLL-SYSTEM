import api from './api';

export interface AuditLogEntry {
  id: number;
  userId: number | null;
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGIN_FAILED';
  entityType: string;
  entityId: string;
  description: string;
  changes: Record<string, { before: any; after: any }> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  entityType?: string;
  username?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchAuditLogs(filters: AuditLogFilters) {
  const { data } = await api.get<{
    logs: AuditLogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('/audit-logs', { params: filters });
  return data;
}

export async function fetchAuditEntityTypes() {
  const { data } = await api.get<{ entityTypes: string[] }>('/audit-logs/entity-types');
  return data.entityTypes;
}
