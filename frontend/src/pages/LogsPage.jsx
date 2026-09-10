import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
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
  const [detailTarget, setDetailTarget] = useState(null);

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
    <div className="space-y-4 sm:space-y-5 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Email Logs</h1>
        <p className="text-xs sm:text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{total} log entries</p>
      </div>

      {/* Stats mini */}
      {logStats && (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Total', value: logStats.total, cls: 'text-[#0f1523] dark:text-[#eef0f8]' },
            { label: 'Sent', value: logStats.sent, cls: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Failed', value: logStats.failed, cls: 'text-red-600 dark:text-red-400' },
            { label: 'Pending', value: logStats.pending, cls: 'text-gray-500 dark:text-gray-400' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="card px-3 py-2 sm:px-4 sm:py-3">
              <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] line-clamp-1">{label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] flex-shrink-0" />
          <input className="input pl-8 sm:pl-9 text-sm" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap ${status === s ? 'bg-indigo-600 text-white' : 'btn-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-1 sm:gap-2 py-1.5 sm:py-2 px-2.5 sm:px-3 flex-shrink-0">
          <RefreshCw size={13} className={`${loading ? 'animate-spin' : ''} sm:w-3.5 sm:h-3.5`} />
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center"><p className="text-[#6b7280] dark:text-[#8b92b3]">No logs found</p></div>
        ) : (
          <div className="hidden sm:block">
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
                    <td className="max-w-[220px]">
                      <div className="truncate max-w-[220px] block font-medium">{log.subject}</div>
                      {log.status === 'failed' && log.errorMessage && (
                        <p className="text-[11px] text-red-600 dark:text-red-300 mt-1 overflow-hidden text-ellipsis">{log.errorMessage}</p>
                      )}
                    </td>
                    <td>{log.domain || log.subscription?.domain || '—'}</td>
                    <td>{log.reminderInterval ? <span className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{log.reminderInterval}d</span> : '—'}</td>
                    <td><span className="badge bg-[#f1f3f9] dark:bg-[#1e2235] text-[#6b7280] dark:text-[#8b92b3]">{log.triggeredBy}</span></td>
                    <td>
                      <span className="text-xs">
                        {log.sentAt ? format(new Date(log.sentAt), 'MMM d, HH:mm') : format(new Date(log.createdAt), 'MMM d, HH:mm')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {log.status === 'failed' && (
                          <button onClick={() => setDetailTarget(log)} title="View error" className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 transition-colors">
                            <AlertTriangle size={14} />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(log)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <div className="space-y-2 sm:space-y-3 sm:hidden">
          {logs.map(log => (
            <div key={log._id} className="card p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusIcon status={log.status} />
                  <span className={`badge-${log.status}`}>{log.status}</span>
                </div>
                <button onClick={() => setDeleteTarget(log)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 text-sm space-y-2">
                <div>
                  <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">To</p>
                  <p className="font-mono text-xs break-words line-clamp-2">{log.to}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">Subject</p>
                  <p className="break-words line-clamp-2 text-sm">{log.subject}</p>
                  {log.status === 'failed' && log.errorMessage && (
                    <p className="text-[10px] text-red-600 dark:text-red-300 mt-1 line-clamp-2">{log.errorMessage}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">Domain</p>
                    <p className="truncate text-sm">{log.domain || log.subscription?.domain || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">Interval</p>
                    <p className="text-sm">{log.reminderInterval ? `${log.reminderInterval}d` : '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">Triggered</p>
                    <p className="text-sm">{log.triggeredBy}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide mb-0.5">Date</p>
                    <p>{log.sentAt ? format(new Date(log.sentAt), 'MMM d, HH:mm') : format(new Date(log.createdAt), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Error details" size="lg">
        <div className="text-sm text-[#0f1523] dark:text-[#eef0f8]">
          <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] mb-2">To: <span className="font-mono">{detailTarget?.to}</span></p>
          <p className="font-semibold mb-2">Subject: {detailTarget?.subject}</p>
          <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs max-h-80 overflow-auto">{detailTarget?.errorMessage || 'No error message available.'}</pre>
        </div>
      </Modal>

      {/* Error details tooltips via title on failed rows */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-1">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`min-w-8 w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium flex-shrink-0 ${
                p === page ? 'bg-indigo-600 text-white' : 'btn-secondary'
              }`}>
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
