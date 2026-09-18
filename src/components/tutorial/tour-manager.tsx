'use client';

/**
 * Tour-Controller — Zustandsmaschine der Live-Touren.
 *  - startTour(tourId, { chapterId })  → komplette Tour oder nur ein Kapitel
 *  - Step-Eintritt: Navigation ausführen, skipIf prüfen, Ziel-Anker warten
 *  - Interactive-Steps: Klick auf das echte Zielelement weiterleiten
 *  - Fortschritt/Completion in localStorage (karaoke-zero-tour-<id>-done)
 *  - Erststart-Angebot (einmaliger Dialog auf dem Startscreen)
 *
 * Eingebettet in karaoke-app.tsx (bekommt navigate + aktuellen Screen).
 */

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { TOURS } from '@/lib/tutorial/tours';
import { isTourDone, markTourDone, wasTourOffered, markTourOffered } from '@/lib/tutorial/storage';
import type { ActiveTour, TourId } from '@/lib/tutorial/types';
import type { Screen } from '@/types/screens';
import { TourOverlay } from './tour-overlay';
import { Button } from '@/components/ui/button';

interface TourControllerApi {
  startTour: (_tourId: TourId, _opts?: { chapterId?: string }) => void;
  stopTour: () => void;
  isTourActive: boolean;
}

const TourContext = createContext<TourControllerApi | null>(null);

export function useTourController(): TourControllerApi {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTourController must be used within <TourController>');
  return ctx;
}

interface TourControllerProps {
  children: ReactNode;
  /** Navigate to a screen (called on step entry when the step defines one). */
  navigate: (_screen: Screen) => void;
  /** Current app screen (the first-launch offer only shows on home). */
  screen: Screen;
}

/** Open the first song in the editor (idempotent, retry-polling).
 *  Navigation renders asynchronously — the song cards appear after the
 *  editor mounts and its initial load finishes, so we retry for ~10s.
 *  Stops as soon as a song is open (sub-header present). */
function openEditorSongWithRetry(attempt = 0): void {
  if (typeof document === 'undefined') return;
  if (document.querySelector('[data-testid="editor-sub-header"]')) return; // already open
  const card = document.querySelector('[data-testid^="editor-song-card-"]');
  if (card) {
    (card as HTMLElement).click();
    return;
  }
  if (attempt < 40) setTimeout(() => openEditorSongWithRetry(attempt + 1), 250);
}

/** Close the opened song → back to the editor list view.
 *  NEVER discards unsaved changes: when the confirm dialog appears we
 *  click "keep editing" (safe abort) — the step then degrades to the
 *  centered tooltip. Retry-polling like above. */
function closeEditorSongWithRetry(attempt = 0): void {
  if (typeof document === 'undefined') return;
  const cancelBtn = document.querySelector('[data-testid="editor-cancel-button"]');
  if (!cancelBtn) return; // no song open — already in the list view
  (cancelBtn as HTMLElement).click();
  // The unsaved-changes confirm may pop up asynchronously
  setTimeout(() => {
    const keepBtn = document.querySelector('[data-testid="editor-cancel-keep-button"]');
    if (keepBtn) (keepBtn as HTMLElement).click(); // safe: no data loss
  }, 150);
  void attempt;
}

export function TourController({ children, navigate, screen }: TourControllerProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<ActiveTour | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [mounted, setMounted] = useState(false);
  const stateRef = useRef<ActiveTour | null>(null);
  stateRef.current = state;

  // ── First-launch offer: once, on the home screen, when idle ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!mounted || state) return;
    if (screen !== 'home') return;
    if (!wasTourOffered('basic')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time offer gate
      setShowOffer(true);
      markTourOffered('basic');
    }
  }, [mounted, state, screen]);

  // ── Tour control ──
  const flattenSteps = useCallback((tourId: TourId, chapterId?: string) => {
    const tour = TOURS[tourId];
    if (!tour) return { tour, steps: [], chapterId: 'all' as const };
    if (chapterId) {
      const chapter = tour.chapters.find(c => c.id === chapterId);
      if (chapter) return { tour, steps: chapter.steps, chapterId };
    }
    return { tour, steps: tour.chapters.flatMap(c => c.steps), chapterId: 'all' as const };
  }, []);

  const advanceTo = useCallback((active: ActiveTour, rawIndex: number) => {
    const steps = active.steps;
    let index = rawIndex;
    // Auto-skip: forward steps whose skipIf matches (synchronous predicates,
    // e.g. "no songs in library").
    while (index < steps.length && steps[index].skipIf?.()) {
      index += 1;
    }
    if (index >= steps.length) {
      // Only the COMPLETE tour earns the "completed" badge — playing a
      // single chapter does not mark the whole tour as done.
      if (active.chapterId === 'all') markTourDone(active.tour.id);
      setState(null);
      return;
    }
    if (index < 0) index = 0;
    const step = steps[index];
    setState({ ...active, index });

    // Step entry side effects: navigation + app-level actions.
    // NOTE: navigate (setScreen) renders asynchronously — the action uses
    // retry-polling internally, and the overlay anchors its target via
    // polling too, so late-appearing targets are picked up automatically.
    if (step.navigate) navigate(step.navigate);
    if (step.action === 'editor-open-first-song') openEditorSongWithRetry();
    if (step.action === 'editor-close-song') closeEditorSongWithRetry();
  }, [navigate]);

  const startTour = useCallback((tourId: TourId, opts?: { chapterId?: string }) => {
    const { tour, steps, chapterId } = flattenSteps(tourId, opts?.chapterId);
    if (!tour || steps.length === 0) return;
    const active: ActiveTour = { tour, steps, index: 0, chapterId };
    // advanceTo performs the first step's navigation + skipIf handling
    advanceTo(active, 0);
  }, [flattenSteps, advanceTo]);

  const stopTour = useCallback(() => setState(null), []);

  const next = useCallback(() => {
    const active = stateRef.current;
    if (!active) return;
    advanceTo(active, active.index + 1);
  }, [advanceTo]);

  const prev = useCallback(() => {
    const active = stateRef.current;
    if (!active) return;
    // Going back: jump to the previous step even if it was auto-skipped.
    setState({ ...active, index: Math.max(0, active.index - 1) });
  }, []);

  const onForwardClick = useCallback(() => {
    const active = stateRef.current;
    if (!active) return;
    const step = active.steps[active.index];
    if (step.target && step.clickToContinue) {
      const el = document.querySelector(step.target);
      (el as HTMLElement | null)?.click();
    }
    // Give React a moment to react (modal opens etc.), then advance
    setTimeout(() => { next(); }, 350);
  }, [next]);

  // ── Derived render data ──
  const api = useMemo<TourControllerApi>(() => ({
    startTour, stopTour, isTourActive: !!state,
  }), [startTour, stopTour, state]);

  const step = state ? state.steps[state.index] : null;
  const chapterOfStep = useMemo(() => {
    if (!state) return null;
    // When playing a single chapter, its identity is fixed
    if (state.chapterId !== 'all') {
      const ch = state.tour.chapters.find(c => c.id === state.chapterId);
      return { icon: ch?.icon ?? '❓', title: t(`tutorial.${state.tour.id}.chapters.${state.chapterId}`) };
    }
    // Complete tour: find the chapter containing the current step
    let start = 0;
    let found = state.tour.chapters[0];
    for (const ch of state.tour.chapters) {
      if (state.index >= start) found = ch;
      start += ch.steps.length;
    }
    return { icon: found?.icon ?? '❓', title: t(`tutorial.${state.tour.id}.chapters.${found?.id ?? ''}`) };
  }, [state, t]);

  return (
    <TourContext.Provider value={api}>
      {children}

      {/* Running tour overlay */}
      {state && step && chapterOfStep && (
        <TourOverlay
          key={`${state.tour.id}-${state.index}-${step.id}`}
          step={step}
          title={t(`tutorial.${state.tour.id}.steps.${step.id}.title`)}
          body={t(`tutorial.${state.tour.id}.steps.${step.id}.body`)}
          stepNumber={state.index + 1}
          totalSteps={state.steps.length}
          chapterIcon={chapterOfStep.icon}
          chapterTitle={chapterOfStep.title}
          hasNext={state.index < state.steps.length - 1}
          hasPrev={state.index > 0}
          onNext={next}
          onPrev={prev}
          onSkip={stopTour}
          onForwardClick={onForwardClick}
        />
      )}

      {/* First-launch offer dialog */}
      {showOffer && !state && (
        <div
          className="fixed inset-0 z-[200] bg-[rgba(2,6,23,0.8)] flex items-center justify-center p-4"
          data-testid="tour-first-offer"
          role="dialog"
          aria-modal="true"
          aria-label={t('tutorial.offerTitle')}
        >
          <div className="retro-gradient-card retro-border-cyan retro-box-glow-cyan rounded-2xl max-w-md w-full p-6 sm:p-8 text-center">
            <div className="text-5xl mb-3" aria-hidden>🎓</div>
            <h2 className="text-2xl font-black text-white mb-2">{t('tutorial.offerTitle')}</h2>
            <p className="text-sm text-[#b8b8d0] leading-relaxed mb-6">{t('tutorial.offerBody')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="retro-btn retro-btn-cyan"
                onClick={() => { setShowOffer(false); startTour('basic'); }}
                data-testid="tour-offer-start"
                autoFocus
              >
                {t('tutorial.offerStart')}
              </Button>
              <Button
                variant="outline"
                className="bg-white/5 border-white/20 text-white/70 hover:bg-white/10"
                onClick={() => setShowOffer(false)}
                data-testid="tour-offer-later"
              >
                {t('tutorial.offerLater')}
              </Button>
            </div>
            <p className="text-[11px] text-white/40 mt-4">{t('tutorial.offerHint')}</p>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}
