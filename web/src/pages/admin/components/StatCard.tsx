import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'sky' | 'amber' | 'violet' | 'orange' | 'emerald' | 'gray';
  icon?: ReactNode;
}

const TONES: Record<NonNullable<Props['tone']>, { bg: string; text: string }> = {
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-500' },
};

export default function StatCard({ label, value, sub, tone = 'gray', icon }: Props) {
  const t = TONES[tone];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-400 truncate">{label}</p>
        <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${t.bg} ${t.text}`}>
          {icon}
        </span>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {sub && <p className="text-xs text-gray-300 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}
