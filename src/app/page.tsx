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
      className="h-screen w-full flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1a0a2e 0%, #2a1a3e 40%, #1a0a2e 100%)',
      }}
    >
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">&#127925;</div>
        <p className="text-[#F939A3] text-sm font-bold tracking-widest uppercase">Loading Karaoke Eleven...</p>
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
          background: 'linear-gradient(135deg, #1a0a2e 0%, #2a1a3e 40%, #1a0a2e 100%)',
        }}
      >
        <div className="text-center max-w-md p-6">
          <div className="text-4xl mb-4">&#9888;&#65039;</div>
          <p className="text-[#F939A3] text-sm mb-4 font-mono break-all">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#F939A3] to-[#6B2E77] hover:from-[#ff55bb] hover:to-[#8a4e94] text-white px-6 py-2.5 rounded-lg font-bold transition-colors comic-shadow-pink"
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
