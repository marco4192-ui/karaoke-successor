'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import type { SelectedPlayer } from './unified-party-setup.types';

// ===================== QUICK SWAP OVERLAY =====================
// Shown in Pass-the-Mic mode when a segment ends.
// Displays "Mikro an [nächster Spieler] weitergeben" with a brief countdown.
// Also supports manual skip (press Space or click).

interface QuickSwapOverlayProps {
  /** Current game time in ms */
  currentTime: number;
  /** Whether the game is currently playing */
  isPlaying: boolean;
  /** Pass-the-mic segments from party store */
  segments?: Array<{ startTime: number; endTime: number; playerId: string | null }>;
  /** Called when the overlay is dismissed (player swapped) */
  onDismiss?: () => void;
}

/** How long (ms) the overlay stays visible */
const OVERLAY_DURATION = 4000;

/** Countdown step (ms) */
const COUNTDOWN_STEP = 1000;

export function QuickSwapOverlay({
  currentTime,
  isPlaying,
  segments = [],
  onDismiss,
}: QuickSwapOverlayProps) {
  const ptmPlayers = usePartyStore((s) => s.passTheMicPlayers);
  const ptmSettings = usePartyStore((s) => s.passTheMicSettings);
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [nextPlayer, setNextPlayer] = useState<SelectedPlayer | null>(null);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Get the unified setup result for mic info
  const unifiedResult = usePartyStore((s) => s.unifiedSetupResult);
  const allPlayers: SelectedPlayer[] = unifiedResult?.players || [];

  // Find which segment we're in
  const currentSegment = segments.find(
    (s) => currentTime >= s.startTime && currentTime < s.endTime
  );

  const segmentIndex = currentSegment
    ? segments.indexOf(currentSegment)
    : -1;

  // When segment changes, show the overlay for the next player
  useEffect(() => {
    if (!isPlaying || segments.length === 0) {
      setVisible(false);
      return;
    }

    if (segmentIndex !== currentIndex && segmentIndex >= 0) {
      setCurrentIndex(segmentIndex);

      // Find the next segment's player
      const nextSegIndex = segmentIndex + 1;
      if (nextSegIndex < segments.length) {
        const nextSegPlayerId = segments[nextSegIndex].playerId;
        const match = allPlayers.find((p) => p.id === nextSegPlayerId);
        const ptmMatch = ptmPlayers.find((p: { id: string }) => p.id === nextSegPlayerId);

        const player: SelectedPlayer | null = match || (ptmMatch
          ? {
              id: ptmMatch.id,
              name: ptmMatch.name,
              avatar: ptmMatch.avatar,
              color: ptmMatch.color,
              playerType: 'microphone' as const,
              micName: undefined,
              micId: undefined,
            }
          : null);

        if (player) {
          setNextPlayer(player);
          setCountdown(Math.floor(OVERLAY_DURATION / COUNTDOWN_STEP));
          setVisible(true);

          // Auto-hide after duration
          const timer = setTimeout(() => {
            setVisible(false);
            onDismiss?.();
          }, OVERLAY_DURATION);

          return () => clearTimeout(timer);
        }
      }
    }
  }, [segmentIndex, isPlaying, segments, currentIndex, allPlayers, ptmPlayers, onDismiss]);

  // Countdown tick
  useEffect(() => {
    if (!visible || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, COUNTDOWN_STEP);

    return () => clearTimeout(timer);
  }, [visible, countdown]);

  // Keyboard shortcut: Space to dismiss
  useEffect(() => {
    if (!visible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setVisible(false);
        onDismiss?.();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onDismiss]);

  // Click to dismiss
  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  if (!visible || !nextPlayer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative z-10 animate-in zoom-in-95 duration-300">
        <div className="bg-gray-900/95 backdrop-blur-lg rounded-2xl px-8 py-6 border border-white/15 shadow-2xl max-w-sm w-full mx-4">
          {/* Icon */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-3">
              <span className="text-3xl animate-bounce">🎤</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Mikro weitergeben!
            </h3>
          </div>

          {/* Next player info */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {nextPlayer.avatar ? (
              <img
                src={nextPlayer.avatar}
                alt={nextPlayer.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-cyan-500"
                style={{ backgroundColor: nextPlayer.color || '#06b6d4' }}
              >
                {nextPlayer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-semibold text-lg">{nextPlayer.name}</p>
              {nextPlayer.micName && (
                <p className="text-cyan-400 text-sm">🎤 {nextPlayer.micName}</p>
              )}
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-white/50 text-sm">
              <span>Startet in</span>
              <span className="text-cyan-400 font-mono font-bold text-lg">
                {countdown}
              </span>
            </div>
          </div>

          {/* Dismiss hint */}
          <p className="text-center text-white/30 text-xs mt-3">
            Leertaste oder Klicken zum Fortfahren
          </p>
        </div>
      </div>
    </div>
  );
}
