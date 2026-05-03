'use client';

import React from 'react';

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
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl border border-red-500/30 p-8 max-w-lg w-full text-center shadow-2xl">
        <div className="text-6xl mb-4">💥</div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6">
          An unexpected error occurred. Try reloading the page.
        </p>
        <p className="text-gray-500 text-xs mb-6 font-mono break-all">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Try Again
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
