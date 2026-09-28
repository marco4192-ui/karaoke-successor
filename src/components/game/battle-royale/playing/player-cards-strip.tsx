'use client';

/**
 * Player cards strip (layout section 2) — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): flex-wrap badges with avatar,
 * AnimatedNumber score, leader crown, combo + per-player mic indicators and
 * the 6.4 blinking-X / R19 showdown highlighting.
 */
import type { BattleRoyalePlayer } from '@/lib/game/battle-royale';
import type { PitchDetectionResult } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import { AnimatedNumber } from './animated-number';

export interface PlayerCardsStripProps {
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  blinkEliminatedId: string | null;
  isDanger: (player: BattleRoyalePlayer) => boolean;
  isInShowdown: (player: BattleRoyalePlayer) => boolean;
  isLowest: (player: BattleRoyalePlayer) => boolean;
  playerPitchMap: Map<string, PitchDetectionResult | null>;
  multiPitchErrors: Map<string, string>;
}

export function PlayerCardsStrip({
  sortedPlayers,
  activePlayers,
  blinkEliminatedId,
  isDanger,
  isInShowdown,
  isLowest,
  playerPitchMap,
  multiPitchErrors,
}: PlayerCardsStripProps) {
  const { t } = useTranslation();

  // V5: Multi-pitch mic status — count players whose pitch detector is initialized
  const activeMicPlayers = activePlayers.filter(p => p.playerType === 'microphone');

  return (
    <>
      {/* ─────────── 2. PLAYER CARDS STRIP (flex-wrap) ─────────── */}
      {/* Item 8: pt-4 (added) — moves the player badges bar slightly DOWN,
          away from the top HUD (timer bar + round info). */}
      <div className="flex-shrink-0 px-3 pt-4 pb-1 overflow-y-auto max-h-[140px]">
        <div className="flex flex-wrap gap-1.5">
          {sortedPlayers.map((player) => {
            const danger = isDanger(player);
            const lowest = isLowest(player);
            const eliminated = player.eliminated;
            // 6.4: blinking-X phase right after the elimination became visible
            const justEliminated = eliminated && blinkEliminatedId === player.id;
            // R19: this player is battling the tie-break showdown
            const inShowdown = isInShowdown(player);
            const isLeader = !eliminated && sortedPlayers[0]?.id === player.id && sortedPlayers[0]?.score > 0;

            return (
              <div
                key={player.id}
                className={`
                  relative flex items-center gap-1.5 rounded-lg p-1.5 transition-all duration-500
                  ${justEliminated
                    ? 'bg-red-500/25 border-2 border-red-500 shadow-lg shadow-red-500/30'
                    : eliminated
                    ? 'bg-white/5 grayscale opacity-30 scale-90 pointer-events-none'
                    : inShowdown
                      ? 'bg-amber-500/20 border-2 border-amber-400 animate-pulse scale-105 shadow-lg shadow-amber-500/30'
                      : danger
                        ? 'bg-red-500/20 border-2 border-red-500 animate-pulse scale-105 shadow-lg shadow-red-500/30'
                        : lowest
                          ? 'bg-gradient-to-br from-red-500/15 to-pink-500/15 border border-red-500/40'
                          : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                  }
                `}
                style={{ minWidth: '100px', flex: '1 1 120px', maxWidth: '180px' }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className={`rounded-full object-cover border-2 ${
                        inShowdown ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{ width: '32px', height: '32px' }}
                    />
                  ) : (
                    <div
                      className={`rounded-full flex items-center justify-center text-white font-bold border-2 ${
                        inShowdown ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: eliminated ? '#444' : player.color,
                        fontSize: '13px',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center"
                    style={{ fontSize: '8px' }}>
                    {player.playerType === 'microphone' ? '🎤' : '📱'}
                  </div>
                  {/* R19: showdown contender indicator */}
                  {inShowdown && (
                    <div className="absolute -top-1 -left-1 text-[10px] animate-bounce">⚔️</div>
                  )}
                </div>

                {/* Name + Score column */}
                <div className="flex flex-col min-w-0 flex-1">
                  {/* Name */}
                  <div className={`text-[10px] font-medium truncate ${
                    inShowdown ? 'text-amber-200' : eliminated ? 'text-white/30' : 'text-white/80'
                  }`}>
                    {player.name}
                  </div>

                  {/* Score (R19: round points — every round starts at 0) */}
                  <div className="flex items-center gap-0.5">
                    <div className={`font-bold text-xs ${
                      eliminated
                        ? 'text-white/20'
                        : inShowdown
                          ? 'text-amber-300'
                          : lowest
                            ? 'text-red-300'
                            : 'text-white'
                    }`}
                    style={isLeader ? { textShadow: '0 0 10px rgba(250,204,21,0.5)' } : undefined}
                    >
                      <AnimatedNumber value={player.score} />
                      {isLeader && <span className="ml-0.5 text-yellow-400 text-[9px]">👑</span>}
                    </div>
                  </div>

                  {/* Bottom info row */}
                  <div className="flex items-center gap-1">
                    {/* Combo indicator */}
                    {!eliminated && player.currentCombo > 2 && (
                      <span className="text-[8px] text-amber-400">
                        🔥{player.currentCombo}
                      </span>
                    )}

                    {/* Multi-pitch: per-player mic singing indicator */}
                    {!eliminated && player.playerType === 'microphone' && activeMicPlayers.length >= 2 && (() => {
                      const pp = playerPitchMap.get(player.id);
                      const hasError = multiPitchErrors.has(player.id);
                      if (hasError) return <span className="text-[8px] text-red-400">{t('battleRoyale.micError')}</span>;
                      if (pp && pp.isSinging && pp.note != null) return <span className="text-[8px] text-green-400">🎤●</span>;
                      if (pp && pp.volume > 0.01) return <span className="text-[8px] text-yellow-400">🎤○</span>;
                      return <span className="text-[8px] text-white/20">🎤</span>;
                    })()}
                  </div>
                </div>

                {/* Eliminated overlay — 6.4: blinking red X right after the
                    elimination (brElimBlink keyframes, 6 × 0.45s), static
                    faded X afterwards. */}
                {eliminated && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={justEliminated
                        ? 'text-3xl font-black text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                        : 'text-xl text-red-500/60'}
                      style={justEliminated ? { animation: 'brElimBlink 0.45s ease-in-out 6' } : undefined}
                      aria-label={justEliminated ? `${player.name}: Eliminated` : undefined}
                    >
                      ✕
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
