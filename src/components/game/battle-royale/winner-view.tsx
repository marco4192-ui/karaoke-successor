'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BattleRoyalePlayer,
  BattleRoyaleGameStats,
  getHallOfFame,
  HallOfFameEntry,
} from '@/lib/game/battle-royale';
import { useTranslation } from '@/lib/i18n/translations';

interface WinnerViewProps {
  winner: NonNullable<import('@/lib/game/battle-royale').BattleRoyaleGame['winner']>;
  eliminationOrder: BattleRoyalePlayer[];
  gameStats: BattleRoyaleGameStats;
  onEndGame: () => void;
}

export function WinnerView({ winner, eliminationOrder, gameStats, onEndGame }: WinnerViewProps) {
  const { t } = useTranslation();
  const [showStats, setShowStats] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);

  useEffect(() => {
    setHallOfFame(getHallOfFame());
  }, []);

  return (
    <div className="max-w-5xl mx-auto text-center">
      {/* Winner Celebration */}
      <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-12">
        <div className="text-8xl mb-6 animate-bounce">👑</div>
        <h1 className="text-4xl font-bold text-amber-400 mb-4">{t('battleRoyale.winner')}</h1>
        <div className="flex items-center justify-center gap-4 mb-6">
          {winner.avatar ? (
            <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full object-cover border-4 border-amber-500" />
          ) : (
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-amber-500"
              style={{ backgroundColor: winner.color }}
            >
              {winner.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-5xl font-bold">{winner.name}</span>
          <Badge className={`${winner.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'} text-lg px-3 py-1`}>
            {winner.playerType === 'microphone' ? t('battleRoyale.mic') : t('battleRoyale.companion')}
          </Badge>
        </div>
        <div className="text-xl text-white/60 mb-8">
          {t('battleRoyale.finalScore').replace('{n}', String(winner.score.toLocaleString()))}
        </div>

        <div className="flex justify-center gap-3">
          <Button
            onClick={onEndGame}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-4 text-xl"
          >
            {t('battleRoyale.returnToMenu')}
          </Button>
          <Button
            onClick={() => setShowStats(!showStats)}
            variant="outline"
            className="border-white/20 text-white/60"
          >
            {showStats ? t('battleRoyale.hideStats') : t('battleRoyale.showStats')}
          </Button>
          <Button
            onClick={() => setShowHallOfFame(!showHallOfFame)}
            variant="outline"
            className="border-amber-500/40 text-amber-400/80"
          >
            {showHallOfFame ? t('battleRoyale.hideHallOfFame') : t('battleRoyale.showHallOfFame')}
          </Button>
        </div>
      </div>

      {/* #12 Detailed Game Statistics */}
      {showStats && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">{t('battleRoyale.gameStatistics')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold text-amber-400">{gameStats.highestCombo}🔥</div>
                <div className="text-xs text-white/40 mt-1">{t('battleRoyale.highestCombo')}</div>
                {gameStats.highestComboPlayerId && (
                  <div className="text-xs text-white/30 mt-0.5">
                    {eliminationOrder.find(p => p.id === gameStats.highestComboPlayerId)?.name}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold text-green-400">{gameStats.longestSurvival}</div>
                <div className="text-xs text-white/40 mt-1">{t('battleRoyale.longestSurvival')}</div>
                {gameStats.longestSurvivalPlayerId && (
                  <div className="text-xs text-white/30 mt-0.5">
                    {eliminationOrder.find(p => p.id === gameStats.longestSurvivalPlayerId)?.name}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{gameStats.bestSingleRoundDelta.toLocaleString()}</div>
                <div className="text-xs text-white/40 mt-1">{t('battleRoyale.bestRoundScore')}</div>
                {gameStats.bestSingleRoundDeltaPlayerId && (
                  <div className="text-xs text-white/30 mt-0.5">
                    {eliminationOrder.find(p => p.id === gameStats.bestSingleRoundDeltaPlayerId)?.name}
                    {' '}(R{gameStats.bestSingleRoundDeltaRound})
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold text-cyan-400">{gameStats.totalNotesHit}</div>
                <div className="text-xs text-white/40 mt-1">{t('battleRoyale.totalNotesHit')}</div>
                <div className="text-xs text-red-300 mt-0.5">
                  {gameStats.totalNotesMissed} {t('battleRoyale.misses')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Round Highlights */}
          {gameStats.roundHighlights.length > 0 && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('battleRoyale.roundHighlights')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {gameStats.roundHighlights.map((highlight) => (
                      <div key={highlight.roundNumber} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm">
                        <Badge variant="outline" className="border-white/20 text-white/40 shrink-0">
                          R{highlight.roundNumber}
                        </Badge>
                        {highlight.eliminatedPlayerId ? (
                          <>
                            <span className="text-red-400">{highlight.eliminatedPlayerName}</span>
                            <span className="text-white/20">{t('battleRoyale.eliminatedShort')}</span>
                          </>
                        ) : (
                          <span className="text-amber-400">{t('battleRoyale.finalRound')}</span>
                        )}
                        <span className="text-white/20">|</span>
                        <span className="text-green-400">⭐ {highlight.topScorerName}: +{highlight.topScoreDelta.toLocaleString()}</span>
                        {highlight.bountyClaimed && highlight.bountyClaimedById && (
                          <Badge className="bg-amber-500/20 text-amber-400 text-xs shrink-0">🎯</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* #12 Hall of Fame */}
      {showHallOfFame && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">🏆 {t('battleRoyale.hallOfFame')}</h2>
          {hallOfFame.length === 0 ? (
            <p className="text-white/40">{t('battleRoyale.noHallOfFame')}</p>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {hallOfFame.map((entry, index) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      entry.playerId === winner.id
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="text-lg font-bold text-white/30 w-6 text-center">#{index + 1}</div>
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: entry.playerColor }}
                      >
                        {entry.playerName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{entry.playerName}</div>
                      <div className="flex gap-2 text-xs text-white/40">
                        <span>{entry.wins} {t('battleRoyale.wins')}</span>
                        <span>{entry.totalGames} {t('battleRoyale.games')}</span>
                        <span>{t('battleRoyale.avgSurvival')}: {entry.averageSurvivalRounds}R</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400">{entry.bestScore.toLocaleString()}</div>
                      {entry.longestWinStreak > 1 && (
                        <div className="text-xs text-amber-400/60">🔥{entry.longestWinStreak}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* Elimination Order */}
      {!showStats && !showHallOfFame && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">{t('battleRoyale.eliminationOrder')}</h2>
          <ScrollArea className="h-64">
            <div className="flex justify-center gap-3 flex-wrap">
              {eliminationOrder.map((player, index) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg ${player.id === winner?.id ? 'bg-amber-500/20 border border-amber-500' : 'bg-white/5'}`}
                >
                  <div className="text-sm text-white/40 mb-1">#{index + 1}</div>
                  <div className="flex items-center gap-2">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{player.name}</span>
                    <span className="text-lg">
                      {player.playerType === 'microphone' ? '🎤' : '📱'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
