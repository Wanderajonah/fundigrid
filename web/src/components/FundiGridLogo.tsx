import { Link } from 'react-router-dom';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  compact?: boolean;
  to?: string;
}

export default function FundiGridLogo({ size = 'md', variant = 'dark', to = '/login' }: Props) {
  const sizes = { sm: 28, md: 34, lg: 44 };
  const s = sizes[size];
  const iconColor = variant === 'light' ? '#FFFFFF' : '#111111';

  return (
    <Link to={to} className="flex items-center gap-2.5 group">
      <svg width={s} height={s} viewBox="0 0 48 48" fill="none" className="flex-shrink-0">
        <path d="M12 8h18v4H16v6h12v4H16v14h-4V8z" fill={iconColor} />
        <path d="M28 12c5.5 0 10 4.5 10 10 0 6-10 18-10 18S18 28 18 22c0-5.5 4.5-10 10-10z" fill="#F5A623" />
        <circle cx="28" cy="22" r="4" fill={variant === 'light' ? '#111111' : '#FFFFFF'} />
        <circle cx="28" cy="22" r="1.5" fill="#F5A623" />
      </svg>
      <span className="text-lg font-extrabold tracking-tight" style={{ color: variant === 'light' ? '#FFF' : '#111' }}>
        Fundi<span className="text-primary">Grid</span>
      </span>
    </Link>
  );
}
