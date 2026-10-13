import { useEffect, useState } from 'react';

const DURATION_MS = 3000;

/**
 * Full-screen brand splash shown on every launch. Animates for 3 seconds,
 * fades out, then unmounts itself. Pure CSS keyframes — no animation library.
 */
export default function SplashScreen() {
  const [state, setState] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const fadeTimer = setTimeout(() => setState('fading'), DURATION_MS);
    const goneTimer = setTimeout(() => setState('gone'), DURATION_MS + 600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (state === 'gone') return null;

  return (
    <div
      aria-hidden
      className={
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-navy-950 ' +
        (state === 'fading' ? 'splash-fade-out' : 'splash-enter')
      }
    >
      {/* Soft amber glow behind the mark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="splash-glow h-[420px] w-[420px] rounded-full bg-primary/15 blur-3xl" />
      </div>

      {/* Mark */}
      <svg
        width="88"
        height="88"
        viewBox="0 0 48 48"
        fill="none"
        className="splash-mark relative"
      >
        <path d="M12 8h18v4H16v6h12v4H16v14h-4V8z" fill="#FFFFFF" />
        <path d="M28 12c5.5 0 10 4.5 10 10 0 6-10 18-10 18S18 28 18 22c0-5.5 4.5-10 10-10z" fill="#F5A623" />
        <circle cx="28" cy="22" r="4" fill="#111111" />
        <circle cx="28" cy="22" r="1.5" fill="#F5A623" />
      </svg>

      {/* Wordmark */}
      <h1 className="relative mt-5 text-3xl font-extrabold tracking-tight text-white">
        <span className="splash-word inline-block">Fundi</span>
        <span className="splash-word splash-word-2 inline-block text-primary">Grid</span>
      </h1>

      <p className="splash-tagline relative mt-2 text-sm text-white/60">
        Skilled artisans, one grid.
      </p>

      {/* Progress bar tied to the 3s duration */}
      <div className="absolute bottom-16 h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
        <div className="splash-progress h-full rounded-full bg-primary" />
      </div>
    </div>
  );
}
