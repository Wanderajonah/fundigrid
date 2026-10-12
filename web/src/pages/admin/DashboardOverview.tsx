import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, HardHat, ShieldCheck, Users, Wallet } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import DonutChart from './components/DonutChart';
import LineChart from './components/LineChart';
import StatusBadge from './components/StatusBadge';
import { useAdminStore } from './context/AdminStore';
import { initialsOf, JOB_STATUS_META, formatUGX } from './data/meta';
import { jobRef } from '../../lib/jobRef';

export default function DashboardOverview() {
  const { jobs, stats, loading, verifications } = useAdminStore();
  const recent = jobs.slice(0, 6);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const requests = stats?.requests;
  const users = stats?.users;
  const bookings = stats?.bookings;

  const cards = stats
    ? [
        {
          label: 'Total Fundis',
          value: users?.fundis ?? 0,
          sub: `${users?.activeFundis ?? 0} active · ${users?.pendingFundis ?? 0} pending`,
          tone: 'gray' as const,
          icon: <HardHat size={16} />,
        },
        {
          label: 'Total Clients',
          value: users?.clients ?? 0,
          sub: 'Registered on the platform',
          tone: 'sky' as const,
          icon: <Users size={16} />,
        },
        {
          label: 'Amount Earned',
          value: formatUGX(bookings?.completedValue ?? 0),
          sub: 'From completed bookings',
          tone: 'emerald' as const,
          icon: <Wallet size={16} />,
        },
        {
          label: 'Job Requests',
          value: requests?.total ?? 0,
          sub: `${requests?.active ?? 0} currently active`,
          tone: 'violet' as const,
          icon: <ClipboardList size={16} />,
        },
      ]
    : [];

  const trend = bookings?.trend?.length
    ? bookings.trend
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ label, value: 0 }));

  const byService = requests?.byService ?? [];
  const serviceTotal = byService.reduce((sum, s) => sum + s.value, 0);
  const topServices = byService.slice(0, 8);
  const serviceColors = ['#0EA5E9', '#8B5CF6', '#10B981', '#F97316', '#F43F5E', '#F5A623', '#14B8A6', '#6366F1'];
  const servicesChart = topServices.length
    ? topServices.map((s, i) => ({ ...s, color: serviceColors[i % serviceColors.length] }))
    : [{ label: 'No data yet', value: 1, color: '#E2E8F0' }];

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title={`${greeting}, Admin`} subtitle="Here’s what’s happening with your platform today" />

      {loading && !stats && (
        <p className="mb-6 text-sm text-slate-500">Loading platform numbers…</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {cards.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} tone={s.tone} icon={s.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <section className="bg-white rounded-2xl border border-line shadow-card p-7 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Bookings Trend</h2>
          <p className="text-sm text-slate-400 mb-6">Job requests created each day, last 7 days</p>
          <LineChart data={trend} />
        </section>

        <section className="bg-white rounded-2xl border border-line shadow-card p-7 min-w-0">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Top Services</h2>
          <p className="text-sm text-slate-400 mb-6">Most requested trades, all time</p>
          <DonutChart
            data={servicesChart}
            centerValue={String(serviceTotal)}
            centerLabel="Requests"
            size={190}
            legendLayout="stacked"
          />
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-white rounded-2xl border border-line shadow-card p-7 min-w-0 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Recent Job Requests</h2>
            <Link to="/admin/requests" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="font-semibold pb-3 pr-4">Service</th>
                  <th className="font-semibold pb-3 pr-4">Location</th>
                  <th className="font-semibold pb-3 pr-4">Customer</th>
                  <th className="font-semibold pb-3 pr-4">Date</th>
                  <th className="font-semibold pb-3 pr-4">Status</th>
                  <th className="font-semibold pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recent.map(job => {
                  const meta = JOB_STATUS_META[job.status];
                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold text-slate-900">{job.service}</span>
                        <span className="block text-[11px] text-slate-400">{jobRef(job.id)}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500">{job.location}</td>
                      <td className="py-3.5 pr-4 text-slate-500">{job.customer}</td>
                      <td className="py-3.5 pr-4 text-slate-400 whitespace-nowrap">{job.date}</td>
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
                    <td colSpan={6} className="py-10 text-center text-slate-400">No job requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-line shadow-card p-7 min-w-0">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Pending Verifications</h2>
              <Link to="/admin/verifications" className="text-sm font-semibold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <p className="text-sm text-slate-400 mt-1">Fundis waiting on document review</p>
          </div>

          {verifications.length ? (
            <ul className="divide-y divide-slate-50 -mx-1">
              {verifications.slice(0, 5).map(row => (
                <li key={row.userId} className="flex items-center gap-3 px-1 py-3.5">
                  <span className="w-9 h-9 rounded-full bg-navy-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    {initialsOf(row.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{row.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {row.trade || 'Fundi'} · {row.docs.length} document{row.docs.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link
                    to="/admin/verifications"
                    className="text-sm font-semibold text-primary hover:text-primary-dark shrink-0"
                  >
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-2">
              <ShieldCheck size={24} className="text-emerald-400" />
              <p className="text-sm font-semibold text-slate-600">No pending fundis</p>
              <p className="text-xs text-slate-400">Everything has been reviewed.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
