import { useEffect, useState } from 'react';

const DURATION_MS = 2500;

/**
 * Full-screen splash shown on every launch. Plain white page with a single
 * cyan spinner, then it fades out and unmounts itself. Pure CSS keyframes.
 */
export default function SplashScreen() {
  const [state, setState] = useState<'visible' | 'fading' | 'gone'>('visible');

  useEffect(() => {
    const fadeTimer = setTimeout(() => setState('fading'), DURATION_MS);
    const goneTimer = setTimeout(() => setState('gone'), DURATION_MS + 450);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (state === 'gone') return null;

  return (
    <div
      className={
        'fixed inset-0 z-[100] flex items-center justify-center bg-white ' +
        (state === 'fading' ? 'splash-fade-out' : 'splash-enter')
      }
    >
      <span className="splash-ripple" role="status" aria-label="Loading">
        <span className="splash-ripple-core" />
      </span>
    </div>
  );
}
