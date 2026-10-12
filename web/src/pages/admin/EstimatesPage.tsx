import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import Tabs from './components/Tabs';
import { useAdminStore } from './context/AdminStore';
import { ESTIMATE_STATUS_META, formatUGX } from './data/meta';
import { jobRef } from '../../lib/jobRef';

const FILTERS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'Ready', label: 'Ready' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Rejected', label: 'Rejected' },
];

const PAGE_SIZE = 6;

export default function EstimatesPage() {
  const { estimates } = useAdminStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return estimates.filter(e => {
      if (filter !== 'all' && e.status !== filter) return false;
      if (!q) return true;
      return [e.id, e.jobId, jobRef(e.jobId), e.service, e.customer, e.surveyor].some(v => v.toLowerCase().includes(q));
    });
  }, [estimates, filter, query]);

  const countOf = (key: string) => (key === 'all' ? estimates.length : estimates.filter(e => e.status === key).length);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1;
  const to = Math.min(current * PAGE_SIZE, filtered.length);

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Estimates" subtitle="Review and approve cost estimates from quantity surveyors" />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Tabs
          tabs={FILTERS.map(f => ({ key: f.key, label: f.label, count: countOf(f.key) }))}
          active={filter}
          onChange={key => { setFilter(key); setPage(1); }}
        />
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search estimates…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-card p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">Job ID</th>
                <th className="font-semibold pb-4 pr-4">Service</th>
                <th className="font-semibold pb-4 pr-4">Customer</th>
                <th className="font-semibold pb-4 pr-4">Surveyor</th>
                <th className="font-semibold pb-4 pr-4">Amount</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {slice.map(e => {
                const meta = ESTIMATE_STATUS_META[e.status];
                return (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pr-4 font-semibold text-slate-900">{jobRef(e.jobId)}</td>
                    <td className="py-4 pr-4 text-slate-700">{e.service}</td>
                    <td className="py-4 pr-4 text-slate-500">{e.customer}</td>
                    <td className="py-4 pr-4 text-slate-500">{e.surveyor}</td>
                    <td className="py-4 pr-4 font-semibold text-slate-900 whitespace-nowrap">{formatUGX(e.amount)}</td>
                    <td className="py-4 pr-4"><StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} /></td>
                    <td className="py-4 text-right">
                      <Link to={`/admin/estimates/${e.id}`} className="text-sm font-semibold text-primary hover:text-primary-dark">View</Link>
                    </td>
                  </tr>
                );
              })}
              {slice.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No estimates match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
          <p className="text-xs text-slate-400">Showing {from}–{to} of {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={current === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-40 transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-slate-600 px-2">{current} / {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={current === pages}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-40 transition-colors"
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
