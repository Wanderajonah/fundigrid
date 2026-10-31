import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Globe, LayoutDashboard, ClipboardList, HardHat, CalendarCheck, Users, BarChart3, History, Settings, Search, Menu, X, LogOut, ShieldCheck, Redo2, Undo2 } from 'lucide-react';
import logoDark from '../../assets/logo-dark.webp';
import logoMark from '../../assets/icon.png';
import { useAuth } from '../../context/AuthContext';
import { useAdminStore } from './context/AdminStore';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Job Requests', to: '/admin/requests', icon: ClipboardList },
  { label: 'Fundis', to: '/admin/fundis', icon: HardHat },
  { label: 'Verifications', to: '/admin/verifications', icon: ShieldCheck },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarCheck },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Audit Trail', to: '/admin/audit', icon: History },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

const SIDEBAR_KEY = 'fundigrid.admin.sidebar';

export default function AdminLayout() {
  const { verifications } = useAdminStore();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  // Desktop rail: expanded (labels) or collapsed (icons only). Persisted so the
  // choice survives reloads; mobile always uses the full drawer.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'collapsed';
    } catch {
      return false;
    }
  });
  const pendingVerifications = verifications.length;
  const loc = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? 'collapsed' : 'expanded');
    } catch {
      // Storage blocked: the rail simply resets on reload.
    }
  }, [collapsed]);

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="theme-admin flex min-h-screen bg-page">
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white rounded-2xl shadow-lg border border-line"
        aria-label="Toggle navigation"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-[262px] flex-col bg-navy-950 transition-all duration-300 lg:translate-x-0 ${
          collapsed ? 'lg:w-[84px]' : 'lg:w-[262px]'
        } ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div
          className={`flex h-[84px] items-center border-b border-white/10 ${
            collapsed ? 'px-7 lg:justify-center lg:px-0' : 'px-7'
          }`}
        >
          <Link to="/admin" aria-label="FundiGrid admin home">
            <img src={logoDark} alt="FundiGrid" className={`h-12 w-auto ${collapsed ? 'lg:hidden' : ''}`} />
            <span
              className={`hidden h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white p-1.5 ${
                collapsed ? 'lg:grid' : ''
              }`}
            >
              <img src={logoMark} alt="FundiGrid" className="h-full w-full object-contain" />
            </span>
          </Link>
        </div>

        <nav
          className={`flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden py-6 ${
            collapsed ? 'px-4 lg:px-3' : 'px-4'
          }`}
        >
          <p
            className={`px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30 ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            Manage
          </p>
          {NAV.map(item => {
            const Icon = item.icon;
            const badge = item.to === '/admin/verifications' && pendingVerifications > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    collapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    isActive ? 'bg-primary text-navy-950 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                {badge && (
                  <span
                    className={`rounded-full bg-primary text-[11px] font-bold text-navy-950 ${
                      collapsed
                        ? 'ml-auto flex min-w-[20px] items-center justify-center px-1.5 h-5 lg:absolute lg:-right-1 lg:-top-1 lg:ml-0 lg:h-4 lg:min-w-[16px] lg:px-1 lg:text-[10px]'
                        : 'ml-auto flex h-5 min-w-[20px] items-center justify-center px-1.5'
                    }`}
                  >
                    {pendingVerifications}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className={`border-t border-white/10 py-5 ${collapsed ? 'px-4 lg:px-3' : 'px-5'}`}>
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sign out' : undefined}
            className={`group relative flex w-full items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-rose-400 hover:bg-white/5 transition-all ${
              collapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <LogOut size={17} className="shrink-0" />
            <span className={collapsed ? 'lg:hidden' : ''}>Sign out</span>
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ${
          collapsed ? 'lg:pl-[84px]' : 'lg:pl-[262px]'
        }`}
      >
        <header className="sticky top-0 z-30 h-[84px] bg-white border-b border-line flex items-center justify-between gap-4 pl-4 pr-6 lg:pr-12">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span className="hidden h-8 w-px bg-slate-200 lg:block" />
            <button
              type="button"
              onClick={() => setCollapsed(v => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              className="hidden h-10 w-10 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 lg:grid"
            >
              {collapsed ? <Redo2 size={18} /> : <Undo2 size={18} />}
            </button>
            <div className="relative max-w-md flex-1">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything…"
                className="w-full pl-12 pr-5 py-2.5 text-sm bg-slate-50 border border-line rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="mailto:support@ufundi.ug"
              className="hidden items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-900 sm:flex"
            >
              <Globe size={18} className="text-slate-500" /> Help
            </a>

            <button
              className="relative rounded-full p-2.5 transition-colors hover:bg-slate-50"
              aria-label={
                pendingVerifications > 0
                  ? `Notifications — ${pendingVerifications} pending`
                  : 'Notifications'
              }
            >
              <Bell size={18} className="text-slate-500" />
              {pendingVerifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {pendingVerifications > 9 ? '9+' : pendingVerifications}
                </span>
              )}
            </button>

            <span className="hidden h-8 w-px bg-slate-200 sm:block" />

            <UserMenu onSignOut={handleSignOut} />
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-12" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const MENU_LINKS = [
  { label: 'My Profile', to: '/admin/profile' },
  { label: 'Settings', to: '/admin/settings' },
  { label: 'Audit Trail', to: '/admin/audit' },
];

/** Date + time under the admin's name, refreshed every half minute. */
function useStamp() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const stamp = useStamp();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.name?.trim() || 'System Administrator';
  const email = user?.email ?? '';
  const initial = (name[0] || 'A').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-slate-50 sm:pr-2"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0F766E] text-sm font-bold text-white">
          {initial}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[190px] truncate text-sm font-bold text-slate-900">{name}</span>
          <span className="block text-[12px] text-slate-400">{stamp}</span>
        </span>
        <ChevronDown
          size={16}
          className={`hidden text-slate-400 transition-transform duration-150 sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-3 w-[264px] rounded-xl border border-slate-100 bg-white p-2 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.25)]"
        >
          <div className="px-3 pb-3 pt-2">
            <p className="text-[15px] font-bold text-slate-900">{name}</p>
            {email && <p className="mt-0.5 truncate text-[13px] text-slate-500">{email}</p>}
          </div>
          <div className="h-px bg-slate-100" />
          <div className="py-2">
            {MENU_LINKS.map(item => (
              <button
                key={item.to}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  navigate(item.to);
                }}
                className="block w-full rounded-lg px-3 py-2.5 text-left text-[14px] text-slate-700 transition-colors hover:bg-slate-50"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
