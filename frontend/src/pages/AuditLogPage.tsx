import { Fragment, useEffect, useState } from 'react';
import { fetchAuditLogs, fetchAuditEntityTypes, AuditLogEntry } from '../services/auditLog.service';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-gray-100 text-gray-700',
  LOGIN_FAILED: 'bg-orange-100 text-orange-700',
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [entityType, setEntityType] = useState('');
  const [username, setUsername] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchAuditEntityTypes().then(setEntityTypes);
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, username, action, fromDate, toDate, page]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAuditLogs({
        entityType: entityType || undefined,
        username: username || undefined,
        action: action || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize: 30,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setEntityType('');
    setUsername('');
    setAction('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">Audit Log</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Every create, update, delete, and login across the system — {total} entries.
      </p>

      <div className="flex flex-wrap items-end gap-3 mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Entity</label>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">All</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Action</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">All</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGIN_FAILED">Login Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username contains</label>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <button
          onClick={resetFilters}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          Clear
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No audit entries match these filters.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    className="border-b border-gray-100 dark:border-gray-700/50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-2">{log.username}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLES[log.action]}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {log.entityType} <span className="text-gray-400">#{log.entityId}</span>
                    </td>
                    <td className="px-4 py-2">{log.description}</td>
                  </tr>
                  {expandedId === log.id && log.changes && Object.keys(log.changes).length > 0 && (
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <td colSpan={5} className="px-4 py-3">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="text-gray-500 dark:text-gray-400">
                              <th className="text-left pr-4 pb-1">Field</th>
                              <th className="text-left pr-4 pb-1">Before</th>
                              <th className="text-left pb-1">After</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(log.changes).map(([field, diff]) => (
                              <tr key={field}>
                                <td className="pr-4 py-0.5 font-medium">{field}</td>
                                <td className="pr-4 py-0.5 text-red-600">{String(diff.before ?? '—')}</td>
                                <td className="py-0.5 text-green-700">{String(diff.after ?? '—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4 text-sm text-gray-600 dark:text-gray-300">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
          >
            Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
