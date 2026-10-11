interface Props {
  data: { label: string; value: number; color: string }[];
  centerValue?: string;
  centerLabel?: string;
  size?: number;
  showLegend?: boolean;
  // 'inline' puts the legend beside the ring; 'stacked' centres the ring with
  // the legend in columns underneath (the dashboard reference layout).
  legendLayout?: 'inline' | 'stacked';
}

export default function DonutChart({
  data,
  centerValue,
  centerLabel,
  size = 190,
  showLegend = true,
  legendLayout = 'inline',
}: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const lengths = data.map(d => (d.value / total) * c);
  const offsets: number[] = [];
  lengths.reduce((running, len) => {
    offsets.push(running);
    return running + len;
  }, 0);

  const segments = data.map((d, i) => (
    <circle
      key={d.label}
      cx={size / 2}
      cy={size / 2}
      r={r}
      fill="none"
      stroke={d.color}
      strokeWidth={stroke}
      strokeDasharray={`${Math.max(lengths[i] - 2, 0)} ${c - Math.max(lengths[i] - 2, 0)}`}
      strokeDashoffset={-offsets[i]}
      strokeLinecap="butt"
    />
  ));

  const legend = showLegend && (
    <ul className={legendLayout === 'stacked' ? 'grid grid-cols-2 gap-x-8 gap-y-3' : 'space-y-3 min-w-0'}>
      {data.map(d => (
        <li key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
          <span className="text-slate-500">{d.label}</span>
          <span className="ml-auto font-semibold text-slate-900">
            {d.value} <span className="text-slate-400 font-normal">({Math.round((d.value / total) * 100)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );

  const ring = (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        {segments}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-[11px] text-slate-400">{centerLabel}</span>}
          {centerValue && <span className="text-3xl font-bold text-slate-900">{centerValue}</span>}
        </div>
      )}
    </div>
  );

  if (legendLayout === 'stacked') {
    return (
      <div className="flex flex-col items-center gap-7">
        {ring}
        {showLegend && legend}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-8 flex-wrap">
      {ring}
      {showLegend && legend}
    </div>
  );
}
