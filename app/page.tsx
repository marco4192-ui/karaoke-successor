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
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a2a 100%)',
      }}
    >
      <div className="text-center">
        <div className="text-4xl mb-4 animate-pulse">🎵</div>
        <p className="text-white/60 text-sm">Loading Karaoke Successor...</p>
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
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a2a 100%)',
        }}
      >
        <div className="text-center max-w-md p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 text-sm mb-4 font-mono break-all">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
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
