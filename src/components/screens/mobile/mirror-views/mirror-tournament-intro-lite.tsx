'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorTournamentIntroLiteProps {
  gameState: GameState;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

/**
 * Companion mirror of the tournament starting screen ("Next Match").
 *
 * While the desktop shows the unified PartyStartingScreen for the next duel
 * (both players, mic assignment, voted song, Start button), companions see
 * this mirror: the two duelists with their colors, the voted song (or a
 * random hint) and a Start button that triggers the desktop start via the
 * `party_start` remote command.
 *
 * When no match is pending yet (bracket on screen, introData null), a
 * "waiting for next match" state is shown — the bracket itself is
 * desktop-only.
 */
export function MirrorTournamentIntroLite({ gameState, onSendDesktopCommand }: MirrorTournamentIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;
  const hasMatch = !!(intro?.startPlayerName && intro?.vsPlayerName);

  const handleStart = useCallback(() => {
    haptic();
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  const roundLabel = intro?.roundNumber
    ? t('tournament.roundOfOf')
        .replace('{n}', String(intro.roundNumber))
        .replace('{m}', String(intro.totalRounds ?? '?'))
    : null;

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-4 py-12">
      {/* Icon */}
      <div className="text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" aria-hidden="true">🏆</div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center">
        {t('tournament.startingTitle') || 'Next Match'}
      </h2>

      {roundLabel && (
        <span className="text-[11px] uppercase tracking-[0.18em] text-amber-400/70 -mt-2">{roundLabel}</span>
      )}

      {hasMatch ? (
        <>
          {/* Duel match-up */}
          <div className="flex items-center justify-center gap-3 w-full max-w-sm">
            {/* Player 1 */}
            <div
              className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5"
              style={{
                borderColor: `${intro?.startPlayerColor || '#FF6B6B'}80`,
                background: `linear-gradient(160deg, ${intro?.startPlayerColor || '#FF6B6B'}22, ${intro?.startPlayerColor || '#FF6B6B'}0a)`,
              }}
            >
              {intro?.startPlayerAvatar ? (
                <img
                  src={intro.startPlayerAvatar}
                  alt={intro.startPlayerName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white/40"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: intro?.startPlayerColor || '#FF6B6B' }}
                  aria-hidden="true"
                >
                  {intro?.startPlayerName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <p className="text-sm font-bold text-white truncate w-full text-center">{intro?.startPlayerName}</p>
            </div>

            {/* VS */}
            <span
              className="shrink-0 text-base font-black text-amber-400 tracking-widest select-none"
              style={{ textShadow: '0 0 14px rgba(245,158,11,0.45)' }}
              aria-hidden="true"
            >
              {t('tournament.vs')}
            </span>

            {/* Player 2 */}
            <div
              className="flex-1 flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3.5"
              style={{
                borderColor: `${intro?.vsPlayerColor || '#4ECDC4'}80`,
                background: `linear-gradient(160deg, ${intro?.vsPlayerColor || '#4ECDC4'}22, ${intro?.vsPlayerColor || '#4ECDC4'}0a)`,
              }}
            >
              {intro?.vsPlayerAvatar ? (
                <img
                  src={intro.vsPlayerAvatar}
                  alt={intro.vsPlayerName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-white/40"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{ backgroundColor: intro?.vsPlayerColor || '#4ECDC4' }}
                  aria-hidden="true"
                >
                  {intro?.vsPlayerName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <p className="text-sm font-bold text-white truncate w-full text-center">{intro?.vsPlayerName}</p>
            </div>
          </div>

          {/* Song info */}
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-6 py-3.5 w-full max-w-sm">
            {intro?.songTitle ? (
              <>
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  {t('partyStarting.song') || 'Song'}
                </span>
                <p className="text-base font-semibold text-white truncate max-w-full">🎵 {intro.songTitle}</p>
                {intro.songArtist && (
                  <p className="text-sm text-white/40 truncate max-w-full">{intro.songArtist}</p>
                )}
              </>
            ) : (
              <p className="text-sm font-semibold text-white/70">🎲 {t('tournament.songRandom') || 'Random'}</p>
            )}
          </div>

          {/* Start button */}
          <button
            type="button"
            onClick={handleStart}
            className={
              'mt-1 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
              'bg-gradient-to-r from-amber-500 to-yellow-500 text-white ' +
              'active:scale-[0.97] transition-all shadow-lg shadow-amber-500/25'
            }
          >
            ▶ {t('partyStarting.startButton') || 'Start'}
          </button>
        </>
      ) : (
        /* Bracket on desktop — no match pending yet */
        <>
          <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-5 w-full max-w-sm">
            <p className="text-sm text-white/60 text-center">{t('tournament.mirrorWaiting') || 'Waiting for the next match…'}</p>
            <p className="text-xs text-white/35 text-center">{t('tournament.mirrorWaitingHint') || 'The host picks the next duel on the big screen.'}</p>
          </div>
        </>
      )}
    </div>
  );
}

MirrorTournamentIntroLite.displayName = 'MirrorTournamentIntroLite';
