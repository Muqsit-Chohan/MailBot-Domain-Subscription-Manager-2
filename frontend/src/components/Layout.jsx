import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe, Mail, FileText, Settings, LogOut, Moon, Sun, Menu, X, Zap } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/subscriptions', icon: Globe, label: 'Subscriptions' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/logs', icon: Mail, label: 'Email Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col w-[250px] h-full bg-white dark:bg-[#151829] border-r border-[#e2e6f0] dark:border-[#2a2f48]`}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[#e2e6f0] dark:border-[#2a2f48]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Zap size={17} className="text-white" />
        </div>
        <div>
          <span className="font-bold text-[#0f1523] dark:text-[#eef0f8] tracking-tight text-[15px]">MailBot</span>
          <p className="text-[10px] text-[#9ca3af] dark:text-[#6b7280] leading-none -mt-0.5">Domain Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-semibold text-[#9ca3af] dark:text-[#5b6280] uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-500/5'
                  : 'text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] hover:text-[#0f1523] dark:hover:text-[#eef0f8]'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#e2e6f0] dark:border-[#2a2f48] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#f8f9fc] dark:bg-[#0d0f1a]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#0f1523] dark:text-[#eef0f8] truncate">{user?.name}</p>
            <p className="text-[10px] text-[#6b7280] dark:text-[#8b92b3] truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggle} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#6b7280] dark:text-[#8b92b3] hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] transition-colors">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-[#f8f9fc] dark:bg-[#0d0f1a] overflow-hidden">
      <Sidebar />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[250px] z-50 animate-slide-in">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-white dark:bg-[#151829] border-b border-[#e2e6f0] dark:border-[#2a2f48]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-sm">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-sm text-[#0f1523] dark:text-[#eef0f8]">MailBot</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl hover:bg-[#f1f3f9] dark:hover:bg-[#1e2235] transition-colors">
            {mobileOpen ? <X size={18} className="text-[#6b7280]" /> : <Menu size={18} className="text-[#6b7280]" />}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
