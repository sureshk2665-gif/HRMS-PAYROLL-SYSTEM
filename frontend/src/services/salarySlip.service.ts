import api from './api';

export async function fetchSalarySlipPdfBlob(employeeCode: string, year: number, month: number) {
  const response = await api.get(`/payroll/${employeeCode}/slip`, {
    params: { year, month },
    responseType: 'blob',
  });
  return response.data as Blob;
}
