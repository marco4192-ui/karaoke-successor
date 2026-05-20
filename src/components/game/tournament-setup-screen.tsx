'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createTournament,
  getHallOfFame,
  clearHallOfFame,
  type TournamentBracket,
  type TournamentPlayer,
  type TournamentSettings,
} from '@/lib/game/tournament';
import { PlayerProfile, PLAYER_COLORS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';

interface TournamentScreenProps {
  profiles: PlayerProfile[];
  onStartTournament: (_bracket: TournamentBracket, _songDuration: number) => void;
  onBack: () => void;
}

export function TournamentSetupScreen({ profiles, onStartTournament, onBack }: TournamentScreenProps) {
  const { t } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 8 | 16 | 32>(8);
  const [shortMode, setShortMode] = useState(true);
  const [tournamentType, setTournamentType] = useState<'single' | 'double'>('single');
  const [tiebreakMode, setTiebreakMode] = useState<TournamentSettings['tiebreakMode']>('accuracy');
  const [dynamicDifficulty, setDynamicDifficulty] = useState(false);
  const [songSelectionMode, setSongSelectionMode] = useState<'random' | 'vote'>('random');
  const [seedingMode, setSeedingMode] = useState<'random' | 'strength'>('random');
  const [error, setError] = useState<string | null>(null);
  const [showHallOfFame, setShowHallOfFame] = useState(false);

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() =>
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store instead of local state
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= maxPlayers) {
        setError(t('tournament.errorMaxPlayers').replace('{n}', String(maxPlayers)));
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStartTournament = () => {
    if (selectedPlayers.length < 2) {
      setError(t('tournament.errorMinPlayers'));
      return;
    }

    // #9 Calculate player strength for seeding
    const hofEntries = getHallOfFame();
    const playerStrengths: Record<string, number> = {};
    for (const id of selectedPlayers) {
      const profile = profiles.find(p => p.id === id);
      if (!profile) { playerStrengths[id] = 0; continue; }
      // Strength = (HoF championships * 25) + (averageAccuracy * 0.3) + (level * 2) + (totalGames * 0.1)
      const championships = hofEntries.filter(e => e.champion.id === id).length;
      const acc = profile.stats?.averageAccuracy ?? 0;
      const lvl = profile.level ?? 0;
      const games = profile.stats?.totalGamesPlayed ?? 0;
      playerStrengths[id] = (championships * 25) + (acc * 0.3) + (lvl * 2) + (games * 0.1);
    }
    // Sort by strength descending to assign seeds (strength-based seeding)
    const sortedByStrength = seedingMode === 'strength'
      ? [...selectedPlayers].sort((a, b) => (playerStrengths[b] ?? 0) - (playerStrengths[a] ?? 0))
      : selectedPlayers;

    const players: TournamentPlayer[] = sortedByStrength.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        eliminated: false,
        lossCount: 0,
        // #9 For strength seeding, seed is set by the sorting (lower index = stronger = better seed)
        // createTournament uses this seed to place players in bracket
        seed: index + 1,
      };
    });

    const settings: TournamentSettings = {
      maxPlayers,
      songDuration: shortMode ? 60 : 180, // 60s for short mode, 3 min for full
      randomSongs: songSelectionMode === 'random',
      difficulty,
      tournamentType,
      tiebreakMode,
      dynamicDifficulty,
      songSelectionMode,
      seedingMode,
      filterGenre: 'all',
      filterLanguage: 'all',
      // TODO: Add genre/language filter UI to tournament setup screen
    };

    try {
      const bracket = createTournament(players, settings);
      onStartTournament(bracket, settings.songDuration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('tournament.errorCreate');
      setError(msg);
    }
  };

  // Hall of Fame data
  const hallOfFameEntries = useMemo(() => {
    if (!showHallOfFame) return [];
    return getHallOfFame();
  }, [showHallOfFame]);

  if (showHallOfFame) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setShowHallOfFame(false)} className="text-white/60">
            ← {t('tournament.back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('tournament.hallOfFame')}</h1>
            <p className="text-white/60">{t('tournament.hallOfFameDesc')}</p>
          </div>
        </div>
        {hallOfFameEntries.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            <div className="text-5xl mb-4">🏆</div>
            <p>{t('tournament.hallOfFameEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {hallOfFameEntries.map((entry, i) => (
              <Card key={entry.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {entry.champion.avatar ? (
                          <img src={entry.champion.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: entry.champion.color }}>
                            {entry.champion.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold">{entry.champion.name}</div>
                          <div className="text-xs text-white/40">
                            {entry.playerCount} {t('tournament.players').toLowerCase()} · {entry.totalRounds} {t('tournament.rounds').toLowerCase()}
                            {entry.tournamentType === 'double' && ` · ${t('tournament.doubleElimination')}`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-white/50">
                        {t('tournament.runnerUp')}: {entry.runnerUp.name} · Score: {entry.championScore} · Accuracy: {entry.championAccuracy.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/40">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {hallOfFameEntries.length > 0 && (
              <Button variant="ghost" onClick={clearHallOfFame} className="text-red-400/60 hover:text-red-400 mx-auto block mt-4">
                {t('tournament.clearHallOfFame')}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← {t('tournament.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('tournament.title')}</h1>
          <p className="text-white/60">{t('tournament.settings')}</p>
        </div>
        <Button variant="ghost" onClick={() => setShowHallOfFame(true)} className="text-amber-400 hover:text-amber-300">
          🏆 {t('tournament.hallOfFame')}
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Tournament Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>{t('tournament.settings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* #4 Tournament Type */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.tournamentType')}</label>
            <div className="flex gap-2">
              {(['single', 'double'] as const).map(type => (
                <Button
                  key={type}
                  variant={tournamentType === type ? 'default' : 'outline'}
                  onClick={() => setTournamentType(type)}
                  className={tournamentType === type ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
                >
                  {type === 'single' ? t('tournament.singleElimination') : t('tournament.doubleElimination')}
                </Button>
              ))}
            </div>
            {tournamentType === 'double' && (
              <p className="text-xs text-amber-400/70 mt-1">{t('tournament.doubleEliminationDesc')}</p>
            )}
          </div>

          {/* Max Players */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.bracketSize')}</label>
            <div className="flex gap-2 flex-wrap">
              {[2, 4, 8, 16, 32].map(size => (
                <Button
                  key={size}
                  variant={maxPlayers === size ? 'default' : 'outline'}
                  onClick={() => {
                    setMaxPlayers(size as 2 | 4 | 8 | 16 | 32);
                    if (selectedPlayers.length > size) {
                      setSelectedPlayers(prev => prev.slice(0, size));
                    }
                  }}
                  className={maxPlayers === size ? 'bg-amber-500 hover:bg-amber-600' : 'border-white/20'}
                >
                  {size} {size === 2 ? t('tournament.duel') : t('tournament.players')}
                </Button>
              ))}
            </div>
          </div>

          {/* Short Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('tournament.shortMode')}</label>
              <p className="text-sm text-white/60">{t('tournament.shortModeDesc')}</p>
            </div>
            <Button
              variant={shortMode ? 'default' : 'outline'}
              onClick={() => setShortMode(!shortMode)}
              className={shortMode ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
            >
              {shortMode ? t('tournament.short') : t('tournament.fullSong')}
            </Button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.difficulty')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={difficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
                >
                  {diff === 'easy' ? t('tournament.easy') : diff === 'medium' ? t('tournament.medium') : t('tournament.hard')}
                </Button>
              ))}
            </div>
          </div>

          {/* #6 Dynamic Difficulty */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">{t('tournament.dynamicDifficulty')}</label>
              <p className="text-sm text-white/60">{t('tournament.dynamicDifficultyDesc')}</p>
            </div>
            <Button
              variant={dynamicDifficulty ? 'default' : 'outline'}
              onClick={() => setDynamicDifficulty(!dynamicDifficulty)}
              className={dynamicDifficulty ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
            >
              {dynamicDifficulty ? t('tournament.on') : t('tournament.off')}
            </Button>
          </div>

          {/* #3 Tiebreak Mode */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.tiebreakMode')}</label>
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'coinflip' as const, label: t('tournament.tiebreakCoinflip'), desc: t('tournament.tiebreakCoinflipDesc') },
                { key: 'accuracy' as const, label: t('tournament.tiebreakAccuracy'), desc: t('tournament.tiebreakAccuracyDesc') },
                { key: 'combo' as const, label: t('tournament.tiebreakCombo'), desc: t('tournament.tiebreakComboDesc') },
                { key: 'goldenmic' as const, label: t('tournament.tiebreakGoldenmic'), desc: t('tournament.tiebreakGoldenmicDesc') },
              ]).map(tb => (
                <Button
                  key={tb.key}
                  variant={tiebreakMode === tb.key ? 'default' : 'outline'}
                  onClick={() => setTiebreakMode(tb.key)}
                  className={tiebreakMode === tb.key ? 'bg-orange-500 hover:bg-orange-600' : 'border-white/20'}
                  title={tb.desc}
                >
                  {tb.label}
                </Button>
              ))}
            </div>
          </div>

          {/* #8 Song Selection Mode */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.songSelectionMode')}</label>
            <div className="flex gap-2">
              {([
                { key: 'random' as const, label: t('tournament.songRandom') },
                { key: 'vote' as const, label: t('tournament.songVote') },
              ]).map(mode => (
                <Button
                  key={mode.key}
                  variant={songSelectionMode === mode.key ? 'default' : 'outline'}
                  onClick={() => setSongSelectionMode(mode.key)}
                  className={songSelectionMode === mode.key ? 'bg-pink-500 hover:bg-pink-600' : 'border-white/20'}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
            {songSelectionMode === 'vote' && (
              <p className="text-xs text-pink-400/70 mt-1">{t('tournament.songVoteDesc')}</p>
            )}
          </div>

          {/* #9 Seeding Mode */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('tournament.seedingMode')}</label>
            <div className="flex gap-2">
              {([
                { key: 'random' as const, label: t('tournament.seedingRandom') },
                { key: 'strength' as const, label: t('tournament.seedingStrength') },
              ]).map(mode => (
                <Button
                  key={mode.key}
                  variant={seedingMode === mode.key ? 'default' : 'outline'}
                  onClick={() => setSeedingMode(mode.key)}
                  className={seedingMode === mode.key ? 'bg-indigo-500 hover:bg-indigo-600' : 'border-white/20'}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
            {seedingMode === 'strength' && (
              <p className="text-xs text-indigo-400/70 mt-1">{t('tournament.seedingStrengthDesc')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>{t('tournament.selectPlayers').replace('{n}', String(selectedPlayers.length)).replace('{m}', String(maxPlayers))}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border-2 border-amber-500'
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
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-amber-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">
              {t('tournament.noActiveProfiles')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartTournament}
        disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
      >
        {t('tournament.startTournament').replace('{n}', String(selectedPlayers.length))}
      </Button>
    </div>
  );
}
