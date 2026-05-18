/**
 * Medley Contest — Round & Final Results UI
 *
 * Feature #5: Score breakdown section
 * Feature #10: Elimination — elimination order display
 * Feature #13: Leaderboard — daily/all-time rankings
 * Feature #17: Highlights — best snippet, best combo, biggest flop, surprise
 * Feature #18: Team bonuses — synergy, comeback, MVP
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MedleyPlayer, MedleySettings, MedleyRoundResult, MedleyHighlight, MedleySong, TeamBonusResult } from './medley-types';
import { getDailyMedleyTopN, getMedleyTopN, type MedleyHistoryEntry } from '@/lib/game/medley-ranking';
import { useTranslation } from '@/lib/i18n/translations';
import { toast } from '@/hooks/use-toast';

// ===================== ROUND RESULTS =====================

export interface MedleyRoundResultsProps {
  players: MedleyPlayer[];
  settings: MedleySettings;
  seriesHistory: MedleyRoundResult[];
  roundNumber: number;
  onNextRound: () => void;
  onEndSeries: () => void;
  onRecordAndEnd: () => void;
  // Feature #10
  eliminationOrder?: string[];
  // Feature #17
  highlights?: MedleyHighlight[];
  // Feature #18
  teamBonusResult?: TeamBonusResult;
  // For highlights
  medleySongs?: MedleySong[];
}

export function MedleyRoundResults({
  players, settings, seriesHistory: _seriesHistory, roundNumber,
  onNextRound, onEndSeries, onRecordAndEnd,
  eliminationOrder = [],
  highlights = [],
  teamBonusResult,
}: MedleyRoundResultsProps) {
  const { t } = useTranslation();
  const isTeam = settings.playMode === 'team';
  const isElimination = settings.playMode === 'elimination';
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  // Guard against double-click
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
        <div className="text-4xl mb-2">{isElimination ? '💀' : '🎵'}</div>
        <h2 className="text-2xl font-bold">{t('medley.roundComplete').replace('{n}', String(roundNumber))}</h2>
      </div>

      {/* Feature #10: Elimination order */}
      {isElimination && eliminationOrder.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-2 text-red-400">{t('medley.eliminationOrder')}</h3>
          <div className="space-y-1">
            {eliminationOrder.map((id, idx) => {
              const p = players.find(pl => pl.id === id);
              if (!p) return null;
              return (
                <div key={id} className="flex items-center gap-2 text-sm opacity-60">
                  <span className="text-red-400">💀</span>
                  <span style={{ color: p.color }}>{p.name}</span>
                  <span className="text-white/40 text-xs">({p.score} Pkt)</span>
                </div>
              );
            })}
            {/* Survivors */}
            {players.filter(p => !p.isEliminated).map(p => (
              <div key={p.id} className="flex items-center gap-2 text-sm font-bold">
                <span className="text-green-400">✅</span>
                <span style={{ color: p.color }}>{p.name}</span>
                <span className="text-green-400 text-xs">{t('medley.survived')} ({p.score} Pkt)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature #17: Highlights */}
      {highlights.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-3 text-amber-400">✨ {t('medley.highlights')}</h3>
          <div className="space-y-2">
            <HighlightRow
              icon="🔥"
              label={t('medley.bestSnippet')}
              playerId={highlights.reduce((best, h) => (h.bestPlayerScore ?? 0) > (best.bestPlayerScore ?? 0) ? h : best, highlights[0]).bestPlayerId}
              detail={`${highlights.reduce((best, h) => (h.bestPlayerScore ?? 0) > (best.bestPlayerScore ?? 0) ? h : best, highlights[0]).songTitle}`}
              score={highlights.reduce((best, h) => (h.bestPlayerScore ?? 0) > (best.bestPlayerScore ?? 0) ? h : best, highlights[0]).bestPlayerScore}
              players={players}
            />
            <HighlightRow
              icon="🏆"
              label={t('medley.bestCombo')}
              playerId={highlights.reduce((best, h) => (h.highestComboValue ?? 0) > (best.highestComboValue ?? 0) ? h : best, highlights[0]).highestComboPlayerId}
              detail={`${highlights.reduce((best, h) => (h.highestComboValue ?? 0) > (best.highestComboValue ?? 0) ? h : best, highlights[0]).highestComboValue ?? 0}x`}
              players={players}
            />
            <HighlightRow
              icon="💀"
              label={t('medley.biggestFlop')}
              playerId={highlights.reduce((worst, h) => (h.worstPlayerScore ?? Infinity) < (worst.worstPlayerScore ?? Infinity) ? h : worst, highlights[0]).worstPlayerId}
              detail={highlights.reduce((worst, h) => (h.worstPlayerScore ?? Infinity) < (worst.worstPlayerScore ?? Infinity) ? h : worst, highlights[0]).songTitle}
              score={highlights.reduce((worst, h) => (h.worstPlayerScore ?? Infinity) < (worst.worstPlayerScore ?? Infinity) ? h : worst, highlights[0]).worstPlayerScore}
              players={players}
              flop
            />
          </div>
        </div>
      )}

      {/* Team comparison */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-blue-300 mb-1">{t('medley.teamA')}</div>
            <div className="text-2xl font-bold text-blue-400">{teamAScore}</div>
            {/* Feature #18: Synergy indicators */}
            {teamBonusResult && (teamBonusResult.synergyPoints['0'] || 0) > 0 && (
              <div className="text-xs text-green-400 mt-1">⚡ {t('medley.synergyBonus')} +{teamBonusResult.synergyPoints['0']}</div>
            )}
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-red-300 mb-1">{t('medley.teamB')}</div>
            <div className="text-2xl font-bold text-red-400">{teamBScore}</div>
            {teamBonusResult && (teamBonusResult.synergyPoints['1'] || 0) > 0 && (
              <div className="text-xs text-green-400 mt-1">⚡ {t('medley.synergyBonus')} +{teamBonusResult.synergyPoints['1']}</div>
            )}
          </div>
        </div>
      )}

      {/* Player standings */}
      <div className="space-y-2 mb-6">
        {sorted.map((player, rank) => (
          <PlayerStandingRow
            key={player.id}
            player={player}
            rank={rank}
            isTeam={isTeam}
            // Feature #18: MVP badge
            isMVP={!!teamBonusResult?.mvpPlayerId && teamBonusResult.mvpPlayerId === player.id}
          />
        ))}
      </div>

      {/* Feature #5: Score breakdown */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-sm mb-3 text-purple-400">{t('medley.scoreBreakdown')}</h3>
        <div className="space-y-3">
          {sorted.map(player => {
            const totalNotes = player.notesHit + player.notesMissed;
            const accuracy = totalNotes > 0 ? Math.round((player.notesHit / totalNotes) * 100) : 0;
            const basePoints = player.notesHit * 50;
            const comboBonus = Math.max(0, player.score - basePoints);

            return (
              <div key={player.id} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ backgroundColor: player.color }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-xs" style={{ color: player.color }}>
                    {player.name}
                    {/* Feature #10: Eliminated badge */}
                    {player.isEliminated && <span className="ml-2 text-red-400">💀 {t('medley.eliminated')}</span>}
                    {/* Feature #18: MVP badge */}
                    {teamBonusResult?.mvpPlayerId === player.id && (
                      <span className="ml-2 text-amber-400">🏅 {t('medley.mvpAward')}</span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-white/50">
                    <span>{t('medley.basePoints')}: {basePoints}</span>
                    <span>{t('medley.comboBonus')}: +{comboBonus}</span>
                    <span>{t('medley.accuracy')}: {accuracy}%</span>
                  </div>
                </div>
                <div className="font-bold text-purple-400">{player.score}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature #18: Team bonus breakdown */}
      {isTeam && teamBonusResult && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-3 text-amber-400">{t('medley.teamBonusBreakdown')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">{t('medley.synergyBonus')}</span>
              <span className="text-green-400">+{Object.values(teamBonusResult.synergyPoints).reduce((s, v) => s + v, 0)}</span>
            </div>
            {teamBonusResult.comebackTeamId && (
              <div className="flex justify-between">
                <span className="text-white/60">{t('medley.comebackBoost')}</span>
                <span className="text-orange-400">{t('medley.comebackMultiplier')}</span>
              </div>
            )}
            {teamBonusResult.mvpPlayerId && (
              <div className="flex justify-between">
                <span className="text-white/60">{t('medley.mvpOfMatch')}</span>
                <span className="text-amber-400" style={{ color: players.find(p => p.id === teamBonusResult.mvpPlayerId)?.color }}>
                  {players.find(p => p.id === teamBonusResult.mvpPlayerId)?.name || '—'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {winner && (
        <div className="text-center mb-6 text-lg">
          🏆 <span className="font-bold" style={{ color: winner.color }}>{winner.name}</span> {t('medley.leads')}
        </div>
      )}

      {/* Feature #17: Share button */}
      <div className="mb-4">
        <ShareButton players={players} winner={winner} settings={settings} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => { handleRecorded(); onNextRound(); }}
          className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
          {t('medley.nextRound')}
        </Button>
        <Button onClick={() => { handleRecorded(); onEndSeries(); }}
          variant="outline" className="flex-1 py-3 border-white/20 text-white/60 hover:text-white">
          🏆 {t('medley.finalResults')}
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
  // Feature #10
  eliminationOrder?: string[];
  // Feature #13
  showLeaderboard?: boolean;
  // Feature #17
  highlights?: MedleyHighlight[];
  // Feature #18
  teamBonusResult?: TeamBonusResult;
}

export function MedleyFinalResults({
  players, settings, seriesHistory, onBack,
  eliminationOrder = [],
  showLeaderboard = false,
  highlights = [],
  teamBonusResult,
}: MedleyFinalResultsProps) {
  const { t } = useTranslation();
  const isTeam = settings.playMode === 'team';
  const isElimination = settings.playMode === 'elimination';

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCumulative(agg);
  }, [players, seriesHistory]);

  const sorted = Object.entries(cumulative).sort(([, a], [, b]) => b.totalScore - a.totalScore);
  const winner = sorted[0];

  const teamATotal = Object.values(cumulative).filter(p => p.team === 0).reduce((s, p) => s + p.totalScore, 0);
  const teamBTotal = Object.values(cumulative).filter(p => p.team === 1).reduce((s, p) => s + p.totalScore, 0);

  // Feature #13: Show toast when leaderboard data was saved
  useEffect(() => {
    if (showLeaderboard && players.length > 0) {
      toast({
        title: t('medley.savedToLeaderboard'),
        description: '✅',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLeaderboard]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="text-6xl mb-2">{isElimination ? '💀' : '🏆'}</div>
        <h2 className="text-3xl font-bold">
          {isElimination
            ? t('medley.elimination')
            : isTeam
              ? t('medley.teamWinner')
              : t('medley.medleyChampion')
          }
        </h2>
        <p className="text-white/60">{t('medley.roundOf').replace('{n}', String(seriesHistory.length + 1))}</p>
      </div>

      {/* Feature #10: Final elimination order (reversed — last eliminated first) */}
      {isElimination && eliminationOrder.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-2 text-red-400">{t('medley.eliminationOrder')}</h3>
          <div className="space-y-1">
            {/* Show from last eliminated to first (winner at bottom) */}
            {[...eliminationOrder].reverse().map((id, idx) => {
              const p = players.find(pl => pl.id === id);
              if (!p) return null;
              const isWinner = idx === eliminationOrder.length - 1;
              return (
                <div key={id} className={`flex items-center gap-2 text-sm ${isWinner ? 'font-bold text-green-400' : 'opacity-60'}`}>
                  <span>{isWinner ? '👑' : '💀'}</span>
                  <span style={{ color: p.color }}>{p.name}</span>
                  <span className="text-white/40 text-xs">({p.score} Pkt)</span>
                  {isWinner && <span className="text-green-400 font-bold ml-auto">SIEGER</span>}
                </div>
              );
            })}
            {/* Winner */}
            {(() => {
              const survivor = players.find(p => !p.isEliminated && !eliminationOrder.includes(p.id));
              if (!survivor) return null;
              return (
                <div className="flex items-center gap-2 text-sm font-bold text-green-400">
                  <span>👑</span>
                  <span style={{ color: survivor.color }}>{survivor.name}</span>
                  <span className="text-white/40 text-xs">({survivor.score} Pkt)</span>
                  <span className="ml-auto font-bold">SIEGER</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Team total */}
      {isTeam && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-4 text-center ${teamATotal >= teamBTotal ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-500/10 border border-blue-500/30'}`}>
            <div className="text-sm text-blue-300 mb-1">{t('medley.teamA')}</div>
            <div className="text-3xl font-bold text-blue-400">{teamATotal}</div>
          </div>
          <div className={`rounded-lg p-4 text-center ${teamBTotal > teamATotal ? 'bg-red-500/20 border-2 border-red-500' : 'bg-red-500/10 border border-red-500/30'}`}>
            <div className="text-sm text-red-300 mb-1">{t('medley.teamB')}</div>
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
                <div className="text-2xl font-bold text-amber-400 mt-1">{w.totalScore.toLocaleString()} {t('medley.pts')}</div>
                <div className="text-sm text-white/40 mt-1">
                  {t('medley.roundOf').replace('{n}', String(w.roundsPlayed))} · {t('medley.bestComboOf').replace('{n}', String(w.bestCombo))}
                  {/* Feature #18: MVP indicator */}
                  {teamBonusResult?.mvpPlayerId === winner[0] && (
                    <span className="ml-2 text-amber-400">🏅 {t('medley.mvpAward')}</span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Standings with score breakdown */}
      <div className="space-y-2 mb-6">
        {sorted.map(([id, data], rank) => {
          const totalNotes = data.totalHits + data.totalMisses;
          const accuracy = totalNotes > 0 ? Math.round((data.totalHits / totalNotes) * 100) : 0;
          return (
            <div key={id}
              className={`p-3 rounded-lg ${rank === 0 ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
              <div className="flex items-center justify-between mb-1">
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
                    <div className="font-medium text-sm">
                      {data.name}
                      {/* Feature #18: MVP badge on standings */}
                      {teamBonusResult?.mvpPlayerId === id && (
                        <span className="ml-2 text-amber-400 text-xs">🏅 {t('medley.mvpAward')}</span>
                      )}
                    </div>
                    <div className="text-xs text-white/40">
                      {t('medley.hitsOf').replace('{n}', String(data.totalHits))} · {t('medley.missOf').replace('{n}', String(data.totalMisses))} · {t('medley.accuracy')}: {accuracy}%
                    </div>
                  </div>
                </div>
                <div className="text-lg font-bold text-purple-400">{data.totalScore.toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature #17: Share button */}
      <ShareButton players={players} winner={winner ? { name: winner[1].name, score: winner[1].totalScore } as { name: string; score: number } : null} settings={settings} />

      {/* Feature #13: Leaderboard */}
      {showLeaderboard && <LeaderboardSection />}

      <Button onClick={onBack}
        className="w-full py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 mt-4">
        {t('medley.backToMenu')}
      </Button>
    </div>
  );
}

// ===================== FEATURE #13: LEADERBOARD =====================

function LeaderboardSection() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'daily' | 'alltime'>('daily');
  const [dailyEntries, setDailyEntries] = useState<MedleyHistoryEntry[]>([]);
  const [allTimeEntries, setAllTimeEntries] = useState<MedleyHistoryEntry[]>([]);

  useEffect(() => {
    setDailyEntries(getDailyMedleyTopN(5));
    setAllTimeEntries(getMedleyTopN(5));
  }, []);

  const entries = tab === 'daily' ? dailyEntries : allTimeEntries;

  return (
    <Card className="bg-white/5 border-white/10 mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t('medley.medleyRankings')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('daily')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${tab === 'daily' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}`}
          >
            {t('medley.dailyHighscore')}
          </button>
          <button
            onClick={() => setTab('alltime')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${tab === 'alltime' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'}`}
          >
            {t('medley.allTimeHighscore')}
          </button>
        </div>

        {/* Formula */}
        <div className="text-xs text-white/30 mb-3">{t('medley.medleyScoreFormula')}</div>

        {/* Entries */}
        {entries.length === 0 ? (
          <p className="text-sm text-white/40">{t('medley.noMedleyRatings')}</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, rank) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${rank === 0 ? 'bg-amber-500 text-black' : rank === 1 ? 'bg-gray-400 text-black' : 'bg-white/10'}`}>
                  {rank + 1}
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: entry.playerColor }}>
                  {entry.playerName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="font-medium" style={{ color: entry.playerColor }}>{entry.playerName}</span>
                  <span className="text-white/40 text-xs ml-2">{entry.snippetsSung} {t('medley.totalSnippets').split(' ')[0]}</span>
                </div>
                <div className="font-bold text-purple-400">
                  {tab === 'alltime' ? Math.round(entry.score * Math.log2(entry.snippetsSung + 1)) : entry.score}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== FEATURE #17: HIGHLIGHT ROW =====================

function HighlightRow({
  icon, label, playerId, detail, score, players, flop = false,
}: {
  icon: string;
  label: string;
  playerId?: string;
  detail?: string;
  score?: number;
  players: MedleyPlayer[];
  flop?: boolean;
}) {
  const { t } = useTranslation();
  const player = playerId ? players.find(p => p.id === playerId) : null;

  return (
    <div className={`flex items-center gap-2 text-sm ${flop ? 'opacity-60' : ''}`}>
      <span className="text-base">{icon}</span>
      <span className="text-white/60 w-28 flex-shrink-0">{label}</span>
      {player ? (
        <span className="font-medium" style={{ color: player.color }}>{player.name}</span>
      ) : (
        <span className="text-white/40">—</span>
      )}
      <span className="text-white/40 text-xs truncate flex-1">{detail}</span>
      {score !== undefined && (
        <span className={`font-bold text-xs ${flop ? 'text-red-400' : 'text-green-400'}`}>
          {score > 0 ? '+' : ''}{score}
        </span>
      )}
      {flop && (
        <span className="text-xs text-white/30 italic">{t('medley.flopComment')}</span>
      )}
    </div>
  );
}

// ===================== FEATURE #17: SHARE BUTTON =====================

function ShareButton({
  players, winner, settings,
}: {
  players: MedleyPlayer[];
  winner: { name: string; score: number } | null;
  settings: MedleySettings;
}) {
  const { t } = useTranslation();

  const handleShare = useCallback(() => {
    if (!winner) return;

    const bestCombo = Math.max(...players.map(p => p.maxCombo));
    const text = `🎵 Medley Contest!\n🏆 Gewinner: ${winner.name} (${winner.score} Pkt)\n🔥 Beste Combo: ${bestCombo}x\n${t('medley.shareText')}`;

    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: t('medley.copied'),
        description: '📋',
      });
    }).catch(() => {
      // Fallback: silently ignore
    });
  }, [winner, players, t]);

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className="w-full py-2 border-white/20 text-white/60 hover:text-white text-sm"
    >
      📋 {t('medley.shareResult')}
    </Button>
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
function PlayerStandingRow({ player, rank, isTeam, isMVP = false }: { player: MedleyPlayer; rank: number; isTeam: boolean; isMVP?: boolean }) {
  const { t } = useTranslation();
  const totalNotes = player.notesHit + player.notesMissed;
  const accuracy = totalNotes > 0 ? Math.round((player.notesHit / totalNotes) * 100) : 0;

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
          <div className="font-medium text-sm">
            {player.name}
            {player.isEliminated && <span className="ml-2 text-red-400">💀 {t('medley.eliminated')}</span>}
            {isMVP && <span className="ml-2 text-amber-400">🏅 {t('medley.mvpAward')}</span>}
          </div>
          <div className="text-xs text-white/40">
            {t('medley.hitsOf').replace('{n}', String(player.notesHit))} · {t('medley.missOf').replace('{n}', String(player.notesMissed))} · {t('medley.accuracy')}: {accuracy}%
            {isTeam && <span> · {player.team === 0 ? t('medley.teamA') : t('medley.teamB')}</span>}
          </div>
        </div>
      </div>
      <div className="text-lg font-bold text-purple-400">{player.score}</div>
    </div>
  );
}
