/**
 * Rate my Song — Setup, Rating, Results, and Series Results screens
 *
 * A party mode where players sing and get rated 1-10 (with 0.1 precision).
 * No pitch scoring — just visual pitch display and user ratings.
 * Modes: Single, Duel, Duet | Duration: Short (60s) or Normal (full song)
 *
 * Features: Categories, Series, Challenges, Betting, Anonymous Rating,
 * AI Critic, Player Stats, Achievements, Song Suggestions, Hype Meter,
 * Live Reactions, Series Results
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { PlayerProfile, Song, PLAYER_COLORS } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';
import {
  addRateMySongEntry,
  addDailyRateMySongEntry,
  getRateMySongTopN,
  getDailyRateMySongTopN,
  getAICriticComment,
  getRateMySongPlayerStats,
  getSongSuggestions,
  getRandomChallenge,
  updateRateMySongPlayerStats,
  getPlayerRank,
  getAchievementById,
  RATE_MY_SONG_ACHIEVEMENTS,
  type RateMySongEntry,
  type RateMySongDailyEntry,
  type RateMySongPlayerStats,
  type RateMySongChallenge,
  type SongSuggestion,
  type Achievement,
} from '@/lib/game/rate-my-song-ranking';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== TYPES =====================

export type RateMySongPlayMode = 'single' | 'duel' | 'duet';
export type RateMySongDuration = 'short' | 'normal';

export interface RateMySongSettings {
  playMode: RateMySongPlayMode;
  duration: RateMySongDuration;
  songId: string;
  seriesRounds?: 1 | 3 | 5 | 7;
  categoriesEnabled?: boolean;
  challengesEnabled?: boolean;
  bettingEnabled?: boolean;
  anonymousRating?: boolean;
}

export interface RateMySongRating {
  playerId: string;
  playerName: string;
  playerColor: string;
  rating: number;
  categories?: {
    voice: number;
    stage: number;
    rhythm: number;
    entertainment: number;
  };
  challengeMastered?: boolean;
  betPoints?: number;
}

export interface RateMySongResult {
  songTitle: string;
  songArtist: string;
  ratings: RateMySongRating[];
  averageRating: number;
}

// Category weights
const CATEGORY_WEIGHTS = { voice: 0.3, stage: 0.2, rhythm: 0.25, entertainment: 0.25 } as const;
const CATEGORY_KEYS = ['voice', 'stage', 'rhythm', 'entertainment'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

function calcWeightedTotal(categories: { voice: number; stage: number; rhythm: number; entertainment: number }): number {
  return (
    categories.voice * CATEGORY_WEIGHTS.voice +
    categories.stage * CATEGORY_WEIGHTS.stage +
    categories.rhythm * CATEGORY_WEIGHTS.rhythm +
    categories.entertainment * CATEGORY_WEIGHTS.entertainment
  );
}

// ===================== TOGGLE SWITCH COMPONENT =====================

function ToggleSwitch({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-700/30 border border-white/10">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition-all flex-shrink-0 ml-3 ${
          checked
            ? 'bg-amber-500'
            : 'bg-gray-600'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform mt-1 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// ===================== SETUP SCREEN =====================

interface RateMySongSetupScreenProps {
  profiles: PlayerProfile[];
  onStart: (_settings: RateMySongSettings, _playerIds: string[]) => void;
  onBack: () => void;
}

export function RateMySongSetupScreen({ profiles, onStart, onBack }: RateMySongSetupScreenProps) {
  const { t } = useTranslation();
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);
  const [playMode, setPlayMode] = useState<RateMySongPlayMode>('single');
  const [duration, setDuration] = useState<RateMySongDuration>('normal');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New toggles
  const [seriesRounds, setSeriesRounds] = useState<1 | 3 | 5 | 7>(1);
  const [categoriesEnabled, setCategoriesEnabled] = useState(true);
  const [challengesEnabled, setChallengesEnabled] = useState(false);
  const [bettingEnabled, setBettingEnabled] = useState(false);
  const [anonymousRating, setAnonymousRating] = useState(false);

  // Song search / library selection
  const allSongs = useMemo(() => getAllSongs(), []);
  const [songSearch, setSongSearch] = useState('');
  const [songSelectionMode, setSongSelectionMode] = useState<'manual' | 'random'>('manual');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Collect available genres
  const genres = useMemo(() => {
    const g = new Set(allSongs.map(s => s.genre).filter((v): v is string => Boolean(v)));
    return ['all', ...Array.from(g).sort()];
  }, [allSongs]);

  // Filtered songs
  const filteredSongs = useMemo(() => {
    let songs = allSongs;
    if (filterGenre !== 'all') songs = songs.filter(s => s.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
    if (filterDifficulty !== 'all') songs = songs.filter(s => s.difficulty === filterDifficulty);
    if (songSearch.trim()) {
      const q = songSearch.toLowerCase();
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
      );
    }
    return songs.slice(0, 50);
  }, [allSongs, songSearch, filterGenre, filterDifficulty]);

  const pickRandom = () => {
    const pool = filterGenre !== 'all' || filterDifficulty !== 'all' ? filteredSongs : allSongs;
    if (pool.length === 0) return;
    const randomSong = pool[Math.floor(Math.random() * pool.length)];
    setSelectedSong(randomSong);
    setSongSelectionMode('manual');
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(id)) return prev.filter(pid => pid !== id);
      const maxPlayers = playMode === 'single' ? 1 : 2;
      if (prev.length >= maxPlayers) {
        setError(t('rateMySong.errorMaxPlayers').replace('{n}', String(maxPlayers)));
        return prev;
      }
      setError(null);
      return [...prev, id];
    });
  };

  const handleModeChange = (mode: RateMySongPlayMode) => {
    setPlayMode(mode);
    setSelectedPlayers([]);
    setError(null);
  };

  const handleStart = () => {
    let song = selectedSong;
    if (songSelectionMode === 'random' && !song) {
      const pool = allSongs;
      if (pool.length > 0) song = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!song) {
      setError(t('rateMySong.errorNoSong'));
      return;
    }
    const minPlayers = playMode === 'single' ? 1 : 2;
    if (selectedPlayers.length < minPlayers) {
      setError(t('rateMySong.errorMinPlayers').replace('{n}', String(minPlayers)));
      return;
    }
    setError(null);
    onStart(
      {
        playMode,
        duration,
        songId: song.id,
        seriesRounds,
        categoriesEnabled,
        challengesEnabled,
        bettingEnabled,
        anonymousRating,
      },
      selectedPlayers,
    );
  };

  const playModeOptions = [
    { value: 'single' as const, label: t('rateMySong.solo'), icon: '🎤', desc: t('rateMySong.soloDesc') },
    { value: 'duel' as const, label: t('rateMySong.duel'), icon: '⚔️', desc: t('rateMySong.duelDesc') },
    { value: 'duet' as const, label: t('rateMySong.duet'), icon: '👥', desc: t('rateMySong.duetDesc') },
  ];

  const roundOptions: Array<{ value: 1 | 3 | 5 | 7; label: string }> = [
    { value: 1, label: '1' },
    { value: 3, label: '3' },
    { value: 5, label: '5' },
    { value: 7, label: '7' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button onClick={onBack} className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          {t('rateMySong.back')}
        </button>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{t('rateMySong.title')}</h1>
        <p className="text-gray-400 mb-8">
          {t('rateMySong.subtitle')}
        </p>

        {/* Play Mode */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.mode')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {playModeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleModeChange(opt.value)}
                className={`p-4 rounded-xl font-medium transition-all text-center ${
                  playMode === opt.value
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="text-sm">{opt.label}</div>
                <div className="text-[11px] text-white/50 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.duration')}</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setDuration('short')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                duration === 'short'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {t('rateMySong.short')}
            </button>
            <button
              onClick={() => setDuration('normal')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                duration === 'normal'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              {t('rateMySong.normal')}
            </button>
          </div>
        </div>

        {/* Song Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.selectSong')}</h3>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSongSelectionMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                songSelectionMode === 'manual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              {t('rateMySong.library')}
            </button>
            <button
              onClick={pickRandom}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              {t('rateMySong.randomSong')}
            </button>
          </div>

          {selectedSong && (
            <div className="mb-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
              <span className="text-lg">🎵</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{selectedSong.title}</div>
                <div className="text-xs text-gray-400 truncate">{selectedSong.artist}</div>
              </div>
              <button
                onClick={() => setSelectedSong(null)}
                className="text-gray-400 hover:text-white text-sm px-2"
              >
                ✕
              </button>
            </div>
          )}

          {songSelectionMode === 'manual' && (
            <>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder={t('rateMySong.searchPlaceholder')}
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="w-full bg-gray-700/50 border border-white/10 rounded-xl p-3 text-white text-sm pl-9"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>
              <div className="flex gap-2 mb-3">
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="flex-1 bg-gray-700/50 border border-white/10 rounded-lg p-2 text-white text-xs appearance-none cursor-pointer"
                >
                  {genres.map(g => (
                    <option key={g} value={g}>{g === 'all' ? t('rateMySong.allGenres') : g}</option>
                  ))}
                </select>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as typeof filterDifficulty)}
                  className="bg-gray-700/50 border border-white/10 rounded-lg p-2 text-white text-xs appearance-none cursor-pointer"
                >
                  <option value="all">{t('rateMySong.allDifficulties')}</option>
                  <option value="easy">{t('song.easy')}</option>
                  <option value="medium">{t('song.medium')}</option>
                  <option value="hard">{t('song.hard')}</option>
                </select>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-gray-800/50">
                {filteredSongs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">{t('rateMySong.noSongsFound')}</div>
                ) : (
                  filteredSongs.map(song => {
                    const isSelected = selectedSong?.id === song.id;
                    return (
                      <button
                        key={song.id}
                        onClick={() => setSelectedSong(song)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-purple-600/30 border-l-2 border-purple-400'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                      >
                        <span className="text-sm">{isSelected ? '✅' : '🎵'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{song.title}</div>
                          <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                        </div>
                        {song.genre && (
                          <span className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">{song.genre}</span>
                        )}
                      </button>
                    );
                  })
                )}
                {allSongs.length > 50 && filteredSongs.length === 50 && (
                  <div className="p-2 text-center text-xs text-gray-500">
                    {t('rateMySong.moreSongs').replace('{n}', String(allSongs.length - 50))}
                  </div>
                )}
              </div>
            </>
          )}

          {songSelectionMode === 'random' && !selectedSong && (
            <p className="text-sm text-gray-400 text-center py-2">
              {t('rateMySong.randomInfo').replace('{n}', String(allSongs.length))}
            </p>
          )}
        </div>

        {/* Player Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {t('rateMySong.players').replace('{n}', playMode === 'single' ? '1' : '2').replace('{m}', playMode === 'single' ? '1' : '2')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {activeProfiles.map((profile, i) => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <button
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                    isSelected
                      ? 'bg-purple-600/20 border-2 border-purple-500'
                      : 'bg-gray-700/30 border-2 border-transparent hover:bg-gray-700/50'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                    style={{ backgroundColor: isSelected ? profile.color : PLAYER_COLORS[i % PLAYER_COLORS.length] + '40' }}
                  >
                    {isSelected ? '✓' : profile.name?.[0] || '?'}
                  </div>
                  <span className="font-medium truncate">{profile.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* New Settings Section */}
        <div className="space-y-3 mb-8">
          {/* Series Mode */}
          <div className="p-3 rounded-xl bg-gray-700/30 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">{t('rateMySong.seriesMode')}</div>
              <div className="text-xs text-gray-400">{t('rateMySong.rounds')}</div>
            </div>
            <div className="flex gap-2">
              {roundOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSeriesRounds(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    seriesRounds === opt.value
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Toggle */}
          <ToggleSwitch
            label={t('rateMySong.categories')}
            description={t('rateMySong.categoriesDesc')}
            checked={categoriesEnabled}
            onChange={setCategoriesEnabled}
          />

          {/* Challenges Toggle */}
          <ToggleSwitch
            label={t('rateMySong.challengeMode')}
            description={t('rateMySong.challengeModeDesc')}
            checked={challengesEnabled}
            onChange={setChallengesEnabled}
          />

          {/* Betting Toggle */}
          <ToggleSwitch
            label={t('rateMySong.bettingMode')}
            description={t('rateMySong.bettingModeDesc')}
            checked={bettingEnabled}
            onChange={setBettingEnabled}
          />

          {/* Anonymous Rating Toggle */}
          <ToggleSwitch
            label={t('rateMySong.anonymousRating')}
            description={t('rateMySong.anonymousRatingDesc')}
            checked={anonymousRating}
            onChange={setAnonymousRating}
          />
        </div>

        {/* Error */}
        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30"
        >
          {t('rateMySong.startSinging')}
        </button>
      </div>
    </div>
  );
}

// ===================== RATING SCREEN =====================

interface RateMySongRatingScreenProps {
  songTitle: string;
  songArtist: string;
  singingPlayers: Array<{ id: string; name: string; color: string }>;
  allProfiles: PlayerProfile[];
  categoriesEnabled?: boolean;
  anonymousRating?: boolean;
  challengesEnabled?: boolean;
  bettingEnabled?: boolean;
  currentChallenge?: RateMySongChallenge | null;
  onSubmit: (_ratings: RateMySongRating[]) => void;
  onBack: () => void;
}

export function RateMySongRatingScreen({
  songTitle,
  songArtist,
  singingPlayers,
  allProfiles,
  categoriesEnabled = false,
  anonymousRating = false,
  challengesEnabled = false,
  bettingEnabled = false,
  currentChallenge = null,
  onSubmit,
  onBack,
}: RateMySongRatingScreenProps) {
  const { t, language } = useTranslation();
  const audienceProfiles = useMemo(() => {
    const singerIds = new Set(singingPlayers.map(p => p.id));
    return allProfiles.filter(p => p.isActive !== false && !singerIds.has(p.id));
  }, [allProfiles, singingPlayers]);

  // Single rating mode (when categories OFF)
  const [audienceRatings, setAudienceRatings] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (const singer of singingPlayers) {
      init[singer.id] = {};
      for (const audience of audienceProfiles) {
        init[singer.id][audience.id] = 5.0;
      }
    }
    if (audienceProfiles.length === 0) {
      for (const singer of singingPlayers) {
        init[singer.id] = { '__host__': 5.0 };
      }
    }
    return init;
  });

  // Category ratings mode (when categories ON)
  const [categoryRatings, setCategoryRatings] = useState<Record<string, Record<string, Record<CategoryKey, number>>>>(() => {
    const init: Record<string, Record<string, Record<CategoryKey, number>>> = {};
    for (const singer of singingPlayers) {
      init[singer.id] = {};
      for (const audience of audienceProfiles) {
        init[singer.id][audience.id] = { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
      }
    }
    if (audienceProfiles.length === 0) {
      for (const singer of singingPlayers) {
        init[singer.id] = { '__host__': { voice: 5, stage: 5, rhythm: 5, entertainment: 5 } };
      }
    }
    return init;
  });

  // Challenge mastery
  const [challengeMastery, setChallengeMastery] = useState<Record<string, boolean>>({});

  const [currentAudienceIdx, setCurrentAudienceIdx] = useState(0);

  const updateRating = (singerId: string, audienceId: string, rating: number) => {
    setAudienceRatings(prev => ({
      ...prev,
      [singerId]: { ...prev[singerId], [audienceId]: rating },
    }));
  };

  const updateCategoryRating = (singerId: string, audienceId: string, cat: CategoryKey, value: number) => {
    setCategoryRatings(prev => ({
      ...prev,
      [singerId]: {
        ...prev[singerId],
        [audienceId]: { ...prev[singerId]?.[audienceId], [cat]: value },
      },
    }));
  };

  // Calculate average rating per singer (single mode)
  const getAverageForSinger = (singerId: string): number => {
    const singerRatings = audienceRatings[singerId];
    if (!singerRatings) return 5.0;
    const values = Object.values(singerRatings);
    if (values.length === 0) return 5.0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  // Calculate category averages for a singer
  const getCategoryAverage = (singerId: string): { voice: number; stage: number; rhythm: number; entertainment: number } | null => {
    const singerCats = categoryRatings[singerId];
    if (!singerCats) return null;
    const entries = Object.values(singerCats);
    if (entries.length === 0) return null;
    const avg = { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
    for (const entry of entries) {
      avg.voice += entry.voice;
      avg.stage += entry.stage;
      avg.rhythm += entry.rhythm;
      avg.entertainment += entry.entertainment;
    }
    avg.voice /= entries.length;
    avg.stage /= entries.length;
    avg.rhythm /= entries.length;
    avg.entertainment /= entries.length;
    return avg;
  };

  const handleSubmit = () => {
    const ratings: RateMySongRating[] = singingPlayers.map(singer => {
      if (categoriesEnabled) {
        const cats = getCategoryAverage(singer.id);
        return {
          playerId: singer.id,
          playerName: singer.name,
          playerColor: singer.color,
          rating: cats ? calcWeightedTotal(cats) : 5.0,
          categories: cats || undefined,
          challengeMastered: challengesEnabled ? challengeMastery[singer.id] : undefined,
        };
      }
      return {
        playerId: singer.id,
        playerName: singer.name,
        playerColor: singer.color,
        rating: getAverageForSinger(singer.id),
        challengeMastered: challengesEnabled ? challengeMastery[singer.id] : undefined,
      };
    });
    onSubmit(ratings);
  };

  const hasAudience = audienceProfiles.length > 0;

  const categoryLabels: Record<CategoryKey, { icon: string; label: string }> = {
    voice: { icon: '🎤', label: t('rateMySong.voice') },
    stage: { icon: '💃', label: t('rateMySong.stage') },
    rhythm: { icon: '🎵', label: t('rateMySong.rhythm') },
    entertainment: { icon: '🔥', label: t('rateMySong.entertainment') },
  };

  // Get localized challenge title/description
  const challengeTitle = currentChallenge
    ? (language === 'de' ? currentChallenge.titleDe : currentChallenge.titleEn)
    : '';
  const challengeDesc = currentChallenge
    ? (language === 'de' ? currentChallenge.descriptionDe : currentChallenge.descriptionEn)
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        {/* Song Info */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl font-bold">{songTitle}</h1>
          <p className="text-gray-400">{songArtist}</p>
          <p className="text-purple-400 text-sm mt-2">
            {hasAudience
              ? t('rateMySong.ratingByAudience').replace('{n}', String(audienceProfiles.length))
              : t('rateMySong.pleaseRate')}
          </p>
        </div>

        {/* Challenge Display */}
        {challengesEnabled && currentChallenge && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="text-sm font-semibold text-amber-400 mb-1">{t('rateMySong.currentChallenge')}</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentChallenge.icon}</span>
              <div>
                <div className="font-medium">{challengeTitle}</div>
                <div className="text-xs text-gray-300">{challengeDesc}</div>
              </div>
            </div>
          </div>
        )}

        {/* Audience member selector */}
        {hasAudience && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              {audienceProfiles.map((audience, i) => (
                <button
                  key={audience.id}
                  onClick={() => setCurrentAudienceIdx(i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i === currentAudienceIdx
                      ? 'ring-2 ring-amber-400 scale-110'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: audience.color }}
                  title={anonymousRating ? undefined : audience.name}
                >
                  {anonymousRating ? `${i + 1}` : (audience.name?.[0]?.toUpperCase() || '?')}
                </button>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              {anonymousRating
                ? t('rateMySong.ratedAs').replace('{n}', `${currentAudienceIdx + 1}`)
                : t('rateMySong.ratedAs').replace('{n}', audienceProfiles[currentAudienceIdx]?.name || '')}
            </p>
          </>
        )}

        {/* Rating sliders — per singer, for the selected audience member */}
        <div className="space-y-6 mb-6">
          {singingPlayers.map((singer) => {
            const currentAudience = hasAudience ? audienceProfiles[currentAudienceIdx] : null;
            const audienceId = currentAudience?.id ?? '__host__';

            if (categoriesEnabled) {
              // Category mode: 4 sliders per singer
              const currentCats = categoryRatings[singer.id]?.[audienceId] || { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
              const avgCats = getCategoryAverage(singer.id);
              const weightedTotal = avgCats ? calcWeightedTotal(avgCats) : 5;

              return (
                <div key={singer.id} className="bg-gray-700/30 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: singer.color }}
                      >
                        {singer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{singer.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{t('rateMySong.categoriesWeighted')}</div>
                      <div className="text-xl font-bold text-amber-400">{weightedTotal.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {CATEGORY_KEYS.map(cat => {
                      const catLabel = categoryLabels[cat];
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-300">{catLabel.icon} {catLabel.label} ({Math.round(CATEGORY_WEIGHTS[cat] * 100)}%)</span>
                            <span className="text-xs font-medium text-amber-300">{currentCats[cat].toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min="1" max="10" step="0.1"
                            value={currentCats[cat]}
                            onChange={(e) => updateCategoryRating(singer.id, audienceId, cat, parseFloat(e.target.value))}
                            className="w-full accent-amber-400 h-1.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Single slider mode
            const currentRating = audienceRatings[singer.id]?.[audienceId] ?? 5.0;
            const avgRating = getAverageForSinger(singer.id);

            return (
              <div key={singer.id} className="bg-gray-700/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: singer.color }}
                    >
                      {singer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{singer.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasAudience && <div className="text-xs text-gray-400">Ø {avgRating.toFixed(1)}</div>}
                    <div className="text-2xl font-bold text-amber-400">{currentRating.toFixed(1)}</div>
                  </div>
                </div>
                <input
                  type="range" min="1" max="10" step="0.1"
                  value={currentRating}
                  onChange={(e) => updateRating(singer.id, audienceId, parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-2"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>1.0</span><span>5.0</span><span>10.0</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Challenge Mastery Check */}
        {challengesEnabled && currentChallenge && (
          <div className="mb-6 p-3 rounded-xl bg-gray-700/30 border border-white/10">
            <p className="text-sm font-medium mb-3">{t('rateMySong.didMasterChallenge')}</p>
            <div className="space-y-2">
              {singingPlayers.map(singer => (
                <div key={singer.id} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: singer.color }}
                  >
                    {singer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm flex-1">{singer.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChallengeMastery(prev => ({ ...prev, [singer.id]: true }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        challengeMastery[singer.id] === true
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t('rateMySong.yes')}
                    </button>
                    <button
                      onClick={() => setChallengeMastery(prev => ({ ...prev, [singer.id]: false }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        challengeMastery[singer.id] === false
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t('rateMySong.no')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Average */}
        {singingPlayers.length > 1 && (
          <div className="text-center mb-6 bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <span className="text-purple-300 font-medium">{t('rateMySong.overallAverage').replace('{n}', '')} </span>
            <span className="text-xl font-bold text-white">
              {categoriesEnabled
                ? (singingPlayers.reduce((sum, s) => {
                    const cats = getCategoryAverage(s.id);
                    return sum + (cats ? calcWeightedTotal(cats) : 5);
                  }, 0) / singingPlayers.length).toFixed(1)
                : (singingPlayers.reduce((sum, s) => sum + getAverageForSinger(s.id), 0) / singingPlayers.length).toFixed(1)
              }
            </span>
            <span className="text-purple-300"> / 10</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all"
          >
            {t('rateMySong.backBtn')}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
          >
            {t('rateMySong.saveRating')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== RESULTS SCREEN =====================

interface RateMySongResultsScreenProps {
  result: RateMySongResult;
  songId?: string;
  songGenre?: string;
  categoriesEnabled?: boolean;
  challengesEnabled?: boolean;
  bettingEnabled?: boolean;
  seriesRound?: number;
  seriesTotalRounds?: number;
  onPlayAgain: () => void;
  onEnd: () => void;
}

export function RateMySongResultsScreen({
  result,
  songId,
  songGenre,
  categoriesEnabled = false,
  challengesEnabled = false,
  bettingEnabled = false,
  seriesRound,
  seriesTotalRounds,
  onPlayAgain,
  onEnd,
}: RateMySongResultsScreenProps) {
  const { t, language } = useTranslation();
  const [topRanking, setTopRanking] = useState<RateMySongEntry[]>([]);
  const [dailyRanking, setDailyRanking] = useState<RateMySongDailyEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'alltime'>('daily');
  const [playerStatsMap, setPlayerStatsMap] = useState<Map<string, RateMySongPlayerStats>>(new Map());
  const [newAchievementsMap, setNewAchievementsMap] = useState<Map<string, Achievement[]>>(new Map());
  const [songSuggestions, setSongSuggestions] = useState<SongSuggestion[]>([]);

  useEffect(() => {
    // Save each player's rating and update stats
    for (const r of result.ratings) {
      const entryBase = {
        songId: songId || 'unknown',
        songTitle: result.songTitle,
        songArtist: result.songArtist,
        playerId: r.playerId,
        playerName: r.playerName,
        playerColor: r.playerColor,
        rating: r.rating,
        ratingCount: 1,
      };
      addRateMySongEntry(entryBase);
      addDailyRateMySongEntry(entryBase);

      // Get previous achievement count before update
      const prevStats = getRateMySongPlayerStats(r.playerId);
      const prevAchCount = prevStats.achievements.length;

      // Update player stats
      const updatedStats = updateRateMySongPlayerStats(
        r.playerId,
        r.playerName,
        r.playerColor,
        r.rating,
        result.songTitle,
        songGenre || '',
      );

      setPlayerStatsMap(prev => {
        const next = new Map(prev);
        next.set(r.playerId, updatedStats);
        return next;
      });

      // Check for new achievements
      if (updatedStats.achievements.length > prevAchCount) {
        const freshIds = updatedStats.achievements.slice(prevAchCount);
        const freshAchs = freshIds
          .map(id => getAchievementById(id))
          .filter((a): a is Achievement => a !== undefined);
        if (freshAchs.length > 0) {
          setNewAchievementsMap(prev => {
            const next = new Map(prev);
            next.set(r.playerId, freshAchs);
            return next;
          });
        }
      }
    }

    setTopRanking(getRateMySongTopN(5));
    setDailyRanking(getDailyRateMySongTopN(5));

    // Song suggestions
    if (songId) {
      setSongSuggestions(getSongSuggestions(songGenre || '', songId, 3));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
  }, [result, songId, songGenre]);

  // AI critic comment for the top-rated player
  const topRating = result.ratings.length > 0
    ? Math.max(...result.ratings.map(r => r.rating))
    : 5;
  const lang = language === 'de' ? 'de' : 'en';
  const aiComment = useMemo(() => getAICriticComment(topRating, lang), [topRating, lang]);

  const categoryLabels: Record<CategoryKey, { icon: string; label: string }> = {
    voice: { icon: '🎤', label: t('rateMySong.voice') },
    stage: { icon: '💃', label: t('rateMySong.stage') },
    rhythm: { icon: '🎵', label: t('rateMySong.rhythm') },
    entertainment: { icon: '🔥', label: t('rateMySong.entertainment') },
  };

  // Helper to get localized achievement text
  const achName = (a: Achievement) => language === 'de' ? a.nameDe : a.nameEn;
  const achDesc = (a: Achievement) => language === 'de' ? a.descriptionDe : a.descriptionEn;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900/10 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        {/* Series round indicator */}
        {seriesRound && seriesTotalRounds && seriesTotalRounds > 1 && (
          <div className="mb-4 text-sm text-gray-400">
            {t('rateMySong.roundOf').replace('{n}', String(seriesRound)).replace('{m}', String(seriesTotalRounds))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2">{t('rateMySong.ratingComplete')}</h1>
        <p className="text-gray-400 mb-2">{result.songTitle}</p>
        <div className="text-5xl font-bold text-amber-400 mb-6 animate-rms-score-reveal">
          {result.averageRating.toFixed(1)}
          <span className="text-2xl text-gray-400"> / 10</span>
        </div>

        {/* AI Critic Comment */}
        <div className="mb-6 mx-auto max-w-md">
          <div className="relative bg-gray-700/30 rounded-2xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-amber-400 mb-2">{t('rateMySong.aiCritic')}</div>
            <p className="text-gray-200 text-sm italic">&ldquo;{aiComment}&rdquo;</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-700/30 border-b border-r border-white/10 rotate-45" />
          </div>
        </div>

        {/* Individual Ratings */}
        <div className="space-y-3 mb-6 text-left">
          {result.ratings.map((r, i) => {
            const emoji = r.rating >= 9 ? '🌟' : r.rating >= 7 ? '⭐' : r.rating >= 5 ? '👍' : r.rating >= 3 ? '😐' : '💔';
            const stats = playerStatsMap.get(r.playerId);
            const avgRating = stats && stats.totalPerformances > 0
              ? stats.totalRatingSum / stats.totalPerformances
              : 0;
            const rankResult = stats ? getPlayerRank(stats) : null;

            return (
              <div key={r.playerId} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: r.playerColor }}
                  >
                    {r.playerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.playerName}</div>
                    {rankResult && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {rankResult.rank} · {t('rateMySong.performances')}: {stats?.totalPerformances || 0} · {t('rateMySong.avgRating')}: {avgRating.toFixed(1)}
                      </div>
                    )}
                    {/* Challenge result */}
                    {challengesEnabled && r.challengeMastered !== undefined && (
                      <div className={`text-xs mt-0.5 ${r.challengeMastered ? 'text-green-400' : 'text-red-400'}`}>
                        {r.challengeMastered ? `✅ ${t('rateMySong.challengeMastered')}` : `❌ ${t('rateMySong.challengeFailed')}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-amber-400">{r.rating.toFixed(1)}</span>
                    <span className="text-lg ml-1">{emoji}</span>
                  </div>
                </div>

                {/* Rank progress bar */}
                {rankResult && rankResult.progress < 1 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>{rankResult.rank}</span>
                      <span>{rankResult.nextRank}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                        style={{ width: `${rankResult.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Category breakdown */}
                {categoriesEnabled && r.categories && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORY_KEYS.map(cat => {
                        const catLabel = categoryLabels[cat];
                        const value = r.categories![cat];
                        return (
                          <div key={cat} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{catLabel.icon} {catLabel.label}</span>
                            <span className="font-medium">{value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Category bars visualization */}
                    <div className="mt-2 flex gap-1 h-2 rounded-full overflow-hidden bg-gray-700">
                      {CATEGORY_KEYS.map(cat => (
                        <div
                          key={cat}
                          className="bg-amber-400 rounded-full"
                          style={{ width: `${r.categories![cat] * 10}%` }}
                          title={`${categoryLabels[cat].label}: ${r.categories![cat].toFixed(1)}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New Achievements */}
        {newAchievementsMap.size > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 text-center">🎉 {t('rateMySong.newAchievement')}</h3>
            <div className="space-y-2">
              {Array.from(newAchievementsMap.entries()).map(([playerId, achs]) => (
                achs.map(ach => (
                  <div key={`${playerId}-${ach.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-rms-achievement-pop">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <div className="font-medium text-sm text-amber-300">{achName(ach)}</div>
                      <div className="text-xs text-gray-400">{achDesc(ach)}</div>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        {/* Song Suggestions */}
        {songSuggestions.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 text-center">🎵 {t('rateMySong.songSuggestions')}</h3>
            <div className="space-y-2">
              {songSuggestions.map(song => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm">🎵</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{song.title}</div>
                    <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                  </div>
                  {song.genre && song.genre !== 'Unknown' && (
                    <span className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">{song.genre}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highscore Leaderboard */}
        {(topRanking.length > 0 || dailyRanking.length > 0) && (
          <div className="mb-8 text-left">
            <div className="flex gap-2 mb-4 justify-center">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'daily'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {t('rateMySong.dailyHighscore')}
              </button>
              <button
                onClick={() => setActiveTab('alltime')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'alltime'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {t('rateMySong.allTimeHighscore')}
              </button>
            </div>

            {activeTab === 'daily' && (
              <>
                {dailyRanking.length > 0 ? (
                  <div className="space-y-2">
                    {dailyRanking.map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: entry.playerColor }}
                        >
                          {entry.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{entry.playerName}</div>
                          <div className="text-[11px] text-gray-400 truncate">{entry.songTitle}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-amber-400">{entry.rating.toFixed(1)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">{t('rateMySong.noDailyRatings')}</p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">{t('rateMySong.dailyLeaderboardNote')}</p>
              </>
            )}

            {activeTab === 'alltime' && (
              <>
                {topRanking.length > 0 ? (
                  <div className="space-y-2">
                    {topRanking.map((entry, i) => {
                      const score = entry.rating * Math.log2(entry.ratingCount + 1);
                      return (
                        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: entry.playerColor }}
                          >
                            {entry.playerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{entry.playerName}</div>
                            <div className="text-[11px] text-gray-400 truncate">{entry.songTitle}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-amber-400">{entry.rating.toFixed(1)}</div>
                            <div className="text-[10px] text-gray-500">Score: {score.toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">{t('rateMySong.noAllTimeRatings')}</p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">{t('rateMySong.scoreFormula')}</p>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-500 transition-all"
          >
            {t('rateMySong.playAgain')}
          </button>
          <button
            onClick={onEnd}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all"
          >
            {t('rateMySong.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== SERIES RESULTS SCREEN =====================

interface RateMySongSeriesResultsScreenProps {
  seriesHistory: RateMySongRating[][];
  onEnd: () => void;
}

export function RateMySongSeriesResultsScreen({ seriesHistory, onEnd }: RateMySongSeriesResultsScreenProps) {
  const { t } = useTranslation();

  // Calculate cumulative scores per player
  const cumulativeScores = useMemo(() => {
    const scores: Record<string, { name: string; color: string; total: number; rounds: number[] }> = {};
    for (let roundIdx = 0; roundIdx < seriesHistory.length; roundIdx++) {
      const round = seriesHistory[roundIdx];
      for (const rating of round) {
        if (!scores[rating.playerId]) {
          scores[rating.playerId] = { name: rating.playerName, color: rating.playerColor, total: 0, rounds: [] };
        }
        scores[rating.playerId].total += rating.rating;
        scores[rating.playerId].rounds.push(rating.rating);
      }
    }
    return scores;
  }, [seriesHistory]);

  // Find winner
  const sortedPlayers = useMemo(() => {
    return Object.entries(cumulativeScores)
      .map(([id, data]) => ({ id, ...data, avg: data.total / data.rounds.length }))
      .sort((a, b) => b.total - a.total);
  }, [cumulativeScores]);

  const winner = sortedPlayers[0];

  // "Song des Abends" — best single rating across all rounds
  const bestSinglePerformance = useMemo(() => {
    let best: { rating: RateMySongRating; round: number } | null = null;
    for (let i = 0; i < seriesHistory.length; i++) {
      for (const r of seriesHistory[i]) {
        if (!best || r.rating > best.rating.rating) {
          best = { rating: r, round: i + 1 };
        }
      }
    }
    return best;
  }, [seriesHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4 animate-rms-score-reveal">👑</div>
        <h1 className="text-3xl font-bold mb-2">{t('rateMySong.seriesWinner')}</h1>
        {winner && (
          <div className="mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-2"
              style={{ backgroundColor: winner.color }}
            >
              {winner.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-xl font-bold">{winner.name}</div>
            <div className="text-3xl font-bold text-amber-400">{winner.total.toFixed(1)}</div>
            <div className="text-sm text-gray-400">{t('rateMySong.totalScore')}</div>
          </div>
        )}

        {/* Round History */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.roundHistory')}</h3>
          <div className="space-y-3">
            {seriesHistory.map((round, roundIdx) => (
              <div key={roundIdx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-gray-400 mb-2">
                  {t('rateMySong.roundOf').replace('{n}', String(roundIdx + 1)).replace('{m}', String(seriesHistory.length))}
                </div>
                <div className="space-y-1">
                  {round.map(r => {
                    const rank = round.slice().sort((a, b) => b.rating - a.rating).findIndex(x => x.playerId === r.playerId);
                    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉';
                    return (
                      <div key={r.playerId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{round.length > 1 ? medal : '⭐'}</span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: r.playerColor }}
                          >
                            {r.playerName.charAt(0).toUpperCase()}
                          </div>
                          <span>{r.playerName}</span>
                          {r.challengeMastered !== undefined && (
                            <span className={r.challengeMastered ? 'text-green-400' : 'text-red-400'}>
                              {r.challengeMastered ? '✅' : '❌'}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-amber-400">{r.rating.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cumulative Leaderboard */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.cumulativeScore')}</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-[11px] text-gray-400">Ø {p.avg.toFixed(1)} / {p.rounds.length} {t('rateMySong.rounds')}</div>
                </div>
                <div className="text-lg font-bold text-amber-400">{p.total.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">🏆 Awards</h3>
          <div className="space-y-2">
            {/* Best Performance */}
            {bestSinglePerformance && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="text-xs text-amber-400 font-semibold">{t('rateMySong.awardBestPerformance')}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: bestSinglePerformance.rating.playerColor }}
                  >
                    {bestSinglePerformance.rating.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{bestSinglePerformance.rating.playerName}</span>
                  <span className="text-sm text-amber-400 font-bold ml-auto">{bestSinglePerformance.rating.rating.toFixed(1)}</span>
                </div>
              </div>
            )}
            {/* Funniest Moment */}
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30">
              <div className="text-xs text-pink-400 font-semibold">{t('rateMySong.awardFunniest')}</div>
              <div className="text-sm text-gray-300 mt-1">🎉 {winner?.name || t('rateMySong.voteSongOfEvening')}</div>
            </div>
            {/* Biggest Surprise */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="text-xs text-purple-400 font-semibold">{t('rateMySong.awardBiggestSurprise')}</div>
              <div className="text-sm text-gray-300 mt-1">🎊 {t('rateMySong.songOfTheEvening')}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onEnd}
          className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
        >
          {t('rateMySong.backToMenu')}
        </button>
      </div>
    </div>
  );
}
