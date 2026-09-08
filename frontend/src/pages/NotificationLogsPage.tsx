import { useEffect, useState } from 'react';
import { fetchNotificationLogs, NotificationLogEntry } from '../services/notification.service';

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  SKIPPED: 'bg-gray-100 text-gray-500',
};

export default function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, channel, status, page]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchNotificationLogs({
        category: category || undefined,
        channel: channel || undefined,
        status: status || undefined,
        page,
        pageSize: 30,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Notifications</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Every payslip email and birthday greeting attempt — {total} entries.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All categories</option>
          <option value="PAYSLIP">Payslip</option>
          <option value="BIRTHDAY">Birthday</option>
        </select>
        <select
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All channels</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">All statuses</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="SKIPPED">Skipped</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No notifications match these filters.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Channel</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Recipient</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-2 whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2">{log.employee ? `${log.employee.name} (${log.employee.code})` : '-'}</td>
                  <td className="px-4 py-2">{log.channel}</td>
                  <td className="px-4 py-2">{log.category}</td>
                  <td className="px-4 py-2">{log.recipient}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[log.status]}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{log.errorMessage || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-gray-600 dark:text-gray-300">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
