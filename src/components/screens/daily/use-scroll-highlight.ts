'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/** Anchor-point helper of the guided flow: smooth-scroll the target into view
 *  and pulse its highlight ring for ~2 s — same mechanics as the slot
 *  activation. Encapsulates the ref + highlight state + timer cleanup that
 *  the daily screen needs at four anchor points (tabs, daily play area,
 *  weekly play area, modes song selection). */
export function useScrollHighlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollTo = useCallback(() => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlighted(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setHighlighted(false), 2000);
    });
  }, []);

  // Clean up the highlight timer on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { ref, highlighted, scrollTo };
}
