'use client';

import dynamic from 'next/dynamic';

// Lazy-load the entire app to avoid TDZ errors during module initialization.
// When Next.js eagerly imports 100+ modules (screens, hooks, stores) at startup,
// the bundler may evaluate React's reconciler chunks before they are fully initialized,
// causing "Cannot access 'n' before initialization" in useState/useSyncExternalStore.
// By lazy-loading, React finishes loading first, then the heavy modules load after.
const KaraokeSuccessor = dynamic(
  () => import('./karaoke-app'),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-screen w-full"
        style={{
          background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a2a 100%)',
        }}
      />
    ),
  },
);

export default function Page() {
  return <KaraokeSuccessor />;
}
