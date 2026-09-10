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
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} flex-col w-[250px] h-full bg-white dark:bg-[#141414] border-r border-[#dde1e9] dark:border-[#272727]`}>
      {/* Logo */}
      <div className="flex items-center gap-1 px-5 h-16 border-b border-[#dde1e9] dark:border-[#272727]">
        <Link to="/dashboard" aria-label="MailBot dashboard">
          <img src="/mailbotLogo.svg" alt="MailBot logo" className="w-9 h-9 object-contain" />
        </Link>
        <div>
          <span className="font-bold text-[#111827] dark:text-[#f5f5f5] tracking-tight text-[15px]">MailBot</span>
          <p className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] leading-none -mt-0.5">Subscription Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-bold text-[#9ca3af] dark:text-[#52525b] uppercase tracking-wider px-3 mb-2">Menu</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/80 dark:border-indigo-500/25 shadow-sm'
                    : 'text-[#6b7280] dark:text-[#a1a1aa] hover:bg-[#f0f2f5] dark:hover:bg-[#1c1c1c] hover:text-[#111827] dark:hover:text-[#f5f5f5]'
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
      <div className="p-3 border-t border-[#dde1e9] dark:border-[#272727] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#f5f6f8] dark:bg-[#0f0f0f] border border-[#dde1e9] dark:border-[#272727]">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#111827] dark:text-[#f5f5f5] truncate">{user?.name}</p>
            <p className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] truncate capitalize">{user?.role}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggle} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#6b7280] dark:text-[#a1a1aa] hover:bg-[#f0f2f5] dark:hover:bg-[#1c1c1c] transition-colors border border-[#dde1e9] dark:border-[#272727]">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {dark ? 'Light' : 'Dark'}
          </button>
          <button onClick={logout} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border border-transparent dark:border-red-900/20">
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
