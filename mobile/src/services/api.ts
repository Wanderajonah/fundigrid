import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.42.187:5000/api'
).replace(/\/+$/, '');

type RequestOptions = {
  method?: string;
  body?: any;
  token?: string;
};

async function request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      `Cannot reach server at ${API_BASE}. ` +
        'Make sure the backend is running and EXPO_PUBLIC_API_URL in mobile/.env.local matches this machine\'s IP.'
    );
  }

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }
    return data as T;
  }

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data;
}

// ── Auth ──

export async function sendOtp(phone: string, purpose: 'register' | 'login' = 'register') {
  return request('/auth/otp/send', { method: 'POST', body: { phone, purpose } });
}

export async function verifyOtpRegister(phone: string, code: string, name: string, role: string) {
  const data = await request('/auth/otp/verify-register', {
    method: 'POST',
    body: { phone, code, name, role },
  });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function verifyOtpLogin(phone: string, code: string) {
  const data = await request('/auth/otp/verify-login', {
    method: 'POST',
    body: { phone, code },
  });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data;
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

// ── Jobs ──

export async function getJobsByUser(token: string, userId: string) {
  return request(`/jobs/${userId}`, { token });
}

export async function getJobById(token: string, jobId: string) {
  return request(`/jobs/detail/${jobId}`, { token });
}

export async function createJob(token: string, data: any) {
  return request('/jobs', { method: 'POST', body: data, token });
}

export async function respondQuote(token: string, jobId: string, amount: number) {
  return request(`/jobs/detail/${jobId}/quote`, { method: 'PATCH', body: { amount }, token });
}

export async function updateJobStatus(token: string, jobId: string, status: string) {
  return request(`/jobs/detail/${jobId}/status`, { method: 'PATCH', body: { status }, token });
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

// ── Estimates ──

export async function getJobEstimate(token: string, category: string) {
  return request(`/bookings/estimate?category=${encodeURIComponent(category)}`, { token });
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
