import { useState } from 'react';
import { Mail, Play, CheckCircle, XCircle, Info, Server } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#e2e6f0] dark:border-[#2a2f48]">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
          <Icon size={15} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="font-semibold text-[#0f1523] dark:text-[#eef0f8] text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [cronResult, setCronResult] = useState(null);
  const [runningCron, setRunningCron] = useState(false);

  const testEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/settings/test-email');
      setTestResult(data);
      data.success ? toast.success('SMTP connection verified!') : toast.error('SMTP connection failed');
    } catch (err) {
      const msg = err.response?.data?.error || 'Connection failed';
      setTestResult({ success: false, error: msg });
      toast.error(msg);
    } finally { setTesting(false); }
  };

  const runCron = async () => {
    setRunningCron(true);
    setCronResult(null);
    try {
      const { data } = await api.post('/settings/run-cron');
      setCronResult(data);
      toast.success(`Cron complete: ${data.sent} sent, ${data.failed} failed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cron failed');
    } finally { setRunningCron(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">Application configuration</p>
      </div>

      {/* SMTP Test */}
      <Section title="Email / SMTP" icon={Mail}>
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mb-4">
          Configure SMTP credentials in your backend <code className="font-mono text-xs bg-[#f1f3f9] dark:bg-[#1e2235] px-1.5 py-0.5 rounded">.env</code> file.
          Use the button below to verify your connection.
        </p>

        <div className="bg-[#f8f9fc] dark:bg-[#0d0f1a] rounded-xl p-4 mb-4 font-mono text-xs space-y-1 text-[#6b7280] dark:text-[#8b92b3]">
          {['SMTP_HOST=smtp.gmail.com', 'SMTP_PORT=587', 'SMTP_SECURE=false', 'SMTP_USER=you@gmail.com', 'SMTP_PASS=your_app_password', 'SMTP_FROM_NAME=MailBot', 'SMTP_FROM_EMAIL=you@gmail.com'].map(line => (
            <div key={line}><span className="text-indigo-500 dark:text-indigo-400">{line.split('=')[0]}</span>=<span className="text-emerald-600 dark:text-emerald-400">{line.split('=').slice(1).join('=')}</span></div>
          ))}
        </div>

        <button onClick={testEmail} disabled={testing} className="btn-primary flex items-center gap-2">
          <Mail size={14} />
          {testing ? 'Testing…' : 'Test SMTP Connection'}
        </button>

        {testResult && (
          <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
            testResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          }`}>
            {testResult.success ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {testResult.success ? 'Connection successful! SMTP is configured correctly.' : `Error: ${testResult.error}`}
          </div>
        )}
      </Section>

      {/* Cron */}
      <Section title="Cron Scheduler" icon={Server}>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 mb-4">
          <Info size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-400">
            The scheduler runs automatically every day at <strong>8:00 AM UTC</strong>.
            It checks all subscriptions and sends reminder emails based on configured intervals.
            Use the button below to trigger it manually.
          </p>
        </div>

        {user?.role === 'admin' ? (
          <>
            <button onClick={runCron} disabled={runningCron} className="btn-primary flex items-center gap-2">
              <Play size={14} />
              {runningCron ? 'Running…' : 'Run Reminder Check Now'}
            </button>

            {cronResult && (
              <div className="mt-3 p-3 rounded-lg bg-[#f8f9fc] dark:bg-[#0d0f1a] text-sm">
                <p className="font-medium text-[#0f1523] dark:text-[#eef0f8]">Cron completed</p>
                <div className="flex gap-4 mt-1">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ {cronResult.sent} sent</span>
                  {cronResult.failed > 0 && <span className="text-red-500">✗ {cronResult.failed} failed</span>}
                  {cronResult.error && <span className="text-red-500">Error: {cronResult.error}</span>}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[#6b7280] dark:text-[#8b92b3]">Admin access required to trigger the cron job manually.</p>
        )}
      </Section>

      {/* Account info */}
      <Section title="Account" icon={Info}>
        <div className="space-y-3">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#f1f3f9] dark:border-[#1e2235] last:border-0">
              <span className="text-xs font-medium text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">{label}</span>
              <span className="text-sm text-[#0f1523] dark:text-[#eef0f8] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={Info}>
        <div className="space-y-2 text-sm text-[#6b7280] dark:text-[#8b92b3]">
          <p><strong className="text-[#0f1523] dark:text-[#eef0f8]">MailBot</strong> — Domain Subscription Manager</p>
          <p>Stack: React + Vite, Tailwind CSS, Node.js, Express, MongoDB, Nodemailer, node-cron</p>
          <p className="font-mono text-xs">v1.0.0</p>
        </div>
      </Section>
    </div>
  );
}
