'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import { MobilePullRefresh } from './mobile-pull-refresh';
import { MobileChallengeButton } from './mobile-challenge-button';
import { MobilePreviewButton } from './mobile-preview-button';
import { useMobileSongPreview } from '@/hooks/use-mobile-song-preview';
import type { MobileSong} from './mobile-types';
import type { OpponentProfile } from '@/hooks/use-mobile-data';
import { MOOD_CATEGORIES } from '@/lib/mood-mapper';
import { filterSongsByMood } from '@/lib/mood-mapper';
import type { MoodId } from '@/lib/mood-mapper';

interface SongsViewProps {
  songSearch: string;
  onSongSearchChange: (_value: string) => void;
  songsLoading: boolean;
  songsError?: string | null;
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
  selectedGameMode: 'single' | 'duel' | 'duet';
  selectedPartner: { id: string; name: string } | null;
  availablePartners: Array<{ id: string; name: string; code: string }>;
  // F19: Enhanced opponent data
  opponents: OpponentProfile[];
  availableProfiles: OpponentProfile[];
  onShowSongOptions: (_song: MobileSong | null) => void;
  onSelectGameMode: (mode: 'single' | 'duel' | 'duet') => void;
  onSelectPartner: (partner: { id: string; name: string } | null) => void;
  onAddToQueue: (_song: MobileSong) => void;
  onLoadPartners: () => void;
  onLoadOpponents: () => void;
  onRefresh: () => Promise<void>;
  formatDuration: (_ms: number) => string;
  /** Optional callback to resolve an audio URL for a song. When provided and returning a URL,
   *  a preview play button is shown next to the song item. */
  getAudioUrl?: (song: MobileSong) => string | undefined;
}

export function MobileSongsView({
  songSearch,
  onSongSearchChange,
  songsLoading,
  songsError,
  songs,
  filteredSongs,
  showSongOptions,
  selectedGameMode,
  selectedPartner,
  availablePartners,
  opponents,
  availableProfiles,
  onShowSongOptions,
  onSelectGameMode,
  onSelectPartner,
  onAddToQueue,
  onLoadPartners,
  onLoadOpponents,
  onRefresh,
  formatDuration,
  getAudioUrl,
}: SongsViewProps) {
  const { t } = useTranslation();
  const songListRef = useRef<HTMLDivElement>(null);

  // F12: Song preview hook (plays 15-second audio clips)
  const preview = useMobileSongPreview();

  // Helper to resolve audio URL for a song
  const resolveAudioUrl = useCallback((song: MobileSong): string | undefined => {
    if (getAudioUrl) return getAudioUrl(song);
    return undefined;
  }, [getAudioUrl]);

  // F5: Mood-based filtering
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

  // Apply mood filter on top of existing filteredSongs (AND logic with search/genre/language)
  const moodFilteredSongs = useMemo(() => {
    return filterSongsByMood(filteredSongs, selectedMood);
  }, [filteredSongs, selectedMood]);

  // Debounced search: local state for immediate UI, ref timer for delayed propagation
  const [searchInput, setSearchInput] = useState(songSearch);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external songSearch into local state when it changes externally
  useEffect(() => {
    setSearchInput(songSearch);
  }, [songSearch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      onSongSearchChange(value);
    }, 300);
  }, [onSongSearchChange]);

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, []);

  // Scroll song list to top when search query or mood changes
  useEffect(() => {
    songListRef.current?.scrollTo(0, 0);
  }, [songSearch, selectedMood]);

  // Load opponents when song options modal opens in duel/duet mode
  useEffect(() => {
    if (showSongOptions && (selectedGameMode === 'duel' || selectedGameMode === 'duet')) {
      onLoadOpponents();
    }
  }, [showSongOptions, selectedGameMode, onLoadOpponents]);

  // F19: Random opponent selection handler
  const handleRandomOpponent = useCallback(() => {
    // Combine connected opponents with available profiles for random selection
    const allOpponents = [...opponents, ...availableProfiles];
    if (allOpponents.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allOpponents.length);
    const chosen = allOpponents[randomIndex];
    onSelectPartner({ id: chosen.connectionCode || chosen.id, name: chosen.name });
  }, [opponents, availableProfiles, onSelectPartner]);

  // F19: Helper to render opponent avatar
  const renderAvatar = useCallback((opponent: OpponentProfile, size: number = 32) => {
    if (opponent.avatar) {
      return (
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
        >
          <img
            src={opponent.avatar}
            alt={opponent.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      );
    }
    return (
      <div
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          backgroundColor: opponent.color,
        }}
      >
        <span style={{ fontSize: size * 0.45 }}>{opponent.name[0]?.toUpperCase()}</span>
      </div>
    );
  }, []);

  // F19: Determine if we have enhanced opponent data available
  const hasEnhancedOpponents = opponents.length > 0 || availableProfiles.length > 0;
  const isBattleMode = selectedGameMode === 'duel' || selectedGameMode === 'duet';

  return (
    <>
    <MobilePullRefresh onRefresh={onRefresh} className="h-full">
    <div className="p-4">
      {/* Search */}
      <div className="relative mb-4">
        <Input
          id="song-search-modal"
          name="song-search-modal"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('mobileViews.searchPlaceholder')}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      
      {/* F5: Mood Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-1 px-1">
        <button
          onClick={() => setSelectedMood(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            selectedMood === null
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
          }`
        }
        >
          {t('mobileMoods.all')}
        </button>
        {MOOD_CATEGORIES.map((mood) => (
          <button
            key={mood.id}
            onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedMood === mood.id
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
            }`
          }
          >
            <span>{mood.icon}</span>
            <span>{t(`mobileMoods.${mood.id}` as Parameters<typeof t>[0])}</span>
          </button>
        ))}
      </div>

      {/* Song Options Modal */}
      {showSongOptions && (
        <Card className="bg-white/10 border-white/20 mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{showSongOptions.title}</CardTitle>
            <p className="text-sm text-white/40">{showSongOptions.artist}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Game Mode Selection */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('mobileViews.gameMode')}</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onSelectGameMode('single')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'single' 
                      ? 'bg-cyan-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎤</span>
                  <span className="text-xs">{t('mobileViews.gameModeSingle')}</span>
                </button>
                <button
                  onClick={() => onSelectGameMode('duel')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'duel' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">⚔️</span>
                  <span className="text-xs">{t('mobileViews.gameModeDuel')}</span>
                </button>
                <button
                  onClick={() => onSelectGameMode('duet')}
                  className={`p-3 rounded-lg text-center transition-all ${
                    selectedGameMode === 'duet' 
                      ? 'bg-pink-500 text-white' 
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl block mb-1">🎭</span>
                  <span className="text-xs">{t('mobileViews.gameModeDuet')}</span>
                </button>
              </div>
            </div>
            
            {/* F19: Enhanced Opponent Selection (for duel/duet mode) */}
            {isBattleMode && (
              <div>
                {/* Section header with VS battle visual */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-white/20" />
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                    {selectedGameMode === 'duel' ? '⚔️' : '🎭'}
                    {t('mobileViews.selectOpponent')}
                    {selectedGameMode === 'duel' ? '⚔️' : '🎭'}
                  </span>
                  <div className="flex-1 h-px bg-white/20" />
                </div>

                {/* Random button (fun for parties) */}
                {(opponents.length > 0 || availableProfiles.length > 0) && (
                  <button
                    onClick={handleRandomOpponent}
                    className="w-full p-2.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:from-amber-500/30 hover:to-orange-500/30 transition-all mb-3"
                  >
                    🎲 {t('mobileViews.randomOpponent')}
                  </button>
                )}

                {/* Online Now section - connected companions with profiles */}
                {hasEnhancedOpponents ? (
                  <>
                    {opponents.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-green-400/80 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                          {t('mobileViews.onlineNow')} ({opponents.length})
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {opponents.map((opponent) => (
                            <button
                              key={opponent.id}
                              onClick={() => onSelectPartner(
                                selectedPartner?.id === (opponent.connectionCode || opponent.id) ? null : { id: opponent.connectionCode || opponent.id, name: opponent.name }
                              )}
                              className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                                selectedPartner?.id === (opponent.connectionCode || opponent.id)
                                  ? 'bg-red-500/25 border border-red-500/40 shadow-lg shadow-red-500/10'
                                  : 'bg-white/5 hover:bg-white/10 border border-transparent'
                              }`}
                            >
                              {/* Avatar with color ring */}
                              <div
                                className="rounded-full p-0.5 flex-shrink-0"
                                style={{ backgroundColor: selectedPartner?.id === (opponent.connectionCode || opponent.id) ? opponent.color : 'transparent' }}
                              >
                                {renderAvatar(opponent, 36)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="font-medium text-sm truncate">{opponent.name}</p>
                                <p className="text-[10px] text-white/30">#{opponent.connectionCode}</p>
                              </div>
                              {/* VS indicator when selected */}
                              {selectedPartner?.id === (opponent.connectionCode || opponent.id) && (
                                <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                                  VS
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Available Profiles section - host profiles not yet claimed */}
                    {availableProfiles.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">
                          {t('mobileViews.availableProfiles')} ({availableProfiles.length})
                        </p>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {availableProfiles.map((profile) => (
                            <button
                              key={profile.id}
                              onClick={() => onSelectPartner(
                                selectedPartner?.id === profile.id ? null : { id: profile.id, name: profile.name }
                              )}
                              className={`w-full p-2 rounded-lg flex items-center gap-3 transition-all ${
                                selectedPartner?.id === profile.id
                                  ? 'bg-red-500/25 border border-red-500/40'
                                  : 'bg-white/3 hover:bg-white/8 border border-transparent'
                              }`}
                            >
                              <div
                                className="rounded-full p-0.5 flex-shrink-0"
                                style={{ backgroundColor: selectedPartner?.id === profile.id ? profile.color : 'transparent' }}
                              >
                                {renderAvatar(profile, 32)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm text-white/70 truncate">{profile.name}</p>
                              </div>
                              {selectedPartner?.id === profile.id && (
                                <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
                                  VS
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : availablePartners.length > 0 ? (
                  /* Fallback to old partner list if enhanced data hasn't loaded yet */
                  <div>
                    <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-2">
                      {t('mobileViews.onlineNow')}
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {availablePartners.map((partner) => (
                        <button
                          key={partner.id}
                          onClick={() => onSelectPartner(
                            selectedPartner?.id === partner.id ? null : partner
                          )}
                          className={`w-full p-2.5 rounded-lg flex items-center gap-3 transition-all ${
                            selectedPartner?.id === partner.id 
                              ? 'bg-purple-500/30 border border-purple-500/50' 
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                            {partner.name[0]}
                          </div>
                          <span className="flex-1 text-left">{partner.name}</span>
                          <span className="text-xs text-white/40">#{partner.code}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-white/40 py-2 text-center">
                    {t('mobileViews.noOpponents')}
                  </p>
                )}

                {/* Selected opponent battle preview */}
                {selectedPartner && isBattleMode && (
                  <div className="mt-3 flex items-center justify-center gap-3 py-2 px-3 rounded-lg bg-white/5">
                    <div className="text-center">
                      <span className="text-xs text-white/40">{t('mobileViews.gameModeSingle')}</span>
                    </div>
                    <span className="text-lg font-black text-red-400 animate-pulse">VS</span>
                    <div className="text-center">
                      <span className="text-xs text-white/40">{selectedPartner.name}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onShowSongOptions(null);
                  onSelectPartner(null);
                  onSelectGameMode('single');
                }}
                className="flex-1 border-white/20"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={() => onAddToQueue(showSongOptions)}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {t('song.addToQueue')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Error State */}
      {songsError && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {songsError}
        </div>
      )}

      {/* Song List */}
      {songsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
          <span className="text-white/60">{t('common.loading')}</span>
        </div>
      ) : (
        <div ref={songListRef} className="space-y-2 pb-4">
          {moodFilteredSongs.map((song) => (
            <div 
              key={song.id || `song-${song.title}-${song.artist}`}
              className="flex items-center gap-2 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors min-w-0"
            >
              {/* Add to Queue Button — always visible, rendered FIRST for guaranteed visibility */}
              <button
                onClick={() => {
                  onShowSongOptions(song);
                  onLoadPartners();
                }}
                className="bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold rounded-lg transition-colors"
                style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}
                aria-label={t('mobileViews.songAdded')}
              >
                +
              </button>
              
              {/* Cover */}
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-5 h-5 text-white/30" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{song.title || t('common.unknown')}</p>
                <p className="text-xs text-white/40 truncate">{song.artist || t('common.unknown')}</p>
              </div>
              
              {/* F12: Preview button — only shown when audio URL is available */}
              {resolveAudioUrl(song) && (
                <MobilePreviewButton
                  songId={song.id}
                  audioUrl={resolveAudioUrl(song)}
                  isPlaying={preview.isPreviewPlaying && preview.previewSongId === song.id}
                  progress={preview.previewSongId === song.id ? preview.previewProgress : 0}
                  onPlayPreview={preview.playPreview}
                  onStopPreview={preview.stopPreview}
                />
              )}

              {/* Duration */}
              <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">
                {song.duration > 0 ? formatDuration(song.duration) : '--:--'}
              </span>
            </div>
          ))}
          
          {moodFilteredSongs.length === 0 && selectedMood && (
            <div className="text-center py-12 text-white/40">
              <p className="text-lg mb-1">🎵</p>
              {t('mobileMoods.noSongs')}
            </div>
          )}
          {moodFilteredSongs.length === 0 && !selectedMood && (
            <div className="text-center py-12 text-white/40">
              <p className="text-lg mb-1">🎵</p>
              {t('mobileViews.noSongsFound')}
            </div>
          )}
        </div>
      )}
    </div>
    </MobilePullRefresh>

    {/* F3: Random Song Challenge FAB */}
    <MobileChallengeButton
      songs={songs}
      onRandomChallenge={onAddToQueue}
      disabled={songsLoading}
    />
    </>
  );
}
