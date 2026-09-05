'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorMedleyIntroLiteProps {
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

export function MirrorMedleyIntroLite({ gameState, onSendDesktopCommand }: MirrorMedleyIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;

  const handleStart = useCallback(() => {
    haptic();
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Icon */}
      <div className="text-5xl">🎵</div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center">
        {t('medley.gameTitle') || 'Medley Contest'}
      </h2>

      {/* Snippet info */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 w-full max-w-sm">
        {intro?.medleySnippetCount ? (
          <p className="text-sm text-white/70">
            {intro.medleySnippetCount} {t('medley.snippets') || 'Snippets'}
          </p>
        ) : null}
        {intro?.songTitle ? (
          <>
            <p className="text-base font-semibold text-white truncate max-w-full">{intro.songTitle}</p>
            {intro.songArtist && (
              <p className="text-sm text-white/40 truncate max-w-full">{intro.songArtist}</p>
            )}
          </>
        ) : null}
      </div>

      {/* Player info */}
      {intro?.startPlayerName ? (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border-2 px-8 py-6 w-full max-w-sm"
          style={{
            borderColor: `${intro.startPlayerColor || '#8B5CF6'}60`,
            background: `linear-gradient(135deg, ${intro.startPlayerColor || '#8B5CF6'}15, ${intro.startPlayerColor || '#8B5CF6'}05)`,
          }}
        >
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {intro.playerCount && intro.playerCount > 1 ? 'Spieler' : 'Spieler'}
          </p>
          {intro.startPlayerAvatar ? (
            <img
              src={intro.startPlayerAvatar}
              alt={intro.startPlayerName}
              className="w-16 h-16 rounded-full object-cover border-2"
              style={{ borderColor: `${intro.startPlayerColor || '#8B5CF6'}80` }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: intro.startPlayerColor || '#8B5CF6' }}
            >
              {intro.startPlayerName[0]?.toUpperCase() || '?'}
            </div>
          )}
          <p className="text-2xl font-bold text-white">{intro.startPlayerName}</p>
          {intro.playerCount ? (
            <p className="text-xs text-white/40">{intro.playerCount} Spieler</p>
          ) : null}
        </div>
      ) : null}

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
          'bg-gradient-to-r from-purple-500 to-pink-500 text-white ' +
          'active:scale-[0.97] transition-all shadow-lg'
        }
      >
        ▶ {t('medley.start') || 'Start'}
      </button>
    </div>
  );
}

MirrorMedleyIntroLite.displayName = 'MirrorMedleyIntroLite';
