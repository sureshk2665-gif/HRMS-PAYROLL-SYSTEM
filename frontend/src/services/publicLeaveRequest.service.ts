import axios from 'axios';

// Deliberately a separate, bare axios instance (not the shared `api` from
// services/api.ts) — that instance attaches a JWT and redirects to /login
// on 401, neither of which applies here. This page has no login at all.
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

export interface PublicLeaveType {
  code: string;
  label: string;
}

export interface MyLeaveRequest {
  id: number;
  startDate: string;
  endDate: string;
  leaveTypeCode: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  createdAt: string;
}

export interface PublicLeaveRequestForm {
  employeeName: string;
  employeeCode: string;
  leaveTypes: PublicLeaveType[];
  myRequests: MyLeaveRequest[];
}

export async function fetchPublicLeaveRequestForm(code: string, token: string) {
  const { data } = await publicApi.get<PublicLeaveRequestForm>(`/public/leave-requests/${code}/${token}`);
  return data;
}

export async function submitPublicLeaveRequest(
  code: string,
  token: string,
  payload: { startDate: string; endDate: string; leaveTypeCode: string; reason: string }
) {
  const { data } = await publicApi.post<{ message: string }>(`/public/leave-requests/${code}/${token}`, payload);
  return data;
}
