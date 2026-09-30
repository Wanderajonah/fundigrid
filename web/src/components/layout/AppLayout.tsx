import { Bell, Search } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useAuth } from '../../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || user?.phone || 'Account';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#FAFAFA]">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-[80px] bg-white/80 backdrop-blur-xl border-b border-gray-100/50 flex items-center justify-between px-12">
          <div className="flex items-center gap-4 flex-1 pl-14 lg:pl-0">
            <div className="relative max-w-lg flex-1">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" />
              <input type="text" placeholder="Search..." className="w-full pl-13 pr-5 py-3 text-sm bg-gray-50 border border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-gray-300" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-3 rounded-full hover:bg-gray-50 transition-colors">
              <Bell size={18} className="text-gray-400" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-xs font-semibold ml-2" title={displayName}>{initials}</div>
          </div>
        </header>
        <main className="flex-1 p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
