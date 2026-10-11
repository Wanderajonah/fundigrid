import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import BarChart from './components/BarChart';
import DonutChart from './components/DonutChart';
import { useAdminStore } from './context/AdminStore';
import { formatUGX } from './data/meta';

export default function ReportsPage() {
  const { stats, loading } = useAdminStore();
  const requests = stats?.requests;
  const users = stats?.users;
  const bookings = stats?.bookings;

  const completion = [
    { label: 'Completed', value: requests?.completed ?? 0, color: '#10B981' },
    { label: 'Cancelled', value: requests?.cancelled ?? 0, color: '#F43F5E' },
  ];
  const decided = completion.reduce((sum, c) => sum + c.value, 0);
  const percent = decided ? Math.round(((completion[0].value) / decided) * 100) : 0;
  const completionChart = decided ? completion : [{ label: 'No jobs yet', value: 1, color: '#E2E8F0' }];

  const cards = requests
    ? [
        { label: 'Total Requests', value: String(requests.total), sub: `${requests.active} currently active` },
        { label: 'Completed Jobs', value: String(requests.completed), sub: `${requests.cancelled} cancelled` },
        { label: 'Value Completed', value: formatUGX(bookings?.completedValue ?? 0), sub: 'From finished bookings' },
        { label: 'Active Fundis', value: String(users?.activeFundis ?? 0), sub: `${users?.pendingFundis ?? 0} pending review` },
      ]
    : [];

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Reports & Analytics" subtitle="Track platform performance and job outcomes" />

      {loading && !stats && (
        <p className="mb-6 text-sm text-slate-400">Loading reports…</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {cards.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} tone="gray" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-7 min-w-0">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Requests by Service</h2>
              <p className="text-sm text-slate-400 mt-1">Job requests grouped by trade, all time</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">All time</span>
          </div>
          <BarChart data={requests?.byService?.length ? requests.byService : [{ label: 'No data', value: 0 }]} />
        </section>

        <section className="bg-white rounded-2xl border border-slate-100 p-7">
          <h2 className="text-lg font-bold text-slate-900">Job Completion Rate</h2>
          <p className="text-sm text-slate-400 mt-1 mb-6">Completed vs cancelled requests</p>
          <DonutChart
            data={completionChart}
            centerValue={decided ? `${percent}%` : '—'}
            centerLabel="Completed"
            size={170}
            showLegend={false}
          />
          <ul className="space-y-3 mt-7 pt-6 border-t border-slate-50">
            {completion.map(c => (
              <li key={c.label} className="flex items-center gap-3 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                <span className="text-slate-500">{c.label}</span>
                <span className="ml-auto font-semibold text-slate-900">{c.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
