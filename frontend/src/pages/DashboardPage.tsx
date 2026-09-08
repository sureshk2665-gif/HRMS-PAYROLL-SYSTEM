import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboardSummary, DashboardSummary } from '../services/dashboard.service';

function fmt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function StatCard({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  if (highlight) {
    return (
      <div className="bg-accent rounded-xl p-4 shadow-md">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-white/80 mt-1">{label}</div>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-gray-800 bg-surface-gradient border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="text-2xl font-bold text-gradient">{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-accent p-5 shadow-md">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-white/80 mt-0.5">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard value={data.totalEmployees} label="Total Employees" highlight />
        <StatCard value={data.todayAttendance.present} label="Present Today" />
        <StatCard value={data.todayAttendance.absent} label="Absent Today" />
        <StatCard value={data.todayAttendance.halfDay} label="Half Day" />
        <StatCard value={data.todayAttendance.casualLeave} label="Casual Leave" />
        <StatCard value={data.todayAttendance.sickLeave} label="Sick Leave" />
        <StatCard value={data.todayAttendance.lossOfPay} label="Loss Of Pay" />
        <StatCard value={fmt(data.monthSalaryExpense)} label={`Salary Expense (${data.monthLabel})`} />
        <StatCard value={`${data.attendancePercent}%`} label="Attendance %" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/employees" className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold shadow-sm">
          + Add Employee
        </Link>
        <Link
          to="/attendance"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          Mark Attendance
        </Link>
        <Link
          to="/payroll"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          Generate Payroll
        </Link>
        <Link
          to="/reports"
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
        >
          View Reports
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 bg-surface-gradient border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Upcoming Birthdays</h3>
          {data.upcomingBirthdays.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No birthday data available.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.upcomingBirthdays.map((b) => (
                <li key={b.code} className="flex justify-between text-gray-700 dark:text-gray-200">
                  <span>{b.name} <span className="text-gray-400">({b.code})</span></span>
                  <span className="text-gray-500 dark:text-gray-400">{b.nextBirthday}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 bg-surface-gradient border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Recent Employees</h3>
          {data.recentEmployees.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No employees yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentEmployees.map((e) => (
                <li key={e.code} className="flex justify-between text-gray-700 dark:text-gray-200">
                  <span>{e.name} <span className="text-gray-400">({e.code})</span></span>
                  <span className="text-gray-500 dark:text-gray-400">{e.department || '-'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
