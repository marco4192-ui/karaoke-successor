/**
 * Rate my Song — Setup, Rating, and Results screens
 *
 * A party mode where players sing and get rated 1-10 (with 0.1 precision).
 * No pitch scoring — just visual pitch display and user ratings.
 * Modes: Single, Duel, Duet | Duration: Short (60s) or Normal (full song)
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PlayerProfile, Song, PLAYER_COLORS } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';
import {
  addRateMySongEntry,
  addDailyRateMySongEntry,
  getRateMySongTopN,
  getDailyRateMySongTopN,
  type RateMySongEntry,
  type RateMySongDailyEntry,
} from '@/lib/game/rate-my-song-ranking';

// ===================== TYPES =====================

export type RateMySongPlayMode = 'single' | 'duel' | 'duet';
export type RateMySongDuration = 'short' | 'normal';

export interface RateMySongSettings {
  playMode: RateMySongPlayMode;
  duration: RateMySongDuration;
  songId: string;
}

export interface RateMySongRating {
  playerId: string;
  playerName: string;
  playerColor: string;
  rating: number; // 1-10 with 0.1 precision
}

export interface RateMySongResult {
  songTitle: string;
  songArtist: string;
  ratings: RateMySongRating[];
  averageRating: number;
}

// ===================== SETUP SCREEN =====================

interface RateMySongSetupScreenProps {
  profiles: PlayerProfile[];
  onStart: (settings: RateMySongSettings, playerIds: string[]) => void;
  onBack: () => void;
}

export function RateMySongSetupScreen({ profiles, onStart, onBack }: RateMySongSetupScreenProps) {
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);
  const [playMode, setPlayMode] = useState<RateMySongPlayMode>('single');
  const [duration, setDuration] = useState<RateMySongDuration>('normal');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Song search / library selection
  const allSongs = useMemo(() => getAllSongs(), []);
  const [songSearch, setSongSearch] = useState('');
  const [songSelectionMode, setSongSelectionMode] = useState<'manual' | 'random'>('manual');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Collect available genres
  const genres = useMemo(() => {
    const g = new Set(allSongs.map(s => s.genre).filter(Boolean) as string[]);
    return ['all', ...Array.from(g).sort()];
  }, [allSongs]);

  // Filtered songs based on search + filters
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
    return songs.slice(0, 50); // Limit to 50 for performance
  }, [allSongs, songSearch, filterGenre, filterDifficulty]);

  // Pick a random song from filtered results
  const pickRandom = () => {
    const pool = filterGenre !== 'all' || filterDifficulty !== 'all'
      ? filteredSongs
      : allSongs;
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
        setError(`Maximal ${maxPlayers} Spieler für ${playMode === 'single' ? 'Single' : playMode === 'duel' ? 'Duel' : 'Duett'}`);
        return prev;
      }
      setError(null);
      return [...prev, id];
    });
  };

  // Reset players when mode changes
  const handleModeChange = (mode: RateMySongPlayMode) => {
    setPlayMode(mode);
    setSelectedPlayers([]);
    setError(null);
  };

  const handleStart = () => {
    // In random mode, auto-pick a song now
    let song = selectedSong;
    if (songSelectionMode === 'random' && !song) {
      const pool = allSongs;
      if (pool.length > 0) song = pool[Math.floor(Math.random() * pool.length)];
    }
    if (!song) {
      setError('Bitte wähle einen Song aus');
      return;
    }
    const minPlayers = playMode === 'single' ? 1 : 2;
    if (selectedPlayers.length < minPlayers) {
      setError(`Mindestens ${minPlayers} Spieler erforderlich`);
      return;
    }
    setError(null);
    onStart(
      { playMode, duration, songId: song.id },
      selectedPlayers,
    );
  };

  const playModeOptions = [
    { value: 'single' as const, label: 'Solo', icon: '🎤', desc: '1 Spieler singt' },
    { value: 'duel' as const, label: 'Duell', icon: '⚔️', desc: '2 Spieler, gleicher Song' },
    { value: 'duet' as const, label: 'Duett', icon: '👥', desc: '2 Spieler, Duett-Parts' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button onClick={onBack} className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          ← Zurück
        </button>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">⭐ Rate my Song</h1>
        <p className="text-gray-400 mb-8">
          Singe einen Song und lass dich von deinen Freunden bewerten!
        </p>

        {/* Play Mode */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Modus</h3>
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
          <h3 className="text-lg font-semibold mb-3">Dauer</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setDuration('short')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                duration === 'short'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              ⏱️ Kurz (60s)
            </button>
            <button
              onClick={() => setDuration('normal')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                duration === 'normal'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
            >
              🎵 Normal
            </button>
          </div>
        </div>

        {/* Song Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Song auswählen</h3>

          {/* Manual / Random toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSongSelectionMode('manual')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                songSelectionMode === 'manual'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              📋 Bibliothek
            </button>
            <button
              onClick={pickRandom}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              🎲 Zufälliger Song
            </button>
          </div>

          {/* Selected song indicator */}
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
              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Song oder Künstler suchen..."
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  className="w-full bg-gray-700/50 border border-white/10 rounded-xl p-3 text-white text-sm pl-9"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>

              {/* Filters */}
              <div className="flex gap-2 mb-3">
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="flex-1 bg-gray-700/50 border border-white/10 rounded-lg p-2 text-white text-xs appearance-none cursor-pointer"
                >
                  {genres.map(g => (
                    <option key={g} value={g}>{g === 'all' ? 'Alle Genres' : g}</option>
                  ))}
                </select>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as typeof filterDifficulty)}
                  className="bg-gray-700/50 border border-white/10 rounded-lg p-2 text-white text-xs appearance-none cursor-pointer"
                >
                  <option value="all">Alle Schwierigkeiten</option>
                  <option value="easy">Leicht</option>
                  <option value="medium">Mittel</option>
                  <option value="hard">Schwer</option>
                </select>
              </div>

              {/* Song list */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-gray-800/50">
                {filteredSongs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Keine Songs gefunden</div>
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
                    +{allSongs.length - 50} weitere — Bitte Suche oder Filter verwenden
                  </div>
                )}
              </div>
            </>
          )}

          {/* Random mode info */}
          {songSelectionMode === 'random' && !selectedSong && (
            <p className="text-sm text-gray-400 text-center py-2">
              Beim Start wird ein zufälliger Song aus der Bibliothek gewählt ({allSongs.length} Songs)
            </p>
          )}
        </div>

        {/* Player Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">
            Spieler {playMode === 'single' ? '(1)' : '(2)'}
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

        {/* Error */}
        {error && <p className="text-red-400 mb-4 text-center">{error}</p>}

        {/* Start Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30"
        >
          ⭐ Singen & Bewerten
        </button>
      </div>
    </div>
  );
}

// ===================== RATING SCREEN =====================

interface RateMySongRatingScreenProps {
  songTitle: string;
  songArtist: string;
  /** The players who sang — they must NOT rate themselves */
  singingPlayers: Array<{ id: string; name: string; color: string }>;
  /** All active profiles (audience + singers) — used to determine who can rate */
  allProfiles: PlayerProfile[];
  onSubmit: (ratings: RateMySongRating[]) => void;
  onBack: () => void;
}

export function RateMySongRatingScreen({
  songTitle,
  songArtist,
  singingPlayers,
  allProfiles,
  onSubmit,
  onBack,
}: RateMySongRatingScreenProps) {
  // Audience = all active profiles EXCEPT the singers themselves
  const audienceProfiles = useMemo(() => {
    const singerIds = new Set(singingPlayers.map(p => p.id));
    return allProfiles.filter(p => p.isActive !== false && !singerIds.has(p.id));
  }, [allProfiles, singingPlayers]);

  // Build the rating list for each singer, each rated by the audience
  // Each audience member rates each singer — we store per-singer, per-audience ratings
  const [audienceRatings, setAudienceRatings] = useState<Record<string, Record<string, number>>>(() => {
    // Initialize all ratings at 5.0: { singerId: { audienceId: 5.0 } }
    const init: Record<string, Record<string, number>> = {};
    for (const singer of singingPlayers) {
      init[singer.id] = {};
      for (const audience of audienceProfiles) {
        init[singer.id][audience.id] = 5.0;
      }
    }
    // Also allow "self" rating from the host if no audience members exist
    if (audienceProfiles.length === 0) {
      for (const singer of singingPlayers) {
        init[singer.id] = { '__host__': 5.0 };
      }
    }
    return init;
  });

  // Current audience member being asked to rate (cycles through audience)
  const [currentAudienceIdx, setCurrentAudienceIdx] = useState(0);

  const updateRating = (singerId: string, audienceId: string, rating: number) => {
    setAudienceRatings(prev => ({
      ...prev,
      [singerId]: { ...prev[singerId], [audienceId]: rating },
    }));
  };

  // Calculate average rating per singer
  const getAverageForSinger = (singerId: string): number => {
    const singerRatings = audienceRatings[singerId];
    if (!singerRatings) return 5.0;
    const values = Object.values(singerRatings);
    if (values.length === 0) return 5.0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  const handleSubmit = () => {
    const ratings: RateMySongRating[] = singingPlayers.map(singer => ({
      playerId: singer.id,
      playerName: singer.name,
      playerColor: singer.color,
      rating: getAverageForSinger(singer.id),
    }));
    onSubmit(ratings);
  };

  // If no audience exists, allow a single combined rating screen (fallback)
  const hasAudience = audienceProfiles.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        {/* Song Info */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl font-bold">{songTitle}</h1>
          <p className="text-gray-400">{songArtist}</p>
          <p className="text-purple-400 text-sm mt-2">
            {hasAudience
              ? `Bewertung durch das Publikum (${audienceProfiles.length} Stimmen)`
              : 'Bitte bewerte den Auftritt'}
          </p>
        </div>

        {hasAudience ? (
          <>
            {/* Audience member selector */}
            <div className="flex items-center justify-center gap-2 mb-6">
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
                  title={audience.name}
                >
                  {audience.name?.[0]?.toUpperCase() || '?'}
                </button>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              Bewertet als: <span className="text-white font-medium">{audienceProfiles[currentAudienceIdx]?.name}</span>
            </p>

            {/* Rating sliders — one per singer, for the selected audience member */}
            <div className="space-y-6 mb-8">
              {singingPlayers.map((singer) => {
                const currentAudience = audienceProfiles[currentAudienceIdx];
                const currentRating = audienceRatings[singer.id]?.[currentAudience.id] ?? 5.0;
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
                        <div className="text-xs text-gray-400">
                          Ø {avgRating.toFixed(1)}
                        </div>
                        <div className="text-2xl font-bold text-amber-400">
                          {currentRating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={currentRating}
                      onChange={(e) => updateRating(singer.id, currentAudience.id, parseFloat(e.target.value))}
                      className="w-full accent-amber-400 h-2"
                    />
                    <div className="flex justify-between text-xs text-white/30 mt-1">
                      <span>1.0</span>
                      <span>5.0</span>
                      <span>10.0</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Fallback: No audience — single combined rating per singer */
          <div className="space-y-6 mb-8">
            {singingPlayers.map((singer) => {
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
                    <div className="text-2xl font-bold text-amber-400">
                      {avgRating.toFixed(1)}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.1"
                    value={avgRating}
                    onChange={(e) => updateRating(singer.id, '__host__', parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-2"
                  />
                  <div className="flex justify-between text-xs text-white/30 mt-1">
                    <span>1.0</span>
                    <span>5.0</span>
                    <span>10.0</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Overall Average */}
        {singingPlayers.length > 1 && (
          <div className="text-center mb-6 bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <span className="text-purple-300 font-medium">Gesamtdurchschnitt: </span>
            <span className="text-xl font-bold text-white">
              {singingPlayers.reduce((sum, s) => sum + getAverageForSinger(s.id), 0) / singingPlayers.length}
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
            Zurück
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
          >
            ⭐ Bewertung speichern
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
  onPlayAgain: () => void;
  onEnd: () => void;
}

export function RateMySongResultsScreen({ result, songId, onPlayAgain, onEnd }: RateMySongResultsScreenProps) {
  const [topRanking, setTopRanking] = useState<RateMySongEntry[]>([]);
  const [dailyRanking, setDailyRanking] = useState<RateMySongDailyEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'alltime'>('daily');

  // Persist ratings and load ranking on mount
  useEffect(() => {
    // Save each player's rating to both all-time and daily rankings
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
    }
    // Reload both rankings
    setTopRanking(getRateMySongTopN(5));
    setDailyRanking(getDailyRateMySongTopN(5));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900/10 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2">Bewertung abgeschlossen!</h1>
        <p className="text-gray-400 mb-2">{result.songTitle}</p>
        <div className="text-5xl font-bold text-amber-400 mb-8">
          {result.averageRating.toFixed(1)}
          <span className="text-2xl text-gray-400"> / 10</span>
        </div>

        {/* Individual Ratings */}
        <div className="space-y-3 mb-6 text-left">
          {result.ratings.map((r, i) => {
            const emoji = r.rating >= 9 ? '🌟' : r.rating >= 7 ? '⭐' : r.rating >= 5 ? '👍' : r.rating >= 3 ? '😐' : '💔';
            return (
              <div key={r.playerId} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: r.playerColor }}
                >
                  {r.playerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{r.playerName}</div>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-amber-400">{r.rating.toFixed(1)}</span>
                  <span className="text-lg ml-1">{emoji}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Highscore Leaderboard */}
        {(topRanking.length > 0 || dailyRanking.length > 0) && (
          <div className="mb-8 text-left">
            {/* Tab switcher */}
            <div className="flex gap-2 mb-4 justify-center">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'daily'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                📅 Tages-Highscore
              </button>
              <button
                onClick={() => setActiveTab('alltime')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'alltime'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                🏅 All-Time Highscore
              </button>
            </div>

            {/* Daily Highscore */}
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
                  <p className="text-center text-gray-500 text-sm py-4">
                    Noch keine Bewertungen heute. Sei der Erste!
                  </p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">
                  Tägliche Bestenliste — wird jeden Tag zurückgesetzt
                </p>
              </>
            )}

            {/* All-Time Highscore */}
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
                  <p className="text-center text-gray-500 text-sm py-4">
                    Noch keine Bewertungen vorhanden.
                  </p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">
                  Score = Rating × log2(Bewertungen + 1)
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-500 transition-all"
          >
            Nochmal spielen
          </button>
          <button
            onClick={onEnd}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all"
          >
            Zurück zum Menü
          </button>
        </div>
      </div>
    </div>
  );
}
