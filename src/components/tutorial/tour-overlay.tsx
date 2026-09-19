'use client';

/**
 * Tour-Overlay — die visuelle Schicht der Live-Tour:
 *  - Spotlight (abgedunkelter Hintergrund mit „Loch" um das Zielelement)
 *  - Tooltip-Karte (Titel, Text, Fortschritt, Weiter/Zurück/Beenden)
 *  - Ankert alle paar 100ms neu (Elemente können erscheinen/verschwinden)
 *  - Interactive-Steps: Klick-Catcher über dem Loch leitet den Klick an
 *    das echte Element weiter (React-Handler feuern) und die Tour geht
 *    danach automatisch weiter.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, MousePointerClick } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { cn } from '@/lib/utils';
import type { TourStep } from '@/lib/tutorial/types';

const SPOTLIGHT_PADDING = 8;

interface Rect { top: number; left: number; width: number; height: number }

interface TourOverlayProps {
  step: TourStep;
  /** Resolved localized texts (provided by the TourController). */
  title: string;
  body: string;
  stepNumber: number; // 1-based
  totalSteps: number;
  chapterIcon: string;
  chapterTitle: string;
  hasNext: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  /** Interactive step: forward a click on the spotlight target. */
  onForwardClick: () => void;
}

/** Measure the target (with fallback: first matching element). */
function measureTarget(selector: string | undefined): Rect | null {
  if (!selector || typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** Fully visible in the viewport? (partially visible counts as "needs scrolling") */
function isRectVisible(r: Rect): boolean {
  if (typeof window === 'undefined') return true;
  const bottom = r.top + r.height;
  const right = r.left + r.width;
  return r.top >= 0 && r.left >= 0 && bottom <= window.innerHeight && right <= window.innerWidth;
}

export function TourOverlay({
  step, title, body, stepNumber, totalSteps, chapterIcon, chapterTitle,
  hasNext, hasPrev, onNext, onPrev, onSkip, onForwardClick,
}: TourOverlayProps) {
  const { t } = useTranslation();
  const [rect, setRect] = useState<Rect | null>(null);
  const [targetFound, setTargetFound] = useState<boolean | null>(null);
  const forwardedRef = useRef(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Real (measured) tooltip height — used for placement checks and
  // clamping, so long texts can never push the card off-screen.
  const [tooltipH, setTooltipH] = useState(220);

  // ── Anchoring: poll for the target, re-measure periodically ──
  useLayoutEffect(() => {
    forwardedRef.current = false;
    let cancelled = false;
    let foundOnce = false;
    let scrolled = false;

    const tick = () => {
      if (cancelled) return;
      const r = measureTarget(step.target);
      if (r) {
        foundOnce = true;
        setTargetFound(true);
        setRect(r);
        // Auto-scroll: bring the target into view ONCE per step when it
        // is (partially) outside the viewport — the screen follows the
        // tour instead of the user having to scroll after every step.
        if (!scrolled && !isRectVisible(r)) {
          scrolled = true;
          const el = step.target ? document.querySelector(step.target) : null;
          el?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        }
      } else if (!foundOnce) {
        setTargetFound(false);
      }
      // Continue re-anchoring even after found (layout shifts, list loads)
      schedule();
    };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => { timer = setTimeout(tick, foundOnce ? 500 : 120); };
    tick();

    const onViewportChange = () => { if (!cancelled) { const r = measureTarget(step.target); if (r) { setRect(r); setTargetFound(true); } } };
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [step.id, step.target]);

  const isCenter = !step.target;
  const isInteractive = !!step.clickToContinue && targetFound === true;

  // ── Keyboard navigation ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInteractive) return; // interactive steps advance via click
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); if (hasNext) onNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (hasPrev) onPrev(); }
      else if (e.key === 'Escape') { e.preventDefault(); onSkip(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hasNext, hasPrev, onNext, onPrev, onSkip, isInteractive]);

  const handleForward = useCallback(() => {
    if (forwardedRef.current) return;
    forwardedRef.current = true;
    onForwardClick();
  }, [onForwardClick]);

  // ── Measure the real tooltip height (whenever it changes) ──
  // A ResizeObserver catches everything: text swaps, line wrapping when
  // the card switches between centered (480px) and anchored (340/300px)
  // widths, icons loading late — the placement math always sees the
  // true height so long texts can never push the card off-screen.
  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight > 0) setTooltipH(Math.max(el.offsetHeight, 140));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Tooltip placement (desktop) / bottom sheet (mobile) ──
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  let tooltipStyle: React.CSSProperties = {};
  let tooltipClass = '';
  if (isCenter || !rect) {
    // centered dialog
    tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxWidth: 480 };
    tooltipClass = 'retro-gradient-card retro-border-cyan';
  } else if (isMobile) {
    tooltipStyle = { bottom: 16, left: 12, right: 12 };
    tooltipClass = 'retro-gradient-card retro-border-cyan';
  } else {
    const below = rect.top + rect.height + 16;
    const above = rect.top - 16;
    const place = step.placement ?? 'bottom';
    const fits = (dir: string) =>
      dir === 'bottom' ? below + tooltipH < vh : above - tooltipH > 12;
    let dir = place;
    if (dir !== 'top' && dir !== 'bottom' && dir !== 'left' && dir !== 'right') dir = 'bottom';
    if ((dir === 'bottom' && !fits('bottom')) || (dir === 'top' && !fits('top'))) dir = fits('bottom') ? 'bottom' : 'top';
    if (dir === 'bottom' || dir === 'top') {
      const left = Math.min(Math.max(12, rect.left + rect.width / 2 - 170), Math.max(12, vw - 352));
      if (dir === 'bottom') {
        // 'top' edge right below the target, clamped into the viewport
        const top = Math.min(Math.round(below), Math.max(12, Math.round(vh - tooltipH - 12)));
        tooltipStyle = { top, left: Math.round(left), width: 340 };
      } else {
        // bottom edge right above the target (translateY(-100%) makes the
        // element's bottom = top) — no double offset, clamped to stay on-screen
        const top = Math.max(Math.round(above), Math.round(tooltipH + 12));
        tooltipStyle = { top, left: Math.round(left), width: 340, transform: 'translateY(-100%)' };
      }
    } else {
      const top = Math.min(Math.max(12, rect.top + rect.height / 2 - tooltipH / 2), Math.max(12, Math.round(vh - tooltipH - 12)));
      const left = dir === 'right'
        ? Math.min(Math.round(rect.left + rect.width + 16), Math.max(12, vw - 312))
        : Math.max(12, Math.round(rect.left - 316));
      tooltipStyle = { top: Math.round(top), left, width: 300 };
    }
    tooltipClass = 'retro-gradient-card retro-border-cyan';
  }

  const spotlightStyle: React.CSSProperties | undefined = rect ? {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  } : undefined;

  return (
    <div
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: 'none' }}
      data-testid="tour-overlay"
      role="dialog"
      aria-modal="false"
      aria-label={t('tutorial.ariaLabel')}
    >
      {/* Spotlight layer — blocks interaction on non-interactive steps */}
      {rect && (
        <div
          className="absolute rounded-xl"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.78)',
            pointerEvents: 'auto',
            borderRadius: 14,
            border: isInteractive ? '2px solid rgba(0, 229, 255, 0.9)' : '2px solid rgba(0, 229, 255, 0.55)',
            transition: 'top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease',
          }}
          onClick={isInteractive ? handleForward : undefined}
          data-testid="tour-spotlight"
        >
          {isInteractive && (
            <div className="absolute inset-0 rounded-xl animate-pulse bg-cyan-400/10 flex items-center justify-center" />
          )}
        </div>
      )}

      {/* Centered dark backdrop (steps without target) */}
      {!rect && (
        <div className="absolute inset-0 bg-[rgba(2,6,23,0.78)]" style={{ pointerEvents: 'auto' }} />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={cn(
          'absolute rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col gap-3',
          tooltipClass,
          'retro-box-glow-cyan',
        )}
        style={{ ...tooltipStyle, pointerEvents: 'auto' }}
        data-testid="tour-tooltip"
      >
        {/* Chapter badge + progress */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#00e5ff] bg-cyan-500/10 border border-cyan-500/30 rounded-full px-2.5 py-0.5">
            <span aria-hidden>{chapterIcon}</span>
            <span className="max-w-[140px] truncate">{chapterTitle}</span>
          </span>
          <span className="text-[11px] font-mono text-white/50">{stepNumber}/{totalSteps}</span>
        </div>

        {/* Title + body */}
        <div>
          <h3 className="text-base sm:text-lg font-black text-white leading-tight mb-1.5">
            {title}
          </h3>
          <p className="text-sm text-[#b8b8d0] leading-relaxed whitespace-pre-line">
            {body}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 mt-auto">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/45 hover:text-white/80 transition-colors px-2 py-1.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            data-testid="tour-skip"
          >
            {t('tutorial.skipTour')}
          </button>
          <div className="flex-1" />
          {hasPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1 text-xs font-bold text-white/75 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              data-testid="tour-prev"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {t('tutorial.back')}
            </button>
          )}
          {isInteractive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-400/40 rounded-lg px-3 py-2 animate-pulse">
              <MousePointerClick className="w-4 h-4" />
              {t('tutorial.clickHint')}
            </span>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="retro-btn retro-btn-cyan inline-flex items-center gap-1 text-xs font-bold rounded-lg px-4 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
              data-testid="tour-next"
              autoFocus
            >
              {hasNext ? <>{t('tutorial.next')} <ChevronRight className="w-3.5 h-3.5" /></> : <>{t('tutorial.finish')} <X className="w-3.5 h-3.5" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
