import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Star } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import AddUserDialog from './components/AddUserDialog';
import { useAdminStore } from './context/AdminStore';
import { FUNDI_STATUS_META, initialsOf } from './data/meta';

export default function FundisPage() {
  const { fundis, loading, error, setFundiStatus, createUser } = useAdminStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Active' | 'Pending' | 'Suspended'>('all');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fundis.filter(f => {
      if (filter !== 'all' && f.status !== filter) return false;
      if (!q) return true;
      return [f.name, f.trade, f.location].some(v => v.toLowerCase().includes(q));
    });
  }, [fundis, query, filter]);

  const counts = {
    total: fundis.length,
    active: fundis.filter(f => f.status === 'Active').length,
    pending: fundis.filter(f => f.status === 'Pending').length,
  };

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Fundis" subtitle="Manage the tradespeople operating on the platform">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
        >
          <Plus size={16} /> Add Fundi
        </button>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCard label="Total Fundis" value={counts.total} sub="All trades" tone="gray" icon={<Plus size={17} />} />
        <StatCard label="Active" value={counts.active} sub="Currently working" tone="emerald" icon={<Star size={17} />} />
        <StatCard label="Pending Review" value={counts.pending} sub="Awaiting approval" tone="amber" icon={<Search size={17} />} />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search fundis…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-gray-300"
          />
        </div>
        {(['all', 'Active', 'Pending', 'Suspended'] as const).map(key => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {key === 'all' ? 'All' : key}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-300 border-b border-gray-50">
                <th className="font-semibold pb-4 pr-4">Name</th>
                <th className="font-semibold pb-4 pr-4">Trade</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Rating</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => {
                const meta = FUNDI_STATUS_META[f.status];
                return (
                  <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                          {initialsOf(f.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{f.name}</p>
                          <p className="text-[11px] text-gray-300">{f.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-gray-700">{f.trade}</td>
                    <td className="py-4 pr-4 text-gray-500">{f.location}</td>
                    <td className="py-4 pr-4 text-gray-700 whitespace-nowrap">
                      {f.rating > 0 ? (
                        <>★ {f.rating.toFixed(1)} <span className="text-gray-300">({f.reviews})</span></>
                      ) : (
                        <span className="text-gray-300">No reviews yet</span>
                      )}
                    </td>
                    <td className="py-4 pr-4"><StatusBadge label={meta.label} cls={meta.cls} /></td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <Link to={`/admin/fundis/${f.id}`} className="text-sm font-semibold text-primary hover:text-primary-dark mr-4">View</Link>
                      <button
                        onClick={() => void setFundiStatus(f.id, f.status === 'Suspended' ? 'Active' : 'Suspended').catch(() => undefined)}
                        className="text-sm font-semibold text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        {f.status === 'Suspended' ? 'Restore' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">No fundis match your search.</td>
                </tr>
              )}
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">Loading fundis…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserDialog
        open={adding}
        role="fundi"
        lockRole
        onClose={() => setAdding(false)}
        onCreate={createUser}
      />
    </div>
  );
}
