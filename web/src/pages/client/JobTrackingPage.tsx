import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, MapPin } from 'lucide-react';
import { confirmCompletion, getClientBookings, type Booking } from '../../lib/api';
import { bookingTitle, statusMeta } from '../../lib/booking';

function formatStamp(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export default function JobTrackingPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('id') || '';
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    let alive = true;
    getClientBookings()
      .then(res => { if (alive) setBookings(res.bookings || []); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this job'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const booking = useMemo(() => {
    if (bookingId) return bookings.find(b => b.id === bookingId) || null;
    return bookings[0] || null;
  }, [bookings, bookingId]);

  const steps = useMemo(() => {
    if (!booking) return [];
    return [
      { label: 'Requested', at: booking.created_at },
      { label: 'Fundi accepted', at: booking.acceptedAt },
      { label: 'On the way', at: booking.onTheWayAt },
      { label: 'Arrived', at: booking.arrivedAt },
      { label: 'In progress', at: booking.startedAt },
      { label: 'Completed', at: booking.completedAt },
    ].map(s => ({ label: s.label, at: formatStamp(s.at), done: Boolean(s.at) }));
  }, [booking]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto">
        <p className="text-sm text-gray-400">Loading job…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[900px] mx-auto">
        <p className="text-sm text-red-500">{error}</p>
        <Link to="/client/requests" className="inline-block mt-4 text-sm font-semibold text-primary">← Back to Requests</Link>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-[900px] mx-auto text-center py-20">
        <p className="font-semibold text-gray-900">No job to track</p>
        <p className="text-sm text-gray-400 mt-1">Post a request first and it will show up here.</p>
        <Link to="/client/requests" className="inline-block mt-5 text-sm font-semibold text-primary hover:text-primary-dark">← Back to Requests</Link>
      </div>
    );
  }

  const meta = statusMeta(booking.status);
  const doneCount = steps.filter(s => s.done).length;
  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'DISPUTED';
  const place = booking.address || 'Location not shared';
  // The fundi reports the work finished; the client signs off before it is COMPLETED.
  const awaitingSignoff = booking.status === 'IN_PROGRESS' && Boolean(booking.fundiCompleted);

  async function confirmDone() {
    if (confirming) return;
    const ok = window.confirm('Confirm the job is done? This releases payment to the fundi.');
    if (!ok) return;
    setConfirming(true);
    setConfirmError('');
    try {
      await confirmCompletion(booking!.id);
      const res = await getClientBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Could not confirm completion');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <Link to="/client/requests" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>

      <div className="flex items-start justify-between mb-12">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{bookingTitle(booking)}</h1>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <MapPin size={13} /> {booking.id} · {place}
          </p>
          {booking.fundiName && <p className="text-sm text-gray-500 mt-1">Fundi: {booking.fundiName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-8">
        <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="font-bold text-gray-900 mb-6">Request details</h2>
          <dl className="space-y-4">
            <div className="flex justify-between gap-6">
              <dt className="text-sm text-gray-400">Status</dt>
              <dd className="text-sm font-semibold text-gray-900">{meta.label}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-sm text-gray-400">Progress</dt>
              <dd className="text-sm font-semibold text-gray-900">{doneCount} of {steps.length} steps</dd>
            </div>
            {booking.description && (
              <div className="flex justify-between gap-6">
                <dt className="text-sm text-gray-400">Description</dt>
                <dd className="text-sm font-semibold text-gray-900 text-right">{booking.description}</dd>
              </div>
            )}
            <div className="flex justify-between gap-6">
              <dt className="text-sm text-gray-400">Area</dt>
              <dd className="text-sm font-semibold text-gray-900">{place}</dd>
            </div>
          </dl>
          {isCancelled && <p className="mt-6 text-sm text-red-500">This booking was cancelled. <Link className="font-semibold" to="/client/request">Request another fundi</Link>.</p>}
        </div>

        <div className="col-span-2">
          <h2 className="font-bold text-gray-900 mb-6">Timeline</h2>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {s.done ? <CheckCircle size={14} /> : <Clock size={14} />}
                  </div>
                  {i < steps.length - 1 && <div className={`w-px flex-1 my-1.5 ${s.done ? 'bg-emerald-200' : 'bg-gray-100'}`} />}
                </div>
                <div className="pb-6">
                  <p className={`text-sm font-medium ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.at || 'Pending'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {confirmError && <p className="text-sm text-red-500 mt-6">{confirmError}</p>}

      {awaitingSignoff && (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 flex items-start gap-4">
          <CheckCircle size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">The fundi says the work is finished</p>
            <p className="text-sm text-gray-500 mt-1">
              Check everything is right, then confirm. Payment is released to the fundi once you do.
            </p>
          </div>
          <button
            onClick={confirmDone}
            disabled={confirming}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-sm rounded-full transition-all"
          >
            {confirming ? 'Confirming…' : 'Confirm job is done'}
          </button>
        </div>
      )}

    </div>
  );
}
