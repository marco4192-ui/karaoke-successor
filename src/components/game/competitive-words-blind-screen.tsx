/**
 * Competitive Words & Blind — Setup and Game View
 *
 * This component handles the competitive multiplayer mode for
 * Missing Words and Blind Karaoke. It manages:
 * - Setup screen (player selection, settings)
 * - Round pairing display
 * - Game play (delegates to standard GameScreen with duel mode)
 * - Round results / rankings
 * - Final winner
 */

'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { PlayerProfile, Song, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import {
  CompetitiveGame,
  CompetitiveModeType,
  CompetitiveSettings,
  createCompetitiveGame,
  startCompetitiveRound,
  getRankedPlayers,
  getCurrentRound,
} from '@/lib/game/competitive-words-blind';

// ===================== SETUP SCREEN =====================

interface CompetitiveSetupScreenProps {
  profiles: PlayerProfile[];
  songs: Song[];
  modeType: CompetitiveModeType;
  onStartGame: (_game: CompetitiveGame) => void;
  onBack: () => void;
}

export function CompetitiveSetupScreen({ profiles, songs, modeType, onStartGame, onBack }: CompetitiveSetupScreenProps) {
  const { t } = useTranslation();
  const activeProfiles = useMemo(() => profiles.filter(p => p.isActive !== false), [profiles]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [bestOf, setBestOf] = useState<1 | 3 | 5 | 7>(3);
  const [frequency, setFrequency] = useState<string>('normal');
  const [hardcore, setHardcore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read default difficulty from global store (set in Settings)
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const [difficulty, setDifficulty] = useState<Difficulty>(globalDifficulty || 'medium');

  // Sync difficulty when global store changes (e.g. changed in Settings)
  useEffect(() => {
    if (globalDifficulty) {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
      setDifficulty(globalDifficulty);
    }
  }, [globalDifficulty]);

  // Update difficulty locally AND globally so the game screen picks it up
  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    setGlobalDifficulty(d);
  };

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 4) {
        setError(t('competitiveWords.errorMaxPlayers'));
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStart = () => {
    if (selectedPlayers.length < 2) {
      setError(t('competitiveWords.errorMinPlayers'));
      return;
    }
    if (songs.length === 0) {
      setError(t('competitiveWords.errorNoSongs'));
      return;
    }

    // Ensure global difficulty is set so game screen picks it up
    setGlobalDifficulty(difficulty);

    const settings: CompetitiveSettings = {
      difficulty,
      modeType,
      bestOf,
      missingWordFrequency: modeType === 'missing-words'
        ? frequency === 'light' ? 0.15 : frequency === 'hard' ? 0.60 : frequency === 'insane' ? 0.90 : 0.30
        : 0.30,
      blindFrequency: modeType === 'blind'
        ? frequency === 'light' ? 0.15 : frequency === 'hard' ? 0.60 : frequency === 'insane' ? 0.90 : 0.30
        : 0.30,
      hardcore: modeType === 'blind' ? hardcore : false,
    };

    const playerObjs = selectedPlayers.map(id => profiles.find(p => p.id === id));
    const game = createCompetitiveGame(
      selectedPlayers,
      playerObjs.map(p => p?.name || 'Unknown'),
      playerObjs.map(p => p?.avatar),
      settings
    );

    onStartGame(game);
  };

  const modeTitle = modeType === 'missing-words' ? t('competitiveWords.missingWords') : t('competitiveWords.blindKaraoke');
  const modeIcon = modeType === 'missing-words' ? '📝' : '🙈';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <button
          onClick={onBack}
          className="mb-6 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          ← {t('competitiveWords.back')}
        </button>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">{modeIcon} {modeTitle} {t('competitiveWords.competitive')}</h1>
        <p className="text-gray-400 mb-8">
          {t('competitiveWords.competitiveDesc')}
        </p>

        {/* Difficulty */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('competitiveWords.difficulty')}</h3>
          <div className="flex gap-3">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {d === 'easy' ? t('competitiveWords.easy') : d === 'medium' ? t('competitiveWords.normal') : t('competitiveWords.hard')}
              </button>
            ))}
          </div>
        </div>

        {/* Best-of */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('competitiveWords.roundsPerPlayer')}</h3>
          <div className="flex gap-3">
            {([1, 3, 5, 7] as const).map(bo => (
              <button
                key={bo}
                onClick={() => setBestOf(bo)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  bestOf === bo
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {bo === 1 ? t('competitiveWords.round1') : t('competitiveWords.bestOf').replace('{n}', String(bo))}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency setting */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            {modeType === 'missing-words' ? t('competitiveWords.wordFrequency') : t('competitiveWords.blindFrequency')}
          </h3>
          <div className="flex gap-3">
            {(modeType === 'missing-words'
              ? [
                  { value: 'light', label: t('competitiveWords.light') + ' (15%)' },
                  { value: 'normal', label: t('competitiveWords.normal') + ' (30%)' },
                  { value: 'hard', label: t('competitiveWords.hard') + ' (60%)' },
                  { value: 'insane', label: t('competitiveWords.insane') + ' (90%)' },
                ]
              : [
                  { value: 'light', label: t('competitiveWords.light') + ' (15%)' },
                  { value: 'normal', label: t('competitiveWords.normal') + ' (30%)' },
                  { value: 'hard', label: t('competitiveWords.hard') + ' (60%)' },
                  { value: 'insane', label: t('competitiveWords.insane') + ' (90%)' },
                ]
            ).map(opt => (
              <button
                key={opt.value}
                onClick={() => setFrequency(opt.value)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  frequency === opt.value
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hardcore toggle (Blind mode only) */}
        {modeType === 'blind' && (
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('competitiveWords.hardcoreMode')}</h3>
                <p className="text-sm text-gray-400">{t('competitiveWords.hardcoreDesc')}</p>
              </div>
              <button
                onClick={() => setHardcore(!hardcore)}
                className={`relative w-14 h-7 rounded-full transition-colors ${hardcore ? 'bg-red-500' : 'bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white transition-transform ${hardcore ? 'translate-x-7' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Player selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">
            {t('competitiveWords.selectPlayers')}
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
                      ? 'bg-indigo-600/20 border-2 border-indigo-500'
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
          {selectedPlayers.length > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              {selectedPlayers.length} {t('competitiveWords.playersSelected').replace('{n}', String(selectedPlayers.length))}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-400 mb-4 text-center">{error}</p>
        )}

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/30"
        >
          {modeIcon} {t('competitiveWords.startGame')}
        </button>
      </div>
    </div>
  );
}

// ===================== GAME VIEW =====================

interface CompetitiveGameViewProps {
  game: CompetitiveGame;
  songs: Song[];
  modeType: CompetitiveModeType;
  onUpdateGame: (_game: CompetitiveGame) => void;
  onEndGame: () => void;
  onPlayMatch: (_player1Id: string, _player2Id: string, _player1Name: string, _player2Name: string, _song: Song) => void;
}

export function CompetitiveGameView({
  game,
  songs,
  modeType,
  onUpdateGame,
  onEndGame,
  onPlayMatch,
}: CompetitiveGameViewProps) {
  const { t } = useTranslation();
  const currentRound = getCurrentRound(game);
  const ranked = getRankedPlayers(game);
  const hasTriggeredSetup = useRef(false);
  const hasTriggeredPlay = useRef(false);

  // Automatically start first round when game enters 'setup' status
  useEffect(() => {
    if (game.status === 'setup' && !hasTriggeredSetup.current) {
      hasTriggeredSetup.current = true;
      if (songs.length === 0) return;
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      if (!randomSong) return;
      const updated = startCompetitiveRound(game, randomSong.id, randomSong.title);
      onUpdateGame(updated);
    }
    if (game.status !== 'setup') {
      hasTriggeredSetup.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- game.players and game.rounds are read inside but changes tracked via game.status
  }, [game.status, songs, game.players, game.rounds, onUpdateGame]);

  // Delegate to game screen when round is ready to play
  useEffect(() => {
    if (game.status === 'playing' && currentRound && !hasTriggeredPlay.current) {
      const player1 = game.players.find(p => p.id === currentRound.player1Id);
      const player2 = game.players.find(p => p.id === currentRound.player2Id);
      const song = songs.find(s => s.id === currentRound.songId);
      if (song && player1 && player2) {
        hasTriggeredPlay.current = true;
        onPlayMatch(player1.id, player2.id, player1.name, player2.name, song);
      }
    }
    if (game.status !== 'playing') {
      hasTriggeredPlay.current = false;
    }
  }, [game.status, game.players, currentRound, songs, onPlayMatch]);

  // Game Over screen
  if (game.status === 'game-over') {
    return (
      <CompetitiveWinnerScreen
        game={game}
        ranked={ranked}
        modeType={modeType}
        onEndGame={onEndGame}
      />
    );
  }

  // Round End / Scoreboard
  if (game.status === 'round-end') {
    return (
      <CompetitiveScoreboard
        game={game}
        ranked={ranked}
        modeType={modeType}
        onNextRound={() => {
          // Pick a random song for the next round
          const randomSong = songs[Math.floor(Math.random() * songs.length)];
          if (!randomSong) return;
          const updated = startCompetitiveRound(game, randomSong.id, randomSong.title);
          onUpdateGame(updated);
        }}
      />
    );
  }

  // Setup — waiting for useEffect to start first round
  if (game.status === 'setup') {
    if (songs.length === 0) {
      return (
        <div className="min-h-screen flex items-center justify-center text-white">
          <p className="text-xl">{t('competitiveWords.noSongsInLibrary')}</p>
        </div>
      );
    }
    return null;
  }

  // Playing — waiting for useEffect to delegate to game screen
  return null;
}

// ===================== ROUND SCOREBOARD =====================

interface CompetitiveScoreboardProps {
  game: CompetitiveGame;
  ranked: ReturnType<typeof getRankedPlayers>;
  modeType: CompetitiveModeType;
  onNextRound: () => void;
}

function CompetitiveScoreboard({ game, ranked, modeType, onNextRound }: CompetitiveScoreboardProps) {
  const { t } = useTranslation();
  const lastRound = game.rounds[game.rounds.length - 1];
  const modeIcon = modeType === 'missing-words' ? '📝' : '🙈';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">{modeIcon} {t('competitiveWords.scoreboard')}</h2>
        <p className="text-gray-400 mb-6">
          {t('competitiveWords.roundOf').replace('{n}', String(game.rounds.length)).replace('{m}', String(game.totalRounds))}
        </p>

        {/* Last round results */}
        {lastRound && (
          <div className="bg-gray-700/30 rounded-xl p-4 mb-6">
            <h3 className="text-sm text-gray-400 mb-2">{t('competitiveWords.lastRound').replace('{n}', lastRound.songTitle)}</h3>
            <div className="flex justify-between">
              <div className="text-center">
                <div className="text-lg font-bold">
                  {game.players.find(p => p.id === lastRound.player1Id)?.name}
                </div>
                <div className="text-indigo-400 font-mono">{lastRound.player1Score} {t('competitiveWords.pts').replace('{n}', String(lastRound.player1Score))}</div>
                {lastRound.player1Bonus > 0 && (
                  <div className="text-green-400 text-sm">{t('competitiveWords.bonus').replace('{n}', String(lastRound.player1Bonus))}</div>
                )}
              </div>
              <div className="text-gray-500 self-center text-2xl">{t('competitiveWords.vs')}</div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  {game.players.find(p => p.id === lastRound.player2Id)?.name}
                </div>
                <div className="text-indigo-400 font-mono">{lastRound.player2Score} {t('competitiveWords.pts').replace('{n}', String(lastRound.player2Score))}</div>
                {lastRound.player2Bonus > 0 && (
                  <div className="text-green-400 text-sm">{t('competitiveWords.bonus').replace('{n}', String(lastRound.player2Bonus))}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rankings table */}
        <div className="space-y-3 mb-8">
          {ranked.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                index === 0
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : index === 1
                  ? 'bg-gray-400/10 border border-gray-400/20'
                  : index === 2
                  ? 'bg-amber-700/10 border border-amber-700/20'
                  : 'bg-gray-700/20'
              }`}
            >
              <div className="text-2xl font-bold w-8 text-center">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: player.color }}
              >
                {player.name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <div className="font-medium">{player.name}</div>
                <div className="text-sm text-gray-400">
                  {player.roundsPlayed} {t('competitiveWords.roundsPlayed').replace('{n}', String(player.roundsPlayed))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-indigo-400">{player.totalScore}</div>
                {player.totalBonusPoints > 0 && (
                  <div className="text-xs text-green-400">{player.totalBonusPoints} {t('competitiveWords.bonusLabel')}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Next round button */}
        {game.rounds.length < game.totalRounds && (
          <button
            onClick={onNextRound}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all"
          >
            {t('competitiveWords.nextRound')}
          </button>
        )}
      </div>
    </div>
  );
}

// ===================== WINNER SCREEN =====================

function CompetitiveWinnerScreen({
  game: _game,
  ranked,
  modeType,
  onEndGame,
}: {
  game: CompetitiveGame;
  ranked: ReturnType<typeof getRankedPlayers>;
  modeType: CompetitiveModeType;
  onEndGame: () => void;
}) {
  const { t } = useTranslation();
  const winner = ranked[0];
  const modeIcon = modeType === 'missing-words' ? '📝' : '🙈';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg mx-auto text-center">
        <div className="text-6xl mb-4">👑</div>
        <h1 className="text-4xl font-bold mb-2">{t('competitiveWords.winner')}</h1>
        <h2 className="text-2xl text-indigo-400 mb-6">{winner?.name}</h2>

        {winner && (
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-bold"
            style={{ backgroundColor: winner.color }}
          >
            {winner.name?.[0]}
          </div>
        )}

        <div className="text-5xl font-bold text-yellow-400 mb-8">
          {winner?.totalScore} {t('competitiveWords.points').replace('{n}', String(winner?.totalScore))}
        </div>

        {/* Final rankings */}
        <div className="space-y-2 mb-8 text-left">
          {ranked.map((player, i) => (
            <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/30">
              <span className="text-xl w-8 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
              </span>
              <span className="flex-1 font-medium">{player.name}</span>
              <span className="text-indigo-400 font-bold">{player.totalScore}</span>
              {player.totalBonusPoints > 0 && (
                <span className="text-xs text-green-400">+{player.totalBonusPoints}</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onEndGame}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-xl font-bold hover:from-indigo-500 hover:to-purple-500 transition-all"
        >
          {modeIcon} {t('competitiveWords.backToMenu')}
        </button>
      </div>
    </div>
  );
}
