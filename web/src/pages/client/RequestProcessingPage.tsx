import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';

export default function RequestProcessingPage() {
  const [params] = useSearchParams();
  const category = params.get('category') || '';
  const title = params.get('title') || '';
  const description = params.get('description') || '';
  const area = params.get('area') || '';
  const date = params.get('date') || '';
  const urgency = params.get('urgency') || 'normal';

  const nextHref = `/client/fundis?${new URLSearchParams({
    ...(category ? { category } : {}),
    ...(area ? { area } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(date ? { date } : {}),
  }).toString()}`;

  const summary: [string, string][] = [
    ['Service', category],
    ['Title', title],
    ['Description', description],
    ['Area', area],
    ['Preferred date', date],
    ['Urgency', urgency],
  ];

  return (
    <div className="max-w-[600px] mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-3">Request Ready</h1>
      <p className="text-sm text-gray-400 mb-12">Your request is saved — pick a fundi to send it to</p>

      <div className="bg-gray-950 rounded-3xl p-10 text-white mb-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-sm font-semibold text-emerald-400">Ready to send</span>
        </div>
        <h2 className="text-2xl font-bold">{title || category || 'Job request'}</h2>
        <p className="text-sm text-gray-500 mt-2">{category || 'Service'}{area ? ` · ${area}` : ''}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-10 space-y-4">
        {summary.filter(([, v]) => v).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-2">
            <span className="text-sm text-gray-400">{label}</span>
            <span className="text-sm font-semibold text-gray-900 text-right">{value}</span>
          </div>
        ))}
        {summary.every(([, v]) => !v) && (
          <p className="text-sm text-gray-400">No details supplied — you can still browse available fundis.</p>
        )}
      </div>

      <div className="space-y-4">
        <Link
          to={nextHref}
          className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-gray-900 font-semibold py-4 rounded-2xl transition-all"
        >
          <CheckCircle size={16} /> Find Fundis <ArrowRight size={16} />
        </Link>
        <Link to="/client/requests" className="block text-center text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          ← Back to Requests
        </Link>
      </div>
    </div>
  );
}
