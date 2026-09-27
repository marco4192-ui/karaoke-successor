'use client';

import { useState } from 'react';

/**
 * R26 (cover-bug fix): an <img> that can NEVER show the browser's
 * „Bild konnte nicht geladen werden“ icon. When the src fails to load
 * (dead blob: URL, 404 path, unreachable remote), the fallback node —
 * or nothing — is rendered instead. The failure is tracked per src, so a
 * changed src (e.g. a freshly restored blob URL) renders normally again.
 */
export function SafeImage({ src, alt, className, fallback, ...rest }: {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className'>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isFailed = !!src && failedSrc === src;

  if (!src || isFailed) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      className={className}
      onError={() => setFailedSrc(src)}
      {...rest}
    />
  );
}
