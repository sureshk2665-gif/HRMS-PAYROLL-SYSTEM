import { FormEvent, useState } from 'react';
import { changePasswordRequest } from '../services/auth.service';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await changePasswordRequest(currentPassword, newPassword);
      setMessage(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Change Password</h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4"
      >
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Current Password</label>
          <input
            type="password"
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Confirm New Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-xs">{error}</p>}
        {message && <p className="text-green-600 text-xs">{message}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
