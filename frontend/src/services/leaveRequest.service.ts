import api from './api';

export interface LeaveRequestEntry {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  leaveTypeCode: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedByName: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  employee: { code: string; name: string; department: { name: string } | null };
}

export async function fetchLeaveRequests(status?: string) {
  const { data } = await api.get<{ requests: LeaveRequestEntry[] }>('/leave-requests', {
    params: status ? { status } : {},
  });
  return data.requests;
}

export async function reviewLeaveRequest(id: number, status: 'APPROVED' | 'REJECTED', reviewNote?: string) {
  const { data } = await api.post<{ request: LeaveRequestEntry }>(`/leave-requests/${id}/review`, {
    status,
    reviewNote,
  });
  return data.request;
}
