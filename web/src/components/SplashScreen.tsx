import { useEffect, useState } from 'react';
import logoWhite from '../assets/logo-white.png';

const DURATION_MS = 5000;

/**
 * Full-screen brand splash shown on every launch. Animates for 5 seconds,
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
      <img
        src={logoWhite}
        alt=""
        aria-hidden
        className="splash-mark relative h-20 w-auto"
      />

      {/* Wordmark */}
      <h1 className="relative mt-5 text-3xl font-extrabold tracking-tight text-white">
        <span className="splash-word inline-block">Fundi</span>
        <span className="splash-word splash-word-2 inline-block text-primary">Grid</span>
      </h1>

      <p className="splash-tagline relative mt-2 text-sm text-white/60">
        Skilled artisans, one grid.
      </p>

      {/* Circular progress ring: stroke draws itself 0% → 100% over 5s */}
      <svg
        viewBox="0 0 64 64"
        className="splash-ring relative mt-8 h-14 w-14"
        fill="none"
      >
        {/* Track */}
        <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        {/* Progress: circumference ≈ 175.93; dashoffset animates full → 0 */}
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="#F5A623"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="175.93"
          className="splash-ring-progress"
        />
      </svg>
    </div>
  );
}
