/**
 * Medley Contest — Round & Final Results UI
 *
 * MedleyRoundResults: shown after each round (snippet series).
 * MedleyFinalResults: shown after all rounds are complete.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { MedleyPlayer, MedleySettings, MedleyRoundResult } from './medley-types';

// ===================== ROUND RESULTS =====================

export interface MedleyRoundResultsProps {
  players: MedleyPlayer[];
  settings: MedleySettings;
  seriesHistory: MedleyRoundResult[];
  roundNumber: number;
  onNextRound: () => void;
  onEndSeries: () => void;
  onRecordAndEnd: () => void;
}

export function MedleyRoundResults({
  players, settings, seriesHistory: _seriesHistory, roundNumber,
  onNextRound, onEndSeries, onRecordAndEnd,
}: MedleyRoundResultsProps) {
  const isTeam = settings.playMode === 'team';
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  // Guard against double-click: onRecordAndEnd should only fire once
  const recordedRef = useRef(false);
  const handleRecorded = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    onRecordAndEnd();
  }, [onRecordAndEnd]);

  const teamAScore = players.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0);
  const teamBScore = players.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎵</div>
        <h2 className="text-2xl font-bold">Runde {roundNumber} abgeschlossen!</h2>
      </div>

      {/* Team comparison */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-blue-300 mb-1">Team A</div>
            <div className="text-2xl font-bold text-blue-400">{teamAScore}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-red-300 mb-1">Team B</div>
            <div className="text-2xl font-bold text-red-400">{teamBScore}</div>
          </div>
        </div>
      )}

      {/* Player standings */}
      <div className="space-y-2 mb-6">
        {sorted.map((player, rank) => (
          <PlayerStandingRow key={player.id} player={player} rank={rank} isTeam={isTeam} />
        ))}
      </div>

      {winner && (
        <div className="text-center mb-6 text-lg">
          🏆 <span className="font-bold" style={{ color: winner.color }}>{winner.name}</span> führt!
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => { handleRecorded(); onNextRound(); }}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
          🎵 Nächste Runde
        </Button>
        <Button onClick={() => { handleRecorded(); onEndSeries(); }}
          variant="outline" className="flex-1 py-3 border-white/20 text-white/60 hover:text-white">
          🏆 Endauswertung
        </Button>
      </div>
    </div>
  );
}

// ===================== FINAL RESULTS =====================

export interface MedleyFinalResultsProps {
  players: MedleyPlayer[];
  settings: MedleySettings;
  seriesHistory: MedleyRoundResult[];
  onBack: () => void;
}

export function MedleyFinalResults({
  players, settings, seriesHistory, onBack,
}: MedleyFinalResultsProps) {
  const isTeam = settings.playMode === 'team';

  // Aggregate across all rounds (series history + current round)
  const [cumulative, setCumulative] = useState<Record<string, CumulativePlayerScore>>({});
  useEffect(() => {
    const agg: Record<string, CumulativePlayerScore> = {};
    for (const p of players) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, team: p.team, totalScore: p.score, totalHits: p.notesHit, totalMisses: p.notesMissed, bestCombo: p.maxCombo, roundsPlayed: 1 };
    }
    for (const round of seriesHistory) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) continue;
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMissed;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setCumulative(agg);
  }, [players, seriesHistory]);

  const sorted = Object.entries(cumulative).sort(([, a], [, b]) => b.totalScore - a.totalScore);
  const winner = sorted[0];

  const teamATotal = Object.values(cumulative).filter(p => p.team === 0).reduce((s, p) => s + p.totalScore, 0);
  const teamBTotal = Object.values(cumulative).filter(p => p.team === 1).reduce((s, p) => s + p.totalScore, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">🏆</div>
        <h2 className="text-3xl font-bold">{isTeam ? 'Team-Sieger!' : 'Medley Champion!'}</h2>
        <p className="text-white/60">{seriesHistory.length + 1} Runde{nrc_round(seriesHistory.length)}</p>
      </div>

      {/* Team total */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-4 text-center ${teamATotal >= teamBTotal ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-500/10 border border-blue-500/30'}`}>
            <div className="text-sm text-blue-300 mb-1">Team A</div>
            <div className="text-3xl font-bold text-blue-400">{teamATotal}</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${teamBTotal > teamATotal ? 'bg-red-500/20 border-2 border-red-500' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="text-sm text-red-300 mb-1">Team B</div>
            <div className="text-3xl font-bold text-red-400">{teamBTotal}</div>
          </div>
        </div>
      )}

      {/* Winner card */}
      {winner && (
        <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 rounded-lg p-6 text-center mb-6">
          {(() => {
            const w = winner[1];
            return (
              <>
                {w.avatar ? (
                  <img src={w.avatar} alt={w.name} className="w-20 h-20 rounded-full object-cover border-4 border-amber-500 mx-auto mb-3" />
                ) : (
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-amber-500 mx-auto mb-3"
                    style={{ backgroundColor: w.color }}>{w.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="text-2xl font-bold" style={{ color: w.color }}>{w.name}</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{w.totalScore.toLocaleString()} pts</div>
                <div className="text-sm text-white/40 mt-1">
                  {w.roundsPlayed} Runde{nrc_round(w.roundsPlayed)} · {w.bestCombo}x Best Combo
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Standings */}
      <div className="space-y-2 mb-6">
        {sorted.map(([id, data], rank) => (
          <div key={id}
            className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : 'bg-white/10'}`}>
                {rank + 1}
              </div>
              {data.avatar ? (
                <img src={data.avatar} alt={data.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: data.color }}>
                  {data.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-sm">{data.name}</div>
                <div className="text-xs text-white/40">
                  {data.totalHits} Hits · {data.totalMisses} Miss · {data.bestCombo}x Best Combo
                </div>
              </div>
            </div>
            <div className="text-lg font-bold text-purple-400">{data.totalScore.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <Button onClick={onBack}
        className="w-full py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
        🏠 Zurück
      </Button>
    </div>
  );
}

// ===================== SHARED HELPERS =====================

interface CumulativePlayerScore {
  name: string;
  avatar?: string;
  color: string;
  team: number;
  totalScore: number;
  totalHits: number;
  totalMisses: number;
  bestCombo: number;
  roundsPlayed: number;
}

/** Player standing row used in round results */
function PlayerStandingRow({ player, rank, isTeam }: { player: MedleyPlayer; rank: number; isTeam: boolean }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : 'bg-white/10'}`}>
          {rank + 1}
        </div>
        {player.avatar ? (
          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: player.color }}>
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <div className="font-medium text-sm">{player.name}</div>
          <div className="text-xs text-white/40">
            {player.notesHit} Hits · {player.notesMissed} Miss · {player.maxCombo}x Combo
            {isTeam && <span> · Team {player.team === 0 ? 'A' : 'B'}</span>}
          </div>
        </div>
      </div>
      <div className="text-lg font-bold text-purple-400">{player.score}</div>
    </div>
  );
}

function nrc_round(n: number): string {
  return n === 1 ? '' : 'n';
}
