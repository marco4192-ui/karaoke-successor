'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * R26 (cover-bug fix): an <img> that can NEVER show the browser's
 * „Bild konnte nicht geladen werden“ icon. When the src fails to load
 * (dead blob: URL, 404 path, unreachable remote), the fallback node —
 * or nothing — is rendered instead. The failure is tracked per src, so a
 * changed src (e.g. a freshly restored blob URL) renders normally again.
 *
 * R34 (cover-retry): the failure is no longer permanent. After onError the
 * src is retried in the background after ~2.5 s (Versuch 2) and ~7 s
 * (Versuch 3) — max 3 attempts per src. While a retry is pending the
 * fallback shows (as before); only after the 3rd failed attempt does it
 * stay for good. Used by song-start-modal.tsx and folder-view.tsx.
 */
export function SafeImage({ src, alt, className, fallback, ...rest }: {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'className'>) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  // Attempt counter (ref — no re-render needed) + epoch state that bumps the
  // img key to force a fresh <img> element (fresh load) on retry.
  const attemptsRef = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the retry budget when the src prop changes (new src = fresh budget)
  // and clear any pending retry timer (also covers unmount).
  useEffect(() => {
    attemptsRef.current = 0;
    setFailedSrc(null);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [src]);

  const handleError = () => {
    if (!src) return; // no retry for empty/undefined src
    setFailedSrc(src);
    const attempts = attemptsRef.current + 1;
    attemptsRef.current = attempts;
    if (attempts >= 3) return; // permanently failed after 3 attempts
    // Background retry: attempt 2 after ~2.5 s, attempt 3 after ~7 s more
    const delay = attempts === 1 ? 2500 : 7000;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      // Reset the failed status + bump the epoch → <img> remounts (new key)
      // and the browser retries the load.
      setFailedSrc(null);
      setEpoch((e) => e + 1);
    }, delay);
  };

  const isFailed = !!src && failedSrc === src;

  if (!src || isFailed) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      key={epoch}
      src={src}
      alt={alt ?? ''}
      className={className}
      onLoad={() => { attemptsRef.current = 0; }}
      onError={handleError}
      {...rest}
    />
  );
}
