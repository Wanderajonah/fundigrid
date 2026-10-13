interface Props {
  data: { label: string; value: number }[];
  height?: number;
  // Draw every nth x-axis label (dense series such as a 30-day trend would
  // otherwise overlap). 1 keeps every label, as before.
  labelEvery?: number;
}

// Weekly count line chart (SVG so it inherits the console palette and needs
// no charting dependency). Flat data draws along the baseline, as in the
// reference design.
export default function LineChart({ data, height = 240, labelEvery = 1 }: Props) {
  const W = 640;
  const H = height;
  const pad = { top: 18, right: 16, bottom: 30, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = Math.max(...data.map(d => d.value), 1);
  // Counts are whole numbers, so never split the axis into fractions.
  const allIntegers = data.every(d => Number.isInteger(d.value));
  const step = allIntegers ? Math.max(1, niceStep(max / 4)) : niceStep(max / 4);
  const top = Math.max(Math.ceil(max / step) * step, step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const x = (i: number) =>
    pad.left + (data.length > 1 ? (i * innerW) / (data.length - 1) : innerW / 2);
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;

  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const area = data.length
    ? `${pad.left},${pad.top + innerH} ${points} ${x(data.length - 1)},${pad.top + innerH}`
    : '';

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Line chart">
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#E2E8F0"
              strokeDasharray="4 6"
            />
            <text x={pad.left - 10} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-xs">
              {t}
            </text>
          </g>
        ))}

        {area && <polygon points={area} fill="var(--color-primary)" opacity="0.08" />}
        {data.length > 0 && (
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <circle cx={x(i)} cy={y(d.value)} r="4" fill="var(--color-primary)" />
            {i % labelEvery === 0 && (
              <text
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-400 text-xs"
              >
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function niceStep(raw: number): number {
  const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}
