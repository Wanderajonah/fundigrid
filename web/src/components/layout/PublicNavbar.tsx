import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import FundiGridLogo from '../FundiGridLogo';

const LINKS = [
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'For Clients', to: '/for-clients' },
  { label: 'For Fundis', to: '/for-fundis' },
  { label: 'About', to: '/about' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-[1280px] mx-auto px-8 h-[80px] flex items-center justify-between">
        <FundiGridLogo size="sm" />

        <nav className="hidden md:flex items-center gap-2">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${loc.pathname === l.to ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>{l.label}</Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/login" className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2.5 transition-colors">Log In</Link>
          <Link to="/signup" className="text-sm font-semibold text-white bg-gray-900 hover:bg-black px-7 py-2.5 rounded-full transition-all">Sign Up</Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-xl hover:bg-gray-50">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-8 py-8 space-y-2">
          {LINKS.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block py-3 text-sm font-medium text-gray-600 hover:text-gray-900">{l.label}</Link>
          ))}
          <div className="pt-6 mt-6 border-t border-gray-100 flex flex-col gap-3">
            <Link to="/login" onClick={() => setOpen(false)} className="py-3 text-sm font-semibold text-gray-600 text-center">Log In</Link>
            <Link to="/signup" onClick={() => setOpen(false)} className="py-3 text-sm font-semibold text-white bg-gray-900 rounded-full text-center">Sign Up</Link>
          </div>
        </div>
      )}
    </header>
  );
}
