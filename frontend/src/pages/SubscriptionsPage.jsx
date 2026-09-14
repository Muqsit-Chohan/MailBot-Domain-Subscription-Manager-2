import { useState, useEffect } from 'react';
import { Plus, Search, Send, Pencil, Trash2, RefreshCw, Globe, MoreVertical, Download, Upload, ShieldCheck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
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

  // CSV Import/Export state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const response = await api.get('/subscriptions/export-csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriptions-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully!');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const parseAndImportCsv = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste CSV data or choose a file');
      return;
    }

    setImporting(true);
    try {
      const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('CSV must contain a header and at least one row');
      }

      // Check header or parse lines
      const headerLine = lines[0].toLowerCase();
      const rows = lines.slice(1);
      const items = [];

      for (const row of rows) {
        // basic CSV comma splitter handling quotes
        const match = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
        const cols = match.map(c => c.replace(/^"|"$/g, '').trim());

        if (cols.length >= 3) {
          items.push({
            domain: cols[0],
            registrar: cols[1] || '',
            owner: cols[2] || '',
            ownerEmail: cols[3] || (cols[2].includes('@') ? cols[2] : 'admin@domain.com'),
            subscriptionType: cols[4] || 'Domain',
            renewalCycle: cols[5] || 'Yearly',
            expiryDate: cols[6] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            cost: parseFloat(cols[7]) || 0,
            currency: cols[8] || 'USD',
          });
        }
      }

      if (items.length === 0) {
        throw new Error('No valid rows found in CSV');
      }

      const { data } = await api.post('/subscriptions/import-csv', { items });
      toast.success(data.message || `Imported ${data.createdCount} subscriptions!`);
      setImportModalOpen(false);
      setCsvText('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result || '');
    };
    reader.readAsText(file);
  };

  const handleSendTest = async (sub) => {
    setSendingTest(sub._id);
    try {
      const { data } = await api.post(`/subscriptions/${sub._id}/send-test`);
      if (data.success) {
        if (data.webhook && !data.webhook.success) {
          toast.error(data.message, { duration: 8000 });
        } else {
          toast.success(data.message || 'Test email sent!');
        }
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
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h1 className="page-title">Subscriptions</h1>
          <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">{total} subscription{total !== 1 ? 's' : ''} tracked</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button onClick={handleExportCsv} disabled={exporting || subs.length === 0} className="btn-secondary flex items-center gap-1 sm:gap-1.5 text-xs py-1.5 sm:py-2 px-2 sm:px-3">
            <Download size={13} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export CSV'}</span><span className="sm:hidden">{exporting ? '...' : 'Export'}</span>
          </button>
          <button onClick={() => setImportModalOpen(true)} className="btn-secondary flex items-center gap-1 sm:gap-1.5 text-xs py-1.5 sm:py-2 px-2 sm:px-3">
            <Upload size={13} className="sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Import CSV</span><span className="sm:hidden">Import</span>
          </button>
          <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 sm:py-2 px-2.5 sm:px-3">
            <Plus size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add Subscription</span><span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input className="input pl-10" placeholder="Search subscriptions, owners..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs font-semibold transition-all capitalize border ${
                status === s
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                  : 'bg-white dark:bg-[#23272d] border-[#dde1e9] dark:border-[#373e47] text-[#6b7280] dark:text-[#a1a1aa] hover:bg-[#f0f2f5] dark:hover:bg-[#2b3037] hover:text-[#111827] dark:hover:text-[#e7e9ed]'
              }`}>
              {s === 'expiring_soon' ? 'Expiring' : s}
            </button>
          ))}
        </div>
        <button onClick={refresh} className="btn-secondary flex items-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2 sm:px-3">
          <RefreshCw size={13} className={`${loading ? 'animate-spin' : ''} sm:w-3.5 sm:h-3.5`} /> <span className="hidden sm:inline">Refresh</span>
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
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 border border-indigo-200/50 dark:border-indigo-500/20">
              <Globe size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="font-bold text-[#111827] dark:text-[#e7e9ed]">No subscriptions yet</p>
            <p className="text-sm text-[#6b7280] dark:text-[#a1a1aa] mt-1 mb-5">Add your first subscription to start tracking expiry dates</p>
            <button onClick={() => setFormOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} /> Add your first subscription
            </button>
          </div>
        ) : (
          <div className="hidden sm:block">
            <table>
              <thead>
                <tr>
                  <th className="w-1/4">Domain & SSL</th>
                  <th className="w-1/5">Client / Owner</th>
                  <th className="w-1/6">Plan & Cost</th>
                  <th className="w-1/6">Expiry Date</th>
                  <th className="w-1/6">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dde1e9] dark:divide-[#373e47]">
                {subs.map(sub => {
                  const days = differenceInDays(new Date(sub.expiryDate), new Date());
                  const cleanDomain = (sub.domain || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
                  return (
                    <tr key={sub._id} className="hover:bg-[#f8f9fb] dark:hover:bg-[#1a1a1a] transition-colors">
                      {/* 1. Domain & SSL */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#111827] dark:text-[#e7e9ed]">{cleanDomain}</span>
                            <a
                              href={`https://${cleanDomain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#9ca3af] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Open website"
                            >
                              <Globe size={13} />
                            </a>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {sub.registrar && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[#4b5563] dark:text-white/60 border border-gray-200 dark:border-white/5">
                                {sub.registrar.replace(/operations,?\s*uab/i, '').trim() || sub.registrar}
                              </span>
                            )}
                            {sub.sslExpiryDate && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  sub.sslValid !== false
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                    : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                                }`}
                                title={`SSL Issuer: ${sub.sslIssuer || 'Unknown'}`}
                              >
                                <ShieldCheck size={11} className={sub.sslValid !== false ? 'text-emerald-500' : 'text-red-500'} />
                                SSL: {format(new Date(sub.sslExpiryDate), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Client / Owner */}
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs text-[#111827] dark:text-[#e7e9ed]">{sub.owner || '—'}</span>
                          <span className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5 truncate max-w-[180px]">{sub.ownerEmail}</span>
                        </div>
                      </td>

                      {/* 3. Plan & Cost */}
                      <td>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                              {sub.subscriptionType === 'Custom' && sub.customTypeName ? sub.customTypeName : (sub.subscriptionType || 'Domain')}
                            </span>
                            <span className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">({sub.renewalCycle || 'Yearly'})</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                            {sub.cost ? `${sub.currency || 'USD'} ${sub.cost}` : 'Free / Unset'}
                          </span>
                        </div>
                      </td>

                      {/* 4. Expiry Date */}
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-xs text-[#111827] dark:text-[#e7e9ed]">
                            {format(new Date(sub.expiryDate), 'MMM d, yyyy')}
                          </span>
                          <span
                            className={`text-[11px] font-bold mt-1 px-2 py-0.5 rounded-full w-fit border ${
                              days < 0
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/20'
                                : days <= 15
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/20'
                                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-white/60 dark:border-white/5'
                            }`}
                          >
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                          </span>
                        </div>
                      </td>

                      {/* 5. Status & Reminders */}
                      <td>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={sub.status} />
                          <span className="text-[11px] text-[#6b7280] dark:text-[#71717a]">
                            {sub.reminderIntervals?.length || 0} reminders ({sub.reminderIntervals?.slice(0, 3).join(', ')}d...)
                          </span>
                        </div>
                      </td>

                      {/* 6. Actions */}
                      <td>
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            type="button"
                            onClick={() => handleSendTest(sub)}
                            disabled={sendingTest === sub._id}
                            title="Send Test Email"
                            className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-[#dde1e9] dark:border-[#373e47] hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-colors disabled:opacity-40 shadow-sm"
                          >
                            <Send size={13} className={sendingTest === sub._id ? 'animate-pulse' : ''} />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(sub); setFormOpen(true); }}
                            title="Edit"
                            className="p-2 rounded-xl text-[#6b7280] dark:text-[#a1a1aa] hover:bg-[#f0f2f5] dark:hover:bg-[#2b3037] hover:text-[#111827] dark:hover:text-[#e7e9ed] border border-[#dde1e9] dark:border-[#373e47] transition-colors shadow-sm"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sub)}
                            title="Delete"
                            className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-[#dde1e9] dark:border-[#373e47] hover:border-red-200 dark:hover:border-red-500/30 transition-colors shadow-sm"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
        <div className="space-y-3 sm:hidden">
          {subs.map(sub => {
            const days = differenceInDays(new Date(sub.expiryDate), new Date());
            return (
              <div key={sub._id} className="card p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{sub.domain}</div>
                    {sub.registrar && <div className="text-xs text-[#6b7280] dark:text-[#a8b0bc] mt-1 truncate">{sub.registrar}</div>}
                    <div className="text-xs text-[#6b7280] dark:text-[#a8b0bc] mt-1.5 truncate">
                      <span className="truncate">{sub.owner || '—'}</span> · <span className="truncate">{sub.ownerEmail || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendTest(sub)}
                      disabled={sendingTest === sub._id}
                      title="Send Test Email"
                      className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(sub);
                        setFormOpen(true);
                      }}
                      title="Edit Subscription"
                      className="p-1 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(sub)}
                      title="Delete Subscription"
                      className="p-1 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#a8b0bc] uppercase tracking-wide mb-0.5">Type</p>
                    <p className="font-medium text-sm">{sub.subscriptionType === 'Custom' && sub.customTypeName ? sub.customTypeName : (sub.subscriptionType || 'Domain')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#a8b0bc] uppercase tracking-wide mb-0.5">Cost</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                      {sub.cost ? `${sub.currency || 'USD'} ${sub.cost}` : 'Free'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#a8b0bc] uppercase tracking-wide mb-0.5">Expiry</p>
                    <p className="text-sm">{format(new Date(sub.expiryDate), 'MMM d')}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${days < 0 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-[#6b7280] dark:text-[#a8b0bc]'}`}>
                      {days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#a8b0bc] uppercase tracking-wide mb-0.5">Status</p>
                    <StatusBadge status={sub.status} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sub.reminderIntervals?.map(n => (
                    <span key={n} className="badge bg-[#f1f3f9] dark:bg-[#2b3037] text-[#6b7280] dark:text-[#a8b0bc]">{n}d</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-1">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`min-w-8 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all flex-shrink-0 ${
                p === page
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-[#f1f3f9] dark:bg-[#2b3037] text-[#6b7280] dark:text-[#a8b0bc] hover:bg-[#e2e6f0] dark:hover:bg-[#373e47]'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Form modal */}
      <SubscriptionForm open={formOpen} onClose={() => setFormOpen(false)}
        onSaved={refresh} editing={editing} />

      {/* Import CSV Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Subscriptions via CSV" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload or paste CSV data with columns: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">Domain, Registrar, Owner, OwnerEmail, Type, Renewal, ExpiryDate, Cost, Currency</code>
          </p>

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center hover:border-indigo-500 transition">
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" id="csv-file-input" />
            <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-1">
              <Upload size={24} className="text-indigo-500 mb-1" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Click to upload CSV file</span>
              <span className="text-[11px] text-gray-400">or paste content directly below</span>
            </label>
          </div>

          <div>
            <label className="label">CSV Content</label>
            <textarea
              rows={6}
              className="input font-mono text-xs"
              placeholder={`Domain,Registrar,Owner,OwnerEmail,Type,Renewal,ExpiryDate,Cost,Currency\nexample.com,GoDaddy,John Doe,john@example.com,Domain,Yearly,2027-01-01,15,USD`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={() => setImportModalOpen(false)} className="btn-secondary">Cancel</button>
            <button
              type="button"
              disabled={importing || !csvText.trim()}
              onClick={parseAndImportCsv}
              className="btn-primary flex items-center gap-1.5"
            >
              {importing ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Subscription" size="sm">
        <p className="text-sm text-[#6b7280] dark:text-[#a8b0bc]">
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
