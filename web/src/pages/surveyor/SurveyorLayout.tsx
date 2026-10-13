import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, LogOut, Menu, X, Bell } from 'lucide-react';
import logoDark from '../../assets/logo-dark.webp';
import { useAuth } from '../../context/AuthContext';

const NAV = [{ label: 'My Requests', to: '/surveyor', icon: ClipboardList, end: true }];

export default function SurveyorLayout() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const name = user?.name || 'Quantity Surveyor';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="theme-admin flex min-h-screen bg-surface">
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white rounded-2xl shadow-lg border border-slate-100"
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
          <Link to="/surveyor" aria-label="FundiGrid surveyor home">
            <img src={logoDark} alt="FundiGrid" className="h-12 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 px-5 py-7 space-y-1.5 overflow-y-auto">
          <p className="px-4 pb-3 text-[11px] uppercase tracking-wider text-white/30">Quantity Surveyor</p>
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-primary text-navy-950' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={17} /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-5 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-slate-900 text-xs font-bold">{initials}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-[11px] text-white/40">Quantity Surveyor</p>
            </div>
          </div>
          <button
            onClick={() => { signOut(); navigate('/login'); }}
            className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-rose-400 hover:bg-white/5 transition-all"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[262px]">
        <header className="sticky top-0 z-30 h-[84px] bg-white border-b border-slate-100 flex items-center justify-between gap-4 px-6 lg:px-12">
          <div>
            <p className="text-sm font-semibold text-slate-900">FundiGrid Surveyor Desk</p>
            <p className="text-xs text-slate-400">Price the jobs assigned to you</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-full hover:bg-slate-50 transition-colors" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-slate-50">
              <div className="w-9 h-9 rounded-full bg-navy-900 flex items-center justify-center text-white text-[11px] font-bold">{initials}</div>
              <p className="text-sm font-semibold text-slate-900">{name}</p>
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
