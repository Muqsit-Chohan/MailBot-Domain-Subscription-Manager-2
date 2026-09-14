import { useState, useEffect } from 'react';
import { Mail, Save, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function EmailSettings() {
  const [form, setForm] = useState({
    host: 'smtp.gmail.com',
    port: '587',
    username: '',
    password: '',
    senderEmail: '',
    senderName: '',
    secure: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // { success, message }

  // Load existing SMTP config from backend
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await api.get('/settings/smtp');
        if (data && data.host) {
          setForm({
            host: data.host || 'smtp.gmail.com',
            port: String(data.port || '587'),
            username: data.username || '',
            password: data.password || '',
            senderEmail: data.senderEmail || '',
            senderName: data.senderName || '',
            secure: data.secure || false,
          });
        }
      } catch (err) {
        // no saved config – leave defaults
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Save SMTP Configuration
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.host || !form.port || !form.username || !form.password || !form.senderEmail) {
      toast.error('Please fill all required fields.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, port: parseInt(form.port) };
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
    setTestStatus(null);
    try {
      const testRecipient = prompt('Enter email address to send test to:', form.senderEmail);
      if (!testRecipient) {
        setTesting(false);
        return;
      }
      const payload = { ...form, port: parseInt(form.port), to: testRecipient };
      const { data } = await api.post('/settings/test-email', payload);
      setTestStatus({ success: true, message: data.message || 'Test email sent successfully!' });
      toast.success(data.message || 'Test email sent! Check your inbox.');
    } catch (err) {
      const msg = err.response?.data?.message || 'Test email failed';
      setTestStatus({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h1 className="page-title">Email Settings</h1>
        <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc] mt-0.5">
          Configure your SMTP settings to send automated email reminders
        </p>
      </div>

      {/* SMTP Configuration Card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-[#e2e6f0] dark:border-[#373e47]">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <Mail size={15} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="font-semibold text-[#0f1523] dark:text-[#eef0f8] text-sm">SMTP Configuration</h2>
        </div>
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
                value={form.host}
                onChange={handleChange}
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
                value={form.port}
                onChange={handleChange}
                placeholder="587"
                required
              />
            </div>
            <div>
              <label className="label">SMTP Username *</label>
              <input
                className="input"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="sara@gmail.com"
                required
              />
            </div>
            <div>
              <label className="label">SMTP Password *</label>
              <input
                className="input"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="label">Sender Email *</label>
              <input
                className="input"
                name="senderEmail"
                value={form.senderEmail}
                onChange={handleChange}
                placeholder="sender@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Sender Name</label>
              <input
                className="input"
                name="senderName"
                value={form.senderName}
                onChange={handleChange}
                placeholder="Your Company Name"
              />
            </div>
          </div>

          {/* TLS/SSL Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="secure"
              checked={form.secure}
              onChange={handleChange}
              className="rounded"
            />
            <span className="text-sm text-[#6b7280] dark:text-[#a8b0bc]">Enable TLS/SSL</span>
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
              <li><strong>Recommended:</strong> Host: smtp.gmail.com, Port: 587, TLS: Enabled (uses STARTTLS)</li>
              <li><strong>Alternative:</strong> Host: smtp.gmail.com, Port: 465, TLS: Enabled (uses SSL)</li>
            </ul>
          </div>

          {/* Action Buttons */}
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
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>

        {/* Test Result Feedback */}
        {testStatus && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg ${
              testStatus.success
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {testStatus.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {testStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
