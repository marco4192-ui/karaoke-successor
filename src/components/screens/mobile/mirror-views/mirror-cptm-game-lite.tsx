'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorCptmGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  profileId: string | null;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
  // Remote control takeover
  isRemoteLocked?: boolean;
  remoteLockedBy?: string | null;
  onAcquireRemote?: () => void;
}

// ===================== Helpers =====================

function haptic(pattern?: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern ?? 10);
  }
}

// ===================== Component =====================

/**
 * Companion Sing-A-Long game mirror.
 *
 * The core CPTM experience on the phone: the screen lights up GREEN and
 * vibrates when it is your turn to sing, shows an amber countdown when your
 * turn is coming up (blink warning), and displays the live roster with the
 * current singer highlighted.
 */
export function MirrorCptmGameLite({
  gameState, profileId, profileName, onSendDesktopCommand, isRemoteLocked, remoteLockedBy, onAcquireRemote,
}: MirrorCptmGameLiteProps) {
  const { t } = useTranslation();

  const turn = gameState.cptmTurn;
  const isResultsPhase = gameState.ptmPhase === 'song-results' || gameState.ptmPhase === 'series-results';
  const isMyTurn = !!(turn?.isActive && profileId && turn.profileId === profileId && turn.countdown === null);
  const isMyWarning = !!(turn?.isActive && profileId && turn.nextProfileId === profileId && turn.countdown !== null);
  const isSinging = !!turn?.isActive && turn.countdown === null;
  const nowSingingName = turn?.currentPlayerName
    || turn?.players?.find(p => p.profileId === turn?.profileId)?.name
    || null;
  const nextUpName = turn?.nextPlayerName
    || turn?.players?.find(p => p.profileId === turn?.nextProfileId)?.name
    || null;

  // ── Haptic + previous-state tracking: vibrate when MY turn starts ──
  const prevMyTurnRef = useRef(false);
  useEffect(() => {
    if (isMyTurn && !prevMyTurnRef.current) {
      // Distinct triple pulse for "your turn"
      haptic([120, 80, 120, 80, 200]);
    }
    prevMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  const prevCountdownRef = useRef<number | null>(null);
  useEffect(() => {
    if (isMyWarning && turn?.countdown !== null && prevCountdownRef.current !== turn?.countdown) {
      haptic(60);
    }
    prevCountdownRef.current = turn?.countdown ?? null;
  }, [isMyWarning, turn?.countdown]);

  // ── Pause / leave dialog sync (same as generic game mirror) ──
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const isPauseOriginator = !!gameState.pauseInitiator && gameState.pauseInitiator === profileName;
  const desktopDialog = gameState.desktopDialog;
  useEffect(() => {
    if (desktopDialog === 'party-leave') {
      setShowLeaveDialog(true);
      setShowPauseOverlay(false);
    } else if (desktopDialog === 'song-pause') {
      setShowPauseOverlay(true);
      setShowLeaveDialog(false);
    } else {
      setShowPauseOverlay(false);
      setShowLeaveDialog(false);
    }
  }, [desktopDialog]);

  const handleCmd = useCallback(
    (cmd: string) => {
      haptic();
      onSendDesktopCommand(cmd);
    },
    [onSendDesktopCommand],
  );

  const handlePause = useCallback(() => {
    haptic();
    onSendDesktopCommand('companion_pause');
  }, [onSendDesktopCommand]);

  const handleResume = useCallback(() => {
    haptic();
    onSendDesktopCommand('companion_resume');
  }, [onSendDesktopCommand]);

  const handleAbort = useCallback(() => {
    haptic();
    onSendDesktopCommand('companion_end_early');
  }, [onSendDesktopCommand]);

  // If no song active, placeholder
  if (!gameState.currentSong) {
    return (
      <div className="flex items-center justify-center px-4 pt-8">
        <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
      </div>
    );
  }

  // ── Results phase: round/series complete — show final scores + tie state ──
  const roster = turn?.players ?? [];
  const ranked = [...roster].sort((a, b) => b.score - a.score);
  const isTie = ranked.length > 1 && ranked[0].score === ranked[1].score;

  if (isResultsPhase) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-4xl">{isTie ? '\u{1F91D}' : '\u{1F3C6}'}</div>
          <h2 className="text-xl font-bold text-white">
            {gameState.ptmPhase === 'series-results'
              ? (isTie ? (t('mobile.mirrorSeriesTie') || "It's a tie!") : (t('mobile.mirrorSeriesComplete') || 'Series complete'))
              : (isTie ? (t('mobile.mirrorRoundTie') || 'Round ended in a tie') : (t('mobile.mirrorRoundComplete') || 'Round complete'))}
          </h2>
          {isTie && (
            <p className="text-sm text-white/50">
              {t('mobile.cptmTieSubtitle') || 'Top scores are shared — no winner this time.'}
            </p>
          )}
          {!isTie && ranked.length > 0 && (
            <p className="text-sm text-white/60">
              {t('mobile.cptmWinnerIs') || 'Winner'}:{' '}
              <span className="font-semibold" style={{ color: ranked[0].color }}>{ranked[0].name}</span>
            </p>
          )}
        </div>

        {/* Song info */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-lg shrink-0">
            {'\u{1F3B5}'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{gameState.currentSong.title}</p>
            <p className="truncate text-xs text-white/40">{gameState.currentSong.artist}</p>
          </div>
        </div>

        {/* Final scores */}
        {ranked.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.cptmFinalScores') || 'Final scores'}
            </p>
            {ranked.map((p, i) => (
              <div key={p.profileId} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}.</span>
                  <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={'text-sm truncate ' + (p.profileId === profileId ? 'text-white font-semibold' : 'text-white/70')}>
                    {p.name}{p.profileId === profileId ? ` (${t('mobile.cptmYou') || 'you'})` : ''}
                  </span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white shrink-0 ml-2">
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-center text-white/30">
          {t('mobile.cptmResultsHint') || 'Continue on the desktop to start the next round or end the series.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-8 pt-2">

      {/* ── Song info ── */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center text-lg shrink-0">
          {'\u{1F3B5}'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{gameState.currentSong.title}</p>
          <p className="truncate text-xs text-white/40">{gameState.currentSong.artist}</p>
        </div>
        {gameState.isPlaying ? (
          <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        ) : null}
      </div>

      {/* ── THE core signal: your turn / get ready / now singing ── */}
      {isMyTurn ? (
        <div
          role="status"
          aria-live="assertive"
          className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-b from-emerald-500/30 to-emerald-500/10 p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.35)]"
        >
          <div className="absolute inset-0 animate-pulse bg-emerald-400/10" />
          <div className="text-5xl mb-2">{'\u{1F3A4}'}</div>
          <p className="text-2xl font-extrabold text-emerald-300 tracking-wide">
            {t('mobile.cptmYourTurn') || 'YOUR TURN'}
          </p>
          <p className="text-sm text-emerald-200/70 mt-1">
            {t('mobile.cptmSingNow') || 'Sing now!'}
          </p>
        </div>
      ) : isMyWarning && turn?.countdown !== null ? (
        <div
          role="status"
          aria-live="assertive"
          className="rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/25 to-amber-500/5 p-6 text-center"
        >
          <div className="text-4xl mb-1 animate-pulse">{'\u26A1'}</div>
          <p className="text-xl font-bold text-amber-300">
            {t('mobile.cptmGetReady') || 'GET READY'}
          </p>
          <p className="text-sm text-amber-200/70 mt-1">
            {(t('mobile.cptmYouAreNextIn') || 'You are up in {s}s').replace('{s}', String(turn?.countdown ?? ''))}
          </p>
          {nextUpName && (
            <p className="text-xs text-white/40 mt-2">{nextUpName}</p>
          )}
        </div>
      ) : isSinging ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-white/40 mb-1">
            {t('mobile.cptmNowSinging') || 'Now singing'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {turn?.currentPlayerColor && (
              <span className="inline-block h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: turn.currentPlayerColor }} />
            )}
            <p className="text-lg font-bold text-white/90 truncate">{nowSingingName || t('mobile.cptmWaiting') || '…'}</p>
          </div>
          {nextUpName && (
            <p className="text-xs text-white/30 mt-2">
              {t('mobile.cptmUpNext') || 'Up next'}: {nextUpName}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-white/40">
            {gameState.isPlaying
              ? (t('mobile.cptmWaitingForStart') || 'Waiting for the next turn…')
              : (t('mobile.cptmPaused') || 'Paused')}
          </p>
        </div>
      )}

      {/* ── Live roster ── */}
      {turn?.players && turn.players.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {t('mobile.cptmPlayers') || 'Players'}
          </p>
          {turn.players.map(p => {
            const active = isSinging && p.profileId === turn?.profileId;
            const me = p.profileId === profileId;
            return (
              <div
                key={p.profileId}
                className={
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ' +
                  (active ? 'bg-emerald-500/15 border border-emerald-400/30' : me ? 'bg-white/5' : '')
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={'text-sm truncate ' + (active ? 'text-emerald-300 font-semibold' : me ? 'text-white/90' : 'text-white/60')}>
                    {p.name}{me ? ` (${t('mobile.cptmYou') || 'you'})` : ''}
                  </span>
                  {active && <span className="text-[10px] text-emerald-300 shrink-0">{'\u25CF'}</span>}
                </div>
                <span className={'text-sm tabular-nums shrink-0 ml-2 ' + (active ? 'text-emerald-300 font-semibold' : 'text-white/70')}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── Playback controls (pause/resume like the generic mirror) ── */}
      <div className="flex gap-2">
        <button
          onClick={gameState.isPlaying ? handlePause : handleResume}
          className={
            'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 active:scale-95 transition-transform border ' +
            (gameState.isPlaying
              ? 'bg-yellow-500/15 border-yellow-400/30 text-yellow-400'
              : 'bg-green-500/15 border-green-400/30 text-green-400')
          }
        >
          <span className="text-base">{gameState.isPlaying ? '\u23F8' : '\u25B6'}</span>
          <span className="text-xs font-medium">{gameState.isPlaying ? t('mobile.mirrorPause') : t('mobile.mirrorPlay')}</span>
        </button>
        <button
          onClick={handleAbort}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-red-500/15 border border-red-400/30 text-red-400 active:scale-95 transition-transform"
        >
          <span className="text-base">{'\u2716'}</span>
          <span className="text-xs font-medium">{t('mobile.mirrorAbortSong') || 'Abort'}</span>
        </button>
      </div>

      {/* Remote-Kontrolle uebernehmen (wenn ein anderer Companion kontrolle hat) */}
      {isRemoteLocked && onAcquireRemote ? (
        <button
          onClick={() => { haptic(); onAcquireRemote(); }}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-400 active:scale-[0.97] transition-all"
        >
          <span className="text-base">{'\uD83D\uDD13'}</span>
          <span>{t('companion.acquireControl') || t('remoteControl.acquireControl') || 'Take Control'}</span>
          {remoteLockedBy ? (
            <span className="text-xs text-white/30">({remoteLockedBy})</span>
          ) : null}
        </button>
      ) : null}

      {/* Pause-Overlay (1:1 mit Desktop synchronisiert) */}
      {showPauseOverlay ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <div
            className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{'\u23F8'}</div>
              <h2 className="text-lg font-bold text-white">{t('mobile.mirrorPauseTitle')}</h2>
              {gameState.pauseInitiator ? (
                <p className="text-sm text-cyan-300/80 mt-2">
                  {t('mobile.mirrorPausedBy') || 'Paused by'} {gameState.pauseInitiator}
                </p>
              ) : null}
              <p className="text-sm text-white/50 mt-1">
                {gameState.currentSong.title} {'\u2014'} {gameState.currentSong.artist}
              </p>
            </div>
            <div className="flex gap-3">
              {isPauseOriginator || !gameState.pauseInitiator ? (
                <button
                  onClick={handleResume}
                  className="flex-1 py-3 rounded-xl font-medium bg-green-500/20 border border-green-500/40 text-green-300 active:bg-green-500/30 transition-all text-sm"
                >
                  {'\u25B6'} {t('mobile.mirrorResume')}
                </button>
              ) : (
                <div className="flex-1 py-3 rounded-xl text-center text-sm text-white/30 bg-white/5 border border-white/10">
                  {t('mobile.mirrorPausedWait') || 'Waiting for resume…'}
                </div>
              )}
              <button
                onClick={handleAbort}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
              >
                {'\u2716'} {t('mobile.mirrorAbortSong') || 'Abort'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Leave Party Confirmation Dialog (1:1 mit Desktop synchronisiert) */}
      {showLeaveDialog ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setShowLeaveDialog(false);
            handleCmd('party_leave_cancel');
          }}
        >
          <div
            className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{'\u{1F6AA}'}</div>
              <h2 className="text-lg font-bold text-white">{t('dialogs.partyLeaveTitle') || 'Leave Party Mode?'}</h2>
              <p className="text-sm text-white/50 mt-2">
                {t('dialogs.partyLeaveDesc') || 'You are leaving party mode. Current progress will be lost.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveDialog(false);
                  handleCmd('party_leave_cancel');
                }}
                className="flex-1 py-3 rounded-xl font-medium bg-white/10 border border-white/20 text-white/70 active:bg-white/20 transition-all text-sm"
              >
                {t('mobile.mirrorCancel') || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  setShowLeaveDialog(false);
                  handleCmd('party_leave_confirm');
                }}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
              >
                {t('dialogs.endParty') || 'End Party'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
MirrorCptmGameLite.displayName = 'MirrorCptmGameLite';
