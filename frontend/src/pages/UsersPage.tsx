import { FormEvent, useEffect, useState } from 'react';
import {
  fetchUsers,
  createUserRequest,
  setUserActiveStatusRequest,
  resetUserPasswordRequest,
  deleteUserRequest,
  ManagedUser,
} from '../services/auth.service';

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  HR_STAFF: 'HR Staff',
};

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'ACCOUNTANT' | 'HR_STAFF'>('HR_STAFF');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage('');
    try {
      await createUserRequest(newUsername, newPassword, newRole);
      setNewUsername('');
      setNewPassword('');
      setMessage(`Account "${newUsername}" created.`);
      load();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(u: ManagedUser) {
    await setUserActiveStatusRequest(u.id, !u.isActive);
    load();
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    await resetUserPasswordRequest(resetTarget.id, resetPassword);
    setResetTarget(null);
    setResetPassword('');
    setMessage(`Password reset for "${resetTarget.username}".`);
  }

  async function handleDelete(u: ManagedUser) {
    if (!confirm(`Delete the account "${u.username}"? This cannot be undone.`)) return;
    await deleteUserRequest(u.id);
    load();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">User Accounts</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 -mt-4">
        As the Manager, you control who else can log in. Accountants get access to Payroll and Reports;
        HR Staff get access to Employees, Departments, and Attendance.
      </p>

      <form
        onSubmit={handleCreate}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username</label>
          <input
            required
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Password</label>
          <input
            required
            type="password"
            minLength={6}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Role</label>
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'ACCOUNTANT' | 'HR_STAFF')}
          >
            <option value="HR_STAFF">HR Staff</option>
            <option value="ACCOUNTANT">Accountant</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Add User'}
        </button>
        {message && <span className="text-sm text-gray-500 dark:text-gray-400">{message}</span>}
      </form>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <table className="w-full text-sm text-gray-700 dark:text-gray-200">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-3">
                    {u.role !== 'MANAGER' && (
                      <>
                        <button onClick={() => toggleActive(u)} className="text-accent text-xs font-semibold">
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-accent text-xs font-semibold"
                        >
                          Reset Password
                        </button>
                        <button onClick={() => handleDelete(u)} className="text-red-600 text-xs font-semibold">
                          Delete
                        </button>
                      </>
                    )}
                    {u.role === 'MANAGER' && <span className="text-xs text-gray-400">This is you</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={handleResetPassword}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-80"
          >
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Reset password for "{resetTarget.username}"
            </h3>
            <input
              type="password"
              required
              minLength={6}
              placeholder="New password"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 mb-4"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
              >
                Cancel
              </button>
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-semibold">
                Reset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
