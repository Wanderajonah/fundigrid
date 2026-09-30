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
  getCachedUser,
  getProfile,
  sendOtp,
  setCachedUser,
  setToken,
  verifyLogin,
  verifyRegister,
  type Role,
  type SessionUser,
} from '../lib/api';

interface AuthContextValue {
  user: SessionUser | null;
  initializing: boolean;
  requestOtp: (phone: string, purpose: 'login' | 'register') => Promise<{ code?: string }>;
  signIn: (phone: string, code: string) => Promise<SessionUser>;
  signUp: (input: { phone: string; code: string; name?: string; email?: string; role?: Role }) => Promise<SessionUser>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persist(token: string, user: SessionUser) {
  setToken(token);
  setCachedUser(user);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getCachedUser());
  const [initializing, setInitializing] = useState(true);

  const refresh = useCallback(async () => {
    if (!getProfileToken()) return;
    try {
      const { user: fresh } = await getProfile();
      setUser(fresh);
      setCachedUser(fresh);
    } catch {
      setToken(null);
      setCachedUser(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setInitializing(false));
  }, [refresh]);

  const requestOtp = useCallback(async (phone: string, purpose: 'login' | 'register') => {
    const res = await sendOtp(phone, purpose);
    return { code: res.code };
  }, []);

  const signIn = useCallback(async (phone: string, code: string) => {
    const res = await verifyLogin({ phone, code });
    persist(res.token, res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const signUp = useCallback(
    async (input: { phone: string; code: string; name?: string; email?: string; role?: Role }) => {
      const res = await verifyRegister(input);
      persist(res.token, res.user);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setCachedUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, requestOtp, signIn, signUp, signOut, refresh }),
    [user, initializing, requestOtp, signIn, signUp, signOut, refresh],
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
