import { useEffect, useMemo, useState } from 'react';
import {
  fetchAttendanceStatuses,
  fetchAttendanceForDate,
  saveAttendance,
  fetchMonthlyAttendanceReport,
} from '../services/attendance.service';
import { AttendanceStatus, DailyAttendanceEntry, MonthlyReportEmployee } from '../types/attendance';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<DailyAttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [reportYear, setReportYear] = useState(Number(todayStr().slice(0, 4)));
  const [reportMonth, setReportMonth] = useState(Number(todayStr().slice(5, 7)));
  const [report, setReport] = useState<MonthlyReportEmployee[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  const defaultStatusCode = useMemo(
    () => statuses.find((s) => s.isDefault)?.code || 'PRESENT',
    [statuses]
  );

  useEffect(() => {
    fetchAttendanceStatuses().then(setStatuses);
  }, []);

  useEffect(() => {
    loadDay(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    loadReport(reportYear, reportMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportYear, reportMonth]);

  async function loadDay(d: string) {
    setLoading(true);
    setMessage('');
    try {
      const data = await fetchAttendanceForDate(d);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(y: number, m: number) {
    setReportLoading(true);
    try {
      const data = await fetchMonthlyAttendanceReport(y, m);
      setReport(data);
    } finally {
      setReportLoading(false);
    }
  }

  function updateStatus(employeeId: number, code: string) {
    setEntries((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, attendanceStatusCode: code } : e))
    );
  }

  function markAllPresent() {
    setEntries((prev) => prev.map((e) => ({ ...e, attendanceStatusCode: 'PRESENT' })));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      await saveAttendance(
        date,
        entries.map((e) => ({
          employeeId: e.employeeId,
          attendanceStatusCode: e.attendanceStatusCode || defaultStatusCode,
          remarks: e.remarks,
        }))
      );
      setMessage(`Attendance saved for ${date}.`);
      loadReport(reportYear, reportMonth);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  }

  const reportDates = useMemo(() => {
    const set = new Set<string>();
    report.forEach((r) => Object.keys(r.attendance).forEach((d) => set.add(d)));
    return [...set].sort();
  }, [report]);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Mark Attendance</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={markAllPresent}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
          >
            Mark All Present
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Attendance'}
          </button>
          {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No active employees found.</p>
          ) : (
            <table className="w-full text-sm text-gray-700 dark:text-gray-200">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.employeeId} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-4 py-2">{e.code}</td>
                    <td className="px-4 py-2">{e.name}</td>
                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{e.department || '-'}</td>
                    <td className="px-4 py-2">
                      <select
                        value={e.attendanceStatusCode || defaultStatusCode}
                        onChange={(ev) => updateStatus(e.employeeId, ev.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        {statuses.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Monthly Attendance Report</h2>
          <input
            type="month"
            value={`${reportYear}-${String(reportMonth).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setReportYear(y);
              setReportMonth(m);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
          {reportLoading ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : reportDates.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No attendance recorded this month yet.</p>
          ) : (
            <table className="w-full text-xs text-gray-700 dark:text-gray-200">
              <thead>
                <tr className="text-left uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-800">Employee</th>
                  {reportDates.map((d) => (
                    <th key={d} className="px-2 py-2 text-center">{d.slice(8)}</th>
                  ))}
                  <th className="px-3 py-2 text-right">Payable Days</th>
                  <th className="px-3 py-2 text-right">LOP</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.employeeId} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-800">{r.name}</td>
                    {reportDates.map((d) => (
                      <td key={d} className="px-2 py-2 text-center text-gray-500 dark:text-gray-400">
                        {r.attendance[d] ? r.attendance[d].slice(0, 3) : '-'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-medium">{r.summary.payableDays}</td>
                    <td className="px-3 py-2 text-right text-red-600">{r.summary.lopDays || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
