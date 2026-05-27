'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  getBattleRoyaleStats,
  submitPrediction,
  getSpectators,
} from '@/lib/game/battle-royale';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

interface RoundSetupViewProps {
  game: BattleRoyaleGame;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  activePlayers: BattleRoyalePlayer[];
  onStartRound: () => void;
  onUpdateGame: (_game: BattleRoyaleGame) => void;
  onBack?: () => void;
}

export function RoundSetupView({ game, stats, activePlayers, onStartRound, onUpdateGame, onBack }: RoundSetupViewProps) {
  const { t } = useTranslation();
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);
  const [showSpectatorPanel, setShowSpectatorPanel] = useState(false);

  const handleBack = () => {
    if (onBack) {
      setPauseDialogAction('party-leave');
    }
  };

  const spectators = useMemo(() => getSpectators(game), [game]);
  const hasSpectators = spectators.length > 0;

  // #4 Grand Finale display
  const isGrandFinale = game.isGrandFinale;
  const winsNeeded = stats.winsNeeded;

  return (
    <div className="max-w-5xl mx-auto text-center">
      <div className="text-left mb-4">
        <Button variant="ghost" onClick={handleBack} className="text-white/60">
          {t('battleRoyale.back')}
        </Button>
      </div>

      {/* Round Title */}
      {isGrandFinale ? (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">
            🏆 {t('battleRoyale.grandFinaleRound').replace('{n}', String(game.currentRound + 1))}
          </h1>
          <p className="text-amber-400/60">
            {t('battleRoyale.bestOf').replace('{n}', String(game.settings.grandFinaleBestOf))} — {t('battleRoyale.firstTo').replace('{n}', String(winsNeeded))}
          </p>
          {/* Final wins display */}
          <div className="flex justify-center gap-8 mt-4">
            {activePlayers.map(p => (
              <div key={p.id} className="flex flex-col items-center gap-1">
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border-2 border-amber-500" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 border-amber-500" style={{ backgroundColor: p.color }}>
                    {p.name.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-sm">{p.name}</span>
                <div className="flex gap-1">
                  {Array.from({ length: winsNeeded }).map((_, i) => (
                    <span key={i} className={`text-xl ${i < (game.finalWins[p.id] || 0) ? 'text-amber-400' : 'text-white/20'}`}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-xs text-white/40">{game.finalWins[p.id] ?? 0}/{winsNeeded}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-2">{t('battleRoyale.roundSetup').replace('{n}', String(game.currentRound + 1))}</h1>
          <p className="text-white/60 mb-6">
            {stats.activeMicPlayers} {t('battleRoyale.mic')} + {stats.activeCompanionPlayers} {t('battleRoyale.companion')} = {activePlayers.length} {t('battleRoyale.playersSelected')}
          </p>
        </>
      )}

      {/* #7 Difficulty & #8 Shrinking Timer info */}
      <div className="flex justify-center gap-3 mb-4">
        {game.settings.escalatingDifficulty && (
          <Badge variant="outline" className="border-green-500/40 text-green-400 text-xs">
            📈 {t('battleRoyale.escalatingDifficulty')}: {stats.effectiveDifficulty.toUpperCase()}
          </Badge>
        )}
        {game.settings.shrinkingTimer && (
          <Badge variant="outline" className="border-orange-500/40 text-orange-400 text-xs">
            ⏱️ {t('battleRoyale.shrinkingTimer')}
          </Badge>
        )}
        {game.settings.bountyEnabled && !isGrandFinale && stats.bountyPlayerId && (
          <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">
            🎯 {t('battleRoyale.bountyActive')}
          </Badge>
        )}
      </div>

      {/* Player Grid - Split by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mic Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🎤</span> {t('battleRoyale.localMicrophone')} ({stats.activeMicPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {game.players.filter(p => p.playerType === 'microphone').map(player => (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl transition-all ${
                    player.eliminated
                      ? 'grayscale opacity-30 scale-75'
                      : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
                  }`}
                >
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-2" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2"
                      style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="font-bold text-sm">{player.name}</div>
                  {player.eliminated ? (
                    <div className="text-xs text-red-400">{t('battleRoyale.eliminatedRound').replace('{n}', String(player.eliminationRound))}</div>
                  ) : (
                    <div className="text-xs text-white/60">{player.score.toLocaleString()} {t('game.pts')}</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Companion Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📱</span> {t('battleRoyale.companionApp')} ({stats.activeCompanionPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-2">
                {game.players.filter(p => p.playerType === 'companion').map(player => (
                  <div
                    key={player.id}
                    className={`p-2 rounded-lg transition-all ${
                      player.eliminated
                        ? 'grayscale opacity-30 scale-90'
                        : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{player.name}</div>
                        {player.eliminated ? (
                          <div className="text-xs text-red-400">{t('battleRoyale.out')}</div>
                        ) : (
                          <div className="text-xs text-white/40">{player.score.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* #11 Spectator Prediction Panel */}
      {hasSpectators && (
        <Card className="bg-white/5 border-white/10 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 cursor-pointer" onClick={() => setShowSpectatorPanel(!showSpectatorPanel)}>
              <span>👁️</span> {t('battleRoyale.spectatorLounge')} ({spectators.length})
              <span className="text-xs text-white/40">{showSpectatorPanel ? '▲' : '▼'}</span>
            </CardTitle>
          </CardHeader>
          {showSpectatorPanel && (
            <CardContent>
              <p className="text-sm text-white/40 mb-3">{t('battleRoyale.spectatorDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {spectators.map(spectator => (
                  <SpectatorPredictionCard
                    key={spectator.id}
                    spectator={spectator}
                    activePlayers={activePlayers}
                    game={game}
                    correctPredictions={game.correctPredictions[spectator.id] ?? 0}
                    onUpdateGame={onUpdateGame}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Start Button */}
      <Button
        onClick={onStartRound}
        className={`px-12 py-6 text-xl ${
          isGrandFinale
            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400'
            : 'bg-gradient-to-r from-red-500 to-pink-500'
        }`}
      >
        {isGrandFinale
          ? t('battleRoyale.startFinalRound').replace('{n}', String(game.currentRound + 1))
          : t('battleRoyale.startRound').replace('{n}', String(game.currentRound + 1))
        }
      </Button>
    </div>
  );
}

// Spectator prediction sub-component
function SpectatorPredictionCard({
  spectator,
  activePlayers,
  game,
  correctPredictions,
  onUpdateGame,
}: {
  spectator: BattleRoyalePlayer;
  activePlayers: BattleRoyalePlayer[];
  game: BattleRoyaleGame;
  correctPredictions: number;
  onUpdateGame: (_game: BattleRoyaleGame) => void;
}) {
  const { t } = useTranslation();
  const [prediction, setPrediction] = useState<string | null>(
    game.spectatorPredictions[spectator.id] ?? null
  );

  const handlePredict = (playerId: string) => {
    const newPrediction = prediction === playerId ? null : playerId;
    setPrediction(newPrediction);
    const updatedGame = submitPrediction(game, spectator.id, newPrediction);
    onUpdateGame(updatedGame);
  };

  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        {spectator.avatar ? (
          <img src={spectator.avatar} alt={spectator.name} className="w-6 h-6 rounded-full object-cover grayscale" />
        ) : (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs grayscale"
            style={{ backgroundColor: '#666' }}
          >
            {spectator.name.charAt(0)}
          </div>
        )}
        <span className="text-sm text-white/50">{spectator.name}</span>
        {correctPredictions > 0 && (
          <Badge className="bg-green-500/20 text-green-400 text-xs ml-auto">{correctPredictions} ✓</Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {activePlayers.map(p => (
          <button
            key={p.id}
            onClick={() => handlePredict(p.id)}
            className={`px-2 py-0.5 text-xs rounded transition-all ${
              prediction === p.id
                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
