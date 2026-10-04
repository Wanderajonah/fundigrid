interface Props {
  label: string;
  cls: string;
  dot?: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ label, cls, dot, size = 'sm' }: Props) {
  const pad = size === 'md' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad} ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </span>
  );
}
