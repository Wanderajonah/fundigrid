import { Bell, Shield, Globe, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }
  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Settings</h1>
      <p className="text-sm text-gray-400 mb-14">Manage your preferences</p>

      {/* Notifications */}
      <div className="mb-14">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6"><Bell size={18} className="text-gray-400" /> Notifications</h2>
        <div className="space-y-5">
          {[
            { label: 'Push Notifications', on: true },
            { label: 'Email Notifications', on: true },
            { label: 'SMS Notifications', on: false },
            { label: 'Job Updates', on: true },
          ].map(n => (
            <div key={n.label} className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-gray-900">{n.label}</span>
              <button className={`w-11 h-6 rounded-full transition-colors relative ${n.on ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all ${n.on ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="mb-14">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6"><Globe size={18} className="text-gray-400" /> Preferences</h2>
        <div className="space-y-5">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-900">Language</span>
            <select className="px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl"><option>English</option><option>Luganda</option></select>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-900">Currency</span>
            <select className="px-4 py-2 text-sm bg-gray-50 border border-gray-100 rounded-xl"><option>UGX</option><option>USD</option></select>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="mb-14">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-6"><Shield size={18} className="text-gray-400" /> Security</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          FundiGrid signs you in with a one-time code sent to your phone, so there is no password to change.
        </p>
      </div>

      {/* Danger */}
      <button
        onClick={handleSignOut}
        className="w-full py-4 bg-red-50 text-red-600 font-semibold text-sm rounded-2xl hover:bg-red-100 transition-all inline-flex items-center justify-center gap-2"
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
