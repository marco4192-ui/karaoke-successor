'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getPlayerPlacements,
  getFanFavorites,
  type TournamentBracket,
  type TournamentPlayer,
} from '@/lib/game/tournament';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

// #7 Tournament Results Screen
interface TournamentResultsProps {
  bracket: TournamentBracket;
  onBack: () => void;
  onNewTournament: () => void;
}

export function TournamentResultsScreen({ bracket, onBack, onNewTournament }: TournamentResultsProps) {
  const { t } = useTranslation();
  const placements = useMemo(() => getPlayerPlacements(bracket), [bracket]);
  const party = usePartyStore();

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (party.tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, party.tournamentCrowdVotes);
  }, [bracket, party.tournamentCrowdVotes]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="text-3xl font-bold text-amber-400">{t('tournament.resultsTitle')}</h1>
        <p className="text-white/60">{t('tournament.resultsSubtitle')}</p>
      </div>

      {/* Podium — Top 3 */}
      {placements.length >= 2 && (
        <div className="flex items-end justify-center gap-3 mb-6">
          {/* 2nd place */}
          {placements[1] && (
            <div className="text-center flex-1 max-w-[140px]">
              <div className="text-3xl mb-1">🥈</div>
              <PlayerResultCard placement={placements[1]} t={t} />
            </div>
          )}
          {/* 1st place */}
          {placements[0] && (
            <div className="text-center flex-1 max-w-[160px]">
              <div className="text-4xl mb-1">🥇</div>
              <PlayerResultCard placement={placements[0]} t={t} highlight />
            </div>
          )}
          {/* 3rd place */}
          {placements[2] && (
            <div className="text-center flex-1 max-w-[140px]">
              <div className="text-3xl mb-1">🥉</div>
              <PlayerResultCard placement={placements[2]} t={t} />
            </div>
          )}
        </div>
      )}

      {/* Full standings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('tournament.fullStandings')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {placements.map(p => (
              <div key={p.player.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.placement === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                <div className="w-8 text-center font-bold text-white/60">#{p.placement}</div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                  style={{ backgroundColor: p.player.color }}>
                  {p.player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate">{p.player.name}</span>
                </div>
                <div className="text-right text-xs text-white/50">
                  <div>{p.totalScore} {t('tournament.points')}</div>
                  <div>{p.totalAccuracy.toFixed(1)}% {t('tournament.accuracy').toLowerCase()}</div>
                  <div>{p.matchesWon}W / {p.matchesLost}L</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Match history highlights */}
      {(() => {
        const completedMatches = bracket.matches.filter(m => m.completed && !m.isBye);
        const tiebreaks = completedMatches.filter(m => m.isTiebreak);
        const highScores = [...completedMatches].sort((a, b) => Math.max(b.score1, b.score2) - Math.max(a.score1, a.score2)).slice(0, 3);
        return (
          (tiebreaks.length > 0 || highScores.length > 0) && (
            <Card className="bg-white/5 border-white/10 mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{t('tournament.highlights')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tiebreaks.length > 0 && (
                  <div className="text-sm">
                    <span className="text-orange-400">⚡ {t('tournament.tiebreakMatches')}: </span>
                    {tiebreaks.map(m => (
                      <span key={m.id} className="text-white/60">
                        {m.player1?.name} vs {m.player2?.name} ({m.winner?.name} {t('tournament.won')})
                      </span>
                    )).reduce((prev, curr, i) => <>{prev}{i > 0 && ', '}{curr}</>, <></>)}
                  </div>
                )}
                {highScores.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm text-white/60">
                    <span>{i === 0 ? '🔥' : i === 1 ? '⚡' : '✨'}</span>
                    <span>{m.player1?.name} {m.score1} - {m.score2} {m.player2?.name}</span>
                    {m.songTitle && <span className="text-white/30">({m.songTitle})</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        );
      })()}

      {/* #10 Fan Favorites — Spectator Crowd Vote Results */}
      {fanFavorites.length > 0 && (
        <Card className="bg-gradient-to-br from-rose-500/5 to-pink-500/5 border-rose-500/20 mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('tournament.fanFavoriteTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fanFavorites.slice(0, 5).map((fav, i) => (
                <div key={fav.playerId} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5'}`}>
                  <div className="w-8 text-center text-lg">{i === 0 ? '❤️' : i === 1 ? '🧡' : i === 2 ? '💛' : `#${i + 1}`}</div>
                  <div className="flex-1">
                    <span className="font-medium">{fav.playerName}</span>
                    <span className="text-xs text-white/40 ml-2">({fav.matchesVoted} {t('tournament.matchesVoted')})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-400">{fav.totalVotes}</span>
                    <span className="text-xs text-white/40 ml-1">{t('tournament.votes')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 border-white/20"
        >
          ← {t('tournament.backToBracket')}
        </Button>
        <Button
          onClick={onNewTournament}
          className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
        >
          {t('tournament.newTournament')}
        </Button>
      </div>
    </div>
  );
}

// Player result card for podium display
function PlayerResultCard({ placement, t, highlight }: { placement: { player: TournamentPlayer; totalScore: number; totalAccuracy: number; matchesWon: number; matchesLost: number }; t: (_key: string) => string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-white/5 border border-white/10'}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: placement.player.color }}>
          {placement.player.name.charAt(0).toUpperCase()}
        </div>
        <span className={`font-bold ${highlight ? 'text-amber-400' : ''}`}>{placement.player.name}</span>
      </div>
      <div className="text-xs text-white/50 space-y-0.5">
        <div>{placement.totalScore} {t('tournament.points')}</div>
        <div>{placement.totalAccuracy.toFixed(1)}% {t('tournament.accuracy').toLowerCase()}</div>
      </div>
    </div>
  );
}
