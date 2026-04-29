'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import type { PlayerProfile, Difficulty, PLAYER_COLORS } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings,
  MedleyPlayMode, TeamSize, SnippetMatchup,
} from './medley-types';
import { getDefaultSettings, generateTeamMatchups, teamSnippetCount } from './medley-types';
import { generateMedleySnippets, getAvailableGenres, getAvailableLanguages } from './medley-snippet-generator';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';

// ===================== PROPS =====================

interface MedleySetupProps {
  profiles: PlayerProfile[];
  onStartGame: (
    players: MedleyPlayer[],
    songs: MedleySong[],
    settings: MedleySettings,
    matchups: SnippetMatchup[],
  ) => void;
  onBack: () => void;
}

// ===================== COMPONENT =====================

export function MedleySetup({ profiles, onStartGame, onBack }: MedleySetupProps) {
  const allSongs = useMemo(() => getAllSongs(), []);
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);

  const globalDifficulty = useGameStore((s) => s.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((s) => s.setDifficulty);

  // ── State ──
  const [playMode, setPlayMode] = useState<MedleyPlayMode>('ffa');
  const [teamSize, setTeamSize] = useState<TeamSize>(2);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<MedleySettings>(
    () => getDefaultSettings('ffa', 2),
  );
  const [error, setError] = useState<string | null>(null);

  // Team assignment: which profiles are in which team
  // For FFA: all in team 0 (irrelevant), for Team: split into two
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);

  // Filters
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const availableGenres = useMemo(() => getAvailableGenres(allSongs), [allSongs]);
  const availableLanguages = useMemo(() => getAvailableLanguages(allSongs), [allSongs]);

  // ── Derived ──
  const snippetCount = playMode === 'ffa'
    ? settings.snippetCount
    : teamSnippetCount(teamSize);

  const maxPlayers = playMode === 'ffa' ? 4 : teamSize * 2;

  // ── Callbacks ──
  const updatePlayMode = (mode: MedleyPlayMode) => {
    setPlayMode(mode);
    setSettings(getDefaultSettings(mode, teamSize));
    setSelectedProfileIds([]);
    setTeamAIds([]);
    setTeamBIds([]);
    setError(null);
  };

  const updateTeamSize = (size: TeamSize) => {
    setTeamSize(size);
    setSettings(getDefaultSettings(playMode, size));
    setSelectedProfileIds([]);
    setTeamAIds([]);
    setTeamBIds([]);
    setError(null);
  };

  const toggleProfile = (id: string) => {
    setSelectedProfileIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxPlayers) {
        setError(`Maximal ${maxPlayers} Spieler erlaubt`);
        return prev;
      }
      setError(null);
      // Auto-assign to teams in team mode
      if (playMode === 'team') {
        const teamANeeded = teamSize;
        if (teamAIds.length < teamANeeded) {
          setTeamAIds([...teamAIds, id]);
        } else {
          setTeamBIds([...teamBIds, id]);
        }
      }
      return [...prev, id];
    });
  };

  const removeProfile = (id: string) => {
    setSelectedProfileIds(prev => prev.filter(x => x !== id));
    setTeamAIds(prev => prev.filter(x => x !== id));
    setTeamBIds(prev => prev.filter(x => x !== id));
  };

  // ── Start Game ──
  const handleStart = useCallback(() => {
    if (playMode === 'ffa' && selectedProfileIds.length < 2) {
      setError('FFA benötigt mindestens 2 Spieler');
      return;
    }
    if (playMode === 'team') {
      if (teamAIds.length !== teamSize || teamBIds.length !== teamSize) {
        setError(`Jedes Team benötigt genau ${teamSize} Spieler`);
        return;
      }
    }

    // Build players
    const players: MedleyPlayer[] = selectedProfileIds.map((id, i) => {
      const profile = profiles.find(p => p.id === id);
      const team = playMode === 'team' ? (teamBIds.includes(id) ? 1 : 0) : 0;
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || `hsl(${(i * 90) % 360}, 70%, 60%)`,
        team,
        inputType: 'local' as const, // TODO: detect companion
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        snippetsSung: 0,
      };
    });

    // Generate songs (surprise — random only)
    const finalSettings: MedleySettings = {
      ...settings,
      playMode,
      teamSize,
      snippetCount,
      difficulty: globalDifficulty,
      genre: filterGenre !== 'all' ? filterGenre : undefined,
      language: filterLanguage !== 'all' ? filterLanguage : undefined,
    };

    const songs = generateMedleySnippets(
      allSongs, snippetCount, settings.snippetDuration,
      finalSettings.genre, finalSettings.language,
    );

    if (songs.length === 0) {
      setError('Keine passenden Songs gefunden. Prüfe Filter oder Songbibliothek.');
      return;
    }

    // Generate matchups for team mode
    const teamAPlayers = players.filter(p => p.team === 0);
    const teamBPlayers = players.filter(p => p.team === 1);
    const matchups = playMode === 'team'
      ? generateTeamMatchups(teamAPlayers, teamBPlayers)
      : [];

    onStartGame(players, songs, finalSettings, matchups);
  }, [playMode, teamSize, selectedProfileIds, teamAIds, teamBIds, profiles, settings, globalDifficulty, filterGenre, filterLanguage, allSongs, snippetCount, onStartGame]);

  // ── Render ──
  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 8px center',
    backgroundSize: '16px',
    paddingRight: '32px',
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">← Back</Button>
        <div>
          <h1 className="text-3xl font-bold">🎵 Medley Contest</h1>
          <p className="text-white/60">Random Song-Snippets — singe gegeneinander!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-purple-400">🎮 So funktioniert&apos;s</h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>🎵 Zufällige Song-Snippets werden nacheinander gespielt</li>
            <li>⏱️ Jeder Snippet ist {settings.snippetDuration} Sekunden lang</li>
            <li>🏆 Punkte werden über alle Snippets aufsummiert</li>
            <li>🔄 Keine Song-Vorschau — es bleibt überraschend!</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
      )}

      {/* Play Mode Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Spielmodus</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant={playMode === 'ffa' ? 'default' : 'outline'}
              onClick={() => updatePlayMode('ffa')}
              className={playMode === 'ffa'
                ? 'bg-purple-500 hover:bg-purple-600 w-full'
                : 'border-white/20 text-white w-full'}
            >
              <div className="text-center w-full">
                <div className="text-lg">🎮 Jeder gegen Jeden</div>
                <div className="text-xs opacity-70">Bis zu 4 Spieler gleichzeitig</div>
              </div>
            </Button>
            <Button
              variant={playMode === 'team' ? 'default' : 'outline'}
              onClick={() => updatePlayMode('team')}
              className={playMode === 'team'
                ? 'bg-purple-500 hover:bg-purple-600 w-full'
                : 'border-white/20 text-white w-full'}
            >
              <div className="text-center w-full">
                <div className="text-lg">⚔️ Team-Modus</div>
                <div className="text-xs opacity-70">1v1 oder 2v2 — Relay-Style</div>
              </div>
            </Button>
          </div>

          {/* Team size (only in team mode) */}
          {playMode === 'team' && (
            <div className="flex gap-2">
              {([1, 2] as TeamSize[]).map(size => (
                <Button
                  key={size}
                  variant={teamSize === size ? 'default' : 'outline'}
                  onClick={() => updateTeamSize(size)}
                  className={teamSize === size
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'border-white/20 text-white'}
                >
                  {size === 1 ? '1 vs 1' : '2 vs 2'} ({teamSnippetCount(size)} Snippets)
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Song Filters */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Song-Filter</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🎸 Genre:</span>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50"
                style={selectStyle}
              >
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-gray-800 text-white">
                    {g === 'all' ? 'Alle Genres' : g}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🌍 Sprache:</span>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50"
                style={selectStyle}
              >
                {availableLanguages.map(l => (
                  <option key={l} value={l} className="bg-gray-800 text-white">
                    {l === 'all' ? 'Alle Sprachen' : (LANGUAGE_NAMES[l] || l)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Snippet Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Snippet-Dauer: {settings.snippetDuration}s</label>
            <input type="range" min={15} max={60} step={5} value={settings.snippetDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, snippetDuration: Number(e.target.value) }))}
              className="w-full" />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>15s (Schnell)</span><span>60s (Lang)</span>
            </div>
          </div>

          {/* FFA: snippet count */}
          {playMode === 'ffa' && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Anzahl Snippets: {settings.snippetCount}</label>
              <input type="range" min={3} max={10} step={1} value={settings.snippetCount}
                onChange={(e) => setSettings(prev => ({ ...prev, snippetCount: Number(e.target.value) }))}
                className="w-full" />
              <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>3 Snippets</span><span>10 Snippets</span>
              </div>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Schwierigkeit</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button key={diff} variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={globalDifficulty === diff ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Spieler ({selectedProfileIds.length}/{maxPlayers})</CardTitle>
        </CardHeader>
        <CardContent>
          {activeProfiles.length < 1 && (
            <p className="text-yellow-400 mb-4">⚠️ Keine aktiven Profile. Erstelle Profile unter Characters.</p>
          )}

          {/* Team mode: two columns */}
          {playMode === 'team' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Team A */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-500/30 text-blue-300">Team A ({teamAIds.length}/{teamSize})</Badge>
                </div>
                <div className="space-y-2">
                  {activeProfiles.map(profile => {
                    const isSelected = selectedProfileIds.includes(profile.id);
                    const isInTeamA = teamAIds.includes(profile.id);
                    return (
                      <div key={profile.id}
                        onClick={() => isSelected ? removeProfile(profile.id) : toggleProfile(profile.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${isInTeamA
                          ? 'bg-blue-500/20 border-2 border-blue-500'
                          : isSelected
                            ? 'bg-red-500/20 border-2 border-red-500'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate text-sm">{profile.name}</span>
                        {isInTeamA && <span className="ml-auto text-blue-400 text-xs">Team A</span>}
                        {!isInTeamA && isSelected && <span className="ml-auto text-red-400 text-xs">Team B</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Team B */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-500/30 text-red-300">Team B ({teamBIds.length}/{teamSize})</Badge>
                </div>
                <div className="space-y-2">
                  {activeProfiles.map(profile => {
                    const isSelected = selectedProfileIds.includes(profile.id);
                    const isInTeamB = teamBIds.includes(profile.id);
                    if (!isSelected && !isInTeamB) {
                      // Show placeholder for empty slot
                      if (teamBIds.length >= teamSize) return null;
                    }
                    return (
                      <div key={profile.id}
                        onClick={() => isSelected ? removeProfile(profile.id) : toggleProfile(profile.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${isInTeamB
                          ? 'bg-red-500/20 border-2 border-red-500'
                          : isSelected
                            ? 'bg-blue-500/20 border-2 border-blue-500'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10 opacity-40'}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: profile.color }}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium truncate text-sm">{profile.name}</span>
                        {isInTeamB && <span className="ml-auto text-red-400 text-xs">Team B</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* FFA: single grid */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = selectedProfileIds.includes(profile.id);
                return (
                  <div key={profile.id}
                    onClick={() => isSelected ? removeProfile(profile.id) : toggleProfile(profile.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-3">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: profile.color }}>
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-purple-400">✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Übersicht</h3>
              <p className="text-sm text-white/60">
                {playMode === 'ffa' ? 'FFA' : `${teamSize} vs ${teamSize}`}
                {' '}· {snippetCount} Snippets · {settings.snippetDuration}s pro Snippet
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">
                {Math.ceil(snippetCount * settings.snippetDuration / 60)} Min.
              </div>
              <div className="text-xs text-white/40">ca. Gesamtdauer</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStart}
        disabled={
          (playMode === 'ffa' && selectedProfileIds.length < 2) ||
          (playMode === 'team' && (teamAIds.length !== teamSize || teamBIds.length !== teamSize))
        }
        className="w-full py-6 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
        🎵 Start Medley ({selectedProfileIds.length} Spieler)
      </Button>
    </div>
  );
}
