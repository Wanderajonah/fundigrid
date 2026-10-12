import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'sky' | 'amber' | 'violet' | 'orange' | 'emerald' | 'gray';
  icon?: ReactNode;
  className?: string;
}

const TONES: Record<NonNullable<Props['tone']>, { bg: string; text: string }> = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  gray: { bg: 'bg-slate-50', text: 'text-slate-500' },
};

export default function StatCard({ label, value, sub, tone = 'gray', icon, className }: Props) {
  const t = TONES[tone];
  return (
    <div className={`bg-white rounded-2xl border border-line shadow-card p-5 flex flex-col gap-3 min-w-0 ${className || ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide truncate">{label}</p>
        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${t.bg} ${t.text}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
