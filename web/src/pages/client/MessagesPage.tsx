import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getClientBookings, type Booking } from '../../lib/api';

export default function MessagesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    getClientBookings()
      .then(res => { if (alive) setBookings((res.bookings || []).filter(b => b.fundiName)); })
      .catch(() => { /* shown as an empty state below */ })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[calc(100vh-160px)] flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
        <MessageSquare size={24} className="text-gray-300" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">No conversations yet</h2>
      <p className="text-sm text-gray-400 max-w-sm">
        Chat opens once you and a fundi are working on a booked job. Messaging is not wired up yet.
      </p>

      {loaded && bookings.length > 0 && (
        <div className="mt-4 text-left w-full max-w-sm space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">You can reach</p>
          {bookings.slice(0, 5).map(b => (
            <Link
              key={b.id}
              to={`/client/tracking?id=${encodeURIComponent(b.id)}`}
              className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-semibold text-gray-900">{b.fundiName}</span>
              <span className="text-xs text-gray-400">View job</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
