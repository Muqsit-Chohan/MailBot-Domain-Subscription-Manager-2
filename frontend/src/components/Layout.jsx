import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe, Mail, FileText, Settings, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/subscriptions', icon: Globe, label: 'Subscriptions' },
  { to: '/templates', icon: FileText, label: 'Templates' },
  { to: '/logs', icon: Mail, label: 'Email Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar({ mobile = false, onClose, user, dark, toggle, logout }) {
  return (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col w-[250px] h-full bg-white dark:bg-[#242d3d] border-r border-transparent shadow-[0.2rem_0_0.4rem_rgba(0,0,0,0.05)] dark:shadow-[0.2rem_0_0.4rem_rgba(0,0,0,0.2)]`}>
      {/* Logo */}
      <div className="flex items-center gap-1 px-5 h-16 border-b border-transparent">
        <Link to="/dashboard" aria-label="MailBot dashboard">
          <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-9 h-9 object-contain" />
        </Link>
        <div>
          <span className="font-bold text-[#2c3e50] dark:text-[#e8eef5] tracking-tight text-[15px]">MailBot</span>
          <p className="text-[10px] text-[#7f8c8d] dark:text-[#a0aac0] leading-none -mt-0.5">Subscription Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-[#95a5a6] dark:text-[#7f8c8d] uppercase tracking-wider px-3 mb-2">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900/30 dark:to-indigo-800/20 text-indigo-700 dark:text-indigo-300 font-semibold shadow-[0.2rem_0.2rem_0.4rem_rgba(0,0,0,0.08),-0.15rem_-0.15rem_0.3rem_rgba(255,255,255,0.6)] dark:shadow-[0.2rem_0.2rem_0.4rem_rgba(0,0,0,0.2),-0.15rem_-0.15rem_0.3rem_rgba(255,255,255,0.02)]'
                    : 'text-[#7f8c8d] dark:text-[#a0aac0] hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-[#2d3748] dark:hover:to-[#242d3d] hover:text-[#2c3e50] dark:hover:text-[#e8eef5]'
                }`
              }
            >
              <Icon size={17} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-transparent space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-[#2d3748] dark:to-[#242d3d] shadow-[0.2rem_0.2rem_0.4rem_rgba(0,0,0,0.08),-0.15rem_-0.15rem_0.3rem_rgba(255,255,255,0.6)] dark:shadow-[0.2rem_0.2rem_0.4rem_rgba(0,0,0,0.2),-0.15rem_-0.15rem_0.3rem_rgba(255,255,255,0.02)]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
            <span className="text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#2c3e50] dark:text-[#e8eef5] truncate">{user?.name}</p>
            <p className="text-[10px] text-[#7f8c8d] dark:text-[#a0aac0] truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggle} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#7f8c8d] dark:text-[#a0aac0] hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 dark:hover:from-[#2d3748] dark:hover:to-[#242d3d] transition-all shadow-[0.15rem_0.15rem_0.3rem_rgba(0,0,0,0.08),-0.1rem_-0.1rem_0.25rem_rgba(255,255,255,0.5)] dark:shadow-[0.15rem_0.15rem_0.3rem_rgba(0,0,0,0.2),-0.1rem_-0.1rem_0.25rem_rgba(255,255,255,0.02)]">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={logout} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-100 hover:to-red-50 dark:hover:from-red-900/30 dark:hover:to-red-800/20 transition-all shadow-[0.15rem_0.15rem_0.3rem_rgba(0,0,0,0.08),-0.1rem_-0.1rem_0.25rem_rgba(255,255,255,0.5)] dark:shadow-[0.15rem_0.15rem_0.3rem_rgba(0,0,0,0.2),-0.1rem_-0.1rem_0.25rem_rgba(255,255,255,0.02)]">
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-[#f0f2f5] dark:bg-[#0a0a0a] overflow-hidden">
      <Sidebar user={user} dark={dark} toggle={toggle} logout={handleLogout} />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[250px] z-50 animate-slide-in">
            <Sidebar mobile onClose={() => setMobileOpen(false)} user={user} dark={dark} toggle={toggle} logout={handleLogout} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-white dark:bg-[#141414] border-b border-[#dde1e9] dark:border-[#272727]">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" aria-label="MailBot dashboard">
              <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-8 h-8 object-contain" />
            </Link>
            <div>
              <span className="font-bold text-sm text-[#111827] dark:text-[#f5f5f5]">MailBot</span>
              <p className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] leading-none -mt-0.5">Domain Manager</p>
            </div>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#1c1c1c] transition-colors">
            {mobileOpen ? <X size={18} className="text-[#6b7280]" /> : <Menu size={18} className="text-[#6b7280]" />}
          </button>
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
