'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Song, PlayerProfile, Difficulty, PLAYER_COLORS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import type {
  MedleyPlayMode,
  TeamSize,
  MedleyPlayer,
  MedleySettings,
} from './medley-types';
import { DEFAULT_MEDLEY_SETTINGS, getTeamSnippetCount, getFFASnippetCount } from './medley-types';
import {
  generateMedleySnippets,
  getAvailableLanguages,
  getAvailableGenres,
  LANGUAGE_NAMES,
} from './medley-utils';

interface MedleySetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (
    players: MedleyPlayer[],
    medleySongs: ReturnType<typeof generateMedleySnippets>,
    settings: MedleySettings,
  ) => void;
  onBack: () => void;
}

export function MedleySetupScreen({ profiles, songs, onStartGame, onBack }: MedleySetupProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<MedleySettings>(DEFAULT_MEDLEY_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  // Global difficulty from store
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);

  // Active profiles (isActive !== false)
  const activeProfiles = useMemo(
    () => profiles.filter(p => p.isActive !== false),
    [profiles],
  );

  // Available languages / genres
  const availableLanguages = useMemo(() => getAvailableLanguages(songs), [songs]);
  const availableGenres = useMemo(() => getAvailableGenres(songs), [songs]);

  // ── Derived values ──
  const isFFA = settings.playMode === 'ffa';
  const requiredPlayers = isFFA ? 4 : settings.teamSize * 2;
  const snippetCount = isFFA ? getFFASnippetCount() : getTeamSnippetCount(settings.teamSize);

  // Filter eligible songs count for display
  const eligibleSongCount = useMemo(() => {
    const dur = settings.snippetDuration * 1000;
    return songs.filter(s => {
      if (s.duration <= dur) return false;
      if (settings.languageFilter && s.language && s.language !== settings.languageFilter) return false;
      if (settings.genreFilter && s.genre && s.genre !== settings.genreFilter) return false;
      return true;
    }).length;
  }, [songs, settings.snippetDuration, settings.languageFilter, settings.genreFilter]);

  // ── Player toggle ──
  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= 4) {
        setError('Maximal 4 Spieler erlaubt');
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  // ── Team assignment for Team mode ──
  // In Team mode, first N/2 players go to Team A, rest to Team B
  // This is computed at game start, not stored here
  const getTeamAssignment = useCallback((playerIds: string[]) => {
    const half = settings.teamSize;
    return {
      teamA: playerIds.slice(0, half),
      teamB: playerIds.slice(half, half * 2),
    };
  }, [settings.teamSize]);

  // ── Start game ──
  const handleStartGame = () => {
    setError(null);

    // Validate player count
    if (selectedPlayerIds.length < requiredPlayers) {
      setError(
        isFFA
          ? `FFA-Modus benötigt genau 4 Spieler (${selectedPlayerIds.length} ausgewählt)`
          : `${settings.teamSize}v${settings.teamSize} benötigt ${requiredPlayers} Spieler (${selectedPlayerIds.length} ausgewählt)`,
      );
      return;
    }

    if (isFFA && selectedPlayerIds.length !== 4) {
      setError('FFA-Modus benötigt genau 4 Spieler');
      return;
    }

    // Generate snippets
    const medleySongs = generateMedleySnippets(
      songs,
      snippetCount,
      settings.snippetDuration,
      settings.languageFilter,
      settings.genreFilter,
    );

    if (medleySongs.length === 0) {
      setError('Keine passenden Songs gefunden. Es werden Songs benötigt, die länger als die Snippet-Dauer sind.');
      return;
    }

    // Create players
    const teamAssignment = isFFA ? null : getTeamAssignment(selectedPlayerIds);

    const players: MedleyPlayer[] = selectedPlayerIds.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      const team = !isFFA && teamAssignment
        ? teamAssignment.teamA.includes(id) ? 'A' as const : 'B' as const
        : null;

      return {
        id,
        name: profile?.name || `Spieler ${index + 1}`,
        avatar: profile?.avatar,
        color: profile?.color || ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'][index % 4],
        team,
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        snippetsSung: 0,
      };
    });

    const finalSettings: MedleySettings = {
      ...settings,
      difficulty: globalDifficulty,
      snippetCount: medleySongs.length,
    };

    onStartGame(players, medleySongs, finalSettings);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Zurück
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🎵 Medley Contest</h1>
          <p className="text-white/60">Sing kurze Snippets von verschiedenen Songs hintereinander!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-purple-400">🎮 So funktioniert&apos;s</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>🎵 Zufällige Song-Snippets — keine Vorschau, alles Überraschung!</li>
            <li>⏱️ Jedes Snippet ist {settings.snippetDuration} Sekunden lang</li>
            <li>🏆 Punkte werden über alle Snippets summiert</li>
            {isFFA ? (
              <li>👥 FFA: Alle 4 Spieler singen gleichzeitig, einzeln bewertet</li>
            ) : (
              <li>⚔️ Team: {settings.teamSize}v{settings.teamSize} — Teams treten in Snippets gegeneinander an</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* ── Play Mode Selection ── */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Spielmodus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSettings(prev => ({ ...prev, playMode: 'ffa' }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                isFFA
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-1">👥</div>
              <div className="font-bold">FFA (Jeder gegen Jeden)</div>
              <div className="text-xs text-white/50 mt-1">
                4 Spieler singen gleichzeitig, einzeln bewertet
              </div>
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, playMode: 'team' }))}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                !isFFA
                  ? 'border-pink-500 bg-pink-500/20'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="text-2xl mb-1">⚔️</div>
              <div className="font-bold">Team-Modus</div>
              <div className="text-xs text-white/50 mt-1">
                Teams treten abwechselnd in Snippets gegeneinander an
              </div>
            </button>
          </div>

          {/* Team size selector (only in team mode) */}
          {!isFFA && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Team-Größe</label>
              <div className="flex gap-2">
                {([1, 2] as TeamSize[]).map(size => (
                  <Button
                    key={size}
                    variant={settings.teamSize === size ? 'default' : 'outline'}
                    onClick={() => setSettings(prev => ({ ...prev, teamSize: size }))}
                    className={
                      settings.teamSize === size
                        ? 'bg-pink-500 hover:bg-pink-600'
                        : 'border-white/20'
                    }
                  >
                    {size}v{size} {size === 1 ? '(5 Snippets)' : '(4 Snippets)'}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-1">
                {settings.teamSize === 1
                  ? '1v1: 5 Snippets — derselbe Gegner jedes Mal'
                  : '2v2: 4 Snippets — Jeder spielt gegen jeden aus dem anderen Team'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Filters (Language & Genre) ── */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language filter */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Sprache</label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={!settings.languageFilter ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, languageFilter: null }))}
                className={!settings.languageFilter ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
              >
                Alle
              </Button>
              {availableLanguages.map(lang => (
                <Button
                  key={lang}
                  size="sm"
                  variant={settings.languageFilter === lang ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    languageFilter: prev.languageFilter === lang ? null : lang,
                  }))}
                  className={settings.languageFilter === lang ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
                >
                  {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Genre filter */}
          {availableGenres.length > 0 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Genre</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={!settings.genreFilter ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, genreFilter: null }))}
                  className={!settings.genreFilter ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
                >
                  Alle
                </Button>
                {availableGenres.map(genre => (
                  <Button
                    key={genre}
                    size="sm"
                    variant={settings.genreFilter === genre ? 'default' : 'outline'}
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      genreFilter: prev.genreFilter === genre ? null : genre,
                    }))}
                    className={settings.genreFilter === genre ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-white/40">
            {eligibleSongCount} Songs verfügbar für die aktuelle Filter-Konfiguration
          </p>
        </CardContent>
      </Card>

      {/* ── Snippet Settings ── */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Snippet-Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Snippet Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">
              Snippet-Dauer: {settings.snippetDuration}s
            </label>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={settings.snippetDuration}
              onChange={e => setSettings(prev => ({ ...prev, snippetDuration: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>15s (Schnell)</span>
              <span>60s (Lang)</span>
            </div>
          </div>

          {/* Transition Time */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">
              Übergangszeit: {settings.transitionTime}s
            </label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.transitionTime}
              onChange={e => setSettings(prev => ({ ...prev, transitionTime: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-white/40 mt-1">Zeit zwischen Snippets</p>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Schwierigkeit</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button
                  key={diff}
                  variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={
                    globalDifficulty === diff
                      ? 'bg-purple-500 hover:bg-purple-600'
                      : 'border-white/20'
                  }
                >
                  {diff === 'easy' ? 'Leicht' : diff === 'medium' ? 'Mittel' : 'Schwer'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Player Selection ── */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>
            Spieler ({selectedPlayerIds.length}/{requiredPlayers}
            {isFFA ? ' — genau 4 benötigt' : ` — ${requiredPlayers} benötigt`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Team preview for team mode */}
          {!isFFA && selectedPlayerIds.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="text-sm font-bold text-purple-400 mb-2">Team A</div>
                {selectedPlayerIds.slice(0, settings.teamSize).map(id => {
                  const p = profiles.find(pr => pr.id === id);
                  return p ? (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <span>{p.name}</span>
                    </div>
                  ) : null;
                })}
                {selectedPlayerIds.length < settings.teamSize && (
                  <div className="text-xs text-white/30 mt-1">
                    {settings.teamSize - selectedPlayerIds.length} noch benötigt
                  </div>
                )}
              </div>
              <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
                <div className="text-sm font-bold text-pink-400 mb-2">Team B</div>
                {selectedPlayerIds.slice(settings.teamSize).map(id => {
                  const p = profiles.find(pr => pr.id === id);
                  return p ? (
                    <div key={id} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <span>{p.name}</span>
                    </div>
                  ) : null;
                })}
                {selectedPlayerIds.length >= settings.teamSize && selectedPlayerIds.length < settings.teamSize * 2 && (
                  <div className="text-xs text-white/30 mt-1">
                    {settings.teamSize * 2 - selectedPlayerIds.length} noch benötigt
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Player grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayerIds.includes(profile.id);
              const teamLabel = !isFFA && isSelected
                ? selectedPlayerIds.indexOf(profile.id) < settings.teamSize ? 'A' : 'B'
                : null;

              return (
                <div
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? isFFA
                        ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500'
                        : teamLabel === 'A'
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-pink-500/20 border-2 border-pink-500'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{profile.name}</span>
                      {teamLabel && (
                        <span className={`text-xs ${teamLabel === 'A' ? 'text-purple-400' : 'text-pink-400'}`}>
                          Team {teamLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <span className="text-purple-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {activeProfiles.length < requiredPlayers && (
            <p className="text-yellow-400 mt-4">
              ⚠️ Nicht genug aktive Profile. Erstelle und aktiviere Profile in der Charakter-Auswahl.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Preview ── */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Medley-Vorschau</h3>
              <p className="text-sm text-white/60">
                {snippetCount} Snippets × {settings.snippetDuration}s = ~{Math.ceil(snippetCount * settings.snippetDuration / 60)} Min.
              </p>
              {isFFA && (
                <p className="text-xs text-white/40 mt-1">Alle 4 Spieler singen jedes Snippet gleichzeitig</p>
              )}
              {!isFFA && (
                <p className="text-xs text-white/40 mt-1">
                  {settings.teamSize === 1
                    ? '1v1: 5 Duelle — derselbe Gegner'
                    : '2v2: Jeder spielt gegen jeden aus dem anderen Team'}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">{snippetCount * settings.snippetDuration}s</div>
              <div className="text-xs text-white/40">Gesamtdauer Snippets</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Start Button ── */}
      <Button
        onClick={handleStartGame}
        disabled={selectedPlayerIds.length < requiredPlayers}
        className="w-full py-6 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
      >
        🎵 Medley starten ({selectedPlayerIds.length}/{requiredPlayers} Spieler)
      </Button>
    </div>
  );
}
