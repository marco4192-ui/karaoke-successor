'use client';

import React, { useCallback } from 'react';
import type { GameState, QueueItem, MobileProfile } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== i18n-Hilfsfunktion =====================
// R33-Konvention: lokale tOr-Wrapper — t(key) === key bedeutet "nicht
// übersetzt" → deutschen Fallback nutzen. Neue Keys landen zusätzlich in
// src/lib/i18n/pending-keys/r33-c.json (Koordinator übernimmt sie später in
// die Sprachdateien).
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

// ===================== Props =====================

interface MirrorHomeLiteProps {
  gameState: GameState;
  queue: QueueItem[];
  onOpenChat: () => void;
  onSendDesktopCommand: (screen: string, data?: unknown) => void;
  isRemoteLocked?: boolean;
  remoteLockedBy?: string | null;
  /** Legacy-Alias: identisch zu isControlling (R33: exakt lockedByMe). */
  lockedByMe?: boolean;
  /** R33/P1: GENAU remoteLock.lockedByMe — steuert die Startseiten-Variante. */
  isControlling?: boolean;
  onAcquireRemote?: () => void;
  onReleaseRemote?: () => void;
  /** R33/P8: lokale Navigation (nicht-steuernde Companion) — z. B. CTA → Bibliothek. */
  onLocalNavigate?: (screen: string) => void;
  /** R33/P8: Profil-Karte antippen → eigenes Profil bearbeiten. */
  onOpenProfile?: () => void;
  /** R33/P8: Profil-Karte (nicht-steuernd) — Name/Avatar/Farbe. */
  profile?: MobileProfile | null;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== P3: Desktop-Hotkeys =====================
// Quelle: src/hooks/use-keyboard-shortcuts.ts (useGlobalKeyboardShortcuts).
// Label-Keys existieren bereits (keyboardShortcuts.*) — hier mit deutschen
// Fallbacks, falls eine Sprache sie (noch) nicht hat.

const HOTKEYS: Array<{ keys: string; labelKey: string; fallback: string }> = [
  { keys: 'Esc',      labelKey: 'keyboardShortcuts.esc',   fallback: 'Pause / Zurück / Exit' },
  { keys: 'Enter',    labelKey: 'keyboardShortcuts.enter', fallback: 'Spiel fortsetzen (Pause)' },
  { keys: 'F12',      labelKey: 'keyboardShortcuts.f12',   fallback: 'Vollbild umschalten' },
  { keys: 'Ctrl+L',   labelKey: 'keyboardShortcuts.ctrlL', fallback: 'Suche in der Bibliothek' },
  { keys: 'Ctrl+Q',   labelKey: 'keyboardShortcuts.ctrlQ', fallback: 'Nächsten Queue-Song starten' },
  { keys: 'Ctrl+R',   labelKey: 'keyboardShortcuts.ctrlR', fallback: 'Zufälliger Song (Solo)' },
  { keys: 'Ctrl+D',   labelKey: 'keyboardShortcuts.ctrlD', fallback: 'Zufälliger Song (Duell)' },
  { keys: 'Ctrl+J',   labelKey: 'keyboardShortcuts.ctrlJ', fallback: 'Jukebox öffnen' },
  { keys: 'F1–F10',   labelKey: 'keyboardShortcuts.f1f10', fallback: 'Menü-Screens (F1 Start … F9 Einstellungen)' },
];

// ===================== Komponente =====================

export function MirrorHomeLite({
    gameState,
    queue,
    onSendDesktopCommand,
    isRemoteLocked,
    remoteLockedBy,
    lockedByMe,
    isControlling,
    onAcquireRemote,
    onReleaseRemote,
    onLocalNavigate,
    onOpenProfile,
    profile,
  }: MirrorHomeLiteProps) {
    const { t } = useTranslation();

    // R33/P1: isControlling ist GENAU lockedByMe. lockedByMe bleibt als
    // Legacy-Alias erhalten (Spiegel-Dispatcher mappt es 1:1).
    const controlling = isControlling ?? lockedByMe ?? false;

    const handleDesktopNav = useCallback(
      (screen: string) => {
        haptic();
        onSendDesktopCommand(screen);
      },
      [onSendDesktopCommand],
    );

    // R33/P8: Navigation zur Queue — steuernd via remote_command auf den
    // Desktop, nicht-steuernd rein lokal (kein Desktop-Einfluss).
    const handleQueueNav = useCallback(() => {
      haptic();
      if (controlling) onSendDesktopCommand('queue');
      else onLocalNavigate?.('queue');
    }, [controlling, onSendDesktopCommand, onLocalNavigate]);

    const handleLibraryNav = useCallback(() => {
      haptic();
      if (controlling) onSendDesktopCommand('library');
      else onLocalNavigate?.('library');
    }, [controlling, onSendDesktopCommand, onLocalNavigate]);

    // P8: Steuernd — Pause/Play des laufenden Songs (PARTICIPATION-Commands,
    // der Desktop synchronisiert den Pause-Dialog zurück).
    const handlePausePlay = useCallback(() => {
      haptic();
      onSendDesktopCommand(gameState.isPlaying ? 'companion_pause' : 'companion_resume');
    }, [onSendDesktopCommand, gameState.isPlaying]);

    // P8: Skip — im Party-Modus sauber über den "früh beenden"-Dialog,
    // ansonsten direkt beenden (nächster Queue-Song rückt nach).
    const handleSkip = useCallback(() => {
      haptic();
      if (gameState.isPartyModeActive) onSendDesktopCommand('companion_end_early');
      else onSendDesktopCommand('quit');
    }, [onSendDesktopCommand, gameState.isPartyModeActive]);

    const previewQueue = queue.filter((q) => q.status !== 'completed').slice(0, 3);
    const openQueueCount = queue.filter(q => q.status !== 'completed').length;

    // ---------- Gemeinsame Queue-Vorschau (nächste 3) ----------
    const queuePreview = (previewQueue.length > 0 || gameState.currentSong) && (
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {tOr(t, 'mobileViews.upNext', 'Als nächstes')}{openQueueCount > 0 ? ` (${openQueueCount})` : ''}
          </h3>
          <button
            onClick={handleQueueNav}
            className="text-xs font-medium text-cyan-400/80 active:opacity-70 transition-opacity"
          >
            {tOr(t, 'mobile.mirrorShowAll', 'Alle anzeigen')} →
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {previewQueue.map((item, idx) => (
            <button
              key={item.id}
              onClick={handleQueueNav}
              className="flex items-center gap-3 rounded-xl p-3 text-left bg-white/5 border border-white/10 active:scale-[0.98] transition-transform"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{item.songTitle}</p>
                <p className="truncate text-xs text-white/40">{item.songArtist}</p>
              </div>
              {item.gameMode && (
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-300/80 bg-purple-500/20">{item.gameMode}</span>
              )}
            </button>
          ))}
          {previewQueue.length === 0 && gameState.currentSong && (
            <p className="text-center py-2 text-xs text-white/30">
              {tOr(t, 'mobile.mirrorQueueEmptyHint', 'Füge Songs aus der Bibliothek hinzu, um zu starten')}
            </p>
          )}
        </div>
      </div>
    );

    // ===================== VARIANTE A: STEUERNDER COMPANION (P8) =====================
    if (controlling) {
      return (
        <div className="flex flex-col gap-3 px-4 pb-8 pt-2">

          {/* 1. Steuerung übernehmen/abgeben */}
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">🎮</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-300">
                  {tOr(t, 'mobile.homeControlYouTitle', 'Du steuerst den Desktop')}
                </p>
                <p className="text-xs text-white/50 leading-snug">
                  {tOr(t, 'mobile.homeControlYouDesc', 'Deine Tabs steuern den Desktop — alle Bereiche sind offen.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => { haptic(); onReleaseRemote?.(); }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-semibold bg-red-500/20 border border-red-400/30 text-red-400 active:scale-[0.97] transition-all"
            >
              <span className="text-base">🔓</span>
              <span>{tOr(t, 'companion.releaseControl', 'Kontrolle abgeben')}</span>
            </button>
          </div>

          {/* 2. Aktueller Song (falls einer läuft) mit Pause/Skip */}
          {gameState.currentSong ? (
            <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-lg shrink-0">
                  🎵
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    {tOr(t, 'mobile.homeCurrentSong', 'Aktueller Song')}
                  </p>
                  <p className="truncate text-sm font-medium text-white">{gameState.currentSong.title}</p>
                  <p className="truncate text-xs text-white/40">{gameState.currentSong.artist}</p>
                </div>
                {gameState.isPlaying && (
                  <div className="shrink-0 flex h-1.5 w-1.5">
                    <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePausePlay}
                  className={
                    'flex-1 flex items-center justify-center gap-2 rounded-xl p-2.5 active:scale-95 transition-transform border text-xs font-medium ' +
                    (gameState.isPlaying
                      ? 'bg-yellow-500/15 border-yellow-400/30 text-yellow-400'
                      : 'bg-green-500/15 border-green-400/30 text-green-400')
                  }
                >
                  <span className="text-sm">{gameState.isPlaying ? '⏸' : '▶'}</span>
                  <span>{gameState.isPlaying ? tOr(t, 'mobile.mirrorPause', 'Pause') : tOr(t, 'mobile.mirrorPlay', 'Abspielen')}</span>
                </button>
                <button
                  onClick={handleSkip}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl p-2.5 bg-white/5 border border-white/10 active:scale-95 transition-transform text-xs font-medium text-white/70"
                >
                  <span className="text-sm">⏭</span>
                  <span>{tOr(t, 'mobile.mirrorSkip', 'Überspringen')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl p-4 bg-white/5 border border-white/10">
              <p className="text-sm text-white/40">{tOr(t, 'mobile.mirrorNoSong', 'Kein Song aktiv')}</p>
            </div>
          )}

          {/* 3. Nächste Songs (Queue-Vorschau) */}
          {queuePreview}

          {/* 4. Hotkeys-Karte (P3 — nur steuernd) */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="text-base">⌨️</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/80">
                  {tOr(t, 'mobile.homeHotkeysTitle', 'Desktop-Hotkeys')}
                </p>
                <p className="text-[11px] text-white/40 leading-snug">
                  {tOr(t, 'mobile.homeHotkeysDesc', 'Die wichtigsten Tastenkürzel am Desktop')}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {HOTKEYS.map((hk) => (
                <div key={hk.keys} className="flex items-center gap-2.5">
                  <span className="shrink-0 min-w-[64px] rounded-md bg-black/40 border border-white/15 px-2 py-1 text-center text-[10px] font-bold font-mono text-cyan-300/90">
                    {hk.keys}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-white/60">
                    {tOr(t, hk.labelKey, hk.fallback)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ===================== VARIANTE B: NICHT-STEUERNDER COMPANION (P8) =====================
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">

        {/* 1. Profil-Karte (Name/Avatar/Farbe) — Tippen öffnet die Profil-Bearbeitung */}
        <button
          onClick={() => { haptic(); onOpenProfile?.(); }}
          className="flex items-center gap-3 rounded-xl p-3.5 text-left bg-white/5 border border-white/10 active:scale-[0.98] transition-transform"
        >
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-lg font-bold text-white shrink-0 border border-white/10"
            style={{ backgroundColor: profile?.color || '#06B6D4' }}
          >
            {profile?.avatar
              ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              : (profile?.name?.[0]?.toUpperCase() || '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">{profile?.name || '—'}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className="inline-block h-3 w-3 rounded-full border border-white/20"
                style={{ backgroundColor: profile?.color || '#06B6D4' }}
              />
              <span className="text-[11px] text-white/40">{tOr(t, 'mobileViews.profile', 'Profil')} · {tOr(t, 'mobileViews.orEdit', 'oder bearbeiten')}</span>
            </div>
          </div>
          <span className="text-white/30 text-sm">✏️</span>
        </button>

        {/* 2. "Song wünschen"-CTA → Bibliothek */}
        <button
          onClick={handleLibraryNav}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl p-4 text-sm font-semibold bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 active:scale-[0.97] transition-all"
        >
          <span className="text-base">🎵</span>
          <span>{tOr(t, 'mobile.homeRequestSong', 'Song wünschen')}</span>
        </button>

        {/* 3. Queue-Vorschau (nächste 3) */}
        {queuePreview}

        {/* 4. Hinweis: Steuerung übernehmen für volle Kontrolle */}
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🔒</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-300">
                {tOr(t, 'mobile.homeTakeControlForFull', 'Steuerung übernehmen für volle Kontrolle')}
              </p>
              <p className="text-xs text-white/50 leading-snug mt-0.5">
                {remoteLockedBy
                  ? tOr(t, 'mobile.homeControlByTitle', 'Steuerung liegt bei {name}').replace('{name}', remoteLockedBy)
                  : tOr(t, 'mobile.homeControlFreeTitle', 'Keine Steuerung aktiv')}
                {' · '}
                {tOr(t, 'mobile.homeControlHintDesc', 'Ohne Steuerung kannst du Songs wünschen, chatten und mitspielen.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => { haptic(); onAcquireRemote?.(); }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-400 active:scale-[0.97] transition-all"
          >
            <span className="text-base">🔓</span>
            <span>{tOr(t, 'companion.acquireControl', 'Kontrolle übernehmen')}</span>
          </button>
        </div>
      </div>
    );
}MirrorHomeLite.displayName = 'MirrorHomeLite';
