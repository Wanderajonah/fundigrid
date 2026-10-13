// Client-side state for the admin dashboard: every list on it (requests,
// estimates, surveyors, fundis, users, bookings) is read from and written to
// the backend.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ApiError,
  assignAdminSurveyor,
  createAdminUser,
  deleteAdminUser,
  getAdminBookings,
  getAdminVerifications,
  getAdminFundis,
  getAdminRequests,
  getAdminStats,
  getAdminSurveyors,
  getAdminUsers,
  submitAdminEstimate,
  updateAdminFundi,
  updateAdminUser,
  reviewAdminVerification,
  type AdminBooking,
  type AdminFundi,
  type AdminRequest,
  type AdminSurveyor,
  type AdminStats,
  type AdminUser,
  type AdminVerification,
  type CreateUserInput,
  type EstimateInput,
  type SurveyStage,
} from '../../../lib/api';
import type {
  BookingRecord,
  Estimate,
  Fundi,
  FundiStatus,
  JobRequest,
  JobStatus,
  PlatformUser,
  Surveyor,
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

// NULL surveyStatus means the booking predates the surveyor stage; the backend
// reads those as "estimate already ready", so the dashboard has to agree.
function stageToStatus(stage?: SurveyStage | null): JobStatus {
  if (stage === 'SURVEYOR_ASSIGNED') return 'Surveyor Assigned';
  if (stage === 'ESTIMATE_READY' || stage == null) return 'Estimate Ready';
  if (stage === 'AWAITING_ASSIGNMENT') return 'New';
  return 'New';
}

function isAssignedOrReady(stage?: SurveyStage | null): boolean {
  return stage === 'SURVEYOR_ASSIGNED' || stage === 'ESTIMATE_READY' || stage == null;
}

function toJob(row: AdminRequest): JobRequest {
  return {
    id: row.id,
    service: row.category || 'Service',
    location: shortLabel(row.address),
    customer: row.clientName || 'Client',
    customerPhone: row.clientPhone || '',
    date: formatDate(row.created_at),
    status: stageToStatus(row.surveyStatus),
    description: row.description || '',
    address: row.address || '',
    scheduledFor: row.scheduledFor ? formatDate(row.scheduledFor) : 'Not scheduled',
    photos: Array.isArray(row.images) ? row.images.length : 0,
    surveyorId: row.surveyorId || undefined,
    surveyorName: row.surveyorName || undefined,
  };
}

function toEstimate(row: AdminRequest): Estimate {
  const ready = isAssignedOrReady(row.surveyStatus) && row.surveyStatus !== 'SURVEYOR_ASSIGNED';
  const est = row.estimate;
  return {
    // The request id doubles as the estimate id so the detail page can read
    // straight from the same booking record.
    id: row.id,
    jobId: row.id,
    service: row.category || 'Service',
    customer: row.clientName || 'Client',
    surveyor: row.surveyorName || 'Unassigned',
    surveyorId: row.surveyorId || '',
    amount: Number(est?.total) || 0,
    status: ready ? 'Ready' : 'Pending',
    submittedOn: ready ? formatDate(row.estimateSubmittedAt) : 'Not submitted',
    breakdown: [
      { label: 'Labour', amount: Number(est?.labour) || 0 },
      { label: 'Materials', amount: Number(est?.materials) || 0 },
      { label: 'Service fee', amount: Number(est?.serviceFee) || 0 },
    ],
    notes: est?.notes ? [String(est.notes)] : [],
  };
}

function toSurveyor(row: AdminSurveyor, requests: JobRequest[]): Surveyor {
  const name = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Quantity Surveyor';
  return {
    id: row.id,
    name,
    specialty: 'Quantity Surveyor',
    location: row.district || shortLabel(row.locationLabel) || 'Uganda',
    rating: 0,
    jobs: requests.filter(r => r.surveyorId === row.id).length,
    available: row.status !== 'inactive',
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
  };
}

interface AdminStoreValue {
  jobs: JobRequest[];
  estimates: Estimate[];
  fundis: Fundi[];
  surveyors: Surveyor[];
  users: PlatformUser[];
  bookings: BookingRecord[];
  stats: AdminStats | null;
  loading: boolean;
  error: string;
  getJob: (id?: string) => JobRequest | undefined;
  getEstimate: (id?: string) => Estimate | undefined;
  getFundi: (id?: string) => Fundi | undefined;
  reload: () => Promise<void>;
  assignSurveyor: (jobId: string, surveyorId: string) => Promise<void>;
  submitEstimate: (jobId: string, input: EstimateInput) => Promise<void>;
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
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [surveyors, setSurveyors] = useState<Surveyor[]>([]);
  const [fundis, setFundis] = useState<Fundi[]>([]);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Surveyor cards count jobs from the requests list; keep the latest mapping
  // in a ref so the surveyor loader can run on its own.
  const jobsRef = useRef<JobRequest[]>([]);

  const applyRequestRows = useCallback((rows: AdminRequest[]) => {
    const mappedJobs = rows.map(toJob);
    jobsRef.current = mappedJobs;
    setJobs(mappedJobs);
    setEstimates(
      rows
        .filter(r => isAssignedOrReady(r.surveyStatus) && r.surveyStatus !== 'AWAITING_ASSIGNMENT')
        .map(toEstimate),
    );
  }, []);

  // Per-domain loaders: a mutation refetches only what it touched instead of
  // re-firing all seven endpoints (each costs a full auth + query round-trip).
  const loadRequests = useCallback(async () => {
    const res = await getAdminRequests();
    applyRequestRows(res.requests || []);
  }, [applyRequestRows]);

  const loadSurveyors = useCallback(async () => {
    const res = await getAdminSurveyors();
    setSurveyors((res.surveyors || []).map(s => toSurveyor(s, jobsRef.current)));
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
        loadSurveyors(),
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
  }, [loadRequests, loadSurveyors, loadFundis, loadUsers, loadBookings, loadStats, loadVerifications]);

  useEffect(() => {
    reload();
  }, [reload]);

  const getJob = useCallback((id?: string) => jobs.find(j => j.id === id), [jobs]);
  const getEstimate = useCallback((id?: string) => estimates.find(e => e.id === id), [estimates]);
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

  const assignSurveyor = useCallback(async (jobId: string, surveyorId: string) => {
    await run(() => assignAdminSurveyor(jobId, surveyorId), [loadRequests, loadSurveyors, loadStats]);
  }, [run, loadRequests, loadSurveyors, loadStats]);

  const submitEstimate = useCallback(async (jobId: string, input: EstimateInput) => {
    await run(() => submitAdminEstimate(jobId, input), [loadRequests, loadStats]);
  }, [run, loadRequests, loadStats]);

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
      estimates,
      fundis,
      surveyors,
      users,
      bookings,
      stats,
      loading,
      error,
      getJob,
      getEstimate,
      getFundi,
      reload,
      assignSurveyor,
      submitEstimate,
      createUser,
      setUserStatus,
      deleteUser,
      setFundiStatus,
      verifications,
      reviewVerification,
    }),
    [
      jobs, estimates, fundis, surveyors, users, bookings, stats, loading, error,
      getJob, getEstimate, getFundi, reload, assignSurveyor, submitEstimate,
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
