'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorBattleIntroLiteProps {
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
 * Companion mirror of the Battle Royale starting screen.
 *
 * Follows the Tournament mirror pattern: round label, ALL surviving players
 * as colored badges (fallback: player count), the round song (or random
 * hint) and a Start button that triggers the desktop start via the
 * `party_start` remote command.
 */
export function MirrorBattleIntroLite({ gameState, onSendDesktopCommand }: MirrorBattleIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;
  const badges = intro?.brPlayers || [];
  const roundLabel = intro?.roundNumber
    ? t('battleRoyale.round').replace('{n}', String(intro.roundNumber))
    : null;

  const handleStart = useCallback(() => {
    haptic();
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-4 py-12">
      {/* Icon */}
      <div className="text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" aria-hidden="true">⚔️</div>

      {/* Title + round label */}
      <h2 className="text-xl font-bold text-white text-center">
        {t('battleRoyale.title') || 'Battle Royale'}
      </h2>
      {roundLabel && (
        <span className="text-[11px] uppercase tracking-[0.18em] text-orange-400/80 -mt-2">{roundLabel}</span>
      )}

      {/* Player badges — all survivors, colored like the desktop HUD */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-4 w-full max-w-sm">
        {intro?.playerCount ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">
            {intro.playerCount} {t('battleRoyale.playersLabel') || 'players'}
          </p>
        ) : null}
        {badges.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-2" data-testid="br-mirror-badges">
            {badges.map((p, i) => {
              const color = p.color || '#EF4444';
              return (
                <div
                  key={`${p.name}-${i}`}
                  className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1"
                  style={{
                    borderColor: `${color}70`,
                    background: `linear-gradient(90deg, ${color}22, ${color}08)`,
                  }}
                >
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-white truncate max-w-[7rem]">{p.name}</span>
                </div>
              );
            })}
          </div>
        ) : intro?.startPlayerName ? (
          /* Fallback: single start player card (older sync payload) */
          <div
            className="flex items-center gap-3 rounded-lg border-2 px-4 py-3 w-full"
            style={{
              borderColor: `${intro.startPlayerColor || '#EF4444'}60`,
              background: `linear-gradient(135deg, ${intro.startPlayerColor || '#EF4444'}15, ${intro.startPlayerColor || '#EF4444'}05)`,
            }}
          >
            {intro.startPlayerAvatar ? (
              <img src={intro.startPlayerAvatar} alt={intro.startPlayerName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: intro.startPlayerColor || '#EF4444' }}
              >
                {intro.startPlayerName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <p className="text-base font-bold text-white">{intro.startPlayerName}</p>
          </div>
        ) : (
          <p className="text-sm text-white/50 text-center">{t('tournament.mirrorWaiting') || 'Waiting…'}</p>
        )}
      </div>

      {/* Song info */}
      {(badges.length > 0 || intro?.startPlayerName) && (
        <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-6 py-3 w-full max-w-sm">
          {intro?.songTitle ? (
            <>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                {t('partyStarting.song') || 'Song'}
              </span>
              <p className="text-base font-semibold text-white truncate max-w-full">🎵 {intro.songTitle}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-white/70">🎲 {t('tournament.songRandom') || 'Random'}</p>
          )}
        </div>
      )}

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
          'bg-gradient-to-r from-red-500 to-orange-500 text-white ' +
          'active:scale-[0.97] transition-all shadow-lg shadow-red-500/25'
        }
      >
        ▶ {t('battleRoyale.startRound').replace('{n}', String(intro?.roundNumber ?? 1))}
      </button>
    </div>
  );
}

MirrorBattleIntroLite.displayName = 'MirrorBattleIntroLite';
