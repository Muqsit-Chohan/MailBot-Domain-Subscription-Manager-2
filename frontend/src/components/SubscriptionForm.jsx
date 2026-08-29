import { useState, useEffect } from 'react';
import { X, Plus, Sparkles, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import Modal from './Modal';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SUBSCRIPTION_TYPES = ['Domain', 'Hosting', 'SSL', 'Custom'];
const RENEWAL_CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'Custom'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'CAD', 'AUD'];
const COMMON_INTERVALS = [30, 15, 14, 7, 3, 1];   // predefined reminder options

export default function SubscriptionForm({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState({
    domain: '',
    registrar: '',
    clientName: '',
    clientEmails: [''],
    subscriptionType: 'Domain',
    renewalCycle: 'Yearly',
    expiryDate: '',
    cost: 0,
    currency: 'USD',
    sslExpiryDate: '',
    sslIssuer: '',
    sslValid: null,
    reminderIntervals: [30, 15, 7, 1],   // default intervals
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [fetchingWhois, setFetchingWhois] = useState(false);
  const [whoisFetched, setWhoisFetched] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setForm({
        domain: editing.domain || '',
        registrar: editing.registrar || '',
        clientName: editing.owner || '',
        clientEmails: editing.ownerEmails?.length ? editing.ownerEmails : [editing.ownerEmail || ''],
        subscriptionType: editing.subscriptionType || 'Domain',
        renewalCycle: editing.renewalCycle || 'Yearly',
        expiryDate: editing.expiryDate ? new Date(editing.expiryDate).toISOString().split('T')[0] : '',
        cost: editing.cost || 0,
        currency: editing.currency || 'USD',
        sslExpiryDate: editing.sslExpiryDate ? new Date(editing.sslExpiryDate).toISOString().split('T')[0] : '',
        sslIssuer: editing.sslIssuer || '',
        sslValid: typeof editing.sslValid === 'boolean' ? editing.sslValid : null,
        reminderIntervals: editing.reminderIntervals?.length ? editing.reminderIntervals : [30, 15, 7, 1],
        notes: editing.notes || '',
      });
      setWhoisFetched(false);
    } else {
      setForm({
        domain: '',
        registrar: '',
        clientName: '',
        clientEmails: [''],
        subscriptionType: 'Domain',
        renewalCycle: 'Yearly',
        expiryDate: '',
        cost: 0,
        currency: 'USD',
        sslExpiryDate: '',
        sslIssuer: '',
        sslValid: null,
        reminderIntervals: [30, 15, 7, 1],
        notes: '',
      });
      setWhoisFetched(false);
    }
  }, [editing, open]);

  // Handle basic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Auto-fetch domain WHOIS / RDAP and SSL
  const handleAutoFetch = async () => {
    if (!form.domain) {
      toast.error('Please enter a domain name first');
      return;
    }

    setFetchingWhois(true);
    try {
      const { data } = await api.post('/subscriptions/lookup', { domain: form.domain });
      
      const updates = {};
      if (data.registrar) updates.registrar = data.registrar;
      if (data.expiryDate) {
        updates.expiryDate = new Date(data.expiryDate).toISOString().split('T')[0];
      }
      if (data.ssl) {
        updates.sslValid = data.ssl.valid;
        if (data.ssl.validTo) {
          updates.sslExpiryDate = new Date(data.ssl.validTo).toISOString().split('T')[0];
        }
        if (data.ssl.issuer) updates.sslIssuer = data.ssl.issuer;
      }

      setForm(prev => ({ ...prev, ...updates }));
      setWhoisFetched(true);
      toast.success('Domain & SSL details fetched!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not auto-fetch domain details');
    } finally {
      setFetchingWhois(false);
    }
  };

  // Email array handlers
  const handleEmailChange = (index, value) => {
    const updated = [...form.clientEmails];
    updated[index] = value;
    setForm(prev => ({ ...prev, clientEmails: updated }));
  };
  const addEmailField = () => setForm(prev => ({ ...prev, clientEmails: [...prev.clientEmails, ''] }));
  const removeEmailField = (index) => {
    if (form.clientEmails.length <= 1) return;
    const updated = form.clientEmails.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, clientEmails: updated }));
  };
  const isEmailsValid = () => form.clientEmails.some(email => email.trim() !== '');

  // Toggle a reminder interval on/off
  const toggleInterval = (day) => {
    setForm(prev => {
      const already = prev.reminderIntervals.includes(day);
      if (already) {
        if (prev.reminderIntervals.length <= 1) return prev;
        return { ...prev, reminderIntervals: prev.reminderIntervals.filter(d => d !== day) };
      } else {
        return { ...prev, reminderIntervals: [...prev.reminderIntervals, day].sort((a,b) => b - a) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.domain || !form.clientName || !isEmailsValid() || !form.expiryDate || form.reminderIntervals.length === 0) {
      toast.error('Please fill all required fields and select at least one reminder interval.');
      return;
    }
    setSaving(true);

    const payload = {
      domain: form.domain.trim(),
      registrar: form.registrar?.trim() || '',
      owner: form.clientName.trim(),
      ownerEmail: form.clientEmails.find(e => e.trim() !== '') || '',
      ownerEmails: form.clientEmails.filter(e => e.trim() !== ''),
      subscriptionType: form.subscriptionType,
      renewalCycle: form.renewalCycle,
      expiryDate: form.expiryDate,
      cost: parseFloat(form.cost) || 0,
      currency: form.currency || 'USD',
      sslExpiryDate: form.sslExpiryDate || undefined,
      sslIssuer: form.sslIssuer || undefined,
      sslValid: form.sslValid,
      reminderIntervals: form.reminderIntervals,
      notes: form.notes,
    };

    try {
      if (editing) {
        await api.put(`/subscriptions/${editing._id}`, payload);
        toast.success('Subscription updated');
      } else {
        await api.post('/subscriptions', payload);
        toast.success('Subscription created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving subscription');
    } finally {
      setSaving(false);
    }
  };

  return (
     <Modal open={open} onClose={onClose} title={editing ? 'Edit Subscription' : 'Create Subscription'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 flex flex-col" style={{ maxHeight: '80vh' }}>
        
        {/* ===== Scrollable section (contains all form fields) ===== */}
        <div className="overflow-y-auto pr-2 space-y-5 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editing ? 'Update subscription details' : 'Add a new subscription to track'}
          </p>

          {/* Domain Name + Auto-fetch Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Domain / Subscription Name *</label>
              <button
                type="button"
                onClick={handleAutoFetch}
                disabled={fetchingWhois || !form.domain}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 disabled:opacity-50 transition"
              >
                {fetchingWhois ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                {fetchingWhois ? 'Fetching WHOIS...' : 'Auto-Fetch Details'}
              </button>
            </div>
            <input
              name="domain"
              className="input"
              placeholder="e.g. example.com or Acme Hosting"
              value={form.domain}
              onChange={handleChange}
              required
            />
          </div>

          {/* Registrar */}
          <div>
            <label className="label">Registrar / Provider</label>
            <input
              name="registrar"
              className="input"
              placeholder="e.g. GoDaddy, Namecheap, Cloudflare, AWS"
              value={form.registrar}
              onChange={handleChange}
            />
          </div>

          {/* Client Name */}
          <div>
            <label className="label">Client Name *</label>
            <input
              name="clientName"
              className="input"
              placeholder="John Doe"
              value={form.clientName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Client Emails (multiple) */}
          <div>
            <label className="label">Client Emails *</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">(Add multiple email addresses)</p>
            {form.clientEmails.map((email, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="email"
                  className="input flex-1"
                  placeholder="client@example.com"
                  value={email}
                  onChange={e => handleEmailChange(index, e.target.value)}
                  required={index === 0}
                />
                {form.clientEmails.length > 1 && (
                  <button type="button" onClick={() => removeEmailField(index)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addEmailField} className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2">
              <Plus size={14} /> Add Another Email
            </button>
            {!isEmailsValid() && (
              <p className="text-xs text-red-500 mt-1">At least one email address is required</p>
            )}
          </div>

          {/* Subscription Type & Renewal Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Subscription Type *</label>
              <select name="subscriptionType" className="input" value={form.subscriptionType} onChange={handleChange}>
                {SUBSCRIPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Renewal Cycle *</label>
              <select name="renewalCycle" className="input" value={form.renewalCycle} onChange={handleChange}>
                {RENEWAL_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Cost & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Renewal Cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="cost"
                className="input"
                placeholder="0.00"
                value={form.cost}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select name="currency" className="input" value={form.currency} onChange={handleChange}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="label">Expiry Date *</label>
            <input
              type="date"
              name="expiryDate"
              className="input"
              value={form.expiryDate}
              onChange={handleChange}
              required
            />
          </div>

          {/* SSL Status (if available or detected) */}
          {(form.sslExpiryDate || form.sslValid !== null) && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {form.sslValid ? (
                  <ShieldCheck size={16} className="text-emerald-500" />
                ) : (
                  <ShieldAlert size={16} className="text-amber-500" />
                )}
                <span>SSL Certificate Info</span>
                {form.sslValid && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold">VALID</span>}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                <div>Issuer: <span className="font-medium text-gray-700 dark:text-gray-300">{form.sslIssuer || 'Unknown'}</span></div>
                <div>SSL Expiry: <span className="font-medium text-gray-700 dark:text-gray-300">{form.sslExpiryDate || 'N/A'}</span></div>
              </div>
            </div>
          )}

          {/* Reminder Intervals */}
          <div>
            <label className="label">Reminder Intervals *</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select the days before expiry to send reminders</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_INTERVALS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleInterval(day)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.reminderIntervals.includes(day)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {day}d
                </button>
              ))}
            </div>
            {form.reminderIntervals.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Please select at least one reminder interval.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              name="notes"
              className="input"
              rows={3}
              placeholder="Additional notes..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>
        </div>
        {/* ===== End of scrollable section ===== */}

        {/* Fixed footer with buttons */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}