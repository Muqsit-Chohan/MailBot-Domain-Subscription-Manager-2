import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Modal from '../components/Modal';

const STATUS_OPTS = ['all', 'sent', 'failed', 'pending'];

function StatusIcon({ status }) {
  if (status === 'sent') return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === 'failed') return <XCircle size={14} className="text-red-500" />;
  return <Clock size={14} className="text-gray-400" />;
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get('/logs', { params: { page, status, search: search || undefined } }),
        api.get('/logs/stats'),
      ]);
      setLogs(logsRes.data.logs);
      setTotal(logsRes.data.total);
      setPages(logsRes.data.pages);
      setLogStats(statsRes.data);
    } finally { setLoading(false); }
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  const handleDelete = async () => {
    try { await api.delete(`/logs/${deleteTarget._id}`); toast.success('Log deleted'); setDeleteTarget(null); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Email Logs</h1>
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{total} log entries</p>
      </div>

      {/* Stats mini */}
      {logStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: logStats.total, cls: 'text-[#0f1523] dark:text-[#eef0f8]' },
            { label: 'Sent', value: logStats.sent, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Failed', value: logStats.failed, cls: 'text-red-600 dark:text-red-400' },
            { label: 'Pending', value: logStats.pending, cls: 'text-gray-500 dark:text-gray-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card px-4 py-3">
              <p className="text-xs text-[#6b7280] dark:text-[#8b92b3]">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input className="input pl-9" placeholder="Search emails, subjects…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${status === s ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center"><p className="text-[#6b7280] dark:text-[#8b92b3]">No logs found</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>To</th>
                <th>Subject</th>
                <th>Domain</th>
                <th>Interval</th>
                <th>Triggered</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log._id}>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={log.status} />
                      <span className={`badge-${log.status}`}>{log.status}</span>
                    </div>
                  </td>
                  <td><span className="font-mono text-xs">{log.to}</span></td>
                  <td><span className="truncate max-w-[200px] block">{log.subject}</span></td>
                  <td>{log.domain || log.subscription?.domain || '—'}</td>
                  <td>{log.reminderInterval ? <span className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{log.reminderInterval}d</span> : '—'}</td>
                  <td><span className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{log.triggeredBy}</span></td>
                  <td>
                    <span className="text-xs">
                      {log.sentAt ? format(new Date(log.sentAt), 'MMM d, HH:mm') : format(new Date(log.createdAt), 'MMM d, HH:mm')}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setDeleteTarget(log)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Error details tooltips via title on failed rows */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Log" size="sm">
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3]">Delete this log entry?</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleDelete} className="btn-danger">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
