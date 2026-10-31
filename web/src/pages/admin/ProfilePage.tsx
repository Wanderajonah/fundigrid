import { Mail, Phone, ShieldCheck } from 'lucide-react';
import PageHeader from './components/PageHeader';
import ChangePasswordCard from '../../components/ChangePasswordCard';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const name = user?.name?.trim() || 'System Administrator';
  const email = user?.email || '—';
  const phone = user?.phone || '—';
  const initial = (name[0] || 'A').toUpperCase();

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your administrator account details." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="h-fit rounded-2xl border border-line bg-white p-7 shadow-card">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#0F766E] text-xl font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-slate-900">{name}</h2>
              <p className="text-sm text-slate-500">System Administrator</p>
            </div>
          </div>

          <dl className="mt-7 space-y-4 border-t border-line pt-6">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400">
                <Mail size={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</dt>
                <dd className="truncate text-sm font-medium text-slate-900">{email}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400">
                <Phone size={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
                <dd className="truncate text-sm font-medium text-slate-900">{phone}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-50 text-slate-400">
                <ShieldCheck size={16} />
              </span>
              <div className="min-w-0">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Role</dt>
                <dd className="text-sm font-medium text-slate-900">Administrator</dd>
              </div>
            </div>
          </dl>
        </section>

        <ChangePasswordCard showWeakHint />
      </div>
    </div>
  );
}
