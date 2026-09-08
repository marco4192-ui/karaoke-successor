'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorTournamentBracketLiteProps {
  gameState: GameState;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** Compact player chip: colored initial + name (avatars stripped from the payload). */
function PlayerChip({ player }: { player: { id: string; name: string; color: string } | null }) {
  const { t } = useTranslation();
  if (!player) {
    return (
      <div className="flex-1 flex items-center gap-1.5 min-w-0 rounded-lg bg-white/5 border border-dashed border-white/15 px-2 py-1.5">
        <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" aria-hidden="true" />
        <span className="text-xs text-white/30 truncate">{t('tournament.tbd')}</span>
      </div>
    );
  }
  return (
    <div
      className="flex-1 flex items-center gap-1.5 min-w-0 rounded-lg px-2 py-1.5 border"
      style={{
        borderColor: `${player.color}55`,
        background: `linear-gradient(160deg, ${player.color}1e, ${player.color}08)`,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 border border-white/25"
        style={{ backgroundColor: player.color }}
        aria-hidden="true"
      >
        {player.name.charAt(0).toUpperCase()}
      </div>
      <span className="text-xs font-bold text-white truncate">{player.name}</span>
    </div>
  );
}

// ===================== Component =====================

/**
 * Companion mirror of the tournament BRACKET screen.
 *
 * While the desktop shows the bracket (no duel pending), companions get a
 * compact list of the OPEN duels incl. a start button for each one — tapping
 * it sends the `party_start_match:<matchId>` remote command, which starts the
 * duel on the desktop exactly like clicking its card on the big screen.
 *
 * Special states:
 * - `votingActive` → the desktop currently shows the 3-song voting overlay
 *   (buttons are disabled to avoid conflicting starts).
 * - `status === 'completed'` → champion celebration instead of the list.
 */
export function MirrorTournamentBracketLite({ gameState, onSendDesktopCommand }: MirrorTournamentBracketLiteProps) {
  const { t } = useTranslation();
  const data = gameState.tournamentBracketData ?? null;
  const [startingMatchId, setStartingMatchId] = useState<string | null>(null);
  // Item 11: two-step confirm for "Back to Main Menu" from the champion view
  const [confirmExit, setConfirmExit] = useState(false);

  // Safety net: if the desktop never confirms the start (offline / error),
  // re-enable the buttons after a while instead of spinning forever.
  useEffect(() => {
    if (!startingMatchId) return;
    const id = setTimeout(() => setStartingMatchId(null), 8000);
    return () => clearTimeout(id);
  }, [startingMatchId]);

  // Safety net: reset the exit confirm state after a while
  useEffect(() => {
    if (!confirmExit) return;
    const id = setTimeout(() => setConfirmExit(false), 5000);
    return () => clearTimeout(id);
  }, [confirmExit]);

  // Derived during render: once the started duel actually left the open list
  // (desktop confirmed), it is no longer "starting" here.
  const startingStillOpen = !!startingMatchId
    && (data?.openMatches.some(m => m.matchId === startingMatchId) ?? false);
  const activeStartingId = startingStillOpen ? startingMatchId : null;

  const handleStart = useCallback((matchId: string) => {
    haptic();
    setStartingMatchId(matchId);
    onSendDesktopCommand(`party_start_match:${matchId}`);
  }, [onSendDesktopCommand]);

  // ── Meta line: round info + remaining players ──
  const roundLabel = data
    ? t('tournament.roundOfOf')
        .replace('{n}', String(data.currentRound))
        .replace('{m}', String(data.totalRounds))
    : null;
  const remainingLabel = data
    ? t('tournament.playersRemaining').replace('{n}', String(data.remainingPlayers))
    : null;

  const isCompleted = data?.status === 'completed';

  // ── Round label for a match entry ──
  const matchRoundLabel = (round: number, bracketType: string): string => {
    const total = data?.totalRounds ?? 0;
    if (bracketType === 'grand_finals') return t('tournament.grandFinals');
    if (bracketType === 'losers') {
      return `${t('tournament.losersBracket')} · ${t('tournament.roundOf').replace('{n}', String(round))}`;
    }
    if (round === total) return t('tournament.final');
    if (round === total - 1) return t('tournament.semiFinals');
    if (round === total - 2 && total >= 4) return t('tournament.quarterFinals');
    if (round === total - 3 && total >= 5) return t('tournament.roundOf16');
    return t('tournament.roundOf').replace('{n}', String(round));
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8">
      {/* Icon + Title */}
      <div className="text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" aria-hidden="true">🏆</div>
      <h2 className="text-xl font-bold text-white text-center -mt-2">
        {t('tournament.bracketTitle')}
      </h2>

      {/* Meta badges */}
      {(roundLabel || remainingLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2 -mt-2">
          {roundLabel && (
            <span className="text-[11px] uppercase tracking-[0.15em] text-amber-400/80 font-semibold rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5">
              {roundLabel}
            </span>
          )}
          {remainingLabel && (
            <span className="text-[11px] text-white/50 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5">
              {remainingLabel}
            </span>
          )}
          {data?.tournamentType === 'double' && (
            <span className="text-[11px] text-purple-300/80 rounded-full bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5">
              {t('tournament.doubleEliminationShort')}
            </span>
          )}
        </div>
      )}

      {/* Champion state */}
      {isCompleted && (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-500/20 to-yellow-500/10 px-6 py-5 w-full max-w-sm">
          <span className="text-3xl" aria-hidden="true">👑</span>
          <p className="text-lg font-bold text-amber-300 text-center">{data?.championName}</p>
          <p className="text-xs text-white/50 text-center">{t('tournament.mirrorChampionHint')}</p>

          {/* Item 11: exit actions — mirror the desktop results-screen buttons.
              Main Menu needs a second tap (confirm); New Tournament sends the
              party_new_tournament command which the desktop handles while the
              final results are on screen. */}
          <div className="flex gap-2.5 w-full mt-2">
            <button
              type="button"
              onClick={() => {
                haptic();
                if (confirmExit) {
                  setConfirmExit(false);
                  // Same full-reset → home path as the desktop button
                  onSendDesktopCommand('party_leave_confirm');
                } else {
                  setConfirmExit(true);
                }
              }}
              className={
                'flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.97] border ' +
                (confirmExit
                  ? 'bg-red-500/20 border-red-500/40 text-red-300 active:bg-red-500/30'
                  : 'bg-white/10 border-white/20 text-white/70 active:bg-white/20')
              }
            >
              {confirmExit ? t('dialogs.endParty') : <>🏠 {t('tournament.backToMainMenu')}</>}
            </button>
            <button
              type="button"
              onClick={() => {
                haptic();
                onSendDesktopCommand('party_new_tournament');
              }}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold transition-all active:scale-[0.97] bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/25"
            >
              🏆 {t('tournament.newTournament')}
            </button>
          </div>
        </div>
      )}

      {/* Voting active — starting disabled */}
      {!isCompleted && data?.votingActive && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-5 py-4 w-full max-w-sm">
          <p className="text-sm font-semibold text-amber-300 text-center">🗳️ {t('tournament.mirrorVotingActive')}</p>
        </div>
      )}

      {/* Open duels list */}
      {!isCompleted && !data?.votingActive && (
        <div className="w-full max-w-md">
          <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" aria-hidden="true" />
            {t('tournament.mirrorOpenDuels')}
            {data && data.openMatches.length > 0 && (
              <span className="text-white/30 normal-case tracking-normal font-normal">
                ({data.openMatches.length})
              </span>
            )}
          </h3>

          {data && data.openMatches.length > 0 ? (
            <div className="flex flex-col gap-2.5 max-h-[56vh] overflow-y-auto pr-1 -mr-1">
              {data.openMatches.map(m => {
                const isStarting = activeStartingId === m.matchId;
                return (
                  <div
                    key={m.matchId}
                    className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2.5"
                  >
                    <span className="text-[10px] uppercase tracking-[0.15em] text-amber-400/70 font-semibold">
                      {matchRoundLabel(m.round, m.bracketType)}
                    </span>
                    <div className="flex items-center gap-2">
                      <PlayerChip player={m.player1} />
                      <span
                        className="shrink-0 text-xs font-black text-amber-400/90 tracking-widest select-none"
                        aria-hidden="true"
                      >
                        {t('tournament.vs')}
                      </span>
                      <PlayerChip player={m.player2} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStart(m.matchId)}
                      disabled={!!activeStartingId}
                      className={
                        'w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.97] ' +
                        'bg-gradient-to-r from-amber-500 to-yellow-500 text-white ' +
                        'shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:active:scale-100'
                      }
                    >
                      {isStarting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"
                            aria-hidden="true"
                          />
                          {t('tournament.mirrorStarting')}
                        </span>
                      ) : (
                        <>▶ {t('tournament.mirrorStartDuel')}</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-5 w-full max-w-sm mx-auto">
              <p className="text-sm text-white/60 text-center">{t('tournament.mirrorNoOpenDuels')}</p>
              <p className="text-xs text-white/35 text-center">{t('tournament.mirrorWaitingHint')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

MirrorTournamentBracketLite.displayName = 'MirrorTournamentBracketLite';
