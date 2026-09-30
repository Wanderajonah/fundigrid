import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function BookingConfirmedPage() {
  const [params] = useSearchParams();
  const bookingId = params.get('bookingId') || '';
  const fundiName = params.get('fundiName') || '';
  const category = params.get('category') || '';
  const area = params.get('area') || '';
  const date = params.get('date') || '';
  const time = params.get('time') || '';

  const rows: [string, string][] = [
    ['Fundi', fundiName],
    ['Service', category],
    ['Area', area],
    ['Date', date],
    ['Time', time],
  ];
  const present = rows.filter(([, v]) => v);

  return (
    <div className="max-w-[500px] mx-auto text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-10">
        <CheckCircle size={40} className="text-emerald-500" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Booking Confirmed!</h1>
      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed mb-12">
        {fundiName ? `Your request was sent to ${fundiName}.` : 'Your request was sent.'} You will see it move through the statuses on your requests page.
      </p>

      {present.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-left mb-10 space-y-4">
          {present.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2">
              <span className="text-sm text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {bookingId && (
          <Link to={`/client/tracking?id=${encodeURIComponent(bookingId)}`} className="w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-black transition-all">
            Track this job <ArrowRight size={16} />
          </Link>
        )}
        <Link to="/client" className="w-full inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-gray-50 transition-all">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
