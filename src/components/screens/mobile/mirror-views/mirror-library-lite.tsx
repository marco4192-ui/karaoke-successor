'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
  clientId: string | null;
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

function isLikelyDuet(song: MobileSong): boolean {
  // The desktop pre-computes isDuet using the full isDuetSong() logic
  // (metadata flag + [Duet]/(Duet) title check + P1/P2 lyrics scan).
  // Rely on that flag — no lyrics are available on the companion side.
  if (song.isDuet === true) return true;
  // Safety net: bracketed [Duet] / (Duet) in title (catches songs added after last sync)
  if (song.title && /\[\s*duet\s*\]/i.test(song.title)) return true;
  if (song.title && /\(\s*duet\s*\)/i.test(song.title)) return true;
  return false;
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
    onSelectPartner,
    availablePartners,
    opponents,
    availableProfiles,
    clientId,
    onShowSongOptions,
    onLoadPartners,
    onLoadOpponents,
    onDifficultyChange,
    playerMicSource,
    onPlayerMicSourceChange,
    partnerMicSource,
    onPartnerMicSourceChange,
    duetPartsSwapped,
    onDuetPartsSwappedChange,
    addedQueuePosition,
    onNavigate,
    onOpenChat,
    onSendDesktopCommand,
    gameState,
  }) {
    const { t } = useTranslation();
    const searchRef = useRef<HTMLInputElement>(null);
    const [genreFilter, setGenreFilter] = useState('all');
    const [languageFilter, setLanguageFilter] = useState('all');

    // Lokaler Game-Mode (Single/Duell/Duett)
    const [libGameMode, setLibGameMode] = useState<GameMode>('single');

    // ---- Overlay-State ----
    const [overlaySong, setOverlaySong] = useState<MobileSong | null>(null);
    const [ovDifficulty, setOvDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
    const [ovPartnerId, setOvPartnerId] = useState<string | null>(null);
    const [ovAdding, setOvAdding] = useState(false);
    const [ovChallengeSent, setOvChallengeSent] = useState(false);
    // Playlist-Picker State
    const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
    const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; isSystem?: boolean }>>([]);
    const [playlistLoading, setPlaylistLoading] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showNewPlaylist, setShowNewPlaylist] = useState(false);
    const [playlistAdding, setPlaylistAdding] = useState<string | null>(null);

    // Desktop-Preview tracking (controlling companion only)
    const [desktopPreviewSongId, setDesktopPreviewSongId] = useState<string | null>(null);

    // Duett: auto-filtere auf Duett-Songs
    const isDuetMode = libGameMode === 'duet';
    // Alle verfuegbaren Partner: verbundene Companion-User + aktive Host-Profile.
    // availablePartners wird NICHT verwendet (redundant mit opponents, das
    // dieselben Companion-User aber mit profile.id statt connectionCode liefert).
    const allPartners = useMemo(() => {
      const list: Array<{ id: string; name: string }> = [
        ...opponents.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
        ...availableProfiles.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })),
      ];
      // Deduplizierung nach ID
      const seen = new Set<string>();
      return list.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    }, [opponents, availableProfiles]);

    const displaySongs = useMemo(() => {
      let result = filteredSongs;
      if (genreFilter !== 'all') {
        result = result.filter((s) => s.genre === genreFilter);
      }
      if (languageFilter !== 'all') {
        result = result.filter((s) => s.language === languageFilter);
      }
      if (isDuetMode) {
        result = result.filter(isLikelyDuet);
      }
      // Nach Songtitel alphabetisch sortieren
      return [...result].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
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

    const handleClearSearch = useCallback(() => {
      onSongSearchChange('');
      searchRef.current?.focus();
    }, [onSongSearchChange]);

    const handleModeSelect = useCallback((mode: GameMode) => {
      haptic();
      setLibGameMode(mode);
    }, []);

    // ---- Overlay-Handler ----

    const openOverlay = useCallback((song: MobileSong) => {
      haptic();
      setOverlaySong(song);
      setOvDifficulty('normal');
      setOvPartnerId(null);
      setOvChallengeSent(false);
      // Lade Gegner/Host-Profile fuer Duell/Duett-Auswahl
      onLoadOpponents();
    }, [onLoadOpponents]);

    const closeOverlay = useCallback(() => {
      haptic();
      setOverlaySong(null);
    }, []);

    // Zur Queue: Direkt an die API senden mit lokalem Overlay-State.
    const handleOverlayQueue = useCallback(async () => {
      if (!overlaySong || ovAdding) return;
      setOvAdding(true);
      const partner = ovPartnerId ? allPartners.find((p) => p.id === ovPartnerId) : null;
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'queue',
            clientId,
            payload: {
              songId: overlaySong.id,
              songTitle: overlaySong.title,
              songArtist: overlaySong.artist,
              gameMode: libGameMode,
              difficulty: ovDifficulty,
              partnerId: partner?.id || undefined,
              partnerName: partner?.name || undefined,
              playerMicSource,
              partnerMicSource,
              duetPartsSwapped,
            },
          }),
        });
        if (res.ok) closeOverlay();
      } catch { /* ignore */ }
      finally { setOvAdding(false); }
    }, [overlaySong, ovAdding, libGameMode, ovDifficulty, ovPartnerId, allPartners, clientId, playerMicSource, partnerMicSource, duetPartsSwapped, closeOverlay]);

    // DO-NOT-CHANGE: Playlist-Add via mobile API. Der Desktop muss den
    // 'playlist_add'-Action-Type unterstuetzen, um den Song in eine
    // gewaehlte Playlist aufzunehmen. Zeigt Playlist-Auswahl an.
    const handleOverlayPlaylist = useCallback(async () => {
      if (!overlaySong) return;
      haptic();
      setShowPlaylistPicker(true);
      setPlaylistLoading(true);
      setNewPlaylistName('');
      setShowNewPlaylist(false);
      setPlaylistAdding(null);
      try {
        const res = await fetch('/api/mobile?action=playlists');
        if (res.ok) {
          const data = await res.json();
          setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
        }
      } catch { /* ignore */ }
      finally { setPlaylistLoading(false); }
    }, [overlaySong]);

    // Song zu einer bestehenden Playlist hinzufuegen
    const handleAddToPlaylist = useCallback(async (playlistId: string) => {
      if (!overlaySong) return;
      haptic();
      setPlaylistAdding(playlistId);
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'playlist_add',
            clientId,
            payload: {
              playlistId,
              songId: overlaySong.id,
            },
          }),
        });
        setShowPlaylistPicker(false);
        closeOverlay();
      } catch { /* ignore */ }
      finally { setPlaylistAdding(null); }
    }, [overlaySong, clientId, closeOverlay]);

    // Neue Playlist erstellen und Song hinzufuegen
    const handleCreateAndAddPlaylist = useCallback(async () => {
      if (!overlaySong || !newPlaylistName.trim()) return;
      haptic();
      setPlaylistAdding('new');
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'playlist_create_add',
            clientId,
            payload: {
              name: newPlaylistName.trim(),
              songId: overlaySong.id,
            },
          }),
        });
        setShowPlaylistPicker(false);
        setShowNewPlaylist(false);
        closeOverlay();
      } catch { /* ignore */ }
      finally { setPlaylistAdding(null); }
    }, [overlaySong, newPlaylistName, clientId, closeOverlay]);

    // Playlist-Picker schliessen
    const closePlaylistPicker = useCallback(() => {
      haptic();
      setShowPlaylistPicker(false);
    }, []);

    // Desktop-Preview: Song auf Desktop-Lautsprechern abspielen (nur kontrollierender Companion)
    const handleDesktopPreview = useCallback((songId: string) => {
      // Stop previous preview if switching to a different song
      if (desktopPreviewSongId && desktopPreviewSongId !== songId) {
        onSendDesktopCommand('song_preview_stop');
      }
      setDesktopPreviewSongId(songId);
      onSendDesktopCommand('song_preview:' + songId);
    }, [desktopPreviewSongId, onSendDesktopCommand]);

    const handleStopDesktopPreview = useCallback(() => {
      if (desktopPreviewSongId) {
        onSendDesktopCommand('song_preview_stop');
        setDesktopPreviewSongId(null);
      }
    }, [desktopPreviewSongId, onSendDesktopCommand]);

    // Stop desktop preview when opening overlay (game start) or switching songs
    const openOverlayWithPreviewStop = useCallback((song: MobileSong) => {
      handleStopDesktopPreview();
      openOverlay(song);
    }, [handleStopDesktopPreview, openOverlay]);

    // Spiel starten: Direkt an die API senden mit lokalem Overlay-State
    // (gameMode, difficulty, partner), NICHT ueber use-mobile-data.ts das
    // einen veralteten State haette.
    const handleOverlayStart = useCallback(async () => {
      if (!overlaySong || ovAdding) return;
      handleStopDesktopPreview();
      setOvAdding(true);
      const partner = ovPartnerId ? allPartners.find((p) => p.id === ovPartnerId) : null;
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'queue',
            clientId,
            payload: {
              songId: overlaySong.id,
              songTitle: overlaySong.title,
              songArtist: overlaySong.artist,
              gameMode: libGameMode,
              difficulty: ovDifficulty,
              partnerId: partner?.id || undefined,
              partnerName: partner?.name || undefined,
              playerMicSource,
              partnerMicSource,
              duetPartsSwapped,
            },
          }),
        });
        if (res.ok) {
          onSendDesktopCommand('play_queue');
          closeOverlay();
        }
      } catch { /* ignore */ }
      finally {
        setOvAdding(false);
      }
    }, [overlaySong, ovAdding, libGameMode, ovDifficulty, ovPartnerId, allPartners, clientId, playerMicSource, partnerMicSource, duetPartsSwapped, onSendDesktopCommand, closeOverlay, handleStopDesktopPreview]);

    // DO-NOT-CHANGE: Herausfordern per Chat-Nachricht (wie Desktop-App).
    // Sendet song_challenge an die API, die eine Chat-Nachricht erstellt.
    // clientId MUSS im Body sein, sonst liefert der Server 400.
    const handleOverlayChallenge = useCallback(async () => {
      if (!overlaySong || ovChallengeSent) return;
      haptic();
      setOvChallengeSent(true);
      try {
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'song_challenge',
            clientId,
            payload: {
              songId: overlaySong.id,
              songTitle: overlaySong.title,
              songArtist: overlaySong.artist,
              gameMode: libGameMode,
              challengedPartnerId: ovPartnerId || undefined,
            },
          }),
        });
        if (res.ok) {
          setTimeout(() => closeOverlay(), 1200);
        } else {
          setOvChallengeSent(false);
        }
      } catch {
        setOvChallengeSent(false);
      }
    }, [overlaySong, ovChallengeSent, libGameMode, ovPartnerId, clientId, closeOverlay]);

    // Modus-Button-Konfiguration
    const MODE_BUTTONS: { mode: GameMode; icon: string; labelKey: string; fallback: string; activeColor: string }[] = [
      { mode: 'single', icon: '\u{1F3B5}', labelKey: 'gameMode.single', fallback: 'Solo', activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
      { mode: 'duel', icon: '\u2694\uFE0F', labelKey: 'gameMode.duel', fallback: 'Duell', activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
      { mode: 'duet', icon: '\u{1F3AD}', labelKey: 'gameMode.duet', fallback: 'Duett', activeColor: 'bg-pink-500/25 border-pink-400/40 text-pink-400' },
    ];

    const needsChallenge = libGameMode === 'duel' || libGameMode === 'duet';

    // Schwierigkeits-Optionen fuer Overlay
    const DIFF_OPTIONS = [
      { id: 'easy' as const, label: t('mobileViews.easy') || 'Leicht', color: 'bg-green-500/25 border-green-400/40 text-green-400' },
      { id: 'normal' as const, label: t('mobileViews.normal') || 'Normal', color: 'bg-amber-500/25 border-amber-400/40 text-amber-400' },
      { id: 'hard' as const, label: t('mobileViews.hard') || 'Schwer', color: 'bg-red-500/25 border-red-400/40 text-red-400' },
    ];

    // Dropdown-Pfeil SVG als data-URL
    const dropdownArrow = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;
    const dropdownStyle = {
      backgroundImage: dropdownArrow,
      backgroundRepeat: 'no-repeat' as const,
      backgroundPosition: 'right 10px center',
      backgroundSize: '16px',
    };

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
                ? (t('mobile.mirrorDuelHint') || 'Tippe auf einen Song, um einen Gegner herauszufordern')
                : (t('mobile.mirrorDuetHint') || 'Tippe auf einen Song, um einen Duett-Partner zu finden')}
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
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">{'\u{1F50D}'}</span>
          {songSearch && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm active:text-white/60"
            >{'\u2715'}</button>
          )}
        </div>

        {/* Genre-Filter als Dropdown */}
        {genres.length > 0 && (
          <select
            value={genreFilter}
            onChange={(e) => { haptic(); setGenreFilter(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
            style={dropdownStyle}
          >
            <option value="all" className="bg-[#1a1a2e] text-white">Alle Genres</option>
            {genres.map((g) => (
              <option key={g} value={g} className="bg-[#1a1a2e] text-white">{g}</option>
            ))}
          </select>
        )}

        {/* Sprach-Filter als Dropdown */}
        {languages.length > 1 && (
          <select
            value={languageFilter}
            onChange={(e) => { haptic(); setLanguageFilter(e.target.value); }}
            className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white active:scale-[0.99] transition-transform cursor-pointer"
            style={dropdownStyle}
          >
            <option value="all" className="bg-[#1a1a2e] text-white">Alle Sprachen</option>
            {languages.map((l) => (
              <option key={l} value={l} className="bg-[#1a1a2e] text-white">{l}</option>
            ))}
          </select>
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

        {/* Songliste - Tap oeffnet Overlay */}
        <div className="flex flex-col gap-1.5">
          {displaySongs.map((song) => (
            <button
              key={song.id}
              onClick={() => openOverlayWithPreviewStop(song)}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ' +
                'bg-white/5 border border-white/10 active:bg-white/10'}
            >
              {/* Song-Icon */}
              <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-base">
                {'\u{1F3B5}'}
              </div>
              {/* Song-Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{song.title}</p>
                <p className="truncate text-xs text-white/40">{song.artist}</p>
              </div>
              {/* Desktop-Preview Button (nur kontrollierender Companion) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic();
                  if (desktopPreviewSongId === song.id) {
                    handleStopDesktopPreview();
                  } else {
                    handleDesktopPreview(song.id);
                  }
                }}
                className={
                  'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ' +
                  (desktopPreviewSongId === song.id
                    ? 'bg-cyan-500/30 text-cyan-400'
                    : 'bg-white/5 text-white/30 active:text-white/60')
                }
                aria-label={desktopPreviewSongId === song.id
                  ? (t('mobilePreview.stopPreview') || 'Stop Preview')
                  : (t('mobilePreview.playOnDesktop') || 'Preview on Desktop')}
              >
                <span className="text-sm">{desktopPreviewSongId === song.id ? '\u23F9' : '\u{1F50A}'}</span>
              </button>
              {/* Dauer */}
              <span className="shrink-0 text-[10px] font-mono text-white/30 w-8 text-right">{formatDurationSec(song.duration)}</span>
              {/* Chevron */}
              <span className="shrink-0 text-white/20 text-xs">{'\u203A'}</span>
            </button>
          ))}
        </div>

        {/* ============= SONG-OPTIONS-OVERLAY ============= */}
        {overlaySong && (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
            onClick={closeOverlay}
          >
            <div
              className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Overlay Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="min-w-0 flex-1 mr-3">
                  <h3 className="text-base font-bold text-white truncate">{overlaySong.title}</h3>
                  <p className="text-sm text-white/50 truncate">{overlaySong.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/30 font-mono">{formatDurationSec(overlaySong.duration)}</span>
                    {overlaySong.genre && <span className="text-xs text-white/25">{overlaySong.genre}</span>}
                  </div>
                </div>
                <button
                  onClick={closeOverlay}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Game-Mode Badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium text-white/40">{t('mobileViews.gameMode') || 'Modus'}:</span>
                <span className={'rounded-lg px-2.5 py-1 text-xs font-bold ' +
                  (libGameMode === 'single' ? 'bg-cyan-500/25 text-cyan-400' : libGameMode === 'duel' ? 'bg-red-500/25 text-red-400' : 'bg-pink-500/25 text-pink-400')}>
                  {MODE_BUTTONS.find((m) => m.mode === libGameMode)?.icon}{' '}
                  {t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '') === MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey
                    ? MODE_BUTTONS.find((m) => m.mode === libGameMode)?.fallback
                    : t(MODE_BUTTONS.find((m) => m.mode === libGameMode)?.labelKey || '')}
                </span>
              </div>

              {/* Schwierigkeit */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                  {t('mobileViews.difficulty') || 'Schwierigkeit'}
                </h4>
                <div className="flex gap-2">
                  {DIFF_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { haptic(); setOvDifficulty(d.id); }}
                      className={'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-all border ' +
                        (ovDifficulty === d.id ? d.color : 'bg-white/5 border-white/10 text-white/50')}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gegner/Partner-Auswahl (nur Duell/Duett) */}
              {needsChallenge && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 px-1">
                    {libGameMode === 'duel'
                      ? (t('mobileViews.selectOpponent') || 'Gegner wählen')
                      : (t('mobileViews.selectPartner') || 'Duett-Partner wählen')}
                  </h4>
                  <select
                    value={ovPartnerId || ''}
                    onChange={(e) => { haptic(); setOvPartnerId(e.target.value || null); }}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white cursor-pointer"
                    style={dropdownStyle}
                  >
                    {allPartners.length > 0 ? (
                      <option value="" className="bg-[#1a1a2e] text-white">
                        {t('mobileViews.chooseOpponent') || 'Gegner wählen...'}
                      </option>
                    ) : (
                      <option value="" disabled className="bg-[#1a1a2e] text-white">
                        {t('mobileViews.noOpponentsAvailable') || 'Keine Gegner verfügbar'}
                      </option>
                    )}
                    {allPartners.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#1a1a2e] text-white">{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trennlinie */}
              <div className="border-t border-white/10 my-4" />

              {/* Aktions-Buttons */}
              <div className="flex flex-col gap-2.5">
                {/* Zur Queue */}
                <button
                  onClick={handleOverlayQueue}
                  disabled={ovAdding}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  <span className="text-base">{'\u{1F4CB}'}</span>
                  <span>{t('mobileViews.queueTitle') || 'Zur Queue'}</span>
                  {ovAdding && <span className="animate-spin text-xs">{'\u23F3'}</span>}
                </button>

                {/* Zur Playlist */}
                <button
                  onClick={handleOverlayPlaylist}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-purple-500/20 border border-purple-400/30 text-purple-400 active:scale-[0.97] transition-all"
                >
                  <span className="text-base">{'\u{1F4FB}'}</span>
                  <span>{t('mobile.mirrorPlaylist') || 'Zur Playlist'}</span>
                </button>

                {/* Spiel starten */}
                <button
                  onClick={handleOverlayStart}
                  disabled={ovAdding}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border border-cyan-400/20 text-white active:scale-[0.97] transition-all disabled:opacity-40"
                >
                  <span className="text-base">{'\u25B6\uFE0F'}</span>
                  <span>{t('mobile.mirrorStartGame') || 'Spiel starten'}</span>
                </button>

                {/* Fuer Party auswaehlen (nur im Party-Setup Library-Modus) */}
                {gameState.partyGameMode && (
                  <button
                    onClick={() => {
                      if (!overlaySong) return;
                      onSendDesktopCommand(`party_select_song:${overlaySong.id}`);
                      closeOverlay();
                    }}
                    disabled={ovAdding}
                    className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-bold bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-400/20 text-white active:scale-[0.97] transition-all disabled:opacity-40"
                  >
                    <span className="text-base">{'\u{1F3B5}'}</span>
                    <span>{t('mobile.mirrorPartySelect') || 'F\u00fcr Party ausw\u00e4hlen'}</span>
                  </button>
                )}

                {/* Herausfordern (nur Duell/Duett) */}
                {needsChallenge && (
                  <button
                    onClick={handleOverlayChallenge}
                    disabled={ovChallengeSent}
                    className={'w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold active:scale-[0.97] transition-all ' +
                      (ovChallengeSent
                        ? 'bg-green-500/20 border border-green-400/30 text-green-400'
                        : 'bg-red-500/15 border border-red-400/25 text-red-400')}
                  >
                    <span className="text-base">{ovChallengeSent ? '\u2705' : '\u2694\uFE0F'}</span>
                    <span>{ovChallengeSent
                      ? (t('mobile.mirrorChallengeSent') || 'Gesendet!')
                      : (t('desktopChat.challenge') || 'Herausfordern (Chat)')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============= PLAYLIST-PICKER-OVERLAY ============= */}
        {showPlaylistPicker && overlaySong && (
          <div
            className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm"
            onClick={closePlaylistPicker}
          >
            <div
              className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[70vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">{t('mobile.mirrorPlaylistPick') || 'Playlist waehlen'}</h3>
                <button
                  onClick={closePlaylistPicker}
                  className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Song-Info */}
              <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 mb-4">
                <span className="text-base">{'\u{1F3B5}'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{overlaySong.title}</p>
                  <p className="truncate text-xs text-white/40">{overlaySong.artist}</p>
                </div>
              </div>

              {/* Loading */}
              {playlistLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
                </div>
              )}

              {/* Playlist-Liste */}
              {!playlistLoading && playlists.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {playlists.filter((p) => !p.isSystem).map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => handleAddToPlaylist(pl.id)}
                      disabled={playlistAdding === pl.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-white/5 border border-white/10 active:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      <span className="text-base">{'\u{1F4C1}'}</span>
                      <span className="flex-1 text-sm font-medium text-white truncate">{pl.name}</span>
                      {playlistAdding === pl.id && <span className="animate-spin text-xs">{'\u23F3'}</span>}
                      {playlistAdding !== pl.id && <span className="text-white/20 text-xs">{'\u2795'}</span>}
                    </button>
                  ))}
                </div>
              )}

              {!playlistLoading && playlists.filter((p) => !p.isSystem).length === 0 && !showNewPlaylist && (
                <p className="text-xs text-white/30 text-center py-3">
                  {t('mobile.mirrorNoPlaylists') || 'Keine Playlists vorhanden'}
                </p>
              )}

              {/* Neue Playlist */}
              {!showNewPlaylist ? (
                <button
                  onClick={() => { haptic(); setShowNewPlaylist(true); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 active:scale-[0.98] transition-all"
                >
                  <span>{'\u2795'}</span>
                  <span>{t('mobile.mirrorNewPlaylist') || 'Neue Playlist erstellen'}</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder={t('mobile.mirrorPlaylistName') || 'Playlist-Name'}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { haptic(); setShowNewPlaylist(false); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white/70 active:bg-white/20 transition-all"
                    >
                      {t('mobile.mirrorCancel') || 'Abbrechen'}
                    </button>
                    <button
                      onClick={handleCreateAndAddPlaylist}
                      disabled={!newPlaylistName.trim() || playlistAdding === 'new'}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-all disabled:opacity-40"
                    >
                      {playlistAdding === 'new' ? '\u23F3' : t('mobile.mirrorCreateAdd') || 'Erstellen & Hinzufuegen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);
