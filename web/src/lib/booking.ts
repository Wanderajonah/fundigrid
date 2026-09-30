import type { Booking, BookingStatus } from './api';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-600' },
  ACCEPTED: { label: 'Accepted', cls: 'bg-blue-50 text-blue-600' },
  ON_THE_WAY: { label: 'On the way', cls: 'bg-blue-50 text-blue-600' },
  ARRIVED: { label: 'Arrived', cls: 'bg-blue-50 text-blue-600' },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-50 text-blue-600' },
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
  DISPUTED: { label: 'Disputed', cls: 'bg-red-50 text-red-600' },
};

const FALLBACK = { label: 'Pending', cls: 'bg-amber-50 text-amber-600' };

export function statusMeta(status?: BookingStatus | string | null) {
  return (status && STATUS_META[status]) || FALLBACK;
}

export function isOpen(booking: Booking) {
  return !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(booking.status);
}

export function bookingTitle(booking: Booking) {
  const category = booking.category?.trim();
  if (category) return category;
  const description = booking.description?.trim();
  if (description) return description.length > 48 ? `${description.slice(0, 48)}…` : description;
  return 'Job request';
}

export function bookingAmount(booking: Booking) {
  const value = booking.agreedPrice ?? booking.priceAgreed ?? booking.proposedPrice;
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return `UGX ${numeric.toLocaleString()}`;
}

export function bookingDate(booking: Booking) {
  const raw = booking.scheduledFor || booking.created_at;
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function bookingLocation(booking: Booking) {
  const parts = [booking.address, booking.category].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Location not shared';
}

export function bookingAgeDays(booking: Booking) {
  if (!booking.created_at) return Number.POSITIVE_INFINITY;
  const created = new Date(booking.created_at).getTime();
  if (Number.isNaN(created)) return Number.POSITIVE_INFINITY;
  return (Date.now() - created) / 86_400_000;
}
