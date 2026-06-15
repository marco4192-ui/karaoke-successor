'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  createTournament, 
  getPlayableMatches, 
  getTournamentStats,
  getPlayerPlacements,
  addToHallOfFame,
  getHallOfFame,
  clearHallOfFame,
  getEffectiveDifficulty,
  getFanFavorites,
  getMatchesByBracketType,
  getLBRoundName,
  type TournamentBracket,
  type TournamentPlayer,
  type TournamentMatch,
  type TournamentSettings,
} from '@/lib/game/tournament';
import { PlayerProfile, PLAYER_COLORS } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { TournamentBracketButterfly } from '@/components/game/tournament-bracket-butterfly';
import { MatchAbortDialog } from '@/components/game/match-abort-dialog';

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
            <Button variant="ghost" onClick={clearHallOfFame} className="text-red-400/60 hover:text-red-400 mx-auto block mt-4">
              {t('tournament.clearHallOfFame')}
            </Button>
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

// Tournament Bracket View Component
interface TournamentBracketViewProps {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (_match: TournamentMatch) => void;
  onManualWinner?: (_matchId: string, _winnerId: string) => void;
  onRepeatMatch?: () => void;
  matchAborted?: boolean;
  onAbortHandled?: () => void;
  shortMode: boolean;
  showResults?: boolean;
  onShowResults?: () => void;
}

export function TournamentBracketView({ bracket, currentMatch, onPlayMatch, onManualWinner, onRepeatMatch, matchAborted, onAbortHandled, shortMode, showResults, onShowResults }: TournamentBracketViewProps) {
  const { t } = useTranslation();
  const stats = getTournamentStats(bracket);
  const tournamentCrowdVotes = usePartyStore(s => s.tournamentCrowdVotes);

  // Get next match to play
  const playableMatches = getPlayableMatches(bracket);
  const nextMatch = playableMatches[0] || null;

  // #6 Dynamic difficulty indicator
  const effectiveDiff = getEffectiveDifficulty(
    bracket.settings.difficulty,
    bracket.currentRound,
    bracket.totalRounds,
    bracket.settings.dynamicDifficulty,
  );
  const showDiffBadge = bracket.settings.dynamicDifficulty && effectiveDiff !== bracket.settings.difficulty;

  // #9 Seeding mode indicator
  const isSeededByStrength = bracket.settings.seedingMode === 'strength';

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, tournamentCrowdVotes);
  }, [bracket, tournamentCrowdVotes]);

  // Auto-scale bracket to fit available viewport height
  const bracketWrapperRef = useRef<HTMLDivElement>(null);
  const bracketInnerRef = useRef<HTMLDivElement>(null);
  const [bracketScale, setBracketScale] = useState(1);

  // Manual winner dialog state (for picking a winner without playing)
  const [manualWinnerMatch, setManualWinnerMatch] = useState<TournamentMatch | null>(null);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = bracketWrapperRef.current;
      const inner = bracketInnerRef.current;
      if (!wrapper || !inner) return;
      const available = wrapper.clientHeight;
      const needed = inner.scrollHeight;
      if (needed > 0 && available > 0) {
        setBracketScale(Math.min(1, available / needed));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (bracketWrapperRef.current) ro.observe(bracketWrapperRef.current);
    return () => ro.disconnect();
  }, [bracket, showResults]);

  // #7 Auto-add to Hall of Fame when tournament completes
  const hofRecordedRef = useRef(false);
  useEffect(() => {
    if (bracket.status === 'completed' && bracket.champion && !hofRecordedRef.current) {
      hofRecordedRef.current = true;
      const placements = getPlayerPlacements(bracket);
      addToHallOfFame(bracket, placements);
    }
  }, [bracket.status, bracket.champion]);

  return (
    <div className="max-w-full mx-auto px-4 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
      {/* Tournament Header — compact */}
      <div className="text-center mb-1 shrink-0">
        <h1 className="text-2xl font-bold mb-0.5">{t('tournament.bracketTitle')}</h1>
        <div className="flex items-center justify-center gap-3 text-white/60 text-sm">
          <span>{t('tournament.roundOfOf').replace('{n}', String(stats.currentRound)).replace('{m}', String(stats.totalRounds))}</span>
          <span>·</span>
          <span>{t('tournament.playersRemaining').replace('{n}', String(stats.remainingPlayers))}</span>
          {shortMode && <Badge className="bg-green-500/20 text-green-400 text-xs">60s</Badge>}
          {bracket.settings.tournamentType === 'double' && <Badge className="bg-purple-500/20 text-purple-400 text-xs">{t('tournament.doubleEliminationShort')}</Badge>}
          {bracket.grandFinalsResetNeeded && <Badge className="bg-red-500/20 text-red-400 text-xs">{t('tournament.grandFinalsReset')}</Badge>}
          {showDiffBadge && <Badge className="bg-orange-500/20 text-orange-400 text-xs">{t('tournament.' + effectiveDiff)}</Badge>}
          {bracket.settings.songSelectionMode === 'vote' && <Badge className="bg-pink-500/20 text-pink-400 text-xs">{t('tournament.songVote')}</Badge>}
          {isSeededByStrength && <Badge className="bg-indigo-500/20 text-indigo-400 text-xs">{t('tournament.seeded')}</Badge>}
          {fanFavorites.length > 0 && <Badge className="bg-rose-500/20 text-rose-400 text-xs">{t('tournament.crowdVoting')}</Badge>}
        </div>
      </div>

      {/* Champion Display — compact */}
      {bracket.champion && (
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-4 mb-2 text-center shrink-0">
          <div className="text-4xl mb-1">👑</div>
          <h2 className="text-xl font-bold text-amber-400 mb-1">{t('tournament.champion')}</h2>
          <div className="flex items-center justify-center gap-3">
            {bracket.champion.avatar ? (
              <img src={bracket.champion.avatar} alt={bracket.champion.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: bracket.champion.color }
              }>
                {bracket.champion.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-2xl font-bold">{bracket.champion.name}</span>
          </div>
          {onShowResults && (
            <Button
              onClick={onShowResults}
              className="mt-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm"
            >
              {t('tournament.viewResults')}
            </Button>
          )}
        </div>
      )}

      {/* Next Match Preview — compact */}
      {nextMatch && !bracket.champion && (
        <div className="mb-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 rounded-xl p-2.5 shrink-0">
          <h3 className="text-sm font-bold mb-1.5 text-center flex items-center justify-center gap-2">
            <span className="animate-pulse">🎤</span>
            <span>{t('tournament.nextDuel')} {nextMatch.player1?.name || t('tournament.tbd')} {t('tournament.vs')} {nextMatch.player2?.name || t('tournament.tbd')}</span>
          </h3>
          <div className="flex items-center justify-center gap-5 mb-1.5">
            <PlayerDisplay player={nextMatch.player1} />
            <span className="text-lg font-bold text-white/40">⚔️</span>
            <PlayerDisplay player={nextMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(nextMatch)}
            className="w-full py-2.5 text-sm bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
          >
            {t('tournament.startNextMatch')}
          </Button>
          {onManualWinner && nextMatch.player1 && nextMatch.player2 && (
            <Button
              onClick={() => setManualWinnerMatch(nextMatch)}
              variant="ghost"
              className="w-full py-1 text-xs text-white/40 hover:text-white/60 hover:bg-white/5"
            >
              {t('matchAbort.setWinner')}
            </Button>
          )}
        </div>
      )}

      {/* Bracket — fills remaining space, auto-scaled and aligned to top */}
      <div ref={bracketWrapperRef} className="flex-1 min-h-0 overflow-hidden flex items-start justify-center pt-1">
        <div
          ref={bracketInnerRef}
          style={{ transform: `scale(${bracketScale})`, transformOrigin: 'top center' }}
        >
          {bracket.settings.tournamentType === 'double' ? (
            <DoubleEliminationBracketView
              bracket={bracket}
              currentMatch={currentMatch}
              onPlayMatch={onPlayMatch}
              playableMatches={playableMatches}
              t={t}
            />
          ) : (
            <TournamentBracketButterfly
              bracket={bracket}
              currentMatch={currentMatch}
              onPlayMatch={onPlayMatch}
            />
          )}
        </div>
      </div>

      {/* Fan Favorites — crowd vote results */}
      {fanFavorites.length > 0 && (
        <div className="mt-1 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-lg p-1.5 shrink-0">
          <h4 className="text-xs text-white/60 mb-1">{t('tournament.fanFavorites')}</h4>
          <div className="flex flex-wrap gap-1">
            {fanFavorites.slice(0, 5).map((fav, i) => (
              <div key={fav.playerId} className="bg-white/5 rounded px-2 py-0.5 text-xs border border-rose-500/20">
                <span className={i === 0 ? 'text-amber-400' : 'text-white/60'}>
                  {i === 0 ? '❤️' : `${i + 1}.`}
                </span>{' '}
                <span className={i === 0 ? 'text-amber-300 font-medium' : 'text-white/80'}>{fav.playerName}</span>
                <span className="text-rose-400/60 ml-1">{fav.totalVotes}{t('tournament.votes')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Winner Dialog — shown when user clicks "Set Winner Manually" from the bracket */}
      {manualWinnerMatch && onManualWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">{t('matchAbort.selectWinner')}</h2>
              <p className="text-sm text-white/50 mt-1">
                {manualWinnerMatch.player1?.name} vs {manualWinnerMatch.player2?.name}
              </p>
            </div>
            <div className="space-y-3">
              {[manualWinnerMatch.player1, manualWinnerMatch.player2].map((player) => {
                if (!player) return null;
                return (
                  <Button
                    key={player.id}
                    onClick={() => {
                      onManualWinner(manualWinnerMatch.id, player.id);
                      setManualWinnerMatch(null);
                    }}
                    className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                  >
                    <span className="flex items-center gap-3 w-full">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{player.name}</span>
                      <span className="ml-auto text-amber-400">{t('matchAbort.asWinner')}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => setManualWinnerMatch(null)}
              variant="ghost"
              className="w-full mt-3 py-2 text-sm text-white/40 hover:text-white/60"
            >
              {t('matchAbort.back')}
            </Button>
          </div>
        </div>
      )}

      {/* Match Abort Dialog */}
      {matchAborted && currentMatch && onManualWinner && onRepeatMatch && onAbortHandled && (
        <MatchAbortDialog
          match={currentMatch}
          onManualWinner={(matchId, winnerId) => {
            onManualWinner(matchId, winnerId);
            onAbortHandled();
          }}
          onRepeatMatch={() => {
            onRepeatMatch();
            onAbortHandled();
          }}
          onDismiss={() => {
            onAbortHandled();
          }}
        />
      )}
    </div>
  );
}

// #7 Tournament Results Screen
interface TournamentResultsProps {
  bracket: TournamentBracket;
  onBack: () => void;
  onNewTournament: () => void;
}

export function TournamentResultsScreen({ bracket, onBack, onNewTournament }: TournamentResultsProps) {
  const { t } = useTranslation();
  const placements = useMemo(() => getPlayerPlacements(bracket), [bracket]);
  const tournamentCrowdVotes = usePartyStore(s => s.tournamentCrowdVotes);

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, tournamentCrowdVotes);
  }, [bracket, tournamentCrowdVotes]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold text-amber-400">{t('tournament.resultsTitle')}</h1>
        <p className="text-white/60">{t('tournament.resultsSubtitle')}</p>
      </div>

      {/* Podium — Top 3 */}
      {placements.length >= 2 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {/* 2nd place */}
          {placements[1] && (
            <div className="text-center flex-1 max-w-[140px]">
              <div className="text-3xl mb-1">🥈</div>
              <PlayerResultCard placement={placements[1]} t={t} />
            </div>
          )}
          {/* 1st place */}
          {placements[0] && (
            <div className="text-center flex-1 max-w-[160px]">
              <div className="text-4xl mb-1">🥇</div>
              <PlayerResultCard placement={placements[0]} t={t} highlight />
            </div>
          )}
          {/* 3rd place */}
          {placements[2] && (
            <div className="text-center flex-1 max-w-[140px]">
              <div className="text-3xl mb-1">🥉</div>
              <PlayerResultCard placement={placements[2]} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Full standings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('tournament.fullStandings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {placements.map(p => (
              <div key={p.player.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.placement === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                <div className="w-8 text-center font-bold text-white/60">#{p.placement}</div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: p.player.color }}>
                  {p.player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{p.player.name}</span>
                </div>
                <div className="text-right text-xs text-white/50">
                  <div>{p.totalScore} {t('tournament.points')}</div>
                  <div>{p.totalAccuracy.toFixed(1)}% {t('tournament.accuracy').toLowerCase()}</div>
                  <div>{p.matchesWon}W / {p.matchesLost}L</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Match history highlights */}
      {(() => {
        const completedMatches = bracket.matches.filter(m => m.completed && !m.isBye);
        const tiebreaks = completedMatches.filter(m => m.isTiebreak);
        const highScores = [...completedMatches].sort((a, b) => Math.max(b.score1, b.score2) - Math.max(a.score1, a.score2)).slice(0, 3);
        return (
          (tiebreaks.length > 0 || highScores.length > 0) && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('tournament.highlights')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tiebreaks.length > 0 && (
                  <div className="text-sm">
                    <span className="text-orange-400">⚡ {t('tournament.tiebreakMatches')}: </span>
                    {tiebreaks.map(m => (
                      <span key={m.id} className="text-white/60">
                        {m.player1?.name} vs {m.player2?.name} ({m.winner?.name} {t('tournament.won')})
                      </span>
                    )).reduce((prev, curr, i) => <>{prev}{i > 0 && ', '}{curr}</>, <></>)}
                  </div>
                )}
                {highScores.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm text-white/60">
                    <span>{i === 0 ? '🔥' : i === 1 ? '⚡' : '✨'}</span>
                    <span>{m.player1?.name} {m.score1} - {m.score2} {m.player2?.name}</span>
                    {m.songTitle && <span className="text-white/30">({m.songTitle})</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        );
      })()}

      {/* #10 Fan Favorites — Spectator Crowd Vote Results */}
      {fanFavorites.length > 0 && (
        <Card className="bg-gradient-to-br from-rose-500/5 to-pink-500/5 border-rose-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('tournament.fanFavoriteTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fanFavorites.slice(0, 5).map((fav, i) => (
                <div key={fav.playerId} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                  <div className="w-8 text-center text-lg">{i === 0 ? '❤️' : i === 1 ? '🧡' : i === 2 ? '💛' : `#${i + 1}`}</div>
                  <div className="flex-1">
                    <span className="font-medium">{fav.playerName}</span>
                    <span className="text-xs text-white/40 ml-2">({fav.matchesVoted} {t('tournament.matchesVoted')})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-400">{fav.totalVotes}</span>
                    <span className="text-xs text-white/40 ml-1">{t('tournament.votes')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 border-white/20"
        >
          ← {t('tournament.backToBracket')}
        </Button>
        <Button
          onClick={onNewTournament}
          className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
        >
          {t('tournament.newTournament')}
        </Button>
      </div>
    </div>
  );
}

// Player result card for podium display
function PlayerResultCard({ placement, t, highlight }: { placement: { player: TournamentPlayer; totalScore: number; totalAccuracy: number; matchesWon: number; matchesLost: number }; t: (_key: string) => string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: placement.player.color }}>
          {placement.player.name.charAt(0).toUpperCase()}
        </div>
        <span className={`font-bold ${highlight ? 'text-amber-400' : ''}`}>{placement.player.name}</span>
      </div>
      <div className="text-xs text-white/50 space-y-0.5">
        <div>{placement.totalScore} {t('tournament.points')}</div>
        <div>{placement.totalAccuracy.toFixed(1)}% {t('tournament.accuracy').toLowerCase()}</div>
      </div>
    </div>
  );
}

// Player Display Component
function PlayerDisplay({ player, small = false }: { player: TournamentPlayer | null; small?: boolean }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
        <div className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/10`} />
        <span className="text-white/30">{t('tournament.tbd')}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
      {player.avatar ? (
        <img 
          src={player.avatar} 
          alt={player.name} 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`}
        />
      ) : (
        <div 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate">{player.name}</span>
    </div>
  );
}

// ─── #4 Double Elimination Bracket View ──────────────────────────
// Shows both Winners and Losers brackets side by side with Grand Finals

function DoubleEliminationBracketView({
  bracket,
  currentMatch,
  onPlayMatch,
  playableMatches,
  t,
}: {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (_match: TournamentMatch) => void;
  playableMatches: TournamentMatch[];
  t: (_key: string) => string;
}) {
  const wbMatches = getMatchesByBracketType(bracket, 'winners');
  const lbMatches = getMatchesByBracketType(bracket, 'losers');
  const gfMatches = getMatchesByBracketType(bracket, 'grand_finals');
  const playableIds = new Set(playableMatches.map(m => m.id));

  const wbRounds = bracket.totalRounds;
  const lbTotalRounds = bracket.losersTotalRounds;

  // Group WB matches by round
  const wbByRound: TournamentMatch[][] = [];
  for (let r = 1; r <= wbRounds; r++) {
    wbByRound.push(wbMatches.filter(m => m.round === r));
  }

  // Group LB matches by round
  const lbByRound: TournamentMatch[][] = [];
  for (let r = 1; r <= lbTotalRounds; r++) {
    lbByRound.push(lbMatches.filter(m => m.round === r));
  }

  return (
    <div className="flex gap-8 items-start">
      {/* ─── Winners Bracket ─── */}
      <div>
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold text-cyan-400">{t('tournament.winnersBracket')}</h2>
        </div>
        <div className="flex gap-2">
          {wbByRound.map((roundMatches, ri) => (
            <div key={ri} className="flex flex-col gap-2">
              <div className="text-[10px] text-white/40 text-center mb-1">
                {ri === wbRounds - 1 ? t('tournament.final') : ri === wbRounds - 2 ? t('tournament.semiFinals') : t('tournament.roundOf').replace('{n}', String(ri + 1))}
              </div>
              {roundMatches.map(m => (
                <DEMatchCard
                  key={m.id}
                  match={m}
                  isCurrent={currentMatch?.id === m.id}
                  isPlayable={playableIds.has(m.id)}
                  onPlay={onPlayMatch}
                  isGF={false}
                  t={t}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Losers Bracket ─── */}
      {lbByRound.length > 0 && (
        <div>
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-red-400">{t('tournament.losersBracket')}</h2>
          </div>
          <div className="flex gap-2">
            {lbByRound.map((roundMatches, ri) => (
              <div key={ri} className="flex flex-col gap-2">
                <div className="text-[10px] text-white/40 text-center mb-1">
                  {getLBRoundName(ri + 1, wbRounds, lbTotalRounds, t)}
                </div>
                {roundMatches.map(m => (
                  <DEMatchCard
                    key={m.id}
                    match={m}
                    isCurrent={currentMatch?.id === m.id}
                    isPlayable={playableIds.has(m.id)}
                    onPlay={onPlayMatch}
                    isGF={false}
                    t={t}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Grand Finals ─── */}
      <div>
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold text-amber-400">{t('tournament.grandFinals')}</h2>
        </div>
        <div className="flex flex-col gap-2">
          {/* GF1 */}
          {gfMatches.filter(m => m.id === 'GF1').map(m => (
            <div key={m.id} className="relative">
              <DEMatchCard
                match={m}
                isCurrent={currentMatch?.id === m.id}
                isPlayable={playableIds.has(m.id)}
                onPlay={onPlayMatch}
                isGF
                t={t}
              />
            </div>
          ))}
          {/* GF2 (Reset) — only show if needed */}
          {bracket.grandFinalsResetNeeded && gfMatches.filter(m => m.id === 'GF2').map(m => (
            <div key={m.id}>
              <DEMatchCard
                match={m}
                isCurrent={currentMatch?.id === m.id}
                isPlayable={playableIds.has(m.id)}
                onPlay={onPlayMatch}
                isGF
                isReset
                t={t}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DE Match Card (compact, for DE bracket view) ───────────────

function DESmallPlayer({ player }: { player: TournamentPlayer | null }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className="flex items-center gap-1 text-[11px]">
        <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
        <span className="text-white/30">{t('tournament.tbd')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[11px] min-w-0">
      {player.avatar ? (
        <img
          src={player.avatar}
          alt={player.name}
          className="w-5 h-5 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0"
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate min-w-0">{player.name}</span>
    </div>
  );
}

function DEMatchCard({
  match,
  isCurrent,
  isPlayable,
  onPlay,
  isGF = false,
  isReset = false,
  t,
}: {
  match: TournamentMatch;
  isCurrent: boolean;
  isPlayable: boolean;
  onPlay: (_m: TournamentMatch) => void;
  isGF?: boolean;
  isReset?: boolean;
  t: (_key: string) => string;
}) {
  const clickable = isPlayable && !match.completed;

  const borderColor = isGF
    ? isReset ? 'border-red-500/50' : 'border-amber-500/50'
    : match.bracketType === 'losers'
      ? 'border-red-500/30'
      : 'border-cyan-500/30';

  const glowClass = isCurrent && !match.completed
    ? isGF
      ? 'shadow-lg shadow-amber-500/30'
      : match.bracketType === 'losers'
        ? 'shadow-lg shadow-red-500/20'
        : 'shadow-lg shadow-cyan-500/20'
    : '';

  return (
    <div
      className={`rounded-lg p-1.5 transition-all overflow-hidden border ${borderColor} ${
        match.completed
          ? 'bg-white/10'
          : isPlayable
            ? 'bg-white/5 cursor-pointer hover:bg-white/10'
            : 'bg-white/5 opacity-50'
      } ${clickable ? 'hover:scale-105' : ''} ${glowClass}`}
      onClick={clickable ? () => onPlay(match) : undefined}
      style={{ minWidth: 140 }}
    >
      {/* Player 1 */}
      <div className={`flex items-center gap-1 p-0.5 rounded text-xs ${match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''}`}>
        <DESmallPlayer player={match.player1} />
        {match.completed && (
          <span className={`ml-auto text-xs font-bold ${match.winner?.id === match.player1?.id ? 'text-green-400' : 'text-white/60'}`}>
            {match.score1}
          </span>
        )}
        {!match.completed && match.bracketType === 'losers' && match.player1 && (
          <span className="ml-auto text-[9px] text-red-400/60">{t('tournament.firstLoss')}</span>
        )}
      </div>

      <div className="text-center text-white/30 text-[9px] my-0.5">{t('tournament.vs')}</div>

      {/* Player 2 */}
      <div className={`flex items-center gap-1 p-0.5 rounded text-xs ${match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''}`}>
        <DESmallPlayer player={match.player2} />
        {match.completed && (
          <span className={`ml-auto text-xs font-bold ${match.winner?.id === match.player2?.id ? 'text-green-400' : 'text-white/60'}`}>
            {match.score2}
          </span>
        )}
        {!match.completed && match.bracketType === 'losers' && match.player2 && (
          <span className="ml-auto text-[9px] text-red-400/60">{t('tournament.firstLoss')}</span>
        )}
      </div>

      {match.winner && (
        <div className="text-[9px] text-center text-amber-400 font-medium bg-amber-500/10 rounded py-0.5 mt-0.5">
          {match.winner.name}
        </div>
      )}

      {isPlayable && !match.completed && (
        <div className="text-[9px] text-center text-cyan-400 font-medium mt-0.5">
          {t('tournament.play')}
        </div>
      )}
    </div>
  );
}
