import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import api from '../lib/api';
import { Globe, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

// ----- Stat Card -----
function StatCard({ label, value, icon: Icon, color, to }) {
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper
      to={to}
      className={`card p-5 flex items-center gap-4 transition-all duration-150 ${to ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </Wrapper>
  );
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
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 0);
    const count = allSubs.filter(sub => {
      const exp = new Date(sub.expiryDate);
      return exp >= start && exp <= end;
    }).length;
    monthData.push({
      month: format(start, 'MMM'),
      count,
    });
  }

  // 2. By Subscription Type (pie data)
  const typeCounts = allSubs.reduce((acc, sub) => {
    const type = sub.subscriptionType || 'Domain';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typePieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // 3. By Renewal Cycle (horizontal bar)
  const cycleCounts = allSubs.reduce((acc, sub) => {
    const cycle = sub.renewalCycle || 'Yearly';
    acc[cycle] = (acc[cycle] || 0) + 1;
    return acc;
  }, {});
  const cycleBarData = Object.entries(cycleCounts).map(([name, value]) => ({ name, value }));

  // 4. Colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  // 5. Recent upcoming subscriptions (from stats)
  const upcoming = stats?.upcomingExpiries || [];

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Overview of your subscriptions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard to="/subscriptions" label="Total Subscriptions" value={stats?.total || 0} icon={Globe} color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
        <StatCard to="/subscriptions" label="Active" value={stats?.active || 0} icon={TrendingUp} color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />
        <StatCard to="/subscriptions" label="Expiring Soon" value={stats?.expiringSoon || 0} icon={AlertTriangle} color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
        <StatCard to="/subscriptions" label="Expired" value={stats?.expired || 0} icon={XCircle} color="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400" />
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <Link to="/subscriptions" className="btn-secondary text-sm">View Subscriptions</Link>
        <Link to="/templates" className="btn-secondary text-sm">Manage Templates</Link>
        <Link to="/logs" className="btn-secondary text-sm">View Email Logs</Link>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Expiries Bar Chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Upcoming Expiries</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Subscriptions expiring in the next 6 months</p>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={monthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Subscription Type (Donut) */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">By Subscription Type</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Distribution across different types</p>
          <div style={{ width: '100%', height: 200 }}>
            {typePieData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={typePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </div>
        </div>

        {/* By Renewal Cycle (Horizontal Bar) */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">By Renewal Cycle</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Distribution of renewal frequencies</p>
          <div style={{ width: '100%', height: 200 }}>
            {cycleBarData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart
                  data={cycleBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-gray-400">No data</p>
            )}
          </div>
        </div>

        {/* Status Distribution (simple list & pie) */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Breakdown of subscription statuses</p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Active</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.active || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expiring Soon</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{stats?.expiringSoon || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expired</span>
              <span className="font-medium text-red-600 dark:text-red-400">{stats?.expired || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Subscriptions */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Subscriptions</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Subscriptions expiring soon</p>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming expiries</p>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map(sub => {
              const daysLeft = differenceInDays(new Date(sub.expiryDate), new Date());
              return (
                <div key={sub._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.domain}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{sub.owner} • {sub.ownerEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{daysLeft} days left</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(sub.expiryDate), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-4">
          <Link to="/subscriptions" className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            View All →
          </Link>
        </div>
      </div>
    </div>
  );
}