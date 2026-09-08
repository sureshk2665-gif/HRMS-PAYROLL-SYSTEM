import api from './api';

export interface DashboardSummary {
  totalEmployees: number;
  activeEmployees: number;
  todayAttendance: {
    present: number;
    absent: number;
    halfDay: number;
    casualLeave: number;
    sickLeave: number;
    lossOfPay: number;
  };
  attendancePercent: number;
  monthSalaryExpense: number;
  monthLabel: string;
  upcomingBirthdays: { code: string; name: string; nextBirthday: string }[];
  recentEmployees: { code: string; name: string; department: string | null; status: string }[];
}

export async function fetchDashboardSummary() {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary');
  return data;
}
