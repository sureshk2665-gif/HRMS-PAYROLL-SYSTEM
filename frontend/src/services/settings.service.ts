import api from './api';

export interface CompanySettings {
  id: number;
  companyName: string;
  addressLine: string | null;
  logoUrl: string | null;
  workingDaysMonth: number;
  paidHolidays: number;
  paidLeaveDefault: number;
  esiRate: string;
  pfRate: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  birthdayRemindersEnabled: boolean;
  birthdayReminderHour: number;
}

export async function fetchSettings() {
  const { data } = await api.get<{ settings: CompanySettings }>('/settings');
  return data.settings;
}

export interface UpdateSettingsPayload {
  companyName: string;
  addressLine: string | null;
  workingDaysMonth: number;
  paidHolidays: number;
  paidLeaveDefault: number;
  esiRate: number;
  pfRate: number;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  birthdayRemindersEnabled: boolean;
  birthdayReminderHour: number;
}

export async function updateSettings(payload: UpdateSettingsPayload) {
  const { data } = await api.put<{ settings: CompanySettings; warnings: string[] }>('/settings', payload);
  return data;
}

export async function uploadCompanyLogo(file: File) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await api.post<{ message: string; settings: CompanySettings }>('/settings/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.settings;
}

export async function fetchNotificationConfigStatus() {
  const { data } = await api.get<{ emailConfigured: boolean; smsConfigured: boolean }>('/notifications/config-status');
  return data;
}
