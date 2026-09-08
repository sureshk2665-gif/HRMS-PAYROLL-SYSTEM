import api from './api';
import {
  AttendanceStatus,
  LeaveType,
  DailyAttendanceEntry,
  MonthlyReportEmployee,
} from '../types/attendance';

export async function fetchAttendanceStatuses() {
  const { data } = await api.get<{ statuses: AttendanceStatus[] }>('/attendance/statuses');
  return data.statuses;
}

export async function fetchLeaveTypes() {
  const { data } = await api.get<{ leaveTypes: LeaveType[] }>('/attendance/leave-types');
  return data.leaveTypes;
}

export async function fetchAttendanceForDate(date: string) {
  const { data } = await api.get<{ date: string; employees: DailyAttendanceEntry[] }>('/attendance', {
    params: { date },
  });
  return data.employees;
}

export interface AttendanceEntryInput {
  employeeId: number;
  attendanceStatusCode: string;
  remarks?: string | null;
}

export async function saveAttendance(date: string, entries: AttendanceEntryInput[]) {
  const { data } = await api.post<{ message: string; count: number }>('/attendance', { date, entries });
  return data;
}

export async function fetchMonthlyAttendanceReport(year: number, month: number) {
  const { data } = await api.get<{ year: number; month: number; employees: MonthlyReportEmployee[] }>(
    '/attendance/report',
    { params: { year, month } }
  );
  return data.employees;
}
