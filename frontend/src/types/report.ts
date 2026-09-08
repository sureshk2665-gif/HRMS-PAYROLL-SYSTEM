export interface ReportColumn {
  key: string;
  header: string;
}

export interface ReportData {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
}

export type ReportType = 'employees' | 'departments' | 'attendance' | 'payroll' | 'salary' | 'leave';
