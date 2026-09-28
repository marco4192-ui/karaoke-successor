'use client';

// ===================== Companion-Mirror: Library (Orchestrator) =====================
//
// R27a-Auslagerung: Die DOM-/Logik-Blöcke leben in fokussierten Modulen im
// Ordner ./library-lite/ (helpers, use-song-filters, use-display-songs,
// use-desktop-preview, use-song-overlay, use-playlist-picker, motto-banner,
// filter-bar, song-list, song-options-overlay, playlist-picker-overlay).
// Dieser Orchestrator besitzt weiterhin Props-Interface, lokalen Game-Mode,
// Partner-Merge (allPartners), Modus-Wechsel und die Komposition.
// NULL Verhaltensänderung — State-, Memo-, Callback-Bodies, JSX, Dep-Arrays,
// data-testids und i18n-Keys sind unverändert übernommen; einzige Deltas:
// `gameState.partyGameMode` → Parameter/Prop `partyGameMode` (use-song-overlay,
// song-options-overlay) plus Hook-/Prop-Verdrahtung.

import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { MobileSong, GameMode, GameState, MobileView } from '../mobile-types';
import { MODE_BUTTONS, haptic } from './library-lite/helpers';
import { useSongFilters } from './library-lite/use-song-filters';
import { useDisplaySongs } from './library-lite/use-display-songs';
import { useDesktopPreview } from './library-lite/use-desktop-preview';
import { useSongOverlay } from './library-lite/use-song-overlay';
import { usePlaylistPicker } from './library-lite/use-playlist-picker';
import { MottoBanner } from './library-lite/motto-banner';
import { FilterBar } from './library-lite/filter-bar';
import { SongList } from './library-lite/song-list';
import { SongOptionsOverlay } from './library-lite/song-options-overlay';
import { PlaylistPickerOverlay } from './library-lite/playlist-picker-overlay';

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
  difficulty: 'easy' | 'medium' | 'hard';
  onDifficultyChange: (d: 'easy' | 'medium' | 'hard') => void;
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

// ===================== Component =====================

export function MirrorLibraryLite({
    songSearch,
    onSongSearchChange,
    songsLoading,
    songsError,
    songs,
    filteredSongs,
    onRefreshSongs,
    opponents,
    availableProfiles,
    clientId,
    onLoadOpponents,
    difficulty,
    playerMicSource,
    partnerMicSource,
    duetPartsSwapped,
    onSendDesktopCommand,
    gameState,
  }: MirrorLibraryLiteProps) {
    const { t } = useTranslation();

    // Lokaler Game-Mode (Single/Duell/Duett)
    const [libGameMode, setLibGameMode] = useState<GameMode>('single');

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

    const handleModeSelect = useCallback((mode: GameMode) => {
      haptic();
      setLibGameMode(mode);
    }, []);

    const {
      genreFilter,
      setGenreFilter,
      languageFilter,
      setLanguageFilter,
      eraFilter,
      setEraFilter,
      filterViral,
      setFilterViral,
    } = useSongFilters();

    const { displaySongs, genres, languages, decades } = useDisplaySongs({
      songs,
      filteredSongs,
      isDuetMode,
      genreFilter,
      languageFilter,
      eraFilter,
      filterViral,
      gameState,
    });

    const { desktopPreviewSongId, handleDesktopPreview, handleStopDesktopPreview } = useDesktopPreview(onSendDesktopCommand);

    const {
      overlaySong,
      ovDifficulty,
      setOvDifficulty,
      ovPartnerId,
      setOvPartnerId,
      ovAdding,
      ovChallengeSent,
      needsChallenge,
      missingOpponent,
      closeOverlay,
      handleOverlayQueue,
      openOverlayWithPreviewStop,
      handleOverlayStart,
      handleOverlayChallenge,
    } = useSongOverlay({
      difficulty,
      onLoadOpponents,
      clientId,
      libGameMode,
      allPartners,
      playerMicSource,
      partnerMicSource,
      duetPartsSwapped,
      onSendDesktopCommand,
      handleStopDesktopPreview,
      partyGameMode: gameState.partyGameMode,
    });

    const {
      showPlaylistPicker,
      playlists,
      playlistLoading,
      newPlaylistName,
      setNewPlaylistName,
      showNewPlaylist,
      setShowNewPlaylist,
      playlistAdding,
      handleOverlayPlaylist,
      handleAddToPlaylist,
      handleCreateAndAddPlaylist,
      closePlaylistPicker,
    } = usePlaylistPicker({ overlaySong, clientId, closeOverlay });

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

        {/* ── MOTTO-PARTY (R25): while active, ALL search fields and filters
            are hidden and replaced by the motto banner (like the desktop
            library) — the song list only shows the motto-matching songs ── */}
        {gameState.mottoParty?.enabled ? (
          <MottoBanner gameState={gameState} displaySongs={displaySongs} songs={songs} />
        ) : (
          <FilterBar
            songSearch={songSearch}
            onSongSearchChange={onSongSearchChange}
            genres={genres}
            languages={languages}
            decades={decades}
            genreFilter={genreFilter}
            setGenreFilter={setGenreFilter}
            languageFilter={languageFilter}
            setLanguageFilter={setLanguageFilter}
            eraFilter={eraFilter}
            setEraFilter={setEraFilter}
            filterViral={filterViral}
            setFilterViral={setFilterViral}
            gameState={gameState}
          />
        )}

        <SongList
          songsLoading={songsLoading}
          songsError={songsError}
          onRefreshSongs={onRefreshSongs}
          displaySongs={displaySongs}
          gameState={gameState}
          desktopPreviewSongId={desktopPreviewSongId}
          handleDesktopPreview={handleDesktopPreview}
          handleStopDesktopPreview={handleStopDesktopPreview}
          openOverlayWithPreviewStop={openOverlayWithPreviewStop}
        />

        {/* ============= SONG-OPTIONS-OVERLAY ============= */}
        {overlaySong && (
          <SongOptionsOverlay
            overlaySong={overlaySong}
            closeOverlay={closeOverlay}
            libGameMode={libGameMode}
            ovDifficulty={ovDifficulty}
            setOvDifficulty={setOvDifficulty}
            needsChallenge={needsChallenge}
            missingOpponent={missingOpponent}
            ovPartnerId={ovPartnerId}
            setOvPartnerId={setOvPartnerId}
            allPartners={allPartners}
            ovAdding={ovAdding}
            ovChallengeSent={ovChallengeSent}
            handleOverlayQueue={handleOverlayQueue}
            handleOverlayPlaylist={handleOverlayPlaylist}
            handleOverlayStart={handleOverlayStart}
            handleOverlayChallenge={handleOverlayChallenge}
            onSendDesktopCommand={onSendDesktopCommand}
            partyGameMode={gameState.partyGameMode}
          />
        )}

        {/* ============= PLAYLIST-PICKER-OVERLAY ============= */}
        {showPlaylistPicker && overlaySong && (
          <PlaylistPickerOverlay
            overlaySong={overlaySong}
            playlists={playlists}
            playlistLoading={playlistLoading}
            playlistAdding={playlistAdding}
            newPlaylistName={newPlaylistName}
            setNewPlaylistName={setNewPlaylistName}
            showNewPlaylist={showNewPlaylist}
            setShowNewPlaylist={setShowNewPlaylist}
            closePlaylistPicker={closePlaylistPicker}
            handleAddToPlaylist={handleAddToPlaylist}
            handleCreateAndAddPlaylist={handleCreateAndAddPlaylist}
          />
        )}
      </div>
    );
  }MirrorLibraryLite.displayName = 'MirrorLibraryLite';
