import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchPublicLeaveRequestForm,
  submitPublicLeaveRequest,
  PublicLeaveRequestForm,
} from '../services/publicLeaveRequest.service';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function PublicLeaveRequestPage() {
  const { code, token } = useParams();
  const [data, setData] = useState<PublicLeaveRequestForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveTypeCode, setLeaveTypeCode] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!code || !token) return;
    fetchPublicLeaveRequestForm(code, token)
      .then((d) => {
        setData(d);
        if (d.leaveTypes.length > 0) setLeaveTypeCode(d.leaveTypes[0].code);
      })
      .catch((err) => setLoadError(err.response?.data?.error || 'This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [code, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code || !token) return;
    setSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    try {
      const res = await submitPublicLeaveRequest(code, token, { startDate, endDate, leaveTypeCode, reason });
      setSubmitMessage(res.message);
      setStartDate('');
      setEndDate('');
      setReason('');
      // Refresh "my requests" list so the new one shows up immediately.
      const refreshed = await fetchPublicLeaveRequestForm(code, token);
      setData(refreshed);
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Failed to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-sm text-center">
          <p className="text-red-600 text-sm">{loadError || 'This link is invalid.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h1 className="text-lg font-semibold text-gray-800">Hi, {data.employeeName}</h1>
          <p className="text-sm text-gray-500 mt-1">Submit a leave request below. It will be reviewed by HR/Manager.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Leave Type</label>
            <select
              value={leaveTypeCode}
              onChange={(e) => setLeaveTypeCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            >
              {data.leaveTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>

          {submitError && <p className="text-red-600 text-xs">{submitError}</p>}
          {submitMessage && <p className="text-green-600 text-xs">{submitMessage}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </form>

        {data.myRequests.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Your Recent Requests</h2>
            <div className="space-y-3">
              {data.myRequests.map((r) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-700">
                      {r.startDate.slice(0, 10)} to {r.endDate.slice(0, 10)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">{r.reason}</p>
                  {r.reviewNote && <p className="text-gray-400 text-xs mt-1">Note: {r.reviewNote}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
