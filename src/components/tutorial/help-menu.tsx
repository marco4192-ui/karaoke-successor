'use client';

/**
 * ?-Hilfemenü — schwebender Button (unten rechts, auf allen nicht-immersiven
 * Screens sichtbar) mit Dialog:
 *  - Komplette Touren (Grundfunktionen / Editor) erneut ansehen
 *  - Thematisch gegliederte Kapitel einzeln abspielen
 */

import { useEffect, useState } from 'react';
import { HelpCircle, Play, Check, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { useTourController } from './tour-manager';
import { TOURS } from '@/lib/tutorial/tours';
import { isTourDone } from '@/lib/tutorial/storage';
import type { TourId } from '@/lib/tutorial/types';

export function HelpMenu() {
  const { t } = useTranslation();
  const { startTour, isTourActive } = useTourController();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration guard
    setMounted(true);
  }, []);

  const tourIds: TourId[] = ['basic', 'editor'];

  const handleStart = (tourId: TourId, chapterId?: string) => {
    setOpen(false);
    // Small delay so the dialog closes before the tour anchors
    setTimeout(() => startTour(tourId, chapterId ? { chapterId } : undefined), 120);
  };

  return (
    <>
      {/* Floating ?-button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="help-menu-button"
        aria-label={t('tutorial.helpButtonTitle')}
        title={t('tutorial.helpButtonTitle')}
        className="fixed bottom-5 right-5 z-[95] w-12 h-12 rounded-full retro-gradient-card retro-border-cyan retro-box-glow-cyan flex items-center justify-center transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
      >
        <HelpCircle className="w-6 h-6 text-[#00e5ff]" />
      </button>

      {/* Help dialog */}
      {open && (
        <div
          className="fixed inset-0 z-[210] bg-[rgba(2,6,23,0.8)] flex items-center justify-center p-4"
          data-testid="help-menu-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t('tutorial.helpDialogTitle')}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="retro-gradient-card retro-border-cyan retro-box-glow-cyan rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label={t('common.close')}
              data-testid="help-menu-close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2 pr-10">
              <HelpCircle className="w-7 h-7 text-[#00e5ff]" />
              <h2 className="text-xl font-black text-white">{t('tutorial.helpDialogTitle')}</h2>
            </div>
            <p className="text-sm text-[#b8b8d0] mb-6 leading-relaxed">
              {t('tutorial.helpDialogDesc')}
            </p>

            <div className="space-y-6">
              {tourIds.map((tourId) => {
                const tour = TOURS[tourId];
                const done = mounted && isTourDone(tourId);
                return (
                  <section key={tourId} aria-label={t(`tutorial.${tourId}.title`)}>
                    {/* Tour header + full tour button */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="text-2xl" aria-hidden>{tour.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white flex items-center gap-2 flex-wrap">
                          {t(`tutorial.${tourId}.title`)}
                          {done && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">
                              <Check className="w-3 h-3" /> {t('tutorial.completedBadge')}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-[#b8b8d0]/80">{t(`tutorial.${tourId}.desc`)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStart(tourId)}
                        className="retro-btn retro-btn-cyan text-xs font-bold rounded-lg px-4 py-2 inline-flex items-center gap-1.5 transition-all hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                        data-testid={`help-start-${tourId}`}
                        disabled={isTourActive}
                      >
                        <Play className="w-3.5 h-3.5" />
                        {t('tutorial.startFullTour')}
                      </button>
                    </div>

                    {/* Chapter chips */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {tour.chapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          type="button"
                          onClick={() => handleStart(tourId, chapter.id)}
                          data-testid={`help-chapter-${tourId}-${chapter.id}`}
                          className="group flex items-center gap-3 rounded-lg border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-left transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                        >
                          <span className="text-xl flex-shrink-0" aria-hidden>{chapter.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-white truncate">
                              {t(`tutorial.${tourId}.chapters.${chapter.id}`)}
                            </span>
                            <span className="block text-[11px] text-[#b8b8d0]/70">
                              {t('tutorial.stepsCount').replaceAll('{n}', String(chapter.steps.length))}
                            </span>
                          </span>
                          <Play className="w-4 h-4 text-white/25 group-hover:text-cyan-300 flex-shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <p className="text-[11px] text-white/40 mt-6 text-center">
              {t('tutorial.helpFooter')}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
