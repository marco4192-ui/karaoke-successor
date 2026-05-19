'use client';

import { useCallback } from 'react';
import type { Song, GameMode } from '@/types/game';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import type { CptmPlayer, CptmRoundResult, GamePhase } from './cptm-types';
import { sendCompanionTurnSignal } from './cptm-turn-management';

// ===================== HOOK PARAMS =====================

export interface CptmSeriesParams {
  effectiveSong: Song | null;
  song: Song;
  playersRef: React.MutableRefObject<CptmPlayer[]>;
  cptmSeriesHistory: CptmRoundResult[];
  setCptmSeriesHistory: (h: CptmRoundResult[]) => void;
  setCptmPlayers: (p: CptmPlayer[]) => void;
  setCptmSong: (s: Song | null) => void;
  setCptmSegments: (s: any[]) => void;
  setCptmSettings: (s: any | null) => void;
  cptmSongSelection: string | null;
  setGameMode: (m: GameMode) => void;
  resetGame: () => void;
  setIsSongPlaying: (v: boolean) => void;
  lastIsSongPlayingRef: React.MutableRefObject<boolean>;
  setPhase: (p: GamePhase) => void;
  onNavigate?: (_screen: string) => void;
}

export interface CptmSeriesReturn {
  recordRound: () => void;
  handleContinue: () => void;
  handleEndSeries: () => void;
  handleEndSeriesComplete: () => void;
}

// ===================== HOOK =====================

/**
 * Manages series round recording, continue (next song), end series,
 * and full cleanup when the series is complete.
 */
export function useCptmSeries(params: CptmSeriesParams): CptmSeriesReturn {
  const {
    effectiveSong,
    song,
    playersRef,
    cptmSeriesHistory,
    setCptmSeriesHistory,
    setCptmPlayers,
    setCptmSong,
    setCptmSegments,
    setCptmSettings,
    cptmSongSelection,
    setGameMode,
    resetGame,
    setIsSongPlaying,
    lastIsSongPlayingRef,
    setPhase,
    onNavigate,
  } = params;

  // ── Record round results ──
  const recordRound = useCallback(() => {
    const round: CptmRoundResult = {
      songTitle: effectiveSong?.title || song.title,
      songArtist: effectiveSong?.artist || song.artist,
      playedAt: Date.now(),
      playerScores: {},
    };
    for (const p of playersRef.current) {
      round.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
        segmentsSung: p.segmentsSung,
      };
    }
    setCptmSeriesHistory([...cptmSeriesHistory, round]);
  }, [effectiveSong, song, cptmSeriesHistory, setCptmSeriesHistory, playersRef]);

  // ── Continue series: reset per-song scores, pick next song ──
  const handleContinue = useCallback(() => {
    const resetPlayers = playersRef.current.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0,
    }));
    setCptmPlayers(resetPlayers);
    setCptmSegments([]);
    setCptmSong(null);
    setGameMode('companion-pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    // Clear all companion turn signals
    sendCompanionTurnSignal(null, null, null, false);
    // Navigate based on song selection mode
    const sel = cptmSongSelection || 'library';
    const targetScreen = sel === 'random' ? 'ptm-next-random'
      : sel === 'vote' ? 'song-voting'
      : sel === 'medley' ? 'ptm-next-medley'
      : 'library';
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [cptmSongSelection, setCptmPlayers, setCptmSong, setCptmSegments, setGameMode, onNavigate, setIsSongPlaying, lastIsSongPlayingRef, playersRef]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, [setPhase]);

  // ── End series completely: clean up ──
  const handleEndSeriesComplete = useCallback(() => {
    setCptmPlayers([]);
    setCptmSegments([]);
    setCptmSettings(null);
    setCptmSeriesHistory([]);
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    resetGame();
    // Clear all companion turn signals
    sendCompanionTurnSignal(null, null, null, false);
    setTimeout(() => {
      setCptmSong(null);
      onNavigate?.('party-setup');
    }, 0);
  }, [setCptmPlayers, setCptmSong, setCptmSegments, setCptmSettings, setCptmSeriesHistory, setIsSongPlaying, resetGame, onNavigate, lastIsSongPlayingRef]);

  return {
    recordRound,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
  };
}
