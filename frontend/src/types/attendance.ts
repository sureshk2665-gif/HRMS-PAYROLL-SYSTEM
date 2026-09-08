export interface AttendanceStatus {
  id: number;
  code: string;
  label: string;
  payRuleType: 'FULL_PAY' | 'HALF_PAY' | 'NO_PAY';
  payFraction: string; // Decimal comes back as a string from Prisma/JSON
  isDefault: boolean;
}

export interface LeaveType {
  id: number;
  code: string;
  label: string;
  isPaid: boolean;
  annualEntitlement: string;
}

export interface DailyAttendanceEntry {
  employeeId: number;
  code: string;
  name: string;
  department: string | null;
  attendanceStatusCode: string | null;
  remarks: string | null;
}

export interface AttendanceSummary {
  employeeId: number;
  totalDaysMarked: number;
  payableDays: number;
  breakdown: Record<string, number>;
  lopDays: number;
  halfDays: number;
}

export interface MonthlyReportEmployee {
  employeeId: number;
  code: string;
  name: string;
  attendance: Record<string, string>; // 'YYYY-MM-DD' -> statusCode
  summary: AttendanceSummary;
}
