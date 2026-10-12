import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { ApiError, type CreateUserInput, type RawRole } from '../../../lib/api';
import { evaluatePassword, PASSWORD_MESSAGE, validatePassword } from '../../../lib/passwordPolicy';

interface Props {
  open: boolean;
  role: RawRole;
  lockRole?: boolean;
  onClose: () => void;
  onCreate: (input: CreateUserInput) => Promise<void>;
}

const ROLE_OPTIONS: { value: RawRole; label: string }[] = [
  { value: 'customer', label: 'Client' },
  { value: 'fundi', label: 'Fundi' },
  { value: 'surveyor', label: 'Surveyor' },
  { value: 'admin', label: 'Admin' },
];

const inputCls =
  'w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';

const labelCls = 'block text-sm font-semibold text-slate-900 mb-2';

export default function AddUserDialog({ open, role, lockRole = false, onClose, onCreate }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pickedRole, setPickedRole] = useState<RawRole>(role);
  const [skills, setSkills] = useState('');
  const [district, setDistrict] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const activeRole = lockRole ? role : pickedRole;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid phone number');
      return;
    }
    if (!email.trim()) {
      setError('Email is required — it is what they sign in with');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (!validatePassword(password)) {
      setError(PASSWORD_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        role: activeRole,
        skills: skills.trim() || undefined,
        district: district.trim() || undefined,
      });
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setSkills('');
      setDistrict('');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the account');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm"
        type="button"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto overscroll-contain bg-white rounded-2xl border border-line p-7 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add user</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Create an account directly in the database — they sign in with the email and password you set.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelCls}>First name</span>
            <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus />
          </label>
          <label className="block">
            <span className={labelCls}>Last name</span>
            <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Phone</span>
            <input
              className={inputCls}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="256771234567"
              inputMode="tel"
            />
            <span className="block text-xs text-slate-400 mt-1.5">
              Use 2567… format so it matches the number they sign in with.
            </span>
          </label>

          {!lockRole && (
            <label className="block">
              <span className={labelCls}>Role</span>
              <select className={inputCls} value={pickedRole} onChange={e => setPickedRole(e.target.value as RawRole)}>
                {ROLE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className={labelCls}>Location</span>
            <input
              className={inputCls}
              value={district}
              onChange={e => setDistrict(e.target.value)}
              placeholder="Kampala"
            />
          </label>

          {activeRole === 'fundi' && (
            <label className="block sm:col-span-2">
              <span className={labelCls}>Skills</span>
              <input
                className={inputCls}
                value={skills}
                onChange={e => setSkills(e.target.value)}
                placeholder="Plumbing, Electrical"
              />
              <span className="block text-xs text-slate-400 mt-1.5">Comma separated — used to match jobs.</span>
            </label>
          )}

          <label className="block sm:col-span-2">
            <span className={labelCls}>Email</span>
            <input
              className={inputCls}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              inputMode="email"
            />
            <span className="block text-xs text-slate-400 mt-1.5">
              They sign in with this email and the password below.
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className={labelCls}>Password</span>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8+ chars with upper, lower, number, symbol"
              autoComplete="new-password"
            />
            <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {evaluatePassword(password).map(rule => (
                <li
                  key={rule.key}
                  className={`text-xs ${rule.ok ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  ✓ {rule.label}
                </li>
              ))}
            </ul>
          </label>
        </div>

        {error && (
          <p className="mt-4 text-sm font-medium text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <div className="sticky bottom-0 z-10 -mx-7 -mb-7 mt-6 flex items-center justify-end gap-3 bg-white border-t border-line px-7 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-semibold hover:bg-navy-800 transition-all disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Add user'}
          </button>
        </div>
      </form>
    </div>
  );
}
