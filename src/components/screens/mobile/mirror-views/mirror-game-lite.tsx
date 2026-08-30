'use client';

import React, { useCallback, useState } from 'react';
// createPortal removed — causes React #300 on mobile WebViews
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
  // Remote control takeover
  isRemoteLocked?: boolean;
  remoteLockedBy?: string | null;
  onAcquireRemote?: () => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorGameLite = React.memo<MirrorGameLiteProps>(
  function MirrorGameLite({ gameState, onSendDesktopCommand, isRemoteLocked, remoteLockedBy, onAcquireRemote }) {
    const { t } = useTranslation();
    const [showPauseOverlay, setShowPauseOverlay] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

    const isPartyGame = !!gameState?.isPartyModeActive;

    const handleCmd = useCallback(
      (cmd: string) => {
        haptic();
        onSendDesktopCommand(cmd);
      },
      [onSendDesktopCommand],
    );

    const handlePause = useCallback(() => {
      haptic();
      setShowPauseOverlay(true);
      onSendDesktopCommand('pause');
    }, [onSendDesktopCommand]);

    const handleResume = useCallback(() => {
      haptic();
      setShowPauseOverlay(false);
      onSendDesktopCommand('play');
    }, [onSendDesktopCommand]);

    const handleAbort = useCallback(() => {
      haptic();
      setShowPauseOverlay(false);
      onSendDesktopCommand('quit');
    }, [onSendDesktopCommand]);

    // Wenn kein Song aktiv, nur Platzhalter
    if (!gameState.currentSong) {
      return (
        <div className="flex items-center justify-center px-4 pt-8">
          <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">
        {/* Song-Info */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-lg shrink-0">
            {'\u{1F3B5}'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{gameState.currentSong.title}</p>
            <p className="truncate text-xs text-white/40">{gameState.currentSong.artist}</p>
          </div>
          {gameState.isPlaying && (
            <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
        </div>

        {/* Wiedergabesteuerung */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCmd('restart')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23EE'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorRestart') || 'Restart'}</span>
          </button>
          <button
            onClick={gameState.isPlaying ? handlePause : () => handleCmd('play')}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 active:scale-95 transition-transform ' +
              (gameState.isPlaying
                ? 'bg-yellow-500/15 border border-yellow-400/30 text-yellow-400'
                : 'bg-green-500/15 border border-green-400/30 text-green-400')
            }
          >
            <span className="text-base">{gameState.isPlaying ? '\u23F8' : '\u25B6'}</span>
            <span className="text-xs font-medium">{gameState.isPlaying ? (t('mobile.mirrorPause') || 'Pause') : (t('mobile.mirrorPlay') || 'Play')}</span>
          </button>
          <button
            onClick={() => handleCmd('skip')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23ED'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorSkip') || 'Skip'}</span>
          </button>
        </div>

        {/* Lautstaerkeregelung */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCmd('volume_down')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F509}'}</span>
            <span className="text-xs font-medium text-white/70">Vol -</span>
          </button>
          <button
            onClick={() => handleCmd('volume_up')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F50A}'}</span>
            <span className="text-xs font-medium text-white/70">Vol +</span>
          </button>
        </div>

        {/* Abbrechen-Button (während Pause) */}
        {!gameState.isPlaying && !showPauseOverlay && (
          <button
            onClick={() => {
              haptic();
              onSendDesktopCommand('quit');
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl p-3 bg-red-500/10 border border-red-400/20 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u2716'}</span>
            <span className="text-xs font-medium text-red-400">{t('mobile.mirrorAbortSong') || 'Song abbrechen'}</span>
          </button>
        )}

        {/* Live-Punkte-Rangliste */}
        {gameState.companionScores && gameState.companionScores.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.mirrorLiveScores')}
            </p>
            {gameState.companionScores.map((entry) => (
              <div key={entry.profileId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-white/80">{entry.name}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Remote-Kontrolle uebernehmen (wenn ein anderer Companion kontrolle hat) */}
        {isRemoteLocked && onAcquireRemote && (
          <button
            onClick={() => { haptic(); onAcquireRemote(); }}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3 text-sm font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-400 active:scale-[0.97] transition-all"
          >
            <span className="text-base">{'\uD83D\uDD13'}</span>
            <span>{t('companion.acquireControl') || t('remoteControl.acquireControl') || 'Take Control'}</span>
            {remoteLockedBy && (
              <span className="text-xs text-white/30">({remoteLockedBy})</span>
            )}
          </button>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleCmd('home')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F3E0}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorHome') || 'Home'}</span>
          </button>
          <button
            onClick={() => handleCmd('fullscreen')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F5A5}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorFullscreen') || 'Fullscreen'}</span>
          </button>
        </div>

        {/* Leave Party Mode (only during active party game) */}
        {isPartyGame && (
          <button
            onClick={() => { haptic(); setShowLeaveDialog(true); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl p-3 bg-amber-500/10 border border-amber-400/20 text-amber-400 active:scale-[0.97] transition-transform"
          >
            <span className="text-base">{'\u{1F6AA}'}</span>
            <span className="text-xs font-medium">{t('mobile.mirrorJukeboxLeaveParty')}</span>
          </button>
        )}

        {/* Pause-Overlay */}
        {showPauseOverlay && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={handleResume}
          >
            <div
              className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">{'\u23F8'}</div>
                <h2 className="text-lg font-bold text-white">{t('mobile.mirrorPauseTitle') || 'Pausiert'}</h2>
                <p className="text-sm text-white/50 mt-2">
                  {gameState.currentSong.title} — {gameState.currentSong.artist}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleResume}
                  className="flex-1 py-3 rounded-xl font-medium bg-green-500/20 border border-green-500/40 text-green-300 active:bg-green-500/30 transition-all text-sm"
                >
                  {'\u25B6'} {t('mobile.mirrorResume') || 'Fortfahren'}
                </button>
                <button
                  onClick={handleAbort}
                  className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
                >
                  {'\u2716'} {t('mobile.mirrorAbortSong') || 'Abbrechen'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Party Confirmation Dialog */}
        {showLeaveDialog && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setShowLeaveDialog(false)}
          >
            <div
              className="bg-[#1a1a2e] border border-white/15 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">{'\u{1F6AA}'}</div>
                <h2 className="text-lg font-bold text-white">{t('dialogs.partyLeaveTitle') || 'Party-Modus verlassen?'}</h2>
                <p className="text-sm text-white/50 mt-2">
                  {t('dialogs.partyLeaveDesc') || 'Du verlaesst den Party-Modus. Der aktuelle Fortschritt geht verloren.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLeaveDialog(false)}
                  className="flex-1 py-3 rounded-xl font-medium bg-white/10 border border-white/20 text-white/70 active:bg-white/20 transition-all text-sm"
                >
                  {t('mobile.mirrorCancel') || 'Abbrechen'}
                </button>
                <button
                  onClick={() => {
                    setShowLeaveDialog(false);
                    haptic();
                    onSendDesktopCommand('party_cancel');
                  }}
                  className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
                >
                  {t('dialogs.endParty') || 'Party beenden'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
MirrorGameLite.displayName = 'MirrorGameLite';
