import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, MessageSquare, User, Search, FileText, Star, Settings, Menu, X, LogOut } from 'lucide-react';
import FundiGridLogo from '../FundiGridLogo';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { label: 'Dashboard', to: '/client', icon: LayoutDashboard },
  { label: 'Request a Job', to: '/client/request', icon: Briefcase },
  { label: 'My Requests', to: '/client/requests', icon: FileText },
  { label: 'Find Fundis', to: '/client/fundis', icon: Search },
  { label: 'Messages', to: '/client/messages', icon: MessageSquare },
  { label: 'Reviews', to: '/client/reviews', icon: Star },
];

const BOTTOM = [
  { label: 'Profile', to: '/client/profile', icon: User },
  { label: 'Settings', to: '/client/settings', icon: Settings },
];

export default function AppSidebar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const displayName = user?.name?.trim() || user?.phone || 'Your account';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = user?.role === 'fundi' ? 'Fundi' : 'Client';

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="lg:hidden fixed top-5 left-5 z-50 p-3 bg-white rounded-2xl shadow-lg border border-gray-100">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-gray-100/50 z-50 transition-transform duration-300 flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="h-[80px] flex items-center px-7 border-b border-gray-50">
          <FundiGridLogo size="sm" to="/client" />
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = loc.pathname === item.to || (item.to !== '/client' && loc.pathname.startsWith(item.to));
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${active ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon size={18} />{item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-50 space-y-1">
          {BOTTOM.map(item => {
            const Icon = item.icon;
            const active = loc.pathname === item.to;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${active ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}>
                <Icon size={18} />{item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="px-5 py-5 border-t border-gray-50 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-[11px] text-gray-400">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
