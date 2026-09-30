import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { getFundiBookings, type Booking } from '../../lib/api';
import { bookingAmount, bookingDate, bookingTitle, statusMeta } from '../../lib/booking';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'active', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

function matches(b: Booking, filter: FilterKey) {
  if (filter === 'all') return true;
  if (filter === 'new') return b.status === 'PENDING';
  if (filter === 'accepted') return b.status === 'ACCEPTED';
  if (filter === 'active') return ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status);
  return b.status === 'COMPLETED';
}

export default function FundiJobsPage() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getFundiBookings()
      .then(res => { if (alive) setBookings(res.bookings || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load your requests'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const list = bookings.filter(b => matches(b, filter));

  return (
    <div className="max-w-[1100px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">My Requests</h1>
      <p className="text-sm text-gray-400 mb-12">Jobs clients have booked you for</p>

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

      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {!loading && !error && list.length === 0 && (
        <div className="p-10 bg-white rounded-2xl border border-gray-100 text-center">
          <p className="font-semibold text-gray-900">Nothing here</p>
          <p className="text-sm text-gray-400 mt-1">Requests booked by clients will appear in this list.</p>
        </div>
      )}

      <div className="space-y-4">
        {!loading && !error && list.map(b => {
          const s = statusMeta(b.status);
          return (
            <Link key={b.id} to={`/fundi/job/${b.id}`} className="flex items-center justify-between p-7 bg-white rounded-2xl border border-gray-100 hover:shadow-lg transition-all group">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <MapPin size={18} className="text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{bookingTitle(b)}</h3>
                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 max-w-md">{b.description || 'No description provided'}</p>
                  <p className="text-xs text-gray-300 mt-2">{b.address || 'Location not shared'} · {bookingDate(b)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-gray-900">{bookingAmount(b) || 'Price TBD'}</p>
                <span className="text-xs font-semibold text-primary inline-flex items-center gap-1 mt-2 group-hover:translate-x-1 transition-transform">View <ArrowRight size={12} /></span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
