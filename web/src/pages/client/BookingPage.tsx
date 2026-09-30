import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, User } from 'lucide-react';
import { createBooking, getFundi, type Fundi } from '../../lib/api';

const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export default function BookingPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const fundiId = params.get('fundi') || '';
  const category = params.get('category') || '';
  const description = params.get('description') || '';
  const title = params.get('title') || '';
  const area = params.get('area') || '';

  const [fundi, setFundi] = useState<Fundi | null>(null);
  const [loadingFundi, setLoadingFundi] = useState(true);
  const [date, setDate] = useState(params.get('date') || '');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!fundiId) { setLoadingFundi(false); return; }
    getFundi(fundiId)
      .then(res => { if (alive) setFundi(res.fundi); })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Could not load this fundi'); })
      .finally(() => { if (alive) setLoadingFundi(false); });
    return () => { alive = false; };
  }, [fundiId]);

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!date || !time || busy) return;
    setBusy(true);
    setError('');
    try {
      const scheduledFor = new Date(`${date}T${time}:00`).toISOString();
      const res = await createBooking({
        fundiId: fundiId || null,
        category,
        description: description || title,
        address: area,
        scheduledFor,
      });
      const booking = res.booking;
      const qs = new URLSearchParams({
        bookingId: booking.id,
        fundiName: fundi?.name || booking.fundiName || '',
        category: booking.category || category,
        area,
        date,
        time,
      }).toString();
      nav(`/client/booking-confirmed?${qs}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm the booking');
    } finally {
      setBusy(false);
    }
  }

  const summary: [string, string][] = [
    ['Fundi', fundi?.name || ''],
    ['Service', category || title],
    ['Area', area],
    ['Date', date],
    ['Time', time],
  ];

  return (
    <div className="max-w-[600px] mx-auto">
      <button onClick={() => nav(-1)} className="text-sm text-gray-400 hover:text-gray-900 transition-colors mb-10 inline-flex items-center gap-1"><ArrowLeft size={14} /> Back</button>

      <h1 className="text-4xl font-bold text-gray-900 mb-3">Book a Fundi</h1>
      <p className="text-sm text-gray-400 mb-14">Pick your date and time</p>

      {!fundiId && <p className="text-sm text-red-500 mb-8">No fundi selected — pick one from Find Fundis first.</p>}
      {loadingFundi && <p className="text-sm text-gray-400 mb-8">Loading fundi…</p>}
      {error && <p className="text-sm text-red-500 mb-8">{error}</p>}

      <form onSubmit={handleConfirm}>
        <div className="mb-12">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4"><User size={16} className="text-gray-400" /> Fundi</label>
          <div className="px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl text-gray-900">
            {fundi?.name || (fundiId ? '…' : 'None selected')}
          </div>
        </div>

        <div className="mb-12">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4"><Calendar size={16} className="text-gray-400" /> Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>

        <div className="mb-12">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4"><Clock size={16} className="text-gray-400" /> Time</label>
          <div className="grid grid-cols-5 gap-2">
            {TIMES.map(t => (
              <button key={t} type="button" onClick={() => setTime(t)} className={`py-3 text-sm font-medium rounded-xl border-2 transition-all ${time === t ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}>{t}</button>
            ))}
          </div>
        </div>

        {area && (
          <div className="mb-12">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4"><MapPin size={16} className="text-gray-400" /> Service area</label>
            <div className="px-5 py-4 text-sm bg-gray-50 border border-gray-100 rounded-2xl text-gray-900">{area}</div>
          </div>
        )}

        <div className="bg-gray-50 rounded-2xl p-8 mb-8 space-y-2">
          {summary.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5">
              <span className="text-sm text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        <button type="submit" disabled={!fundiId || !date || !time || busy} className="w-full py-4 bg-primary hover:bg-primary-dark text-gray-900 font-semibold text-sm rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed">
          {busy ? 'Confirming…' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}
