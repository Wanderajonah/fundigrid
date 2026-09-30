import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { getClientBookings, type Booking } from '../../lib/api';
import { bookingAmount, bookingDate, bookingTitle, statusMeta } from '../../lib/booking';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function matches(booking: Booking, filter: FilterKey) {
  if (filter === 'all') return true;
  if (filter === 'open') return !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(booking.status);
  if (filter === 'pending') return booking.status === 'PENDING' || booking.status === 'ACCEPTED';
  if (filter === 'in_progress') return ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status);
  return booking.status === 'COMPLETED';
}

export default function MyRequestsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getClientBookings()
      .then(res => { if (alive) setBookings(res.bookings || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your requests'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => bookings.filter(b => matches(b, filter)), [bookings, filter]);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-16">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">My Requests</h1>
          <p className="text-sm text-gray-400 mt-2">All your service requests</p>
        </div>
        <Link to="/client/request" className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-black transition-all">
          <FileText size={16} /> New Request
        </Link>
      </div>

      <div className="flex gap-2 mb-10">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-5 py-2 text-sm font-medium rounded-full transition-all ${filter === f.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {['Request', 'Status', 'Fundi', 'Amount', 'Date'].map(h => (
                <th key={h} className="text-left px-8 py-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={5} className="px-8 py-10 text-sm text-gray-400">Loading…</td></tr>
            )}
            {error && (
              <tr><td colSpan={5} className="px-8 py-10 text-sm text-red-500">{error}</td></tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center">
                  <p className="font-semibold text-gray-900">Nothing here yet</p>
                  <p className="text-sm text-gray-400 mt-1">Requests you post will show up in this table.</p>
                </td>
              </tr>
            )}
            {!loading && !error && rows.map(job => {
              const s = statusMeta(job.status);
              return (
                <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-semibold text-gray-900">{bookingTitle(job)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{job.id}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-500">{job.fundiName || '—'}</td>
                  <td className="px-8 py-6 font-bold text-gray-900">{bookingAmount(job) || '—'}</td>
                  <td className="px-8 py-6 text-sm text-gray-400">{bookingDate(job)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
