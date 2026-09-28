/**
 * Medley Contest — Core Game Logic Hook (Orchestrator)
 *
 * Composes focused sub-hooks for audio, features, team bonuses,
 * and elimination.  This hook owns the game loop, phase management,
 * player scoring, and action handlers.
 *
 * Batch 1 additions:
 * - `lastScoringEvents` array for floating +points popups
 * - Combo display data exposed via `playersDisplay`
 * - Dynamic difficulty: difficulty ramps from easy → hard across snippets
 *
 * Batch 2 additions:
 * - Feature #10: Elimination mode — track eliminated players, end game early
 * - Feature #15: Voice modifiers — random modifier per snippet, playback rate
 * - Feature #16: Mystery mode — expose mystery state for UI
 * - Feature #17: Highlight tracking per snippet
 * - Feature #18: Team bonus mechanics — synergy, comeback, MVP
 *
 * R7: the monolith was split into focused modules under ./hooks/ —
 * medley-hook-types (public types), use-medley-phase, use-medley-pitch-detection,
 * use-medley-scoring (tick points + visual samples), use-medley-game-loop,
 * use-medley-transition, use-medley-round-actions — alongside the pre-existing
 * use-medley-audio / -features / -team-bonuses / -elimination.  This file
 * remains the public orchestrator; its export surface is unchanged.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { usePartyStore } from '@/lib/game/party-store';
import { useGameSettings } from '@/hooks/use-game-settings';
import type { MedleyPlayer } from './medley-types';
import { EMPTY_PLAYER_SCORE } from '@/types/game';

// ── Sub-hook imports ──
import { useMedleyAudio } from './hooks/use-medley-audio';
import { useMedleyFeatures } from './hooks/use-medley-features';
import { useMedleyTeamBonuses } from './hooks/use-medley-team-bonuses';
import { useMedleyElimination } from './hooks/use-medley-elimination';
import { useMedleyPhase } from './hooks/use-medley-phase';
import { useMedleyPitchDetection } from './hooks/use-medley-pitch-detection';
import { useMedleyScoring } from './hooks/use-medley-scoring';
import { useMedleyGameLoop } from './hooks/use-medley-game-loop';
import { useMedleyTransition } from './hooks/use-medley-transition';
import { useMedleyRoundActions } from './hooks/use-medley-round-actions';
import type { MedleyGameState, MedleyGameScreenProps } from './hooks/medley-hook-types';

// Public props interface stays importable from this module (path stability).
export type { MedleyGameScreenProps };

// ===================== HOOK =====================

export function useMedleyGame({
  players: initialPlayers,
  songs: medleySongs,
  settings,
  matchups,
  onRoundComplete,
  onEndGame,
  onPrepareNextRoundSongs,
}: MedleyGameScreenProps): MedleyGameState {
  // Subscribe to specific fields only (NOT the entire store) to minimize re-renders.
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const isTeam = settings.playMode === 'team';
  const isEliminationMode = settings.playMode === 'elimination';

  // Store onEndGame in ref for use in game loop callbacks
  const onEndGameRef = useRef(onEndGame);
  onEndGameRef.current = onEndGame;

  // Store the next-round song preparer in a ref (Fix 7) — avoids stale
  // closures and re-creation churn in handleNextRound.
  const onPrepareNextRoundSongsRef = useRef(onPrepareNextRoundSongs);
  onPrepareNextRoundSongsRef.current = onPrepareNextRoundSongs;

  // ── Phase ──
  const {
    phase, setPhase, phaseRef, transitionCount, setTransitionCount, lastTransitionAdvanceRef,
  } = useMedleyPhase();

  // ── Current snippet ──
  const [currentSnippetIdx, setCurrentSnippetIdx] = useState(0);
  const currentSnippet = medleySongs[currentSnippetIdx] || null;
  const currentSnippetRef = useRef(currentSnippet);
  currentSnippetRef.current = currentSnippet;

  // ── Time (owned by main hook — driven by game loop / fallback timer) ──
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Pause handling: properly stop game loop when pause is triggered ──
  // The audio hook pauses the media elements, but we also need to set
  // isPlaying=false so the game loop interval is cleaned up, and
  // isSongPlaying is updated for companion sync.
  const wasPausedRef = useRef(false);
  useEffect(() => {
    if (pauseDialogAction === 'song-pause' && isPlaying) {
      wasPausedRef.current = true;
      setIsPlaying(false);
      setIsSongPlaying(false);
    } else if (pauseDialogAction === null && wasPausedRef.current && !isPlaying && phase === 'playing') {
      wasPausedRef.current = false;
      // Resume: only if we paused while in the playing phase
      // The audio hook will handle resuming audio playback
      setIsPlaying(true);
      setIsSongPlaying(true);
    }
  }, [pauseDialogAction, isPlaying, phase, setIsSongPlaying]);

  // ── Game settings (display preferences) ──
  const { showBackgroundVideo, useAnimatedBackground } = useGameSettings();

  // ── Players (mutable ref for performance) ──
  const initialMappedPlayers = useMemo(
    () => initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE, snippetsSung: 0, isEliminated: false })),
    [initialPlayers],
  );
  const playersRef = useRef<MedleyPlayer[]>(initialMappedPlayers);
  const [___playersDisplay, setPlayersDisplay] = useState<MedleyPlayer[]>(initialMappedPlayers);
  const forceRender = useCallback(() => setPlayersDisplay([...playersRef.current]), []);

  // ── Multi-pitch detection (one detector per player) + isSongPlaying sync ──
  const {
    multiPitch, multiPitchRef, setDifficultyOnDetector, lastIsSongPlayingRef,
  } = useMedleyPitchDetection({
    initialPlayers,
    settings,
    phase,
    isPlaying,
    setIsSongPlaying,
  });

  // ==================== COMPOSE SUB-HOOKS ====================
  // Features hook is called first so activeModifier is available for audio.

  const features = useMedleyFeatures({
    phase,
    currentSnippetIdx,
    totalSnippets: medleySongs.length,
    settings,
    medleySongs,
    playersRef,
    isEliminationMode,
    isTeam,
    matchups,
    setDifficultyOnDetector,
  });

  const audio = useMedleyAudio({
    currentSnippet,
    currentSnippetIdx,
    // Item 7: preload the next snippet while the current one plays so the
    // transition into it is uniform (no alternating instant/ loading gaps).
    nextSnippet: medleySongs[currentSnippetIdx + 1] || null,
    phase,
    phaseRef,
    isPlaying,
    activeModifier: features.activeModifier,
    pauseDialogAction,
    currentTimeMs,
  });

  const teamBonuses = useMedleyTeamBonuses({
    isTeam,
    teamBonusesEnabled: settings.teamBonusesEnabled,
    currentSnippetIdx,
    totalSnippets: medleySongs.length,
    matchups,
    playersRef,
    snippetScoreSnapshotsRef: features.snippetScoreSnapshotsRef,
  });

  const elimination = useMedleyElimination({
    isEliminationMode,
    playersRef,
    forceRender,
  });

  // ==================== SCORING ====================

  // ── Get active players for current snippet ──
  const getActivePlayerIds = useCallback((): string[] => {
    if (isEliminationMode) {
      // Elimination: ALL non-eliminated players sing every snippet
      return playersRef.current.filter(p => !p.isEliminated).map(p => p.id);
    }
    if (isTeam) {
      if (currentSnippetIdx < matchups.length) {
        const matchup = matchups[currentSnippetIdx];
        return [matchup.playerA.id, matchup.playerB.id];
      }
      return [];
    }
    return playersRef.current.map(p => p.id);
  }, [isTeam, isEliminationMode, currentSnippetIdx, matchups]);

  // ── Tick-based scoring (10,000 points) + visual performance samples ──
  const {
    lastScoringEvents,
    notePerformance, setNotePerformance, notePerformanceRef,
    notePerformanceByPlayer, setNotePerformanceByPlayer, notePerformanceByPlayerRef,
    scoringEventsRef, lastScoringUiUpdateRef,
    medleyTickScoringStatesRef, snippetScoringMetaRef, lastSnippetIdxForMetaRef,
    finalizeSnippetScores, scorePlayer,
    setLastScoringEvents,
  } = useMedleyScoring({
    playersRef,
    currentSnippet,
    currentSnippetIdx,
    medleySongs,
    settings,
    audio,
    teamBonuses,
  });

  // ── New round's songs arrival (Fix 7) ──
  // When the parent swaps in a NEW songs array (next round was prepared by
  // handleNextRound), rewind to the first snippet. Armed ONLY by
  // handleNextRound, so the first mount (and any spurious identity churn
  // mid-round) never rewinds progress.
  const nextRoundSongsArmedRef = useRef(false);
  const lastSongsIdentityRef = useRef(medleySongs);
  useEffect(() => {
    if (lastSongsIdentityRef.current === medleySongs) return; // first mount / same array
    lastSongsIdentityRef.current = medleySongs;
    if (!nextRoundSongsArmedRef.current) return;
    nextRoundSongsArmedRef.current = false;
    setCurrentSnippetIdx(0);
    setCurrentTimeMs(0);
    lastTransitionAdvanceRef.current = -1;
    notePerformanceRef.current = new Map();
    notePerformanceByPlayerRef.current = new Map();
    setNotePerformance(new Map());
    setNotePerformanceByPlayer(new Map());
  }, [medleySongs]);

  // ==================== GAME LOOP ====================

  useMedleyGameLoop({
    phase,
    isPlaying,
    currentSnippet,
    currentSnippetIdx,
    medleySongs,
    settings,
    pauseDialogAction,
    currentTimeMs,
    isEliminationMode,
    playersRef,
    multiPitchRef,
    audio,
    features,
    teamBonuses,
    elimination,
    getActivePlayerIds,
    finalizeSnippetScores,
    scorePlayer,
    setPhase,
    setIsPlaying,
    setCurrentTimeMs,
    scoringEventsRef,
    setLastScoringEvents,
    lastScoringUiUpdateRef,
    notePerformanceRef,
    notePerformanceByPlayerRef,
    setNotePerformance,
    setNotePerformanceByPlayer,
    forceRender,
  });

  // ── Transition: pulse then next snippet (countdown owns the advance) ──
  useMedleyTransition({
    phase,
    currentSnippetIdx,
    settings,
    lastTransitionAdvanceRef,
    setTransitionCount,
    setCurrentSnippetIdx,
    setPhase,
    setIsPlaying,
    setCurrentTimeMs,
    notePerformanceRef,
    notePerformanceByPlayerRef,
    setNotePerformance,
    setNotePerformanceByPlayer,
    audio,
    teamBonuses,
  });

  // ==================== ACTIONS ====================

  const {
    isPreparingNextRound,
    handleStart,
    handleNextRound,
    handleRoundComplete,
    handleEndEarly,
  } = useMedleyRoundActions({
    medleySongs,
    settings,
    isTeam,
    isEliminationMode,
    currentSnippetIdx,
    playersRef,
    onRoundComplete,
    onPrepareNextRoundSongsRef,
    multiPitch,
    audio,
    features,
    teamBonuses,
    elimination,
    getActivePlayerIds,
    finalizeSnippetScores,
    setPhase,
    setIsPlaying,
    setCurrentSnippetIdx,
    setCurrentTimeMs,
    setIsSongPlaying,
    nextRoundSongsArmedRef,
    lastTransitionAdvanceRef,
    scoringEventsRef,
    setLastScoringEvents,
    medleyTickScoringStatesRef,
    snippetScoringMetaRef,
    lastSnippetIdxForMetaRef,
    notePerformanceRef,
    notePerformanceByPlayerRef,
    setNotePerformance,
    setNotePerformanceByPlayer,
    forceRender,
  });

  // ── Helpers ──
  const snippetProgress = currentSnippet
    ? Math.min((currentTimeMs / currentSnippet.duration) * 100, 100)
    : 0;
  const totalProgress = medleySongs.length > 0
    ? ((currentSnippetIdx + 1) / medleySongs.length) * 100
    : 0;

  // ── Get current lyric line ──
  // Mirrors the normal game's line selection (single-player-lyrics.tsx):
  //  1. The line whose [startTime, endTime] contains the current time — a
  //     line STOPS being current when its LAST note ends, not when the next
  //     line's first note begins.
  //  2. During the gap after a line ended: the NEXT line already shows when
  //     its start is within the 2s preview window ("flüssig" — the singer
  //     can read ahead during pauses, same behaviour as all other modes).
  // Previously the window extended to the NEXT line's first note, so the
  // old line lingered through the whole instrumental gap and switched only
  // at the next note onset (user report: "Zeile wechselt erst mit Beginn
  // der ersten Note").
  const currentLyricLine = useMemo(() => {
    if (!audio.snippetLyrics.length || !currentSnippet) return null;
    // ROUND 2: use the EFFECTIVE (possibly repositioned) snippet start — the
    // same time base as the game loop (effectiveSnippetRef). The original
    // currentSnippet.startTime made every line switch offset by the
    // reposition delta when lyrics needed repositioning.
    const absoluteTime = audio.effectiveStartMs + currentTimeMs;

    // 1) Active line (startTime..endTime, endTime = end of the last note)
    const active = audio.snippetLyrics.find(
      line => absoluteTime >= line.startTime && absoluteTime <= line.endTime,
    );
    if (active) return active;

    // 2) Gap → next line within the preview window (2s, like the normal game)
    const upcoming = audio.snippetLyrics.find(
      line => line.startTime > absoluteTime && line.startTime - absoluteTime <= 2000,
    );
    return upcoming ?? null;
  }, [currentTimeMs, audio.snippetLyrics, currentSnippet, audio.effectiveStartMs]);

  // Current matchup (team mode)
  const currentMatchup = isTeam && currentSnippetIdx < matchups.length
    ? matchups[currentSnippetIdx]
    : null;

  // ── Show final results ──
  const handleShowFinalResults = useCallback(() => {
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    setPhase('final-results');
  }, [setIsSongPlaying]);

  // ── Elimination helpers ──
  const activePlayerCount = playersRef.current.filter(p => !p.isEliminated).length;
  const totalPlayerCount = playersRef.current.length;

  return {
    phase,
    transitionCount,
    currentSnippet,
    currentSnippetIdx,
    snippetNotes: audio.snippetNotes,
    snippetLyrics: audio.snippetLyrics,
    audioRef: audio.audioRef,
    videoRef: audio.videoRef,
    fallbackVideoRef: audio.fallbackVideoRef,
    audioUrl: audio.audioUrl,
    audioError: audio.audioError,
    mediaReady: audio.mediaReady,
    isPreparingNextRound,
    currentTimeMs,
    isPlaying,
    // Effective (possibly repositioned) snippet start — the note highway and
    // all absolute-time consumers must use this instead of snippet.startTime.
    effectiveStartMs: audio.effectiveStartMs,
    restoredSong: audio.restoredSong,
    showBackgroundVideo,
    useAnimatedBackground,
    playersDisplay: ___playersDisplay,
    snippetProgress,
    totalProgress,
    currentMatchup,
    currentLyricLine,
    lastScoringEvents,
    notePerformance,
    notePerformanceByPlayer,
    currentDynamicDifficulty: features.currentDynamicDifficulty,
    // Feature #10
    isEliminationMode,
    eliminationOrder: elimination.eliminationOrder,
    activePlayerCount,
    totalPlayerCount,
    finalFaceOff: elimination.finalFaceOff,
    // Feature #15
    activeModifier: features.activeModifier,
    modifierJustRevealed: features.modifierJustRevealed,
    // Feature #16
    isMysteryMode: settings.mysteryMode,
    mysteryReveal: features.mysteryReveal,
    mysteryRevealSong: features.mysteryRevealSong,
    // Feature #17
    highlights: features.highlights,
    // Feature #18
    synergyTriggered: teamBonuses.synergyTriggered,
    comebackTriggered: teamBonuses.comebackTriggered,
    comebackTeamId: teamBonuses.comebackTeamId,
    comebackActiveTeamId: teamBonuses.comebackActiveTeamId,
    teamBonusResult: teamBonuses.teamBonusResult,
    // Core
    multiPitch,
    isTeam,
    handleStart,
    handleNextRound,
    handleEndEarly,
    handleRoundComplete,
    handleShowFinalResults,
    forceRender,
  };
}
