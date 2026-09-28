'use client';

/**
 * Tournament bracket view — extracted 1:1 from tournament-screen.tsx (task R12):
 * TournamentBracketView (compact header badges, champion display, next-match
 * preview bar, scaled bracket area, fan favorites, manual-winner dialog, match
 * abort dialog) + its NextPlayerChip helper, with the TournamentBracketViewProps
 * interface. Bracket data comes from useTournamentBracket (hooks/use-tournament.ts);
 * the double-elimination tree rendering lives in ./double-elimination-bracket.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, ArrowLeft } from 'lucide-react';
import {
  type TournamentBracket,
  type TournamentPlayer,
  type TournamentMatch,
} from '@/lib/game/tournament';
import { useTranslation } from '@/lib/i18n/translations';
import { TournamentBracketButterfly } from '@/components/game/tournament-bracket-butterfly';
import { MatchAbortDialog } from '@/components/game/match-abort-dialog';
import { useTournamentBracket } from '@/hooks/use-tournament';
import { DoubleEliminationBracketView } from './double-elimination-bracket';

// Tournament Bracket View Component
interface TournamentBracketViewProps {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (_match: TournamentMatch) => void;
  onManualWinner?: (_matchId: string, _winnerId: string) => void;
  onRepeatMatch?: () => void;
  matchAborted?: boolean;
  onAbortHandled?: () => void;
  shortMode: boolean;
  showResults?: boolean;
  onShowResults?: () => void;
  /** Bug 12c: opens the party-leave confirmation dialog (NOT an immediate
   *  exit) — tournament-game is an immersive screen with no NavBar, so the
   *  bracket view needs its own way back to the menu. */
  onLeaveToMenu?: () => void;
}

export function TournamentBracketView({ bracket, currentMatch, onPlayMatch, onManualWinner, onRepeatMatch, matchAborted, onAbortHandled, shortMode, showResults, onShowResults, onLeaveToMenu }: TournamentBracketViewProps) {
  const { t } = useTranslation();
  const {
    stats,
    playableMatches,
    nextMatch,
    effectiveDiff,
    showDiffBadge,
    isSeededByStrength,
    fanFavorites,
    bracketScale,
    availSize,
    manualWinnerMatch,
    bracketWrapperRef,
    bracketInnerRef,
    setManualWinnerMatch,
  } = useTournamentBracket(bracket, currentMatch, showResults);

  // #11 / Bug 12c: graceful fallback if the key is missing in a locale
  const backToMenuLabel = t('tournament.backToMainMenu');
  const backToMenuText = backToMenuLabel === 'tournament.backToMainMenu' ? 'Back to Main Menu' : backToMenuLabel;

  return (
    <div className="relative max-w-full mx-auto px-4 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
      {/* Bug 12c: "← Back to Main Menu" — tournament-game is an immersive
          screen (NavBar hidden), so without this button there is no visible
          way back. Opens the party-leave CONFIRMATION dialog, never an
          immediate exit. Small + unobtrusive in the top-left corner. */}
      {onLeaveToMenu && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLeaveToMenu}
          aria-label={backToMenuText}
          title={backToMenuText}
          className="absolute top-2 left-2 z-20 h-9 px-2.5 sm:px-3 text-xs text-white/50 hover:text-white/90 hover:bg-white/10"
          data-testid="tournament-back-to-menu"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline ml-1">{backToMenuText}</span>
        </Button>
      )}

      {/* Tournament Header — compact */}
      <div className="text-center mb-1 shrink-0">
        <h1 className="text-2xl font-bold mb-0.5">{t('tournament.bracketTitle')}</h1>
        <div className="flex items-center justify-center gap-3 text-white/60 text-sm">
          <span>{t('tournament.roundOfOf').replace('{n}', String(stats.currentRound)).replace('{m}', String(stats.totalRounds))}</span>
          <span>·</span>
          <span>{t('tournament.playersRemaining').replace('{n}', String(stats.remainingPlayers))}</span>
          {shortMode && <Badge className="bg-green-500/20 text-green-400 text-xs">60s</Badge>}
          {bracket.settings.tournamentType === 'double' && <Badge className="bg-purple-500/20 text-purple-400 text-xs">{t('tournament.doubleEliminationShort')}</Badge>}
          {bracket.grandFinalsResetNeeded && <Badge className="bg-red-500/20 text-red-400 text-xs">{t('tournament.grandFinalsReset')}</Badge>}
          {showDiffBadge && <Badge className="bg-orange-500/20 text-orange-400 text-xs">{t('tournament.' + effectiveDiff)}</Badge>}
          {bracket.settings.songSelectionMode === 'vote' && <Badge className="bg-pink-500/20 text-pink-400 text-xs">{t('tournament.songVote')}</Badge>}
          {isSeededByStrength && <Badge className="bg-indigo-500/20 text-indigo-400 text-xs">{t('tournament.seeded')}</Badge>}
          {fanFavorites.length > 0 && <Badge className="bg-rose-500/20 text-rose-400 text-xs">{t('tournament.crowdVoting')}</Badge>}
        </div>
      </div>

      {/* Champion Display — compact */}
      {bracket.champion && (
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-4 mb-2 text-center shrink-0">
          <div className="text-4xl mb-1">👑</div>
          <h2 className="text-xl font-bold text-amber-400 mb-1">{t('tournament.champion')}</h2>
          <div className="flex items-center justify-center gap-3">
            {bracket.champion.avatar ? (
              <img src={bracket.champion.avatar} alt={bracket.champion.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: bracket.champion.color }
              }>
                {bracket.champion.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-2xl font-bold">{bracket.champion.name}</span>
          </div>
          {onShowResults && (
            <Button
              onClick={onShowResults}
              className="mt-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-sm"
            >
              {t('tournament.viewResults')}
            </Button>
          )}
        </div>
      )}

      {/* Next Match Preview — slim single-row bar (frees vertical space for the bracket) */}
      {nextMatch && !bracket.champion && (
        <div className="mb-2 shrink-0 flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-pink-500/15 px-3 py-2">
          <span className="text-lg animate-pulse shrink-0" aria-hidden="true">🎤</span>
          <span className="hidden lg:block text-sm font-bold text-white/80 shrink-0">{t('tournament.nextDuel')}</span>
          <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
            <NextPlayerChip player={nextMatch.player1} />
            <span className="shrink-0 text-white/35 text-xs font-bold" aria-hidden="true">{t('tournament.vs')}</span>
            <NextPlayerChip player={nextMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(nextMatch)}
            size="sm"
            className="shrink-0 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
          >
            ▶ {t('tournament.startNextMatch')}
          </Button>
          {onManualWinner && nextMatch.player1 && nextMatch.player2 && (
            <Button
              onClick={() => setManualWinnerMatch(nextMatch)}
              variant="ghost"
              size="sm"
              title={t('matchAbort.setWinner')}
              aria-label={t('matchAbort.setWinner')}
              className="shrink-0 h-8 w-8 p-0 text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Crown className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}

      {/* Bracket — fills remaining space, auto-scaled and aligned to top */}
      <div ref={bracketWrapperRef} className="flex-1 min-h-0 overflow-hidden flex items-start justify-center pt-1">
        <div
          ref={bracketInnerRef}
          style={{ transform: `scale(${bracketScale})`, transformOrigin: 'top center' }}
        >
          {bracket.settings.tournamentType === 'double' ? (
            <DoubleEliminationBracketView
              bracket={bracket}
              currentMatch={currentMatch}
              onPlayMatch={onPlayMatch}
              playableMatches={playableMatches}
              t={t}
            />
          ) : (
            <TournamentBracketButterfly
              bracket={bracket}
              currentMatch={currentMatch}
              onPlayMatch={onPlayMatch}
              availSize={availSize}
            />
          )}
        </div>
      </div>

      {/* Fan Favorites — crowd vote results */}
      {fanFavorites.length > 0 && (
        <div className="mt-1 bg-gradient-to-r from-rose-500/10 to-pink-500/10 rounded-lg p-1.5 shrink-0">
          <h4 className="text-xs text-white/60 mb-1">{t('tournament.fanFavorites')}</h4>
          <div className="flex flex-wrap gap-1">
            {fanFavorites.slice(0, 5).map((fav, i) => (
              <div key={fav.playerId} className="bg-white/5 rounded px-2 py-0.5 text-xs border border-rose-500/20">
                <span className={i === 0 ? 'text-amber-400' : 'text-white/60'}>
                  {i === 0 ? '❤️' : `${i + 1}.`}
                </span>{' '}
                <span className={i === 0 ? 'text-amber-300 font-medium' : 'text-white/80'}>{fav.playerName}</span>
                <span className="text-rose-400/60 ml-1">{fav.totalVotes}{t('tournament.votes')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Winner Dialog — shown when user clicks "Set Winner Manually" from the bracket */}
      {manualWinnerMatch && onManualWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/15 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white">{t('matchAbort.selectWinner')}</h2>
              <p className="text-sm text-white/50 mt-1">
                {manualWinnerMatch.player1?.name} vs {manualWinnerMatch.player2?.name}
              </p>
            </div>
            <div className="space-y-3">
              {[manualWinnerMatch.player1, manualWinnerMatch.player2].map((player) => {
                if (!player) return null;
                return (
                  <Button
                    key={player.id}
                    onClick={() => {
                      onManualWinner(manualWinnerMatch.id, player.id);
                      setManualWinnerMatch(null);
                    }}
                    className="w-full py-4 text-sm bg-white/5 hover:bg-white/10 border border-white/20"
                  >
                    <span className="flex items-center gap-3 w-full">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{player.name}</span>
                      <span className="ml-auto text-amber-400">{t('matchAbort.asWinner')}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
            <Button
              onClick={() => setManualWinnerMatch(null)}
              variant="ghost"
              className="w-full mt-3 py-2 text-sm text-white/40 hover:text-white/60"
            >
              {t('matchAbort.back')}
            </Button>
          </div>
        </div>
      )}

      {/* Match Abort Dialog */}
      {matchAborted && currentMatch && onManualWinner && onRepeatMatch && onAbortHandled && (
        <MatchAbortDialog
          match={currentMatch}
          onManualWinner={(matchId, winnerId) => {
            onManualWinner(matchId, winnerId);
            onAbortHandled();
          }}
          onRepeatMatch={() => {
            onRepeatMatch();
            onAbortHandled();
          }}
          onDismiss={() => {
            onAbortHandled();
          }}
        />
      )}
    </div>
  );
}

// Player chip for the slim next-match preview bar
function NextPlayerChip({ player }: { player: TournamentPlayer | null }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className="flex items-center gap-1.5 min-w-0 px-1">
        <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" aria-hidden="true" />
        <span className="text-sm text-white/30 truncate">{t('tournament.tbd')}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 min-w-0 px-1">
      {player.avatar ? (
        <img src={player.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: player.color }}
          aria-hidden="true"
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-medium truncate">{player.name}</span>
    </div>
  );
}
