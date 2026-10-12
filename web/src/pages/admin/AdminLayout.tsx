import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LayoutDashboard, ClipboardList, HardHat, Ruler, Calculator, CalendarCheck, Users, BarChart3, Settings, Search, Menu, X, LogOut, ShieldCheck } from 'lucide-react';
import logoDark from '../../assets/logo-dark.png';
import { useAdminStore } from './context/AdminStore';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Job Requests', to: '/admin/requests', icon: ClipboardList },
  { label: 'Fundis', to: '/admin/fundis', icon: HardHat },
  { label: 'Verifications', to: '/admin/verifications', icon: ShieldCheck },
  { label: 'Surveyors', to: '/admin/surveyors', icon: Ruler },
  { label: 'Estimates', to: '/admin/estimates', icon: Calculator },
  { label: 'Bookings', to: '/admin/bookings', icon: CalendarCheck },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const { verifications } = useAdminStore();
  const [open, setOpen] = useState(false);
  const pendingVerifications = verifications.length;
  const loc = useLocation();
  const navigate = useNavigate();

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
        className={`fixed left-0 top-0 bottom-0 w-[262px] bg-navy-950 z-50 transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="h-[84px] flex items-center px-7 border-b border-white/10">
          <Link to="/admin" aria-label="FundiGrid admin home">
            <img src={logoDark} alt="FundiGrid" className="h-12 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">Manage</p>
          {NAV.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-primary text-navy-950 shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
                {item.to === '/admin/verifications' && pendingVerifications > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-navy-950 text-[11px] font-bold flex items-center justify-center">
                    {pendingVerifications}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          <button
            onClick={() => navigate('/login')}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-rose-400 hover:bg-white/5 transition-all"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[262px]">
        <header className="sticky top-0 z-30 h-[84px] bg-white border-b border-line flex items-center justify-between gap-4 px-6 lg:px-12">
          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search anything…"
              className="w-full pl-12 pr-5 py-2.5 text-sm bg-slate-50 border border-line rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-full hover:bg-slate-50 transition-colors" aria-label="Notifications">
              <Bell size={18} className="text-slate-400" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-slate-50 border border-line">
              <div className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-white text-[11px] font-bold">AD</div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">Admin</p>
                <p className="text-[11px] text-slate-400">System Admin</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-12" key={loc.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
