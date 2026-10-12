import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import logoLight from '../../assets/logo-light.png';
import cityIllustration from '../../assets/cityillustration.png';
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
  'w-full pl-12 pr-12 py-[17px] text-[15px] leading-6 bg-slate-50 border border-slate-300 rounded-xl ' +
  'text-slate-900 placeholder:text-slate-400 ' +
  'transition-colors duration-200 ease-out ' +
  'hover:border-slate-400 ' +
  'focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/15';

const labelCls = 'block text-xs font-semibold text-slate-500 mb-2.5 uppercase tracking-wide';

const iconCls =
  'pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200';

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
      <div className="relative overflow-hidden flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        {/* Bottom-left decorative arcs — soft gold/cream rings, mostly off-screen,
            always behind the form (form content sits at z-10). */}
        <div
          aria-hidden
          className="pointer-events-none select-none absolute -bottom-12 -left-12 h-[8.8rem] w-[8.8rem] sm:-bottom-16 sm:-left-16 sm:h-[12rem] sm:w-[12rem] lg:-bottom-20 lg:-left-20 lg:h-[15.2rem] lg:w-[15.2rem]"
        >
          <div className="absolute inset-0 rounded-full bg-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
          <div className="absolute inset-[16%] rounded-full border border-primary/15" />
        </div>

        <div className="relative z-10 w-full max-w-[380px]">
          <img src={logoLight} alt="FundiGrid" className="block mx-auto h-14 w-auto" />

          <h1 className="text-3xl font-bold text-gray-900 mt-14 mb-2">Welcome back</h1>
          <p className="text-sm text-gray-500">Sign in with your email and password</p>

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
            <form className="mt-10 space-y-5" onSubmit={handleSubmit}>
            <div className="group">
              <label htmlFor="email" className={labelCls}>Email</label>
              <div className="relative">
                <Mail size={18} className={`${iconCls} group-focus-within:text-primary`} />
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
            </div>

            <div className="group">
              <label htmlFor="password" className={labelCls}>Password</label>
              <div className="relative">
                <Lock size={18} className={`${iconCls} group-focus-within:text-primary`} />
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="text-[13px] font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 bg-navy-950 hover:bg-navy-900 disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-colors duration-200"
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          )}

          <p className="flex items-center justify-center gap-2 text-[11px] text-gray-400 mt-8">
            <ShieldCheck size={13} /> Your credentials are encrypted and never shared
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gray-950 items-center justify-center">
        <div className="text-center px-16">
          <h2 className="text-4xl font-bold text-white mb-4">FundiGrid</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Connecting skilled artisans with clients across Uganda.</p>
        </div>
        <img
          src={cityIllustration}
          alt=""
          aria-hidden
          className="absolute bottom-0 left-0 w-full select-none pointer-events-none"
        />
      </div>
    </div>
  );
}
