import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, BadgeCheck, MessageSquare, Ban, Briefcase, Clock } from 'lucide-react';
import StatusBadge from './components/StatusBadge';
import Tabs from './components/Tabs';
import { useAdminStore } from './context/AdminStore';
import { FUNDI_STATUS_META, initialsOf } from './data/meta';
import { jobRef } from '../../lib/jobRef';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'jobs', label: 'Jobs' },
];

const REVIEWS = [
  { who: 'Joel K.', rating: 5, when: 'Sep 18, 2025', text: 'Work was finished earlier than planned and the site was left spotless. Would hire again.' },
  { who: 'Natalia S.', rating: 5, when: 'Sep 09, 2025', text: 'Clear communication from the first call and the quote matched the final invoice exactly.' },
  { who: 'David D.', rating: 4, when: 'Aug 27, 2025', text: 'Solid craftsmanship. Arrived 30 minutes late but called ahead to let me know.' },
  { who: 'Sarah N.', rating: 5, when: 'Aug 14, 2025', text: 'Tidied up after every working day and explained how to maintain the installation.' },
];

export default function FundiProfilePage() {
  const { id } = useParams();
  const { getFundi, jobs, setFundiStatus, error } = useAdminStore();
  const [tab, setTab] = useState('overview');
  const fundi = getFundi(id);

  if (!fundi) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-lg font-bold text-slate-900">Fundi not found</p>
        <Link to="/admin/fundis" className="inline-block mt-6 text-sm font-semibold text-primary hover:text-primary-dark">Back to fundis</Link>
      </div>
    );
  }

  const meta = FUNDI_STATUS_META[fundi.status];
  const tradeJob = fundi.trade.replace(/er$/, 'ing').toLowerCase();
  const relatedJobs = jobs.filter(j => j.service.toLowerCase().includes(tradeJob.slice(0, 4))).slice(0, 4);
  const shownJobs = relatedJobs.length > 0 ? relatedJobs : jobs.slice(0, 4);

  return (
    <div className="max-w-[1100px] mx-auto">
      <Link to="/admin/fundis" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to fundis
      </Link>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-line shadow-card p-7 mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-navy-900 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initialsOf(fundi.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{fundi.name}</h1>
              {fundi.verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <BadgeCheck size={13} /> Verified
                </span>
              )}
              <StatusBadge label={meta.label} cls={meta.cls} />
            </div>
            <p className="text-sm text-slate-400 mt-1.5 flex items-center gap-3 flex-wrap">
              <span>{fundi.trade}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={13} /> {fundi.location}</span>
              <span className="inline-flex items-center gap-1"><Star size={13} className="text-primary" /> {fundi.rating} ({fundi.reviews} reviews)</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <MessageSquare size={15} /> Message
            </button>
            <button
              onClick={() => void setFundiStatus(fundi.id, fundi.status === 'Suspended' ? 'Active' : 'Suspended').catch(() => undefined)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                fundi.status === 'Suspended'
                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
              }`}
            >
              <Ban size={15} /> {fundi.status === 'Suspended' ? 'Restore' : 'Suspend'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-line shadow-card p-7 min-w-0">
          <Tabs tabs={TABS} active={tab} onChange={setTab} variant="underline" />

          {tab === 'overview' && (
            <div className="space-y-7">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">About</h3>
                <p className="text-sm leading-relaxed text-slate-500">{fundi.about}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <Briefcase size={15} />, label: 'Experience', value: `${fundi.experience} years` },
                  { icon: <MapPin size={15} />, label: 'Location', value: fundi.location },
                  { icon: <Clock size={15} />, label: 'Availability', value: fundi.availability },
                  { icon: <Star size={15} />, label: 'Completed Jobs', value: String(fundi.completedJobs) },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-line">
                    <span className="text-primary mt-0.5">{item.icon}</span>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</p>
                      <p className="text-sm font-medium text-slate-700 mt-0.5">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <ul className="divide-y divide-slate-50">
              {REVIEWS.map(r => (
                <li key={r.who + r.when} className="py-5 first:pt-0">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px] font-bold">
                        {initialsOf(r.who)}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{r.who}</p>
                    </div>
                    <span className="text-xs text-slate-400">{r.when}</span>
                  </div>
                  <p className="text-primary text-xs mb-1.5">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{r.text}</p>
                </li>
              ))}
            </ul>
          )}

          {tab === 'jobs' && (
            <ul className="divide-y divide-slate-50">
              {shownJobs.map(job => (
                <li key={job.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{job.service} · {jobRef(job.id)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{job.location} · {job.date}</p>
                  </div>
                  <StatusBadge label={job.status} cls="bg-slate-100 text-slate-500" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-line shadow-card p-7">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Phone', fundi.phone],
                ['Joined', fundi.joined],
                ['Trade', fundi.trade],
                ['Rating', `${fundi.rating} / 5.0`],
                ['Reviews', String(fundi.reviews)],
                ['Status', meta.label],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="font-medium text-slate-700 text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-navy-900 rounded-2xl p-7 text-white">
            <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Completion rate</p>
            <p className="text-3xl font-bold">{Math.round((fundi.completedJobs / (fundi.completedJobs + 4)) * 100)}%</p>
            <p className="text-sm text-white/50 mt-2">{fundi.completedJobs} completed jobs on record</p>
          </div>
        </div>
      </div>
    </div>
  );
}
