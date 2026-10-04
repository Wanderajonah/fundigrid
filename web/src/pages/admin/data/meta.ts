// Shared vocabulary for the admin dashboard: row shapes, status labels and
// the small formatting helpers every page repeats. Labels live here; the data
// they describe is fetched from the API in context/AdminStore.

export type JobStatus =
  | 'New'
  | 'Under Review'
  | 'Surveyor Assigned'
  | 'Estimate Ready'
  | 'Completed'
  | 'Cancelled';

export type EstimateStatus = 'Ready' | 'Pending' | 'Approved' | 'Rejected';
export type FundiStatus = 'Active' | 'Pending' | 'Suspended';
export type UserRole = 'Client' | 'Fundi' | 'Surveyor' | 'Admin';
export type BookingStatus = 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';

export interface JobRequest {
  id: string;
  service: string;
  location: string;
  customer: string;
  customerPhone: string;
  date: string;
  status: JobStatus;
  description: string;
  address: string;
  scheduledFor: string;
  photos: number;
  surveyorId?: string;
  surveyorName?: string;
  estimateId?: string;
}

export interface CostLine {
  label: string;
  amount: number;
}

export interface Estimate {
  id: string;
  jobId: string;
  service: string;
  customer: string;
  surveyor: string;
  surveyorId: string;
  amount: number;
  status: EstimateStatus;
  submittedOn: string;
  breakdown: CostLine[];
  notes: string[];
}

export interface Fundi {
  id: string;
  name: string;
  trade: string;
  location: string;
  rating: number;
  reviews: number;
  status: FundiStatus;
  phone: string;
  joined: string;
  experience: number;
  completedJobs: number;
  availability: string;
  about: string;
  skills: string[];
  verified: boolean;
}

export interface Surveyor {
  id: string;
  name: string;
  specialty: string;
  location: string;
  rating: number;
  jobs: number;
  available: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  location: string;
  joined: string;
  status: 'Active' | 'Inactive';
}

export interface BookingRecord {
  id: string;
  service: string;
  client: string;
  fundi: string;
  location: string;
  date: string;
  amount: number;
  status: BookingStatus;
}

export const JOB_STATUS_META: Record<JobStatus, { label: string; cls: string; dot: string }> = {
  New: { label: 'New', cls: 'bg-sky-50 text-sky-600', dot: '#0EA5E9' },
  'Under Review': { label: 'Under Review', cls: 'bg-amber-50 text-amber-600', dot: '#F59E0B' },
  'Surveyor Assigned': { label: 'Surveyor Assigned', cls: 'bg-violet-50 text-violet-600', dot: '#8B5CF6' },
  'Estimate Ready': { label: 'Estimate Ready', cls: 'bg-orange-50 text-orange-600', dot: '#F97316' },
  Completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600', dot: '#10B981' },
  Cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-500', dot: '#F43F5E' },
};

export const ESTIMATE_STATUS_META: Record<EstimateStatus, { label: string; cls: string; dot: string }> = {
  Ready: { label: 'Ready', cls: 'bg-emerald-50 text-emerald-600', dot: '#10B981' },
  Pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-600', dot: '#F59E0B' },
  Approved: { label: 'Approved', cls: 'bg-sky-50 text-sky-600', dot: '#0EA5E9' },
  Rejected: { label: 'Rejected', cls: 'bg-rose-50 text-rose-500', dot: '#F43F5E' },
};

export const FUNDI_STATUS_META: Record<FundiStatus, { label: string; cls: string }> = {
  Active: { label: 'Active', cls: 'bg-emerald-50 text-emerald-600' },
  Pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-600' },
  Suspended: { label: 'Suspended', cls: 'bg-rose-50 text-rose-500' },
};

export const SURVEYOR_STATUS_META: Record<'Available' | 'Unavailable', { label: string; cls: string }> = {
  Available: { label: 'Available', cls: 'bg-emerald-50 text-emerald-600' },
  Unavailable: { label: 'Unavailable', cls: 'bg-gray-100 text-gray-400' },
};

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; cls: string; dot: string }> = {
  Pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-600', dot: '#F59E0B' },
  Accepted: { label: 'Accepted', cls: 'bg-sky-50 text-sky-600', dot: '#0EA5E9' },
  'In Progress': { label: 'In Progress', cls: 'bg-violet-50 text-violet-600', dot: '#8B5CF6' },
  Completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-600', dot: '#10B981' },
  Cancelled: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-500', dot: '#F43F5E' },
};

export function formatUGX(amount: number) {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

export function initialsOf(name: string) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
