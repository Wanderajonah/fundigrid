import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, User } from 'lucide-react';
import {
  acceptBooking,
  declineBooking,
  getFundiBooking,
  updateBookingStatus,
  type Booking,
  type FundiBookingStatus,
} from '../../lib/api';
import { bookingAmount, bookingDate, bookingTitle, statusMeta } from '../../lib/booking';

const NEXT: { status: FundiBookingStatus; label: string }[] = [
  { status: 'ON_THE_WAY', label: 'On the way' },
  { status: 'ARRIVED', label: 'Arrived' },
  { status: 'IN_PROGRESS', label: 'Start work' },
  { status: 'COMPLETED', label: 'Mark as completed' },
];

const FLOW = ['PENDING', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

export default function FundiJobDetailPage() {
  const { id = '' } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await getFundiBooking(id);
      setBooking(res.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That action failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto">
        <Link to="/fundi/jobs" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>
        <p className="text-sm text-gray-400">Loading request…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-[800px] mx-auto text-center py-20">
        <p className="font-semibold text-gray-900">{error || 'Request not found'}</p>
        <Link to="/fundi/jobs" className="inline-block mt-4 text-sm font-semibold text-primary hover:text-primary-dark">← Back to My Requests</Link>
      </div>
    );
  }

  const meta = statusMeta(booking.status);
  const flowIndex = FLOW.indexOf(booking.status);
  // Once the work is reported finished the next step belongs to the client.
  const workFinished = Boolean(booking.fundiCompleted);
  const nextStep = workFinished
    ? undefined
    : booking.status === 'ACCEPTED'
      ? NEXT[0]
      : NEXT.find(n => FLOW.indexOf(n.status) === flowIndex + 1);
  const isPending = booking.status === 'PENDING';
  const isFinished = booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'DISPUTED';
  const awaitingClient = workFinished && booking.status === 'IN_PROGRESS';

  const details = [
    { icon: MapPin, label: 'Area', value: booking.address || 'Not shared' },
    { icon: Calendar, label: 'Date', value: bookingDate(booking) },
    { icon: Clock, label: 'Status', value: meta.label },
    { icon: User, label: 'Requested by', value: booking.clientId ? 'Client' : '—' },
    { icon: DollarSign, label: 'Agreed price', value: bookingAmount(booking) || 'Not agreed yet' },
  ];

  return (
    <div className="max-w-[800px] mx-auto">
      <Link to="/fundi/jobs" className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</Link>

      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-3xl font-bold text-gray-900">{bookingTitle(booking)}</h1>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
      </div>
      <p className="text-sm text-gray-400 mb-12">{booking.id}{booking.scheduledFor ? ` · scheduled ${new Date(booking.scheduledFor).toLocaleString()}` : ''}</p>

      {error && <p className="text-sm text-red-500 mb-6">{error}</p>}

      <div className="mb-14">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{booking.description?.trim() || 'No description provided.'}</p>
      </div>

      <div className="mb-14">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Details</h2>
        <div className="grid grid-cols-2 gap-6">
          {details.map(d => {
            const Icon = d.icon;
            return (
              <div key={d.label} className="flex items-start gap-3">
                <Icon size={16} className="text-gray-300 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{d.label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{d.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-8 text-center">
        {isPending && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => run(() => acceptBooking(booking.id))}
              disabled={busy}
              className="px-8 py-3 bg-primary hover:bg-primary-dark disabled:opacity-60 text-gray-900 font-semibold text-sm rounded-full transition-all"
            >
              {busy ? 'Working…' : 'Accept Job'}
            </button>
            <button
              onClick={() => run(() => declineBooking(booking.id))}
              disabled={busy}
              className="px-8 py-3 border border-gray-200 text-gray-700 font-semibold text-sm rounded-full hover:bg-gray-50 disabled:opacity-60 transition-all"
            >
              Decline
            </button>
          </div>
        )}

        {!isPending && !isFinished && nextStep && (
          <button
            onClick={() => run(() => updateBookingStatus(booking.id, nextStep.status))}
            disabled={busy}
            className="px-8 py-3 bg-primary hover:bg-primary-dark disabled:opacity-60 text-gray-900 font-semibold text-sm rounded-full transition-all"
          >
            {busy ? 'Updating…' : nextStep.label}
          </button>
        )}

        {awaitingClient && (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Work reported finished</p>
            <p className="text-sm text-gray-500">Waiting for the client to confirm the job is done.</p>
          </div>
        )}

        {isFinished && <p className="text-sm text-gray-500">This request is closed.</p>}
      </div>
    </div>
  );
}
