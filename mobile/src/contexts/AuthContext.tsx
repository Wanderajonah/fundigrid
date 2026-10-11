import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../services/api';
import { disconnectSocket } from '../services/socket';

type User = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
  role: string;
  fundiEnabled?: boolean;
  profilePhoto?: string;
  location?: any;
  gender?: string;
  locationLabel?: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationNote?: string;
  skills?: string[];
  portfolioImages?: string[];
  experience?: number;
  bio?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** True when the signed-in password predates the current complexity rules. */
  passwordWeak: boolean;
  /** True when the account already has a password (skips the set-password step). */
  hasPassword: boolean;
  signIn: (phone: string, password: string) => Promise<{ user?: User; passwordWeak?: boolean }>;
  signUp: (input: {
    phone: string;
    code: string;
    role: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => Promise<{ user?: User; hasPassword?: boolean; token?: string; accountExisted?: boolean }>;
  /** Puts an already-issued session (password reset) into context state. */
  applySession: (session: { token: string; user: User; passwordWeak?: boolean; hasPassword?: boolean }) => void;
  signOut: () => void;
  /** Pass a token right after sign-up/reset — context state may not have caught up yet. */
  refreshUser: (tokenOverride?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  passwordWeak: false,
  hasPassword: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  applySession: () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordWeak, setPasswordWeak] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await api.getToken();
      const u = await api.getUser();
      if (t && u) {
        setToken(t);
        setUser(u);
      }
      setLoading(false);
    })();
  }, []);

  const signIn = async (phone: string, password: string) => {
    const data = await api.loginWithPassword({ phone, password });
    setToken(data.token);
    setUser(data.user);
    setPasswordWeak(Boolean(data.passwordWeak));
    setHasPassword(Boolean(data.hasPassword));
    return { user: data.user, passwordWeak: Boolean(data.passwordWeak) };
  };

  const signUp = async (input: {
    phone: string;
    code: string;
    role: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  }) => {
    const data = await api.verifyOtpRegister(input);
    setToken(data.token);
    setUser(data.user);
    setPasswordWeak(Boolean(data.passwordWeak));
    setHasPassword(Boolean(data.hasPassword));
    return {
      user: data.user,
      hasPassword: Boolean(data.hasPassword),
      token: data.token,
      accountExisted: Boolean(data.accountExisted),
    };
  };

  const applySession = (session: { token: string; user: User; passwordWeak?: boolean; hasPassword?: boolean }) => {
    setToken(session.token);
    setUser(session.user);
    setPasswordWeak(Boolean(session.passwordWeak));
    setHasPassword(Boolean(session.hasPassword));
  };

  const signOut = async () => {
    await api.logout();
    disconnectSocket();
    setToken(null);
    setUser(null);
    setPasswordWeak(false);
    setHasPassword(false);
  };

  const refreshUser = useCallback(async (tokenOverride?: string) => {
    const activeToken = tokenOverride || token;
    if (!activeToken) return;
    try {
      const data = await api.getProfile(activeToken);
      const fresh = data.user ?? data;
      if (typeof data.hasPassword === 'boolean') setHasPassword(data.hasPassword);
      if (fresh) {
        setUser(fresh);
        await api.cacheUser(fresh);
      }
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, passwordWeak, hasPassword, signIn, signUp, applySession, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
