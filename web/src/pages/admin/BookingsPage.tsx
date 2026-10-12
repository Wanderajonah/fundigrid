import { useMemo, useState } from 'react';
import { Activity, CalendarCheck, Search, Wallet } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import { useAdminStore } from './context/AdminStore';
import { BOOKING_STATUS_META, formatUGX } from './data/meta';

const FILTERS = ['all', 'Pending', 'Accepted', 'In Progress', 'Completed', 'Cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export default function BookingsPage() {
  const { bookings, loading, error } = useAdminStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter(b => {
      if (filter !== 'all' && b.status !== filter) return false;
      if (!q) return true;
      return [b.id, b.service, b.client, b.fundi, b.location].some(v => v.toLowerCase().includes(q));
    });
  }, [bookings, query, filter]);

  const countOf = (key: Filter) => (key === 'all' ? bookings.length : bookings.filter(b => b.status === key).length);
  const active = bookings.filter(b => b.status === 'In Progress' || b.status === 'Accepted').length;
  const revenue = bookings.filter(b => b.status === 'Completed').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Bookings" subtitle="Confirmed jobs between clients and fundis across the platform" />

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCard label="Total Bookings" value={bookings.length} sub="All time" tone="gray" icon={<CalendarCheck size={17} />} />
        <StatCard label="Active Now" value={active} sub="Accepted or in progress" tone="violet" icon={<Activity size={17} />} />
        <StatCard label="Completed Value" value={formatUGX(revenue)} sub="Paid out to fundis" tone="emerald" icon={<Wallet size={17} />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search bookings…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
        {FILTERS.map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              filter === key ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {key === 'all' ? 'All' : key}
            <span className="ml-1.5 text-xs opacity-60">{countOf(key)}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-card p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">ID</th>
                <th className="font-semibold pb-4 pr-4">Service</th>
                <th className="font-semibold pb-4 pr-4">Client</th>
                <th className="font-semibold pb-4 pr-4">Fundi</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Date</th>
                <th className="font-semibold pb-4 pr-4">Amount</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(b => {
                const meta = BOOKING_STATUS_META[b.status];
                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pr-4 font-semibold text-slate-900 whitespace-nowrap">{b.id}</td>
                    <td className="py-4 pr-4 text-slate-700">{b.service}</td>
                    <td className="py-4 pr-4 text-slate-500">{b.client}</td>
                    <td className="py-4 pr-4 text-slate-700">{b.fundi}</td>
                    <td className="py-4 pr-4 text-slate-500">{b.location}</td>
                    <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{b.date}</td>
                    <td className="py-4 pr-4 text-slate-900 font-semibold whitespace-nowrap">{formatUGX(b.amount)}</td>
                    <td className="py-4 pr-4"><StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} /></td>
                    <td className="py-4 text-right">
                      <button className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors">View</button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">No bookings match your search.</td>
                </tr>
              )}
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">Loading bookings…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
