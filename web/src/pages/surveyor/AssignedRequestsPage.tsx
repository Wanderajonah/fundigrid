import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calculator, RefreshCw, ClipboardList } from 'lucide-react';
import { ApiError, getMySurveyRequests, type AdminRequest } from '../../lib/api';
import { jobRef } from '../../lib/jobRef';

const FIELD = 'px-4 py-3 text-sm';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AssignedRequestsPage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMySurveyRequests();
      setRequests(res.requests || []);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = requests.filter(r => r.surveyStatus !== 'ESTIMATE_READY');
  const done = requests.filter(r => r.surveyStatus === 'ESTIMATE_READY');

  return (
    <div className="max-w-[1360px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-sm text-slate-400 mt-1.5">Jobs assigned to you — submit an estimate to release them to the client</p>
        </div>
        <div className="flex gap-3">
          <div className="px-5 py-3 rounded-xl bg-white border border-slate-100 text-center">
            <p className="text-xl font-bold text-slate-900">{pending.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">To price</p>
          </div>
          <div className="px-5 py-3 rounded-xl bg-white border border-slate-100 text-center">
            <p className="text-xl font-bold text-slate-900">{done.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Submitted</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3">
          <p className="text-sm text-rose-600">{error}</p>
          <button onClick={() => load()} className="text-sm font-semibold text-rose-700 underline underline-offset-2">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-7">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-50">
                <th className="font-semibold pb-4 pr-4">Request</th>
                <th className="font-semibold pb-4 pr-4">Service</th>
                <th className="font-semibold pb-4 pr-4">Client</th>
                <th className="font-semibold pb-4 pr-4">Location</th>
                <th className="font-semibold pb-4 pr-4">Assigned</th>
                <th className="font-semibold pb-4 pr-4">Status</th>
                <th className="font-semibold pb-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading your requests…</td>
                </tr>
              )}

              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <ClipboardList size={26} className="mx-auto text-slate-400" />
                    <p className="text-sm text-slate-400 mt-3">No requests assigned to you yet.</p>
                    <p className="text-xs text-slate-400 mt-1">An admin assigns you a request before it appears here.</p>
                  </td>
                </tr>
              )}

              {!loading && requests.map(r => {
                const ready = r.surveyStatus === 'ESTIMATE_READY';
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className={`${FIELD} font-semibold text-slate-900`}>{jobRef(r.id)}</td>
                    <td className={`${FIELD} text-slate-700`}>{r.category || 'Service'}</td>
                    <td className={`${FIELD} text-slate-500`}>{r.clientName || 'Client'}</td>
                    <td className={`${FIELD} text-slate-500`}>{(r.address || '—').split(',')[0]}</td>
                    <td className={`${FIELD} text-slate-400 whitespace-nowrap`}>{formatDate(r.assignedAt || r.created_at)}</td>
                    <td className={FIELD}>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ready ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {ready ? 'Estimate submitted' : 'Awaiting your estimate'}
                      </span>
                    </td>
                    <td className={`${FIELD} text-right`}>
                      <Link
                        to={`/surveyor/estimate/${r.id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark"
                      >
                        <Calculator size={14} /> {ready ? 'View' : 'Enter estimate'}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-50">
          <p className="text-xs text-slate-400">{requests.length} request{requests.length === 1 ? '' : 's'} assigned</p>
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 mt-6 rounded-xl border border-slate-100 bg-white p-5">
        <AlertCircle size={17} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-slate-400">
          Your estimate is what unlocks the fundi directory for the client. Labour, materials and the service fee are added
          together to form the total shown on their phone.
        </p>
      </div>
    </div>
  );
}
