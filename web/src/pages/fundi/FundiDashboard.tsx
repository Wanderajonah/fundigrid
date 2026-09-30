import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin } from 'lucide-react';
import { getFundiBookings, type Booking } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { bookingAmount, bookingDate, bookingTitle, statusMeta } from '../../lib/booking';

const OPEN = ['PENDING'];
const ACTIVE = ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

export default function FundiDashboard() {
  const { user } = useAuth();
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

  const metrics = useMemo(() => {
    const open = bookings.filter(b => OPEN.includes(b.status));
    const active = bookings.filter(b => ACTIVE.includes(b.status));
    const completed = bookings.filter(b => b.status === 'COMPLETED');
    return [
      { label: 'New requests', value: String(open.length), sub: open.length ? 'Waiting on you' : 'Nothing waiting' },
      { label: 'Active', value: String(active.length), sub: active.length ? 'In progress' : 'None running' },
      { label: 'Completed', value: String(completed.length), sub: `${bookings.length} total` },
      { label: 'Rating', value: Number(user?.rating ?? 0).toFixed(1), sub: `${user?.reviewCount ?? 0} reviews` },
    ];
  }, [bookings, user]);

  const firstName = (user?.name?.trim() || user?.phone || 'there').split(' ')[0];
  const incoming = bookings.filter(b => OPEN.includes(b.status)).slice(0, 4);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-16">
        <div>
          <p className="text-sm text-gray-400 mb-1">Welcome back</p>
          <h1 className="text-4xl font-bold text-gray-900">Hello, {firstName}</h1>
        </div>
        <Link to="/fundi/jobs" className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-black transition-all">
          <Briefcase size={16} /> My Requests
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-20">
        {metrics.map(m => (
          <div key={m.label} className="py-6">
            <div className="text-3xl font-bold text-gray-900">{m.value}</div>
            <div className="text-sm text-gray-400 mt-1">{m.label}</div>
            <div className="text-xs text-gray-300 mt-1">{m.sub}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold text-gray-900">New requests</h2>
          <Link to="/fundi/jobs" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors">View all</Link>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && incoming.length === 0 && (
          <div className="p-10 bg-white rounded-2xl border border-gray-100 text-center">
            <p className="font-semibold text-gray-900">No new requests</p>
            <p className="text-sm text-gray-400 mt-1">Clients who book you will show up here.</p>
          </div>
        )}

        {!loading && !error && incoming.length > 0 && (
          <div className="space-y-4">
            {incoming.map(b => {
              const s = statusMeta(b.status);
              return (
                <Link key={b.id} to={`/fundi/job/${b.id}`} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <MapPin size={18} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">{bookingTitle(b)}</p>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{b.address || 'Location not shared'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{bookingAmount(b) || 'Price TBD'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{bookingDate(b)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
