/**
 * Medley Contest — Round Results UI
 *
 * Feature #5: Score breakdown section
 * Feature #10: Elimination — elimination order display
 * Feature #17: Highlights — best snippet, best combo, biggest flop, surprise
 * Feature #18: Team bonuses — synergy, comeback, MVP
 */

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import type { MedleyPlayer, MedleySettings, MedleyRoundResult, MedleyHighlight, TeamBonusResult } from './medley-types';
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
            // Combo bonus based on max combo streak (avoids negative when scoring varies per hit)
            const comboBonus = player.maxCombo > 1 ? Math.round(player.maxCombo * 10) : 0;

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

export function ShareButton({
  players, winner, settings,
}: {
  players: MedleyPlayer[];
  winner: { name: string; score: number } | null;
  settings: MedleySettings;
}) {
  const { t } = useTranslation();

  const handleShare = useCallback(() => {
    if (!winner) return;

    // TODO: Show cumulative max combo across series rounds in share text
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
