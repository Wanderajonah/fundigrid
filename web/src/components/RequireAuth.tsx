import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../lib/api';

const HOME: Record<Role, string> = { customer: '/client', fundi: '/fundi', admin: '/admin', surveyor: '/surveyor' };

export default function RequireAuth({ children, role }: { children: ReactNode; role?: Role }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Blank only for first-time visitors while the session is being checked.
  // Signed-in users (cached session) render instantly.
  if (!user && initializing) {
    return <div className="min-h-screen bg-[#FAFAFA]" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    return <Navigate to={HOME[user.role] || '/login'} replace />;
  }

  return <>{children}</>;
}
