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
  skills?: string[];
  portfolioImages?: string[];
  experience?: number;
  bio?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (phone: string, code: string) => Promise<{ requireRoleSelection?: boolean; user?: User }>;
  signUp: (phone: string, code: string, role: string) => Promise<void>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => {},
  signOut: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signIn = async (phone: string, code: string) => {
    const data = await api.verifyOtpLogin(phone, code);
    setToken(data.token);
    setUser(data.user);
    return { requireRoleSelection: data.requireRoleSelection, user: data.user };
  };

  const signUp = async (phone: string, code: string, role: string) => {
    const data = await api.verifyOtpRegister(phone, code, role);
    setToken(data.token);
    setUser(data.user);
  };

  const signOut = async () => {
    await api.logout();
    disconnectSocket();
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.getProfile(token);
      const fresh = data.user ?? data;
      if (fresh) {
        setUser(fresh);
        await api.cacheUser(fresh);
      }
    } catch {}
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
