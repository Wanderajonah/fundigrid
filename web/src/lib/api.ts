// Single HTTP client for the FundiGrid backend.
// `/api` is proxied to localhost:5000 by vite.config.ts; override with VITE_API_URL
// when the API is served from another origin.

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

const TOKEN_KEY = 'fundigrid.token';
const USER_KEY = 'fundigrid.user';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getCachedUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setCachedUser(user: SessionUser | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export type Role = 'customer' | 'fundi';

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
  agreedPrice?: number | null;
  priceAgreed?: number | null;
  created_at?: string;
  acceptedAt?: string | null;
  onTheWayAt?: string | null;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
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
    throw new ApiError(res.status, payload?.message || `Request failed (${res.status})`);
  }
  return payload as T;
}

export function sendOtp(phone: string, purpose: 'login' | 'register' = 'login') {
  return request<{ success: boolean; code?: string; message?: string }>(
    '/auth/otp/send',
    { method: 'POST', body: { phone, purpose }, auth: false },
  );
}

export function verifyLogin(input: { phone: string; code: string }) {
  return request<{ success: boolean; token: string; user: SessionUser }>(
    '/auth/otp/verify-login',
    { method: 'POST', body: input, auth: false },
  );
}

export function verifyRegister(input: {
  phone: string;
  code: string;
  name?: string;
  email?: string;
  role?: Role;
}) {
  return request<{ success: boolean; token: string; user: SessionUser }>(
    '/auth/otp/verify-register',
    { method: 'POST', body: input, auth: false },
  );
}

export function getProfile() {
  return request<{ success: boolean; user: SessionUser }>('/users/profile');
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
  created_at?: string;
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
  created_at?: string;
}

export function getWallet() {
  return request<{ success: boolean; wallet: Wallet }>('/wallet');
}

export function getTransactions() {
  return request<{ success: boolean; transactions: Transaction[] }>('/wallet/transactions');
}
