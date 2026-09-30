'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { GameState, MobileView, MobileHighscoreEntry } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorHighscoresLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string, data?: unknown) => void;
  /** R33-d2: true when this phone holds the remote-control lock. */
  isControlling?: boolean;
  /** R33-d2: the companion player's own profile id. */
  profileId?: string | null;
  /** R33-d2: Top-100 local highscores, pushed/pulled by the shell. */
  highscores?: MobileHighscoreEntry[];
  /** R33-d2: ask the shell to (re)load the top-100 highscores. */
  onLoadHighscores?: () => void;
}

// ===================== i18n-Hilfe =====================

/** t(key) gibt den Key selbst zurück, wenn keine Übersetzung existiert. */
function tOr(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

/** Gemeinsame Scroll-Klasse: schlanke Neon-Scrollbar (globals.css R38). */
const SCROLL_AREA = 'overflow-y-auto overscroll-contain pr-1 kz-scroll';

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** Medaille für die Top-3-Ränge (wie Desktop-Highscore-Screen). */
function rankMedal(index: number): string {
  if (index === 0) return '👑';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return '';
}

/** Schwierigkeits-Badge-Farben (Desktop-Muster: grün/gelb/rot). */
function difficultyClass(difficulty?: string): string {
  switch (difficulty) {
    case 'easy': return 'border-green-500/50 text-green-400 bg-green-500/10';
    case 'medium': return 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10';
    case 'hard': return 'border-red-500/50 text-red-400 bg-red-500/10';
    default: return 'border-white/20 text-white/50 bg-white/5';
  }
}

// ===================== Component =====================

export function MirrorHighscoresLite({
  onSendDesktopCommand,
  profileId,
  highscores,
  onLoadHighscores,
}: MirrorHighscoresLiteProps) {
    const { t } = useTranslation();
    // "Nur meine" ist Standard, wenn ein Profil vorhanden ist
    const [filter, setFilter] = useState<'all' | 'mine'>(profileId ? 'mine' : 'all');

    // ── R33/P10: Fallback-Daten — direkt laden, falls die Shell (noch)
    //    keine Highscores durchreicht ──
    const [localHighscores, setLocalHighscores] = useState<MobileHighscoreEntry[] | null>(null);
    const [localError, setLocalError] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);

    useEffect(() => {
      // Shell-Pfad: Daten über den Hook laden lassen (Props-Aktualisierung)
      onLoadHighscores?.();
      // Eigener Fallback-Pfad, wenn die Shell keine Daten liefert
      if (highscores) return;
      let cancelled = false;
      setLocalError(false);
      fetch('/api/mobile?action=gethighscores')
        .then((r) => { if (!r.ok) throw new Error('http'); return r.json(); })
        .then((d) => {
          if (cancelled) return;
          if (d?.success && Array.isArray(d.highscores)) {
            setLocalHighscores(d.highscores as MobileHighscoreEntry[]);
          } else {
            setLocalHighscores([]);
          }
        })
        .catch(() => { if (!cancelled) setLocalError(true); });
      return () => { cancelled = true; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadTick]);

    const retry = useCallback(() => {
      haptic();
      setReloadTick((n) => n + 1);
    }, []);

    const handleFilter = useCallback(
      (f: 'all' | 'mine') => {
        haptic();
        setFilter(f);
      },
      [],
    );

    // ── Anzuzeigende Daten ──
    const entries: MobileHighscoreEntry[] = useMemo(() => {
      const data = highscores ?? localHighscores ?? [];
      return [...data].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }, [highscores, localHighscores]);

    const loading = highscores === undefined && localHighscores === null && !localError;
    const effectiveFilter = filter === 'mine' && !profileId ? 'all' : filter;

    const visibleEntries = useMemo(() => {
      if (effectiveFilter === 'mine') {
        return entries.filter((e) => !!profileId && e.playerId === profileId);
      }
      return entries;
    }, [entries, effectiveFilter, profileId]);

    // ===================== Render-Hilfen =====================

    const renderSkeleton = () => (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    );

    const renderError = () => (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-5 text-center">
        <span className="text-3xl" aria-hidden>📡</span>
        <p className="text-sm text-red-300">
          {tOr(t, 'mobile.mirrorLoadError', 'Daten konnten nicht geladen werden.')}
        </p>
        <button
          onClick={retry}
          className="min-h-[44px] rounded-lg border border-red-400/40 bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-300 transition-transform active:scale-95"
        >
          {tOr(t, 'mobile.mirrorRetry', 'Erneut versuchen')}
        </button>
      </div>
    );

    const renderEntry = (entry: MobileHighscoreEntry, index: number) => {
      const isOwn = !!profileId && entry.playerId === profileId;
      const accentColor = entry.playerColor || '#06B6D4';
      const medal = rankMedal(index);
      const difficulty = entry.difficulty;
      const gameMode = entry.gameMode;
      const dateText = (() => {
        if (!entry.date) return '';
        const parsed = new Date(entry.date);
        return Number.isNaN(parsed.getTime()) ? entry.date : parsed.toLocaleDateString();
      })();

      return (
        <div
          key={`${entry.playerId}-${index}-${entry.songTitle}`}
          className={
            'flex items-center gap-3 rounded-xl border p-3 ' +
            (isOwn
              ? 'border-white/20 bg-white/[0.08]'
              : 'border-white/[0.08] bg-white/[0.03]')
          }
          style={isOwn ? { borderLeft: `4px solid ${accentColor}` } : undefined}
        >
          {/* Rang */}
          <div className="flex w-9 shrink-0 flex-col items-center justify-center">
            {medal ? (
              <span className="text-xl leading-none" aria-hidden>{medal}</span>
            ) : (
              <span className="text-sm font-bold text-white/40">#{index + 1}</span>
            )}
          </div>

          {/* Song + Spieler */}
          <div className="min-w-0 flex-1">
            <p className={'truncate text-sm font-semibold ' + (isOwn ? 'text-cyan-300' : 'text-white')}>
              {entry.songTitle}
            </p>
            {entry.artist ? (
              <p className="truncate text-xs text-white/40">{entry.artist}</p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {/* Spieler-Farbpunkt + Name */}
              <span className="flex max-w-full items-center gap-1">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: accentColor }}
                  aria-hidden
                />
                <span className="truncate text-[11px] text-white/60">{entry.playerName}</span>
              </span>
              {/* Schwierigkeits-Badge */}
              {difficulty ? (
                <span className={'rounded border px-1.5 py-0.5 text-[10px] font-semibold ' + difficultyClass(difficulty)}>
                  {tOr(t, `difficulty.${difficulty}`, difficulty)}
                </span>
              ) : null}
              {/* Modus */}
              {gameMode ? (
                <span className="rounded border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                  {tOr(t, `library.playlistQueueConfig.${gameMode}`, gameMode)}
                </span>
              ) : null}
              {/* Datum */}
              {dateText ? (
                <span className="text-[10px] text-white/30">{dateText}</span>
              ) : null}
            </div>
          </div>

          {/* Score + Stats */}
          <div className="shrink-0 text-right">
            <p className="text-base font-bold leading-tight text-cyan-400">
              {(entry.score ?? 0).toLocaleString()}
            </p>
            {typeof entry.accuracy === 'number' ? (
              <p className="text-[11px] text-white/60">
                {tOr(t, 'highscoreScreen.accuracyLabel', '{n}% Genauigkeit').replace('{n}', entry.accuracy.toFixed(1))}
              </p>
            ) : null}
            {typeof entry.maxCombo === 'number' && entry.maxCombo > 0 ? (
              <p className="text-[10px] text-white/40">
                {tOr(t, 'highscoreScreen.maxComboLabel', '{n}x beste Combo').replace('{n}', String(entry.maxCombo))}
              </p>
            ) : null}
          </div>
        </div>
      );
    };

    // ===================== Haupt-Render =====================

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl" aria-hidden>🏆</span>
          <h2 className="text-lg font-semibold text-white">
            {tOr(t, 'mobile.mirrorHighscores', 'Highscores')}
          </h2>
          {!loading && !localError && (
            <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/40">
              {tOr(t, 'mobile.mirrorEntries', '{n} Einträge').replace('{n}', String(visibleEntries.length))}
            </span>
          )}
        </div>

        {/* Lade-/Fehlerzustand */}
        {loading && renderSkeleton()}
        {localError && !highscores && renderError()}

        {!loading && !localError && (
          <>
            {/* Filter: Nur meine / Alle */}
            <div className="flex gap-2">
              <button
                onClick={() => handleFilter('mine')}
                disabled={!profileId}
                className={
                  'min-h-[44px] flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center transition-transform active:scale-95 disabled:opacity-40 ' +
                  (effectiveFilter === 'mine'
                    ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-300'
                    : 'bg-white/5 border border-white/10 text-white/50')
                }
              >
                {tOr(t, 'mobile.mirrorOnlyMine', 'Nur meine')}
              </button>
              <button
                onClick={() => handleFilter('all')}
                className={
                  'min-h-[44px] flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center transition-transform active:scale-95 ' +
                  (effectiveFilter === 'all'
                    ? 'bg-purple-500/25 border border-purple-400/40 text-purple-300'
                    : 'bg-white/5 border border-white/10 text-white/50')
                }
              >
                {tOr(t, 'mobile.mirrorAll', 'Alle')}
              </button>
            </div>

            {/* Scrollbare Highscore-Liste */}
            <div className={'max-h-[60vh] flex flex-col gap-2 ' + SCROLL_AREA}>
              {visibleEntries.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <span className="text-4xl" aria-hidden>🏆</span>
                  <p className="max-w-xs text-sm text-white/40">
                    {effectiveFilter === 'mine'
                      ? tOr(t, 'highscoreScreen.noMine', 'Du hast noch keine Scores gesetzt!')
                      : tOr(t, 'highscoreScreen.noAll', 'Noch keine Highscores. Sei der Erste, der singt!')}
                  </p>
                </div>
              ) : (
                visibleEntries.map((entry, index) => renderEntry(entry, index))
              )}
            </div>
          </>
        )}

        {/* Auf Desktop öffnen (immer möglich — auch ohne Steuerung) */}
        <button
          onClick={() => { haptic(); onSendDesktopCommand('highscores'); }}
          className={
            'w-full rounded-lg p-3 text-center text-sm font-semibold ' +
            'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
            'active:scale-[0.97] transition-transform'
          }
        >
          {tOr(t, 'mobile.mirrorOpenOnDesktop', 'Auf Desktop öffnen')}
        </button>
      </div>
    );
}
MirrorHighscoresLite.displayName = 'MirrorHighscoresLite';
