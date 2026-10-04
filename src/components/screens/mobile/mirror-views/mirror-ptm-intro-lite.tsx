'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorPtmIntroLiteProps {
  gameState: GameState;
  profileName: string;
  /** R51/Bug13 — eigene Profil-ID: identifiziert die Start-Bestätigung
   *  (cptm_confirm_start:<playerId>) gegenüber dem Desktop. */
  profileId?: string | null;
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

export function MirrorPtmIntroLite({ gameState, profileId, onSendDesktopCommand }: MirrorPtmIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;
  // R51/Bug13 — Bestätigungs-Stand vom Desktop (Profil-IDs der Spieler, die
  // bereits „Start" gedrückt haben). Der 2s-Gamestate-Push liefert ihn.
  const confirmedIds = gameState.cptmStartConfirmed ?? [];
  const playerCount = intro?.playerCount ?? 0;
  const isCptm = intro?.partyGameMode === 'companion-singalong'
    || gameState.partyGameMode === 'companion-singalong';

  // Lokal gesendete Bestätigung — bleibt über Sync-Ticks hinweg stabil
  // (der Desktop bestätigt dedupliziert; ein verlorener Befehl kann über
  // erneutes Tippen wiederholt werden, bis der Desktop ihn registriert hat).
  const [confirmSentAt, setConfirmSentAt] = useState<number | null>(null);
  const myConfirmed = !!(profileId && confirmedIds.includes(profileId));
  const hasConfirmed = myConfirmed || confirmSentAt !== null;

  // Wenn die Bestätigung vom Desktop ankommt, den lokalen Zeitstempel
  // „vergessen" (der Server-Stand ist die Wahrheit) — aber nur, solange die
  // Intro-Phase läuft (danach wechselt die Ansicht ohnehin).
  useEffect(() => {
    if (myConfirmed && confirmSentAt !== null && Date.now() - confirmSentAt > 4000) {
      setConfirmSentAt(null);
    }
  }, [myConfirmed, confirmSentAt]);

  const allConfirmed = isCptm && playerCount > 0 && confirmedIds.length >= playerCount;

  const handleStart = useCallback(() => {
    haptic();
    // R51/Bug13 — Modus-Unterscheidung:
    // • CPTM: JEDER Teilnehmer bestätigt den Start mit seinem eigenen Button
    //   (Participation-Command, KEIN Fernsteuerungs-Lock nötig — der alte
    //   'party_start' scheiterte bei allen regulären Spielern mit 403 und
    //   wurde still geschluckt: „Klicken hat keinen Effekt").
    // • PTM (und alle anderen Modi): weiter den klassischen 'party_start'
    //   senden, der den Desktop-Start-Button anklickt — dort gibt es keine
    //   Bestätigungs-Runde, der Start-Button startet direkt.
    if (isCptm) {
      onSendDesktopCommand(`cptm_confirm_start:${profileId || 'unknown'}`);
      setConfirmSentAt(Date.now());
    } else {
      onSendDesktopCommand('party_start');
    }
  }, [onSendDesktopCommand, profileId, isCptm]);

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

      {/* R51/Bug13 — Bestätigungs-Fortschritt (nur CPTM): wer ist schon bereit */}
      {isCptm && playerCount > 0 && (
        <div
          className={`w-full max-w-sm rounded-xl px-4 py-3 text-center border ${
            allConfirmed
              ? 'bg-emerald-500/15 border-emerald-400/40'
              : 'bg-cyan-500/10 border-cyan-400/25'
          }`}
          data-testid="mirror-cptm-confirmation-progress"
        >
          <p className={`text-sm font-semibold ${allConfirmed ? 'text-emerald-300' : 'text-cyan-300'}`}>
            {(t('mobile.cptmStartConfirmedCount') || '{n} von {m} Spielern bereit')
              .replace('{n}', String(Math.min(confirmedIds.length, playerCount)))
              .replace('{m}', String(playerCount))}
          </p>
          {!allConfirmed && (
            <p className="text-white/40 text-xs mt-1">
              {t('mobile.cptmStartConfirmedWaiting') || 'Warten auf weitere Spieler…'}
            </p>
          )}
        </div>
      )}

      {/* Start-Button — R51/Bug13: CPTM = Bestätigen (abgedunkelt nach Klick +
          „Warten auf weitere Spieler"), PTM & Co. = klassischer Remote-Start. */}
      <button
        type="button"
        onClick={handleStart}
        disabled={(intro ? !intro.mediaLoaded : false) || (isCptm && hasConfirmed)}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold transition-all shadow-lg ' +
          (isCptm && hasConfirmed
            ? 'bg-white/10 text-white/50 border border-white/10 cursor-not-allowed'
            : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100')
        }
        data-testid="mirror-cptm-start-confirm-button"
      >
        {isCptm && hasConfirmed
          ? (t('mobile.cptmStartConfirmedYou') || '✓ Bereit — dein Start wurde bestätigt')
          : `▶ ${isCptm ? (t('mobile.cptmStartConfirm') || 'Starten') : (t('passTheMic.startSinging') || 'Singen starten')}`}
      </button>

      {/* Hinweistext nach dem Bestätigen, solange noch nicht alle bereit sind */}
      {isCptm && hasConfirmed && !allConfirmed && (
        <div className="flex items-center gap-3 -mt-2" data-testid="mirror-cptm-waiting-hint">
          <div className="relative h-4 w-4">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          </div>
          <p className="text-sm text-white/50">
            {t('mobile.cptmStartConfirmedWaiting') || 'Warten auf weitere Spieler…'}
          </p>
        </div>
      )}
    </div>
  );
}

MirrorPtmIntroLite.displayName = 'MirrorPtmIntroLite';
