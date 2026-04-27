'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';

// ===================== TYPES =====================

interface PtmPlayerScore {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  segmentsSung: number;
}

interface PtmSongResultsProps {
  /** Song title */
  songTitle: string;
  /** Song artist */
  songArtist: string;
  /** Current round player scores (this song only) */
  playerScores: PtmPlayerScore[];
  /** Cumulative series history (previous rounds) */
  seriesHistory: PassTheMicRoundResult[];
  /** Round number (1-indexed) */
  roundNumber: number;
  /** Called to continue with next song */
  onNextSong: () => void;
  /** Called to end the series */
  onEndSeries: () => void;
}

interface PtmSeriesResultsProps {
  /** Cumulative series history */
  seriesHistory: PassTheMicRoundResult[];
  /** Player identities (id, name, avatar, color) */
  players: Array<{ id: string; name: string; avatar?: string; color: string }>;
  /** Called to continue with same players */
  onContinue: () => void;
  /** Called to go back to party setup */
  onBackToSetup: () => void;
}

// ===================== SONG RESULTS =====================

export function PtmSongResults({
  songTitle,
  songArtist,
  playerScores,
  seriesHistory,
  roundNumber,
  onNextSong,
  onEndSeries,
}: PtmSongResultsProps) {
  const sorted = useMemo(
    () => [...playerScores].sort((a, b) => b.score - a.score),
    [playerScores]
  );

  const winner = sorted[0];

  // Compute cumulative scores (previous rounds + current)
  const cumulativeScores = useMemo(() => {
    const cum = new Map<string, number>();
    // Previous rounds
    for (const round of seriesHistory) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        cum.set(id, (cum.get(id) || 0) + scores.score);
      }
    }
    // Current round
    for (const p of playerScores) {
      cum.set(p.id, (cum.get(p.id) || 0) + p.score);
    }
    return cum;
  }, [seriesHistory, playerScores]);

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Song Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🎤</div>
        <h2 className="text-2xl font-bold">{songTitle}</h2>
        <p className="text-white/60">{songArtist}</p>
        <Badge className="mt-2 bg-cyan-500/20 text-cyan-400">
          Runde {roundNumber}
        </Badge>
      </div>

      {/* Current Round Ranking */}
      <div className="bg-white/5 border border-white/10 rounded-xl mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-center text-white/80">Runden-Ergebnis</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
          {sorted.map((player, rank) => {
            const cumScore = cumulativeScores.get(player.id) || 0;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  rank === 0 ? 'bg-amber-500/10' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      rank === 0
                        ? 'bg-amber-500 text-black'
                        : rank === 1
                          ? 'bg-gray-400 text-black'
                          : rank === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {rank + 1}
                  </div>
                  {/* Avatar */}
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Name + Stats */}
                  <div>
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-white/40">
                      {player.notesHit} Treffer - {player.notesMissed} Fehler - {player.maxCombo}x Max Combo
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-cyan-400">
                    {player.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-white/40">
                    Gesamt: {cumScore.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cumulative Standings (only if previous rounds exist) */}
      {seriesHistory.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-bold text-center text-white/80">Gesamtwertung</h3>
          </div>
          <div className="px-4 py-3">
            <PtmCumulativeTable
              seriesHistory={seriesHistory}
              currentPlayerScores={playerScores}
              players={playerScores.map(p => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                color: p.color,
              }))}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onNextSong}
          className="flex-1 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
        >
          🎵 Nachstes Lied
        </Button>
        <Button
          onClick={onEndSeries}
          variant="outline"
          className="flex-1 py-4 text-lg border-white/20 text-white/60 hover:text-white"
        >
          🏆 Serie beenden
        </Button>
      </div>
    </div>
  );
}

// ===================== SERIES RESULTS (with Winner Ceremony) =====================

export function PtmSeriesResults({
  seriesHistory,
  players,
  onContinue,
  onBackToSetup,
}: PtmSeriesResultsProps) {
  const [showCeremony, setShowCeremony] = useState(true);
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number; x: number; y: number; color: string; size: number; speed: number; rotation: number;
  }>>([]);

  // Aggregate scores
  const cumulative = useMemo(() => {
    const agg = new Map<string, {
      name: string; avatar?: string; color: string;
      totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number;
    }>();

    for (const p of players) {
      agg.set(p.id, { name: p.name, avatar: p.avatar, color: p.color, totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 });
    }

    for (const round of seriesHistory) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        const entry = agg.get(id);
        if (!entry) continue;
        entry.totalScore += scores.score;
        entry.totalHits += scores.notesHit;
        entry.totalMisses += scores.notesMissed;
        if (scores.maxCombo > entry.bestCombo) entry.bestCombo = scores.maxCombo;
        entry.roundsPlayed++;
      }
    }
    return agg;
  }, [seriesHistory, players]);

  const sortedPlayers = useMemo(
    () => [...cumulative.entries()].sort(([, a], [, b]) => b.totalScore - a.totalScore),
    [cumulative]
  );

  const winner = sortedPlayers[0];

  // Confetti animation
  useEffect(() => {
    if (!showCeremony) return;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const particles: typeof confettiParticles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        speed: 0.3 + Math.random() * 0.7,
        rotation: Math.random() * 360,
      });
    }
    setConfettiParticles(particles);

    // Animate falling
    const interval = setInterval(() => {
      setConfettiParticles(prev =>
        prev
          .map(p => ({
            ...p,
            y: p.y + p.speed,
            rotation: p.rotation + 2,
            x: p.x + (Math.random() - 0.5) * 0.5,
          }))
          .filter(p => p.y < 110)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [showCeremony]);

  // Ceremony phase: auto-dismiss after 5 seconds
  useEffect(() => {
    if (!showCeremony) return;
    const timer = setTimeout(() => setShowCeremony(false), 5000);
    return () => clearTimeout(timer);
  }, [showCeremony]);

  return (
    <div className="max-w-3xl mx-auto py-8">
      {/* Confetti (during ceremony) */}
      {showCeremony && confettiParticles.length > 0 && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {confettiParticles.map(p => (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: p.id % 3 === 0 ? '50%' : '2px',
                transform: `rotate(${p.rotation}deg)`,
                opacity: 0.9,
              }}
            />
          ))}
        </div>
      )}

      {/* Winner Ceremony */}
      {winner && showCeremony && (
        <div className="text-center mb-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="text-7xl mb-4" style={{ animation: 'ptm-crown-bounce 1s ease-in-out infinite' }}>
            👑
          </div>
          <h2 className="text-4xl font-black text-amber-400 mb-2" style={{ textShadow: '0 0 30px rgba(251,191,36,0.5)' }}>
            Series Champion!
          </h2>
          <div className="mt-6 mb-4">
            {winner[1].avatar ? (
              <img
                src={winner[1].avatar}
                alt={winner[1].name}
                className="w-28 h-28 rounded-full object-cover border-4 border-amber-500 mx-auto shadow-2xl"
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-amber-500 mx-auto shadow-2xl text-white"
                style={{ backgroundColor: winner[1].color }}
              >
                {winner[1].name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-white">{winner[1].name}</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {winner[1].totalScore.toLocaleString()} Punkte
          </div>
          <div className="text-sm text-white/40 mt-1">
            {seriesHistory.length} Runde{seriesHistory.length !== 1 ? 'n' : ''} gespielt
          </div>
        </div>
      )}

      {/* Final Standings */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 sticky top-0 bg-zinc-900 z-10">
          <h3 className="font-bold text-center text-white/80">Endstand</h3>
        </div>
        <div className="divide-y divide-white/5 max-h-[50vh] overflow-y-auto">
          {sortedPlayers.map(([id, data], rank) => (
            <div
              key={id}
              className={`flex items-center justify-between px-4 py-3 ${
                rank === 0 ? 'bg-amber-500/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    rank === 0
                      ? 'bg-amber-500 text-black'
                      : rank === 1
                        ? 'bg-gray-400 text-black'
                        : rank === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-white/10 text-white/60'
                  }`}
                >
                  {rank + 1}
                </div>
                {data.avatar ? (
                  <img
                    src={data.avatar}
                    alt={data.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                    style={{ backgroundColor: data.color }}
                  >
                    {data.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-medium">{data.name}</div>
                  <div className="text-xs text-white/40">
                    {data.totalHits} Treffer - {data.totalMisses} Fehler - {data.bestCombo}x Best Combo - {data.roundsPlayed} Runden
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-cyan-400">{data.totalScore.toLocaleString()}</div>
                <div className="text-xs text-white/40">Gesamt</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Round History */}
      {seriesHistory.length > 1 && (
        <div className="bg-white/5 border border-white/10 rounded-xl mt-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-bold text-center text-white/80">Rundenverlauf</h3>
          </div>
          <div className="divide-y divide-white/5">
            {seriesHistory.map((round, i) => {
              const roundWinner = Object.entries(round.playerScores)
                .sort(([, a], [, b]) => b.score - a.score)[0];
              const winnerPlayer = players.find(p => p.id === roundWinner[0]);
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <span className="text-white/40">Runde {i + 1}:</span>{' '}
                    <span className="font-medium">{round.songTitle}</span>
                  </div>
                  <div className="text-amber-400 font-medium">
                    {winnerPlayer?.name || roundWinner[0]}: {roundWinner[1].score.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <Button
          onClick={onContinue}
          className="flex-1 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
        >
          🔄 Weiter mit gleichen Spielern
        </Button>
        <Button
          onClick={onBackToSetup}
          variant="outline"
          className="flex-1 py-4 text-lg border-white/20 text-white/60 hover:text-white"
        >
          ← Zuruck zum Setup
        </Button>
      </div>
    </div>
  );
}

// ===================== CUMULATIVE TABLE (used in song results) =====================

function PtmCumulativeTable({
  seriesHistory,
  currentPlayerScores,
  players,
}: {
  seriesHistory: PassTheMicRoundResult[];
  currentPlayerScores: PtmPlayerScore[];
  players: Array<{ id: string; name: string; avatar?: string; color: string }>;
}) {
  const cumulative = useMemo(() => {
    const cum = new Map<string, number>();
    for (const round of seriesHistory) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        cum.set(id, (cum.get(id) || 0) + scores.score);
      }
    }
    for (const p of currentPlayerScores) {
      cum.set(p.id, (cum.get(p.id) || 0) + p.score);
    }
    return cum;
  }, [seriesHistory, currentPlayerScores]);

  const sorted = useMemo(
    () => [...cumulative.entries()].sort(([, a], [, b]) => b - a),
    [cumulative]
  );

  return (
    <div className="space-y-2">
      {sorted.map(([id, totalScore], rank) => {
        const player = players.find(p => p.id === id);
        if (!player) return null;
        return (
          <div
            key={id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`font-bold ${rank === 0 ? 'text-amber-400' : 'text-white/60'}`}>
                {rank + 1}.
              </span>
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-medium">{player.name}</span>
            </div>
            <span className="text-cyan-400 font-bold">{totalScore.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}
