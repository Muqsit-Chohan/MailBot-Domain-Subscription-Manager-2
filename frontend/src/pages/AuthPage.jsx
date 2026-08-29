import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send reset email');
      toast.success(data.message || 'Password reset link sent to your email!');
      setShowForgotModal(false);
      setForgotEmail('');
    } catch (err) {
      toast.error(err.message || 'Failed to request password reset');
    } finally {
      setForgotLoading(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const switchMode = (mode) => {
    setMode(mode);
    if (mode === 'register') {
      setInfo(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Welcome back!');
        navigate('/');
      } else {
        const data = await register(form.name, form.email, form.password);
        toast.success('Account created!');
        setInfo({
          message: data.message || 'A verification email has been sent to your inbox.',
          email: form.email,
        });
        setForm({ name: '', email: '', password: '' });
        setMode('login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link to="/" aria-label="MailBot home">
            <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-16 h-16 object-contain mb-2" />
          </Link>
          <h1 className="text-2xl font-extrabold text-[#111827] dark:text-[#f5f5f5] tracking-tight">MailBot</h1>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-1">Domain, Hosting & Subscription Manager</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-xl shadow-black/5 dark:shadow-2xl dark:shadow-black/70">
          {/* Tabs */}
          <div className="flex bg-[#f0f2f5] dark:bg-[#0f0f0f] border border-[#dde1e9] dark:border-[#272727] rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                  mode === m ? 'bg-white dark:bg-[#1c1c1c] text-[#111827] dark:text-[#f5f5f5] shadow-sm' : 'text-[#6b7280] dark:text-[#71717a] hover:text-[#111827] dark:hover:text-[#f5f5f5]'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {mode === 'register' && !info && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-slate-200 mb-4">
              After signing up, we will send a verification email. You must verify your address before you can sign in.
            </div>
          )}

          {info && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/40 dark:text-emerald-200 mb-4">
              <strong>Verification email sent!</strong>
              <p className="mt-2">{info.message}</p>
              <p className="mt-2">Check <span className="font-semibold">{info.email}</span> and click the link to verify your account.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                  <input className="input pl-9" placeholder="Your name" value={form.name}
                    onChange={e => set('name', e.target.value)} required />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input className="input pl-9" type="email" placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} required />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input className="input pl-9 pr-9" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => set('password', e.target.value)} required />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
            {mode === 'login' && (
              <p className="text-center text-sm text-[#6b7280] dark:text-[#8b92b3] mt-2">
                If you signed up already, please verify your email before logging in.
              </p>
            )}
            {mode === 'register' && (
              <p className="text-center text-sm text-[#6b7280] dark:text-[#8b92b3] mt-2">
                Didn’t receive the email? Check your spam folder and try again after a few minutes.
              </p>
            )}
          </form>
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#141414] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#dde1e9] dark:border-[#272727]">
              <h3 className="text-lg font-bold text-[#111827] dark:text-[#f5f5f5] mb-1">Reset your password</h3>
              <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mb-4">
                Enter your account email and we will send you a password reset link.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="label">Account Email</label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="btn-secondary flex-1 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="btn-primary flex-1 py-2"
                  >
                    {forgotLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-[#6b7280] dark:text-[#71717a] mt-4">
          First account created becomes admin
        </p>
      </div>
    </div>
  );
}
