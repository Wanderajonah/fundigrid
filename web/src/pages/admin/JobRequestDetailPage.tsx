import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, CalendarClock, Camera, Phone, MessageSquare, UserCheck, Image as ImageIcon, Calculator } from 'lucide-react';
import PageHeader from './components/PageHeader';
import StatusBadge from './components/StatusBadge';
import Tabs from './components/Tabs';
import { useAdminStore } from './context/AdminStore';
import { JOB_STATUS_META, initialsOf } from './data/meta';
import { jobRef } from '../../lib/jobRef';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'photos', label: 'Photos' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'activity', label: 'Activity' },
];

const PHOTO_TONES = ['from-amber-100 to-orange-100', 'from-sky-100 to-indigo-100', 'from-emerald-100 to-teal-100', 'from-rose-100 to-pink-100', 'from-violet-100 to-purple-100', 'from-lime-100 to-green-100'];

export default function JobRequestDetailPage() {
  const { id } = useParams();
  const { getJob, surveyors, loading } = useAdminStore();
  const [tab, setTab] = useState('overview');
  const job = getJob(id);

  if (!job && loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-sm text-slate-400">Loading request…</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <p className="text-lg font-bold text-slate-900">Request not found</p>
        <p className="text-sm text-slate-400 mt-2">This job request may have been removed.</p>
        <Link to="/admin/requests" className="inline-block mt-6 text-sm font-semibold text-primary hover:text-primary-dark">Back to job requests</Link>
      </div>
    );
  }

  const meta = JOB_STATUS_META[job.status];
  const surveyor = surveyors.find(s => s.id === job.surveyorId);
  const assignedName = surveyor?.name || job.surveyorName || '';
  const photos = Array.from({ length: job.photos });
  const estimateReady = job.status === 'Estimate Ready';

  const timeline = [
    { label: 'Request submitted', done: true, when: job.date },
    { label: 'Under review by admin', done: job.status !== 'New', when: job.status === 'New' ? 'Pending' : job.date },
    { label: 'Surveyor assigned', done: Boolean(assignedName), when: assignedName ? job.date : 'Pending' },
    { label: 'Estimate submitted', done: estimateReady, when: estimateReady ? job.date : 'Pending' },
    { label: 'Completed', done: job.status === 'Completed', when: job.status === 'Completed' ? job.date : 'Pending' },
  ];

  const activity = [
    { who: 'System', what: 'Request created and queued for review', when: job.date },
    { who: 'Admin', what: `Status set to “${job.status}”`, when: job.date },
    ...(assignedName ? [{ who: 'Admin', what: `Assigned ${assignedName} as quantity surveyor`, when: job.date }] : []),
    ...(estimateReady ? [{ who: 'Surveyor', what: 'Submitted the cost estimate', when: job.date }] : []),
    { who: job.customer, what: `Uploaded ${job.photos} photo${job.photos === 1 ? '' : 's'} to the request`, when: job.date },
  ];

  return (
    <div className="max-w-[1360px] mx-auto">
      <Link to="/admin/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors mb-6">
        <ArrowLeft size={16} /> Back to job requests
      </Link>

      <PageHeader title={`Job Request ${jobRef(job.id)}`} subtitle={`${job.service} · ${job.location} · ${job.date}`}>
        <StatusBadge label={meta.label} cls={meta.cls} dot={meta.dot} size="md" />
        <Link
          to={`/admin/requests/${job.id}/assign`}
          className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold px-5 py-3 rounded-xl text-sm transition-all"
        >
          <UserCheck size={16} /> {assignedName ? 'Change Surveyor' : 'Assign Quantity Surveyor'}
        </Link>
        <Link
          to={`/admin/estimates/${job.id}`}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-slate-900 font-semibold px-6 py-3 rounded-xl text-sm transition-all"
        >
          <Calculator size={16} /> {estimateReady ? 'View Estimate' : 'Estimate'}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <Tabs tabs={TABS} active={tab} onChange={setTab} variant="underline" />

            {tab === 'overview' && (
              <div className="space-y-7">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Job Description</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{job.description}</p>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Service Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: <MapPin size={15} />, label: 'Location', value: job.address },
                      { icon: <CalendarClock size={15} />, label: 'Scheduled', value: job.scheduledFor },
                      { icon: <Camera size={15} />, label: 'Photos', value: `${job.photos} uploaded` },
                      { icon: <UserCheck size={15} />, label: 'Surveyor', value: assignedName || 'Not assigned yet' },
                    ].map(item => (
                      <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-primary mt-0.5">{item.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</p>
                          <p className="text-sm font-medium text-slate-700 mt-0.5">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'photos' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((_, i) => (
                  <div key={i} className={`aspect-[4/3] rounded-xl bg-gradient-to-br ${PHOTO_TONES[i % PHOTO_TONES.length]} flex items-center justify-center text-slate-400`}>
                    <ImageIcon size={22} />
                  </div>
                ))}
                {job.photos === 0 && <p className="col-span-full text-sm text-slate-400 py-8 text-center">No photos were uploaded with this request.</p>}
              </div>
            )}

            {tab === 'timeline' && (
              <ol className="relative border-l border-slate-100 ml-2 space-y-7">
                {timeline.map(item => (
                  <li key={item.label} className="ml-6">
                    <span className={`absolute -left-[7px] mt-1 w-3.5 h-3.5 rounded-full border-2 border-white ${item.done ? 'bg-primary' : 'bg-slate-200'}`} />
                    <p className={`text-sm font-semibold ${item.done ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.when}</p>
                  </li>
                ))}
              </ol>
            )}

            {tab === 'activity' && (
              <ul className="divide-y divide-slate-50">
                {activity.map((a, i) => (
                  <li key={i} className="py-4 flex items-start gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px] font-bold">
                      {initialsOf(a.who)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700"><span className="font-semibold text-slate-900">{a.who}</span> — {a.what}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.when}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Customer</h3>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-navy-900 text-white flex items-center justify-center text-sm font-bold">
                {initialsOf(job.customer)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{job.customer}</p>
                <p className="text-sm text-slate-400">{job.customerPhone}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <Phone size={15} /> Call
              </button>
              <button className="inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                <MessageSquare size={15} /> Message
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900">Surveyor</h3>
              {surveyor && <StatusBadge label={surveyor.available ? 'Available' : 'Busy'} cls={surveyor.available ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} />}
            </div>
            {assignedName ? (
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/15 text-primary-dark flex items-center justify-center text-sm font-bold">
                  {initialsOf(assignedName)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{assignedName}</p>
                  <p className="text-sm text-slate-400">{surveyor?.specialty ?? 'Quantity Surveyor'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {surveyor ? `★ ${surveyor.rating} · ${surveyor.jobs} jobs` : estimateReady ? 'Estimate submitted' : 'Waiting for the estimate'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-5 text-center">
                <p className="text-sm text-slate-400">No surveyor assigned yet.</p>
                <Link to={`/admin/requests/${job.id}/assign`} className="inline-block mt-3 text-sm font-semibold text-primary hover:text-primary-dark">
                  Assign one now
                </Link>
              </div>
            )}
            {assignedName && (
              <Link
                to={`/admin/estimates/${job.id}`}
                className="block text-center mt-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {estimateReady ? 'View estimate' : 'Enter estimate'}
              </Link>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-900">Photos</h3>
              <span className="text-xs text-slate-400">{job.photos} uploaded</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((_, i) => (
                <div key={i} className={`aspect-square rounded-lg bg-gradient-to-br ${PHOTO_TONES[i % PHOTO_TONES.length]} flex items-center justify-center text-slate-400`}>
                  <ImageIcon size={16} />
                </div>
              ))}
            </div>
            {job.photos > 6 && (
              <button className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                View all photos
              </button>
            )}
            {job.photos === 0 && <p className="text-sm text-slate-400 py-4 text-center">No photos yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
