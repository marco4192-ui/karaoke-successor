'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, LyricLine, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { usePartyStore } from '@/lib/game/party-store';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';

// ===================== SHARED TYPES =====================

export interface PassTheMicPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  isActive: boolean;
  segmentsSung: number;
  micId?: string;
}

export interface PassTheMicSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

interface PassTheMicSettings {
  segmentDuration: number;
  randomSwitches: boolean;
  difficulty: Difficulty;
  micId: string;
  micName: string;
}

const DEFAULT_SETTINGS: PassTheMicSettings = {
  segmentDuration: 30,
  randomSwitches: true,
  difficulty: 'medium',
  micId: 'default',
  micName: 'Standard',
};

type GamePhase = 'intro' | 'countdown' | 'playing' | 'song-results' | 'series-results';

// ===================== SETUP SCREEN (unchanged) =====================

interface PassTheMicSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: PassTheMicPlayer[], settings: PassTheMicSettings) => void;
  onBack: () => void;
}

export function PassTheMicSetupScreen({ profiles, onSelectSong, onBack }: PassTheMicSetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<PassTheMicSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  const activeProfiles = profiles.filter(p => p.isActive !== false);
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 8) { setError('Maximum 8 players allowed'); return prev; }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleSelectSong = () => {
    if (selectedPlayers.length < 2) { setError('Minimum 2 players required'); return; }
    setError(null);
    const players: PassTheMicPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id, name: profile?.name || 'Unknown', avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        score: 0, notesHit: 0, notesMissed: 0, combo: 0, maxCombo: 0,
        isActive: index === 0, segmentsSung: 0,
      };
    });
    onSelectSong(players, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">← Back</Button>
        <div>
          <h1 className="text-3xl font-bold">🎤 Pass the Mic</h1>
          <p className="text-white/60">Take turns singing parts of a song!</p>
        </div>
      </div>
      {error && <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>}

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Game Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button key={diff} variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff)}
                  className={globalDifficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>Select Players ({selectedPlayers.length}/8)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div key={profile.id} onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}>{profile.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-cyan-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">⚠️ Need at least 2 active profiles.</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSelectSong} disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}


// ===================== SERIES RESULTS =====================

function PassTheMicSeriesResults({ onBack }: { onBack: () => void }) {
  const party = usePartyStore();
  const history = party.passTheMicSeriesHistory;

  // Aggregate scores across all rounds
  const cumulative = useRef<Record<string, { name: string; avatar?: string; color: string; totalScore: number; totalHits: number; totalMisses: number; bestCombo: number; roundsPlayed: number }>>({});
  useEffect(() => {
    const agg: typeof cumulative.current = {};
    // Collect player identities from the current store
    for (const p of party.passTheMicPlayers) {
      agg[p.id] = { name: p.name, avatar: p.avatar, color: p.color, totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
    }
    // If no players in store (already cleared), extract from history
    if (Object.keys(agg).length === 0) {
      for (const round of history) {
        for (const [id] of Object.entries(round.playerScores)) {
          if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        }
      }
    }
    // Accumulate
    for (const round of history) {
      for (const [id, scores] of Object.entries(round.playerScores)) {
        if (!agg[id]) agg[id] = { name: id, color: '#888', totalScore: 0, totalHits: 0, totalMisses: 0, bestCombo: 0, roundsPlayed: 0 };
        agg[id].totalScore += scores.score;
        agg[id].totalHits += scores.notesHit;
        agg[id].totalMisses += scores.notesMisses;
        if (scores.maxCombo > agg[id].bestCombo) agg[id].bestCombo = scores.maxCombo;
        agg[id].roundsPlayed++;
      }
    }
    cumulative.current = agg;
  }, [history, party.passTheMicPlayers]);

  const sortedPlayers = Object.entries(cumulative.current)
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
                  <div className="text-xl font-bold text-cyan-400">{data.totalScore.toLocaleString()}</div>
                  <div className="text-xs text-white/40">total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Round history */}
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
                    <div className="text-cyan-400 font-medium">{roundWinner?.[1].score.toLocaleString()} pts</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack}
        className="px-12 py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400">
        🏠 Back to Home
      </Button>
    </div>
  );
}
