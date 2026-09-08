import api from './api';
import { ReportData, ReportType } from '../types/report';

// year/month are only relevant for Attendance, Payroll, and Leave reports.
export interface ReportParams {
  year?: number;
  month?: number;
}

export async function fetchReport(type: ReportType, params: ReportParams = {}): Promise<ReportData> {
  const { data } = await api.get<ReportData>(`/reports/${type}`, { params: { ...params, format: 'json' } });
  return data;
}

async function downloadBlob(type: ReportType, format: 'xlsx' | 'pdf', params: ReportParams, filename: string) {
  const response = await api.get(`/reports/${type}`, {
    params: { ...params, format },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  if (format === 'xlsx') {
    a.download = filename;
    a.click();
  } else {
    window.open(url, '_blank');
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportReportExcel(type: ReportType, params: ReportParams, filenameBase: string) {
  await downloadBlob(type, 'xlsx', params, `${filenameBase}.xlsx`);
}

export async function exportReportPdf(type: ReportType, params: ReportParams, filenameBase: string) {
  await downloadBlob(type, 'pdf', params, `${filenameBase}.pdf`);
}
