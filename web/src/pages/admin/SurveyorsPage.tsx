import { useMemo, useState } from 'react';
import { Plus, Search, UserCheck } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import AddUserDialog from './components/AddUserDialog';
import { useAdminStore } from './context/AdminStore';
import { SURVEYOR_STATUS_META, initialsOf } from './data/meta';

export default function SurveyorsPage() {
  const { surveyors, jobs, loading, error, createUser } = useAdminStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Available' | 'Unavailable'>('all');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return surveyors.filter(s => {
      const state = s.available ? 'Available' : 'Unavailable';
      if (filter !== 'all' && state !== filter) return false;
      if (!q) return true;
      return [s.name, s.specialty, s.location].some(v => v.toLowerCase().includes(q));
    });
  }, [surveyors, query, filter]);

  const available = surveyors.filter(s => s.available).length;

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Surveyors" subtitle="Quantity surveyors handling site visits and cost estimates">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
        >
          <Plus size={16} /> Add Surveyor
        </button>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCard label="Total Surveyors" value={surveyors.length} sub="On the platform" tone="gray" icon={<UserCheck size={17} />} />
        <StatCard label="Available" value={available} sub="Ready for assignment" tone="emerald" icon={<UserCheck size={17} />} />
        <StatCard label="Open Requests" value={jobs.filter(j => j.status === 'New').length} sub="Awaiting a surveyor" tone="sky" icon={<Search size={17} />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search surveyors…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
        {(['all', 'Available', 'Unavailable'] as const).map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              filter === key ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {key === 'all' ? 'All' : key}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-card p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[660px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">Name</th>
                <th className="font-semibold pb-4 pr-4">Specialty</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Rating</th>
                <th className="font-semibold pb-4 pr-4">Requests</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => {
                const meta = SURVEYOR_STATUS_META[s.available ? 'Available' : 'Unavailable'];
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {initialsOf(s.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{s.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-slate-700">{s.specialty}</td>
                    <td className="py-4 pr-4 text-slate-500">{s.location}</td>
                    <td className="py-4 pr-4 text-slate-700 whitespace-nowrap">
                      {s.rating > 0 ? <>★ {s.rating}</> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-4 pr-4 text-slate-700">{s.jobs}</td>
                    <td className="py-4 pr-4"><StatusBadge label={meta.label} cls={meta.cls} /></td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No surveyors match your search.</td>
                </tr>
              )}
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading surveyors…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserDialog
        open={adding}
        role="surveyor"
        lockRole
        onClose={() => setAdding(false)}
        onCreate={createUser}
      />
    </div>
  );
}
