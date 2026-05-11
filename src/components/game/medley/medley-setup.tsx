'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getNonDuetSongs } from '@/lib/game/song-library';
import type { PlayerProfile, Difficulty } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings,
  MedleyPlayMode, TeamSize, SnippetMatchup,
} from './medley-types';
import { getDefaultSettings, generateTeamMatchups, teamSnippetCount } from './medley-types';
import { generateMedleySnippets, getAvailableGenres, getAvailableLanguages } from './medley-snippet-generator';
import type { Language } from '@/lib/i18n/translations';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== PROPS =====================

interface MedleySetupProps {
  profiles: PlayerProfile[];
  onStartGame: (
    _players: MedleyPlayer[],
    _songs: MedleySong[],
    _settings: MedleySettings,
    _matchups: SnippetMatchup[],
  ) => void;
  onBack: () => void;
}

// ===================== COMPONENT =====================

export function MedleySetup({ profiles, onStartGame, onBack }: MedleySetupProps) {
  const { t } = useTranslation();
  const allSongs = useMemo(() => getNonDuetSongs(), []);
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
      if (prev.includes(id)) {
        // Also remove from teams
        setTeamAIds(ta => ta.filter(x => x !== id));
        setTeamBIds(tb => tb.filter(x => x !== id));
        return prev.filter(x => x !== id);
      }
      if (prev.length >= maxPlayers) {
        setError(t('medley.errorMaxPlayers').replace('{n}', String(maxPlayers)));
        return prev;
      }
      setError(null);
      return [...prev, id];
    });
    // Auto-assign to teams in team mode (outside updater to avoid nested setState)
    if (playMode === 'team') {
      setTeamAIds(ta => {
        if (ta.length < teamSize) return [...ta, id];
        // Team A full — assign to B
        setTeamBIds(tb => [...tb, id]);
        return ta;
      });
    }
  };

  const removeProfile = (id: string) => {
    setSelectedProfileIds(prev => prev.filter(x => x !== id));
    setTeamAIds(prev => prev.filter(x => x !== id));
    setTeamBIds(prev => prev.filter(x => x !== id));
  };

  // ── Start Game ──
  const handleStart = useCallback(() => {
    if (playMode === 'ffa' && selectedProfileIds.length < 2) {
      setError(t('medley.errorMinPlayers'));
      return;
    }
    if (playMode === 'team') {
      if (teamAIds.length !== teamSize || teamBIds.length !== teamSize) {
        setError(t('medley.errorMinPlayers'));
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
        inputType: 'local' as const,
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
      setError(t('medley.errorNoSongs'));
      return;
    }

    // Generate matchups for team mode
    const teamAPlayers = players.filter(p => p.team === 0);
    const teamBPlayers = players.filter(p => p.team === 1);
    const matchups = playMode === 'team'
      ? generateTeamMatchups(teamAPlayers, teamBPlayers)
      : [];

    onStartGame(players, songs, finalSettings, matchups);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- settings is computed from multiple state vars; excluded to avoid excessive deps
  }, [playMode, teamSize, selectedProfileIds, teamAIds, teamBIds, profiles, globalDifficulty, filterGenre, filterLanguage, allSongs, snippetCount, onStartGame]);

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
        <Button variant="ghost" onClick={onBack} className="text-white/60">{t('medley.back')}</Button>
        <div>
          <h1 className="text-3xl font-bold">{t('medley.setupTitle')}</h1>
          <p className="text-white/60">{t('medley.setupSubtitle')}</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-purple-400">{t('medley.howItWorks')}</h3>
          <ul className="text-sm text-white/70 space-y-1">
            <li>{t('medley.howItWorks1')}</li>
            <li>{t('medley.howItWorks2')}</li>
            <li>{t('medley.howItWorks3')}</li>
            <li>{t('medley.howItWorks4')}</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
      )}

      {/* Play Mode Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>{t('medley.gameMode')}</CardTitle></CardHeader>
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
                <div className="text-lg">{t('medley.ffa')}</div>
                <div className="text-xs opacity-70">{t('medley.ffaDesc')}</div>
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
                <div className="text-lg">{t('medley.teamMode')}</div>
                <div className="text-xs opacity-70">{t('medley.teamModeDesc')}</div>
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
        <CardHeader><CardTitle>{t('medley.songFilter')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">{t('medley.genre')}</span>
              <select
                value={filterGenre}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50"
                style={selectStyle}
              >
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-gray-800 text-white">
                    {g === 'all' ? t('medley.allGenres') : g}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">{t('medley.language')}</span>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50"
                style={selectStyle}
              >
                {availableLanguages.map(l => (
                  <option key={l} value={l} className="bg-gray-800 text-white">
                    {l === 'all' ? t('medley.allLanguages') : (LANGUAGE_NAMES[l as Language] || l)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Snippet Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('medley.snippetDuration').replace('{n}', String(settings.snippetDuration))}</label>
            <input type="range" min={15} max={60} step={5} value={settings.snippetDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, snippetDuration: Number(e.target.value) }))}
              className="w-full" />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>{t('medley.snippetDurationShort')}</span><span>{t('medley.snippetDurationLong')}</span>
            </div>
          </div>

          {/* FFA: snippet count */}
          {playMode === 'ffa' && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">{t('medley.snippetCount').replace('{n}', String(settings.snippetCount))}</label>
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
            <label className="text-sm text-white/60 mb-2 block">{t('medley.difficulty')}</label>
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
          <CardTitle>{t('medley.players').replace('{n}', String(selectedProfileIds.length)).replace('{m}', String(maxPlayers))}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeProfiles.length < 1 && (
            <p className="text-yellow-400 mb-4">{t('medley.noActiveProfiles')}</p>
          )}

          {/* Team mode: two columns */}
          {playMode === 'team' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Team A */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-blue-500/30 text-blue-300">{t('medley.teamA')} ({teamAIds.length}/{teamSize})</Badge>
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
                        {isInTeamA && <span className="ml-auto text-blue-400 text-xs">{t('medley.teamA')}</span>}
                        {!isInTeamA && isSelected && <span className="ml-auto text-red-400 text-xs">{t('medley.teamB')}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Team B */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-red-500/30 text-red-300">{t('medley.teamB')} ({teamBIds.length}/{teamSize})</Badge>
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
                        {isInTeamB && <span className="ml-auto text-red-400 text-xs">{t('medley.teamB')}</span>}
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
              <h3 className="font-bold text-lg">{t('medley.overview')}</h3>
              <p className="text-sm text-white/60">
                {playMode === 'ffa' ? 'FFA' : `${teamSize} vs ${teamSize}`}
                {' '}· {snippetCount} Snippets · {settings.snippetDuration}s pro Snippet
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">
                {Math.ceil(snippetCount * settings.snippetDuration / 60)} Min.
              </div>
              <div className="text-xs text-white/40">{t('medley.approxTotalDuration')}</div>
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
        {t('medley.startMedley').replace('{n}', String(selectedProfileIds.length))}
      </Button>
    </div>
  );
}
