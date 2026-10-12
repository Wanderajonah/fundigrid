import { useState } from 'react';
import { Check, FileImage, X } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { initialsOf } from '../data/meta';
import type { AdminVerification } from '../../../lib/api';

interface Props {
  row: AdminVerification | null;
  busy?: boolean;
  onClose: () => void;
  onDecide: (decision: { decision: 'approve' | 'reject'; note?: string }) => void;
}

const DOC_LABELS = ['National ID — front', 'National ID — back', 'Certificate of Trade'];

function docLabel(index: number, total: number) {
  if (total === 3) return DOC_LABELS[index] || `Document ${index + 1}`;
  return `Document ${index + 1}`;
}

export default function ReviewVerificationDialog({ row, busy, onClose, onDecide }: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  if (!row) return null;

  const close = () => {
    setRejecting(false);
    setNote('');
    setZoom(null);
    onClose();
  };

  const submitReject = () => {
    if (!note.trim()) return;
    onDecide({ decision: 'reject', note: note.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm"
        onClick={close}
      />
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto theme-admin bg-white rounded-2xl border border-line shadow-2xl">
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-line sticky top-0 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-navy-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initialsOf(row.name)}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 truncate">{row.name}</h2>
              <p className="text-xs text-slate-400">
                {[row.trade, row.location, row.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge
              label={row.status === 'verified' ? 'Verified' : row.status === 'rejected' ? 'Rejected' : 'Pending'}
              cls={
                row.status === 'verified'
                  ? 'bg-emerald-50 text-emerald-600'
                  : row.status === 'rejected'
                    ? 'bg-rose-50 text-rose-500'
                    : 'bg-amber-50 text-amber-600'
              }
              size="md"
            />
            <button
              onClick={close}
              aria-label="Close"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
              Submitted documents
            </h3>
            {row.docs.length ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {row.docs.map((doc, i) => (
                  <button
                    key={i}
                    onClick={() => setZoom(doc)}
                    className="group text-left rounded-xl border border-slate-200 overflow-hidden bg-slate-50 hover:border-primary/60 transition-colors"
                  >
                    <div className="h-36 bg-slate-100 overflow-hidden flex items-center justify-center">
                      {doc.startsWith('data:image') ? (
                        <img
                          src={doc}
                          alt={docLabel(i, row.docs.length)}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                        />
                      ) : (
                        <FileImage size={22} className="text-slate-300" />
                      )}
                    </div>
                    <p className="px-3 py-2 text-[11px] font-medium text-slate-500">
                      {docLabel(i, row.docs.length)}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No documents uploaded yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
              Referees
            </h3>
            {row.referees.length ? (
              <ul className="divide-y divide-slate-50 rounded-xl border border-line">
                {row.referees.map((ref, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">
                      {ref.name}
                      {ref.relationship ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">{ref.relationship}</span>
                      ) : null}
                    </span>
                    <span className="text-sm text-slate-400">{ref.phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No referees listed.</p>
            )}
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-3">
              About
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {row.bio || 'No bio yet.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {row.skills.map(skill => (
                <span key={skill} className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-500">
                  {skill}
                </span>
              ))}
            </div>
          </section>

          {row.status === 'rejected' && row.note && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-rose-400 mb-1">
                Last decision
              </p>
              <p className="text-sm text-rose-600">{row.note}</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 sticky bottom-0 bg-white border-t border-line mt-2">
          {rejecting ? (
            <div className="pt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="reject-note">
                What needs fixing?
              </label>
              <textarea
                id="reject-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                autoFocus
                placeholder="e.g. The back of your National ID is unreadable — retake it in better light."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setRejecting(false); setNote(''); }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReject}
                  disabled={!note.trim() || busy}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Send back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                <X size={15} /> Reject
              </button>
              <button
                onClick={() => onDecide({ decision: 'approve' })}
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold transition-all disabled:opacity-40"
              >
                <Check size={15} /> Approve
              </button>
            </div>
          )}
        </div>
      </div>

      {zoom && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <button
            aria-label="Close preview"
            className="absolute inset-0 bg-navy-950/80"
            onClick={() => setZoom(null)}
          />
          <img src={zoom} alt="Document preview" className="relative max-h-[88vh] max-w-full rounded-xl" />
          <button
            onClick={() => setZoom(null)}
            aria-label="Close preview"
            className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
