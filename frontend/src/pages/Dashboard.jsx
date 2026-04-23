import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Mail, AlertTriangle, CheckCircle, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[#6b7280] dark:text-[#8b92b3] uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-[#0f1523] dark:text-[#eef0f8] mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function DaysChip({ expiryDate }) {
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return <span className="badge-expired">Expired</span>;
  if (days <= 7) return <span className="badge-expiring">{days}d left</span>;
  if (days <= 30) return <span className="badge-expiring">{days}d left</span>;
  return <span className="badge-active">{days}d left</span>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/subscriptions/stats').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-[#6b7280] dark:text-[#8b92b3] mt-0.5">Overview of your domain subscriptions</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Globe} label="Total" value={stats?.total} color="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" />
        <StatCard icon={CheckCircle} label="Active" value={stats?.active} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Expiring Soon" value={stats?.expiringSoon} color="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" />
        <StatCard icon={TrendingUp} label="Expired" value={stats?.expired} color="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Upcoming expiries */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e6f0] dark:border-[#2a2f48]">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h2 className="font-semibold text-sm text-[#0f1523] dark:text-[#eef0f8]">Upcoming Expiries</h2>
            </div>
            <Link to="/subscriptions?status=expiring_soon" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#f1f3f9] dark:divide-[#1e2235]">
            {stats?.upcomingExpiries?.length === 0 && (
              <p className="px-5 py-8 text-sm text-center text-[#6b7280] dark:text-[#8b92b3]">No upcoming expiries 🎉</p>
            )}
            {stats?.upcomingExpiries?.map(sub => (
              <div key={sub._id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-[#0f1523] dark:text-[#eef0f8]">{sub.domain}</p>
                  <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-0.5">
                    {format(new Date(sub.expiryDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <DaysChip expiryDate={sub.expiryDate} />
              </div>
            ))}
          </div>
        </div>

        {/* Recently added */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e6f0] dark:border-[#2a2f48]">
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-sm text-[#0f1523] dark:text-[#eef0f8]">Recently Added</h2>
            </div>
            <Link to="/subscriptions" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-[#f1f3f9] dark:divide-[#1e2235]">
            {stats?.recentlyAdded?.length === 0 && (
              <p className="px-5 py-8 text-sm text-center text-[#6b7280] dark:text-[#8b92b3]">No subscriptions yet</p>
            )}
            {stats?.recentlyAdded?.map(sub => (
              <div key={sub._id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-[#0f1523] dark:text-[#eef0f8]">{sub.domain}</p>
                  <p className="text-xs text-[#6b7280] dark:text-[#8b92b3] mt-0.5">{sub.owner || 'Unknown owner'}</p>
                </div>
                <span className={`badge-${sub.status === 'expiring_soon' ? 'expiring' : sub.status}`}>
                  {sub.status === 'expiring_soon' ? 'Expiring' : sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
