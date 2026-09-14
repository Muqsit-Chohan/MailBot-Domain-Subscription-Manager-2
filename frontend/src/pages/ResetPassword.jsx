import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://mailbot-backend-production.up.railway.app/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing reset token');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/reset-password`, { token, password });
      toast.success(res.data.message || 'Password reset successfully!');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5] dark:bg-[#191c20] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#23272d] rounded-2xl shadow-xl p-8 border border-[#dde1e9] dark:border-[#373e47]">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
            <Lock />
          </div>
          <h2 className="text-2xl font-bold text-[#111827] dark:text-[#e7e9ed]">Reset Password</h2>
          <p className="text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1">
            Enter your new password below
          </p>
        </div>

        {!token ? (
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-medium">Invalid or missing password reset token.</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
              Return to Login
            </Link>
          </div>
        ) : success ? (
          <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">Password updated successfully!</p>
            <p className="text-xs text-gray-500 mt-1">Redirecting to login in 2 seconds...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </button>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-indigo-600 hover:underline">
                Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
