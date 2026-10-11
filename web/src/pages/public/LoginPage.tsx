import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import logoLight from '../../assets/logo-light.png';
import { type Role } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const HOME: Record<Role, string> = { customer: '/client', fundi: '/fundi', admin: '/admin', surveyor: '/surveyor' };

// Roles with an account-security page (surveyors have none yet).
const SETTINGS: Partial<Record<Role, string>> = {
  customer: '/client/settings',
  fundi: '/fundi/settings',
  admin: '/admin/settings',
};

const inputCls =
  'w-full pl-11 pr-11 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-gray-300';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      const { user, passwordWeak } = await signIn(email.trim(), password);
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
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-[380px]">
          <img src={logoLight} alt="FundiGrid" className="block mx-auto h-14 w-auto" />

          <h1 className="text-3xl font-bold text-gray-900 mt-16 mb-2">Welcome back</h1>
          <p className="text-sm text-gray-400">Sign in with your email and password</p>

          {weak ? (
            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-base font-bold text-amber-900">Your password needs an upgrade</h2>
              <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                For your security, passwords must now have at least 8 characters with an uppercase
                letter, a lowercase letter, a number and a symbol.
              </p>
              <div className="mt-5 flex flex-col gap-3">
                {SETTINGS[weak.role] && (
                  <button
                    type="button"
                    onClick={() => navigate(SETTINGS[weak.role]!)}
                    className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-semibold text-sm rounded-xl transition-all"
                  >
                    Update password now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(weak.target, { replace: true })}
                  className="w-full py-3.5 text-amber-800 font-semibold text-sm hover:underline"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-12 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="email"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          )}

          <p className="flex items-center justify-center gap-2 text-[11px] text-gray-300 mt-8">
            <ShieldCheck size={13} /> Your credentials are encrypted and never shared
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gray-950 items-center justify-center">
        <div className="text-center px-16">
          <h2 className="text-4xl font-bold text-white mb-4">FundiGrid</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Connecting skilled artisans with clients across Uganda.</p>
        </div>
      </div>
    </div>
  );
}
