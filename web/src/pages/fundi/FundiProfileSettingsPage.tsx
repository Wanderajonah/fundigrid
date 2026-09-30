import { useState, type FormEvent } from 'react';
import { User, Mail, Phone, MapPin, Star, X, Plus, Briefcase, Map } from 'lucide-react';
import { updateProfile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CATEGORY_LABELS } from '../../lib/categories';

export default function FundiProfileSettingsPage() {
  const { user, refresh } = useAuth();

  const initialSkills = Array.isArray(user?.skills) ? user!.skills!.filter(Boolean) : [];
  const [primary, setPrimary] = useState(initialSkills[0] || CATEGORY_LABELS[0]);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [newSkill, setNewSkill] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [location, setLocation] = useState(user?.locationLabel || user?.address || '');
  const [radius, setRadius] = useState(user?.serviceRadius ? String(user.serviceRadius) : '');
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; message?: string }>({ kind: 'idle' });

  const displayName = user?.name?.trim() || user?.phone || 'Fundi account';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const tradeLabel = skills[0] || 'Fundi';

  function addSkill() {
    const value = newSkill.trim();
    if (!value || skills.some(s => s.toLowerCase() === value.toLowerCase())) return;
    setSkills([...skills, value]);
    setNewSkill('');
  }

  function removeSkill(s: string) {
    const next = skills.filter(x => x !== s);
    setSkills(next);
    if (primary === s) setPrimary(next[0] || CATEGORY_LABELS[0]);
  }

  function pickPrimary(trade: string) {
    setPrimary(trade);
    setSkills(prev => [trade, ...prev.filter(s => s.toLowerCase() !== trade.toLowerCase())]);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setStatus({ kind: 'saving' });
    try {
      const numericRadius = radius.trim() === '' ? undefined : Number(radius);
      await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        locationLabel: location.trim() || undefined,
        skills,
        ...(numericRadius !== undefined && Number.isFinite(numericRadius) ? { serviceRadius: numericRadius } : {}),
      });
      await refresh();
      setStatus({ kind: 'saved' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : 'Could not save changes' });
    }
  }

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Profile Settings</h1>
      <p className="text-sm text-gray-400 mb-14">Manage your fundi profile</p>

      <div className="flex items-center gap-6 mb-14">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-300">{initials}</div>
        <div>
          <h2 className="font-semibold text-gray-900 text-lg">{displayName}</h2>
          <p className="text-sm text-gray-400">{tradeLabel}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Star size={12} className="text-primary fill-primary" />
            <span className="text-xs font-bold text-primary">{Number(user?.rating ?? 0).toFixed(1)}</span>
            <span className="text-xs text-gray-400">({user?.reviewCount ?? 0} reviews)</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="mb-14">
          <label className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
            <Briefcase size={18} className="text-gray-400" /> Trade / Specialization
          </label>
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-wide">Select your primary trade</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY_LABELS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => pickPrimary(t)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  primary === t
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-100 text-gray-500 hover:border-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 mb-14">
          <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
          {[
            { label: 'Full Name', value: name, set: setName, icon: User },
            { label: 'Email', value: email, set: setEmail, icon: Mail },
            { label: 'Phone', value: user?.phone || '', set: () => {}, icon: Phone, readOnly: true },
            { label: 'Location', value: location, set: setLocation, icon: MapPin },
          ].map(f => {
            const Icon = f.icon;
            return (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">{f.label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    readOnly={Boolean((f as { readOnly?: boolean }).readOnly)}
                    className="w-full pl-11 pr-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 read-only:text-gray-400"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-14">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map(s => (
              <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-xs font-medium text-gray-600 rounded-lg">
                {s}<button type="button" onClick={() => removeSkill(s)} className="hover:text-red-500"><X size={12} /></button>
              </span>
            ))}
            {skills.length === 0 && <span className="text-sm text-gray-400">No skills added yet.</span>}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Add skill..."
              className="flex-1 px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300"
            />
            <button type="button" onClick={addSkill} className="px-4 py-3 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all"><Plus size={16} /></button>
          </div>
        </div>

        <div className="mb-14">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Service area</h2>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-gray-400 w-32"><Map size={16} /> Radius (km)</span>
            <input
              type="number"
              min={0}
              value={radius}
              onChange={e => setRadius(e.target.value)}
              placeholder="e.g. 25"
              className="flex-1 px-4 py-3 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300"
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Clients further away than this will not see you in search results.</p>
        </div>

        {status.kind === 'saved' && <p className="text-xs text-emerald-600 mb-4">Profile saved.</p>}
        {status.kind === 'error' && <p className="text-xs text-red-500 mb-4">{status.message}</p>}

        <button
          type="submit"
          disabled={status.kind === 'saving'}
          className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
        >
          {status.kind === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
