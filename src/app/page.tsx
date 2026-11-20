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
 *
 * R86 title screen: the SplashScreen chunk loads in PARALLEL with the app
 * and overlays it once both are ready. The app (incl. the R84 library
 * preload) keeps booting behind the animated intro — clicking Start reveals
 * a fully warmed-up app. If the splash chunk fails to load, the app still
 * starts normally (splash is strictly optional).
 */

function LoadingScreen() {
  return (
    <div
      className="h-screen w-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 40%, #0d0d2b 100%)',
      }}
    >
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">&#127925;</div>
        <p className="text-[#ff2d95] text-sm font-bold tracking-widest uppercase">Loading AfterTen Karaoke...</p>
      </div>
    </div>
  );
}

export default function Page() {
  const [AppComponent, setAppComponent] = useState<React.ComponentType | null>(null);
  const [SplashComponent, setSplashComponent] = useState<React.ComponentType<{ onEnter: () => void }> | null>(null);
  const [splashUnavailable, setSplashUnavailable] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
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

      // R86: title screen — small chunk, loads in parallel with the app.
      // A failure here must NEVER block the app (splashUnavailable flag).
      import('@/components/splash/splash-screen')
        .then((mod) => {
          if (!cancelled) setSplashComponent(() => mod.SplashScreen);
        })
        .catch(() => {
          if (!cancelled) setSplashUnavailable(true);
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
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 40%, #0d0d2b 100%)',
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

  // The loading screen stays up until the app AND the splash chunk are
  // ready (or the splash is known-unavailable) — this way the animated
  // title screen opens directly over the loader with no app flash-through.
  if (!AppComponent || (!SplashComponent && !splashUnavailable)) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppComponent />
      {!splashDone && SplashComponent && (
        <SplashComponent onEnter={() => setSplashDone(true)} />
      )}
    </Suspense>
  );
}
