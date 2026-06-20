import { useState, useEffect } from 'react';
import { Plus, Search, Send, Pencil, Trash2, RefreshCw, Globe, MoreVertical } from 'lucide-react';
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
  const [actionsOpenId, setActionsOpenId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/subscriptions', { params: { page, status, search: search || undefined } });
        setSubs(data.subscriptions);
        setTotal(data.total);
        setPages(data.pages);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [page, status, search, refreshKey]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/subscriptions/${deleteTarget._id}`);
      toast.success('Deleted');
      setDeleteTarget(null);
      refresh();
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

 const handleSendTest = async (sub) => {
  setSendingTest(sub._id);
  try {
    const { data } = await api.post(`/subscriptions/${sub._id}/send-test`);
    if (data.success) {
      toast.success(data.message || 'Test email sent!');
    } else {
      toast.error(data.error || 'Failed to send test email');
    }
  } catch (err) {
    toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to send test email');
  } finally {
    setSendingTest(null);
  }
};

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{total} subscription{total !== 1 ? 's' : ''} tracked</p>
        </div>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={15} /> Add Subscription
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input className="input pl-10" placeholder="Search subscriptions, owners..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all capitalize ${
                status === s
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#e2e6f0] dark:hover:bg-[#2a2f48]'
              }`}>
              {s === 'expiring_soon' ? 'Expiring' : s}
            </button>
          ))}
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-2">
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
            <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-1 mb-5">Add your first subscription to start tracking expiry dates</p>
            <button onClick={() => setFormOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} /> Add your first subscription
            </button>
          </div>
        ) : (
          <div className="hidden sm:block">
            <table>
              <thead>
                <tr>
                  <th>Subscription</th>
                  <th>Owner</th>
                  <th>Type</th>
                  <th>Renewal</th>
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
                        <div className="text-sm font-medium">{sub.subscriptionType || 'Domain'}</div>
                      </td>
                      <td>
                        <div className="text-sm font-medium">{sub.renewalCycle || 'Yearly'}</div>
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
                      <td className="relative">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActionsOpenId(actionsOpenId === sub._id ? null : sub._id); }}
                          title="More actions"
                          className="p-2 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        {actionsOpenId === sub._id && (
                          <div className="absolute right-0 z-50 mt-2 min-w-[12rem] rounded-2xl border border-[#e5e7eb] dark:border-[#2a2f48] bg-white dark:bg-[#111827] shadow-2xl py-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsOpenId(null);
                                handleSendTest(sub);
                              }}
                              disabled={sendingTest === sub._id}
                              className="block w-full text-left px-4 py-2 text-sm text-[#0f1523] dark:text-[#eef0f8] hover:bg-gray-100 dark:hover:bg-[#1e2138] disabled:opacity-40"
                            >
                              Send test email
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsOpenId(null);
                                setEditing(sub);
                                setFormOpen(true);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-[#0f1523] dark:text-[#eef0f8] hover:bg-gray-100 dark:hover:bg-[#1e2138]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionsOpenId(null);
                                setDeleteTarget(sub);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && subs.length > 0 && (
        <div className="space-y-4 sm:hidden">
          {subs.map(sub => {
            const days = differenceInDays(new Date(sub.expiryDate), new Date());
            return (
              <div key={sub._id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{sub.domain}</div>
                    {sub.registrar && <div className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-1 truncate">{sub.registrar}</div>}
                    <div className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-2">
                      {sub.owner || '—'} · {sub.ownerEmail || '—'}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActionsOpenId(actionsOpenId === sub._id ? null : sub._id); }}
                      className="p-2 rounded-lg hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3] transition-colors"
                    >
                      <MoreVertical size={18} />
                    </button>
                    {actionsOpenId === sub._id && (
                      <div className="absolute right-0 z-50 mt-2 min-w-[11rem] rounded-2xl border border-[#e5e7eb] dark:border-[#2a2f48] bg-white dark:bg-[#111827] shadow-2xl py-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsOpenId(null);
                            handleSendTest(sub);
                          }}
                          disabled={sendingTest === sub._id}
                          className="block w-full text-left px-4 py-2 text-sm text-[#0f1523] dark:text-[#eef0f8] hover:bg-gray-100 dark:hover:bg-[#1e2138] disabled:opacity-40"
                        >
                          Send test email
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsOpenId(null);
                            setEditing(sub);
                            setFormOpen(true);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-[#0f1523] dark:text-[#eef0f8] hover:bg-gray-100 dark:hover:bg-[#1e2138]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionsOpenId(null);
                            setDeleteTarget(sub);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">Type</p>
                    <p className="font-medium">{sub.subscriptionType || 'Domain'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">Renewal</p>
                    <p className="font-medium">{sub.renewalCycle || 'Yearly'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">Expiry</p>
                    <p>{format(new Date(sub.expiryDate), 'MMM d, yyyy')}</p>
                    <p className={`text-xs mt-0.5 ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-[#6b7280] dark:text-[#8b92b3]'}`}>
                      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">Status</p>
                    <StatusBadge status={sub.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sub.reminderIntervals?.map(n => (
                    <span key={n} className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{n}d</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        onSaved={refresh} editing={editing} />

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
