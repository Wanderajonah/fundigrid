import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, UserCheck, FileCheck2, CircleCheckBig, Users } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import DonutChart from './components/DonutChart';
import StatusBadge from './components/StatusBadge';
import { useAdminStore } from './context/AdminStore';
import { JOB_STATUS_META } from './data/meta';

const STAT_ICONS = [ClipboardList, UserCheck, FileCheck2, CircleCheckBig, Users];

export default function DashboardOverview() {
  const { jobs, stats, loading } = useAdminStore();
  const recent = jobs.slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const requests = stats?.requests;
  const users = stats?.users;

  const cards = requests
    ? [
        { label: 'New Requests', value: requests.awaiting, sub: 'Awaiting a surveyor', tone: 'sky' as const },
        { label: 'Surveyor Assigned', value: requests.assigned, sub: 'Survey in progress', tone: 'violet' as const },
        { label: 'Estimate Ready', value: requests.ready, sub: 'Available to fundis', tone: 'orange' as const },
        { label: 'Completed Jobs', value: requests.completed, sub: 'All time', tone: 'emerald' as const },
        { label: 'Active Fundis', value: users?.activeFundis ?? 0, sub: `${users?.pendingFundis ?? 0} pending review`, tone: 'gray' as const },
      ]
    : [];

  const breakdown = (
    requests
      ? [
          { label: 'New', value: requests.awaiting, color: '#0EA5E9' },
          { label: 'Surveyor Assigned', value: requests.assigned, color: '#8B5CF6' },
          { label: 'Estimate Ready', value: requests.ready, color: '#F97316' },
          { label: 'Completed', value: requests.completed, color: '#10B981' },
          { label: 'Cancelled', value: requests.cancelled, color: '#F43F5E' },
        ]
      : []
  ).filter(s => s.value > 0);
  const total = breakdown.reduce((sum, s) => sum + s.value, 0);
  const chart = breakdown.length ? breakdown : [{ label: 'No requests yet', value: 1, color: '#E5E7EB' }];

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title={`${greeting}, Admin 👋`} subtitle="Here’s what’s happening with your platform today" />

      {loading && !stats && (
        <p className="mb-6 text-sm text-gray-400">Loading platform numbers…</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-5 mb-10">
        {cards.map((s, i) => {
          const Icon = STAT_ICONS[i];
          return <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} tone={s.tone} icon={<Icon size={17} />} />;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 p-7 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Recent Job Requests</h2>
            <Link to="/admin/requests" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-300">
                  <th className="font-semibold pb-3 pr-4">Service</th>
                  <th className="font-semibold pb-3 pr-4">Location</th>
                  <th className="font-semibold pb-3 pr-4">Customer</th>
                  <th className="font-semibold pb-3 pr-4">Date</th>
                  <th className="font-semibold pb-3 pr-4">Status</th>
                  <th className="font-semibold pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(job => {
                  const meta = JOB_STATUS_META[job.status];
                  return (
                    <tr key={job.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold text-gray-900">{job.service}</span>
                        <span className="block text-[11px] text-gray-300">{job.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-gray-500">{job.location}</td>
                      <td className="py-3.5 pr-4 text-gray-500">{job.customer}</td>
                      <td className="py-3.5 pr-4 text-gray-400 whitespace-nowrap">{job.date}</td>
                      <td className="py-3.5 pr-4"><StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} /></td>
                      <td className="py-3.5 text-right">
                        <Link to={`/admin/requests/${job.id}`} className="text-sm font-semibold text-primary hover:text-primary-dark">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {!loading && recent.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">No job requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 p-7">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Request Status Breakdown</h2>
          <p className="text-sm text-gray-400 mb-6">Every request on the platform, by stage</p>
          <DonutChart data={chart} centerValue={String(total)} centerLabel="Total" />
        </section>
      </div>
    </div>
  );
}
