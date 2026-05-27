/**
 * Sub-hook: series navigation callbacks for Pass-the-Mic mode.
 * Handles continuing the series, ending the series, and keeping same players.
 */
'use client';

import { useCallback } from 'react';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import type { PtmPlayer } from './ptm-types';

interface UsePtmSeriesNavOptions {
  isMedleyMode: boolean;
  playersRef: React.RefObject<PtmPlayer[]>;
  stop: () => void;
  lastIsSongPlayingRef: React.RefObject<boolean>;
  onNavigate?: (screen: string) => void;
}

export function usePtmSeriesNav({
  isMedleyMode,
  playersRef,
  stop,
  lastIsSongPlayingRef,
  onNavigate,
}: UsePtmSeriesNavOptions): {
  handleContinue: () => void;
  handleEndSeriesComplete: () => void;
  handleContinueWithPlayers: () => void;
} {
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const setPassTheMicPlayers = usePartyStore(s => s.setPassTheMicPlayers);
  const setPassTheMicSong = usePartyStore(s => s.setPassTheMicSong);
  const setPassTheMicSegments = usePartyStore(s => s.setPassTheMicSegments);
  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);
  const setPassTheMicSeriesHistory = usePartyStore(s => s.setPassTheMicSeriesHistory);
  const ptmSongSelection = usePartyStore(s => s.ptmSongSelection);
  const { setGameMode, resetGame } = useGameStore();

  /** Helper: resolve navigation target from song selection mode */
  const getTargetScreen = useCallback((fallbackIsMedley: boolean) => {
    const sel = ptmSongSelection || (fallbackIsMedley ? 'medley' : 'library');
    return sel === 'random' ? 'ptm-next-random'
      : sel === 'medley' ? 'ptm-next-medley'
      : sel === 'vote' ? 'song-voting'
      : 'library';
  }, [ptmSongSelection]);

  // ── Continue series: reset per-song scores, pick next song ──
  const handleContinue = useCallback(() => {
    try { stop(); } catch { /* ignore */ }
    const resetPlayers = playersRef.current!.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0,
    }));
    setPassTheMicPlayers(resetPlayers);
    setPassTheMicSegments([]);
    setPassTheMicSong(null);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    const targetScreen = getTargetScreen(isMedleyMode);
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, isMedleyMode, setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop, lastIsSongPlayingRef, getTargetScreen]);

  // ── End series completely: clean up ──
  const handleEndSeriesComplete = useCallback(() => {
    try { stop(); } catch { /* ignore */ }
    setPassTheMicPlayers([]);
    setPassTheMicSegments([]);
    setPassTheMicSettings(null);
    setPassTheMicSeriesHistory([]);
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    resetGame();
    setTimeout(() => {
      setPassTheMicSong(null);
      onNavigate?.('party-setup');
    }, 0);
  }, [setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setPassTheMicSettings, setPassTheMicSeriesHistory, setIsSongPlaying, resetGame, onNavigate, stop, lastIsSongPlayingRef]);

  // ── Continue with same players (after winner ceremony) ──
  const handleContinueWithPlayers = useCallback(() => {
    try { stop(); } catch { /* ignore */ }
    const resetPlayers = playersRef.current!.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0,
    }));
    setPassTheMicPlayers(resetPlayers);
    setPassTheMicSeriesHistory([]);
    setPassTheMicSegments([]);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    const targetScreen = getTargetScreen(false);
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, setPassTheMicPlayers, setPassTheMicSeriesHistory, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop, lastIsSongPlayingRef, getTargetScreen]);

  return { handleContinue, handleEndSeriesComplete, handleContinueWithPlayers };
}
