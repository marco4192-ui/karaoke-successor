'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { MobileSong, GameMode, GameState, MobileView } from '../mobile-types';

// ===================== Props =====================

interface MirrorLibraryLiteProps {
  songSearch: string;
  onSongSearchChange: (v: string) => void;
  songsLoading: boolean;
  songsError: string | null;
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
  selectedGameMode: GameMode;
  selectedPartner: { id: string; name: string } | null;
  availablePartners: Array<{ id: string; name: string; code: string }>;
  opponents: any[];
  availableProfiles: any[];
  onShowSongOptions: (s: MobileSong | null) => void;
  onSelectGameMode: (m: GameMode) => void;
  onSelectPartner: (p: { id: string; name: string } | null) => void;
  onAddToQueue: (s: MobileSong) => Promise<void>;
  onLoadPartners: () => void;
  onLoadOpponents: () => void;
  onRefreshSongs: () => void;
  formatDuration: (ms: number) => string;
  difficulty: 'easy' | 'normal' | 'hard';
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
  playerMicSource: 'companion' | 'microphone';
  onPlayerMicSourceChange: (s: 'companion' | 'microphone') => void;
  partnerMicSource: 'companion' | 'microphone';
  onPartnerMicSourceChange: (s: 'companion' | 'microphone') => void;
  duetPartsSwapped: boolean;
  onDuetPartsSwappedChange: (v: boolean) => void;
  addedQueuePosition: number;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
  onOpenChat: () => void;
}

// ===================== Helpers =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function formatDurationSec(ms: number): string {
  const s = Math.round(ms / 1000);
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ===================== Component =====================

export const MirrorLibraryLite = React.memo<MirrorLibraryLiteProps>(
  function MirrorLibraryLite({
    songSearch,
    onSongSearchChange,
    songsLoading,
    songsError,
    songs,
    filteredSongs,
    onAddToQueue,
    onRefreshSongs,
    selectedGameMode,
    onSelectGameMode,
    onOpenChat,
  }) {
    const { t } = useTranslation();
    const searchRef = useRef<HTMLInputElement>(null);
    const [genreFilter, setGenreFilter] = useState('all');
    const [languageFilter, setLanguageFilter] = useState('all');
    const [addingId, setAddingId] = useState<string | null>(null);
    const [challengingId, setChallengingId] = useState<string | null>(null);
    const [challengeSentId, setChallengeSentId] = useState<string | null>(null);

    // Lokaler Game-Mode (Single/Duell/Duett)
    const [libGameMode, setLibGameMode] = useState<GameMode>('single');

    // Duett: auto-filtere auf Duett-Songs
    const isDuetMode = libGameMode === 'duet';
    const displaySongs = useMemo(() => {
      let result = filteredSongs;
      if (genreFilter !== 'all') {
        result = result.filter((s) => s.genre === genreFilter);
      }
      if (languageFilter !== 'all') {
        result = result.filter((s) => s.language === languageFilter);
      }
      // DO-NOT-CHANGE: Duett-Filter basiert auf Titel/Kuenstler-Keywords
      if (isDuetMode) {
        result = result.filter((s) => {
          const combined = `${s.title} ${s.artist}`.toLowerCase();
          return (
            combined.includes('duet') ||
            combined.includes('duett') ||
            combined.includes(' & ') ||
            combined.includes(' feat ') ||
            combined.includes('feat. ') ||
            combined.includes(' vs ') ||
            combined.includes(' x ')
          );
        });
      }
      return result;
    }, [filteredSongs, genreFilter, languageFilter, isDuetMode]);

    // Extrahiere verfuegbare Genres und Sprachen
    const { genres, languages } = useMemo(() => {
      const gSet = new Set<string>();
      const lSet = new Set<string>();
      songs.forEach((s) => {
        if (s.genre) gSet.add(s.genre);
        if (s.language) lSet.add(s.language);
      });
      return {
        genres: Array.from(gSet).sort(),
        languages: Array.from(lSet).sort(),
      };
    }, [songs]);

    const handleAdd = useCallback(
      async (song: MobileSong) => {
        if (addingId) return;
        haptic();
        setAddingId(song.id);
        // Game-Mode auf den gewaehlten Modus setzen
        onSelectGameMode(libGameMode);
        try {
          await onAddToQueue(song);
        } finally {
          setTimeout(() => setAddingId(null), 500);
        }
      },
      [addingId, onAddToQueue, libGameMode, onSelectGameMode],
    );

    // DO-NOT-CHANGE: Herausfordern pro Song - sendet song_challenge an die API
    // Der API-Handler erstellt eine Chat-Nachricht mit Challenge-Daten,
    // die andere Companion-Geraete annehmen koennen (accept_challenge).
    const handleChallengeSong = useCallback(async (song: MobileSong) => {
      if (challengingId) return;
      haptic();
      setChallengingId(song.id);
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'song_challenge',
            payload: {
              songId: song.id,
              songTitle: song.title,
              songArtist: song.artist,
            },
          }),
        });
        if (res.ok) {
          setChallengeSentId(song.id);
          setTimeout(() => setChallengeSentId(null), 2000);
        }
      } catch { /* ignore */ }
      finally { setChallengingId(null); }
    }, [challengingId]);

    const handleGenreFilter = useCallback((g: string) => {
      haptic();
      setGenreFilter(g);
    }, []);

    const handleLanguageFilter = useCallback((l: string) => {
      haptic();
      setLanguageFilter(l);
    }, []);

    const handleClearSearch = useCallback(() => {
      onSongSearchChange('');
      searchRef.current?.focus();
    }, [onSongSearchChange]);

    const handleModeSelect = useCallback((mode: GameMode) => {
      haptic();
      setLibGameMode(mode);
    }, []);

    // Modus-Button-Konfiguration
    const MODE_BUTTONS: { mode: GameMode; icon: string; labelKey: string; fallback: string; activeColor: string }[] = [
      { mode: 'single', icon: '\u{1F3B5}', labelKey: 'gameMode.single', fallback: 'Single', activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
      { mode: 'duel', icon: '\u2694\uFE0F', labelKey: 'gameMode.duel', fallback: 'Duell', activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
      { mode: 'duet', icon: '\u{1F3AD}', labelKey: 'gameMode.duet', fallback: 'Duett', activeColor: 'bg-pink-500/25 border-pink-400/40 text-pink-400' },
    ];

    const needsChallenge = libGameMode === 'duel' || libGameMode === 'duet';

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('mobile.mirrorLibrary')}</h2>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
            {displaySongs.length}
          </span>
        </div>

        {/* Game-Mode Buttonleiste */}
        <div className="flex gap-2">
          {MODE_BUTTONS.map(({ mode, icon, labelKey, fallback, activeColor }) => {
            const isActive = libGameMode === mode;
            const label = t(labelKey) === labelKey ? fallback : t(labelKey);
            return (
              <button
                key={mode}
                onClick={() => handleModeSelect(mode)}
                className={'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold active:scale-95 transition-all border ' +
                  (isActive ? activeColor : 'bg-white/5 border-white/10 text-white/50')}
              >
                <span className="text-base leading-none">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Duell/Duett Hinweis */}
        {needsChallenge && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2">
            <span className="text-sm">{'\u2694\uFE0F'}</span>
            <span className="text-xs text-amber-300/80">
              {libGameMode === 'duel'
                ? (t('mobile.mirrorDuelHint') || 'Tippe auf \u2694\uFE0F bei einem Song, um einen Gegner herauszufordern')
                : (t('mobile.mirrorDuetHint') || 'Tippe auf \u{1F3AD} bei einem Song, um einen Duett-Partner herauszufordern')}
            </span>
          </div>
        )}

        {/* Duett-Filter-Hinweis */}
        {isDuetMode && (
          <div className="flex items-center gap-2 rounded-lg bg-pink-500/10 border border-pink-400/20 px-3 py-2">
            <span className="text-sm">{'\u{1F3AD}'}</span>
            <span className="text-xs text-pink-300/80">{t('mobile.mirrorDuetFilterHint') || 'Es werden nur Duett-Songs angezeigt'}</span>
          </div>
        )}

        {/* Suchfeld */}
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={songSearch}
            onChange={(e) => onSongSearchChange(e.target.value)}
            placeholder={t('mobile.mirrorSearchSongs') || 'Suche...'}
            className={'w-full rounded-xl px-4 py-2.5 pl-9 text-sm text-white placeholder-white/30 ' +
              'bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 focus:bg-white/8 transition-colors'}
          />\n          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">{'\u{1F50D}'}</span>
          {songSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm active:text-white/60"
            >{'\u2715'}</button>
          )}
        </div>

        {/* Genre-Filter */}
        {genres.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleGenreFilter('all')}
              className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ' +
                (genreFilter === 'all'
                  ? 'bg-cyan-500/25 border border-cyan-400/30 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-white/50')}
            >Alle</button>
            {genres.slice(0, 8).map((g) => (
              <button
                key={g}
                onClick={() => handleGenreFilter(g)}
                className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ' +
                  (genreFilter === g
                    ? 'bg-purple-500/25 border border-purple-400/30 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-white/50')}
              >{g}</button>
            ))}
          </div>
        )}

        {/* Sprach-Filter */}
        {languages.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleLanguageFilter('all')}
              className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ' +
                (languageFilter === 'all'
                  ? 'bg-cyan-500/25 border border-cyan-400/30 text-cyan-400'
                  : 'bg-white/5 border border-white/10 text-white/50')}
            >Alle</button>
            {languages.map((l) => (
              <button
                key={l}
                onClick={() => handleLanguageFilter(l)}
                className={'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold active:scale-95 transition-transform ' +
                  (languageFilter === l
                    ? 'bg-emerald-500/25 border border-emerald-400/30 text-emerald-400'
                    : 'bg-white/5 border border-white/10 text-white/50')}
              >{l}</button>
            ))}
          </div>
        )}

        {/* Loading */}
        {songsLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Error */}
        {songsError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
            <p className="text-sm text-red-400">{songsError}</p>
            <button onClick={onRefreshSongs} className="mt-2 text-xs text-red-300 underline">Erneut laden</button>
          </div>
        )}

        {/* Leerer Zustand */}
        {!songsLoading && !songsError && displaySongs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">{'\u{1F3B5}'}</span>
            <p className="text-sm text-white/40">{t('mobile.mirrorNoSongs') || 'Keine Songs gefunden'}</p>
          </div>
        )}

        {/* Songliste */}
        <div className="flex flex-col gap-1.5">
          {displaySongs.map((song) => {
            const isAdding = addingId === song.id;
            const isChallenging = challengingId === song.id;
            const isChallengeSent = challengeSentId === song.id;
            return (
              <div
                key={song.id}
                className={'flex items-center gap-2 rounded-xl px-2 py-2 text-left transition-all ' +
                  'bg-white/5 border border-white/10'}
              >
                {/* Add-Button */}
                <button
                  onClick={() => handleAdd(song)}
                  disabled={isAdding}
                  className={'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-all active:scale-90 ' +
                    (isAdding
                      ? 'bg-cyan-500/30 text-cyan-400'
                      : 'bg-white/10 text-white/40 active:bg-white/15')}
                >{isAdding ? '\u2713' : '+'}</button>

                {/* Song-Info (klickbar fuer Add) */}
                <button
                  onClick={() => handleAdd(song)}
                  disabled={isAdding}
                  className="min-w-0 flex-1 text-left active:opacity-70"
                >
                  <p className="truncate text-sm font-medium text-white">{song.title}</p>
                  <p className="truncate text-xs text-white/40">{song.artist}</p>
                </button>

                {/* Dauer */}
                <span className="shrink-0 text-[10px] font-mono text-white/30 w-8 text-right">{formatDurationSec(song.duration)}</span>

                {/* Challenge-Button (nur bei Duell/Duett) */}
                {needsChallenge && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChallengeSong(song);
                    }}
                    disabled={isChallenging}
                    className={'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-base transition-all active:scale-90 ' +
                      (isChallengeSent
                        ? 'bg-green-500/30 text-green-400'
                        : isChallenging
                          ? 'bg-amber-500/20 text-amber-400/50'
                          : libGameMode === 'duel'
                            ? 'bg-red-500/15 text-red-400/70 active:bg-red-500/25'
                            : 'bg-pink-500/15 text-pink-400/70 active:bg-pink-500/25')}
                    title={isChallengeSent
                      ? (t('mobile.mirrorChallengeSent') || 'Gesendet!')
                      : libGameMode === 'duel'
                        ? (t('mobile.mirrorChallengeDuel') || 'Herausfordern')
                        : (t('mobile.mirrorChallengeDuet') || 'Duett-Partner suchen')}
                  >
                    {isChallengeSent ? '\u2705' : isChallenging ? '\u23F3' : '\u2694\uFE0F'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
