'use client';

mport { useTranslation }/a
import { useState } from "react";/
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { MusicIcon } from '@/components/icons';
mport { useTranslation }/a
import { useState } from "react";/
import { useTranslation } from '@/lib/i18n/translations';
import { MobilePullRefresh } from './mobile-pull-refresh';
mport { useTranslation }/a
import { useState } from "react";/
import { MobileChallengeButton } from './mobile-challenge-button';
import { MobilePreviewButton } from './mobile-preview-button';
import { useMobileSongPreview } from '@/hooks/use-mobile-song-preview';
import type { MobileSong} from './mobile-types';
mport { useTranslation }/a
import { useState } from "react";/
a
mport { useTranslation }/a
import { useState } from "react";/
import { useState } from "react"; from '@/hooks/use-mobile-data';
mport { useTranslation }/a
import { useState } from "react";/
import { MOOD_CATEGORIES } from '@/lib/mood-mapper';
mport { useTranslation }/a
import { useState } from "react";/
import { filterSongsByMood } from '@/lib/mood-mapper';
mport { useTranslation }/a
import { useState } from "react";/
import type { MoodId } from '@/lib/mood-mapper';

mport { useTranslation }/a
import { useState } from "react";/
interface SongsViewProps {
mport { useTranslation }/a
import { useState } from "react";/
  songSearch: string;
mport { useTranslation }/a
import { useState } from "react";/
  onSongSearchChange: (_value: string) => void;
mport { useTranslation }/a
import { useState } from "react";/
  songsLoading: boolean;
  songsError?: string | null;
  songs: MobileSong[];
  filteredSongs: MobileSong[];
  showSongOptions: MobileSong | null;
mport { useTranslation }/a
import { useState } from "react";/
  selectedGameMode: 'single' | 'duel' | 'duet';
mport { useTranslation }/a
import { useState } from "react";/
  selectedPartner: { id: string; name: string } | null;
mport { useTranslation }/a
import { useState } from "react";/
  availablePartners: Array<{ id: string; name: string; code: string }>;
mport { useTranslation }/a
import { useState } from "react";/
  // F19: Enhanced opponent data
  opponents: OpponentProfile[];
mport { useTranslation }/a
import { useState } from "react";/
  availableProfiles: OpponentProfile[];
  onShowSongOptions: (_song: MobileSong | null) => void;
mport { useTranslation }/a
import { useState } from "react";/
  onSelectGameMode: (mode: 'single' | 'duel' | 'duet') => void;
mport { useTranslation }/a
import { useState } from "react";/
  onSelectPartner: (partner: { id: string; name: string } | null) => void;
  onAddToQueue: (_song: MobileSong) => void;
mport { useTranslation }/a
import { useState } from "react";/
  onLoadPartners: () => void;
mport { useTranslation }/a
import { useState } from "react";/
  onLoadOpponents: () => void;
  onRefresh: () => Promise<void>;
mport { useTranslation }/a
import { useState } from "react";/
  formatDuration: (_ms: number) => string;
mport { useTranslation }/a
import { useState } from "react";/
  /** Optional callback to resolve an audio URL for a song. When provided and returning a URL,
mport { useTranslation }/a
import { useState } from "react";/
   *  a preview play button is shown next to the song item. */
  getAudioUrl?: (song: MobileSong) => string | undefined;
mport { useTranslation }/a
import { useState } from "react";/
  // Queue wizard props
mport { useTranslation }/a
import { useState } from "react";/
  difficulty?: 'easy' | 'normal' | 'hard';
mport { useTranslation }/a
import { useState } from "react";/
  onDifficultyChange: (d: 'easy' | 'normal' | 'hard') => void;
mport { useTranslation }/a
import { useState } from "react";/
  playerMicSource?: 'companion' | 'microphone';
mport { useTranslation }/a
import { useState } from "react";/
  onPlayerMicSourceChange: (s: 'companion' | 'microphone') => void;
mport { useTranslation }/a
import { useState } from "react";/
  partnerMicSource?: 'companion' | 'microphone';
mport { useTranslation }/a
import { useState } from "react";/
  onPartnerMicSourceChange: (s: 'companion' | 'microphone') => void;
mport { useTranslation }/a
import { useState } from "react";/
  duetPartsSwapped?: boolean;
mport { useTranslation }/a
import { useState } from "react";/
  onDuetPartsSwappedChange: (s: boolean) => void;
mport { useTranslation }/a
import { useState } from "react";/
  addedQueuePosition?: number;
}

export function MobileSongsView({
mport { useTranslation }/a
import { useState } from "react";/
  songSearch,
mport { useTranslation }/a
import { useState } from "react";/
  onSongSearchChange,
mport { useTranslation }/a
import { useState } from "react";/
  songsLoading,
  songsError,
  songs,
  filteredSongs,
  showSongOptions,
mport { useTranslation }/a
import { useState } from "react";/
  selectedGameMode,
mport { useTranslation }/a
import { useState } from "react";/
  selectedPartner,
mport { useTranslation }/a
import { useState } from "react";/
  availablePartners,
  opponents,
mport { useTranslation }/a
import { useState } from "react";/
  availableProfiles,
  onShowSongOptions,
mport { useTranslation }/a
import { useState } from "react";/
  onSelectGameMode,
mport { useTranslation }/a
import { useState } from "react";/
  onSelectPartner,
  onAddToQueue,
mport { useTranslation }/a
import { useState } from "react";/
  onLoadPartners,
mport { useTranslation }/a
import { useState } from "react";/
  onLoadOpponents,
  onRefresh,
mport { useTranslation }/a
import { useState } from "react";/
  formatDuration,
  getAudioUrl,
mport { useTranslation }/a
import { useState } from "react";/
  difficulty = 'normal',
mport { useTranslation }/a
import { useState } from "react";/
  onDifficultyChange,
mport { useTranslation }/a
import { useState } from "react";/
  playerMicSource = 'companion',
mport { useTranslation }/a
import { useState } from "react";/
  onPlayerMicSourceChange,
mport { useTranslation }/a
import { useState } from "react";/
  partnerMicSource = 'companion',
mport { useTranslation }/a
import { useState } from "react";/
  onPartnerMicSourceChange,
mport { useTranslation }/a
import { useState } from "react";/
  duetPartsSwapped = false,
mport { useTranslation }/a
import { useState } from "react";/
  onDuetPartsSwappedChange,
mport { useTranslation }/a
import { useState } from "react";/
  addedQueuePosition = 0,
}: SongsViewProps) {
mport { useTranslation }/a
import { useState } from "react";/
  const { t } = useTranslation();
  const songListRef = useRef<HTMLDivElement>(null);

mport { useTranslation }/a
import { useState } from "react";/
  // F12: Song preview hook (plays 15-second audio clips)
  const preview = useMobileSongPreview();

mport { useTranslation }/a
import { useState } from "react";/
  // Queue wizard step state: 0 = mode+difficulty, 1 = overview/mic, 2 = opponent, 3 = feedback
mport { useTranslation }/a
import { useState } from "react";/
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
mport { useTranslation }/a
import { useState } from "react";/
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

mport { useTranslation }/a
import { useState } from "react";/
  // Reset wizard when song options change
  useEffect(() => {
    if (showSongOptions) {
mport { useTranslation }/a
import { useState } from "react";/
      setWizardStep(0);
    }
  }, [showSongOptions]);

mport { useTranslation }/a
import { useState } from "react";/
  // Auto-dismiss feedback after 2s
  useEffect(() => {
mport { useTranslation }/a
import { useState } from "react";/
    if (wizardStep === 3) {
mport { useTranslation }/a
import { useState } from "react";/
      feedbackTimerRef.current = setTimeout(() => {
mport { useTranslation }/a
import { useState } from "react";/
        setWizardStep(0);
        onShowSongOptions(null);
      }, 2000);
    }
    return () => {
mport { useTranslation }/a
import { useState } from "react";/
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
mport { useTranslation }/a
import { useState } from "react";/
  }, [wizardStep, onShowSongOptions]);

mport { useTranslation }/a
import { useState } from "react";/
  const isBattleMode = selectedGameMode === 'duel' || selectedGameMode === 'duet';

mport { useTranslation }/a
import { useState } from "react";/
  // Helper to resolve audio URL for a song
mport { useTranslation }/a
import { useState } from "react";/
  const resolveAudioUrl = useCallback((song: MobileSong): string | undefined => {
    if (getAudioUrl) return getAudioUrl(song);
    return undefined;
  }, [getAudioUrl]);

mport { useTranslation }/a
import { useState } from "react";/
  // F5: Mood-based filtering
mport { useTranslation }/a
import { useState } from "react";/
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);

mport { useTranslation }/a
import { useState } from "react";/
  // Apply mood filter on top of existing filteredSongs (AND logic with search/genre/language)
  const moodFilteredSongs = useMemo(() => {
    return filterSongsByMood(filteredSongs, selectedMood);
  }, [filteredSongs, selectedMood]);

mport { useTranslation }/a
import { useState } from "react";/
  // Debounced search: local state for immediate UI, ref timer for delayed propagation
mport { useTranslation }/a
import { useState } from "react";/
  const [searchInput, setSearchInput] = useState(songSearch);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

mport { useTranslation }/a
import { useState } from "react";/
  // Sync external songSearch into local state when it changes externally
  useEffect(() => {
mport { useTranslation }/a
import { useState } from "react";/
    setSearchInput(songSearch);
mport { useTranslation }/a
import { useState } from "react";/
  }, [songSearch]);

mport { useTranslation }/a
import { useState } from "react";/
  const handleSearchChange = useCallback((value: string) => {
mport { useTranslation }/a
import { useState } from "react";/
    setSearchInput(value);
mport { useTranslation }/a
import { useState } from "react";/
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
mport { useTranslation }/a
import { useState } from "react";/
      onSongSearchChange(value);
    }, 300);
mport { useTranslation }/a
import { useState } from "react";/
  }, [onSongSearchChange]);

mport { useTranslation }/a
import { useState } from "react";/
  // Clear debounce timer on unmount
  useEffect(() => {
mport { useTranslation }/a
import { useState } from "react";/
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, []);

mport { useTranslation }/a
import { useState } from "react";/
  // Scroll song list to top when search query or mood changes
  useEffect(() => {
    songListRef.current?.scrollTo(0, 0);
mport { useTranslation }/a
import { useState } from "react";/
  }, [songSearch, selectedMood]);

mport { useTranslation }/a
import { useState } from "react";/
  // Load opponents when song options modal opens in duel/duet mode
  useEffect(() => {
mport { useTranslation }/a
import { useState } from "react";/
    if (showSongOptions && (selectedGameMode === 'duel' || selectedGameMode === 'duet')) {
mport { useTranslation }/a
import { useState } from "react";/
      onLoadOpponents();
    }
mport { useTranslation }/a
import { useState } from "react";/
  }, [showSongOptions, selectedGameMode, onLoadOpponents]);

mport { useTranslation }/a
import { useState } from "react";/
  // F19: Random opponent selection handler
mport { useTranslation }/a
import { useState } from "react";/
  const handleRandomOpponent = useCallback(() => {
mport { useTranslation }/a
import { useState } from "react";/
    // Combine connected opponents with available profiles for random selection
mport { useTranslation }/a
import { useState } from "react";/
    const allOpponents = [...opponents, ...availableProfiles];
mport { useTranslation }/a
import { useState } from "react";/
    if (allOpponents.length === 0) return;
mport { useTranslation }/a
import { useState } from "react";/
    const randomIndex = Math.floor(Math.random() * allOpponents.length);
mport { useTranslation }/a
import { useState } from "react";/
    const chosen = allOpponents[randomIndex];
mport { useTranslation }/a
import { useState } from "react";/
    onSelectPartner({ id: chosen.connectionCode || chosen.id, name: chosen.name });
mport { useTranslation }/a
import { useState } from "react";/
  }, [opponents, availableProfiles, onSelectPartner]);

mport { useTranslation }/a
import { useState } from "react";/
  // F19: Helper to render opponent avatar
mport { useTranslation }/a
import { useState } from "react";/
  const renderAvatar = useCallback((opponent: OpponentProfile, size: number = 32) => {
mport { useTranslation }/a
import { useState } from "react";/
    if (opponent.avatar) {
      return (
        <div
mport { useTranslation }/a
import { useState } from "react";/
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: size, height: size, minWidth: size, minHeight: size }}
        >
          <img
mport { useTranslation }/a
import { useState } from "react";/
            src={opponent.avatar}
mport { useTranslation }/a
import { useState } from "react";/
            alt={opponent.name}
mport { useTranslation }/a
import { useState } from "react";/
            className="w-full h-full object-cover"
mport { useTranslation }/a
import { useState } from "react";/
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      );
    }
    return (
      <div
mport { useTranslation }/a
import { useState } from "react";/
        className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
mport { useTranslation }/a
import { useState } from "react";/
          backgroundColor: opponent.color,
        }}
      >
mport { useTranslation }/a
import { useState } from "react";/
        <span style={{ fontSize: size * 0.45 }}>{opponent.name[0]?.toUpperCase()}</span>
      </div>
    );
  }, []);

mport { useTranslation }/a
import { useState } from "react";/
  // F19: Determine if we have enhanced opponent data available
mport { useTranslation }/a
import { useState } from "react";/
  const hasEnhancedOpponents = opponents.length > 0 || availableProfiles.length > 0;

mport { useTranslation }/a
import { useState } from "react";/
  // Helper to close wizard
mport { useTranslation }/a
import { useState } from "react";/
  const closeWizard = useCallback(() => {
mport { useTranslation }/a
import { useState } from "react";/
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
mport { useTranslation }/a
import { useState } from "react";/
    setWizardStep(0);
    onShowSongOptions(null);
mport { useTranslation }/a
import { useState } from "react";/
    onSelectPartner(null);
mport { useTranslation }/a
import { useState } from "react";/
    onSelectGameMode('single');
mport { useTranslation }/a
import { useState } from "react";/
  }, [onShowSongOptions, onSelectPartner, onSelectGameMode]);

mport { useTranslation }/a
import { useState } from "react";/
  // Helper to handle add to queue and show feedback
mport { useTranslation }/a
import { useState } from "react";/
  const handleAddToQueue = useCallback(() => {
    if (!showSongOptions) return;
    onAddToQueue(showSongOptions);
mport { useTranslation }/a
import { useState } from "react";/
    setWizardStep(3);
  }, [showSongOptions, onAddToQueue]);

  return (
    <>
mport { useTranslation }/a
import { useState } from "react";/
    <MobilePullRefresh onRefresh={onRefresh} className="h-full">
mport { useTranslation }/a
import { useState } from "react";/
    <div className="p-4">
mport { useTranslation }/a
import { useState } from "react";/
      {/* Search */}
mport { useTranslation }/a
import { useState } from "react";/
      <div className="relative mb-4">
        <Input
mport { useTranslation }/a
import { useState } from "react";/
          id="song-search-modal"
mport { useTranslation }/a
import { useState } from "react";/
          name="song-search-modal"
mport { useTranslation }/a
import { useState } from "react";/
          value={searchInput}
mport { useTranslation }/a
import { useState } from "react";/
          onChange={(e) => handleSearchChange(e.target.value)}
mport { useTranslation }/a
import { useState } from "react";/
          placeholder={t('mobileViews.searchPlaceholder')}
mport { useTranslation }/a
import { useState } from "react";/
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
      
      {/* F5: Mood Filter Chips */}
mport { useTranslation }/a
import { useState } from "react";/
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide -mx-1 px-1">
        <button
          onClick={() => setSelectedMood(null)}
mport { useTranslation }/a
import { useState } from "react";/
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
            selectedMood === null
              ? 'bg-white/20 text-white border border-white/30'
mport { useTranslation }/a
import { useState } from "react";/
              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
          }`
        }
        >
mport { useTranslation }/a
import { useState } from "react";/
          {t('mobileMoods.all')}
        </button>
mport { useTranslation }/a
import { useState } from "react";/
        {MOOD_CATEGORIES.map((mood) => (
          <button
            key={mood.id}
            onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
mport { useTranslation }/a
import { useState } from "react";/
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1 ${
              selectedMood === mood.id
                ? 'bg-white/20 text-white border border-white/30'
mport { useTranslation }/a
import { useState } from "react";/
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
            }`
          }
          >
mport { useTranslation }/a
import { useState } from "react";/
            <span>{mood.icon}</span>
mport { useTranslation }/a
import { useState } from "react";/
            <span>{t(`mobileMoods.${mood.id}` as Parameters<typeof t>[0])}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
mport { useTranslation }/a
import { useState } from "react";/
          QUEUE WIZARD — Step-based modal for adding songs to queue
          Step 0: Mode + Difficulty selection
          Step 1: Single = Overview + Mic | Duel/Duet = Opponent selection
          Step 2: Duel/Duet = Overview + Mic
mport { useTranslation }/a
import { useState } from "react";/
          Step 3: Feedback overlay (auto-dismiss)
      ══════════════════════════════════════════════════════════ */}
      {showSongOptions && (
mport { useTranslation }/a
import { useState } from "react";/
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
mport { useTranslation }/a
import { useState } from "react";/
          onClick={(e) => { if (e.target === e.currentTarget) closeWizard(); }}
        >
          <div
mport { useTranslation }/a
import { useState } from "react";/
            className="w-full max-w-sm mx-auto bg-gray-900/95 border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
mport { useTranslation }/a
import { useState } from "react";/
            style={{ maxHeight: '75dvh', minHeight: 'auto' }}
          >
mport { useTranslation }/a
import { useState } from "react";/
            {/* ── Step 3: Feedback ── */}
mport { useTranslation }/a
import { useState } from "react";/
            {wizardStep === 3 && (
mport { useTranslation }/a
import { useState } from "react";/
              <div className="p-6 text-center">
mport { useTranslation }/a
import { useState } from "react";/
                <div className="text-4xl mb-2">✓</div>
mport { useTranslation }/a
import { useState } from "react";/
                <p className="text-white font-bold text-sm">{t('mobileViews.songAddedToQueue')}</p>
mport { useTranslation }/a
import { useState } from "react";/
                {addedQueuePosition > 0 && (
mport { useTranslation }/a
import { useState } from "react";/
                  <p className="text-white/50 text-xs mt-1">{t('mobileViews.positionInQueue').replace('{n}', String(addedQueuePosition))}</p>
                )}
              </div>
            )}

            {/* ── Step 0: Mode + Difficulty ── */}
mport { useTranslation }/a
import { useState } from "react";/
            {wizardStep === 0 && (
mport { useTranslation }/a
import { useState } from "react";/
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
mport { useTranslation }/a
import { useState } from "react";/
                {/* Header */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 px-4 pt-3 pb-2">
mport { useTranslation }/a
import { useState } from "react";/
                  <p className="text-white font-bold text-sm truncate">{showSongOptions.title}</p>
mport { useTranslation }/a
import { useState } from "react";/
                  <p className="text-white/40 text-xs truncate">{showSongOptions.artist}</p>
                </div>

mport { useTranslation }/a
import { useState } from "react";/
                {/* Content - scrollable */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
mport { useTranslation }/a
import { useState } from "react";/
                  {/* Game Mode */}
                  <div>
mport { useTranslation }/a
import { useState } from "react";/
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.gameMode')}</label>
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
mport { useTranslation }/a
import { useState } from "react";/
                      {(['single', 'duel', 'duet'] as const).map((mode) => {
                        const icons = { single: '🎤', duel: '⚔️', duet: '🎭' };
mport { useTranslation }/a
import { useState } from "react";/
                        const labels = { single: 'mobileViews.gameModeSingle', duel: 'mobileViews.gameModeDuel', duet: 'mobileViews.gameModeDuet' };
mport { useTranslation }/a
import { useState } from "react";/
                        const isActive = selectedGameMode === mode;
                        return (
                          <button
                            key={mode}
mport { useTranslation }/a
import { useState } from "react";/
                            onClick={() => onSelectGameMode(mode)}
mport { useTranslation }/a
import { useState } from "react";/
                            className={`px-2 py-2 rounded-lg text-center transition-all text-xs ${
                              isActive
mport { useTranslation }/a
import { useState } from "react";/
                                ? mode === 'single' ? 'bg-cyan-500/30 text-white border border-cyan-500/50'
                                  : mode === 'duel' ? 'bg-red-500/30 text-white border border-red-500/50'
                                  : 'bg-pink-500/30 text-white border border-pink-500/50'
mport { useTranslation }/a
import { useState } from "react";/
                                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                            }`}
                          >
mport { useTranslation }/a
import { useState } from "react";/
                            <span className="text-lg block mb-0.5">{icons[mode]}</span>
mport { useTranslation }/a
import { useState } from "react";/
                            <span className="text-[10px]">{t(labels[mode])}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Difficulty */}
                  <div>
mport { useTranslation }/a
import { useState } from "react";/
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{t('mobileViews.difficulty')}</label>
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
mport { useTranslation }/a
import { useState } from "react";/
                      {(['easy', 'normal', 'hard'] as const).map((d) => (
                        <button
                          key={d}
mport { useTranslation }/a
import { useState } from "react";/
                          onClick={() => onDifficultyChange(d)}
mport { useTranslation }/a
import { useState } from "react";/
                          className={`px-2 py-1.5 rounded-lg text-center transition-all text-xs ${
                            difficulty === d
                              ? 'bg-purple-500/30 text-white border border-purple-500/50'
mport { useTranslation }/a
import { useState } from "react";/
                              : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                          }`}
                        >
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[11px] font-medium">{t(`mobileViews.${d}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
mport { useTranslation }/a
import { useState } from "react";/
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
mport { useTranslation }/a
import { useState } from "react";/
                    {t('mobileViews.cancel')}
                  </button>
                  <button
                    onClick={() => {
mport { useTranslation }/a
import { useState } from "react";/
                      if (isBattleMode) {
mport { useTranslation }/a
import { useState } from "react";/
                        onLoadOpponents();
mport { useTranslation }/a
import { useState } from "react";/
                        setWizardStep(2); // Go to opponent selection
                      } else {
mport { useTranslation }/a
import { useState } from "react";/
                        setWizardStep(1); // Go to overview + mic (Single)
                      }
                    }}
mport { useTranslation }/a
import { useState } from "react";/
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold disabled:opacity-40"
mport { useTranslation }/a
import { useState } from "react";/
                    disabled={false}
                  >
                    {t('mobileViews.next')} →
                  </button>
                </div>
              </div>
            )}

mport { useTranslation }/a
import { useState } from "react";/
            {/* ── Step 1: Overview + Mic Selection (Single or Duel/Duet after opponent) ── */}
mport { useTranslation }/a
import { useState } from "react";/
            {wizardStep === 1 && (
mport { useTranslation }/a
import { useState } from "react";/
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
mport { useTranslation }/a
import { useState } from "react";/
                {/* Header */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 px-4 pt-3 pb-1">
mport { useTranslation }/a
import { useState } from "react";/
                  <button onClick={() => setWizardStep(isBattleMode ? 2 : 0)} className="text-white/40 text-xs hover:text-white/70">
mport { useTranslation }/a
import { useState } from "react";/
                    ← {isBattleMode ? t('mobileViews.selectOpponent') : t('mobileViews.gameMode')}
                  </button>
                </div>

mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
                  {/* Song Overview */}
mport { useTranslation }/a
import { useState } from "react";/
                  <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
mport { useTranslation }/a
import { useState } from "react";/
                    <p className="text-white font-medium text-sm truncate">{showSongOptions.title}</p>
mport { useTranslation }/a
import { useState } from "react";/
                    <p className="text-white/40 text-xs truncate">{showSongOptions.artist}</p>
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="flex gap-2 mt-1.5 flex-wrap">
mport { useTranslation }/a
import { useState } from "react";/
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
mport { useTranslation }/a
import { useState } from "react";/
                        selectedGameMode === 'single' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
mport { useTranslation }/a
import { useState } from "react";/
                        : selectedGameMode === 'duel' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                      }`}>
mport { useTranslation }/a
import { useState } from "react";/
                        {selectedGameMode === 'single' ? '🎤' : selectedGameMode === 'duel' ? '⚔️' : '🎭'} {t(`mobileViews.gameMode${selectedGameMode === 'single' ? 'Single' : selectedGameMode === 'duel' ? 'Duel' : 'Duet'}`)}
mport { useTranslation }/a
import { useState } from "react";/
                      </span>
mport { useTranslation }/a
import { useState } from "react";/
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">{t(`mobileViews.${difficulty}`)}</span>
                    </div>

mport { useTranslation }/a
import { useState } from "react";/
                    {/* Duel/Duet: Player + Opponent display */}
mport { useTranslation }/a
import { useState } from "react";/
                    {isBattleMode && selectedPartner && (
mport { useTranslation }/a
import { useState } from "react";/
                      <div className="flex items-center justify-center gap-3 mt-2 py-1.5 rounded-lg bg-white/5">
mport { useTranslation }/a
import { useState } from "react";/
                        <div className="text-center min-w-[60px]">
mport { useTranslation }/a
import { useState } from "react";/
                          <p className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle')}</p>
                        </div>
mport { useTranslation }/a
import { useState } from "react";/
                        <span className="text-sm font-black text-red-400">VS</span>
mport { useTranslation }/a
import { useState } from "react";/
                        <div className="text-center min-w-[60px]">
mport { useTranslation }/a
import { useState } from "react";/
                          <p className="text-xs text-white font-medium truncate max-w-[80px]">{selectedPartner.name}</p>
                        </div>
                      </div>
                    )}

mport { useTranslation }/a
import { useState } from "react";/
                    {/* Duett: P1/P2 indicator with switch */}
mport { useTranslation }/a
import { useState } from "react";/
                    {selectedGameMode === 'duet' && selectedPartner && (
mport { useTranslation }/a
import { useState } from "react";/
                      <div className="flex items-center justify-between mt-1 px-1">
mport { useTranslation }/a
import { useState } from "react";/
                        <div className="flex items-center gap-2">
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">{t('mobileViews.part1')}</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] text-white/30">•</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] text-white/40">{t('mobileViews.gameModeSingle')}</span>
                        </div>
                        <button
mport { useTranslation }/a
import { useState } from "react";/
                          onClick={() => onDuetPartsSwappedChange(!duetPartsSwapped)}
mport { useTranslation }/a
import { useState } from "react";/
                          className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/60 hover:bg-white/20 border border-white/10"
                        >
mport { useTranslation }/a
import { useState } from "react";/
                          🔄 {t('mobileViews.switchParts')}
                        </button>
mport { useTranslation }/a
import { useState } from "react";/
                        <div className="flex items-center gap-2">
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] text-white/40">{selectedPartner.name}</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] text-white/30">•</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-400 font-medium">{t('mobileViews.part2')}</span>
                        </div>
                      </div>
                    )}
                  </div>

mport { useTranslation }/a
import { useState } from "react";/
                  {/* Mic Selection - Player */}
                  <div>
mport { useTranslation }/a
import { useState } from "react";/
                    <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
mport { useTranslation }/a
import { useState } from "react";/
                      {t('mobileViews.micSelection')} — {isBattleMode && !duetPartsSwapped ? t('mobileViews.part1') : isBattleMode && duetPartsSwapped ? t('mobileViews.part2') : t('mobileViews.gameModeSingle')}
mport { useTranslation }/a
import { useState } from "react";/
                    </label>
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                      <button
mport { useTranslation }/a
import { useState } from "react";/
                        onClick={() => onPlayerMicSourceChange('companion')}
mport { useTranslation }/a
import { useState } from "react";/
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                          playerMicSource === 'companion'
mport { useTranslation }/a
import { useState } from "react";/
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                            : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                        }`}
                      >
mport { useTranslation }/a
import { useState } from "react";/
                        <span className="text-sm">📱</span>
mport { useTranslation }/a
import { useState } from "react";/
                        <span>{t('mobileViews.singViaCompanion')}</span>
                      </button>
                      <button
mport { useTranslation }/a
import { useState } from "react";/
                        onClick={() => onPlayerMicSourceChange('microphone')}
mport { useTranslation }/a
import { useState } from "react";/
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                          playerMicSource === 'microphone'
mport { useTranslation }/a
import { useState } from "react";/
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                            : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                        }`}
                      >
mport { useTranslation }/a
import { useState } from "react";/
                        <span className="text-sm">🎤</span>
mport { useTranslation }/a
import { useState } from "react";/
                        <span>{t('mobileViews.singViaMic')}</span>
                      </button>
                    </div>
                  </div>

mport { useTranslation }/a
import { useState } from "react";/
                  {/* Mic Selection - Partner (Duel/Duet only) */}
mport { useTranslation }/a
import { useState } from "react";/
                  {isBattleMode && selectedPartner && (
                    <div>
mport { useTranslation }/a
import { useState } from "react";/
                      <label className="text-[10px] text-white/50 uppercase tracking-wider font-medium">
mport { useTranslation }/a
import { useState } from "react";/
                        {t('mobileViews.micSelection')} — {selectedPartner.name}
mport { useTranslation }/a
import { useState } from "react";/
                      </label>
mport { useTranslation }/a
import { useState } from "react";/
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        <button
mport { useTranslation }/a
import { useState } from "react";/
                          onClick={() => onPartnerMicSourceChange('companion')}
mport { useTranslation }/a
import { useState } from "react";/
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                            partnerMicSource === 'companion'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                          }`}
                        >
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-sm">📱</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span>{t('mobileViews.singViaCompanion')}</span>
                        </button>
                        <button
mport { useTranslation }/a
import { useState } from "react";/
                          onClick={() => onPartnerMicSourceChange('microphone')}
mport { useTranslation }/a
import { useState } from "react";/
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                            partnerMicSource === 'microphone'
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                          }`}
                        >
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="text-sm">🎤</span>
mport { useTranslation }/a
import { useState } from "react";/
                          <span>{t('mobileViews.singViaMic')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
mport { useTranslation }/a
import { useState } from "react";/
                  <button onClick={closeWizard} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
mport { useTranslation }/a
import { useState } from "react";/
                    {t('mobileViews.cancel')}
                  </button>
                  <button
mport { useTranslation }/a
import { useState } from "react";/
                    onClick={handleAddToQueue}
mport { useTranslation }/a
import { useState } from "react";/
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                  >
mport { useTranslation }/a
import { useState } from "react";/
                    + {t('mobileViews.addToQueueBtn')}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Duel/Duet — Opponent Selection ── */}
mport { useTranslation }/a
import { useState } from "react";/
            {wizardStep === 2 && (
mport { useTranslation }/a
import { useState } from "react";/
              <div className="flex flex-col" style={{ maxHeight: '75dvh' }}>
mport { useTranslation }/a
import { useState } from "react";/
                {/* Header */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
mport { useTranslation }/a
import { useState } from "react";/
                  <button onClick={() => setWizardStep(0)} className="text-white/40 text-xs hover:text-white/70">← {t('mobileViews.gameMode')}</button>
                </div>

mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-2.5">
                  {/* Song info */}
mport { useTranslation }/a
import { useState } from "react";/
                  <div className="bg-white/5 rounded-lg p-2.5">
mport { useTranslation }/a
import { useState } from "react";/
                    <p className="text-white font-medium text-xs truncate">{showSongOptions.title}</p>
mport { useTranslation }/a
import { useState } from "react";/
                    <p className="text-white/40 text-[10px] truncate">{showSongOptions.artist}</p>
                  </div>

mport { useTranslation }/a
import { useState } from "react";/
                  {/* Random button */}
mport { useTranslation }/a
import { useState } from "react";/
                  {hasEnhancedOpponents && (
                    <button
mport { useTranslation }/a
import { useState } from "react";/
                      onClick={handleRandomOpponent}
mport { useTranslation }/a
import { useState } from "react";/
                      className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 text-amber-300 text-xs font-medium"
                    >
mport { useTranslation }/a
import { useState } from "react";/
                      🎲 {t('mobileViews.randomOpponent')}
                    </button>
                  )}

                  {/* Opponents list */}
mport { useTranslation }/a
import { useState } from "react";/
                  {hasEnhancedOpponents ? (
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="space-y-1">
                      {opponents.length > 0 && (
mport { useTranslation }/a
import { useState } from "react";/
                        <p className="text-[10px] text-green-400/80 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
mport { useTranslation }/a
import { useState } from "react";/
                          <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
                          {t('mobileViews.onlineNow')} ({opponents.length})
                        </p>
                      )}
mport { useTranslation }/a
import { useState } from "react";/
                      <div className="space-y-1 max-h-[30vh] overflow-y-auto">
mport { useTranslation }/a
import { useState } from "react";/
                        {opponents.map((opp) => (
                          <button
                            key={opp.id}
mport { useTranslation }/a
import { useState } from "react";/
                            onClick={() => onSelectPartner(
mport { useTranslation }/a
import { useState } from "react";/
                              selectedPartner?.id === (opp.connectionCode || opp.id) ? null : { id: opp.connectionCode || opp.id, name: opp.name }
                            )}
mport { useTranslation }/a
import { useState } from "react";/
                            className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                              selectedPartner?.id === (opp.connectionCode || opp.id)
                                ? 'bg-red-500/20 border border-red-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                                : 'bg-white/5 hover:bg-white/8 border border-transparent'
                            }`}
                          >
mport { useTranslation }/a
import { useState } from "react";/
                            <div className="rounded-full p-0.5 flex-shrink-0"
mport { useTranslation }/a
import { useState } from "react";/
                              style={{ backgroundColor: selectedPartner?.id === (opp.connectionCode || opp.id) ? opp.color : 'transparent' }}
                            >
mport { useTranslation }/a
import { useState } from "react";/
                              {renderAvatar(opp, 28)}
                            </div>
mport { useTranslation }/a
import { useState } from "react";/
                            <div className="flex-1 min-w-0 text-left">
mport { useTranslation }/a
import { useState } from "react";/
                              <p className="text-xs font-medium truncate text-white">{opp.name}</p>
                            </div>
mport { useTranslation }/a
import { useState } from "react";/
                            {selectedPartner?.id === (opp.connectionCode || opp.id) && (
mport { useTranslation }/a
import { useState } from "react";/
                              <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full">VS</span>
                            )}
                          </button>
                        ))}
                      </div>

mport { useTranslation }/a
import { useState } from "react";/
                      {availableProfiles.length > 0 && (
mport { useTranslation }/a
import { useState } from "react";/
                        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mt-2 mb-1">
mport { useTranslation }/a
import { useState } from "react";/
                          {t('mobileViews.availableProfiles')} ({availableProfiles.length})
                        </p>
                      )}
mport { useTranslation }/a
import { useState } from "react";/
                      {availableProfiles.length > 0 && (
mport { useTranslation }/a
import { useState } from "react";/
                        <div className="space-y-1 max-h-[20vh] overflow-y-auto">
mport { useTranslation }/a
import { useState } from "react";/
                          {availableProfiles.map((prof) => (
                            <button
                              key={prof.id}
mport { useTranslation }/a
import { useState } from "react";/
                              onClick={() => onSelectPartner(
mport { useTranslation }/a
import { useState } from "react";/
                                selectedPartner?.id === prof.id ? null : { id: prof.id, name: prof.name }
                              )}
mport { useTranslation }/a
import { useState } from "react";/
                              className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                                selectedPartner?.id === prof.id
                                  ? 'bg-red-500/20 border border-red-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                                  : 'bg-white/3 hover:bg-white/8 border border-transparent'
                              }`}
                            >
mport { useTranslation }/a
import { useState } from "react";/
                              <div className="rounded-full p-0.5 flex-shrink-0"
mport { useTranslation }/a
import { useState } from "react";/
                                style={{ backgroundColor: selectedPartner?.id === prof.id ? prof.color : 'transparent' }}
                              >
mport { useTranslation }/a
import { useState } from "react";/
                                {renderAvatar(prof, 24)}
                              </div>
mport { useTranslation }/a
import { useState } from "react";/
                              <div className="flex-1 min-w-0 text-left">
mport { useTranslation }/a
import { useState } from "react";/
                                <p className="text-[11px] text-white/70 truncate">{prof.name}</p>
                              </div>
mport { useTranslation }/a
import { useState } from "react";/
                              {selectedPartner?.id === prof.id && (
mport { useTranslation }/a
import { useState } from "react";/
                                <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full">VS</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
mport { useTranslation }/a
import { useState } from "react";/
                  ) : availablePartners.length > 0 ? (
mport { useTranslation }/a
import { useState } from "react";/
                    <div className="space-y-1">
mport { useTranslation }/a
import { useState } from "react";/
                      <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-1">{t('mobileViews.onlineNow')}</p>
mport { useTranslation }/a
import { useState } from "react";/
                      <div className="space-y-1 max-h-[30vh] overflow-y-auto">
mport { useTranslation }/a
import { useState } from "react";/
                        {availablePartners.map((partner) => (
                          <button
mport { useTranslation }/a
import { useState } from "react";/
                            key={partner.id}
mport { useTranslation }/a
import { useState } from "react";/
                            onClick={() => onSelectPartner(selectedPartner?.id === partner.id ? null : partner)}
mport { useTranslation }/a
import { useState } from "react";/
                            className={`w-full p-2 rounded-lg flex items-center gap-2.5 transition-all ${
mport { useTranslation }/a
import { useState } from "react";/
                              selectedPartner?.id === partner.id
                                ? 'bg-purple-500/20 border border-purple-500/40'
mport { useTranslation }/a
import { useState } from "react";/
                                : 'bg-white/5 hover:bg-white/10 border border-transparent'
                            }`}
                          >
mport { useTranslation }/a
import { useState } from "react";/
                            <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-[11px]">
mport { useTranslation }/a
import { useState } from "react";/
                              {partner.name[0]}
                            </div>
mport { useTranslation }/a
import { useState } from "react";/
                            <span className="flex-1 text-left text-xs">{partner.name}</span>
mport { useTranslation }/a
import { useState } from "react";/
                            <span className="text-[10px] text-white/30">#{partner.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
mport { useTranslation }/a
import { useState } from "react";/
                    <p className="text-xs text-white/40 py-3 text-center">{t('mobileViews.noOpponents')}</p>
                  )}
                </div>

                {/* Footer */}
mport { useTranslation }/a
import { useState } from "react";/
                <div className="flex-shrink-0 flex gap-2 px-4 pb-4 pt-2 border-t border-white/10">
mport { useTranslation }/a
import { useState } from "react";/
                  <button onClick={() => setWizardStep(0)} className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs font-medium">
mport { useTranslation }/a
import { useState } from "react";/
                    {t('mobileViews.cancel')}
                  </button>
mport { useTranslation }/a
import { useState } from "react";/
                  {selectedPartner ? (
                    <button
mport { useTranslation }/a
import { useState } from "react";/
                      onClick={() => setWizardStep(1)}
mport { useTranslation }/a
import { useState } from "react";/
                      className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold"
                    >
                      {t('mobileViews.next')} →
                    </button>
                  ) : (
                    <button
mport { useTranslation }/a
import { useState } from "react";/
                      disabled
mport { useTranslation }/a
import { useState } from "react";/
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
      
mport { useTranslation }/a
import { useState } from "react";/
      {/* Error State */}
      {songsError && (
mport { useTranslation }/a
import { useState } from "react";/
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {songsError}
        </div>
      )}

      {/* Song List */}
mport { useTranslation }/a
import { useState } from "react";/
      {songsLoading ? (
mport { useTranslation }/a
import { useState } from "react";/
        <div className="flex items-center justify-center py-12">
mport { useTranslation }/a
import { useState } from "react";/
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
mport { useTranslation }/a
import { useState } from "react";/
          <span className="text-white/60">{t('common.loading')}</span>
        </div>
      ) : (
mport { useTranslation }/a
import { useState } from "react";/
        <div ref={songListRef} className="space-y-2 pb-4">
mport { useTranslation }/a
import { useState } from "react";/
          {moodFilteredSongs.map((song) => (
            <div 
mport { useTranslation }/a
import { useState } from "react";/
              key={song.id || `song-${song.title}-${song.artist}`}
mport { useTranslation }/a
import { useState } from "react";/
              className="flex items-center gap-2 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors min-w-0"
            >
mport { useTranslation }/a
import { useState } from "react";/
              {/* Add to Queue Button — always visible, rendered FIRST for guaranteed visibility */}
              <button
                onClick={() => {
                  onShowSongOptions(song);
mport { useTranslation }/a
import { useState } from "react";/
                  onLoadPartners();
                }}
mport { useTranslation }/a
import { useState } from "react";/
                className="bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold rounded-lg transition-colors"
                style={{ width: '2.25rem', height: '2.25rem', minWidth: '2.25rem', minHeight: '2.25rem' }}
mport { useTranslation }/a
import { useState } from "react";/
                aria-label={t('mobileViews.songAdded')}
              >
                +
              </button>
              
              {/* Cover */}
mport { useTranslation }/a
import { useState } from "react";/
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
mport { useTranslation }/a
import { useState } from "react";/
                {song.coverImage ? (
mport { useTranslation }/a
import { useState } from "react";/
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
mport { useTranslation }/a
import { useState } from "react";/
                  <div className="w-full h-full flex items-center justify-center">
mport { useTranslation }/a
import { useState } from "react";/
                    <MusicIcon className="w-5 h-5 text-white/30" />
                  </div>
                )}
              </div>
              
              {/* Info */}
mport { useTranslation }/a
import { useState } from "react";/
              <div className="flex-1 min-w-0">
mport { useTranslation }/a
import { useState } from "react";/
                <p className="font-medium truncate text-sm">{song.title || t('common.unknown')}</p>
mport { useTranslation }/a
import { useState } from "react";/
                <p className="text-xs text-white/40 truncate">{song.artist || t('common.unknown')}</p>
              </div>
              
mport { useTranslation }/a
import { useState } from "react";/
              {/* F12: Preview button — only shown when audio URL is available */}
              {resolveAudioUrl(song) && (
                <MobilePreviewButton
                  songId={song.id}
mport { useTranslation }/a
import { useState } from "react";/
                  audioUrl={resolveAudioUrl(song)}
mport { useTranslation }/a
import { useState } from "react";/
                  isPlaying={preview.isPreviewPlaying && preview.previewSongId === song.id}
                  progress={preview.previewSongId === song.id ? preview.previewProgress : 0}
mport { useTranslation }/a
import { useState } from "react";/
                  onPlayPreview={preview.playPreview}
                  onStopPreview={preview.stopPreview}
                />
              )}

mport { useTranslation }/a
import { useState } from "react";/
              {/* Duration */}
mport { useTranslation }/a
import { useState } from "react";/
              <span className="text-xs text-white/30 whitespace-nowrap flex-shrink-0">
mport { useTranslation }/a
import { useState } from "react";/
                {song.duration > 0 ? formatDuration(song.duration) : '--:--'}
mport { useTranslation }/a
import { useState } from "react";/
              </span>
            </div>
          ))}
          
          {moodFilteredSongs.length === 0 && selectedMood && (
mport { useTranslation }/a
import { useState } from "react";/
            <div className="text-center py-12 text-white/40">
mport { useTranslation }/a
import { useState } from "react";/
              <p className="text-lg mb-1">🎵</p>
              {t('mobileMoods.noSongs')}
            </div>
          )}
          {moodFilteredSongs.length === 0 && !selectedMood && (
mport { useTranslation }/a
import { useState } from "react";/
            <div className="text-center py-12 text-white/40">
mport { useTranslation }/a
import { useState } from "react";/
              <p className="text-lg mb-1">🎵</p>
              {t('mobileViews.noSongsFound')}
            </div>
          )}
        </div>
      )}
    </div>
    </MobilePullRefresh>

mport { useTranslation }/a
import { useState } from "react";/
    {/* F3: Random Song Challenge FAB */}
mport { useTranslation }/a
import { useState } from "react";/
    <MobileChallengeButton
      songs={songs}
mport { useTranslation }/a
import { useState } from "react";/
      onRandomChallenge={onAddToQueue}
mport { useTranslation }/a
import { useState } from "react";/
      disabled={songsLoading}
    />
    </>
  );
}
