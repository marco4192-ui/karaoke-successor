'use client';

/**
 * Medley Contest — Setup Screen
 *
 * Feature #2: Companion App Integration — toggle per player, fetch companion profiles
 * Feature #6: Flexible Team Management — two-column layout, click-to-toggle, shuffle, swap
 * Feature #9: Dynamic Difficulty toggle
 * Feature #10: Elimination mode — third mode button
 * Feature #15: Voice-Effects toggle
 * Feature #16: Mystery Mode toggle
 * Feature #18: Team-Bonus toggle
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { getDefaultSettings, generateTeamMatchups, teamSnippetCount, eliminationSnippetCount } from './medley-types';
import { generateMedleySnippets, getAvailableGenres, getAvailableLanguages } from './medley-snippet-generator';
import type { Language } from '@/lib/i18n/translations';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== COMPANION PROFILE TYPE =====================

interface CompanionProfile {
  id: string;
  name: string;
  color?: string;
}

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

// ===================== TOGGLE COMPONENT =====================

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-purple-500' : 'bg-white/20'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
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

  // Team assignment
  const [teamAIds, setTeamAIds] = useState<string[]>([]);
  const [teamBIds, setTeamBIds] = useState<string[]>([]);

  // Feature #2: Input mode per player ('local' | 'mobile')
  const [playerInputModes, setPlayerInputModes] = useState<Record<string, 'local' | 'mobile'>>({});
  // Feature #2: Mobile client ID per player
  const [playerMobileClientIds, setPlayerMobileClientIds] = useState<Record<string, string>>({});

  // Feature #2: Connected companion profiles
  const [companionProfiles, setCompanionProfiles] = useState<CompanionProfile[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);

  // Feature #6: Swap mode
  const [swapMode, setSwapMode] = useState(false);
  const [swapSelection, setSwapSelection] = useState<string[]>([]);

  // Filters
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const availableGenres = useMemo(() => getAvailableGenres(allSongs), [allSongs]);
  const availableLanguages = useMemo(() => getAvailableLanguages(allSongs), [allSongs]);

  // ── Feature #2: Fetch companion profiles ──
  useEffect(() => {
    let cancelled = false;
    const fetchCompanions = async () => {
      setCompanionsLoading(true);
      try {
        const res = await fetch('/api/mobile?action=getprofiles');
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.profiles)) {
          setCompanionProfiles(data.profiles);
        }
      } catch {
        // Silently ignore — companion may not be running
      } finally {
        if (!cancelled) setCompanionsLoading(false);
      }
    };
    fetchCompanions();
    return () => { cancelled = true; };
  }, []);

  // ── Derived ──
  const isElimination = playMode === 'elimination';
  const isTeam = playMode === 'team';
  const snippetCount = isElimination
    ? selectedProfileIds.length
    : isTeam
      ? teamSnippetCount(teamSize)
      : settings.snippetCount;

  const maxPlayers = isElimination ? 4 : isTeam ? teamSize * 2 : 4;
  const minPlayers = isElimination ? 2 : isTeam ? 2 : 2;

  // ── Callbacks ──
  const updatePlayMode = (mode: MedleyPlayMode) => {
    setPlayMode(mode);
    setSettings(getDefaultSettings(mode, teamSize));
    setSelectedProfileIds([]);
    setTeamAIds([]);
    setTeamBIds([]);
    setError(null);
    setSwapMode(false);
    setSwapSelection([]);
  };

  const updateTeamSize = (size: TeamSize) => {
    setTeamSize(size);
    setSettings(getDefaultSettings(playMode, size));
    setSelectedProfileIds([]);
    setTeamAIds([]);
    setTeamBIds([]);
    setError(null);
    setSwapMode(false);
    setSwapSelection([]);
  };

  const toggleProfile = (id: string) => {
    setSelectedProfileIds(prev => {
      if (prev.includes(id)) {
        setTeamAIds(ta => ta.filter(x => x !== id));
        setTeamBIds(tb => tb.filter(x => x !== id));
        setPlayerInputModes(m => { const n = { ...m }; delete n[id]; return n; });
        setPlayerMobileClientIds(m => { const n = { ...m }; delete n[id]; return n; });
        return prev.filter(x => x !== id);
      }
      if (prev.length >= maxPlayers) {
        setError(t('medley.errorMaxPlayers').replace('{n}', String(maxPlayers)));
        return prev;
      }
      setError(null);
      return [...prev, id];
    });
    // Auto-assign to teams in team mode
    if (isTeam) {
      setTeamAIds(ta => {
        if (ta.length < teamSize) return [...ta, id];
        setTeamBIds(tb => [...tb, id]);
        return ta;
      });
    }
  };

  const removeProfile = (id: string) => {
    setSelectedProfileIds(prev => prev.filter(x => x !== id));
    setTeamAIds(prev => prev.filter(x => x !== id));
    setTeamBIds(prev => prev.filter(x => x !== id));
    setPlayerInputModes(m => { const n = { ...m }; delete n[id]; return n; });
    setPlayerMobileClientIds(m => { const n = { ...m }; delete n[id]; return n; });
  };

  // Feature #2: Toggle input mode for a player
  const toggleInputMode = (profileId: string) => {
    setPlayerInputModes(prev => ({
      ...prev,
      [profileId]: prev[profileId] === 'mobile' ? 'local' : 'mobile',
    }));
    // Clear mobile client ID when switching to local
    if (playerInputModes[profileId] === 'mobile') {
      setPlayerMobileClientIds(prev => {
        const n = { ...prev };
        delete n[profileId];
        return n;
      });
    }
  };

  // Feature #2: Assign a companion profile to a player
  const assignCompanion = (profileId: string, mobileClientId: string) => {
    setPlayerInputModes(prev => ({ ...prev, [profileId]: 'mobile' }));
    setPlayerMobileClientIds(prev => ({ ...prev, [profileId]: mobileClientId }));
  };

  // Feature #6: Toggle player between teams
  const togglePlayerTeam = (id: string) => {
    if (swapMode) {
      // Swap mode: select first, then second
      setSwapSelection(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id);
        if (prev.length >= 2) return prev;
        return [...prev, id];
      });
      return;
    }

    // Normal: click to toggle between Team A and Team B
    if (teamAIds.includes(id)) {
      if (teamBIds.length >= teamSize) {
        setError(t('medley.teamFull'));
        setTimeout(() => setError(null), 2000);
        return;
      }
      setTeamAIds(prev => prev.filter(x => x !== id));
      setTeamBIds(prev => [...prev, id]);
    } else if (teamBIds.includes(id)) {
      if (teamAIds.length >= teamSize) {
        setError(t('medley.teamFull'));
        setTimeout(() => setError(null), 2000);
        return;
      }
      setTeamBIds(prev => prev.filter(x => x !== id));
      setTeamAIds(prev => [...prev, id]);
    }
  };

  // Feature #6: Shuffle teams
  const shuffleTeams = useCallback(() => {
    const allIds = [...teamAIds, ...teamBIds];
    // Fisher-Yates shuffle
    for (let i = allIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }
    setTeamAIds(allIds.slice(0, teamSize));
    setTeamBIds(allIds.slice(teamSize, teamSize * 2));
    setSwapMode(false);
    setSwapSelection([]);
  }, [teamAIds, teamBIds, teamSize]);

  // Feature #6: Execute swap
  useEffect(() => {
    if (swapSelection.length === 2) {
      const [id1, id2] = swapSelection;
      const id1InA = teamAIds.includes(id1);
      const id2InA = teamAIds.includes(id2);
      // If both in same team, swap them between teams
      if (id1InA === id2InA) {
        if (id1InA) {
          setTeamAIds(prev => prev.filter(x => x !== id1));
          setTeamBIds(prev => [...prev, id1]);
          setTeamBIds(prev => prev.filter(x => x !== id2));
          setTeamAIds(prev => [...prev, id2]);
        } else {
          setTeamBIds(prev => prev.filter(x => x !== id1));
          setTeamAIds(prev => [...prev, id1]);
          setTeamAIds(prev => prev.filter(x => x !== id2));
          setTeamBIds(prev => [...prev, id2]);
        }
      } else {
        if (id1InA) {
          setTeamAIds(prev => prev.filter(x => x !== id1));
          setTeamBIds(prev => prev.filter(x => x !== id2));
          setTeamBIds(prev => [...prev, id1]);
          setTeamAIds(prev => [...prev, id2]);
        } else {
          setTeamBIds(prev => prev.filter(x => x !== id1));
          setTeamAIds(prev => prev.filter(x => x !== id2));
          setTeamAIds(prev => [...prev, id1]);
          setTeamBIds(prev => [...prev, id2]);
        }
      }
      setSwapSelection([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapSelection.length]);

  // ── Start Game ──
  const handleStart = useCallback(() => {
    if (selectedProfileIds.length < minPlayers) {
      setError(t('medley.errorMinPlayers'));
      return;
    }
    if (isTeam) {
      if (teamAIds.length !== teamSize || teamBIds.length !== teamSize) {
        setError(t('medley.errorMinPlayers'));
        return;
      }
    }

    // Build players
    const players: MedleyPlayer[] = selectedProfileIds.map((id, i) => {
      const profile = profiles.find(p => p.id === id);
      const team = isTeam ? (teamBIds.includes(id) ? 1 : 0) : 0;
      const inputType = playerInputModes[id] || 'local';
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || `hsl(${(i * 90) % 360}, 70%, 60%)`,
        team,
        inputType,
        micId: inputType === 'local' ? undefined : undefined,
        micName: inputType === 'local' ? `Mic ${i + 1}` : undefined,
        mobileClientId: inputType === 'mobile' ? playerMobileClientIds[id] : undefined,
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        snippetsSung: 0,
        isEliminated: false,
      };
    });

    // Compute snippet count
    const finalSnippetCount = isElimination
      ? eliminationSnippetCount(selectedProfileIds.length)
      : isTeam
        ? teamSnippetCount(teamSize)
        : settings.snippetCount;

    // Generate songs
    const finalSettings: MedleySettings = {
      ...settings,
      playMode,
      teamSize,
      snippetCount: finalSnippetCount,
      difficulty: globalDifficulty,
      genre: filterGenre !== 'all' ? filterGenre : undefined,
      language: filterLanguage !== 'all' ? filterLanguage : undefined,
      dynamicDifficulty: settings.dynamicDifficulty,
      modifiersEnabled: settings.modifiersEnabled,
      mysteryMode: settings.mysteryMode,
      teamBonusesEnabled: settings.teamBonusesEnabled,
    };

    const songs = generateMedleySnippets(
      allSongs, finalSnippetCount, settings.snippetDuration,
      finalSettings.genre, finalSettings.language,
    );

    if (songs.length === 0) {
      setError(t('medley.errorNoSongs'));
      return;
    }

    // Generate matchups for team mode
    const teamAPlayers = players.filter(p => p.team === 0);
    const teamBPlayers = players.filter(p => p.team === 1);
    const matchups = isTeam
      ? generateTeamMatchups(teamAPlayers, teamBPlayers)
      : [];

    onStartGame(players, songs, finalSettings, matchups);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMode, teamSize, selectedProfileIds, teamAIds, teamBIds, profiles, globalDifficulty, filterGenre, filterLanguage, allSongs, snippetCount, onStartGame, playerInputModes, playerMobileClientIds, settings]);

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
            {isElimination ? (
              <>
                <li>{t('medley.howItWorks1')}</li>
                <li>{t('medley.eliminationDesc')}</li>
                <li>{t('medley.finalTwo')}</li>
                <li>{t('medley.howItWorks4')}</li>
              </>
            ) : (
              <>
                <li>{t('medley.howItWorks1')}</li>
                <li>{t('medley.howItWorks2')}</li>
                <li>{t('medley.howItWorks3')}</li>
                <li>{t('medley.howItWorks4')}</li>
              </>
            )}
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
            <Button
              variant={playMode === 'elimination' ? 'default' : 'outline'}
              onClick={() => updatePlayMode('elimination')}
              className={playMode === 'elimination'
                ? 'bg-red-500 hover:bg-red-600 w-full'
                : 'border-white/20 text-white w-full'}
            >
              <div className="text-center w-full">
                <div className="text-lg">{t('medley.elimination')}</div>
                <div className="text-xs opacity-70">{t('medley.eliminationDesc')}</div>
              </div>
            </Button>
          </div>

          {/* Team size (only in team mode) */}
          {isTeam && (
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
                  {size === 1 ? t('medley.match1v1') : t('medley.match2v2')} ({teamSnippetCount(size)} {t('medley.snippets')})
                </Button>
              ))}
            </div>
          )}

          {/* Elimination info */}
          {isElimination && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              💀 {t('medley.eliminationDesc')} {selectedProfileIds.length > 0 && `(${selectedProfileIds.length} ${t('medley.snippets')})`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Song Filters & Settings */}
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
                <span>{t('medley.nSnippets').replace('{n}', '3')}</span><span>{t('medley.nSnippets').replace('{n}', '10')}</span>
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
                  {t('medley.' + diff as 'medley.easy' | 'medley.medium' | 'medley.hard')}
                </Button>
              ))}
            </div>
          </div>

          {/* Feature #9: Dynamic Difficulty */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm font-medium">{t('medley.dynamicDifficulty')}</div>
              <div className="text-xs text-white/40">{t('medley.dynamicDifficultyDesc')}</div>
            </div>
            <ToggleSwitch
              checked={settings.dynamicDifficulty}
              onChange={() => setSettings(prev => ({ ...prev, dynamicDifficulty: !prev.dynamicDifficulty }))}
            />
          </div>

          {/* Feature #15: Voice Effects */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm font-medium">{t('medley.voiceEffects')}</div>
              <div className="text-xs text-white/40">{t('medley.voiceEffectsDesc')}</div>
            </div>
            <ToggleSwitch
              checked={settings.modifiersEnabled}
              onChange={() => setSettings(prev => ({ ...prev, modifiersEnabled: !prev.modifiersEnabled }))}
            />
          </div>

          {/* Feature #16: Mystery Mode */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-sm font-medium">🎰 {t('medley.mysteryMode')}</div>
              <div className="text-xs text-white/40">{t('medley.mysteryModeDesc')}</div>
            </div>
            <ToggleSwitch
              checked={settings.mysteryMode}
              onChange={() => setSettings(prev => ({ ...prev, mysteryMode: !prev.mysteryMode }))}
            />
          </div>

          {/* Feature #18: Team Bonuses (only in team mode) */}
          {isTeam && (
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <div className="text-sm font-medium">{t('medley.teamBonuses')}</div>
                <div className="text-xs text-white/40">{t('medley.teamBonusesDesc')}</div>
              </div>
              <ToggleSwitch
                checked={settings.teamBonusesEnabled}
                onChange={() => setSettings(prev => ({ ...prev, teamBonusesEnabled: !prev.teamBonusesEnabled }))}
              />
            </div>
          )}
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

          {/* Feature #2: Companion status */}
          {!companionsLoading && companionProfiles.length === 0 && (
            <p className="text-white/30 text-xs mb-3">{t('medley.noCompanions')}</p>
          )}
          {companionProfiles.length > 0 && (
            <p className="text-emerald-400/70 text-xs mb-3">
              {t('medley.companionConnected').replace('{n}', String(companionProfiles.length))}
            </p>
          )}

          {/* Team mode: two columns with flexible management */}
          {isTeam ? (
            <div>
              {/* Feature #6: Shuffle + Swap buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={shuffleTeams}
                  className="border-white/20 text-white text-xs"
                  disabled={selectedProfileIds.length < teamSize * 2}
                >
                  {t('medley.shuffleTeams')}
                </Button>
                <Button
                  size="sm"
                  variant={swapMode ? 'default' : 'outline'}
                  onClick={() => { setSwapMode(!swapMode); setSwapSelection([]); }}
                  className={`${swapMode ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20 text-white'} text-xs`}
                >
                  {t('medley.swapMode')}
                </Button>
                {swapMode && (
                  <span className="text-xs text-amber-400 self-center ml-2">{t('medley.swapHint')}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Team A */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-blue-500/30 text-blue-300">{t('medley.teamA')} ({teamAIds.length}/{teamSize})</Badge>
                    <span className="text-white/30 text-xs">{t('medley.tapToSwitch')}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {teamAIds.map(id => {
                      const profile = profiles.find(p => p.id === id);
                      if (!profile) return null;
                      const inputMode = playerInputModes[id] || 'local';
                      const isSwapSelected = swapSelection.includes(id);
                      return (
                        <div key={id}
                          onClick={() => togglePlayerTeam(id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 bg-blue-500/20 border-2 ${isSwapSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-blue-500'}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: profile.color }}>
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate text-sm">{profile.name}</span>
                            {inputMode === 'mobile' && <span className="ml-2 text-xs">📱</span>}
                          </div>
                          <InputModeToggle
                            profileId={id}
                            currentMode={inputMode}
                            companionProfiles={companionProfiles}
                            currentMobileClientId={playerMobileClientIds[id]}
                            onToggle={() => toggleInputMode(id)}
                            onAssignCompanion={(clientId) => assignCompanion(id, clientId)}
                          />
                        </div>
                      );
                    })}
                    {Array.from({ length: teamSize - teamAIds.length }).map((_, i) => (
                      <div key={`empty-a-${i}`} className="p-3 rounded-lg border-2 border-dashed border-blue-500/20 flex items-center justify-center text-blue-500/30 text-sm">
                        —
                      </div>
                    ))}
                  </div>
                </div>
                {/* Team B */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-red-500/30 text-red-300">{t('medley.teamB')} ({teamBIds.length}/{teamSize})</Badge>
                    <span className="text-white/30 text-xs">{t('medley.tapToSwitch')}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {teamBIds.map(id => {
                      const profile = profiles.find(p => p.id === id);
                      if (!profile) return null;
                      const inputMode = playerInputModes[id] || 'local';
                      const isSwapSelected = swapSelection.includes(id);
                      return (
                        <div key={id}
                          onClick={() => togglePlayerTeam(id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 bg-red-500/20 border-2 ${isSwapSelected ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-red-500'}`}>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: profile.color }}>
                            {profile.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium truncate text-sm">{profile.name}</span>
                            {inputMode === 'mobile' && <span className="ml-2 text-xs">📱</span>}
                          </div>
                          <InputModeToggle
                            profileId={id}
                            currentMode={inputMode}
                            companionProfiles={companionProfiles}
                            currentMobileClientId={playerMobileClientIds[id]}
                            onToggle={() => toggleInputMode(id)}
                            onAssignCompanion={(clientId) => assignCompanion(id, clientId)}
                          />
                        </div>
                      );
                    })}
                    {Array.from({ length: teamSize - teamBIds.length }).map((_, i) => (
                      <div key={`empty-b-${i}`} className="p-3 rounded-lg border-2 border-dashed border-red-500/20 flex items-center justify-center text-red-500/30 text-sm">
                        —
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unselected players available for adding */}
              <div className="mt-4">
                <p className="text-xs text-white/30 mb-2">{t('medley.availablePlayers')}</p>
                <div className="flex flex-wrap gap-2">
                  {activeProfiles
                    .filter(p => !selectedProfileIds.includes(p.id))
                    .map(profile => (
                      <div key={profile.id}
                        onClick={() => toggleProfile(profile.id)}
                        className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs cursor-pointer hover:bg-white/10 transition-colors">
                        {profile.name}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          ) : (
            /* FFA / Elimination: single grid */
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = selectedProfileIds.includes(profile.id);
                const inputMode = playerInputModes[profile.id] || 'local';
                return (
                  <div key={profile.id}
                    onClick={() => isSelected ? removeProfile(profile.id) : toggleProfile(profile.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                      ? isElimination
                        ? 'bg-gradient-to-br from-red-500/30 to-orange-500/30 border-2 border-red-500'
                        : 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500'
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
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{profile.name}</span>
                        {/* Feature #2: Companion badge */}
                        {isSelected && inputMode === 'mobile' && (
                          <span className="text-xs text-emerald-400">📱 {t('medley.companionMode')}</span>
                        )}
                        {isSelected && inputMode === 'local' && (
                          <span className="text-xs text-white/40">🎤 {t('medley.localMic')}</span>
                        )}
                      </div>
                      {isSelected && <span className={isElimination ? 'text-red-400' : 'text-purple-400'}>✓</span>}
                    </div>
                    {/* Feature #2: Input mode toggle for selected FFA/Elimination players */}
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                        <InputModeToggle
                          profileId={profile.id}
                          currentMode={inputMode}
                          companionProfiles={companionProfiles}
                          currentMobileClientId={playerMobileClientIds[profile.id]}
                          onToggle={() => toggleInputMode(profile.id)}
                          onAssignCompanion={(clientId) => assignCompanion(profile.id, clientId)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className={`mb-6 border ${isElimination ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30' : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30'}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{t('medley.overview')}</h3>
              <p className="text-sm text-white/60">
                {isElimination
                  ? t('medley.elimination')
                  : isTeam
                    ? `${teamSize} ${t('medley.vs')} ${teamSize}`
                    : t('medley.ffaBadge')}
                {' '}· {snippetCount} {t('medley.snippets')} · {settings.snippetDuration}s {t('medley.proSnippet')}
                {settings.dynamicDifficulty && ` · 📈 ${t('medley.dynamicDifficulty')}`}
                {settings.modifiersEnabled && ' · 🎛️'}
                {settings.mysteryMode && ' · 🎰'}
                {settings.teamBonusesEnabled && ' · ⚡'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">
                {Math.ceil(snippetCount * settings.snippetDuration / 60)} {t('medley.min')}
              </div>
              <div className="text-xs text-white/40">{t('medley.approxTotalDuration')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStart}
        disabled={selectedProfileIds.length < minPlayers}
        className={`w-full py-6 text-xl ${isElimination
          ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400'
          : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400'}`}
      >
        {isElimination
          ? `${t('medley.elimination')} (${selectedProfileIds.length} ${t('medley.players').split(' ')[0].replace('(', '')})`
          : t('medley.startMedley').replace('{n}', String(selectedProfileIds.length))
        }
      </Button>
    </div>
  );
}

// ===================== INPUT MODE TOGGLE (Feature #2) =====================

function InputModeToggle({
  profileId,
  currentMode,
  companionProfiles,
  currentMobileClientId,
  onToggle,
  onAssignCompanion,
}: {
  profileId: string;
  currentMode: 'local' | 'mobile';
  companionProfiles: CompanionProfile[];
  currentMobileClientId?: string;
  onToggle: () => void;
  onAssignCompanion: (clientId: string) => void;
}) {
  const { t } = useTranslation();
  const [showCompanionPicker, setShowCompanionPicker] = useState(false);

  if (companionProfiles.length === 0) {
    // No companions available — just show current mode
    return (
      <span className={`text-xs px-2 py-0.5 rounded ${currentMode === 'local' ? 'bg-white/10 text-white/50' : 'bg-emerald-500/20 text-emerald-400'}`}>
        {currentMode === 'local' ? '🎤' : '📱'}
      </span>
    );
  }

  if (currentMode === 'mobile' && currentMobileClientId) {
    const cp = companionProfiles.find(c => c.id === currentMobileClientId);
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
          📱 {cp?.name || 'Companion'}
        </span>
        <button
          onClick={() => { onToggle(); setShowCompanionPicker(false); }}
          className="text-white/30 hover:text-white/60 text-xs"
        >✕</button>
      </div>
    );
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { setShowCompanionPicker(!showCompanionPicker); }}
        className={`text-xs px-2 py-0.5 rounded transition-colors ${currentMode === 'local' ? 'bg-white/10 text-white/50 hover:bg-white/20' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
      >
        {t('medley.inputMode')}: {currentMode === 'local' ? t('medley.localMic').split(' ')[0] : t('medley.companionMode').split(' ')[0]}
      </button>
      {showCompanionPicker && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-white/20 rounded-lg shadow-lg z-50 min-w-[160px]">
          <button
            onClick={() => { onToggle(); setShowCompanionPicker(false); }}
            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-t-lg"
          >
            🎤 {t('medley.localMic')}
          </button>
          {companionProfiles.map(cp => (
            <button
              key={cp.id}
              onClick={() => {
                if (currentMode !== 'mobile') onToggle();
                onAssignCompanion(cp.id);
                setShowCompanionPicker(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-white/10 rounded-b-lg last:rounded-b-lg"
            >
              📱 {cp.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
