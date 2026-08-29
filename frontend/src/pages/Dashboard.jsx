import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import api from '../lib/api';
import { Globe, TrendingUp, AlertTriangle, XCircle, DollarSign, ShieldAlert, CreditCard, ArrowUpRight, Plus, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';


// ----- Custom Sleek Tooltip Component -----
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-gray-900/95 dark:bg-[#141414]/95 text-white backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-2xl border border-gray-700/40 dark:border-[#272727] text-xs">
        <p className="font-semibold text-gray-300 mb-1">{label || item.name}</p>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill || '#6366f1' }} />
          <span className="font-bold text-white text-sm">{item.value}</span>
          <span className="text-gray-400 text-[11px]">subscriptions</span>
        </div>
      </div>
    );
  }
  return null;
}

// ----- Main Dashboard -----
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [allSubs, setAllSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions', { params: { limit: 1000 } });
      setAllSubs(data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadAll()]);
      setLoading(false);
    };
    load();
  }, [loadStats, loadAll]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---- Compute chart data ----
  // 1. Upcoming Expiries by month (next 6 months)
  const now = new Date();
  const monthData = [];
  let total6MonthCount = 0;
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const count = allSubs.filter(sub => {
      const exp = new Date(sub.expiryDate);
      return exp >= start && exp <= end;
    }).length;
    total6MonthCount += count;
    monthData.push({
      month: format(start, 'MMM'),
      count,
    });
  }

  // 2. By Subscription Type (pie data)
  const typeCounts = allSubs.reduce((acc, sub) => {
    const type = sub.subscriptionType === 'Custom' && sub.customTypeName
      ? sub.customTypeName
      : (sub.subscriptionType || 'Domain');
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typePieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // 3. By Renewal Cycle
  const cycleCounts = allSubs.reduce((acc, sub) => {
    const cycle = sub.renewalCycle || 'Yearly';
    acc[cycle] = (acc[cycle] || 0) + 1;
    return acc;
  }, {});

  // Refined modern colors (Stripe/Tailwind palette)
  const PALETTE = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0284c7', '#7c3aed'];

  // 5. Recent upcoming subscriptions (from stats)
  const upcoming = stats?.upcomingExpiries || [];
  // Calculate totals from the subscriptions already loaded on this page.
  // This also keeps the dashboard compatible while an older backend process
  // is still running without the currencyTotals response field.
  const currencyTotals = allSubs.reduce((acc, sub) => {
    const currency = (sub.currency || 'USD').toUpperCase();
    const cost = Number(sub.cost) || 0;
    if (!acc[currency]) acc[currency] = { monthly: 0, yearly: 0, subscriptions: 0 };
    acc[currency].subscriptions += 1;

    if (sub.renewalCycle === 'Monthly') {
      acc[currency].monthly += cost;
      acc[currency].yearly += cost * 12;
    } else if (sub.renewalCycle === 'Quarterly') {
      acc[currency].monthly += cost / 3;
      acc[currency].yearly += cost * 4;
    } else {
      const months = sub.renewalCycle === 'Custom' ? Math.max(Number(sub.customCycleMonths) || 12, 1) : 12;
      acc[currency].monthly += cost / months;
      acc[currency].yearly += cost * (12 / months);
    }
    return acc;
  }, {});
  const formatTotal = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currencyTotalRows = (period) => {
    const rows = Object.entries(currencyTotals)
      .map(([currency, values]) => ({
        currency,
        amount: values[period],
        subscriptions: values.subscriptions || 0,
      }));
    return rows.length ? rows : [{ currency: 'USD', amount: 0, subscriptions: 0 }];
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time status of your domains, expiries, and financial projections</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/subscriptions" className="btn-primary flex items-center gap-1.5 text-xs py-2">
            <Plus size={14} /> Add Subscription
          </Link>
        </div>
      </div>

      {/* 4 Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <Link
          to="/subscriptions"
          className="card p-5 group hover:border-indigo-500/40 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Tracked</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Globe size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats?.total || 0}</span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
              View all <ArrowUpRight size={12} />
            </span>
          </div>
        </Link>

        {/* Active Card */}
        <Link
          to="/subscriptions"
          className="card p-5 group hover:border-emerald-500/40 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{stats?.active || 0}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              Healthy
            </span>
          </div>
        </Link>

        {/* Expiring Soon Card */}
        <Link
          to="/subscriptions"
          className="card p-5 group hover:border-amber-500/40 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiring Soon</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{stats?.expiringSoon || 0}</span>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              &le; 30 Days
            </span>
          </div>
        </Link>

        {/* Expired Card */}
        <Link
          to="/subscriptions"
          className="card p-5 group hover:border-red-500/40 hover:shadow-md transition-all relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expired</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">{stats?.expired || 0}</span>
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>
        </Link>
      </div>

      {/* Financial & Spending Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monthly Card */}
        <div className="card p-5 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/40 dark:from-indigo-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <CreditCard size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Monthly Recurring Spend</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Estimated monthly cost across all renewals</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="mt-4 space-y-1.5">
              {currencyTotalRows('monthly').map((row) => (
                <div key={row.currency} className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                    {row.currency} {formatTotal(row.amount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {row.subscriptions} {row.subscriptions === 1 ? 'subscription' : 'subscriptions'}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800/40">
              Avg. monthly
            </span>
          </div>
        </div>

        {/* Yearly Card */}
        <div className="card p-5 border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/40 dark:from-purple-950/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Annual Projected Spend</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Total yearly budget needed for all subscriptions</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="mt-4 space-y-1.5">
              {currencyTotalRows('yearly').map((row) => (
                <div key={row.currency} className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                    {row.currency} {formatTotal(row.amount)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {row.subscriptions} {row.subscriptions === 1 ? 'subscription' : 'subscriptions'}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg border border-purple-100 dark:border-purple-800/40">
              {stats?.total || 0} subscriptions
            </span>
          </div>
        </div>
      </div>

      {/* SSL Warning Banner if SSL expiring soon */}
      {(stats?.sslExpiringCount || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <ShieldAlert size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {stats.sslExpiringCount} SSL Certificate{stats.sslExpiringCount > 1 ? 's' : ''} Expiring in &lt;15 Days
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80">
                Please check and renew SSL certificates to prevent website downtime or browser warnings.
              </p>
            </div>
          </div>
          <Link to="/subscriptions" className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap">
            View Domains
          </Link>
        </div>
      )}

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: 6-Month Expiry Forecast Bar Chart (2 cols) */}
        <div className="card p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#f5f5f5]">Renewal Expiry Timeline</h2>
              <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">Forecast of expiring domains over the next 6 months</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f0f2f5] dark:bg-[#1c1c1c] text-[#111827] dark:text-[#f5f5f5] border border-[#dde1e9] dark:border-[#272727]">
              {total6MonthCount} upcoming
            </span>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dde1e9" className="dark:stroke-[#272727]" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Portfolio Breakdown (Donut Chart) (1 col) */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#f5f5f5]">Portfolio by Type</h2>
            <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">Distribution across services</p>
          </div>

          <div className="flex flex-col items-center justify-center my-auto" style={{ height: 160 }}>
            {typePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={typePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {typePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-[#6b7280] dark:text-[#71717a]">No data available</p>
            )}
          </div>

          {/* Custom Sleek Legend */}
          <div className="space-y-1.5 pt-3 border-t border-[#dde1e9] dark:border-[#272727] text-xs">
            {typePieData.map((item, idx) => {
              const pct = allSubs.length ? Math.round((item.value / allSubs.length) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                    <span className="text-[#374151] dark:text-[#a1a1aa] font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-[#111827] dark:text-[#f5f5f5]">
                    <span>{item.value}</span>
                    <span className="text-[#6b7280] dark:text-[#71717a] text-[11px]">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Renewal Cycle Breakdown Progress Row */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-[#111827] dark:text-[#f5f5f5] mb-1">Renewal Cycle Distribution</h2>
        <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mb-4">Breakdown of billing cycles across all managed assets</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {['Yearly', 'Monthly', 'Quarterly', 'Custom'].map((cycle) => {
            const count = cycleCounts[cycle] || 0;
            const pct = allSubs.length ? Math.round((count / allSubs.length) * 100) : 0;
            return (
              <div key={cycle} className="p-3.5 rounded-xl bg-[#f8f9fb] dark:bg-[#1c1c1c] border border-[#dde1e9] dark:border-[#272727]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-[#374151] dark:text-[#a1a1aa]">{cycle}</span>
                  <span className="text-xs font-bold text-[#111827] dark:text-[#f5f5f5]">{count} ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#dde1e9] dark:bg-[#272727] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#f5f5f5]">Upcoming Renewals & Expiries</h2>
            <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Domains requiring attention soon</p>
          </div>
          <Link to="/subscriptions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            View All Subscriptions →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-8 text-center text-[#6b7280] dark:text-[#71717a] text-sm">
            🎉 No upcoming expiries in the next 30 days.
          </div>
        ) : (
          <div className="divide-y divide-[#dde1e9] dark:divide-[#272727]">
            {upcoming.slice(0, 5).map(sub => {
              const daysLeft = differenceInDays(new Date(sub.expiryDate), new Date());
              return (
                <div key={sub._id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#111827] dark:text-[#f5f5f5]">{sub.domain}</span>
                      {sub.cost ? (
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20">
                          {sub.currency || 'USD'} {sub.cost}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5 truncate">
                      {sub.owner || '—'} ({sub.ownerEmail})
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-bold ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft} days left`}
                    </div>
                    <p className="text-[11px] text-[#6b7280] dark:text-[#71717a] mt-0.5">{format(new Date(sub.expiryDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
