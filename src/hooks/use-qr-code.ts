'use client';

import { useState, useEffect } from 'react';
import { generateQRCodeUrl } from '@/lib/qr-code';

/**
 * Generates a QR code data URL asynchronously and returns it as state.
 * Returns empty string while loading — caller should handle the loading state.
 * The QR code is cached in-memory by generateQRCodeUrl, so re-renders are fast.
 */
export function useQRCode(data: string, size = 200): string {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!data) {
      setSrc('');
      return;
    }

    let cancelled = false;
    generateQRCodeUrl(data, size).then(url => {
      if (!cancelled) setSrc(url);
    });

    return () => { cancelled = true; };
  }, [data, size]);

  return src;
}
