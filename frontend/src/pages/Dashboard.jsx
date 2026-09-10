import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import api from '../lib/api';
import { Globe, TrendingUp, AlertTriangle, XCircle, DollarSign, ShieldAlert, CreditCard, ArrowUpRight, RefreshCw } from 'lucide-react';
// ----- Main Dashboard -----
export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [allSubs, setAllSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
      setError('Could not load your dashboard. Please try again.');
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions', { params: { limit: 1000 } });
      setAllSubs(data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscriptions', err);
      setError('Could not load your dashboard. Please try again.');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      await Promise.all([loadStats(), loadAll()]);
      setLoading(false);
    };
    load();
  }, [loadStats, loadAll, refreshKey]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading dashboard" className="mx-auto max-w-7xl space-y-5 motion-safe:animate-pulse">
        <span className="sr-only">Loading dashboard</span>
        <div className="h-20 rounded-2xl bg-gray-200 dark:bg-white/5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-gray-200 dark:bg-white/5" />)}
        </div>
        <div className="h-80 rounded-2xl bg-gray-200 dark:bg-white/5" />
      </div>
    );
  }

  if (error) {
    return <div role="alert" className="card mx-auto max-w-xl p-8 text-center">
      <AlertTriangle size={28} className="mx-auto mb-4 text-amber-500" />
      <h1 className="page-title">Dashboard unavailable</h1>
      <p className="my-4 text-sm text-gray-500 dark:text-gray-400">{error}</p>
      <button onClick={() => setRefreshKey(key => key + 1)} className="btn-primary">Try again</button>
    </div>;
  }

  // ---- Compute chart data ----
  // 1. Upcoming Expiries by month (next 6 months)
  const now = new Date();
  const monthData = [];
  let total6MonthCount = 0;
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const count = allSubs.filter(sub => {
      const exp = new Date(sub.expiryDate);
      return exp >= start && exp >= now && exp < end;
    }).length;
    total6MonthCount += count;
    monthData.push({
      month: format(start, 'MMM'),
      fullMonth: format(start, 'MMMM yyyy'),
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
  // The stats endpoint calculates totals across all subscriptions. Use it as
  // the source of truth so the dashboard is not affected by list pagination.
  const currencyTotals = stats?.currencyTotals || {};
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
    <div className="dashboard-view mx-auto w-full max-w-7xl min-w-0 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Your workspace</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Your subscriptions, spending, and upcoming renewals in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setRefreshKey(key => key + 1)} className="btn-secondary inline-flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
          <Link to="/subscriptions" className="btn-primary flex items-center gap-1.5 text-xs py-2">
            Manage subscriptions <ArrowUpRight size={14} />
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

      <section aria-labelledby="spending-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="spending-heading" className="text-base font-semibold text-gray-900 dark:text-white">Spending overview</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Plan your budget, one currency at a time.</p>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Currencies shown separately</span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[
            { period: 'monthly', title: 'Monthly recurring spend', description: 'Average monthly cost across all renewal cycles.', unit: '/ month', badge: 'Monthly average', Icon: CreditCard, tone: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
            { period: 'yearly', title: 'Annual projected spend', description: 'Estimated budget for a full year of renewals.', unit: '/ year', badge: 'Yearly estimate', Icon: DollarSign, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
          ].map(({ period, title, description, unit, badge, Icon: icon, tone }) => {
            const Icon = icon;
            return (
            <article key={period} className="card min-w-0 overflow-hidden">
              <div className="flex items-start gap-3 p-5 sm:p-6">
                <div className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + tone}><Icon size={20} /></div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
                </div>
              </div>
              <dl className="mx-5 mb-5 divide-y divide-gray-200/70 overflow-hidden rounded-xl border border-gray-200/70 bg-gray-50/70 dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.02] sm:mx-6 sm:mb-6">
                {currencyTotalRows(period).map(row => (
                  <div key={row.currency} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4">
                    <dt className="min-w-0">
                      <span className="inline-flex rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-bold tracking-wider text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">{row.currency}</span>
                      <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">{row.subscriptions} {row.subscriptions === 1 ? 'subscription' : 'subscriptions'}</span>
                    </dt>
                    <dd className="ml-auto min-w-0 max-w-full text-right">
                      <span className="block break-all text-2xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-[28px]">{formatTotal(row.amount)}</span>
                      <span className="mt-1 block text-[11px] text-gray-500 dark:text-gray-400">{unit}</span>
                    </dd>
                    <dd className="w-full min-w-0">
                      <details className="group">
                        <summary className="cursor-pointer rounded-md py-2 text-xs font-medium text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-300">View subscriptions</summary>
                        <div role="region" aria-label={`${row.currency} ${period} subscription costs`} tabIndex={0} className="mt-2 max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-white/10 dark:bg-[#141414]">
                          <ul className="divide-y divide-gray-100 dark:divide-white/5">
                            {allSubs.filter(sub => (sub.currency || 'USD').toUpperCase() === row.currency).map(sub => {
                              const months = sub.renewalCycle === 'Monthly' ? 1 : sub.renewalCycle === 'Quarterly' ? 3 : sub.renewalCycle === 'Custom' ? Math.max(Number(sub.customCycleMonths) || 12, 1) : 12;
                              const amount = Number(sub.cost || 0) / months * (period === 'yearly' ? 12 : 1);
                              return <li key={sub._id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                                <div className="min-w-0 flex-1 basis-24">
                                  <p className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{sub.domain}</p>
                                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{sub.renewalCycle === 'Custom' ? `Every ${months} months` : sub.renewalCycle || 'Yearly'} billing</p>
                                </div>
                                <div className="ml-auto max-w-full text-right">
                                  <p className="break-all text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{row.currency} {formatTotal(amount)}</p>
                                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{period === 'monthly' ? 'monthly average' : 'yearly estimate'}</p>
                                </div>
                              </li>;
                            })}
                          </ul>
                          {row.subscriptions === 0 && <p className="p-4 text-xs text-gray-500 dark:text-gray-400">No subscriptions in this currency.</p>}
                        </div>
                      </details>
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 dark:border-white/5 sm:px-6">
                <span className={'rounded-full px-2.5 py-1 text-[11px] font-medium ' + tone}>{badge}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{stats?.total || 0} {(stats?.total || 0) === 1 ? 'subscription' : 'subscriptions'} tracked</span>
              </div>
            </article>
            );
          })}
        </div>
      </section>
      {/* SSL Warning Banner if SSL expiring soon */}
      {(stats?.sslExpiringCount || 0) > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-wrap items-center justify-between gap-3 shadow-sm">
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
        <div className="card min-w-0 p-5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#f5f5f5]">Renewal Expiry Timeline</h2>
              <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">Upcoming subscription renewals over the next 6 months</p>
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f0f2f5] dark:bg-[#1c1c1c] text-[#111827] dark:text-[#f5f5f5] border border-[#dde1e9] dark:border-[#272727]">
              {total6MonthCount} upcoming
            </span>
          </div>

          <div className="rounded-xl border border-gray-200/70 bg-gray-50/60 p-3 sm:p-5 dark:border-white/10 dark:bg-white/[0.02]">
            <p className="mb-4 text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Renewals per month</p>
            <ol aria-label="Renewals by month" className="grid grid-cols-6 gap-2 sm:gap-4">
              {monthData.map(({ month, fullMonth, count }) => (
                <li key={fullMonth} aria-label={`${fullMonth}: ${count} renewals`} className="min-w-0 text-center">
                  <div aria-hidden="true" className="flex h-44 flex-col justify-end border-b border-gray-300 dark:border-gray-600">
                    <span className="mb-2 text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-200">{count}</span>
                    <div
                      className={count ? 'mx-auto w-full max-w-12 rounded-t-md bg-indigo-500 dark:bg-indigo-400' : 'mx-auto h-1 w-full max-w-12 rounded-t bg-gray-300 dark:bg-gray-600'}
                      style={count ? { height: `${(count / Math.max(1, ...monthData.map(item => item.count))) * 140}px` } : undefined}
                    />
                  </div>
                  <span aria-hidden="true" className="mt-3 block text-xs font-medium text-gray-600 dark:text-gray-300">{month}</span>
                </li>
              ))}
            </ol>
            {total6MonthCount === 0 && <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">No renewals scheduled in the next six months.</p>}
          </div>
        </div>

        {/* Chart 2: Portfolio Breakdown (Donut Chart) (1 col) */}
        <div className="card min-w-0 p-5 flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#f5f5f5]">Portfolio by Type</h2>
            <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">Distribution across services</p>
          </div>

          <div className="flex w-full justify-center py-6">
            <svg viewBox="0 0 200 200" width="200" height="200" role="img" aria-labelledby="portfolio-chart-title portfolio-chart-description" className="block h-auto w-full max-w-[200px] shrink-0">
              <title id="portfolio-chart-title">Subscriptions by type</title>
              <desc id="portfolio-chart-description">{typePieData.length ? typePieData.map(item => item.name + ': ' + item.value).join(', ') : 'No subscriptions yet'}</desc>
              <circle cx="100" cy="100" r="76" fill="none" strokeWidth="22" className="stroke-gray-200 dark:stroke-white/10" />
              {typePieData.map((item, index) => {
                const circumference = 2 * Math.PI * 76;
                const length = item.value / allSubs.length * circumference;
                const offset = typePieData.slice(0, index).reduce((sum, entry) => sum + entry.value, 0) / allSubs.length * circumference;
                return <circle key={item.name} cx="100" cy="100" r="76" fill="none" stroke={PALETTE[index % PALETTE.length]} strokeWidth="22"
                  strokeDasharray={[length, circumference - length].join(' ')} strokeDashoffset={-offset} transform="rotate(-90 100 100)">
                  <title>{item.name}: {item.value} ({Math.round(item.value / allSubs.length * 100)}%)</title>
                </circle>;
              })}
              <text x="100" y="98" textAnchor="middle" className="fill-gray-900 dark:fill-white" fontSize="30" fontWeight="700">{allSubs.length}</text>
              <text x="100" y="120" textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" fontSize="11">{allSubs.length === 1 ? 'subscription' : 'subscriptions'}</text>
            </svg>
          </div>
          {typePieData.length === 0 && <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">Add a subscription to see your portfolio breakdown.</p>}

          {/* Custom Sleek Legend */}
          <div className="space-y-1.5 pt-3 border-t border-[#dde1e9] dark:border-[#272727] text-xs">
            {typePieData.map((item, idx) => {
              const pct = allSubs.length ? Math.round((item.value / allSubs.length) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-2.5 h-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[idx % PALETTE.length] }} />
                    <span className="break-all min-w-0 text-[#374151] dark:text-[#a1a1aa] font-medium">{item.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 font-semibold text-[#111827] dark:text-[#f5f5f5]">
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
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#111827] dark:text-[#f5f5f5]">Upcoming Renewals & Expiries</h2>
            <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Subscriptions renewing in the next 30 days</p>
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
                <div key={sub._id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="break-all font-semibold text-sm text-[#111827] dark:text-[#f5f5f5]">{sub.domain}</span>
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
                  <div className="flex items-center gap-3 sm:block sm:text-right flex-shrink-0">
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
