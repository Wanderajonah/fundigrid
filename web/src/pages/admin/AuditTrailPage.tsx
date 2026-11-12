import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, Search } from 'lucide-react';
import PageHeader from './components/PageHeader';
import { getAdminAuditLogs, type AdminAuditLog, type AuditCategory } from '../../lib/api';
import { initialsOf } from './data/meta';

// Human wording for every code the backend records; unknown codes fall back
// to the last segment of the dotted action.
const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.login_blocked': 'Sign-in blocked',
  'auth.register': 'Registered account',
  'auth.password_reset': 'Password reset',
  'auth.password_reset_requested': 'Reset code requested',
  'auth.password_change': 'Password changed',
  'user.created': 'User created',
  'user.activated': 'User activated',
  'user.deactivated': 'User deactivated',
  'user.deleted': 'User deleted',
  'fundi.activated': 'Fundi reactivated',
  'fundi.suspended': 'Fundi suspended',
  'verification.approved': 'Verification approved',
  'verification.rejected': 'Verification rejected',
  'job.created': 'Job request created',
  'job.quoted': 'Quote submitted',
  'job.status_changed': 'Job status changed',
  'booking.created': 'Booking created',
  'booking.quoted': 'Quote sent by the fundi',
  'booking.price_agreed': 'Price agreed',
  'booking.quote_declined': 'Quote declined',
  'booking.status_changed': 'Booking status changed',
  'booking.fundi_finished': 'Work marked finished',
  'booking.completed': 'Booking completed',
  'settings.updated': 'Platform settings updated',
};

const CATEGORY: Record<AuditCategory, { label: string; cls: string; dot: string }> = {
  auth: { label: 'Auth', cls: 'bg-[#E6F3FD] text-[#075985]', dot: '#0284C7' },
  users: { label: 'Users', cls: 'bg-[#EEE8FD] text-[#5B21B6]', dot: '#7C3AED' },
  verifications: { label: 'Verification', cls: 'bg-[#FFEDD5] text-[#9A3412]', dot: '#EA580C' },
  jobs: { label: 'Job', cls: 'bg-[#E3F6EF] text-[#047857]', dot: '#059669' },
  bookings: { label: 'Booking', cls: 'bg-[#FDE7EC] text-[#BE123C]', dot: '#E11D48' },
  settings: { label: 'Settings', cls: 'bg-[#F0ECE6] text-[#3B4558]', dot: '#646B7A' },
};

const FILTERS: { key: AuditCategory | ''; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'auth', label: 'Auth' },
  { key: 'users', label: 'Users' },
  { key: 'verifications', label: 'Verifications' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'settings', label: 'Settings' },
];

const PAGE_SIZE = 25;

function actionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const tail = String(action || '').split('.').pop() || action;
  return tail.charAt(0).toUpperCase() + tail.slice(1).replace(/_/g, ' ');
}

function when(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: '—', time: '' };
  return {
    date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

function roleLabel(role: string) {
  if (!role) return 'System';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function AuditTrailPage() {
  const [rows, setRows] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<AuditCategory | ''>('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Type-to-search: the request goes out shortly after typing settles.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminAuditLogs({ page, pageSize: PAGE_SIZE, category, search });
      setRows(res.logs || []);
      setTotal(res.total || 0);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, [page, category, search]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  const pickCategory = (key: AuditCategory | '') => {
    setCategory(key);
    setPage(1);
  };

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader
        title="Audit Trail"
        subtitle="Every sign-in, account change, verification and job event on the platform"
      />

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actor, action or reference…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
        {FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => pickCategory(f.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              category === f.key ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-[20px] border border-line shadow-card p-7">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Activity</h2>
          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">
            {total.toLocaleString()} event{total === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm min-w-[760px] whitespace-nowrap">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#646B7A]">
                <th className="font-semibold pb-3 pr-4">Time</th>
                <th className="font-semibold pb-3 pr-4">Actor</th>
                <th className="font-semibold pb-3 pr-4">Action</th>
                <th className="font-semibold pb-3 pr-4">Details</th>
                <th className="font-semibold pb-3">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE6]">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Loading audit trail…</td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4">
                    <div className="rounded-2xl border border-dashed border-line bg-page p-8 flex flex-col items-center text-center gap-2">
                      <span className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <History size={24} className="text-emerald-600" />
                      </span>
                      <p className="text-sm font-bold text-slate-900">No events found</p>
                      <p className="text-xs text-slate-500">
                        {search || category
                          ? 'Try a different search or filter.'
                          : 'Sign-ins, account changes and job activity will appear here.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && rows.map(row => {
                const stamp = when(row.createdAt);
                const cat = CATEGORY[row.category] || CATEGORY.users;
                const actor = row.actorName || 'Unknown account';
                return (
                  <tr key={row.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="py-3.5 pr-4 align-top">
                      <span className="block text-[#3B4558]">{stamp.date}</span>
                      <span className="block text-[11px] text-slate-400">{stamp.time}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="flex items-center gap-2.5">
                        <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-[#EFEAE3] text-[#3B4558] flex items-center justify-center text-[11px] font-bold">
                          {initialsOf(actor) || '?'}
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-900">{actor}</span>
                          <span className="block text-[11px] text-slate-400">{roleLabel(row.actorRole)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-bold ${cat.cls}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.dot }} />
                        {actionLabel(row.action)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 max-w-[420px]">
                      <span className="block text-slate-700 truncate">{row.summary || '—'}</span>
                      {row.entityId && (
                        <span className="block text-[11px] text-slate-400 truncate">
                          {row.entityType} · {row.entityId}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-500" title={row.userAgent || ''}>
                      {row.ipAddress || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
            <p className="text-xs text-slate-400">Showing {from}–{to} of {total.toLocaleString()}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-600 px-2">{page} / {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
