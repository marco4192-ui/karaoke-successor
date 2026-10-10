'use client';

import { Badge } from '@/components/ui/badge';
import { BattleRoyalePlayer } from '@/lib/game/battle-royale';
import { useTranslation } from '@/lib/i18n/translations';

interface EliminationViewProps {
  eliminatedPlayer: BattleRoyalePlayer | undefined;
  remainingPlayersCount: number;
  bountyClaimed: boolean;
  bountyClaimedById: string | null;
  players: BattleRoyalePlayer[];
  roundScoreDeltas: Record<string, number>;
  isGrandFinale: boolean;
  grandFinaleWins: Record<string, number>;
  bestOf: number;
}

export function EliminationView({
  eliminatedPlayer,
  remainingPlayersCount,
  bountyClaimed,
  bountyClaimedById,
  players,
  roundScoreDeltas,
  isGrandFinale,
  grandFinaleWins,
  bestOf,
}: EliminationViewProps) {
  const { t } = useTranslation();
  const bountyClaimer = bountyClaimedById ? players.find(p => p.id === bountyClaimedById) : null;
  const winsNeeded = Math.ceil(bestOf / 2);
  const survivingPlayers = players.filter(p => !p.eliminated);

  // In grand finale: show round winner instead of eliminated player
  const isGrandFinaleRound = isGrandFinale && !eliminatedPlayer;
  const roundWinner = isGrandFinaleRound
    ? [...players].filter(p => !p.eliminated).sort((a, b) => (roundScoreDeltas[b.id] ?? 0) - (roundScoreDeltas[a.id] ?? 0))[0]
    : null;

  return (
    <div className="max-w-4xl mx-auto text-center animate-[fadeInScale_0.5s_ease-out_forwards]">
      <div className={`border-2 rounded-xl p-12 ${
        isGrandFinaleRound
          ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500'
          : 'bg-gradient-to-r from-red-500/30 to-pink-500/30 border-red-500'
      }`}>
        {/* #10 Dramatic elimination camera effects */}
        <div className="relative">
          {/* Background pulse effect */}
          <div className={`absolute inset-0 rounded-xl ${isGrandFinaleRound ? 'bg-amber-500/5' : 'bg-red-500/5'} animate-ping`} style={{ animationDuration: '2s' }} />

          <div className="relative">
            {!isGrandFinaleRound ? (
              <>
                <div className="text-6xl mb-6 animate-bounce">💔</div>
                <h1 className="text-3xl font-bold text-red-400 mb-4">{t('battleRoyale.eliminated')}</h1>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6 animate-bounce">⭐</div>
                <h1 className="text-3xl font-bold text-amber-400 mb-4">{t('battleRoyale.roundWinner')}</h1>
              </>
            )}

            {/* Player card with "look up and turn gray" animation */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {((eliminatedPlayer ?? roundWinner)?.avatar) ? (
                  <div className="relative">
                    <img
                      src={(eliminatedPlayer ?? roundWinner)?.avatar}
                      alt={(eliminatedPlayer ?? roundWinner)?.name}
                      className="w-24 h-24 rounded-full object-cover border-4 transition-all duration-1000"
                      style={{
                        borderColor: isGrandFinaleRound ? '#f59e0b' : '#ef4444',
                        filter: isGrandFinaleRound ? 'none' : 'grayscale(100%)',
                        opacity: isGrandFinaleRound ? 1 : 0.5,
                        transform: isGrandFinaleRound ? 'none' : 'rotateX(15deg)',
                      }}
                    />
                    {!isGrandFinaleRound && (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-70">😢</div>
                    )}
                  </div>
                ) : (
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 transition-all duration-1000"
                    style={{
                      borderColor: isGrandFinaleRound ? '#f59e0b' : '#ef4444',
                      backgroundColor: isGrandFinaleRound ? (roundWinner?.color ?? '#666') : '#666',
                      filter: isGrandFinaleRound ? 'none' : 'grayscale(100%)',
                      opacity: isGrandFinaleRound ? 1 : 0.5,
                      transform: isGrandFinaleRound ? 'none' : 'rotateX(15deg)',
                    }}
                  >
                    {(eliminatedPlayer ?? roundWinner)?.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {!isGrandFinaleRound && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl text-red-500 opacity-80 animate-pulse">✕</div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-white/50">{(eliminatedPlayer ?? roundWinner)?.name}</span>
                <Badge className={`${(eliminatedPlayer ?? roundWinner)?.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
                  {(eliminatedPlayer ?? roundWinner)?.playerType === 'microphone' ? '🎤' : '📱'}
                </Badge>
              </div>

              <p className="text-white/40 text-lg">
                {(() => {
                  const displayPlayer = roundWinner ?? eliminatedPlayer;
                  const score = displayPlayer ? (roundScoreDeltas[displayPlayer.id] ?? 0) : 0;
                  return t('battleRoyale.roundScore').replace('{n}', score.toLocaleString());
                })()}
              </p>

              {eliminatedPlayer?.eliminationRound && (
                <p className="text-white/30 text-sm mt-2">
                  {t('battleRoyale.eliminatedInRound').replace('{n}', String(eliminatedPlayer.eliminationRound))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* V12 Surviving Players */}
        {!isGrandFinaleRound && eliminatedPlayer && survivingPlayers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-emerald-500/20">
            <h2 className="text-lg font-bold text-emerald-400 mb-4">
              {t('battleRoyale.survivedPlayers')}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 justify-center flex-wrap">
              {survivingPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex flex-col items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 min-w-[100px] shadow-[0_0_12px_rgba(34,197,94,0.15)] animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="relative">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-emerald-500/50"
                        style={{ backgroundColor: player.color ?? '#22c55e' }}
                      >
                        {player.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-emerald-700">
                      ✓
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white/80 truncate max-w-[90px]">{player.name}</span>
                  <span className="text-xs text-white/50">{player.score.toLocaleString()}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0">
                    {t('battleRoyale.survived')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* #6 Bounty Claimed notification */}
        {bountyClaimed && bountyClaimer && (
          <div className="mt-4 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-lg p-3 animate-fade-in">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="text-amber-400 font-bold">{t('battleRoyale.bountyClaimed')}</span>
            </div>
            <p className="text-white/60 text-sm mt-1">
              {bountyClaimer.name} — ×{t('battleRoyale.bountyMultiplierApplied')}
            </p>
          </div>
        )}

        {/* Grand Finale round score summary */}
        {isGrandFinale && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
            <h3 className="text-sm font-bold text-white/60 mb-2">{t('battleRoyale.grandFinaleScore')}</h3>
            <div className="flex justify-center gap-6">
              {players.filter(p => !p.eliminated).map(p => (
                <div key={p.id} className="text-center">
                  <div className="text-xs text-white/40">{p.name}</div>
                  <div className="text-lg font-bold">{roundScoreDeltas[p.id] ?? 0}</div>
                  <div className="flex gap-1 mt-1 justify-center">
                    {Array.from({ length: winsNeeded }).map((_, i) => (
                      <span key={i} className={`text-sm ${i < (grandFinaleWins[p.id] || 0) ? 'text-amber-400' : 'text-white/20'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    {grandFinaleWins[p.id] ?? 0}/{winsNeeded}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining players count */}
        {!isGrandFinaleRound && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/60">
              <span className="text-amber-400 font-bold">{remainingPlayersCount}</span> {t('battleRoyale.playersRemaining').replace('{n}', String(remainingPlayersCount)).split(' ').slice(1).join(' ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
