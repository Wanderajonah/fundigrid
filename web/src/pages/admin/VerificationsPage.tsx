import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, Search, ShieldAlert, XCircle } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import StatusBadge from './components/StatusBadge';
import ReviewVerificationDialog from './components/ReviewVerificationDialog';
import { useAdminStore } from './context/AdminStore';
import { initialsOf } from './data/meta';
import { getAdminVerifications, type AdminVerification, type VerificationStatus } from '../../lib/api';

const TABS: { key: VerificationStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(row: AdminVerification) {
  if (row.status === 'verified') return <StatusBadge label="Verified" cls="bg-emerald-50 text-emerald-600" />;
  if (row.status === 'rejected') return <StatusBadge label="Rejected" cls="bg-rose-50 text-rose-500" />;
  if (row.status === 'pending') return <StatusBadge label="Pending" cls="bg-amber-50 text-amber-600" />;
  return <StatusBadge label="Not submitted" cls="bg-slate-100 text-slate-400" />;
}

export default function VerificationsPage() {
  const { reviewVerification, error: storeError } = useAdminStore();
  const [tab, setTab] = useState<VerificationStatus>('pending');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AdminVerification[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminVerification | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (status: VerificationStatus) => {
    setLoading(true);
    try {
      const res = await getAdminVerifications(status);
      setRows(res.verifications || []);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(tab); }, [tab, load]);

  // The three counters across the top — kept fresh as decisions come in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pending, verified, rejected] = await Promise.all([
          getAdminVerifications('pending'),
          getAdminVerifications('verified'),
          getAdminVerifications('rejected'),
        ]);
        if (cancelled) return;
        setCounts({
          pending: pending.verifications.length,
          verified: verified.verifications.length,
          rejected: rejected.verifications.length,
        });
      } catch {
        // The table below already surfaces connection problems.
      }
    })();
    return () => { cancelled = true; };
  }, [rows]);

  const filtered = rows.filter(row => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [row.name, row.trade, row.location, row.phone].some(v => String(v || '').toLowerCase().includes(q));
  });

  const decide = async (decision: { decision: 'approve' | 'reject'; note?: string }) => {
    if (!selected) return;
    setBusy(true);
    try {
      await reviewVerification(selected.userId, decision);
      setSelected(null);
      await load(tab);
    } catch {
      // store.error carries the message
    } finally {
      setBusy(false);
    }
  };

  const errorText = error || storeError;

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader
        title="Verifications"
        subtitle="Review identity and trade documents before a fundi appears to clients"
      />

      {errorText && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {errorText}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <StatCard
          label="Pending Review"
          value={counts.pending ?? 0}
          sub="Awaiting your decision"
          tone="amber"
          icon={<FileCheck2 size={17} />}
        />
        <StatCard
          label="Verified"
          value={counts.verified ?? 0}
          sub="Visible to clients"
          tone="emerald"
          icon={<CheckCircle2 size={17} />}
        />
        <StatCard
          label="Rejected"
          value={counts.rejected ?? 0}
          sub="Sent back with a note"
          tone="gray"
          icon={<ShieldAlert size={17} />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search fundis…"
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
          />
        </div>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${
              tab === t.key ? 'bg-navy-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">Fundi</th>
                <th className="font-semibold pb-4 pr-4">Trade</th>
                <th className="font-semibold pb-4 pr-4">Documents</th>
                <th className="font-semibold pb-4 pr-4">Referees</th>
                <th className="font-semibold pb-4 pr-4">Submitted</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(row => (
                <tr key={row.userId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                        {initialsOf(row.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{row.name}</p>
                        <p className="text-[11px] text-slate-400">{row.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{row.trade || '—'}</td>
                  <td className="py-4 pr-4 text-slate-500">
                    {row.docs.length ? `${row.docs.length} uploaded` : <span className="text-slate-400">None</span>}
                  </td>
                  <td className="py-4 pr-4 text-slate-500">{row.referees.length || '—'}</td>
                  <td className="py-4 pr-4 text-slate-400 whitespace-nowrap">{formatDate(row.requestedAt || row.createdAt)}</td>
                  <td className="py-4 pr-4">{statusBadge(row)}</td>
                  <td className="py-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelected(row)}
                      className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                      <XCircle size={22} className="text-slate-300" />
                      <p className="text-sm">
                        {tab === 'pending' ? 'No pending fundis.' : tab === 'verified' ? 'No verified fundis yet.' : 'Nothing sent back yet.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading verifications…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReviewVerificationDialog
        row={selected}
        busy={busy}
        onClose={() => setSelected(null)}
        onDecide={decide}
      />
    </div>
  );
}
