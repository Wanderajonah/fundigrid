import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Phone, ShieldCheck } from 'lucide-react';
import FundiGridLogo from '../../components/FundiGridLogo';
import { ApiError, type Role } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const HOME: Record<Role, string> = { customer: '/client', fundi: '/fundi', admin: '/admin', surveyor: '/surveyor' };

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestOtp, signIn } = useAuth();

  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  function normalise(value: string) {
    return value.replace(/[^\d+]/g, '');
  }

  async function handleSend(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setError('');
    const clean = normalise(phone);
    if (clean.replace(/\D/g, '').length < 9) {
      setError('Enter a valid phone number');
      return;
    }
    setBusy(true);
    try {
      const result = await requestOtp(clean, 'login');
      if (result.code) setCode(result.code);
      setStage('code');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('No account is registered to that number yet.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not send the code');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (code.replace(/\D/g, '').length < 4) {
      setError('Enter the code we sent you');
      return;
    }
    setBusy(true);
    try {
      const user = await signIn(normalise(phone), code.trim());
      const target = from && from !== '/login' ? from : HOME[user.role] || '/client';
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-[380px]">
          <FundiGridLogo size="md" />

          <h1 className="text-3xl font-bold text-gray-900 mt-16 mb-2">Welcome back</h1>
          <p className="text-sm text-gray-400">
            {stage === 'phone' ? 'Sign in with your phone number' : `We sent a code to ${phone}`}
          </p>

          {stage === 'phone' ? (
            <form className="mt-12 space-y-6" onSubmit={handleSend}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="tel"
                    autoFocus
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+256 700 123456"
                    className="w-full pl-11 pr-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-gray-300"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
              >
                {busy ? 'Sending…' : 'Send Code'}
              </button>
            </form>
          ) : (
            <form className="mt-12 space-y-6" onSubmit={handleVerify}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Verification Code</label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-11 pr-5 py-4 text-base tracking-[0.4em] bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-gray-300 placeholder:tracking-normal"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
              >
                {busy ? 'Verifying…' : 'Sign In'}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => { setStage('phone'); setError(''); }}
                  className="inline-flex items-center gap-1.5 hover:text-gray-900"
                >
                  <ArrowLeft size={12} /> Change number
                </button>
                <button type="button" onClick={handleSend} className="hover:text-gray-900" disabled={busy}>
                  Resend code
                </button>
              </div>
            </form>
          )}

          <p className="flex items-center justify-center gap-2 text-[11px] text-gray-300 mt-8">
            <ShieldCheck size={13} /> Passwordless login — your number is your account
          </p>

          <p className="text-center text-sm text-gray-400 mt-8">
            No account? <Link to="/signup" className="font-semibold text-gray-900">Sign up</Link>
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
