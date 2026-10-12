import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, AlertCircle, Calculator, CheckCircle2, UserCheck } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import { ApiError, getAdminRequest, submitAdminEstimate, type AdminRequest } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ESTIMATE_STATUS_META, formatUGX, initialsOf } from './data/meta';
import { jobRef } from '../../lib/jobRef';

const fieldCls =
  'w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400';

function amount(value: string): number {
  const n = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

// Fetched straight from the API so both the admin dashboard and a surveyor's
// own desk can render the same screen.
function viewModel(row: AdminRequest) {
  const ready = row.surveyStatus === 'ESTIMATE_READY';
  const est = row.estimate;
  return {
    id: row.id,
    jobId: row.id,
    service: row.category || 'Service',
    customer: row.clientName || 'Client',
    surveyor: row.surveyorName || 'Unassigned',
    surveyorId: row.surveyorId || '',
    amount: Number(est?.total) || 0,
    status: (ready ? 'Ready' : 'Pending') as 'Ready' | 'Pending',
    submittedOn: ready ? String(row.estimateSubmittedAt || '') : '',
    breakdown: [
      { label: 'Labour', amount: Number(est?.labour) || 0 },
      { label: 'Materials', amount: Number(est?.materials) || 0 },
      { label: 'Service fee', amount: Number(est?.serviceFee) || 0 },
    ],
    notes: est?.notes ? [String(est.notes)] : [],
  };
}

export default function EstimateDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isSurveyor = user?.role === 'surveyor';
  const backTo = isSurveyor ? '/surveyor' : '/admin/estimates';
  const backLabel = isSurveyor ? 'Back to my requests' : 'Back to estimates';

  const [request, setRequest] = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [labour, setLabour] = useState('');
  const [materials, setMaterials] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getAdminRequest(id);
      setRequest(res.booking);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit() {
    if (!id) return;
    const labourAmount = amount(labour);
    const materialsAmount = amount(materials);
    const feeAmount = serviceFee.trim() === '' ? 0 : amount(serviceFee);

    if (!Number.isFinite(labourAmount) || labourAmount < 0 || !Number.isFinite(materialsAmount) || materialsAmount < 0) {
      setSubmitError('Labour and materials must be amounts.');
      return;
    }
    if (!Number.isFinite(feeAmount) || feeAmount < 0) {
      setSubmitError('Service fee must be an amount.');
      return;
    }
    if (labourAmount + materialsAmount + feeAmount <= 0) {
      setSubmitError('An estimate needs at least one amount.');
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      await submitAdminEstimate(id, {
        labour: labourAmount,
        materials: materialsAmount,
        serviceFee: feeAmount,
        notes: notes.trim() || undefined,
      });
      await load();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not submit the estimate');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-sm text-slate-500">Loading estimate…</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-lg font-bold text-slate-900">Estimate not found</p>
        <p className="text-sm text-slate-500 mt-2">{error || 'This request may have been removed.'}</p>
        <Link to="/admin/estimates" className="inline-block mt-6 text-sm font-semibold text-primary hover:text-primary-dark">Back to estimates</Link>
      </div>
    );
  }

  const estimate = viewModel(request);
  const meta = ESTIMATE_STATUS_META[estimate.status];
  const ready = estimate.status === 'Ready';
  const assigned = Boolean(estimate.surveyorId);

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft size={16} /> {backLabel}
      </Link>

      <PageHeader
        title={`Estimate ${jobRef(estimate.jobId)}`}
        subtitle={`${estimate.service} · ${ready ? `Submitted ${estimate.submittedOn.slice(0, 10)}` : 'Awaiting the surveyor’s figure'}`}
      >
        <StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} size="md" />
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {!assigned ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-800">No surveyor assigned yet</p>
                  <p className="text-xs text-amber-700 mt-1">An estimate can only be submitted once a quantity surveyor owns this request.</p>
                </div>
              </div>
              <Link
                to={`/admin/requests/${estimate.jobId}/assign`}
                className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-slate-900 text-sm font-semibold transition-all"
              >
                <UserCheck size={15} /> Assign a surveyor
              </Link>
            </div>
          ) : !ready ? (
            <div className="bg-white rounded-2xl border border-line shadow-card p-7">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-50">
                <span className="w-10 h-10 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center">
                  <Calculator size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Submit Estimate</h3>
                  <p className="text-xs text-slate-400">This unlocks the fundi directory for the client.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                <label className="block">
                  <span className="block text-sm font-bold text-slate-900 mb-3">Labour (UGX)</span>
                  <input value={labour} onChange={e => setLabour(e.target.value)} inputMode="numeric" placeholder="e.g. 120000" className={fieldCls} />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-slate-900 mb-3">Materials (UGX)</span>
                  <input value={materials} onChange={e => setMaterials(e.target.value)} inputMode="numeric" placeholder="e.g. 85000" className={fieldCls} />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-slate-900 mb-3">Service fee (UGX)</span>
                  <input value={serviceFee} onChange={e => setServiceFee(e.target.value)} inputMode="numeric" placeholder="e.g. 10000" className={fieldCls} />
                </label>
              </div>

              <label className="block mt-5">
                <span className="block text-sm font-bold text-slate-900 mb-3">Notes (optional)</span>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Site conditions, access, anything the client should know…"
                  className={`${fieldCls} resize-none`}
                />
              </label>

              {submitError && (
                <div className="flex items-center gap-2 mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  <AlertCircle size={15} /> {submitError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-7 mt-2 border-t border-slate-50">
                <Link
                  to={backTo}
                  className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-slate-900 text-sm font-semibold transition-all disabled:opacity-50"
                >
                  <Calculator size={16} /> {saving ? 'Submitting…' : 'Submit Estimate'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-line shadow-card p-7">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-50">
                  <div className="w-14 h-14 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center text-sm font-bold shrink-0">
                    {initialsOf(estimate.surveyor)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{estimate.surveyor}</p>
                    <p className="text-sm text-slate-400">Quantity Surveyor</p>
                  </div>
                  <span className="ml-auto text-xs font-semibold text-slate-400">{estimate.id}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-6 mb-4">Cost Breakdown</h3>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {estimate.breakdown.map(line => (
                      <tr key={line.label}>
                        <td className="py-3.5 text-slate-500">{line.label}</td>
                        <td className="py-3.5 text-right font-medium text-slate-700">{formatUGX(line.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-line">
                      <td className="py-4 font-bold text-slate-900">Total</td>
                      <td className="py-4 text-right font-bold text-slate-900 text-base">{formatUGX(estimate.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-2xl border border-line shadow-card p-7">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Surveyor Notes</h3>
                {estimate.notes.length === 0 ? (
                  <p className="text-sm text-slate-400">No notes were left with this estimate.</p>
                ) : (
                  <ul className="space-y-3">
                    {estimate.notes.map(note => (
                      <li key={note} className="flex gap-3 text-sm text-slate-500 leading-relaxed">
                        <Star size={15} className="text-primary shrink-0 mt-0.5" />
                        {note}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-line shadow-card p-7">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Job</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Request</dt>
                <dd className="font-semibold text-slate-900">{jobRef(estimate.jobId)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Service</dt>
                <dd className="font-medium text-slate-700">{estimate.service}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Customer</dt>
                <dd className="font-medium text-slate-700">{estimate.customer}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-400">Surveyor</dt>
                <dd className="font-medium text-slate-700">{estimate.surveyor}</dd>
              </div>
            </dl>
            {!isSurveyor && (
              <Link
                to={`/admin/requests/${estimate.jobId}`}
                className="block text-center mt-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                View job request
              </Link>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-line shadow-card p-7">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Status</h3>
            {ready ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5 text-center">
                <CheckCircle2 size={20} className="mx-auto text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-800 mt-2">Released to the client</p>
                <p className="text-xs text-emerald-700 mt-1">The client can now pick a fundi for this request.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-line p-5 text-center">
                <p className="text-sm font-semibold text-slate-900">Awaiting the estimate</p>
                <p className="text-xs text-slate-400 mt-1">Fundis stay hidden until this figure is submitted.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
