import api from './api';

export interface NotificationLogEntry {
  id: number;
  employeeId: number | null;
  employee: { code: string; name: string } | null;
  channel: 'EMAIL' | 'SMS';
  category: 'PAYSLIP' | 'BIRTHDAY';
  recipient: string;
  subject: string | null;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage: string | null;
  triggeredByName: string | null;
  createdAt: string;
}

export interface NotificationLogFilters {
  category?: string;
  channel?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchNotificationLogs(filters: NotificationLogFilters) {
  const { data } = await api.get<{
    logs: NotificationLogEntry[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('/notifications/logs', { params: filters });
  return data;
}
