/**
 * Rate my Song — Setup, Rating, and Results screens
 *
 * A party mode where players sing and get rated 1-10 (with 0.1 precision).
 * No pitch scoring — just visual pitch display and user ratings.
 * Modes: Single, Duel, Duet | Duration: Short (60s) or Normal (full song)
 */

'use client';

import React, { useState, useMemo } from 'react';
import { PlayerProfile, Song, PLAYER_COLORS } from '@/types/game';
import { getAllSongs } from '@/lib/game/song-library';

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

  const allSongs = useMemo(() => getAllSongs(), []);

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
    if (!selectedSong) {
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
      { playMode, duration, songId: selectedSong.id },
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
          <div className="relative">
            <select
              value={selectedSong?.id || ''}
              onChange={(e) => {
                const song = allSongs.find(s => s.id === e.target.value);
                setSelectedSong(song || null);
              }}
              className="w-full bg-gray-700/50 border border-white/10 rounded-xl p-3 text-white appearance-none cursor-pointer"
            >
              <option value="">— Song wählen —</option>
              {allSongs.map(song => (
                <option key={song.id} value={song.id}>
                  {song.artist} - {song.title}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">▼</div>
          </div>
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
  players: Array<{ id: string; name: string; color: string }>;
  onSubmit: (ratings: RateMySongRating[]) => void;
  onBack: () => void;
}

export function RateMySongRatingScreen({
  songTitle,
  songArtist,
  players,
  onSubmit,
  onBack,
}: RateMySongRatingScreenProps) {
  const [ratings, setRatings] = useState<RateMySongRating[]>(
    players.map(p => ({ playerId: p.id, playerName: p.name, playerColor: p.color, rating: 5.0 }))
  );

  const updateRating = (playerId: string, rating: number) => {
    setRatings(prev => prev.map(r => r.playerId === playerId ? { ...r, rating } : r));
  };

  const handleSubmit = () => {
    onSubmit(ratings);
  };

  const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        {/* Song Info */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl font-bold">{songTitle}</h1>
          <p className="text-gray-400">{songArtist}</p>
          <p className="text-purple-400 text-sm mt-2">Wie war der Auftritt?</p>
        </div>

        {/* Rating Sliders */}
        <div className="space-y-6 mb-8">
          {ratings.map((rating) => (
            <div key={rating.playerId} className="bg-gray-700/30 rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: rating.playerColor }}
                  >
                    {rating.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{rating.playerName}</span>
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {rating.rating.toFixed(1)}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="0.1"
                value={rating.rating}
                onChange={(e) => updateRating(rating.playerId, parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-2"
              />
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>1.0</span>
                <span>5.0</span>
                <span>10.0</span>
              </div>
            </div>
          ))}
        </div>

        {/* Average */}
        {ratings.length > 1 && (
          <div className="text-center mb-6 bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <span className="text-purple-300 font-medium">Durchschnitt: </span>
            <span className="text-xl font-bold text-white">{averageRating.toFixed(1)}</span>
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
  onPlayAgain: () => void;
  onEnd: () => void;
}

export function RateMySongResultsScreen({ result, onPlayAgain, onEnd }: RateMySongResultsScreenProps) {
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
        <div className="space-y-3 mb-8 text-left">
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
