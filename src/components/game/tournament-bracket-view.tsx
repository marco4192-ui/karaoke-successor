'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getPlayableMatches,
  getTournamentStats,
  getPlayerPlacements,
  addToHallOfFame,
  getEffectiveDifficulty,
  getFanFavorites,
  getMatchesByBracketType,
  getLBRoundName,
  type TournamentBracket,
  type TournamentPlayer,
  type TournamentMatch,
} from '@/lib/game/tournament';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { TournamentBracketButterfly } from '@/components/game/tournament-bracket-butterfly';
import { MatchAbortDialog } from '@/components/game/match-abort-dialog';

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
}

export function TournamentBracketView({ bracket, currentMatch, onPlayMatch, onManualWinner, onRepeatMatch, matchAborted, onAbortHandled, shortMode, showResults, onShowResults }: TournamentBracketViewProps) {
  const { t } = useTranslation();
  const stats = getTournamentStats(bracket);
  const party = usePartyStore();

  // Get next match to play
  const playableMatches = getPlayableMatches(bracket);
  const nextMatch = playableMatches[0] || null;

  // #6 Dynamic difficulty indicator
  const effectiveDiff = getEffectiveDifficulty(
    bracket.settings.difficulty,
    bracket.currentRound,
    bracket.totalRounds,
    bracket.settings.dynamicDifficulty,
  );
  const showDiffBadge = bracket.settings.dynamicDifficulty && effectiveDiff !== bracket.settings.difficulty;

  // #9 Seeding mode indicator
  const isSeededByStrength = bracket.settings.seedingMode === 'strength';

  // #10 Fan favorites from crowd votes
  const fanFavorites = useMemo(() => {
    if (party.tournamentCrowdVotes.length === 0) return [];
    return getFanFavorites(bracket, party.tournamentCrowdVotes);
  }, [bracket, party.tournamentCrowdVotes]);

  // Auto-scale bracket to fit available viewport height
  const bracketWrapperRef = useRef<HTMLDivElement>(null);
  const bracketInnerRef = useRef<HTMLDivElement>(null);
  const [bracketScale, setBracketScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const wrapper = bracketWrapperRef.current;
      const inner = bracketInnerRef.current;
      if (!wrapper || !inner) return;
      const available = wrapper.clientHeight;
      const needed = inner.scrollHeight;
      if (needed > 0 && available > 0) {
        setBracketScale(Math.min(1, available / needed));
      }
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    if (bracketWrapperRef.current) ro.observe(bracketWrapperRef.current);
    return () => ro.disconnect();
  }, [bracket, showResults]);

  // #7 Auto-add to Hall of Fame when tournament completes
  const hofRecordedRef = useRef(false);
  useEffect(() => {
    if (bracket.status === 'completed' && bracket.champion && !hofRecordedRef.current) {
      hofRecordedRef.current = true;
      const placements = getPlayerPlacements(bracket);
      addToHallOfFame(bracket, placements);
    }
  }, [bracket.status, bracket.champion]);

  return (
    <div className="max-w-full mx-auto px-4 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
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

      {/* Next Match Preview — compact */}
      {nextMatch && !bracket.champion && (
        <div className="mb-1 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 border border-cyan-500/30 rounded-xl p-2.5 shrink-0">
          <h3 className="text-sm font-bold mb-1.5 text-center flex items-center justify-center gap-2">
            <span className="animate-pulse">🎤</span>
            <span>{t('tournament.nextDuel')} {nextMatch.player1?.name || t('tournament.tbd')} {t('tournament.vs')} {nextMatch.player2?.name || t('tournament.tbd')}</span>
          </h3>
          <div className="flex items-center justify-center gap-5 mb-1.5">
            <PlayerDisplay player={nextMatch.player1} />
            <span className="text-lg font-bold text-white/40">⚔️</span>
            <PlayerDisplay player={nextMatch.player2} />
          </div>
          <Button
            onClick={() => onPlayMatch(nextMatch)}
            className="w-full py-2.5 text-sm bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
          >
            {t('tournament.startNextMatch')}
          </Button>
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

// Player Display Component
function PlayerDisplay({ player, small = false }: { player: TournamentPlayer | null; small?: boolean }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
        <div className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/10`} />
        <span className="text-white/30">{t('tournament.tbd')}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
      {player.avatar ? (
        <img
          src={player.avatar}
          alt={player.name}
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate">{player.name}</span>
    </div>
  );
}

// ─── #4 Double Elimination Bracket View ──────────────────────────
// Shows both Winners and Losers brackets side by side with Grand Finals

function DoubleEliminationBracketView({
  bracket,
  currentMatch,
  onPlayMatch,
  playableMatches,
  t,
}: {
  bracket: TournamentBracket;
  currentMatch: TournamentMatch | null;
  onPlayMatch: (_match: TournamentMatch) => void;
  playableMatches: TournamentMatch[];
  t: (_key: string) => string;
}) {
  const wbMatches = getMatchesByBracketType(bracket, 'winners');
  const lbMatches = getMatchesByBracketType(bracket, 'losers');
  const gfMatches = getMatchesByBracketType(bracket, 'grand_finals');
  const playableIds = new Set(playableMatches.map(m => m.id));

  const wbRounds = bracket.totalRounds;
  const lbTotalRounds = bracket.losersTotalRounds;

  // Group WB matches by round
  const wbByRound: TournamentMatch[][] = [];
  for (let r = 1; r <= wbRounds; r++) {
    wbByRound.push(wbMatches.filter(m => m.round === r));
  }

  // Group LB matches by round
  const lbByRound: TournamentMatch[][] = [];
  for (let r = 1; r <= lbTotalRounds; r++) {
    lbByRound.push(lbMatches.filter(m => m.round === r));
  }

  return (
    <div className="flex gap-8 items-start">
      {/* ─── Winners Bracket ─── */}
      <div>
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold text-cyan-400">{t('tournament.winnersBracket')}</h2>
        </div>
        <div className="flex gap-2">
          {wbByRound.map((roundMatches, ri) => (
            <div key={ri} className="flex flex-col gap-2">
              <div className="text-[10px] text-white/40 text-center mb-1">
                {ri === wbRounds - 1 ? t('tournament.final') : ri === wbRounds - 2 ? t('tournament.semiFinals') : t('tournament.roundOf').replace('{n}', String(ri + 1))}
              </div>
              {roundMatches.map(m => (
                <DEMatchCard
                  key={m.id}
                  match={m}
                  isCurrent={currentMatch?.id === m.id}
                  isPlayable={playableIds.has(m.id)}
                  onPlay={onPlayMatch}
                  isGF={false}
                  t={t}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Losers Bracket ─── */}
      {lbByRound.length > 0 && (
        <div>
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-red-400">{t('tournament.losersBracket')}</h2>
          </div>
          <div className="flex gap-2">
            {lbByRound.map((roundMatches, ri) => (
              <div key={ri} className="flex flex-col gap-2">
                <div className="text-[10px] text-white/40 text-center mb-1">
                  {getLBRoundName(ri + 1, wbRounds, lbTotalRounds, t)}
                </div>
                {roundMatches.map(m => (
                  <DEMatchCard
                    key={m.id}
                    match={m}
                    isCurrent={currentMatch?.id === m.id}
                    isPlayable={playableIds.has(m.id)}
                    onPlay={onPlayMatch}
                    isGF={false}
                    t={t}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Grand Finals ─── */}
      <div>
        <div className="text-center mb-2">
          <h2 className="text-sm font-bold text-amber-400">{t('tournament.grandFinals')}</h2>
        </div>
        <div className="flex flex-col gap-2">
          {/* GF1 */}
          {gfMatches.filter(m => m.id === 'GF1').map(m => (
            <div key={m.id} className="relative">
              <DEMatchCard
                match={m}
                isCurrent={currentMatch?.id === m.id}
                isPlayable={playableIds.has(m.id)}
                onPlay={onPlayMatch}
                isGF
                t={t}
              />
            </div>
          ))}
          {/* GF2 (Reset) — only show if needed */}
          {bracket.grandFinalsResetNeeded && gfMatches.filter(m => m.id === 'GF2').map(m => (
            <div key={m.id}>
              <DEMatchCard
                match={m}
                isCurrent={currentMatch?.id === m.id}
                isPlayable={playableIds.has(m.id)}
                onPlay={onPlayMatch}
                isGF
                isReset
                t={t}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DE Match Card (compact, for DE bracket view) ───────────────

function DESmallPlayer({ player }: { player: TournamentPlayer | null }) {
  if (!player) {
    return (
      <div className="flex items-center gap-1 text-[11px]">
        <div className="w-5 h-5 rounded-full bg-white/10 shrink-0" />
        <span className="text-white/30">TBD</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-[11px] min-w-0">
      {player.avatar ? (
        <img
          src={player.avatar}
          alt={player.name}
          className="w-5 h-5 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0"
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate min-w-0">{player.name}</span>
    </div>
  );
}

function DEMatchCard({
  match,
  isCurrent,
  isPlayable,
  onPlay,
  isGF = false,
  isReset = false,
  t,
}: {
  match: TournamentMatch;
  isCurrent: boolean;
  isPlayable: boolean;
  onPlay: (_m: TournamentMatch) => void;
  isGF?: boolean;
  isReset?: boolean;
  t: (_key: string) => string;
}) {
  const clickable = isPlayable && !match.completed;

  const borderColor = isGF
    ? isReset ? 'border-red-500/50' : 'border-amber-500/50'
    : match.bracketType === 'losers'
      ? 'border-red-500/30'
      : 'border-cyan-500/30';

  const glowClass = isCurrent && !match.completed
    ? isGF
      ? 'shadow-lg shadow-amber-500/30'
      : match.bracketType === 'losers'
        ? 'shadow-lg shadow-red-500/20'
        : 'shadow-lg shadow-cyan-500/20'
    : '';

  return (
    <div
      className={`rounded-lg p-1.5 transition-all overflow-hidden border ${borderColor} ${
        match.completed
          ? 'bg-white/10'
          : isPlayable
            ? 'bg-white/5 cursor-pointer hover:bg-white/10'
            : 'bg-white/5 opacity-50'
      } ${clickable ? 'hover:scale-105' : ''} ${glowClass}`}
      onClick={clickable ? () => onPlay(match) : undefined}
      style={{ minWidth: 140 }}
    >
      {/* Player 1 */}
      <div className={`flex items-center gap-1 p-0.5 rounded text-xs ${match.winner?.id === match.player1?.id ? 'bg-green-500/20' : ''}`}>
        <DESmallPlayer player={match.player1} />
        {match.completed && (
          <span className={`ml-auto text-xs font-bold ${match.winner?.id === match.player1?.id ? 'text-green-400' : 'text-white/60'}`}>
            {match.score1}
          </span>
        )}
        {!match.completed && match.bracketType === 'losers' && match.player1 && (
          <span className="ml-auto text-[9px] text-red-400/60">{t('tournament.firstLoss')}</span>
        )}
      </div>

      <div className="text-center text-white/30 text-[9px] my-0.5">VS</div>

      {/* Player 2 */}
      <div className={`flex items-center gap-1 p-0.5 rounded text-xs ${match.winner?.id === match.player2?.id ? 'bg-green-500/20' : ''}`}>
        <DESmallPlayer player={match.player2} />
        {match.completed && (
          <span className={`ml-auto text-xs font-bold ${match.winner?.id === match.player2?.id ? 'text-green-400' : 'text-white/60'}`}>
            {match.score2}
          </span>
        )}
        {!match.completed && match.bracketType === 'losers' && match.player2 && (
          <span className="ml-auto text-[9px] text-red-400/60">{t('tournament.firstLoss')}</span>
        )}
      </div>

      {match.winner && (
        <div className="text-[9px] text-center text-amber-400 font-medium bg-amber-500/10 rounded py-0.5 mt-0.5">
          {match.winner.name}
        </div>
      )}

      {isPlayable && !match.completed && (
        <div className="text-[9px] text-center text-cyan-400 font-medium mt-0.5">
          {t('tournament.play')}
        </div>
      )}
    </div>
  );
}
