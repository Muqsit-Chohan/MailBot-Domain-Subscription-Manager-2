import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function EmailSettings() {
  const [form, setForm] = useState({
    host: '',
    port: 587,
    username: '',
    password: '',
    senderEmail: '',
    senderName: '',
    secure: false, // TLS/SSL
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load existing SMTP config (if any)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data } = await api.get('/settings/smtp');
        if (data) {
          setForm({
            host: data.host || '',
            port: data.port || 587,
            username: data.username || '',
            password: data.password || '',
            senderEmail: data.senderEmail || '',
            senderName: data.senderName || '',
            secure: data.secure || false,
          });
        }
      } catch (err) {
        // no config yet – leave empty
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

  const validate = () => {
    if (!form.host || !form.port || !form.username || !form.password || !form.senderEmail) {
      toast.error('Please fill all required fields.');
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await api.put('/settings/smtp', form);
      toast.success('SMTP configuration saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!validate()) return;
    setTesting(true);
    try {
      // Send test email to senderEmail itself (or ask for a test recipient)
      const testRecipient = prompt('Enter email address to send test to:', form.senderEmail);
      if (!testRecipient) return;
      await api.post('/settings/test-email', {
        ...form,
        port: parseInt(form.port),
        to: testRecipient,
      });
      toast.success('Test email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test email failed');
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
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Email Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure your SMTP settings to send automated email reminders
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          SMTP Configuration
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
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

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="secure"
              checked={form.secure}
              onChange={handleChange}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable TLS/SSL</span>
          </label>

          {/* Gmail Setup Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              Gmail Setup Instructions
            </h3>
            <ul className="text-xs text-blue-800 dark:text-blue-200 list-disc pl-4 space-y-1">
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

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testing}
              className="btn-secondary"
            >
              {testing ? 'Sending...' : 'Send Test Email'}
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}