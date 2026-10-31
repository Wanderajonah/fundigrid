import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import logoLight from '../../assets/logo-light.webp';
import { type Role } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const HOME: Record<Role, string> = { customer: '/client', fundi: '/fundi', admin: '/admin' };

// Roles with an account-security page.
const SETTINGS: Partial<Record<Role, string>> = {
  customer: '/client/settings',
  fundi: '/fundi/settings',
  admin: '/admin/settings',
};

const inputCls =
  'w-full h-11 pl-11 pr-11 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 ' +
  'placeholder:text-slate-400 transition-colors duration-150 ' +
  'focus:outline-none focus:border-navy-900 focus:ring-2 focus:ring-navy-900/10';

const iconCls = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [weak, setWeak] = useState<{ target: string; role: Role } | null>(null);

  const from = (location.state as { from?: string } | null)?.from;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Enter your email address');
    if (!password) return setError('Enter your password');

    setBusy(true);
    try {
      const { user, passwordWeak } = await signIn(email.trim(), password, remember);
      const target = from && from !== '/login' ? from : HOME[user.role] || '/client';
      // Old, too-simple passwords are allowed in — but ask for an upgrade.
      if (passwordWeak) {
        setWeak({ target, role: user.role });
        return;
      }
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="rounded-2xl bg-white px-7 py-8 shadow-[0_12px_40px_-12px_rgba(15,42,95,0.25)] sm:px-8">
          <img src={logoLight} alt="FundiGrid" className="mx-auto h-14 w-auto" />
          <h1 className="mt-4 text-center text-[17px] font-bold text-navy-950">
            Sign in to your account
          </h1>

          {weak ? (
            <div className="mt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-sm font-bold text-amber-900">Your password needs an upgrade</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-amber-700">
                  For your security, passwords must now have at least 8 characters with an uppercase
                  letter, a lowercase letter, a number and a symbol.
                </p>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {SETTINGS[weak.role] && (
                  <button
                    type="button"
                    onClick={() => navigate(SETTINGS[weak.role]!)}
                    className="h-11 w-full rounded-lg bg-navy-950 text-sm font-semibold text-white transition-colors hover:bg-navy-900"
                  >
                    Update password now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(weak.target, { replace: true })}
                  className="h-11 w-full text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-3.5" onSubmit={handleSubmit}>
              <div className="relative">
                <label htmlFor="email" className="sr-only">Email</label>
                <Mail size={18} className={iconCls} />
                <input
                  id="email"
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>

              <div className="relative">
                <label htmlFor="password" className="sr-only">Password</label>
                <Lock size={18} className={iconCls} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}

              <div className="flex items-center justify-between pt-1">
                <label className="flex select-none items-center gap-2 text-[13px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-400 accent-navy-950"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgot(v => !v)}
                  className="text-[13px] font-semibold text-navy-950 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {forgot && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-500">
                  Password reset isn’t available on the web yet. Please contact support to reset
                  your password.
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-950 text-sm font-semibold text-white transition-colors duration-150 hover:bg-navy-900 disabled:opacity-60"
              >
                <LogIn size={16} />
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-slate-400">
          ©{new Date().getFullYear()} FundiGrid
        </p>
        <p className="mt-1 text-center text-[13px] text-slate-400">
          Connecting skilled artisans with clients across Uganda
        </p>
      </div>
    </div>
  );
}
