'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import type { SelectedPlayer, InputMode } from './unified-party-setup.types';

// ===================== MIC INDICATOR =====================
// Shows which microphone + player is currently active during gameplay.
// Position: bottom-left, above the progress bar.
// Auto-fades after 8s but reappears on player changes.

interface MicIndicatorProps {
  /** Current game time in ms (used for pass-the-mic segment tracking) */
  currentTime?: number;
  /** Whether the game is currently playing */
  isPlaying?: boolean;
  /** In duet mode, show two indicators side by side */
  isDuetMode?: boolean;
  /** Game mode string for mode-specific behavior */
  gameMode?: string;
}

/** How long (ms) the indicator stays fully visible before fading */
const VISIBLE_DURATION = 8000;

/** Fade-out animation duration (ms) */
const FADE_DURATION = 1500;

export function MicIndicator({
  currentTime = 0,
  isPlaying = false,
  isDuetMode = false,
  gameMode = '',
}: MicIndicatorProps) {
  const unifiedSetupResult = usePartyStore((s) => s.unifiedSetupResult);

  // Track player changes to re-trigger visibility
  const [lastPlayerId, setLastPlayerId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear fade timer helper
  const clearFadeTimer = () => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const inputMode: InputMode = unifiedSetupResult?.inputMode || 'microphone';
  const players: SelectedPlayer[] = unifiedSetupResult?.players || [];

  // Find microphone-assigned players
  const micPlayers = useMemo(() => {
    return players.filter(
      (p) => p.playerType === 'microphone' && p.micId
    );
  }, [players]);

  // Determine which player(s) to show
  // For pass-the-mic: the current segment player (identified by party store)
  // For regular modes: all mic players
  const activePlayer = useMemo(() => {
    if (gameMode === 'pass-the-mic') {
      const ptmPlayers = usePartyStore.getState().passTheMicPlayers;
      if (ptmPlayers && ptmPlayers.length > 0) {
        // Find the active player (isActive flag)
        const active = ptmPlayers.find((p: { isActive?: boolean }) => p.isActive);
        if (active) {
          // Match with mic player
          return micPlayers.find((mp) => mp.id === active.id) || {
            ...active,
            micName: undefined,
            micId: undefined,
            playerType: 'microphone' as const,
          };
        }
      }
    }
    return micPlayers[0] || null;
  }, [micPlayers, gameMode, currentTime]);

  // Re-trigger visibility on player change
  useEffect(() => {
    const currentId = activePlayer?.id || null;
    if (currentId !== lastPlayerId) {
      setLastPlayerId(currentId);
      setIsVisible(true);
      clearFadeTimer();
      fadeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, VISIBLE_DURATION);
    }
    return clearFadeTimer;
  }, [activePlayer?.id, lastPlayerId]);

  // Also re-trigger when playback starts
  useEffect(() => {
    if (isPlaying) {
      setIsVisible(true);
      clearFadeTimer();
      fadeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, VISIBLE_DURATION);
    }
    return clearFadeTimer;
  }, [isPlaying]);

  // Don't render if:
  // - No setup result (e.g. quick play from library without party setup)
  // - No mic players configured
  // - Companion-only mode
  if (!unifiedSetupResult || micPlayers.length === 0 || inputMode === 'companion') {
    return null;
  }

  // Companion players (show their status too in mixed mode)
  const companionPlayers = players.filter((p) => p.playerType === 'companion');

  // Build label
  const buildLabel = (player: SelectedPlayer) => {
    if (player.micName) {
      return `${player.micName} — ${player.name} singt`;
    }
    return `${player.name} singt`;
  };

  return (
    <div
      className="absolute bottom-6 left-4 z-30 pointer-events-none transition-opacity"
      style={{
        opacity: isVisible ? 1 : 0,
        transitionDuration: `${FADE_DURATION}ms`,
      }}
    >
      <div className="bg-black/60 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/10 shadow-lg">
        {/* Single player mic indicator */}
        {!isDuetMode && activePlayer && (
          <div className="flex items-center gap-2.5">
            {/* Mic pulse dot */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <span className="text-base">🎤</span>
              </div>
              {isPlaying && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black/60 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">
                {buildLabel(activePlayer)}
              </p>
              {activePlayer.micName && (
                <p className="text-white/40 text-xs mt-0.5">
                  Mikrofon aktiv
                </p>
              )}
            </div>
          </div>
        )}

        {/* Duet mode: show both players */}
        {isDuetMode && micPlayers.length > 0 && (
          <div className="space-y-1.5">
            {micPlayers.slice(0, 2).map((player, i) => (
              <div key={player.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs">
                  {'🎤'}
                </div>
                <span className="text-white/80 text-xs font-medium">
                  P{i + 1}: {player.micName || player.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mixed mode: show companion count */}
        {companionPlayers.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📱</span>
              <span className="text-white/50 text-xs">
                {companionPlayers.length} Companion-Spieler
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
