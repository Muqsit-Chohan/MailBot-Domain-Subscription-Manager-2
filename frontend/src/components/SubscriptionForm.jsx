import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const DEFAULTS = {
  domain: '', registrar: '', owner: '', ownerEmail: '',
  expiryDate: '', reminderIntervals: [30, 15, 7, 1],
  notes: '', autoRenew: false, notificationsEnabled: true,
};

const INTERVALS = [1, 3, 7, 14, 15, 30, 60, 90];

export default function SubscriptionForm({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        ...editing,
        expiryDate: editing.expiryDate ? format(new Date(editing.expiryDate), 'yyyy-MM-dd') : '',
        reminderIntervals: editing.reminderIntervals || [30, 15, 7, 1],
      });
    } else {
      setForm(DEFAULTS);
    }
  }, [editing, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleInterval = (n) => {
    set('reminderIntervals', form.reminderIntervals.includes(n)
      ? form.reminderIntervals.filter(i => i !== n)
      : [...form.reminderIntervals, n].sort((a, b) => b - a));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.put(`/subscriptions/${editing._id}`, form);
        toast.success('Subscription updated');
      } else {
        await api.post('/subscriptions', form);
        toast.success('Subscription added');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Error saving');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Subscription' : 'Add Subscription'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Domain *</label>
            <input className="input" placeholder="example.com" value={form.domain}
              onChange={e => set('domain', e.target.value)} required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Registrar</label>
            <input className="input" placeholder="GoDaddy, Namecheap…" value={form.registrar}
              onChange={e => set('registrar', e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Owner Name</label>
            <input className="input" placeholder="John Doe" value={form.owner}
              onChange={e => set('owner', e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Owner Email *</label>
            <input className="input" type="email" placeholder="owner@email.com" value={form.ownerEmail}
              onChange={e => set('ownerEmail', e.target.value)} required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Expiry Date *</label>
            <input className="input" type="date" value={form.expiryDate}
              onChange={e => set('expiryDate', e.target.value)} required />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Notes</label>
            <input className="input" placeholder="Optional notes…" value={form.notes}
              onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {/* Reminder intervals */}
        <div>
          <label className="label">Reminder Intervals (days before expiry)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {INTERVALS.map(n => (
              <button key={n} type="button" onClick={() => toggleInterval(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  form.reminderIntervals.includes(n)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#e2e6f0] dark:hover:bg-[#2a2f48]'
                }`}>
                {n}d
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          {[
            { key: 'notificationsEnabled', label: 'Notifications Enabled' },
            { key: 'autoRenew', label: 'Auto-Renew' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors relative ${form[key] ? 'bg-indigo-600' : 'bg-[#d1d5db] dark:bg-[#2a2f48]'}`}
                onClick={() => set(key, !form[key])}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-[#6b7280] dark:text-[#8b92b3]">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : editing ? 'Save Changes' : 'Add Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
