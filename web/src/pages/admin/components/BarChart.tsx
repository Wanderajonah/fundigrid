interface Props {
  data: { label: string; value: number }[];
  height?: number;
}

export default function BarChart({ data, height = 220 }: Props) {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-4 sm:gap-6" style={{ height }}>
        {data.map(d => {
          const pct = Math.round((d.value / max) * 100);
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0 h-full">
              <span className="text-xs font-semibold text-slate-900">{d.value}</span>
              <div
                className="w-full max-w-[46px] rounded-t-lg bg-primary hover:bg-primary-dark transition-colors"
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 sm:gap-6 mt-3">
        {data.map(d => (
          <p key={d.label} className="flex-1 text-center text-[11px] text-slate-400 truncate">{d.label}</p>
        ))}
      </div>
    </div>
  );
}
