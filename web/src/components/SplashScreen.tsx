import { useEffect, useState } from 'react';
import circleTopLeft from '../assets/circle.png';
import squareBottomRight from '../assets/square.png';
import logoWhite from '../assets/logo-white.png';

const DURATION_MS = 15000;

/**
 * Full-screen splash shown on every launch. Holds for 15 seconds, fades out,
 * then unmounts itself. Pure CSS keyframes — no animation library.
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
        'fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-navy-950 ' +
        (state === 'fading' ? 'splash-fade-out' : 'splash-enter')
      }
    >
      {/* Corner art: circle bleeds off the top-left, square off the bottom-right */}
      <img
        src={circleTopLeft}
        alt=""
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 w-[420px] select-none sm:w-[560px] lg:w-[680px]"
      />
      <img
        src={squareBottomRight}
        alt=""
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-[480px] select-none sm:w-[620px] lg:w-[760px]"
      />

      {/* Mark */}
      <img
        src={logoWhite}
        alt=""
        aria-hidden
        className="relative mb-7 h-20 w-auto"
      />

      {/* Wipe reveal: a second copy of the wordmark fills in left → right.
          Text lives in the DOM (not `content`) so "Grid" can take the brand
          colour in both the ghost and the revealed layer. */}
      <span className="splash-loader">
        Fundi<span className="splash-loader-brand">Grid</span>
        <span className="splash-loader-fill" aria-hidden>
          Fundi<span className="splash-loader-brand">Grid</span>
        </span>
      </span>

      {/* Tagline under the loader */}
      <p className="relative mt-6 max-w-[19rem] text-center text-sm leading-relaxed tracking-[0.14em] text-slate-300/75 sm:max-w-md sm:text-base">
        Connecting skilled artisans with clients across Uganda
      </p>
    </div>
  );
}
