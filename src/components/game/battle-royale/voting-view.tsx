'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SongVoteOption, BattleRoyalePlayer } from '@/lib/game/battle-royale';
import { useTranslation } from '@/lib/i18n/translations';

interface VotingViewProps {
  voteOptions: SongVoteOption[];
  activePlayers: BattleRoyalePlayer[];
  onVoteSubmit: (_playerId: string, _songIndex: number) => void;
  onStartRound: () => void;
  votingTimeoutSeconds?: number;
}

/**
 * Song voting phase UI (#2).
 * Players vote for one of 3 randomly selected songs.
 * After all votes are cast or timeout, the winning song is selected.
 */
export function VotingView({
  voteOptions,
  activePlayers,
  onVoteSubmit,
  onStartRound,
  votingTimeoutSeconds = 15,
}: VotingViewProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(votingTimeoutSeconds);
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<'voting' | 'result'>('voting');
  const [winningIndex, setWinningIndex] = useState(0);

  const totalVoters = activePlayers.length;
  const allVoted = votedPlayers.size >= totalVoters;

  // Timer
  useEffect(() => {
    if (phase !== 'voting') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-resolve when time runs out or all voted
  useEffect(() => {
    if ((timeLeft === 0 || allVoted) && phase === 'voting') {
      // Determine winner
      const maxVotes = Math.max(...voteOptions.map(o => o.votes));
      const topIndices = voteOptions
        .map((o, i) => ({ votes: o.votes, index: i }))
        .filter(o => o.votes === maxVotes);
      const winnerIdx = topIndices[Math.floor(Math.random() * topIndices.length)].index;
      setWinningIndex(winnerIdx);
      setPhase('result');

      // Auto-start after showing result
      const timer = setTimeout(() => {
        onStartRound();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, allVoted, phase, voteOptions, onStartRound]);

  const handleVote = (playerId: string, songIndex: number) => {
    if (votedPlayers.has(playerId)) return;
    setVotedPlayers(prev => new Set([...prev, playerId]));
    onVoteSubmit(playerId, songIndex);
  };

  return (
    <div className="max-w-5xl mx-auto text-center">
      <h1 className="text-3xl font-bold mb-2">
        <span className="animate-pulse">🗳️</span> {t('battleRoyale.voteTitle')}
      </h1>
      <p className="text-white/60 mb-2">{t('battleRoyale.voteSubtitle')}</p>

      {/* Timer & Progress */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Badge className={`font-mono text-lg ${timeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500/20 text-purple-400'}`}>
          {timeLeft}s
        </Badge>
        <div className="text-white/60">
          {votedPlayers.size}/{totalVoters} {t('battleRoyale.voted')}
        </div>
      </div>

      {/* Song Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {voteOptions.map((option, index) => {
          const maxVotes = Math.max(...voteOptions.map(o => o.votes));
          const isLeading = option.votes === maxVotes && option.votes > 0;
          const isWinner = phase === 'result' && index === winningIndex;

          return (
            <Card
              key={option.songId}
              className={`
                transition-all duration-300 cursor-pointer
                ${phase === 'result' && isWinner
                  ? 'bg-gradient-to-br from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 scale-105'
                  : phase === 'result'
                    ? 'bg-white/5 border border-white/10 opacity-50'
                    : isLeading
                      ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-2 border-purple-500'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }
              `}
              onClick={() => {
                // For simplicity, first unvoted player's vote is cast on click
                if (phase !== 'voting') return;
                const unvoted = activePlayers.find(p => !votedPlayers.has(p.id));
                if (unvoted) handleVote(unvoted.id, index);
              }}
            >
              <CardContent className="py-6">
                <div className="text-lg font-bold mb-2 truncate">{option.songName}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">{option.votes}</span>
                  <span className="text-white/60 text-sm">{t('battleRoyale.votes')}</span>
                </div>
                {isWinner && (
                  <div className="mt-2 text-amber-400 font-bold animate-bounce">
                    {t('battleRoyale.winningSong')} 🎵
                  </div>
                )}
                {isLeading && phase === 'voting' && (
                  <Badge className="mt-2 bg-purple-500/20 text-purple-400">
                    {t('battleRoyale.leading')}
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skip voting button */}
      {phase === 'voting' && (
        <Button
          onClick={onStartRound}
          variant="ghost"
          className="text-white/40"
        >
          {t('battleRoyale.skipVoting')}
        </Button>
      )}
    </div>
  );
}
