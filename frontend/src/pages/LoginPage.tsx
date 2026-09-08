import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-soft via-gray-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <form
        onSubmit={handleSubmit}
        className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-8"
      >
        <h1 className="text-2xl font-bold text-gradient">HRMS &amp; Payroll</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Sign in to continue</p>

        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Username</label>
        <input
          className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Password</label>
        <input
          type="password"
          className="w-full mb-4 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
