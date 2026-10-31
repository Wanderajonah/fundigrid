import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiBase, apiCandidates, promoteApiBase } from './config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  token?: string;
};

// React Native's fetch has no timeout of its own, so an instance that never
// answers (asleep Render free tier, dead Wi-Fi) would hang the screen forever.
const WAKE_TIMEOUT_MS = 45_000;
const REQUEST_TIMEOUT_MS = 20_000;

// Registered by AuthProvider. Fired once when an authenticated request is
// rejected, so a stale/expired token drops the user back to sign-in instead
// of leaving every action showing a bare "Not authorized" alert.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = body ? JSON.stringify(body) : undefined;
  const bases = [apiBase(), ...apiCandidates()].filter(
    (base, i, arr) => arr.indexOf(base) === i
  );

  let lastFailure = '';

  for (const base of bases) {
    // A free-tier Render instance sleeps after ~15 min of idle and takes up to
    // a minute to wake, so the first request after idle routinely times out.
    // Give it a long leash once, then a shorter one on the retry.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) await delay(2000);

      let res: Response;
      try {
        res = await fetchWithTimeout(`${base}${path}`, {
          method,
          headers,
          body: payload,
        }, attempt === 0 ? WAKE_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
      } catch (err) {
        // Only network-level failures land here; real API errors throw below.
        lastFailure = err instanceof Error ? err.message : String(err);
        continue;
      }

      promoteApiBase(base);

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) {
          throw apiError(`Request failed with status ${res.status}`, { status: res.status });
        }
        return data as T;
      }

      if (!res.ok) {
        // Only authenticated requests count as a lost session — a 401 from
        // the login screen is just a wrong password.
        if (res.status === 401 && token) {
          await AsyncStorage.multiRemove(['token', 'user']).catch(() => {});
          unauthorizedHandler?.();
        }
        throw apiError(data.message || data.error || 'Request failed', {
          code: data.code,
          status: res.status,
          attemptsRemaining: data.attemptsRemaining,
          retryAfterSeconds: data.retryAfterSeconds,
        });
      }

      return data;
    }
  }

  throw apiError(
    `Cannot reach server${lastFailure ? ` (${lastFailure})` : ''}. Tried ${bases.join(', ')}. ` +
      'The service may be waking up after idle — wait a minute and try again.',
    { code: 'NETWORK' }
  );
}

// Errors carry the server's machine-readable `code` plus lockout extras so
// screens can tell "wrong password, 3 tries left" from "locked for 10 minutes".
export type ApiError = Error & {
  code?: string;
  status?: number;
  attemptsRemaining?: number;
  retryAfterSeconds?: number;
};

function apiError(
  message: string,
  extra: Partial<Pick<ApiError, 'code' | 'status' | 'attemptsRemaining' | 'retryAfterSeconds'>> = {}
): ApiError {
  const err = new Error(message) as ApiError;
  Object.assign(err, extra);
  return err;
}

// ── Auth ──

export type Session = {
  token: string;
  user: any;
  passwordWeak?: boolean;
  hasPassword?: boolean;
  /** Sign-up only: true when the number was already registered. */
  accountExisted?: boolean;
};

async function saveSession(data: Session) {
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function sendOtp(phone: string, purpose: 'register' | 'reset' = 'register') {
  return request('/auth/otp/send', { method: 'POST', body: { phone, purpose } });
}

// Phone sign-up: proves the number and creates the account in one call.
// Everything else the account needs (name, password, role) rides along.
export type RegisterInput = {
  phone: string;
  code: string;
  role: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  email?: string;
};

export async function verifyOtpRegister(input: RegisterInput) {
  const data = await request('/auth/otp/verify-register', {
    method: 'POST',
    body: {
      phone: input.phone,
      code: input.code,
      role: input.role,
      firstName: input.firstName,
      lastName: input.lastName,
      password: input.password,
      email: input.email,
    },
  });
  return saveSession(data);
}

// Password sign-in. On `PASSWORD_NOT_SET` the screen sends a `reset` OTP
// instead; on `LOCKED` / `PASSWORD_BLOCKED` it points at Forgot Password.
export async function loginWithPassword(input: { phone?: string; email?: string; password: string }) {
  const data = await request('/auth/login', { method: 'POST', body: input });
  return saveSession(data);
}

export async function forgotPassword(phone: string) {
  return request('/auth/password/forgot', { method: 'POST', body: { phone } });
}

export async function resetPassword(phone: string, code: string, password: string) {
  const data = await request('/auth/password/reset', {
    method: 'POST',
    body: { phone, code, password },
  });
  return saveSession(data);
}

// Set or change the password of the signed-in account. `currentPassword` is
// only required when one already exists.
export async function setPassword(
  token: string,
  password: string,
  currentPassword?: string
) {
  const data = await request('/auth/password', {
    method: 'POST',
    body: { password, currentPassword },
    token,
  });
  return saveSession(data);
}

export async function getToken() {
  return AsyncStorage.getItem('token');
}

export async function getUser() {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export async function cacheUser(user: any) {
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

export async function logout() {
  await AsyncStorage.multiRemove(['token', 'user']);
}

// ── Profile ──

export async function getProfile(token: string) {
  return request('/users/profile', { token });
}

export async function updateProfile(token: string, data: Record<string, any>) {
  const res = await request('/users/update', { method: 'PUT', body: data, token });
  if (res?.user) {
    await AsyncStorage.setItem('user', JSON.stringify(res.user));
  }
  return res;
}

export async function updateLocation(token: string, data: { lat: number; lng: number; address: string }) {
  return request('/users/location', { method: 'PUT', body: data, token });
}

// ── Bookings ──

export async function getFundiBookings(token: string) {
  return request('/bookings/fundi/bookings', { token });
}

export async function getFundiBookingById(token: string, bookingId: string) {
  return request(`/bookings/fundi/bookings/${bookingId}`, { token });
}

export async function acceptBooking(token: string, bookingId: string) {
  return request('/bookings/fundi/accept', { method: 'POST', body: { bookingId }, token });
}

export async function declineBooking(token: string, bookingId: string) {
  return request('/bookings/fundi/decline', { method: 'POST', body: { bookingId }, token });
}

export async function updateBookingStatus(token: string, bookingId: string, status: string) {
  return request('/bookings/fundi/status', { method: 'PUT', body: { bookingId, status }, token });
}

export async function getClientBookings(token: string) {
  return request('/bookings/client/bookings', { token });
}

export async function createBooking(token: string, data: any) {
  return request('/bookings/client/create', { method: 'POST', body: data, token });
}

// The client has the last word — a job is not COMPLETED until they confirm it.
export async function confirmCompletion(token: string, bookingId: string) {
  return request('/bookings/client/confirm-completion', { method: 'POST', body: { bookingId }, token });
}

// What has happened to a request so far, plus the client-facing timeline.
export async function getRequestProgress(token: string, bookingId: string) {
  return request(`/bookings/progress/${bookingId}`, { token });
}

// Attach a fundi to an already-submitted request. Requests reach fundis the
// moment they are created, so this is just the client making their choice.
export async function selectFundi(token: string, bookingId: string, fundiId: string, patch?: any) {
  return request('/bookings/client/select-fundi', {
    method: 'POST',
    body: { bookingId, fundiId, ...(patch || {}) },
    token,
  });
}

// The fundi prices the job after seeing the site. The client has to accept
// before work may start — see respondToQuote.
export async function sendQuote(token: string, bookingId: string, amount: number) {
  return request('/bookings/fundi/quote', {
    method: 'POST',
    body: { bookingId, amount },
    token,
  });
}

// Accepting locks the quote in as the agreed price; declining sends it back so
// the fundi can price the job again.
export async function respondToQuote(token: string, bookingId: string, action: 'accept' | 'decline') {
  return request('/bookings/client/price-response', {
    method: 'POST',
    body: { bookingId, action },
    token,
  });
}

// ── Payments ──

export async function payForBooking(
  token: string,
  data: { bookingId: string; method: string; phone?: string; amount?: number }
) {
  return request('/payments/pay', { method: 'POST', body: data, token });
}

export async function getPaymentReceipt(token: string, bookingId: string) {
  return request(`/payments/${bookingId}`, { token });
}

// ── Maps ──

// `URLSearchParams` stringifies undefined as "undefined", which would send
// `category=undefined` to the server and match nothing. Drop empty values.
function queryString(params: Record<string, any>) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getNearbyFundis(params: {
  lat: number;
  lng: number;
  category?: string;
  area?: string;
  radius?: number;
}) {
  const token = await getToken();
  return request(`/maps/nearby-fundis${queryString(params)}`, { token: token ?? undefined });
}

export async function getRoutePreview(params: { origin: string; destination: string }) {
  const token = await getToken();
  return request(`/maps/route${queryString(params)}`, { token: token ?? undefined });
}

// ── Reviews ──

export async function getReviewsByFundi(fundiId: string, token?: string | null) {
  return request(`/reviews/${fundiId}`, { token: token ?? undefined });
}

export async function createReview(
  token: string,
  input: { bookingId?: string; fundiId?: string; rating: number; comment?: string; service?: string },
) {
  return request('/reviews', { method: 'POST', body: input, token });
}

// ── Fundis ──

export async function getFundis(params?: {
  category?: string;
  area?: string;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  const token = await getToken();
  return request(`/fundis${params ? queryString(params) : ''}`, { token: token ?? undefined });
}

export async function getFundiById(id: string) {
  const token = await getToken();
  return request(`/fundis/${id}`, { token: token ?? undefined });
}

// ── Notifications ──

export async function getNotifications(token: string) {
  return request('/users/notifications', { token });
}

export async function getUnreadCount(token: string) {
  return request('/users/notifications/unread-count', { token });
}

// ── Wallet ──

export async function getWallet(token: string) {
  return request('/wallet', { token });
}

export async function getTransactions(token: string) {
  return request('/wallet/transactions', { token });
}
