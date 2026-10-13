import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  getCachedUser,
  getProfile,
  login,
  sendOtp,
  setCachedUser,
  setToken,
  verifyRegister,
  type Role,
  type SessionUser,
} from '../lib/api';

interface AuthContextValue {
  user: SessionUser | null;
  initializing: boolean;
  /** True when the signed-in password predates the current complexity rules. */
  passwordWeak: boolean;
  /** False when the account has never chosen a password (OTP sign-ups). */
  hasPassword: boolean;
  requestOtp: (phone: string, purpose: 'register' | 'reset') => Promise<{ code?: string }>;
  /** Resolves with the flag so the caller can prompt without a re-render. */
  signIn: (email: string, password: string) => Promise<{ user: SessionUser; passwordWeak: boolean }>;
  signUp: (input: {
    phone: string;
    code: string;
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
  }) => Promise<SessionUser>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(token: string, user: SessionUser) {
  setToken(token);
  setCachedUser(user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // A cached session renders immediately; the profile round-trip refreshes in
  // the background. First-time visitors (no cache) still wait for the initial
  // check so we don't flash the login page at signed-in users.
  const [user, setUser] = useState<SessionUser | null>(() => getCachedUser());
  const [initializing, setInitializing] = useState(() => !(getCachedUser() && getProfileToken()));
  const [passwordWeak, setPasswordWeak] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  const refresh = useCallback(async () => {
    if (!getProfileToken()) return;
    try {
      const payload = await getProfile();
      setUser(payload.user);
      setCachedUser(payload.user);
      if (typeof payload.passwordWeak === 'boolean') setPasswordWeak(payload.passwordWeak);
      if (typeof payload.hasPassword === 'boolean') setHasPassword(payload.hasPassword);
    } catch (e) {
      // Only a definite rejection ends the session. Transient failures (slow
      // backend, dropped network) keep the cached user so a flaky refresh
      // never logs you out.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setToken(null);
        setCachedUser(null);
        setUser(null);
        setPasswordWeak(false);
        setHasPassword(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setInitializing(false));
  }, [refresh]);

  const requestOtp = useCallback(async (phone: string, purpose: 'register' | 'reset') => {
    const res = await sendOtp(phone, purpose);
    return { code: res.code };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await login({ email, password });
    persist(res.token, res.user);
    setUser(res.user);
    setPasswordWeak(Boolean(res.passwordWeak));
    setHasPassword(Boolean(res.hasPassword));
    return { user: res.user, passwordWeak: Boolean(res.passwordWeak) };
  }, []);

  const signUp = useCallback(
    async (input: {
      phone: string;
      code: string;
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
    }) => {
      const res = await verifyRegister(input);
      persist(res.token, res.user);
      setUser(res.user);
      setPasswordWeak(Boolean(res.passwordWeak));
      setHasPassword(Boolean(res.hasPassword));
      return res.user;
    },
    [],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setCachedUser(null);
    setUser(null);
    setPasswordWeak(false);
    setHasPassword(false);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, passwordWeak, hasPassword, requestOtp, signIn, signUp, signOut, refresh }),
    [user, initializing, passwordWeak, hasPassword, requestOtp, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function getProfileToken() {
  try {
    return Boolean(localStorage.getItem('fundigrid.token'));
  } catch {
    return false;
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
