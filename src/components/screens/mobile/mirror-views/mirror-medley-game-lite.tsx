'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, MobileView, PitchData, MedleyMirrorMatchup } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorMedleyGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  /** The companion's own profile id — used to find "me" in the medley roster. */
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

/** Team-mode matchup chip row: "● Anna vs ● Bob". */
function MatchupRow({ matchup, profileId, t }: {
  matchup: MedleyMirrorMatchup;
  profileId: string | null;
  t: (k: string) => string;
}) {
  const chip = (id: string, name: string, color: string) => (
    <span
      className={
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border text-sm font-medium truncate ' +
        (id === profileId
          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
          : 'bg-white/5 border-white/10 text-white/80')
      }
    >
      <span className="inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">{name}</span>
    </span>
  );
  return (
    <div className="flex items-center gap-2" data-testid="medley-mirror-matchup">
      {chip(matchup.aId, matchup.aName, matchup.aColor)}
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 shrink-0">
        {t('medley.vs') || 'vs'}
      </span>
      {chip(matchup.bId, matchup.bName, matchup.bColor)}
    </div>
  );
}

// ===================== Component =====================

/**
 * Medley Contest in-game mirror (R36).
 *
 * The medley companion experience: FFA/elimination → everyone (not out)
 * sings every snippet (BR-style "sing along" card with own pitch);
 * team mode → the current duel matchup is shown and only its two players
 * get the sing card, everyone else sees a waiting card. Transitions show
 * the snippet countdown + next matchup preview. Round/final results mirror
 * the standings. Mic capture runs in mobile-client-view via
 * useMobilePitchDetection (auto-sing on activeProfileIds) and streams pitch
 * to the desktop, where PitchDetectorManager feeds it into medley scoring.
 */
export function MirrorMedleyGameLite({
  gameState, profileId, profileName, currentPitch, isMicListening,
  onSendDesktopCommand, isRemoteLocked, remoteLockedBy, onAcquireRemote,
}: MirrorMedleyGameLiteProps) {
  const { t } = useTranslation();

  const medley = gameState.medleyGameData;
  const players = medley?.players ?? [];
  const me = profileId ? players.find(p => p.id === profileId) : undefined;
  const isTeam = medley?.playMode === 'team';
  const isFinalResults = medley?.phase === 'final-results';
  const isRoundResults = medley?.phase === 'round-results';
  const isResults = isFinalResults || isRoundResults;
  const isTransition = medley?.phase === 'transition';
  const isPlayingPhase = medley?.phase === 'playing';
  const isSnippetPlaying = isPlayingPhase && !!medley?.isPlaying;
  const isActiveSinger = !!medley && isPlayingPhase && (medley.activeProfileIds ?? []).includes(profileId ?? '');
  const isEliminated = !!me?.eliminated;
  const isPaused = gameState.desktopDialog === 'song-pause';
  // Mystery mode (#16): song title stays hidden WHILE singing — after the
  // snippet (transition/results) the reveal is allowed.
  const hideSong = !!medley?.mysteryMode && isPlayingPhase;

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

  // ── Haptic when a NEW snippet starts and I'm singing it ──
  const prevSnippetRef = useRef<number | null>(null);
  useEffect(() => {
    if (!medley) return;
    const key = medley.snippetIndex;
    const isNewSnippet = prevSnippetRef.current !== null && prevSnippetRef.current !== key;
    prevSnippetRef.current = key;
    if (isNewSnippet && isPlayingPhase && !isEliminated && (medley.activeProfileIds ?? []).includes(profileId ?? '')) {
      haptic([100, 80, 100]);
    }
  }, [medley, isPlayingPhase, isEliminated, profileId]);

  // Song info: medleyGameData carries the current (snippet) song; fall back
  // to the shared gameState song if the desktop payload hasn't caught up yet.
  const songTitle = hideSong
    ? (t('mobile.medleyMysterySong') || '❓ Mystery song')
    : (medley?.songTitle ?? gameState.currentSong?.title ?? null);
  const songArtist = hideSong ? '' : (medley?.songArtist ?? gameState.currentSong?.artist ?? null);

  const ranked = [...players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.score - a.score;
  });
  const leader = ranked.find(p => !p.eliminated) ?? ranked[0];

  const isSingingNow = !!currentPitch && currentPitch.note != null;
  const volume = currentPitch?.volume ?? 0;

  // Team mode: my opponent in the current matchup.
  const myOpponent = (() => {
    const mu = medley?.matchup;
    if (!mu || !profileId) return null;
    if (mu.aId === profileId) return { id: mu.bId, name: mu.bName, color: mu.bColor };
    if (mu.bId === profileId) return { id: mu.aId, name: mu.aName, color: mu.aColor };
    return null;
  })();
  // Team mode: am I part of the NEXT matchup (transition preview)?
  const inNextMatchup = (() => {
    const nm = medley?.nextMatchup;
    if (!nm || !profileId) return false;
    return nm.aId === profileId || nm.bId === profileId;
  })();

  // ── Results phase: round or final standings ──
  if (isResults) {
    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2" data-testid="medley-mirror-results">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-4xl">{isFinalResults ? '\u{1F3C6}' : '\u{1F396}'}</div>
          <h2 className="text-xl font-bold text-white">
            {isFinalResults
              ? (t('medley.medleyChampion') || 'Medley Champion!')
              : (t('mobile.medleyRoundDone') || 'Round complete!')}
          </h2>
          {leader && (
            <p className="text-sm text-white/60">
              {t('mobile.cptmWinnerIs') || 'Winner'}:{' '}
              <span className="font-semibold" style={{ color: leader.color }}>{leader.name}</span>
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
                  {p.eliminated && (
                    <span className="text-[10px] text-red-400/70 shrink-0">
                      {t('mobile.brGameEliminated') || 'out'}
                    </span>
                  )}
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
    <div className="flex flex-col gap-3 px-4 pb-8 pt-2" data-testid="medley-game-mirror">

      {/* ── Song info + snippet progress ── */}
      <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center text-lg shrink-0">
          {'\u{1F3B6}'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-purple-300/80 font-semibold shrink-0">
              {t('medley.gameTitle') || 'Medley Contest'}
            </span>
            {medley && (medley.snippetCount ?? 0) > 1 && (
              <span className="text-[10px] text-cyan-300/80 shrink-0">
                {t('mobile.brGameSnippet').replace('{n}', String((medley.snippetIndex ?? 0) + 1)).replace('{m}', String(medley.snippetCount))}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-white">{songTitle || (t('tournament.songRandom') || '🎲 Random')}</p>
          <p className="truncate text-xs text-white/40">{songArtist || ''}</p>
        </div>
        {isSnippetPlaying ? (
          <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        ) : null}
      </div>

      {/* ── Core signal card ── */}
      {isEliminated ? (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-center">
          <p className="text-2xl mb-1">{'\u2716'}</p>
          <p className="text-sm text-red-300/80 font-semibold">
            {me?.name} — {t('mobile.brGameEliminated') || 'out'}
          </p>
          {isTransition && (medley?.transitionCount ?? 0) > 0 ? (
            <p className="text-xs text-white/40 mt-2">
              {t('mobile.medleyNextSnippetIn').replace('{s}', String(medley?.transitionCount ?? 0))}
            </p>
          ) : null}
        </div>
      ) : isTransition ? (
        <div className="rounded-2xl border-2 border-cyan-400/50 bg-cyan-500/10 p-5 text-center" data-testid="medley-mirror-transition">
          <div className="text-4xl mb-1 font-black tabular-nums text-cyan-300 animate-pulse">
            {medley?.transitionCount ?? 0}
          </div>
          <p className="text-sm font-semibold text-cyan-200">
            {t('mobile.medleyNextSnippetIn').replace('{s}', String(medley?.transitionCount ?? 0)) || 'Next song in {s}s'}
          </p>
          {medley?.nextMatchup ? (
            <div className="mt-3 flex justify-center">
              <MatchupRow matchup={medley.nextMatchup} profileId={profileId} t={t} />
            </div>
          ) : null}
          {inNextMatchup ? (
            <p className="mt-2 text-xs font-semibold text-emerald-300">
              {t('mobile.medleyUpNext') || "You're up next"}
            </p>
          ) : null}
        </div>
      ) : isActiveSinger && isSnippetPlaying ? (
        <div
          role="status"
          aria-live="assertive"
          className="rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-b from-emerald-500/25 to-emerald-500/5 p-5 text-center shadow-[0_0_25px_rgba(16,185,129,0.25)]"
          data-testid="medley-mirror-sing"
        >
          <div className="text-4xl mb-1">{'\u{1F3A4}'}</div>
          <p className="text-xl font-extrabold text-emerald-300 tracking-wide">
            {t('mobile.brGameSingNow') || 'SING ALONG!'}
          </p>
          {isTeam && myOpponent ? (
            <p className="mt-1 text-xs text-white/60">
              {t('mobile.medleyYouSingVs').replace('{name}', myOpponent.name)}
            </p>
          ) : null}

          {/* Own live pitch visualization (mic capture runs in mobile-client-view) */}
          <div className="mt-3 rounded-xl bg-black/25 border border-white/10 px-4 py-3" data-testid="medley-mirror-pitch">
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
      ) : isPlayingPhase && isTeam && medley?.matchup ? (
        // Team mode, not part of the current duel
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
            {t('mobile.cptmNowSinging') || 'Now singing'}
          </p>
          <div className="flex justify-center">
            <MatchupRow matchup={medley.matchup} profileId={profileId} t={t} />
          </div>
          <p className="mt-3 text-sm text-white/50">
            {inNextMatchup
              ? (t('mobile.medleyUpNext') || "You're up next")
              : (t('mobile.medleyWaitingTurn') || 'Waiting for your turn')}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-sm text-white/40">
            {isPaused
              ? (t('mobile.cptmPaused') || 'Paused')
              : gameState.isPlaying
                ? (t('mobile.brGameWaiting') || 'Waiting…')
                : (t('mobile.cptmPaused') || 'Paused')}
          </p>
        </div>
      )}

      {/* ── Live roster with scores ── */}
      {ranked.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4" data-testid="medley-mirror-players">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
            {t('mobile.cptmPlayers') || 'Players'}
          </p>
          {ranked.map((p, i) => {
            const isMe = p.id === profileId;
            const isSingingNowRow = isPlayingPhase && (medley?.activeProfileIds ?? []).includes(p.id) && !p.eliminated;
            return (
              <div
                key={p.id}
                className={
                  'flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors ' +
                  (p.eliminated
                    ? 'opacity-40'
                    : isMe
                      ? 'bg-emerald-500/10 border border-emerald-400/30'
                      : isSingingNowRow
                        ? 'bg-white/5'
                        : '')
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-white/30 w-4 shrink-0">{i + 1}.</span>
                  <span className="inline-block h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className={'text-sm truncate ' + (isMe ? 'text-white font-semibold' : 'text-white/70')}>
                    {p.name}{isMe ? ` (${t('mobile.cptmYou') || 'you'})` : ''}
                  </span>
                  {isSingingNowRow && (
                    <span className="text-[10px] shrink-0" aria-label="singing">{'\u{1F3A4}'}</span>
                  )}
                  {p.eliminated && (
                    <span className="text-[10px] text-red-400/70 shrink-0">
                      {t('mobile.brGameEliminated') || 'out'}
                    </span>
                  )}
                  {!p.eliminated && p.inputType === 'mobile' && (
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
            {/* R37: "Song beenden" now really ENDS the current snippet (per-mode
                EndSong handler). The explicit leave-party entry moved here so
                phones keep a way to end the whole party: party_show_leave opens
                the desktop leave dialog, which syncs back as showLeaveDialog. */}
            <button
              onClick={() => handleCmd('party_show_leave')}
              className="w-full mt-3 py-2.5 rounded-xl text-xs font-medium text-white/50 border border-white/10 bg-white/5 active:bg-white/10 transition-all"
              data-testid="mirror-leave-party"
            >
              {'\u{1F6AA}'} {t('dialogs.endParty') || 'End Party'}
            </button>
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
MirrorMedleyGameLite.displayName = 'MirrorMedleyGameLite';
