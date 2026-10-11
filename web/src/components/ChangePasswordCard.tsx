import { useState, type FormEvent } from 'react';
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react';
import { changePassword } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { evaluatePassword, PASSWORD_MESSAGE, validatePassword } from '../lib/passwordPolicy';

const inputCls =
  'w-full pl-11 pr-11 py-3.5 text-sm bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-gray-300';

type Props = {
  /** Shown when the account's password predates the current rules. */
  showWeakHint?: boolean;
};

/** Password form shared by the client, fundi and admin settings pages. */
export default function ChangePasswordCard({ showWeakHint }: Props) {
  const { hasPassword, passwordWeak, refresh } = useAuth();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDone(false);

    if (!validatePassword(password)) return setError(PASSWORD_MESSAGE);
    if (password !== confirm) return setError('Passwords do not match.');
    if (hasPassword && !current) return setError('Enter your current password.');

    setBusy(true);
    try {
      await changePassword(hasPassword ? current : undefined, password);
      await refresh();
      setDone(true);
      setCurrent('');
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Lock size={18} className="text-gray-900" />
        <h3 className="text-base font-bold text-gray-900">Change Password</h3>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Use at least 8 characters with upper and lower case letters, a number and a symbol.
      </p>

      {showWeakHint && passwordWeak && (
        <div className="flex items-start gap-2 mb-5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <X size={14} className="mt-0.5 shrink-0" />
          <span>
            Your current password does not meet the new security rules. Please choose a stronger one.
          </span>
        </div>
      )}

      <div className="space-y-4">
        {hasPassword && (
          <Field
            label="Current password"
            value={current}
            onChange={setCurrent}
            placeholder="••••••••"
            show={show}
            onToggle={() => setShow(v => !v)}
          />
        )}
        <Field
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          show={show}
          onToggle={() => setShow(v => !v)}
        />

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
          {evaluatePassword(password).map(rule => (
            <li key={rule.key} className={`flex items-center gap-1.5 text-xs ${rule.ok ? 'text-emerald-600' : 'text-gray-400'}`}>
              <Check size={13} className={rule.ok ? '' : 'opacity-30'} />
              {rule.label}
            </li>
          ))}
        </ul>

        <Field
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          placeholder="••••••••"
          show={show}
          onToggle={() => setShow(v => !v)}
        />
      </div>

      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      {done && <p className="text-xs text-emerald-600 mt-3">Password updated — use it the next time you sign in.</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full sm:w-auto px-8 py-3.5 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-all"
      >
        {busy ? 'Saving…' : 'Update Password'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">{label}</span>
      <div className="relative">
        <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}
