'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorPtmIntroLiteProps {
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

export function MirrorPtmIntroLite({ gameState, onSendDesktopCommand }: MirrorPtmIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;

  const handleStart = useCallback(() => {
    haptic();
    // Trigger the desktop start button click (same as PtmIntroScreen's start)
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Mikrofon-Icon */}
      <div className="text-5xl">
        {'\u{1F3A4}'}
      </div>

      {/* Titel */}
      <h2 className="text-xl font-bold text-white text-center">
        {t('passTheMic.playingTitle') || 'Bereit zum Singen?'}
      </h2>

      {/* Song-Info oder Medley-Info */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 w-full max-w-sm">
        {intro?.isMedley ? (
          <p className="text-sm text-white/70">
            {intro.medleySnippetCount} {t('passTheMic.medleyLabel') || 'Snippets'}
          </p>
        ) : (
          <>
            <p className="text-base font-semibold text-white truncate max-w-full">
              {intro?.songTitle || gameState.currentSong?.title || '—'}
            </p>
            <p className="text-sm text-white/40 truncate max-w-full">
              {intro?.songArtist || gameState.currentSong?.artist || '—'}
            </p>
          </>
        )}
      </div>

      {/* Start-Spieler-Karte */}
      {intro?.startPlayerName ? (
        <div
          className="flex flex-col items-center gap-3 rounded-xl border-2 px-8 py-6 w-full max-w-sm"
          style={{
            borderColor: `${intro.startPlayerColor || '#06B6D4'}60`,
            background: `linear-gradient(135deg, ${intro.startPlayerColor || '#06B6D4'}15, ${intro.startPlayerColor || '#06B6D4'}05)`,
          }}
        >
          <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
            {t('passTheMic.startPlayer') || 'Start-Spieler'}
          </p>

          {/* Avatar oder Farb-Kreis */}
          {intro.startPlayerAvatar ? (
            <img
              src={intro.startPlayerAvatar}
              alt={intro.startPlayerName}
              className="w-16 h-16 rounded-full object-cover border-2"
              style={{ borderColor: `${intro.startPlayerColor || '#06B6D4'}80` }}
            />
          ) : (
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: intro.startPlayerColor || '#06B6D4' }}
            >
              {intro.startPlayerName[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Spielername */}
          <p className="text-2xl font-bold text-white">
            {intro.startPlayerName}
          </p>

          {/* Meta-Info */}
          <div className="flex items-center gap-3 text-xs text-white/40">
            {intro.playerCount ? (
              <span>{intro.playerCount} {intro.playerCount === 1 ? 'Spieler' : 'Spieler'}</span>
            ) : null}
            {intro.sharedMicName ? (
              <span>{intro.sharedMicName}</span>
            ) : null}
            {intro.roundNumber ? (
              <span>Runde {intro.roundNumber}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Lade-Indikator wenn Medien noch nicht bereit */}
      {intro && !intro.mediaLoaded ? (
        <div className="flex items-center gap-3">
          <div className="relative h-5 w-5">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          </div>
          <p className="text-sm text-white/50">
            {t('passTheMic.loadingSong') || 'Song wird geladen...'}
          </p>
        </div>
      ) : null}

      {/* Start-Button */}
      <button
        type="button"
        onClick={handleStart}
        disabled={intro ? !intro.mediaLoaded : false}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
          'bg-gradient-to-r from-cyan-500 to-blue-500 text-white ' +
          'active:scale-[0.97] transition-all shadow-lg ' +
          'disabled:opacity-40 disabled:active:scale-100'
        }
      >
        {'\u25B6'} {t('passTheMic.startSinging') || 'Singen starten'}
      </button>
    </div>
  );
}

MirrorPtmIntroLite.displayName = 'MirrorPtmIntroLite';
