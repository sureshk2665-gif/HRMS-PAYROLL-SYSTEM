import { useEffect, useState } from 'react';
import { fetchReport, exportReportExcel, exportReportPdf } from '../services/report.service';
import { ReportData, ReportType } from '../types/report';

const TABS: { type: ReportType; label: string; needsMonth: boolean }[] = [
  { type: 'employees', label: 'Employee Report', needsMonth: false },
  { type: 'departments', label: 'Department Report', needsMonth: false },
  { type: 'attendance', label: 'Attendance Report', needsMonth: true },
  { type: 'payroll', label: 'Payroll Report', needsMonth: true },
  { type: 'salary', label: 'Salary Report', needsMonth: false },
  { type: 'leave', label: 'Leave Report', needsMonth: true },
];

function isNumericColumn(rows: Record<string, any>[], key: string) {
  return rows.length > 0 && typeof rows[0][key] === 'number';
}

export default function ReportsPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ReportType>('employees');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const activeTabConfig = TABS.find((t) => t.type === activeTab)!;

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, year, month]);

  async function load() {
    setLoading(true);
    try {
      const params = activeTabConfig.needsMonth ? { year, month } : {};
      const result = await fetchReport(activeTab, params);
      setData(result);
    } finally {
      setLoading(false);
    }
  }

  function filenameBase() {
    return activeTabConfig.needsMonth ? `${activeTab}_report_${year}_${month}` : `${activeTab}_report`;
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      await exportReportExcel(activeTab, activeTabConfig.needsMonth ? { year, month } : {}, filenameBase());
    } finally {
      setExporting(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportReportPdf(activeTab, activeTabConfig.needsMonth ? { year, month } : {}, filenameBase());
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Reports</h2>

      <div className="flex flex-wrap gap-2 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
              activeTab === tab.type
                ? 'bg-accent text-white border-accent'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {activeTabConfig.needsMonth && (
          <input
            type="month"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-').map(Number);
              setYear(y);
              setMonth(m);
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
          />
        )}
        <button
          onClick={handleExportExcel}
          disabled={exporting || loading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          Export Excel
        </button>
        <button
          onClick={handleExportPdf}
          disabled={exporting || loading}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          Export PDF
        </button>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold"
        >
          Print
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto" id="report-print-area">
        {loading || !data ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No data available for this report.</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {data.columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-2 ${isNumericColumn(data.rows, c.key) ? 'text-right' : 'text-left'}`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                  {data.columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2 ${isNumericColumn(data.rows, c.key) ? 'text-right' : ''}`}
                    >
                      {typeof row[c.key] === 'number' && /salary|earnings|deductions|gross|basic|hra|conveyance|other/i.test(c.key)
                        ? '₹' + Math.round(row[c.key]).toLocaleString('en-IN')
                        : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
