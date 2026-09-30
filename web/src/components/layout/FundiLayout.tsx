import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, DollarSign, User, Settings,
  Menu, X, Bell, Search, LogOut
} from 'lucide-react';
import FundiGridLogo from '../FundiGridLogo';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/fundi', icon: LayoutDashboard },
  { label: 'Nearby Jobs', to: '/fundi/jobs', icon: Briefcase },
  { label: 'Earnings', to: '/fundi/earnings', icon: DollarSign },
  { label: 'Profile', to: '/fundi/profile', icon: User },
];

const BOTTOM_ITEMS = [
  { label: 'Settings', to: '/fundi/settings', icon: Settings },
];

function useIdentity() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.name?.trim() || user?.phone || 'Fundi account';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }
  return { displayName, initials, handleSignOut };
}

export default function FundiSidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { displayName, initials, handleSignOut } = useIdentity();

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-5 left-5 z-50 p-2.5 bg-white rounded-xl shadow-lg border border-gray-100"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-gray-100 z-50 transition-transform duration-300 flex flex-col
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="h-[72px] flex items-center px-6 border-b border-gray-50">
          <FundiGridLogo size="sm" />
        </div>

        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/fundi' && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-gray-50 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200
                  ${isActive ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <Icon size={18} strokeWidth={1.5} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="px-4 py-4 border-t border-gray-50 space-y-1">
          <div className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-[11px] text-gray-400">Fundi</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} strokeWidth={1.5} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export function FundiLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.phone || 'Fundi account';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <FundiSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-[72px] bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-10">
          <div className="flex items-center gap-4 flex-1 pl-12 lg:pl-0">
            <div className="relative max-w-lg flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                className="w-full pl-11 pr-5 py-2.5 text-[13px] bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <Bell size={18} className="text-gray-500" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold ml-2" title={displayName}>
              {initials}
            </div>
          </div>
        </header>
        <main className="flex-1 p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
