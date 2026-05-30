'use client';

import React from 'react';
import { t } from '@/lib/i18n/translations';

// ─────────────────────────────────────────────────────────────────────────
// Client-side Error Boundary wrapper — wraps {children} from layout.tsx.
// layout.tsx is a Server Component, so the actual error boundary must be here.
// ─────────────────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const stack = error.stack || '';
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#1a0a2e] backdrop-blur-lg rounded-2xl border-[3px] border-black p-8 max-w-2xl w-full text-center" style={{ boxShadow: '6px 6px 0px #FC6B48' }}>
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-xl font-bold text-[#FC6B48] mb-2" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>{t('errorBoundary.title')}</h2>
        <p className="text-[#c0b8d0] text-sm mb-4">
          {t('errorBoundary.description')}
        </p>
        <p className="text-[#FC6B48] text-xs mb-2 font-mono break-all">
          {error.message}
        </p>
        {stack && (
          <pre className="text-left text-[#c0b8d0] text-[10px] mb-6 font-mono bg-black/50 rounded-lg border-[2px] border-black p-3 overflow-auto max-h-96 whitespace-pre-wrap break-all">
            {stack}
          </pre>
        )}
        <button
          onClick={reset}
          className="bg-[#00F3B2] hover:bg-[#F939A3] text-black px-6 py-2.5 rounded-xl border-[3px] border-black font-bold transition-colors"
          style={{ boxShadow: '4px 4px 0px #6B2E77' }}
        >
          {t('errorBoundary.tryAgain')}
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <ErrorFallback error={this.state.error} reset={this.handleReset} />;
    }
    return this.props.children;
  }
}

export { ErrorBoundary };
