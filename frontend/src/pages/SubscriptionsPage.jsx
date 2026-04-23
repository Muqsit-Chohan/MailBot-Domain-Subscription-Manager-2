import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Send, Pencil, Trash2, RefreshCw, Globe } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import SubscriptionForm from '../components/SubscriptionForm';
import Modal from '../components/Modal';

const STATUS_OPTS = ['all', 'active', 'expiring_soon', 'expired'];

function StatusBadge({ status }) {
  const map = { active: 'badge-active', expiring_soon: 'badge-expiring', expired: 'badge-expired' };
  const labels = { active: 'Active', expiring_soon: 'Expiring', expired: 'Expired' };
  return <span className={map[status] || 'badge'}>{labels[status] || status}</span>;
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sendingTest, setSendingTest] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/subscriptions', { params: { page, status, search: search || undefined } });
      setSubs(data.subscriptions);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [status, search]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/subscriptions/${deleteTarget._id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      load();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const handleSendTest = async (sub) => {
    setSendingTest(sub._id);
    try {
      const { data } = await api.post(`/subscriptions/${sub._id}/send-test`);
      data.success ? toast.success('Test email sent!') : toast.error(`Failed: ${data.error}`);
    } catch { toast.error('Failed to send test email'); }
    finally { setSendingTest(null); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{total} domain{total !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Domain
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input className="input pl-10" placeholder="Search domains, owners..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all capitalize ${
                status === s
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#e2e6f0] dark:hover:bg-[#2a2f48]'
              }`}>
              {s === 'expiring_soon' ? 'Expiring' : s}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading && subs.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subs.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4">
              <Globe size={24} className="text-indigo-400" />
            </div>
            <p className="font-medium text-[#0f1523] dark:text-[#eef0f8]">No subscriptions yet</p>
            <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-1 mb-5">Add your first domain to start tracking expiry dates</p>
            <button onClick={() => setFormOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} /> Add your first domain
            </button>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Owner</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Reminders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(sub => {
                const days = differenceInDays(new Date(sub.expiryDate), new Date());
                return (
                  <tr key={sub._id}>
                    <td>
                      <div className="font-medium">{sub.domain}</div>
                      {sub.registrar && <div className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{sub.registrar}</div>}
                    </td>
                    <td>
                      <div>{sub.owner || '—'}</div>
                      <div className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{sub.ownerEmail}</div>
                    </td>
                    <td>
                      <div>{format(new Date(sub.expiryDate), 'MMM d, yyyy')}</div>
                      <div className={`text-xs mt-0.5 ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-[#6b7280] dark:text-[#8b92b3]'}`}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
                      </div>
                    </td>
                    <td><StatusBadge status={sub.status} /></td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {sub.reminderIntervals?.map(n => (
                          <span key={n} className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{n}d</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => handleSendTest(sub)}
                          disabled={sendingTest === sub._id}
                          title="Send test email"
                          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors disabled:opacity-40">
                          <Send size={14} className={sendingTest === sub._id ? 'animate-pulse' : ''} />
                        </button>
                        <button onClick={() => { setEditing(sub); setFormOpen(true); }}
                          title="Edit"
                          className="p-2 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setDeleteTarget(sub)}
                          title="Delete"
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition-all ${
                p === page
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#e2e6f0] dark:hover:bg-[#2a2f48]'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Form modal */}
      <SubscriptionForm open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={load} editing={editing} />

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Subscription" size="sm">
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3]">
          Delete <strong className="text-[#0f1523] dark:text-[#eef0f8]">{deleteTarget?.domain}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
