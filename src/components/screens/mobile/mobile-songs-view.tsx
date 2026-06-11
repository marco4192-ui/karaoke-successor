'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
  onAddToJukebox: (_song: MobileSong) => void;
  onLoadPartners: () => void;
  onLoadOpponents: () => void;
  onRefresh: () => Promise<void>;
  formatDuration: (_ms: number) => string;
  /** Optional callback to resolve an audio URL for a song. When provided and returning a URL,
   *  a preview play button is shown next to the song item. */
  getAudioUrl?: (song: MobileSong) => string | undefined;
  // Queue wizard props
  difficulty?: 'easy' | 'normal' | 'hard';
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
  playerMicSource?: 'companion' | 'microphone';
  onPlayerMicSourceChange: (s: 'companion' | 'microphone') => void;
  partnerMicSource?: 'companion' | 'microphone';
  onPartnerMicSourceChange: (s: 'companion' | 'microphone') => void;
  duetPartsSwapped?: boolean;
  onDuetPartsSwappedChange: (s: boolean) => void;
  addedQueuePosition?: number;
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
  onAddToJukebox,
  onLoadPartners,
  onLoadOpponents,
  onRefresh,
  formatDuration,
  getAudioUrl,
  difficulty = 'normal',
  onDifficultyChange,
  playerMicSource = 'companion',
  onPlayerMicSourceChange,
  partnerMicSource = 'companion',
  onPartnerMicSourceChange,
  duetPartsSwapped = false,
  onDuetPartsSwappedChange,
  addedQueuePosition = 0,
}: SongsViewProps) {
  const { t } = useTranslation();
  const songListRef = useRef<HTMLDivElement>(null);

  // F12: Song preview hook (plays 15-second audio clips)
  const preview = useMobileSongPreview();

  // Queue wizard step state: 0 = mode+difficulty, 1 = overview/mic, 2 = opponent, 3 = feedback
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
  const [addedToJukebox, setAddedToJukebox] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset wizard when song options change
  useEffect(() => {
    if (showSongOptions) {
      setWizardStep(0);
    }
  }, [showSongOptions]);

  // Reset addedToJukebox when song options change
  useEffect(() => {
    setAddedToJukebox(false);
  }, [showSongOptions?.id]);

  // Auto-dismiss feedback after 2s
  useEffect(() => {
    if (wizardStep === 3) {
      feedbackTimerRef.current = setTimeout(() => {
        setWizardStep(0);
        onShowSongOptions(null);
      }, 2000);
    }
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [wizardStep, onShowSongOptions]);

  const isBattleMode = selectedGameMode === 'duel' || selectedGameMode === 'duet';

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

  // Helper to close wizard
  const closeWizard = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setAddedToJukebox(false);
    setWizardStep(0);
    onShowSongOptions(null);
    onSelectPartner(null);
    onSelectGameMode('single');
  }, [onShowSongOptions, onSelectPartner, onSelectGameMode]);

  // Helper to handle add to queue and show feedback
  const handleAddToQueue = useCallback(() => {
    if (!showSongOptions) return;
    onAddToQueue(showSongOptions);
    setWizardStep(3);
  }, [showSongOptions, onAddToQueue]);

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

      {/* ══════════════════════════════════════════════════════════
          QUEUE WIZARD — Step-based modal for adding songs to queue
          Step 0: Mode + Difficulty selection
          Step 1: Single = Overview + Mic | Duel/Duet = Opponent selection
          Step 2: Duel/Duet = Overview + Mic
          Step 3: Feedback overlay (auto-dismiss)
      ══════════════════════════════════════════════════════════ */}
      {showSongOptions && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeWizard(); }}
        >
          <div
            className="w-full max-w-sm mx-auto bg-gray-900/95 border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '75dvh', minHeight: 'auto' }}
          >
            {/* ── Step 3: Feedback ── */}
            {wizardStep === 3 && (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">✓</div>
                <p className="text-white font-bold text-sm">
                  {addedToJukebox ? t('mobileViews.addedToJukebox') : t('mobileViews.songAddedToQueue')}
                </p>
                {!addedToJukebox && addedQueuePosition > 0 && (
                  <p className="text-white/50 text-xs mt-1">{t('mobileViews.positionInQueue').replace('{n}', String(addedQueuePosition))}</p>
                )}
              </div>
            )}

            {/* ── Step 0: Mode + Difficulty ── */}
            {wizardStep === 0 && (
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
                {/* Header */}
                <div className="flex-shrink-0 px-4 pt-3 pb-2">
                  <p className="text-white font-bold text-sm truncate">{showSongOptions.title}</p>
                  <p className="text-white/40 text-xs truncate">{showSongOptions.artist}</p>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
                  {/* Game Mode */}
                  <div>
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.gameMode')}</label>
                    <div className="mt-1.5">
                    <div className={`grid gap-1.5 ${showSongOptions.isDuet ? 'grid-cols-4' : 'grid-cols-3'}`}>
                      {(['single', 'duel', ...(showSongOptions.isDuet ? ['duet' as const] : [])] as const).map((mode) => {
                        type GameMode = 'single' | 'duel' | 'duet';
                        const m = mode as GameMode;
                        const icons: Record<GameMode, string> = { single: '🎤', duel: '⚔️', duet: '🎭' };
                        const labels: Record<GameMode, string> = { single: 'mobileViews.gameModeSingle', duel: 'mobileViews.gameModeDuel', duet: 'mobileViews.gameModeDuet' };
                        const isActive = selectedGameMode === m;
                        return (
                          <button
                            key={m}
                            onClick={() => onSelectGameMode(m)}
                            className={`px-2 py-2 rounded-lg text-center transition-all text-xs ${
                              isActive
                                ? m === 'single' ? 'bg-cyan-500/30 text-white border border-cyan-500/50'
                                  : m === 'duel' ? 'bg-red-500/30 text-white border border-red-500/50'
                                  : 'bg-pink-500/30 text-white border border-pink-500/50'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <span className="text-lg block mb-0.5">{icons[m]}</span>
                            <span className="text-[10px]">{t(labels[m])}</span>
                          </button>
                        );
                      })}
                      {/* Jukebox button */}
                      <button
                        onClick={() => {
                          onAddToJukebox(showSongOptions);
                          setAddedToJukebox(true);
                          setWizardStep(3);
                        }}
                        className="px-2 py-2 rounded-lg text-center transition-all text-xs bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                      >
                        <span className="text-lg block mb-0.5">📻</span>
                        <span className="text-[10px]">{t('mobileViews.jukeboxBtn')}</span>
                      </button>
                    </div>
                  </div>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.difficulty')}</label>
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                      {(['easy', 'normal', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => onDifficultyChange(d)}
                          className={`px-2 py-1.5 rounded-lg text-center transition-all text-xs ${
                            difficulty === d
                              ? 'bg-purple-500/30 text-white border border-purple-500/50'
                              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <span className="text-[11px] font-medium">{t(`mobileViews.${d}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
                    {t('mobileViews.cancel')}
                  </button>
                  <button
                    onClick={() => {
                      if (isBattleMode) {
                        onLoadOpponents();
                        setWizardStep(2); // Go to opponent selection
                      } else {
                        setWizardStep(1); // Go to overview + mic (Single)
                      }
                    }}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold disabled:opacity-40"
                    disabled={false}
                  >
                    {t('mobileViews.next')} →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: Overview + Mic Selection (Single or Duel/Duet after opponent) ── */}
            {wizardStep === 1 && (
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
                {/* Header */}
                <div className="flex-shrink-0 px-4 pt-3 pb-1">
                  <button onClick={() => setWizardStep(isBattleMode ? 2 : 0)} className="text-white/40 text-xs hover:text-white/70">
                    ← {isBattleMode ? t('mobileViews.selectOpponent') : t('mobileViews.gameMode')}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
                  {/* Song Overview */}
                  <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
                    <p className="text-white font-medium text-sm truncate">{showSongOptions.title}</p>
                    <p className="text-white/40 text-xs truncate">{showSongOptions.artist}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        selectedGameMode === 'single' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                        : selectedGameMode === 'duel' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                      }`}>
                        {selectedGameMode === 'single' ? '🎤' : selectedGameMode === 'duel' ? '⚔️' : '🎭'} {t(`mobileViews.gameMode${selectedGameMode === 'single' ? 'Single' : selectedGameMode === 'duel' ? 'Duel' : 'Duet'}`)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">{t(`mobileViews.${difficulty}`)}</span>
                    </div>

                    {/* Duel/Duet: Player + Opponent display */}
                    {isBattleMode && selectedPartner && (
                      <div className="flex items-center justify-center gap-3 mt-2 py-1.5 rounded-lg bg-white/5">
                        <div className="text-center min-w-[60px]">
                          <p className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle')}</p>
                        </div>
                        <span className="text-sm font-black text-red-400">VS</span>
                        <div className="text-center min-w-[60px]">
                          <p className="text-xs text-white font-medium truncate max-w-[80px]">{selectedPartner.name}</p>
                        </div>
                      </div>
                    )}

                    {/* Duett: P1/P2 indicator with switch */}
                    {selectedGameMode === 'duet' && selectedPartner && (
                      <div className="flex items-center justify-between mt-1 px-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">{t('mobileViews.part1')}</span>
                          <span className="text-[10px] text-white/30">•</span>
                          <span className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle')}</span>
                        </div>
                        <button
                          onClick={() => onDuetPartsSwappedChange(!duetPartsSwapped)}
                          className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-white/20 border border-white/10"
                        >
                          🔄 {t('mobileViews.switchParts')}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40">{selectedPartner.name}</span>
                          <span className="text-[10px] text-white/30">•</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-medium">{t('mobileViews.part2')}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mic Selection - Player */}
                  <div>
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
                      {t('mobileViews.micSelection')} — {isBattleMode && !duetPartsSwapped ? t('mobileViews.part1') : isBattleMode && duetPartsSwapped ? t('mobileViews.part2') : t('mobileViews.gameModeSingle')}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      <button
                        onClick={() => onPlayerMicSourceChange('companion')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                          playerMicSource === 'companion'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <span className="text-sm">📱</span>
                        <span>{t('mobileViews.singViaCompanion')}</span>
                      </button>
                      <button
                        onClick={() => onPlayerMicSourceChange('microphone')}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                          playerMicSource === 'microphone'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <span className="text-sm">🎤</span>
                        <span>{t('mobileViews.singViaMic')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Mic Selection - Partner (Duel/Duet only) */}
                  {isBattleMode && selectedPartner && (
                    <div>
                      <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
                        {t('mobileViews.micSelection')} — {selectedPartner.name}
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <button
                          onClick={() => onPartnerMicSourceChange('companion')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                            partnerMicSource === 'companion'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <span className="text-sm">📱</span>
                          <span>{t('mobileViews.singViaCompanion')}</span>
                        </button>
                        <button
                          onClick={() => onPartnerMicSourceChange('microphone')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
                            partnerMicSource === 'microphone'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <span className="text-sm">🎤</span>
                          <span>{t('mobileViews.singViaMic')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
                    {t('mobileViews.cancel')}
                  </button>
                  <button
                    onClick={handleAddToQueue}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                  >
                    + {t('mobileViews.addToQueueBtn')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Duel/Duet — Opponent Selection ── */}
            {wizardStep === 2 && (
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
                {/* Header */}
                <div className="flex-shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
                  <button onClick={() => setWizardStep(0)} className="text-white/40 text-xs hover:text-white/70">← {t('mobileViews.gameMode')}</button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2.5">
                  {/* Song info */}
                  <div className="bg-white/5 rounded-lg p-2.5">
                    <p className="text-white font-medium text-xs truncate">{showSongOptions.title}</p>
                    <p className="text-white/40 text-[10px] truncate">{showSongOptions.artist}</p>
                  </div>

                  {/* Random button */}
                  {hasEnhancedOpponents && (
                    <button
                      onClick={handleRandomOpponent}
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 text-amber-300 text-xs font-medium"
                    >
                      🎲 {t('mobileViews.randomOpponent')}
                    </button>
                  )}

                  {/* Opponents list */}
                  {hasEnhancedOpponents ? (
                    <div className="space-y-1">
                      {opponents.length > 0 && (
                        <p className="text-[10px] text-green-400/80 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                          {t('mobileViews.onlineNow')} ({opponents.length})
                        </p>
                      )}
                      <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                        {opponents.map((opp) => (
                          <button
                            key={opp.id}
                            onClick={() => onSelectPartner(
                              selectedPartner?.id === (opp.connectionCode || opp.id) ? null : { id: opp.connectionCode || opp.id, name: opp.name }
                            )}
                            className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
                              selectedPartner?.id === (opp.connectionCode || opp.id)
                                ? 'bg-red-500/20 border border-red-500/40'
                                : 'bg-white/5 hover:bg-white/8 border border-transparent'
                            }`}
                          >
                            <div className="rounded-full p-0.5 flex-shrink-0"
                              style={{ backgroundColor: selectedPartner?.id === (opp.connectionCode || opp.id) ? opp.color : 'transparent' }}
                            >
                              {renderAvatar(opp, 28)}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-medium truncate text-white">{opp.name}</p>
                            </div>
                            {selectedPartner?.id === (opp.connectionCode || opp.id) && (
                              <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full">VS</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {availableProfiles.length > 0 && (
                        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-2 mb-1">
                          {t('mobileViews.availableProfiles')} ({availableProfiles.length})
                        </p>
                      )}
                      {availableProfiles.length > 0 && (
                        <div className="space-y-1 max-h-[20vh] overflow-y-auto">
                          {availableProfiles.map((prof) => (
                            <button
                              key={prof.id}
                              onClick={() => onSelectPartner(
                                selectedPartner?.id === prof.id ? null : { id: prof.id, name: prof.name }
                              )}
                              className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
                                selectedPartner?.id === prof.id
                                  ? 'bg-red-500/20 border border-red-500/40'
                                  : 'bg-white/3 hover:bg-white/8 border border-transparent'
                              }`}
                            >
                              <div className="rounded-full p-0.5 flex-shrink-0"
                                style={{ backgroundColor: selectedPartner?.id === prof.id ? prof.color : 'transparent' }}
                              >
                                {renderAvatar(prof, 24)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[11px] text-white/70 truncate">{prof.name}</p>
                              </div>
                              {selectedPartner?.id === prof.id && (
                                <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full">VS</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : availablePartners.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">{t('mobileViews.onlineNow')}</p>
                      <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                        {availablePartners.map((partner) => (
                          <button
                            key={partner.id}
                            onClick={() => onSelectPartner(selectedPartner?.id === partner.id ? null : partner)}
                            className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
                              selectedPartner?.id === partner.id
                                ? 'bg-purple-500/20 border border-purple-500/40'
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-[11px]">
                              {partner.name[0]}
                            </div>
                            <span className="flex-1 text-left text-xs">{partner.name}</span>
                            <span className="text-[10px] text-white/30">#{partner.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/40 py-3 text-center">{t('mobileViews.noOpponents')}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
                  <button onClick={() => setWizardStep(0)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
                    {t('mobileViews.cancel')}
                  </button>
                  {selectedPartner ? (
                    <button
                      onClick={() => setWizardStep(1)}
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                    >
                      {t('mobileViews.next')} →
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex-1 py-2 rounded-lg bg-white/5 text-white/30 text-xs font-bold opacity-40"
                    >
                      {t('mobileViews.next')} →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
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
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0 relative">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {song.isDuet ? (
                      <span className="text-lg">🎭</span>
                    ) : (
                      <MusicIcon className="w-5 h-5 text-white/30" />
                    )}
                  </div>
                )}
                {/* Duet badge overlay for songs with cover */}
                {song.isDuet && song.coverImage && (
                  <div className="absolute bottom-0 right-0 bg-pink-500/90 rounded-tl text-[8px] px-1 leading-tight font-bold">🎭</div>
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
