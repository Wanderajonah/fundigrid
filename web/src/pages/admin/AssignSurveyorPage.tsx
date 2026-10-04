import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, ClipboardCheck, AlertCircle } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import { useAdminStore } from './context/AdminStore';
import { JOB_STATUS_META, initialsOf } from './data/meta';

export default function AssignSurveyorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getJob, surveyors, assignSurveyor } = useAdminStore();
  const job = getJob(id);

  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-lg font-bold text-gray-900">Request not found</p>
        <Link to="/admin/requests" className="inline-block mt-6 text-sm font-semibold text-primary hover:text-primary-dark">Back to job requests</Link>
      </div>
    );
  }

  const selected = surveyors.find(s => s.id === (selectedId || surveyors[0]?.id));
  const meta = JOB_STATUS_META[job.status];

  async function handleAssign() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await assignSurveyor(job!.id, selected.id);
      navigate(`/admin/requests/${job!.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign the surveyor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[980px] mx-auto">
      <Link to={`/admin/requests/${job.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-900 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to request
      </Link>

      <PageHeader title="Assign Quantity Surveyor" subtitle="Pick a surveyor to measure the site and prepare an estimate" />

      <div className="bg-white rounded-2xl border border-gray-100 p-7 mb-6">
        <div className="flex flex-wrap items-center gap-4 pb-6 border-b border-gray-50">
          <span className="text-lg font-bold text-gray-900">{job.id}</span>
          <StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} />
          <span className="text-sm text-gray-400">{job.service} · {job.location} · {job.date}</span>
        </div>

        {surveyors.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center mt-6">
            <AlertCircle size={20} className="mx-auto text-amber-500" />
            <p className="text-sm font-semibold text-amber-800 mt-3">No quantity surveyors yet</p>
            <p className="text-xs text-amber-700 mt-1">Create a user with the surveyor role before assigning this request.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
            <div>
              <label htmlFor="surveyor" className="block text-sm font-bold text-gray-900 mb-3">Select Surveyor</label>
              <select
                id="surveyor"
                value={selectedId || surveyors[0].id}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              >
                {surveyors.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.available ? 'Available' : 'Busy'})
                  </option>
                ))}
              </select>

              {selected && (
                <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center text-sm font-bold shrink-0">
                    {initialsOf(selected.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{selected.name}</p>
                      <StatusBadge
                        label={selected.available ? 'Available' : 'Busy'}
                        cls={selected.available ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-0.5">{selected.specialty}</p>
                    <p className="flex items-center gap-3 text-xs text-gray-300 mt-1">
                      <span className="inline-flex items-center gap-1"><Star size={12} className="text-primary" /> {selected.rating}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={12} /> {selected.location}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-bold text-gray-900 mb-3">Notes (Optional)</label>
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={5}
                placeholder="Please provide any specific instructions or access details for the surveyor…"
                className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-gray-300"
              />
              <p className="text-xs text-gray-300 mt-2">The surveyor will see these notes with the assignment.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-7 mt-2 border-t border-gray-50">
          <Link
            to={`/admin/requests/${job.id}`}
            className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={handleAssign}
            disabled={!selected || saving || surveyors.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-gray-900 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ClipboardCheck size={16} /> {saving ? 'Assigning…' : 'Assign Surveyor'}
          </button>
        </div>
      </div>
    </div>
  );
}
