/**
 * Rate my Song — Setup Screen
 */

'use client';

import { useState, useMemo } from 'react';
import { PlayerProfile, Song, PLAYER_COLORS } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';
import { useTranslation } from '@/lib/i18n/translations';
import type { RateMySongPlayMode, RateMySongDuration } from './rate-my-song-types';
import type { RateMySongSetupScreenProps } from './rate-my-song-types';

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
