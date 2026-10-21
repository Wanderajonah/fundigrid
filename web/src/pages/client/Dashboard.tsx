import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getClientBookings, type Booking } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { bookingAgeDays, bookingAmount, bookingDate, bookingLocation, bookingTitle, isOpen, statusMeta } from '../../lib/booking';
import { categoryIcon } from '../../lib/categories';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  const metrics = useMemo(() => {
    const completed = bookings.filter(b => b.status === 'COMPLETED');
    const inProgress = bookings.filter(b => ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status));
    const active = bookings.filter(isOpen);
    const spent = completed.reduce((sum, b) => {
      const raw = b.agreedPrice ?? b.proposedPrice;
      const value = Number(raw);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
    const thisWeek = bookings.filter(b => bookingAgeDays(b) <= 7).length;
    return [
      { label: 'Active', value: String(active.length), sub: `+${thisWeek} this week` },
      { label: 'In Progress', value: String(inProgress.length), sub: inProgress.length ? 'On track' : 'Nothing running' },
      { label: 'Completed', value: String(completed.length), sub: `${bookings.length} total requests` },
      { label: 'Total Spent', value: spent ? `UGX ${spent.toLocaleString()}` : 'UGX 0', sub: 'Completed jobs' },
    ];
  }, [bookings]);

  const firstName = (user?.name?.trim() || user?.phone || 'there').split(' ')[0];
  const recent = bookings.slice(0, 4);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-end justify-between mb-16">
        <div>
          <p className="text-sm text-gray-400 mb-1">Welcome back</p>
          <h1 className="text-4xl font-bold text-gray-900">Hello, {firstName}</h1>
        </div>
        <Link to="/client/request" className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-black transition-all">
          <Plus size={16} /> New Request
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
          <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
          <Link to="/client/requests" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors">View all</Link>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading your requests…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && recent.length === 0 && (
          <div className="p-10 bg-white rounded-2xl border border-gray-100 text-center">
            <p className="font-semibold text-gray-900">No requests yet</p>
            <p className="text-sm text-gray-400 mt-1">Post your first job and nearby fundis will respond.</p>
            <Link to="/client/request" className="inline-block mt-5 text-sm font-semibold text-primary hover:text-primary-dark">New Request</Link>
          </div>
        )}

        {!loading && !error && recent.length > 0 && (
          <div className="space-y-4">
            {recent.map(job => {
              const s = statusMeta(job.status);
              const amount = bookingAmount(job);
              const CategoryIcon = categoryIcon(job.category);
              return (
                <Link key={job.id} to="/client/requests" className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <CategoryIcon size={20} className="text-gray-500 group-hover:text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-gray-900">{bookingTitle(job)}</p>
                        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${s.cls}`}>{s.label}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{bookingLocation(job)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{amount || '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{bookingDate(job)}</p>
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
