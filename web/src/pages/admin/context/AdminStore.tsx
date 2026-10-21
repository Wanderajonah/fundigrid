// Client-side state for the admin dashboard: every list on it (requests,
// fundis, users, bookings) is read from and written to the backend.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ApiError,
  createAdminUser,
  deleteAdminUser,
  getAdminBookings,
  getAdminVerifications,
  getAdminFundis,
  getAdminRequests,
  getAdminStats,
  getAdminUsers,
  updateAdminFundi,
  updateAdminUser,
  reviewAdminVerification,
  type AdminBooking,
  type AdminFundi,
  type AdminRequest,
  type AdminStats,
  type AdminUser,
  type AdminVerification,
  type CreateUserInput,
} from '../../../lib/api';
import type {
  BookingRecord,
  Fundi,
  FundiStatus,
  JobRequest,
  JobStatus,
  PlatformUser,
} from '../data/meta';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function shortLabel(text?: string | null): string {
  const value = (text || '').trim();
  return value ? value.split(',')[0].trim() : '—';
}

function money(value?: number | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// The request's status is the booking's own status — there is no separate
// pricing stage sitting in front of it any more.
function statusToJob(status?: string): JobStatus {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED' || status === 'DISPUTED') return 'Cancelled';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'ON_THE_WAY' || status === 'ARRIVED' || status === 'IN_PROGRESS') return 'In Progress';
  return 'New';
}

function toJob(row: AdminRequest): JobRequest {
  // What the job is worth to the platform: the agreed price if there is one,
  // otherwise the fundi's outstanding quote.
  const amount = money(row.agreedPrice) || money(row.proposedPrice);
  return {
    id: row.id,
    service: row.category || 'Service',
    location: shortLabel(row.address),
    customer: row.clientName || 'Client',
    customerPhone: row.clientPhone || '',
    date: formatDate(row.created_at),
    status: statusToJob(row.status),
    description: row.description || '',
    address: row.address || '',
    scheduledFor: row.scheduledFor ? formatDate(row.scheduledFor) : 'Not scheduled',
    photos: Array.isArray(row.images) ? row.images.length : 0,
    fundi: row.fundiName || 'Unassigned',
    amount,
    priceAgreed: Boolean(row.priceAgreed),
    proposedPrice: money(row.proposedPrice),
    proposedBy: row.proposedBy || '',
  };
}

function toFundi(row: AdminFundi): Fundi {
  return {
    id: row.id,
    name: row.name,
    trade: row.trade,
    location: row.location,
    rating: Number(row.rating) || 0,
    reviews: Number(row.reviews) || 0,
    status: row.status,
    phone: row.phone,
    joined: formatDate(row.createdAt),
    experience: Number(row.experience) || 0,
    completedJobs: Number(row.completedJobs) || 0,
    availability: row.availability,
    about: row.about,
    skills: row.skills || [],
    verified: Boolean(row.verified),
  };
}

function toUser(row: AdminUser): PlatformUser {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    phone: row.phone || '—',
    location: row.location || '—',
    joined: formatDate(row.createdAt),
    status: row.status,
  };
}

function toBooking(row: AdminBooking): BookingRecord {
  return {
    id: row.id,
    service: row.category,
    client: row.client,
    fundi: row.fundi,
    location: shortLabel(row.address),
    date: formatDate(row.createdAt),
    amount: Number(row.amount) || 0,
    status: row.status,
    priceAgreed: Boolean(row.priceAgreed),
  };
}

interface AdminStoreValue {
  jobs: JobRequest[];
  fundis: Fundi[];
  users: PlatformUser[];
  bookings: BookingRecord[];
  stats: AdminStats | null;
  loading: boolean;
  error: string;
  getJob: (id?: string) => JobRequest | undefined;
  getFundi: (id?: string) => Fundi | undefined;
  reload: () => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<void>;
  setUserStatus: (userId: string, status: 'Active' | 'Inactive') => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  setFundiStatus: (fundiId: string, status: FundiStatus) => Promise<void>;
  verifications: AdminVerification[];
  reviewVerification: (
    userId: string,
    decision: { decision: 'approve' | 'reject'; note?: string },
  ) => Promise<void>;
}

const AdminStoreContext = createContext<AdminStoreValue | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobRequest[]>([]);
  const [fundis, setFundis] = useState<Fundi[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-domain loaders: a mutation refetches only what it touched instead of
  // re-firing every endpoint (each costs a full auth + query round-trip).
  const loadRequests = useCallback(async () => {
    const res = await getAdminRequests();
    setJobs((res.requests || []).map(toJob));
  }, []);

  const loadFundis = useCallback(async () => {
    const res = await getAdminFundis();
    setFundis((res.fundis || []).map(toFundi));
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await getAdminUsers();
    setUsers((res.users || []).map(toUser));
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await getAdminBookings();
    setBookings((res.bookings || []).map(toBooking));
  }, []);

  const loadStats = useCallback(async () => {
    const res = await getAdminStats();
    setStats(res.stats);
  }, []);

  const loadVerifications = useCallback(async () => {
    const res = await getAdminVerifications('pending');
    setVerifications(res.verifications || []);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadRequests(),
        loadFundis(),
        loadUsers(),
        loadBookings(),
        loadStats(),
        // The review queue drives the dashboard's pending-verification card.
        loadVerifications(),
      ]);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [loadRequests, loadFundis, loadUsers, loadBookings, loadStats, loadVerifications]);

  useEffect(() => {
    reload();
  }, [reload]);

  const getJob = useCallback((id?: string) => jobs.find(j => j.id === id), [jobs]);
  const getFundi = useCallback((id?: string) => fundis.find(f => f.id === id), [fundis]);

  // Mutations surface their failures on the store so a page that fires and
  // forgets still shows the message instead of an unhandled rejection. The
  // affected slices refetch quietly (no global loading flip) so the page
  // updates in place.
  const run = useCallback(async (action: () => Promise<unknown>, slices: (() => Promise<void>)[] = []) => {
    try {
      await action();
      if (slices.length) await Promise.all(slices.map(slice => slice()));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server');
      throw e;
    }
  }, []);

  const createUser = useCallback(async (input: CreateUserInput) => {
    await run(() => createAdminUser(input), [loadUsers, loadStats]);
  }, [run, loadUsers, loadStats]);

  const setUserStatus = useCallback(async (userId: string, status: 'Active' | 'Inactive') => {
    await run(
      () => updateAdminUser(userId, { status: status === 'Active' ? 'active' : 'inactive' }),
      [loadUsers, loadStats],
    );
  }, [run, loadUsers, loadStats]);

  const deleteUser = useCallback(async (userId: string) => {
    await run(() => deleteAdminUser(userId), [loadUsers, loadStats]);
  }, [run, loadUsers, loadStats]);

  const setFundiStatus = useCallback(async (fundiId: string, status: FundiStatus) => {
    await run(
      () => updateAdminFundi(fundiId, { status: status === 'Suspended' ? 'inactive' : 'active' }),
      [loadFundis, loadStats],
    );
  }, [run, loadFundis, loadStats]);

  const reviewVerification = useCallback(
    async (userId: string, decision: { decision: 'approve' | 'reject'; note?: string }) => {
      // Approving can turn the user into an active fundi, so the fundi list
      // and the user counts refresh alongside the queue itself.
      await run(() => reviewAdminVerification(userId, decision), [
        loadVerifications,
        loadFundis,
        loadUsers,
        loadStats,
      ]);
    },
    [run, loadVerifications, loadFundis, loadUsers, loadStats],
  );

  const value = useMemo(
    () => ({
      jobs,
      fundis,
      users,
      bookings,
      stats,
      loading,
      error,
      getJob,
      getFundi,
      reload,
      createUser,
      setUserStatus,
      deleteUser,
      setFundiStatus,
      verifications,
      reviewVerification,
    }),
    [
      jobs, fundis, users, bookings, stats, loading, error,
      getJob, getFundi, reload,
      createUser, setUserStatus, deleteUser, setFundiStatus, verifications,
      reviewVerification,
    ],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const store = useContext(AdminStoreContext);
  if (!store) throw new Error('useAdminStore must be used inside AdminStoreProvider');
  return store;
}
