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
  currentTime: _currentTime = 0,
  isPlaying = false,
  isDuetMode = false,
  gameMode = '',
}: MicIndicatorProps) {
  const unifiedSetupResult = usePartyStore((s) => s.unifiedSetupResult);
  const passTheMicPlayers = usePartyStore((s) => s.passTheMicPlayers);

  // Track player changes to re-trigger visibility (ref, not state, to avoid
  // the setState-in-effect anti-pattern that caused the fade timer to self-destruct)
  const lastPlayerIdRef = useRef<string | null>(null);
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
  const players = useMemo((): SelectedPlayer[] => unifiedSetupResult?.players || [], [unifiedSetupResult?.players]);

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
      if (passTheMicPlayers && passTheMicPlayers.length > 0) {
        // Find the active player (isActive flag)
        const active = passTheMicPlayers.find((p: { isActive?: boolean }) => p.isActive);
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
  }, [micPlayers, gameMode, passTheMicPlayers]);

  // Show indicator when player changes or playback starts, auto-fade after delay.
  // Uses a ref for lastPlayerId to avoid the setState-in-effect cycle that
  // previously caused the fade timer to be destroyed on its own re-render.
  useEffect(() => {
    const currentId = activePlayer?.id || null;
    const playerChanged = currentId !== lastPlayerIdRef.current;

    if (isPlaying || playerChanged) {
      if (playerChanged) {
        lastPlayerIdRef.current = currentId;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset fade timer on dependency change (standard React pattern for timed state)
      setIsVisible(true);
      clearFadeTimer();
      fadeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, VISIBLE_DURATION);
    }
    return clearFadeTimer;
  }, [activePlayer?.id, isPlaying]);

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
      <div className="backdrop-blur-md rounded-xl px-4 py-2.5 border shadow-lg" style={{ backgroundColor: 'rgba(10, 0, 20, 0.7)', borderColor: 'rgba(0, 229, 255, 0.2)', boxShadow: '0 0 20px rgba(0, 229, 255, 0.1)' }}>
        {/* Single player mic indicator */}
        {!isDuetMode && activePlayer && (
          <div className="flex items-center gap-2.5">
            {/* Mic pulse dot */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 229, 255, 0.15)' }}>
                <span className="text-base">🎤</span>
              </div>
              {isPlaying && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse" style={{ backgroundColor: '#39ff14', borderColor: 'rgba(10, 0, 20, 0.6)', boxShadow: '0 0 8px rgba(57, 255, 20, 0.6)' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: '#00e5ff', textShadow: '0 0 8px rgba(0, 229, 255, 0.4)' }}>
                {buildLabel(activePlayer)}
              </p>
              {activePlayer.micName && (
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
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
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: 'rgba(0, 229, 255, 0.1)' }}>
                  {'🎤'}
                </div>
                <span className="text-xs font-medium" style={{ color: 'rgba(0, 229, 255, 0.8)' }}>
                  P{i + 1}: {player.micName || player.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Mixed mode: show companion count */}
        {companionPlayers.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t" style={{ borderColor: 'rgba(0, 229, 255, 0.15)' }}>
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
