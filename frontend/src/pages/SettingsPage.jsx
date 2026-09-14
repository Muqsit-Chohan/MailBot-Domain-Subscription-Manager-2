import { useState, useEffect } from 'react';
import {
  Mail, Play, CheckCircle, XCircle, Info, Server,
  Save, Send, Eye, EyeOff
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#e2e6f0] dark:border-[#373e47]">
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

  // ---------- SMTP form state ----------
  const [smtpForm, setSmtpForm] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    username: '',
    password: '',
    senderEmail: '',
    senderName: '',
    secure: false,
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Cron state
  const [cronResult, setCronResult] = useState(null);
  const [runningCron, setRunningCron] = useState(false);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Load saved SMTP & Profile on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await api.get('/settings/smtp');
        if (data && data.host) {
          setSmtpForm({
            host: data.host || 'smtp.gmail.com',
            port: String(data.port || '587'),
            username: data.username || '',
            password: data.password || '',
            senderEmail: data.senderEmail || '',
            senderName: data.senderName || '',
            secure: data.secure || false,
          });
        }
      } catch (err) {}

      try {
        const { data: profile } = await api.get('/auth/me');
        if (profile) {
          setWebhookUrl(profile.webhookUrl || '');
          setWebhookEnabled(!!profile.webhookEnabled);
        }
      } catch (err) {}
    };
    loadConfig();
  }, []);

  const handleSaveProfile = async () => {
    if (webhookEnabled && !webhookUrl.trim()) {
      toast.error('Enter a webhook URL before enabling reminder alerts.');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', { webhookUrl: webhookUrl.trim(), webhookEnabled });
      toast.success(webhookEnabled ? 'Webhook saved and reminder alerts enabled!' : 'Webhook saved. Reminder alerts are disabled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Please enter a Webhook URL');
      return;
    }
    setTestingWebhook(true);
    try {
      await api.post('/settings/test-webhook', { webhookUrl });
      toast.success('Test delivered. To receive subscription alerts, enable notifications and save settings.', { duration: 7000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to trigger webhook');
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Save SMTP configuration
  const handleSave = async (e) => {
    e.preventDefault();
    if (!smtpForm.host || !smtpForm.port || !smtpForm.username ||
        !smtpForm.password || !smtpForm.senderEmail) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...smtpForm, port: parseInt(smtpForm.port) };
      const { data } = await api.put('/settings/smtp', payload);
      toast.success(data.message || 'SMTP configuration saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Send Test Email
  const handleTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const testRecipient = prompt('Enter email address to send test to:', smtpForm.senderEmail);
      if (!testRecipient) {
        setTesting(false);
        return;
      }
      const payload = { ...smtpForm, port: parseInt(smtpForm.port), to: testRecipient };
      const { data } = await api.post('/settings/test-email', payload);
      setTestResult({ success: true, error: null, message: data.message || 'Test email sent!' });
      toast.success(data.message || 'Test email sent! Check your inbox.');
    } catch (err) {
      const msg = err.response?.data?.message
        || err.message
        || 'Test email failed';
      setTestResult({ success: false, error: msg, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  // Manual cron trigger
  const runCron = async () => {
    setRunningCron(true);
    setCronResult(null);
    try {
      const { data } = await api.post('/settings/run-cron');
      setCronResult(data);
      const summary = `Email: ${data.sent} sent, ${data.failed} failed. Webhook: ${data.webhookSent || 0} sent, ${data.webhookFailed || 0} failed, ${data.webhookSkipped || 0} skipped.`;
      if (data.error || data.failed || data.webhookFailed) toast.error(data.error || summary);
      else if (data.due === 0) toast('No subscriptions are due on their configured reminder days.');
      else toast.success(summary);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cron failed');
    } finally {
      setRunningCron(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc] mt-0.5">
          Application configuration
        </p>
      </div>

      {/* ===== UPDATED Email/SMTP Section ===== */}
      <Section title="SMTP Configuration" icon={Mail}>
        <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc] mb-4">
          Configure your email server settings to send automated reminders
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">SMTP Host *</label>
              <input
                className="input"
                name="host"
                value={smtpForm.host}
                onChange={handleSmtpChange}
                placeholder="smtp.gmail.com"
                required
              />
            </div>
            <div>
              <label className="label">SMTP Port *</label>
              <input
                className="input"
                name="port"
                type="number"
                value={smtpForm.port}
                onChange={handleSmtpChange}
                placeholder="587"
                required
              />
            </div>
            <div>
              <label className="label">SMTP Username *</label>
              <input
                className="input"
                name="username"
                value={smtpForm.username}
                onChange={handleSmtpChange}
                placeholder="you@gmail.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">SMTP Password *</label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Enter without spacing
                </span>
              </div>
              <div className="relative">
                <input
                  className="input pr-10"
                  name="password"
                  type={showSmtpPass ? 'text' : 'password'}
                  value={smtpForm.password}
                  onChange={handleSmtpChange}
                  placeholder="16-character app password (e.g. abcdefghijklmnop)"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] dark:hover:text-[#eef0f8] transition-colors"
                  title={showSmtpPass ? 'Hide password' : 'Show password'}
                >
                  {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[#6b7280] dark:text-[#a8b0bc] mt-1">
                Paste your 16-character Google App Password without any spaces.
              </p>
            </div>
            <div>
              <label className="label">Sender Email *</label>
              <input
                className="input"
                name="senderEmail"
                value={smtpForm.senderEmail}
                onChange={handleSmtpChange}
                placeholder="sender@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Sender Name</label>
              <input
                className="input"
                name="senderName"
                value={smtpForm.senderName}
                onChange={handleSmtpChange}
                placeholder="Your Company Name"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="secure"
              checked={smtpForm.secure}
              onChange={handleSmtpChange}
              className="rounded"
            />
            <span className="text-sm text-[#6b7280] dark:text-[#a8b0bc]">
              Enable TLS/SSL
            </span>
          </label>

          {/* Gmail Setup Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Gmail Setup Instructions
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc pl-4">
              <li>Enable 2-Step Verification in your Google Account</li>
              <li>
                Generate an App Password:{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Google App Passwords
                </a>
              </li>
              <li>Use the app password (not your regular password) in SMTP Password</li>
              <li><strong>Recommended:</strong> Host: smtp.gmail.com, Port: 587, TLS/SSL checkbox: off (uses STARTTLS)</li>
              <li><strong>Alternative:</strong> Host: smtp.gmail.com, Port: 465, TLS/SSL checkbox: on (uses SSL)</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testing}
              className="btn-secondary flex items-center gap-2"
            >
              <Send size={14} />
              {testing ? 'Sending...' : 'Send Test Email'}
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        {testResult && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {testResult.success ? <CheckCircle size={15} /> : <XCircle size={15} />}
            {testResult.success
              ? 'Test email sent successfully!'
              : `Error: ${testResult.error || testResult.message}`}
          </div>
        )}
      </Section>

      {/* Cron Section – unchanged */}
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
          <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc]">
            Admin access required to trigger the cron job manually.
          </p>
        )}
      </Section>

      {/* Webhook Notifications Section */}
      <Section title="Multi-Channel Webhooks (Discord / Slack)" icon={Server}>
        <div className="space-y-4">
          <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc]">
            Receive instant renewal alerts directly in your Discord channel, Slack channel, or custom server.
            {' '}Testing only checks the URL. Enable notifications and save settings to receive subscription alerts.
          </p>

          <div>
            <label className="label">Webhook URL</label>
            <input
              className="input"
              placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={webhookEnabled}
              onChange={(e) => setWebhookEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-[#0f1523] dark:text-[#eef0f8] font-medium">
              Enable Webhook Notifications for renewal reminders
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook || !webhookUrl}
              className="btn-secondary flex items-center gap-2"
            >
              <Send size={14} />
              {testingWebhook ? 'Sending...' : 'Test Webhook Alert'}
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={14} />
              {savingProfile ? 'Saving...' : 'Save Webhook Settings'}
            </button>
          </div>
        </div>
      </Section>

      {/* Account info */}
      <Section title="Account" icon={Info}>
        <div className="space-y-3">
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role },
            { label: 'Webhook Status', value: webhookEnabled ? 'Enabled' : 'Disabled' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#f1f3f9] dark:border-[#2b3037] last:border-0">
              <span className="text-xs font-medium text-[#6b7280] dark:text-[#a8b0bc] uppercase tracking-wide">{label}</span>
              <span className="text-sm text-[#0f1523] dark:text-[#eef0f8] font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* About */}
      <Section title="About" icon={Info}>
        <div className="space-y-2 text-sm text-[#6b7280] dark:text-[#a8b0bc]">
          <p><strong className="text-[#0f1523] dark:text-[#eef0f8]">MailBot Domain Manager</strong></p>
          <p>Stack: React + Vite, Tailwind CSS, Node.js, Express, MongoDB, Nodemailer, node-cron</p>
          <p className="font-mono text-xs">v1.0.0</p>
        </div>
      </Section>
    </div>
  );
}
