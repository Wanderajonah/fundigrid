import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import Tabs from './components/Tabs';
import AddUserDialog from './components/AddUserDialog';
import { useAdminStore } from './context/AdminStore';
import { initialsOf, type UserRole } from './data/meta';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'Client', label: 'Clients' },
  { key: 'Fundi', label: 'Fundis' },
  { key: 'Surveyor', label: 'Surveyors' },
  { key: 'Admin', label: 'Admins' },
];

const ROLE_CLS: Record<UserRole, string> = {
  Client: 'bg-sky-50 text-sky-600',
  Fundi: 'bg-violet-50 text-violet-600',
  Surveyor: 'bg-amber-50 text-amber-600',
  Admin: 'bg-slate-100 text-slate-600',
};

export default function UsersPage() {
  const { users, loading, error, createUser, setUserStatus, deleteUser } = useAdminStore();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (tab !== 'all' && u.role !== tab) return false;
      if (!q) return true;
      return [u.name, u.phone, u.role, u.location].some(v => v.toLowerCase().includes(q));
    });
  }, [users, tab, query]);

  const countOf = (key: string) => (key === 'all' ? users.length : users.filter(u => u.role === key).length);

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Users" subtitle="Manage clients, fundis and surveyors on the platform">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all"
        >
          <Plus size={16} /> Add User
        </button>
      </PageHeader>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Tabs
          tabs={TABS.map(t => ({ ...t, count: countOf(t.key) }))}
          active={tab}
          onChange={setTab}
        />
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">Name</th>
                <th className="font-semibold pb-4 pr-4">Role</th>
                <th className="font-semibold pb-4 pr-4">Phone</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Joined</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                        {initialsOf(u.name)}
                      </span>
                      <span className="font-semibold text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4"><StatusBadge label={u.role} cls={ROLE_CLS[u.role]} /></td>
                  <td className="py-4 pr-4 text-slate-500 whitespace-nowrap">{u.phone}</td>
                  <td className="py-4 pr-4 text-slate-500">{u.location}</td>
                  <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{u.joined}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge
                      label={u.status}
                      cls={u.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}
                    />
                  </td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => void setUserStatus(u.id, u.status === 'Active' ? 'Inactive' : 'Active')}
                      className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                    >
                      {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete ${u.name}? Accounts with job history can only be deactivated.`)) {
                          void deleteUser(u.id);
                        }
                      }}
                      className="ml-4 text-sm font-semibold text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No users match your search.</td>
                </tr>
              )}
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading users…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserDialog open={adding} role="customer" onClose={() => setAdding(false)} onCreate={createUser} />
    </div>
  );
}
