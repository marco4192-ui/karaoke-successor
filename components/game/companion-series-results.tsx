'use client';

/**
 * Companion Sing-A-Long — Series Results
 *
 * Final standings across all rounds, cumulative scores, and round history.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePartyStore } from '@/lib/game/party-store';

// ===================== SERIES RESULTS =====================

export function CompanionSeriesResults({ onBack }: { onBack: () => void }) {
  const history = usePartyStore(s => s.companionSeriesHistory);
  const companionPlayers = usePartyStore(s => s.companionPlayers);

  type CumulativeEntry = { name: string; avatar?: string; color: string; totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number };
  const cumulative = useMemo((): Record<string, CumulativeEntry> => {
    const agg: Record<string, CumulativeEntry> = {};
    for (const p of companionPlayers) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
    }
    if (Object.keys(agg).length === 0) {
      for (const round of history) {
        for (const [id] of Object.entries(round.playerScores)) {
          if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        }
      }
    }
    for (const round of history) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMissed;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    return agg;
  }, [history, companionPlayers]);

  const sortedPlayers = Object.entries(cumulative)
    .sort(([, a], [, b]) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];

  return (
    <div className="flex flex-col items-center">
      {winner && (
        <>
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-bold mb-2">Series Champion!</h2>
          <Card className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/30 max-w-md w-full mb-6">
            <CardContent className="py-6 text-center">
              {winner[1].avatar ? (
                <img src={winner[1].avatar} alt={winner[1].name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-amber-500 mx-auto mb-3" />
              ) : (
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold border-4 border-amber-500 mx-auto mb-3"
                  style={{ backgroundColor: winner[1].color }}>
                  {winner[1].name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-3xl font-bold">{winner[1].name}</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{winner[1].totalScore.toLocaleString()} pts</div>
              <div className="text-sm text-white/40 mt-1">
                {history.length} round{history.length !== 1 ? 's' : ''} played
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
        <CardHeader><CardTitle className="text-center">Final Standings</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedPlayers.map(([id, data], rank) => (
              <div key={id}
                className={`flex items-center justify-between p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-white/60'}`}>
                    {rank + 1}
                  </div>
                  {data.avatar ? (
                    <img src={data.avatar} alt={data.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: data.color }}>{data.name.charAt(0).toUpperCase()}</div>
                  )}
                  <div>
                    <div className="font-medium">{data.name}</div>
                    <div className="text-xs text-white/40">
                      {data.totalHits} hits • {data.totalMisses} misses • {data.bestCombo}x best combo
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">{data.totalScore.toLocaleString()}</div>
                  <div className="text-xs text-white/40">total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {history.length > 1 && (
        <Card className="bg-white/5 border-white/10 w-full max-w-2xl mb-6">
          <CardHeader><CardTitle className="text-center">Round History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((round, i) => {
                const roundWinner = Object.entries(round.playerScores)
                  .sort(([, a], [, b]) => b.score - a.score)[0];
                return (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
                    <div>
                      <span className="text-white/40">Round {i + 1}:</span>{' '}
                      <span className="font-medium">{round.songTitle}</span>
                    </div>
                    <div className="text-emerald-400 font-medium">{roundWinner?.[1].score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack}
        className="px-12 py-4 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
        🏠 Back to Home
      </Button>
    </div>
  );
}
