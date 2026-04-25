'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { MedleyPlayer, MedleySong, MedleySettings, MedleyMatch, MedleyRoundResult } from './medley-types';
import { generateTeamMatches } from './medley-types';

// ── Phase states for the flow controller ──
type FlowPhase = 'player-intro' | 'countdown' | 'transition' | 'playing' | 'results' | 'ended';

interface MedleyGameViewProps {
  players: MedleyPlayer[];
  medleySongs: MedleySong[];
  settings: MedleySettings;
  matches: MedleyMatch[];
  seriesHistory: MedleyRoundResult[];
  onUpdatePlayers: (players: MedleyPlayer[]) => void;
  onUpdateMatches: (matches: MedleyMatch[]) => void;
  onRecordRound: (round: MedleyRoundResult) => void;
  onPlaySnippet: (
    teamASingerId: string,
    teamBSingerId: string,
    snippetIndex: number,
  ) => void;
  onPlayFFASnippet: (snippetIndex: number) => void;
  onEndGame: () => void;
  onSecondRound: () => void;
}

export function MedleyGameView({
  players,
  medleySongs,
  settings,
  matches,
  seriesHistory,
  onUpdatePlayers,
  onUpdateMatches,
  onRecordRound,
  onPlaySnippet,
  onPlayFFASnippet,
  onEndGame,
  onSecondRound,
}: MedleyGameViewProps) {
  const isFFA = settings.playMode === 'ffa';

  // Derive current state from matches
  const completedMatches = matches.filter(m => m.completed);
  const lastCompletedMatch = completedMatches.length > 0 ? completedMatches[completedMatches.length - 1] : null;
  const nextMatchIndex = completedMatches.length;
  const allDone = nextMatchIndex >= matches.length;

  // For FFA: use snippet-based tracking
  const completedFFASnippets = settings.currentSnippetIndex !== undefined ? settings.currentSnippetIndex + 1 : 0;
  const allFFADone = isFFA && completedFFASnippets >= medleySongs.length;

  // Local phase state
  const [phase, setPhase] = useState<FlowPhase>(() => {
    if (allDone || allFFADone) return 'ended';
    if (lastCompletedMatch) return 'results';
    return 'player-intro'; // Start with player intro (no pre-overview)
  });
  const [countdown, setCountdown] = useState(3);
  const [transitionCountdown, setTransitionCountdown] = useState(settings.transitionTime);
  const [pulseActive, setPulseActive] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (transitionRef.current) clearInterval(transitionRef.current);
  }, []);

  // ── Current match info ──
  const currentMatch = !allDone && !isFFA ? matches[nextMatchIndex] : null;
  const currentSnippet = isFFA && !allFFADone ? medleySongs[completedFFASnippets] : currentMatch?.snippet;

  const teamASinger = currentMatch
    ? players.find(p => p.id === currentMatch.teamASingerId)
    : null;
  const teamBSinger = currentMatch
    ? players.find(p => p.id === currentMatch.teamBSingerId)
    : null;

  // ── Team scores ──
  const teamAScore = useMemo(() => {
    if (isFFA) return 0;
    return players
      .filter(p => p.team === 'A')
      .reduce((sum, p) => sum + p.score, 0);
  }, [players, isFFA]);

  const teamBScore = useMemo(() => {
    if (isFFA) return 0;
    return players
      .filter(p => p.team === 'B')
      .reduce((sum, p) => sum + p.score, 0);
  }, [players, isFFA]);

  // ── Progress ──
  const totalSnippets = isFFA ? medleySongs.length : matches.length;
  const doneCount = isFFA ? completedFFASnippets : completedMatches.length;
  const progressPercent = totalSnippets > 0 ? (doneCount / totalSnippets) * 100 : 0;

  // ── Start countdown → play snippet ──
  const startCountdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(3);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;

          // Launch the snippet
          if (isFFA) {
            onPlayFFASnippet(completedFFASnippets);
          } else if (currentMatch) {
            onPlaySnippet(
              currentMatch.teamASingerId,
              currentMatch.teamBSingerId,
              currentMatch.snippetIndex,
            );
          }
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isFFA, currentMatch, completedFFASnippets, onPlaySnippet, onPlayFFASnippet]);

  // ── Auto-start: player intro → countdown ──
  useEffect(() => {
    if (phase === 'player-intro') {
      // Show player intro for 3 seconds, then start countdown
      const timer = setTimeout(() => startCountdown(), 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, startCountdown]);

  // ── Auto-transition: results → pulse → player intro of next snippet ──
  useEffect(() => {
    if (phase !== 'results') return;

    // Start pulse effect
    setPulseActive(true);

    transitionRef.current = setInterval(() => {
      setTransitionCountdown(prev => {
        if (prev <= 1) {
          if (transitionRef.current) clearInterval(transitionRef.current);
          transitionRef.current = null;
          setPulseActive(false);

          if (!allDone && !allFFADone) {
            setPhase('player-intro');
          }
          return settings.transitionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (transitionRef.current) clearInterval(transitionRef.current);
    };
  }, [phase, allDone, allFFADone, settings.transitionTime]);

  // ── Determine winner ──
  const winner = useMemo(() => {
    if (isFFA) {
      return [...players].sort((a, b) => b.score - a.score)[0];
    }
    if (teamAScore > teamBScore) return { team: 'A', score: teamAScore };
    if (teamBScore > teamAScore) return { team: 'B', score: teamBScore };
    return { team: 'draw', score: teamAScore };
  }, [isFFA, players, teamAScore, teamBScore]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onEndGame} className="text-white/60">
            ← Zurück
          </Button>
          <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">
            🎵 MEDLEY
          </Badge>
          {isFFA ? (
            <Badge className="bg-amber-500/20 text-amber-400">👥 FFA</Badge>
          ) : (
            <Badge className="bg-pink-500/20 text-pink-400">⚔️ Team {settings.teamSize}v{settings.teamSize}</Badge>
          )}
        </div>
        <Badge className="bg-pink-500/20 text-pink-400">
          {doneCount}/{totalSnippets} Snippets
        </Badge>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Fortschritt</span>
          <span>{doneCount}/{totalSnippets}</span>
        </div>
        <Progress value={progressPercent} className="h-2 bg-white/10" />
      </div>

      {/* ── Team Score Comparison (Team mode) ── */}
      {!isFFA && doneCount > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="bg-purple-500/10 border border-purple-500/30">
            <CardContent className="py-3 text-center">
              <div className="text-sm text-purple-400 font-bold">Team A</div>
              <div className="text-3xl font-bold text-purple-300">{teamAScore.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/10 border border-pink-500/30">
            <CardContent className="py-3 text-center">
              <div className="text-sm text-pink-400 font-bold">Team B</div>
              <div className="text-3xl font-bold text-pink-300">{teamBScore.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FFA Scoreboard ── */}
      {isFFA && doneCount > 0 && (
        <div className="flex justify-center gap-6 mb-4">
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <div key={player.id} className="text-center">
                <div className="text-lg font-bold" style={{ color: player.color }}>
                  #{index + 1}
                </div>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mx-auto border-2"
                  style={{ backgroundColor: player.color, borderColor: player.color }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="font-medium mt-1 text-sm">{player.name}</div>
                <div className="font-bold text-lg" style={{ color: player.color }}>
                  {player.score.toLocaleString()}
                </div>
                <div className="text-xs text-white/40">
                  {player.notesHit}✓ {player.notesMissed}✗
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── PLAYER INTRO ── */}
      {phase === 'player-intro' && !allDone && !allFFADone && (
        <Card className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4 animate-fade-in`}>
          <CardContent className="py-8">
            <div className="text-center">
              {isFFA ? (
                <>
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold mb-2">Alle Spieler bereit?</h3>
                  <p className="text-white/60 mb-6">Nächstes Snippet kommt — alle 4 singen gleichzeitig!</p>
                  <div className="flex justify-center gap-4">
                    {players.map(p => (
                      <div key={p.id} className="text-center">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div className="text-sm mt-2 font-medium">{p.name}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : teamASinger && teamBSinger ? (
                <>
                  <div className="text-5xl mb-4">⚔️</div>
                  <h3 className="text-2xl font-bold mb-4">Nächstes Duell</h3>
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto border-2 border-purple-500"
                        style={{ backgroundColor: teamASinger.color }}
                      >
                        {teamASinger.name.charAt(0)}
                      </div>
                      <div className="text-sm mt-2 font-bold text-purple-400">Team A</div>
                      <div className="font-medium">{teamASinger.name}</div>
                    </div>
                    <div className="flex items-center text-2xl font-bold text-white/30">VS</div>
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto border-2 border-pink-500"
                        style={{ backgroundColor: teamBSinger.color }}
                      >
                        {teamBSinger.name.charAt(0)}
                      </div>
                      <div className="text-sm mt-2 font-bold text-pink-400">Team B</div>
                      <div className="font-medium">{teamBSinger.name}</div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-12">
            <div className="text-center">
              {countdown > 0 ? (
                <div className="text-8xl font-bold text-purple-400 animate-pulse">{countdown}</div>
              ) : (
                <div className="text-4xl font-bold text-white/60 animate-pulse">Los...</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TRANSITION (between snippets) — with pulse effect ── */}
      {phase === 'results' && !allDone && !allFFADone && (
        <Card
          className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4 transition-all duration-300 ${
            pulseActive ? 'scale-[1.01] border-purple-400/50' : 'scale-100'
          }`}
        >
          <CardContent className="py-6">
            <div className="text-center">
              <div className="text-3xl mb-2 animate-pulse">🎵</div>
              <h3 className="text-xl font-bold mb-2">Nächstes Snippet</h3>
              <div className="text-4xl font-bold text-pink-400 mb-2">{transitionCountdown}</div>

              {/* Preview of next matchup */}
              {isFFA ? (
                <p className="text-white/60">Alle Spieler singen weiter!</p>
              ) : currentMatch ? (
                <div className="flex justify-center items-center gap-4 mt-3">
                  <span className="text-sm font-medium" style={{ color: players.find(p => p.id === currentMatch.teamASingerId)?.color }}>
                    {players.find(p => p.id === currentMatch.teamASingerId)?.name}
                  </span>
                  <span className="text-white/30">vs</span>
                  <span className="text-sm font-medium" style={{ color: players.find(p => p.id === currentMatch.teamBSingerId)?.color }}>
                    {players.find(p => p.id === currentMatch.teamBSingerId)?.name}
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── ENDED: Final Results ── */}
      {(phase === 'ended' || allDone || allFFADone) && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold mb-6">
                {isFFA ? 'FFA-Medley — Ergebnis' : `Team ${settings.teamSize}v${settings.teamSize} — Ergebnis`}
              </h2>

              {/* Team mode: Team comparison + individual breakdown */}
              {!isFFA && (
                <div className="mb-6">
                  {/* Team comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`p-4 rounded-xl ${
                      teamAScore > teamBScore
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className="text-lg font-bold text-purple-400">Team A — {teamAScore.toLocaleString()} Pkt.</div>
                      {players
                        .filter(p => p.team === 'A')
                        .sort((a, b) => b.score - a.score)
                        .map(p => (
                          <div key={p.id} className="flex items-center gap-2 mt-2 text-sm">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: p.color }}
                            >
                              {p.name.charAt(0)}
                            </div>
                            <span className="flex-1">{p.name}</span>
                            <span className="font-bold">{p.score.toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                    <div className={`p-4 rounded-xl ${
                      teamBScore > teamAScore
                        ? 'bg-pink-500/20 border-2 border-pink-500'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className="text-lg font-bold text-pink-400">Team B — {teamBScore.toLocaleString()} Pkt.</div>
                      {players
                        .filter(p => p.team === 'B')
                        .sort((a, b) => b.score - a.score)
                        .map(p => (
                          <div key={p.id} className="flex items-center gap-2 mt-2 text-sm">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{ backgroundColor: p.color }}
                            >
                              {p.name.charAt(0)}
                            </div>
                            <span className="flex-1">{p.name}</span>
                            <span className="font-bold">{p.score.toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Winner announcement */}
                  {winner && winner.team !== 'draw' && (
                    <div className="text-xl mb-4">
                      🏆 <span className="font-bold text-yellow-400">Team {String(winner.team)}</span> gewinnt!
                    </div>
                  )}
                  {winner && winner.team === 'draw' && (
                    <div className="text-xl mb-4">🤝 Unentschieden!</div>
                  )}
                </div>
              )}

              {/* FFA mode: Rankings */}
              {isFFA && (
                <div className="mb-6">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-4 p-3 rounded-lg mb-2 ${
                          index === 0
                            ? 'bg-yellow-500/10 border border-yellow-500/30'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="text-2xl w-8 text-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </div>
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-white/40">
                            {player.snippetsSung} Snippets · {player.notesHit} Hit · {player.notesMissed} Miss · Max Combo: {player.maxCombo}
                          </div>
                        </div>
                        <div className="text-xl font-bold" style={{ color: player.color }}>
                          {player.score.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  {winner && 'name' in winner && (
                    <div className="mt-4 text-lg">
                      🏆 <span className="font-bold text-yellow-400">{winner.name}</span> gewinnt!
                    </div>
                  )}
                </div>
              )}

              {/* Round history */}
              {seriesHistory.length > 0 && (
                <div className="mb-6 text-left">
                  <h3 className="font-bold text-lg mb-3 text-white/60">Runden-Verlauf</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {seriesHistory.map((round, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-2 text-sm">
                        <span className="text-white/30 w-6 text-center">#{i + 1}</span>
                        <span className="flex-1 truncate">{round.songTitle}</span>
                        {!isFFA && (
                          <>
                            <span className="text-purple-400 font-bold">{round.teamAScore}</span>
                            <span className="text-white/30">:</span>
                            <span className="text-pink-400 font-bold">{round.teamBScore}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={onSecondRound}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 px-6"
                >
                  🔄 Zweite Runde
                </Button>
                <Button
                  onClick={onEndGame}
                  variant="outline"
                  className="border-white/20"
                >
                  Zurück zum Menü
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Individual Player Scores (side panel) ── */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-3">
          <div className="flex justify-center gap-6">
            {players.map(player => (
              <div key={player.id} className="text-center min-w-[80px]">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mx-auto border-2"
                  style={{ backgroundColor: player.color, borderColor: player.color }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="font-medium mt-1 text-sm truncate">{player.name}</div>
                <div className="font-bold text-lg" style={{ color: player.color }}>
                  {player.score.toLocaleString()}
                </div>
                <div className="text-xs text-white/40">
                  {player.notesHit}✓ {player.notesMissed}✗ · {player.snippetsSung} gesungen
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
