// Single HTTP client for the FundiGrid backend.
// `/api` is proxied to localhost:5000 by vite.config.ts; override with VITE_API_URL
// when the API is served from another origin.

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

const TOKEN_KEY = 'fundigrid.token';
const USER_KEY = 'fundigrid.user';

export class ApiError extends Error {
  status: number;
  /** Machine-readable reason, e.g. PASSWORD_NOT_SET or LOCKED. */
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// "Remember me" chooses the storage backend: localStorage keeps the session
// across browser restarts, sessionStorage drops it when the tab closes.
function readStored(key: string): string | null {
  try {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string | null, remember: boolean) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    if (value !== null) (remember ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    // Storage blocked (private mode / quota): the session stays in memory only.
  }
}

/** True when the current session was stored with "Remember me". */
function isRemembered(): boolean {
  try {
    return localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return true;
  }
}

export function getToken(): string | null {
  return readStored(TOKEN_KEY);
}

export function setToken(token: string | null, remember = isRemembered()) {
  writeStored(TOKEN_KEY, token, remember);
}

export function getCachedUser(): SessionUser | null {
  // A cached user without a token means the session is over — never render it.
  if (!getToken()) return null;
  const raw = readStored(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setCachedUser(user: SessionUser | null, remember = isRemembered()) {
  writeStored(USER_KEY, user ? JSON.stringify(user) : null, remember);
}

export type Role = 'customer' | 'fundi' | 'admin';

export interface SessionUser {
  id: string;
  name?: string;
  phone?: string;
  email?: string | null;
  role: Role;
  skills?: string[];
  location?: { lat?: number; lng?: number } | null;
  locationLabel?: string | null;
  address?: string | null;
  district?: string | null;
  bio?: string;
  experience?: number;
  serviceRadius?: number;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  verificationStatus?: string;
  isAvailable?: boolean;
  onboardingComplete?: boolean;
}

export interface Fundi {
  id: string;
  name: string;
  role: string;
  skills: string[];
  location?: { lat?: number; lng?: number } | null;
  locationLabel?: string | null;
  address?: string | null;
  district?: string | null;
  country?: string | null;
  experience?: number | null;
  bio?: string | null;
  profilePhoto?: string | null;
  serviceRadius?: number | null;
  availableDays?: string[] | null;
  availableStartTime?: string | null;
  availableEndTime?: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  verificationStatus: string;
  isAvailable: boolean;
  distanceKm?: number;
}

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface Booking {
  id: string;
  clientId: string;
  fundiId?: string | null;
  fundiName?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  location?: { lat?: number; lng?: number } | null;
  status: BookingStatus;
  scheduledFor?: string | null;
  proposedPrice?: number | null;
  proposedBy?: 'FUNDI' | 'CLIENT' | null;
  agreedPrice?: number | null;
  priceAgreed?: boolean | null;
  createdAt?: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  fundiCompleted?: boolean | null;
  fundiCompletedAt?: string | null;
  clientCompleted?: boolean | null;
  clientCompletedAt?: string | null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server');
  }

  // A SPA rewrite (e.g. Vercel's /* -> index.html) swallows /api/* and answers
  // with the app shell. Fail loudly instead of choking on HTML as JSON.
  if ((res.headers.get('content-type') || '').includes('text/html')) {
    throw new ApiError(
      0,
      'API returned a web page instead of JSON — check VITE_API_URL / the /api rewrite',
    );
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      setToken(null);
      setCachedUser(null);
    }
    throw new ApiError(res.status, payload?.message || `Request failed (${res.status})`, payload?.code);
  }
  return payload as T;
}

export function sendOtp(phone: string, purpose: 'register' | 'reset' = 'register') {
  return request<{ success: boolean; code?: string; message?: string }>(
    '/auth/otp/send',
    { method: 'POST', body: { phone, purpose }, auth: false },
  );
}

export function login(input: { email: string; password: string }) {
  return request<{
    success: boolean;
    token: string;
    user: SessionUser;
    passwordWeak?: boolean;
    hasPassword?: boolean;
  }>('/auth/login', {
    method: 'POST',
    body: input,
    auth: false,
  });
}

/** Set or change the signed-in account's password. */
export function changePassword(currentPassword: string | undefined, password: string) {
  return request<{ success: boolean; token: string; user: SessionUser; passwordWeak?: boolean }>(
    '/auth/password',
    { method: 'POST', body: { currentPassword, password } },
  );
}

export function verifyRegister(input: {
  phone: string;
  code: string;
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}) {
  return request<{
    success: boolean;
    token: string;
    user: SessionUser;
    passwordWeak?: boolean;
    hasPassword?: boolean;
  }>(
    '/auth/otp/verify-register',
    { method: 'POST', body: input, auth: false },
  );
}

export function getProfile() {
  return request<{ success: boolean; user: SessionUser; hasPassword?: boolean; passwordWeak?: boolean }>(
    '/users/profile',
  );
}

export function updateProfile(patch: Partial<SessionUser>) {
  return request<{ success: boolean; user?: SessionUser }>('/users/update', {
    method: 'PUT',
    body: patch,
  });
}

export function getClientBookings() {
  return request<{ success: boolean; bookings: Booking[] }>('/bookings/client/bookings');
}

export function getFundiBookings() {
  return request<{ success: boolean; bookings: Booking[] }>('/bookings/fundi/bookings');
}

export interface FundiQuery {
  category?: string;
  area?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}

export function getFundis(query: FundiQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return request<{ success: boolean; fundis: Fundi[] }>(`/fundis${qs ? `?${qs}` : ''}`);
}

export function getFundi(id: string) {
  return request<{ success: boolean; fundi: Fundi }>(`/fundis/${encodeURIComponent(id)}`);
}

export interface CreateBookingInput {
  fundiId?: string | null;
  category?: string;
  description?: string;
  address?: string;
  location?: { lat?: number; lng?: number };
  scheduledFor?: string;
}

export function createBooking(input: CreateBookingInput) {
  return request<{ success: boolean; booking: Booking }>('/bookings/client/create', {
    method: 'POST',
    body: input,
  });
}

export interface Review {
  id?: string;
  rating?: number;
  comment?: string | null;
  clientName?: string | null;
  createdAt?: string;
}

export function getReviews(fundiId: string) {
  return request<{ success: boolean; reviews: Review[] }>(
    `/reviews/${encodeURIComponent(fundiId)}`,
  );
}

export function getFundiBooking(id: string) {
  return request<{ success: boolean; booking: Booking }>(
    `/bookings/fundi/bookings/${encodeURIComponent(id)}`,
  );
}

export function acceptBooking(bookingId: string) {
  return request<{ success: boolean }>('/bookings/fundi/accept', {
    method: 'POST',
    body: { bookingId },
  });
}

export function declineBooking(bookingId: string) {
  return request<{ success: boolean }>('/bookings/fundi/decline', {
    method: 'POST',
    body: { bookingId },
  });
}

export type FundiBookingStatus = 'ON_THE_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

// The client has the last word — a job is not COMPLETED until they confirm it.
export function confirmCompletion(bookingId: string) {
  return request<{ success: boolean; booking: Booking }>('/bookings/client/confirm-completion', {
    method: 'POST',
    body: { bookingId },
  });
}

// Accepting locks the fundi's quote in as the agreed price; declining sends it
// back so the fundi can re-quote. Work cannot start until it is accepted.
export function respondToQuote(bookingId: string, action: 'accept' | 'decline') {
  return request<{ success: boolean; booking: Booking }>('/bookings/client/price-response', {
    method: 'POST',
    body: { bookingId, action },
  });
}

export function updateBookingStatus(bookingId: string, status: FundiBookingStatus) {
  return request<{ success: boolean }>('/bookings/fundi/status', {
    method: 'PUT',
    body: { bookingId, status },
  });
}

export interface Wallet {
  balance?: number;
  heldBalance?: number;
  currency?: string;
  status?: string;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
}

export function getWallet() {
  return request<{ success: boolean; wallet: Wallet }>('/wallet');
}

export function getTransactions() {
  return request<{ success: boolean; transactions: Transaction[] }>('/wallet/transactions');
}

// ── Admin: job requests ──
// A request is a booking the moment it is created — the client picks a fundi
// directly and the fundi quotes after seeing the site.

export interface AdminRequest {
  id: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  category?: string;
  description?: string;
  address?: string;
  images?: string[];
  status?: string;
  scheduledFor?: string | null;
  createdAt?: string;
  fundiId?: string | null;
  fundiName?: string | null;
  agreedPrice?: number | null;
  proposedPrice?: number | null;
  proposedBy?: string | null;
  priceAgreed?: boolean;
}

export function getAdminRequests() {
  return request<{ success: boolean; requests: AdminRequest[] }>('/admin/requests');
}

export function getAdminRequest(id: string) {
  return request<{ success: boolean; booking: AdminRequest }>(
    `/admin/requests/${encodeURIComponent(id)}`,
  );
}

// ── Admin: users, fundis, bookings and platform numbers ──

export type PlatformRole = 'Client' | 'Fundi' | 'Admin';
export type RawRole = 'customer' | 'fundi' | 'admin';

export interface AdminUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  role: PlatformRole;
  rawRole: RawRole;
  phone: string;
  email: string;
  location: string;
  skills: string[];
  createdAt: string | null;
  status: 'Active' | 'Inactive';
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  role: RawRole;
  skills?: string;
  district?: string;
}

export interface AdminFundi {
  id: string;
  name: string;
  trade: string;
  skills: string[];
  location: string;
  rating: number;
  reviews: number;
  status: 'Active' | 'Pending' | 'Suspended';
  phone: string;
  email: string;
  createdAt: string | null;
  experience: number;
  completedJobs: number;
  availability: string;
  about: string;
  verified: boolean;
}

export interface AdminBooking {
  id: string;
  category: string;
  clientId: string;
  client: string;
  fundiId: string;
  fundi: string;
  address: string;
  amount: number;
  status: 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';
  priceAgreed: boolean;
  createdAt: string | null;
}

export interface AdminStats {
  users: {
    total: number;
    clients: number;
    fundis: number;
    admins: number;
    active: number;
    activeFundis: number;
    pendingFundis: number;
  };
  requests: {
    total: number;
    completed: number;
    cancelled: number;
    active: number;
    byService: { label: string; value: number }[];
  };
  bookings: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    completedValue: number;
    trend: { label: string; value: number }[];
  };
  /** Extra aggregates for the reports page (absent on older backends). */
  analytics?: {
    requestsTrend: { label: string; value: number }[];
    revenueTrend: { label: string; value: number }[];
    usersTrend: { label: string; value: number }[];
    stages: { label: string; value: number }[];
    newUsers30d: number;
    avgValue: number;
  };
}

// ── Audit trail ──

export type AuditCategory = 'auth' | 'users' | 'verifications' | 'jobs' | 'bookings' | 'settings';

export interface AdminAuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId: string;
  summary: string;
  ipAddress: string;
  userAgent: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  category?: AuditCategory | '';
  search?: string;
}

export function getAdminAuditLogs(query: AuditLogQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));
  if (query.category) params.set('category', query.category);
  if (query.search?.trim()) params.set('search', query.search.trim());
  const qs = params.toString();
  return request<{ success: boolean; logs: AdminAuditLog[]; total: number; page: number; pageSize: number }>(
    `/admin/audit-logs${qs ? `?${qs}` : ''}`,
  );
}

export interface SettingsToggle {
  key: string;
  on: boolean;
}

export interface PlatformSettingsValues {
  adminName: string;
  adminEmail: string;
  commissionRate: number;
  clientFeeRate: number;
  minJobAmount: number;
  serviceRadius: number;
  autoApprovalFundis: string;
  disputeResolution: string;
  notifications: SettingsToggle[];
  paymentIntegrations: { currency?: string; settlementAccount?: string };
  currency: string;
}

export function getAdminUsers() {
  return request<{ success: boolean; users: AdminUser[] }>('/admin/users');
}

export function createAdminUser(input: CreateUserInput) {
  return request<{ success: boolean; user: AdminUser }>('/admin/users', { method: 'POST', body: input });
}

export function updateAdminUser(id: string, patch: { status: 'active' | 'inactive' }) {
  return request<{ success: boolean; user: AdminUser }>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function deleteAdminUser(id: string) {
  return request<{ success: boolean; id: string }>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getAdminFundis() {
  return request<{ success: boolean; fundis: AdminFundi[] }>('/admin/fundis');
}

export function updateAdminFundi(id: string, patch: { status: 'active' | 'inactive' }) {
  return request<{ success: boolean; fundi: AdminFundi }>(`/admin/fundis/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function getAdminBookings() {
  return request<{ success: boolean; bookings: AdminBooking[] }>('/admin/bookings');
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'unverified';

export interface AdminVerification {
  userId: string;
  name: string;
  phone: string;
  email: string;
  trade: string;
  skills: string[];
  location: string;
  bio: string;
  experience: number;
  docs: string[];
  referees: { name: string; phone: string; relationship?: string }[];
  status: VerificationStatus;
  verified: boolean;
  note: string;
  requestedAt: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}

export function getAdminVerifications(status: VerificationStatus = 'pending') {
  return request<{ success: boolean; verifications: AdminVerification[] }>(
    `/admin/verifications?status=${encodeURIComponent(status)}`,
  );
}

export function reviewAdminVerification(
  userId: string,
  decision: { decision: 'approve' | 'reject'; note?: string },
) {
  return request<{ success: boolean; verification: AdminVerification }>(
    `/admin/verifications/${encodeURIComponent(userId)}`,
    { method: 'POST', body: decision },
  );
}

export function getAdminStats() {
  return request<{ success: boolean; stats: AdminStats }>('/admin/stats');
}

export function getPlatformSettings() {
  return request<PlatformSettingsValues>('/platform-settings');
}

// Numbers arrive as form strings; the API coerces them.
export interface PlatformSettingsPatch {
  adminName?: string;
  adminEmail?: string;
  commissionRate?: string | number;
  clientFeeRate?: string | number;
  minJobAmount?: string | number;
  serviceRadius?: string | number;
  autoApprovalFundis?: string;
  disputeResolution?: string;
  notifications?: SettingsToggle[];
  paymentIntegrations?: { currency?: string; settlementAccount?: string };
}

export function savePlatformSettings(patch: PlatformSettingsPatch) {
  return request<{ success: boolean; settings: PlatformSettingsValues }>('/admin/platform-settings', {
    method: 'PUT',
    body: patch,
  });
}
