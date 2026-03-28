'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-cyan-900/20 to-black">
      <Card className="max-w-lg w-full bg-gray-900/90 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-red-400">
            <span className="text-3xl">💥</span>
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/80">
            An unexpected error occurred. We apologize for the inconvenience.
          </p>

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message || 'Unknown error'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => reset()}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Reload App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
