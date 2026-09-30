import { useState, type FormEvent } from 'react';
import { User, Mail, Phone, MapPin } from 'lucide-react';
import { updateProfile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.locationLabel || user?.address || '');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ kind: 'idle' });

  const displayName = user?.name?.trim() || user?.phone || 'Your account';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = user?.role === 'fundi' ? 'Fundi Account' : 'Client Account';

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        locationLabel: location.trim() || undefined,
      });
      await refresh();
      setStatus({ kind: 'saved' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Could not save changes' });
    }
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">My Profile</h1>
      <p className="text-sm text-gray-400 mb-14">Manage your personal information</p>

      <div className="flex items-center gap-6 mb-14">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-300">{initials}</div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">{displayName}</h2>
          <p className="text-sm text-gray-400">{roleLabel}</p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSave}>
        {[
          { label: 'Full Name', value: name, set: setName, icon: User, type: 'text' },
          { label: 'Email', value: email, set: setEmail, icon: Mail, type: 'email' },
          { label: 'Phone', value: phone, set: () => {}, icon: Phone, type: 'tel', readOnly: true },
          { label: 'Location', value: location, set: setLocation, icon: MapPin, type: 'text' },
        ].map(f => {
          const Icon = f.icon;
          return (
            <div key={f.label}>
              <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">{f.label}</label>
              <div className="relative">
                <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  readOnly={'readOnly' in f ? Boolean((f as { readOnly?: boolean }).readOnly) : false}
                  className="w-full pl-11 pr-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:text-gray-400"
                />
              </div>
            </div>
          );
        })}

        {status.kind === 'saved' && <p className="text-xs text-emerald-600">Profile saved.</p>}
        {status.kind === 'error' && <p className="text-xs text-red-500">{status.message}</p>}

        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all mt-4"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
