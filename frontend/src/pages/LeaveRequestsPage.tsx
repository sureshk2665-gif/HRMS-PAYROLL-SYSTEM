import { useEffect, useState } from 'react';
import { fetchLeaveRequests, reviewLeaveRequest, LeaveRequestEntry } from '../services/leaveRequest.service';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function LeaveRequestsPage() {
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [requests, setRequests] = useState<LeaveRequestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchLeaveRequests(statusFilter || undefined);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(id: number, status: 'APPROVED' | 'REJECTED') {
    setBusyId(id);
    try {
      await reviewLeaveRequest(id, status, reviewNote || undefined);
      setReviewingId(null);
      setReviewNote('');
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Leave Requests</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Submitted via each employee's leave-request link. Approving fills in their attendance automatically.
      </p>

      <div className="flex gap-2 mb-4">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              statusFilter === s
                ? 'bg-accent text-white border-accent'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No requests found.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Dates</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50 align-top">
                  <td className="px-4 py-2">
                    {r.employee.name} <span className="text-gray-400 text-xs">({r.employee.code})</span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {r.startDate.slice(0, 10)} → {r.endDate.slice(0, 10)}
                  </td>
                  <td className="px-4 py-2">{r.leaveTypeCode.replace('_', ' ')}</td>
                  <td className="px-4 py-2 max-w-xs">{r.reason}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                    {r.reviewedByName && (
                      <p className="text-xs text-gray-400 mt-1">by {r.reviewedByName}</p>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {r.status === 'PENDING' ? (
                      reviewingId === r.id ? (
                        <div className="space-y-2 w-48">
                          <input
                            placeholder="Optional note"
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              disabled={busyId === r.id}
                              onClick={() => handleReview(r.id, 'APPROVED')}
                              className="px-2 py-1 rounded bg-green-600 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busyId === r.id}
                              onClick={() => handleReview(r.id, 'REJECTED')}
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => { setReviewingId(null); setReviewNote(''); }}
                              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReviewingId(r.id)}
                          className="text-accent text-xs font-semibold"
                        >
                          Review
                        </button>
                      )
                    ) : (
                      r.reviewNote && <p className="text-xs text-gray-400">{r.reviewNote}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
