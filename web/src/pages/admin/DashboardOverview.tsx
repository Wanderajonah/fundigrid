import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, HardHat, Scissors, ShieldCheck, Users, Wallet, Wrench } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatCard from './components/StatCard';
import DonutChart from './components/DonutChart';
import LineChart from './components/LineChart';
import { useAdminStore } from './context/AdminStore';
import { initialsOf, JOB_STATUS_META, formatUGX, type JobStatus } from './data/meta';
import { jobRef } from '../../lib/jobRef';
import { categoryIcon } from '../../lib/categories';

// Status pills on this table share one height and type scale; only the tint,
// text colour and dot vary per status.
const JOB_PILL: Record<JobStatus, { cls: string; dot: string }> = {
  New: { cls: 'bg-[#E6F3FD] text-[#075985]', dot: '#0284C7' },
  'Under Review': { cls: 'bg-[#FFF3DE] text-[#92400E]', dot: '#D97706' },
  'Surveyor Assigned': { cls: 'bg-[#EEE8FD] text-[#5B21B6]', dot: '#7C3AED' },
  'Estimate Ready': { cls: 'bg-[#FFEDD5] text-[#9A3412]', dot: '#EA580C' },
  Completed: { cls: 'bg-[#E3F6EF] text-[#047857]', dot: '#059669' },
  Cancelled: { cls: 'bg-[#FDE7EC] text-[#BE123C]', dot: '#E11D48' },
};

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
        <section className="bg-white rounded-[20px] border border-line shadow-card p-7 min-w-0 xl:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Recent Job Requests</h2>
            <Link to="/admin/requests" className="text-sm font-semibold text-[#B45309] hover:text-[#92400E] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[640px] whitespace-nowrap">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#646B7A]">
                  <th className="font-semibold pb-3 pr-4">Service</th>
                  <th className="font-semibold pb-3 pr-4">Location</th>
                  <th className="font-semibold pb-3 pr-4">Customer</th>
                  <th className="font-semibold pb-3 pr-4">Date</th>
                  <th className="font-semibold pb-3 pr-4">Status</th>
                  <th className="font-semibold pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0ECE6]">
                {recent.map(job => {
                  const meta = JOB_STATUS_META[job.status];
                  const pill = JOB_PILL[job.status];
                  const plumbing = /plumb/i.test(job.service);
                  const tailoring = /tailor|seamstress|dressmak/i.test(job.service);
                  const ServiceIcon = tailoring ? Scissors : plumbing ? Wrench : categoryIcon(job.service);
                  const chipCls = plumbing
                    ? 'bg-[#E7F0FE] text-[#1D4ED8]'
                    : tailoring
                      ? 'bg-[#FDE7F1] text-[#BE185D]'
                      : 'bg-[#F0ECE6] text-[#5A6272]';
                  return (
                    <tr key={job.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3.5 pr-4">
                        <span className="flex items-center gap-3">
                          <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${chipCls}`}>
                            <ServiceIcon size={18} />
                          </span>
                          <span>
                            <span className="block font-semibold text-slate-900">{job.service}</span>
                            <span className="block text-[11px] text-slate-400">{jobRef(job.id)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-4">
                        {job.location ? (
                          <span className="text-[#3B4558]">{job.location}</span>
                        ) : (
                          <span className="text-slate-400">Not provided</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="flex items-center gap-2.5">
                          <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-[#EFEAE3] text-[#3B4558] flex items-center justify-center text-[11px] font-bold">
                            {initialsOf(job.customer)}
                          </span>
                          <span className="text-slate-700">{job.customer}</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-[#3B4558]">{job.date}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-bold ${pill.cls}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: pill.dot }} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          to={`/admin/requests/${job.id}`}
                          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-line text-sm font-bold text-slate-900 hover:bg-[#FAF8F5] transition-colors"
                        >
                          View <ArrowRight size={14} />
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

        <section className="bg-white rounded-[20px] border border-line shadow-card p-7 min-w-0 self-start">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 whitespace-nowrap">Pending Verifications</h2>
              <Link to="/admin/verifications" className="text-sm font-semibold text-[#B45309] hover:text-[#92400E] transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0">
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
            <div className="rounded-2xl border border-dashed border-line bg-page p-8 flex flex-col items-center text-center gap-2">
              <span className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck size={24} className="text-emerald-600" />
              </span>
              <p className="text-sm font-bold text-slate-900">No pending fundis</p>
              <p className="text-xs text-slate-500">Everything has been reviewed.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
