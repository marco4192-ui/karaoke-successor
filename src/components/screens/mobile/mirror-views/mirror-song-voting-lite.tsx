'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSongVotingLiteProps {
  gameState: GameState;
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

export function MirrorSongVotingLite({ gameState, onSendDesktopCommand }: MirrorSongVotingLiteProps) {
    const { t } = useTranslation();
    const votingSongs = gameState.votingSongs || [];

    const handleVote = useCallback((songId: string) => {
      if (!songId) return;
      haptic();
      onSendDesktopCommand(`party_vote:${songId}`);
    }, [onSendDesktopCommand]);

    const handleBack = useCallback(() => {
      haptic();
      onSendDesktopCommand('party-setup');
    }, [onSendDesktopCommand]);

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="text-lg font-semibold text-white">{t('mobile.mirrorSongVoting') || 'Song-Abstimmung'}</h2>
          </div>
          <span className="text-xs text-white/40">{votingSongs.length} {t('mobile.mirrorSongCount') || 'Songs'}</span>
        </div>

        {/* Hinweis */}
        <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-3 py-2.5">
          <span className="text-sm">ℹ️</span>
          <span className="text-xs text-cyan-300/80">{t('mobile.mirrorSongVotingHint2') || 'Wähle einen Song für das nächste Spiel aus!'}</span>
        </div>

        {/* Keine Songs */}
        {votingSongs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">⚠</span>
            <p className="text-sm text-white/50 text-center">{t('mobile.mirrorNoVotingSongs') || 'Keine Songs zum Abstimmen verfügbar'}</p>
          </div>
        )}

        {/* Song-Liste */}
        {votingSongs.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {votingSongs.map((song) => (
              <button
                key={song.id}
                onClick={() => handleVote(song.id)}
                className={
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all active:scale-[0.98] ' +
                  'bg-white/5 border border-white/10 active:bg-amber-500/15 active:border-amber-400/30'
                }
              >
                <div className="shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                  {'♪'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{song.title}</p>
                  <p className="truncate text-xs text-white/40">{song.artist}</p>
                </div>
                <span className="shrink-0 text-lg text-white/20">
                  {'▶'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Zurueck */}
        <button
          onClick={handleBack}
          className="w-full rounded-xl p-3 text-center text-sm font-medium bg-white/10 border border-white/20 text-white/70 active:scale-[0.98] transition-transform"
        >
          {'←'} {t('mobile.mirrorBackToSetup') || 'Zurück zum Setup'}
        </button>
      </div>
    );
}MirrorSongVotingLite.displayName = 'MirrorSongVotingLite';
