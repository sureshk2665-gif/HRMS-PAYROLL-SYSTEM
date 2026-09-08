import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchPayrollForMonth,
  generatePayroll,
  emailPayslip,
  emailAllPayslips,
  BulkEmailResult,
} from '../services/payroll.service';
import { PayrollRecord } from '../types/payroll';
import AdjustmentsModal from '../components/AdjustmentsModal';
import { useAuth } from '../context/AuthContext';

function fmt(n: string | number) {
  return '₹' + Math.round(Number(n)).toLocaleString('en-IN');
}

export default function PayrollPage() {
  const { can } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState<PayrollRecord[]>([]);
  const [totalNet, setTotalNet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [message, setMessage] = useState('');
  const [emailingCode, setEmailingCode] = useState<string | null>(null);
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkEmailResult | null>(null);

  const canEmail = can('notifications.send');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchPayrollForMonth(year, month);
      setRows(data.payroll);
      setTotalNet(data.totalNetSalary);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setMessage('');
    try {
      const res = await generatePayroll(year, month);
      setMessage(res.message);
      await load();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleEmailOne(code: string) {
    setEmailingCode(code);
    setMessage('');
    try {
      const res = await emailPayslip(code, year, month);
      setMessage(`${code}: ${res.message}`);
    } catch (err: any) {
      setMessage(err.response?.data?.error || `Failed to email ${code}'s payslip.`);
    } finally {
      setEmailingCode(null);
    }
  }

  async function handleEmailAll() {
    if (!confirm(`Email payslips to every employee with generated payroll for ${month}/${year}?`)) return;
    setBulkEmailing(true);
    setBulkResult(null);
    setMessage('');
    try {
      const result = await emailAllPayslips(year, month);
      setBulkResult(result);
      setMessage(`Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}.`);
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to bulk-email payslips.');
    } finally {
      setBulkEmailing(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Payroll</h2>
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
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {generating ? 'Generating…' : 'Generate / Regenerate Payroll'}
        </button>
        <button
          onClick={() => setShowAdjustments(true)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          Edit OT / LOP / Advance
        </button>
        {canEmail && rows.length > 0 && (
          <button
            onClick={handleEmailAll}
            disabled={bulkEmailing}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            {bulkEmailing ? 'Emailing…' : 'Email All Payslips'}
          </button>
        )}
        {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
      </div>

      {bulkResult && bulkResult.details.some((d) => d.status !== 'SENT') && (
        <div className="mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-xs">
          <p className="font-medium text-gray-700 dark:text-gray-200 mb-2">Issues:</p>
          {bulkResult.details.filter((d) => d.status !== 'SENT').map((d) => (
            <p key={d.code} className="text-gray-500 dark:text-gray-400">
              {d.code}: {d.status} {d.error ? `— ${d.error}` : ''}
            </p>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">
            Payroll has not been generated for {month}/{year} yet.
          </p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">NOWD</th>
                <th className="px-4 py-2">LOP</th>
                <th className="px-4 py-2">Days Worked</th>
                <th className="px-4 py-2">OT Hrs</th>
                <th className="px-4 py-2 text-right">Earnings</th>
                <th className="px-4 py-2 text-right">Deductions</th>
                <th className="px-4 py-2 text-right">Net Pay</th>
                <th className="px-4 py-2">Slip</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-2">{r.employee.code}</td>
                  <td className="px-4 py-2">{r.employee.name}</td>
                  <td className="px-4 py-2">{r.nowd}</td>
                  <td className="px-4 py-2">{r.lopDays}</td>
                  <td className="px-4 py-2">{r.daysWorking}</td>
                  <td className="px-4 py-2">{r.otHours}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.earningsTotal)}</td>
                  <td className="px-4 py-2 text-right">{fmt(r.deductionsTotal)}</td>
                  <td className="px-4 py-2 text-right font-semibold">{fmt(r.netSalary)}</td>
                  <td className="px-4 py-2 space-x-2">
                    <Link
                      to={`/payroll/slip/${r.employee.code}/${year}/${month}`}
                      className="text-accent text-xs font-semibold"
                    >
                      View
                    </Link>
                    {canEmail && (
                      <button
                        onClick={() => handleEmailOne(r.employee.code)}
                        disabled={emailingCode === r.employee.code}
                        className="text-accent text-xs font-semibold disabled:opacity-50"
                      >
                        {emailingCode === r.employee.code ? 'Emailing…' : 'Email'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={8} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-200">
                  Total Net Salary Paid
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-50">{fmt(totalNet)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {showAdjustments && (
        <AdjustmentsModal
          year={year}
          month={month}
          onClose={() => setShowAdjustments(false)}
          onSaved={() => {
            setShowAdjustments(false);
            setMessage('Adjustments saved — click Generate/Regenerate to apply them.');
          }}
        />
      )}
    </div>
  );
}
