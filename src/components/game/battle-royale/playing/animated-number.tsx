'use client';

/**
 * Inline AnimatedNumber — extracted 1:1 from battle-royale/playing-view.tsx
 * (task R12). Used by the player cards strip (playing/player-cards-strip.tsx).
 */

import React, { useEffect, useRef, useState } from 'react';

// ===================== Inline AnimatedNumber =====================

/** Lightweight animated number counter — counts from previous to current over 500ms.
 *  Fix 15.4: React.memo so the ~20Hz pitch-state re-renders of the parent
 *  don't re-render counters whose value didn't change. */
export const AnimatedNumber = React.memo(function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      prevRef.current = to;
      return;
    }

    const duration = 500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(to);
        prevRef.current = to;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span className={className}>{displayed.toLocaleString()}</span>;
});
