'use client';

import { useState, useEffect, Suspense } from 'react';

/**
 * Two-phase loading strategy to prevent TDZ errors.
 *
 * Phase 1 (this file): Minimal page with zero heavy imports.
 *   Only imports React primitives (useState, useEffect, Suspense).
 *   Renders a loading screen while waiting.
 *
 * Phase 2 (karaoke-app.tsx): The full app with all screens, stores, hooks.
 *   Loaded via a setTimeout(0) import AFTER the page has mounted,
 *   guaranteeing React's internal runtime is fully initialized
 *   before any heavy modules are evaluated.
 */

function LoadingScreen() {
  return (
    <div
      className="h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0014 0%, #140028 50%, #0a0014 100%)',
      }}
    >
      {/* Animated gradient border at bottom */}
      <div className="eleven-animated-border-bottom" />

      <div className="text-center">
        {/* Logo with pulsing glow */}
        <div
          className="mb-8"
          style={{
            animation: 'eleven-logo-pulse 2.5s ease-in-out infinite',
          }}
        >
          <img
            src="/logo-retro.png"
            alt="Karaoke Eleven"
            className="h-[120px] w-auto"
          />
        </div>

        {/* Title — neon cyan glow */}
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight mb-3"
          style={{
            color: '#00e5ff',
            textShadow: '0 0 7px #00e5ff, 0 0 20px #00e5ff, 0 0 42px rgba(0,229,255,0.6)',
          }}
        >
          Karaoke Eleven
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
          Loading...
        </p>
      </div>
    </div>
  );
}

export default function Page() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Use setTimeout(0) to defer the heavy import to the NEXT microtask,
    // ensuring the current render cycle completes and React's runtime
    // is fully initialized before any user modules are evaluated.
    const timer = setTimeout(() => {
      import('./karaoke-app')
        .then((mod) => {
          if (!cancelled) {
            setAppComponent(() => mod.default);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            // eslint-disable-next-line no-console
            console.error('[Page] Failed to load karaoke-app:', err);
            setError(err instanceof Error ? err.message : String(err));
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (error) {
    return (
      <div
        className="h-screen w-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0a0014 0%, #140028 50%, #0a0014 100%)',
        }}
      >
        <div className="text-center max-w-md p-6">
          <div className="text-4xl mb-4">&#9888;&#65039;</div>
          <p className="text-[#ff2d95] text-sm mb-4 font-mono break-all">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#ff2d95] to-[#bf5af2] hover:from-[#ff55aa] hover:to-[#cc77ff] text-white px-6 py-2.5 rounded-lg font-bold transition-colors retro-box-glow-pink"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!AppComponent) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppComponent />
    </Suspense>
  );
}
