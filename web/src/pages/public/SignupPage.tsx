import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Phone, User, Wrench } from 'lucide-react';
import FundiGridLogo from '../../components/FundiGridLogo';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { requestOtp, signUp } = useAuth();

  const [role, setRole] = useState<Role>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'details' | 'code'>('details');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function normalise(value: string) {
    return value.replace(/[^\d+]/g, '');
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter your name');
    const clean = normalise(phone);
    if (clean.replace(/\D/g, '').length < 9) return setError('Enter a valid phone number');

    setBusy(true);
    try {
      const result = await requestOtp(clean, 'register');
      if (result.code) setCode(result.code);
      setStage('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (code.replace(/\D/g, '').length < 4) return setError('Enter the code we sent you');

    setBusy(true);
    try {
      const user = await signUp({
        phone: normalise(phone),
        code: code.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        role,
      });
      navigate(user.role === 'fundi' ? '/fundi' : '/client', { replace: true });
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

          <h1 className="text-3xl font-bold text-gray-900 mt-16 mb-2">Create account</h1>
          <p className="text-sm text-gray-400">
            {stage === 'details' ? 'Your phone number becomes your login' : `We sent a code to ${phone}`}
          </p>

          {/* Role */}
          <div className="flex gap-3 mt-10">
            {([
              { id: 'customer' as const, label: 'I need a fundi', icon: User },
              { id: 'fundi' as const, label: 'I am a fundi', icon: Wrench },
            ]).map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold border-2 transition-all ${role === r.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                >
                  <Icon size={15} /> {r.label}
                </button>
              );
            })}
          </div>

          {stage === 'details' ? (
            <form className="mt-10 space-y-5" onSubmit={handleSend}>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Mugisha"
                  className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Email <span className="normal-case font-normal">(optional)</span></label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Phone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+256 700 123456"
                    className="w-full pl-11 pr-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all mt-4"
              >
                {busy ? 'Sending…' : 'Create Account'}
              </button>
            </form>
          ) : (
            <form className="mt-10 space-y-5" onSubmit={handleVerify}>
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
                    className="w-full pl-11 pr-5 py-4 text-base tracking-[0.4em] bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-gray-300 placeholder:tracking-normal"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-4 bg-gray-900 hover:bg-black disabled:opacity-60 text-white font-semibold text-sm rounded-2xl transition-all"
              >
                {busy ? 'Verifying…' : 'Create Account'}
              </button>

              <button
                type="button"
                onClick={() => { setStage('details'); setError(''); }}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-900"
              >
                <ArrowLeft size={12} /> Change details
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-400 mt-10">
            Have an account? <Link to="/login" className="font-semibold text-gray-900">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 bg-gray-950 items-center justify-center">
        <div className="text-center px-16">
          <h2 className="text-4xl font-bold text-white mb-4">FundiGrid</h2>
          <p className="text-gray-500 max-w-xs mx-auto">Join a growing community of skilled artisans and clients.</p>
        </div>
      </div>
    </div>
  );
}
