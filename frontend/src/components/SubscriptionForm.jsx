import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import Modal from './Modal';
import api from '../lib/api';
import toast from 'react-hot-toast';

const SUBSCRIPTION_TYPES = ['Domain', 'Hosting', 'SSL', 'Custom'];
const RENEWAL_CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'Custom'];
const COMMON_INTERVALS = [30, 15, 14, 7, 3, 1];   // predefined reminder options

export default function SubscriptionForm({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState({
    domain: '',
    clientName: '',
    clientEmails: [''],
    subscriptionType: 'Domain',
    renewalCycle: 'Yearly',
    expiryDate: '',
    reminderIntervals: [30, 15, 7, 1],   // default intervals (as before)
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setForm({
        domain: editing.domain || '',
        clientName: editing.owner || '',
        clientEmails: editing.ownerEmails?.length ? editing.ownerEmails : [editing.ownerEmail || ''],
        subscriptionType: editing.subscriptionType || 'Domain',
        renewalCycle: editing.renewalCycle || 'Yearly',
        expiryDate: editing.expiryDate ? new Date(editing.expiryDate).toISOString().split('T')[0] : '',
        reminderIntervals: editing.reminderIntervals?.length ? editing.reminderIntervals : [30, 15, 7, 1],
        notes: editing.notes || '',
      });
    } else {
      setForm({
        domain: '',
        clientName: '',
        clientEmails: [''],
        subscriptionType: 'Domain',
        renewalCycle: 'Yearly',
        expiryDate: '',
        reminderIntervals: [30, 15, 7, 1],   // default again
        notes: '',
      });
    }
  }, [editing, open]);

  // Handle basic input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
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
        // Don't allow removing the last interval
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
      owner: form.clientName.trim(),
      ownerEmail: form.clientEmails.find(e => e.trim() !== '') || '',
      ownerEmails: form.clientEmails.filter(e => e.trim() !== ''),
      subscriptionType: form.subscriptionType,
      renewalCycle: form.renewalCycle,
      expiryDate: form.expiryDate,
      reminderIntervals: form.reminderIntervals,   // <-- yahan intervals bhej rahe hain
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

          {/* Subscription Name */}
          <div>
            <label className="label">Subscription Name *</label>
            <input
              name="domain"
              className="input"
              placeholder="e.g. example.com or Acme Hosting"
              value={form.domain}
              onChange={handleChange}
              required
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