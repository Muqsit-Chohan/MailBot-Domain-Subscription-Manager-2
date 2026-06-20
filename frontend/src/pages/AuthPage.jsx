import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-[#0d0f1a] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4">
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f1523] dark:text-[#eef0f8] tracking-tight">MailBot Domain Manager</h1>
          <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-1">Manage your domains and verify your account with ease.</p>
        </div>

        {/* Card */}
        <div className="card p-6 shadow-xl shadow-black/5 dark:shadow-black/30">
          {/* Tabs */}
          <div className="flex bg-[#f1f3f9] dark:bg-[#1e2235] rounded-xl p-1 mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  mode === m ? 'bg-white dark:bg-[#151829] text-[#0f1523] dark:text-[#eef0f8] shadow-sm' : 'text-[#6b7280] dark:text-[#8b92b3]'
                }`}>
                {m}
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
              <label className="label">Password</label>
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

        <p className="text-center text-xs text-[#6b7280] dark:text-[#8b92b3] mt-4">
          First account created becomes admin
        </p>
      </div>
    </div>
  );
}
