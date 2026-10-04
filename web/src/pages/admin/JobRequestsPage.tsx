import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarRange, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import { useAdminStore } from './context/AdminStore';
import { JOB_STATUS_META, type JobStatus } from './data/meta';

const STATUSES: JobStatus[] = ['New', 'Under Review', 'Surveyor Assigned', 'Estimate Ready', 'Completed', 'Cancelled'];
const RANGES = [
  { key: 'all', label: 'Any time' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
] as const;

const PAGE_SIZE = 8;

function daysAgo(dateLabel: string) {
  const parsed = new Date(dateLabel);
  if (Number.isNaN(parsed.getTime())) return 0;
  return (Date.now() - parsed.getTime()) / 86_400_000;
}

export default function JobRequestsPage() {
  const { jobs, loading, error, reload } = useAdminStore();
  const [query, setQuery] = useState('');
  const [service, setService] = useState('all');
  const [status, setStatus] = useState('all');
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('all');
  const [page, setPage] = useState(1);

  // Real categories are free text, so the filter builds itself from what came
  // back from the API rather than a fixed list.
  const services = useMemo(() => Array.from(new Set(jobs.map(j => j.service))).sort(), [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(job => {
      if (service !== 'all' && job.service !== service) return false;
      if (status !== 'all' && job.status !== status) return false;
      if (range !== 'all' && daysAgo(job.date) > Number(range)) return false;
      if (!q) return true;
      return [job.id, job.service, job.location, job.customer].some(v => v.toLowerCase().includes(q));
    });
  }, [jobs, query, service, status, range]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const to = Math.min(current * PAGE_SIZE, filtered.length);

  const selectCls =
    'px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Job Requests" subtitle="Review and assign incoming job requests from clients" />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search request, customer…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-gray-300"
          />
        </div>

        <select value={service} onChange={e => { setService(e.target.value); setPage(1); }} className={selectCls}>
          <option value="all">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl">
          <CalendarRange size={15} className="text-gray-400" />
          <select
            value={range}
            onChange={e => { setRange(e.target.value as typeof range); setPage(1); }}
            className="text-sm text-gray-600 bg-transparent focus:outline-none"
          >
            {RANGES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3">
          <p className="text-sm text-rose-600">{error}</p>
          <button onClick={() => reload()} className="text-sm font-semibold text-rose-700 underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-300 border-b border-gray-50">
                <th className="font-semibold pb-4 pr-4">ID</th>
                <th className="font-semibold pb-4 pr-4">Service</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Customer</th>
                <th className="font-semibold pb-4 pr-4">Date</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">Loading requests…</td>
                </tr>
              )}
              {!loading && slice.map(job => {
                const meta = JOB_STATUS_META[job.status];
                return (
                  <tr key={job.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 pr-4 font-semibold text-gray-900">{job.id}</td>
                    <td className="py-4 pr-4 text-gray-700">{job.service}</td>
                    <td className="py-4 pr-4 text-gray-500">{job.location}</td>
                    <td className="py-4 pr-4 text-gray-500">{job.customer}</td>
                    <td className="py-4 pr-4 text-gray-400 whitespace-nowrap">{job.date}</td>
                    <td className="py-4 pr-4"><StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} /></td>
                    <td className="py-4 text-right">
                      <Link to={`/admin/requests/${job.id}`} className="text-sm font-semibold text-primary hover:text-primary-dark">View</Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && slice.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    {jobs.length === 0 ? 'No requests are waiting on a surveyor yet.' : 'No requests match these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-50">
          <p className="text-xs text-gray-400">Showing {from}–{to} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={current === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-gray-600 px-2">{current} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={current === pages}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
