'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Dynamic import with ssr: false prevents white-screen SSR/hydration failures
// when the companion phone loads /mobile via the QR code.
const MobileClientView = dynamic(
  () => import('@/components/screens/mobile-client-view').then(m => ({ default: m.MobileClientView })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60 text-sm">Loading companion app…</p>
        </div>
      </div>
    ),
  }
);

function MobilePageInner() {
  const searchParams = useSearchParams();
  const profileId = searchParams.get('profile') || undefined;
  return <MobileClientView profileId={profileId} />;
}

export default function MobilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ErrorBoundary>
        <MobilePageInner />
      </ErrorBoundary>
    </Suspense>
  );
}

// ── Minimal error boundary (no separate file needed) ──
import { Component, type ReactNode } from 'react';

interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <p className="text-red-400 text-lg font-semibold mb-2">Failed to load companion app</p>
            <p className="text-white/50 text-sm mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
