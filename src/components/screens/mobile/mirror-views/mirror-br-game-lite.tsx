'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, MobileView, PitchData } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorBrGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  /** The companion's own profile id — used to find "me" in the BR roster. */
  profileId: string | null;
  profileName: string;
  /** Live pitch detected on THIS phone (from useMobilePitchDetection). */
  currentPitch?: PitchData | null;
  /** Whether this phone's microphone is currently capturing. */
  isMicListening?: boolean;
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

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI note number → readable note name (e.g. 69 → "A4"). */
function midiToNoteLabel(note: number | null | undefined): string {
  if (note == null || !Number.isFinite(note)) return '—';
  const rounded = Math.round(note);
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

// ===================== Component =====================

/**
 * Battle Royale in-game mirror (Item 8.1).
 *
 * The core BR companion experience: unlike CPTM there are no turns — ALL
 * players sing at the same time. Participating companion players get a live
 * "sing along" screen with their own pitch visualization (mic capture runs in
 * mobile-client-view via useMobilePitchDetection and streams pitch to the
 * desktop, where it feeds BR scoring), plus the live roster with scores.
 */
export function MirrorBrGameLite({
  gameState, profileId, profileName, currentPitch, isMicListening,
  onSendDesktopCommand, isRemoteLocked, remoteLockedBy, onAcquireRemote,
}: MirrorBrGameLiteProps) {
  const { t } = useTranslation();

  const br = gameState.brGameData;
  const players = br?.players ?? [];
  const me = profileId ? players.find(p => p.id === profileId) : undefined;
  const isResultsPhase = gameState.ptmPhase === 'series-results' || br?.status === 'completed';
  const isPlaying = gameState.isPlaying && br?.status === 'playing';
  const isVoting = br?.status === 'voting';
  const isCountdown = br?.status === 'countdown';

  // ── Pause / leave dialog sync (same as the other game mirrors) ──
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

  // ── Haptic when the round starts (status flips to 'playing') ──
  const prevPlayingRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevPlayingRef.current && me && !me.eliminated) {
      haptic([100, 80, 100]);
    }
    prevPlayingRef.current = isPlaying;
  }, [isPlaying, me]);

  // Song info: brGameData carries the current (snippet) song; fall back to
  // the shared gameState song if the desktop payload hasn't caught up yet.
  const songTitle = br?.songTitle ?? gameState.currentSong?.title ?? null;
  const songArtist = br?.songArtist ?? gameState.currentSong?.artist ?? null;

  const ranked = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.score - a.score;
  });
  const winner = ranked.find(p => !p.eliminated) ?? ranked[0];

  const isSingingNow = !!currentPitch && currentPitch.note != null;
  const volume = currentPitch?.volume ?? 0;

  // ── Results phase: BR game over — winner + final standings ──
  if (isResultsPhase) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-4xl">{'\u{1F3C6}'}</div>
          <h2 className="text-xl font-bold text-white">
            {t('battleRoyale.title') || 'Battle Royale'}
          </h2>
          {winner && (
            <p className="text-sm text-white/60">
              {t('mobile.cptmWinnerIs') || 'Winner'}:{' '}
              <span className="font-semibold" style={{ color: winner.color }}>{winner.name}</span>
            </p>
          )}
        </div>
        {ranked.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.cptmFinalScores') || 'Final scores'}
            </p>
            {ranked.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}.</span>
                  <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={'text-sm truncate ' + (p.id === profileId ? 'text-white font-semibold' : 'text-white/70')}>
                    {p.name}{p.id === profileId ? ` (${t('mobile.cptmYou') || 'you'})` : ''}
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
    <div className="flex flex-col gap-3 px-4 pb-8 pt-2" data-testid="br-game-mirror">

      {/* ── Song info + round ── */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/30 to-pink-500/30 flex items-center justify-center text-lg shrink-0">
          {'\u{1F3B5}'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {br?.roundNumber ? (
              <span className="text-[10px] uppercase tracking-wider text-red-400/80 font-semibold shrink-0">
                {t('battleRoyale.round').replace('{n}', String(br.roundNumber))}
              </span>
            ) : null}
            {br && (br.snippetCount ?? 0) > 1 && (
              <span className="text-[10px] text-purple-400/80 shrink-0">
                {t('mobile.brGameSnippet').replace('{n}', String((br.snippetIndex ?? 0) + 1)).replace('{m}', String(br.snippetCount))}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-white">{songTitle || t('tournament.songRandom') || '🎲 Random'}</p>
          <p className="truncate text-xs text-white/40">{songArtist || ''}</p>
        </div>
        {isPlaying ? (
          <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        ) : null}
      </div>

      {/* ── Core signal: everyone sings — SING ALONG! + own live pitch ── */}
      {isVoting ? (
        <div className="rounded-2xl border border-amber-400/50 bg-amber-500/10 p-5 text-center">
          <p className="text-lg font-bold text-amber-300">{'\u{1F5F3}'}</p>
          <p className="text-sm text-amber-200/80">{t('mobile.brGameVoting') || 'Vote for the next song!'}</p>
        </div>
      ) : me && me.eliminated ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-center">
          <p className="text-2xl mb-1">{'\u2716'}</p>
          <p className="text-sm text-red-300/80 font-semibold">
            {me.name} — {t('mobile.brGameEliminated') || 'out'}
          </p>
        </div>
      ) : isPlaying ? (
        <div
          role="status"
          aria-live="assertive"
          className="rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 p-5 text-center shadow-[0_0_25px_rgba(16,185,129,0.25)]"
        >
          <div className="text-4xl mb-1">{'\u{1F3A4}'}</div>
          <p className="text-xl font-extrabold text-emerald-300 tracking-wide">
            {t('mobile.brGameSingNow') || 'SING ALONG!'}
          </p>

          {/* Own live pitch visualization (mic capture runs in mobile-client-view) */}
          <div className="mt-3 rounded-xl bg-black/25 border border-white/10 px-4 py-3" data-testid="br-mirror-pitch">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {t('mobile.brGameYourVoice') || 'Your voice'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px]">
                {isMicListening ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-300/80">{t('mobile.brGameMicActive') || 'Microphone active'}</span>
                  </>
                ) : (
                  <span className="text-white/30">{'\u{1F3A4}'}…</span>
                )}
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-3 mt-1">
              <span className={`text-3xl font-black tabular-nums ${isSingingNow ? 'text-emerald-300' : 'text-white/25'}`}>
                {midiToNoteLabel(currentPitch?.note)}
              </span>
              {currentPitch?.frequency != null && (
                <span className="text-xs text-white/40 tabular-nums">
                  {Math.round(currentPitch.frequency)} Hz
                </span>
              )}
            </div>
            {/* Volume meter */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  isSingingNow ? 'bg-emerald-400' : 'bg-white/30'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, volume * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : isCountdown ? (
        <div className="rounded-2xl border-2 border-cyan-400/50 bg-cyan-500/10 p-5 text-center">
          <div className="text-3xl mb-1 animate-pulse">{'\u23F1'}</div>
          <p className="text-sm font-semibold text-cyan-300">
            {t('mobile.brGameCountdown') || 'Starting…'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-white/40">
            {gameState.isPlaying
              ? (t('mobile.brGameWaiting') || 'Waiting for the round…')
              : (t('mobile.cptmPaused') || 'Paused')}
          </p>
        </div>
      )}

      {/* ── Live roster with scores ── */}
      {ranked.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4" data-testid="br-mirror-players">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {t('mobile.cptmPlayers') || 'Players'}
          </p>
          {ranked.map((p, i) => {
            const isMe = p.id === profileId;
            return (
              <div
                key={p.id}
                className={
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ' +
                  (p.eliminated
                    ? 'opacity-40'
                    : isMe
                      ? 'bg-emerald-500/10 border border-emerald-400/30'
                      : '')
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}.</span>
                  <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={'text-sm truncate ' + (isMe ? 'text-white font-semibold' : 'text-white/70')}>
                    {p.name}{isMe ? ` (${t('mobile.cptmYou') || 'you'})` : ''}
                  </span>
                  {p.eliminated && (
                    <span className="text-[10px] text-red-400/70 shrink-0">
                      {t('mobile.brGameEliminated') || 'out'}
                    </span>
                  )}
                  {!p.eliminated && p.playerType === 'companion' && (
                    <span className="text-[10px] shrink-0" aria-label="companion">{'\u{1F4F1}'}</span>
                  )}
                </div>
                <span className={'text-sm tabular-nums shrink-0 ml-2 ' + (isMe ? 'text-emerald-300 font-semibold' : 'text-white/70')}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* ── Playback controls (pause/resume like the other mirrors) ── */}
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

      {/* Remote-Kontrolle uebernehmen (wenn ein anderer Companion Kontrolle hat) */}
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
              {songTitle ? (
                <p className="text-sm text-white/50 mt-1">{songTitle}</p>
              ) : null}
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
MirrorBrGameLite.displayName = 'MirrorBrGameLite';
