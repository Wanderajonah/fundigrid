import { useEffect, useState, type ReactNode } from 'react';
import { Building2, Bell, CreditCard, Server, Check, Loader2 } from 'lucide-react';
import PageHeader from './components/PageHeader';
import ChangePasswordCard from '../../components/ChangePasswordCard';
import {
  ApiError,
  getPlatformSettings,
  savePlatformSettings,
  type SettingsToggle,
} from '../../lib/api';

const SECTIONS = [
  { key: 'general', label: 'General Settings', desc: 'Platform contact and matching defaults', icon: Building2 },
  { key: 'notifications', label: 'Notification Settings', desc: 'Alerts for new jobs and updates', icon: Bell },
  { key: 'payments', label: 'Payment Settings', desc: 'Currency, fees and settlement details', icon: CreditCard },
  { key: 'system', label: 'System Settings', desc: 'Auto-assignment, approvals and limits', icon: Server },
];

const TOGGLES = [
  { key: 'newRequest', label: 'New job request alerts', desc: 'Notify admins when a client posts a request', on: true },
  { key: 'quoteSent', label: 'Quote alerts', desc: 'Notify admins when a fundi sends a price quote', on: true },
  { key: 'smsUpdates', label: 'SMS updates to customers', desc: 'Send booking status changes by SMS', on: true },
  { key: 'weeklyDigest', label: 'Weekly email digest', desc: 'Summary of requests, jobs and revenue every Monday', on: false },
  { key: 'maintenance', label: 'Maintenance mode', desc: 'Take the platform offline for scheduled work', on: false },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-900 mb-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1.5">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';

type Values = {
  adminName: string;
  adminEmail: string;
  serviceRadius: string;
  commissionRate: string;
  currency: string;
  settlementAccount: string;
  clientFeeRate: string;
  minJobAmount: string;
  autoApprovalFundis: string;
  disputeResolution: string;
};

const EMPTY: Values = {
  adminName: '',
  adminEmail: '',
  serviceRadius: '',
  commissionRate: '',
  currency: 'UGX',
  settlementAccount: '',
  clientFeeRate: '',
  minJobAmount: '',
  autoApprovalFundis: '',
  disputeResolution: '',
};

export default function SettingsPage() {
  const [section, setSection] = useState('general');
  const [values, setValues] = useState<Values>(EMPTY);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(TOGGLES.map(t => [t.key, t.on])),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    getPlatformSettings()
      .then(s => {
        if (!alive) return;
        setValues({
          adminName: s.adminName || '',
          adminEmail: s.adminEmail || '',
                  serviceRadius: String(s.serviceRadius ?? ''),
          commissionRate: String(s.commissionRate ?? ''),
          currency: s.paymentIntegrations?.currency || s.currency || 'UGX',
          settlementAccount: s.paymentIntegrations?.settlementAccount || '',
          clientFeeRate: String(s.clientFeeRate ?? ''),
          minJobAmount: String(s.minJobAmount ?? ''),
          autoApprovalFundis: s.autoApprovalFundis || '',
          disputeResolution: s.disputeResolution || '',
        });
        if (Array.isArray(s.notifications) && s.notifications.length) {
          setToggles(prev => {
            const next = { ...prev };
            s.notifications.forEach((t: SettingsToggle) => {
              if (t && typeof t.key === 'string') next[t.key] = Boolean(t.on);
            });
            return next;
          });
        }
        setError('');
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Could not reach the server'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await savePlatformSettings({
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        serviceRadius: values.serviceRadius,
        commissionRate: values.commissionRate,
        clientFeeRate: values.clientFeeRate,
        minJobAmount: values.minJobAmount,
        autoApprovalFundis: values.autoApprovalFundis,
        disputeResolution: values.disputeResolution,
        // The notifications column is the preferences blob — it holds every
        // on/off switch on this screen, not just the SMS alerts.
        notifications: TOGGLES.map(t => ({ key: t.key, on: Boolean(toggles[t.key]) })),
        paymentIntegrations: {
          currency: values.currency,
          settlementAccount: values.settlementAccount,
        },
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the settings');
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues(prev => ({ ...prev, [key]: e.target.value }));

  if (loading) {
    return (
      <div className="max-w-[1360px] mx-auto py-24 text-center text-slate-500">
        <Loader2 size={18} className="inline animate-spin mr-2" /> Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto">
      <PageHeader title="Settings" subtitle="Configure how your platform behaves" />

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1 space-y-2">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  active ? 'bg-white border-primary/40 shadow-sm' : 'bg-white border-line shadow-card hover:border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-primary/15 text-primary-dark' : 'bg-slate-50 text-slate-400'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${active ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
                    <span className="block text-xs text-slate-400 truncate">{s.desc}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-line shadow-card p-7">
          <div className="flex items-center justify-between gap-4 mb-7 pb-5 border-b border-slate-50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{SECTIONS.find(s => s.key === section)?.label}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{SECTIONS.find(s => s.key === section)?.desc}</p>
            </div>
            <button
              onClick={() => void save()}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                saved ? 'bg-emerald-50 text-emerald-600' : 'bg-navy-900 text-white hover:bg-navy-800'
              }`}
            >
              {saved ? <><Check size={15} /> Saved</> : saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save changes'}
            </button>
          </div>

          {section === 'general' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Admin name"><input className={inputCls} value={values.adminName} onChange={set('adminName')} /></Field>
              <Field label="Admin email"><input className={inputCls} value={values.adminEmail} onChange={set('adminEmail')} inputMode="email" /></Field>
              <Field label="Service radius" hint="Maximum distance (km) a fundi is matched to a job">
                <div className="relative">
                  <input className={inputCls} value={values.serviceRadius} onChange={set('serviceRadius')} inputMode="decimal" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">km</span>
                </div>
              </Field>
              <Field label="Platform commission" hint="Deducted from each completed job">
                <div className="relative">
                  <input className={inputCls} value={values.commissionRate} onChange={set('commissionRate')} inputMode="decimal" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </Field>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-1">
              {TOGGLES.slice(0, 4).map(t => (
                <div key={t.key} className="flex items-center justify-between gap-5 py-4 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={toggles[t.key]}
                    aria-label={t.label}
                    onClick={() => setToggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                    className={`w-11 h-6 rounded-full shrink-0 transition-colors ${toggles[t.key] ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${toggles[t.key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {section === 'payments' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Default currency">
                <select className={inputCls} value={values.currency} onChange={set('currency')}>
                  <option>UGX</option>
                  <option>USD</option>
                  <option>KES</option>
                </select>
              </Field>
              <Field label="Settlement account"><input className={inputCls} value={values.settlementAccount} onChange={set('settlementAccount')} /></Field>
              <Field label="Client fee" hint="Added to every booking the client pays">
                <div className="relative">
                  <input className={inputCls} value={values.clientFeeRate} onChange={set('clientFeeRate')} inputMode="decimal" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </Field>
              <Field label="Minimum job amount"><input className={inputCls} value={values.minJobAmount} onChange={set('minJobAmount')} inputMode="numeric" /></Field>
            </div>
          )}

          {section === 'system' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Auto-approval threshold" hint="Jobs a fundi completes before verification is automatic">
                  <input className={inputCls} value={values.autoApprovalFundis} onChange={set('autoApprovalFundis')} />
                </Field>
                <Field label="Dispute resolution window">
                  <input className={inputCls} value={values.disputeResolution} onChange={set('disputeResolution')} />
                </Field>
              </div>
              <div className="space-y-1">
                {TOGGLES.slice(4).map(t => (
                  <div key={t.key} className="flex items-center justify-between gap-5 py-4 border-b border-slate-50 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={toggles[t.key]}
                      aria-label={t.label}
                      onClick={() => setToggles(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
                      className={`w-11 h-6 rounded-full shrink-0 transition-colors ${toggles[t.key] ? 'bg-primary' : 'bg-slate-200'}`}
                    >
                      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${toggles[t.key] ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 max-w-[720px]">
        <ChangePasswordCard showWeakHint />
      </div>
    </div>
  );
}
