'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { t } from '@/lib/i18n/translations';

// ─────────────────────────────────────────────────────────────────────────
// Mobile Error Boundary — wraps all companion app views to catch
// unexpected render errors and show a user-friendly fallback screen.
// ─────────────────────────────────────────────────────────────────────────

interface MobileErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface MobileErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function DefaultFallback({
  error,
  onRetry,
  onGoHome,
}: {
  error: Error;
  onRetry: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center p-6">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
      <h1 className="text-xl font-bold text-white mb-2">
        {t('mobileErrorBoundary.title')}
      </h1>
      <p className="text-gray-400 text-sm mb-4 text-center">
        {t('mobileErrorBoundary.message')}
      </p>
      <p className="text-red-400/80 text-xs font-mono mb-8 text-center max-w-sm overflow-hidden" style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {error.message}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onRetry}
          className="bg-cyan-500 hover:bg-cyan-400 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          {t('mobileErrorBoundary.retry')}
        </button>
        <button
          onClick={onGoHome}
          className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          {t('mobileErrorBoundary.goHome')}
        </button>
      </div>
    </div>
  );
}

export class MobileErrorBoundary extends React.Component<MobileErrorBoundaryProps, MobileErrorBoundaryState> {
  constructor(props: MobileErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): MobileErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[MobileErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.dispatchEvent(new CustomEvent('mobile-navigate-home'));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <DefaultFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }
    return this.props.children;
  }
}
