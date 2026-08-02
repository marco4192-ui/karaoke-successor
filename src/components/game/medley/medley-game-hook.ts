/**
 * Medley Contest — Core Game Logic Hook
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
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useMultiPitchDetector, type PlayerPitchConfig } from '@/hooks/use-multi-pitch-detector';
import { usePartyStore } from '@/lib/game/party-store';
import { shouldSkipPitch, createMedleyTickScoringState, evaluateMedleyTick, type MedleyTickScoringState } from '@/lib/game/party-scoring';
import { calculateScoringMetadata, type ScoringMetadata } from '@/lib/game/scoring';
import { useTranslation } from '@/lib/i18n/translations';
import { useGameSettings } from '@/hooks/use-game-settings';
import type { Note, LyricLine, PitchDetectionResult, Song, Difficulty } from '@/types/game';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult, MedleyScoringEvent,
  VoiceModifier, MedleyHighlight, TeamBonusResult,
} from './medley-types';
import { getDynamicDifficulty } from './medley-scoring';

// ── Sub-hook imports ──
import { useMedleyAudio } from './hooks/use-medley-audio';
import { useMedleyFeatures } from './hooks/use-medley-features';
import { useMedleyTeamBonuses } from './hooks/use-medley-team-bonuses';
import { useMedleyElimination } from './hooks/use-medley-elimination';

// ===================== PROPS =====================

export interface MedleyGameScreenProps {
  players: MedleyPlayer[];
  songs: MedleySong[];
  settings: MedleySettings;
  matchups: SnippetMatchup[];
  /** @deprecated Pass for forward-compat; currently unused by hook */
  _seriesHistory?: MedleyRoundResult[];
  onRoundComplete: (_result: MedleyRoundResult, _updatedPlayers: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

// ===================== RETURN TYPE =====================

interface MedleyGameState {
  // Phase
  phase: MedleyGamePhase;
  transitionCount: number;

  // Current snippet
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];

  // Audio
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Separate video ref for audio fallback — NOT shared with GameBackground */
  fallbackVideoRef: React.RefObject<HTMLVideoElement | null>;
  audioUrl: string | null;
  audioError: string | null;
  currentTimeMs: number;
  isPlaying: boolean;
  restoredSong: Song | null;

  // Players (display copy)
  playersDisplay: MedleyPlayer[];

  // Scoring helpers
  snippetProgress: number;
  totalProgress: number;
  currentMatchup: SnippetMatchup | null;
  currentLyricLine: LyricLine | null;

  // Feature #5: Scoring events for UI popups
  lastScoringEvents: MedleyScoringEvent[];

  // Feature #9: Dynamic difficulty
  currentDynamicDifficulty: Difficulty | null;

  // Feature #10: Elimination
  isEliminationMode: boolean;
  eliminationOrder: string[];
  activePlayerCount: number;
  totalPlayerCount: number;
  /** True when exactly 2 players remain in elimination mode (final face-off) */
  finalFaceOff: boolean;

  // Feature #15: Voice modifier
  activeModifier: VoiceModifier;
  modifierJustRevealed: boolean;

  // Feature #16: Mystery mode
  isMysteryMode: boolean;
  mysteryReveal: boolean;
  mysteryRevealSong: MedleySong | null;

  // Feature #17: Highlights
  highlights: MedleyHighlight[];

  // Feature #18: Team bonuses
  synergyTriggered: boolean;
  comebackTriggered: boolean;
  comebackTeamId: number | null;
  /** Whether comeback multiplier is active during the current snippet (set before snippet starts) */
  comebackActiveTeamId: number | null;
  /** Full team bonus result data for results screens */
  teamBonusResult: TeamBonusResult;

  // Pitch detection
  multiPitch: ReturnType<typeof useMultiPitchDetector>;

  // Team
  isTeam: boolean;

  // Display settings (from useGameSettings)
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;

  // Actions
  handleStart: () => Promise<void>;
  handleEndEarly: () => void;
  handleRoundComplete: () => void;
  handleShowFinalResults: () => void;
  forceRender: () => void;
}

// ===================== HOOK =====================

export function useMedleyGame({
  players: initialPlayers,
  songs: medleySongs,
  settings,
  matchups,
  onRoundComplete,
  onEndGame,
}: MedleyGameScreenProps): MedleyGameState {
  // Subscribe to specific fields only (NOT the entire store) to minimize re-renders.
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const { t } = useTranslation();
  const isTeam = settings.playMode === 'team';
  const isEliminationMode = settings.playMode === 'elimination';

  // Store onEndGame in ref for use in game loop callbacks
  const onEndGameRef = useRef(onEndGame);
  onEndGameRef.current = onEndGame;

  // ── Phase ──
  const [phase, setPhase] = useState<MedleyGamePhase>('intro');
  const phaseRef = useRef<MedleyGamePhase>('intro');
  const [transitionCount, setTransitionCount] = useState(3);
  // Keep phaseRef in sync (used in async callbacks to avoid stale closures)
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Current snippet ──
  const [currentSnippetIdx, setCurrentSnippetIdx] = useState(0);
  const currentSnippet = medleySongs[currentSnippetIdx] || null;
  const currentSnippetRef = useRef(currentSnippet);
  currentSnippetRef.current = currentSnippet;

  // ── Time (owned by main hook — driven by game loop / fallback timer) ──
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  // ── Feature #5: Scoring events for UI feedback ──
  const [lastScoringEvents, setLastScoringEvents] = useState<MedleyScoringEvent[]>([]);
  const scoringEventsRef = useRef<MedleyScoringEvent[]>([]);
  // Throttle UI update for scoring events to ~100ms
  const lastScoringUiUpdateRef = useRef(0);

  // Per-player tick-based scoring state for Medley (10,000 total points)
  const medleyTickScoringStatesRef = useRef<Map<string, MedleyTickScoringState>>(new Map());

  // Tick-based scoring metadata for current snippet (10,000 max points)
  // Lazily computed on first scorePlayer call per snippet.
  const snippetScoringMetaRef = useRef<ScoringMetadata | null>(null);
  const lastSnippetIdxForMetaRef = useRef<number>(-1);

  // Reset tick scoring states when snippet changes
  useEffect(() => {
    medleyTickScoringStatesRef.current.clear();
    for (const p of playersRef.current) {
      medleyTickScoringStatesRef.current.set(p.id, createMedleyTickScoringState());
    }
    snippetScoringMetaRef.current = null;
  }, [currentSnippetIdx]);

  // ── Multi-pitch detection (one detector per player) ──
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    initialPlayers.map(p => ({
      playerId: p.id,
      type: p.inputType,
      deviceId: p.micId,
      mobileClientId: p.mobileClientId,
      stereoChannel: p.stereoChannel,
    })),
    [initialPlayers],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty: settings.difficulty,
    autoStart: false,
  });

  // Ref für multiPitch — useMultiPitchDetector gibt bei jedem Render ein neues Objekt zurück.
  // Wird in Effekts/Callbacks verwendet, um unnötige Neustarts zu vermeiden.
  const multiPitchRef = useRef(multiPitch);
  multiPitchRef.current = multiPitch;

  // ── Song playing status (ref-guarded to prevent React #185) ──
  const lastIsSongPlayingRef = useRef(false);
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Cleanup: reset isSongPlaying on unmount ──
  useEffect(() => {
    return () => {
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    };
  }, [setIsSongPlaying]);

  // ── Callback to set difficulty on the pitch detector (used by features hook) ──
  const setDifficultyOnDetector = useCallback((diff: Difficulty) => {
    multiPitchRef.current.setDifficulty(diff);
  }, []);

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

  // ── Finalize is no longer needed with tick-based scoring (points are awarded per tick). ──
  // Kept as a no-op for backward compat with callers.
  const finalizeSnippetScores = useCallback((_activeIds: string[]) => {
    // Tick-based scoring awards points immediately — nothing to finalize at snippet end.
  }, []);

  // ── Score a single player based on THEIR pitch result (tick-based: 10,000 total points) ──
  const scorePlayer = useCallback((
    playerId: string,
    pitch: PitchDetectionResult | null,
    absTime: number,
  ) => {
    if (!pitch) return;
    // Skip eliminated players
    const player = playersRef.current.find(p => p.id === playerId);
    if (player?.isEliminated) return;

    // Use dynamic difficulty for pitch filtering when available
    const effectiveDiff = settings.dynamicDifficulty
      ? getDynamicDifficulty(currentSnippetIdx, medleySongs.length)
      : settings.difficulty;
    if (shouldSkipPitch(pitch, effectiveDiff)) return;
    if (!currentSnippet) return;
    if (pitch.note == null) return;

    // Get or create per-player tick scoring state
    let tickState = medleyTickScoringStatesRef.current.get(playerId);
    if (!tickState) {
      tickState = createMedleyTickScoringState();
      medleyTickScoringStatesRef.current.set(playerId, tickState);
    }

    const pIdx = playersRef.current.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;
    const p = playersRef.current[pIdx];

    // Lazy-compute scoring metadata for this snippet (only once per snippet change)
    if (lastSnippetIdxForMetaRef.current !== currentSnippetIdx && audio.snippetNotes.length > 0) {
      const beatDuration = audio.beatDurationRef.current || 500;
      const notesForMeta = audio.snippetNotes.map(n => ({
        duration: n.duration,
        isGolden: n.isGolden ?? false,
      }));
      snippetScoringMetaRef.current = calculateScoringMetadata(notesForMeta, beatDuration, 'medium', 10000);
      lastSnippetIdxForMetaRef.current = currentSnippetIdx;
    }

    // Tick-based scoring: evaluate pitch against active note
    const beatDuration = audio.beatDurationRef.current || 500;
    const result = evaluateMedleyTick(
      pitch.note, absTime, audio.snippetNotes, effectiveDiff, beatDuration, tickState, snippetScoringMetaRef.current,
    );

    if (result.points > 0) {
      let points = result.points;
      if (teamBonuses.comebackActiveTeamIdRef.current !== null && p.team === teamBonuses.comebackActiveTeamIdRef.current) {
        points = Math.round(points * 1.5);
      }
      p.score += points;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;

      // Count a note as "hit" when ticks are hit (using ticksHit as proxy)
      p.notesHit = tickState.ticksHit;

      scoringEventsRef.current.push({
        playerId,
        points,
        hit: true,
        golden: false,
        timestamp: Date.now(),
      });
    } else if (result.hit) {
      // Tick evaluated but no points (shouldn't happen with valid scoringMeta, but handle gracefully)
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;

      scoringEventsRef.current.push({
        playerId,
        points: -10,
        hit: false,
        golden: false,
        timestamp: Date.now(),
      });
    }

    playersRef.current[pIdx] = { ...p };
  }, [audio.snippetNotes, audio.beatDurationRef, currentSnippet, settings.difficulty, settings.dynamicDifficulty, currentSnippetIdx, medleySongs.length, teamBonuses.comebackActiveTeamIdRef]);

  // ==================== GAME LOOP ====================

  // ── Audio stall fallback timer ──
  // If audio fails to play or stalls, auto-advance after a grace period.
  // Uses a long grace period (8s) to avoid false positives during loading.
  // Also freezes during pause (isPausedRef).
  // Suppressed while isPreparingRef is true (audio still loading).
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet || audio.isPausedRef.current) return;
    // Don't start stall detection while audio is still being prepared
    if (audio.isPreparingRef.current) return;

    const effective = audio.effectiveSnippetRef.current;
    const effectiveStart = effective?.startTime ?? currentSnippet.startTime;
    const effectiveEnd = effective?.endTime ?? currentSnippet.endTime;
    const snippetDuration = effectiveEnd - effectiveStart;
    let stallDetected = false;
    let stallCheckCount = 0;
    const STALL_CHECK_LIMIT = 16; // 16 × 500ms = 8 seconds grace period

    const checkInterval = setInterval(() => {
      if (audio.isPausedRef.current) return;
      // Don't trigger fallback while still preparing
      if (audio.isPreparingRef.current) { stallCheckCount = 0; return; }
      const audioEl = audio.audioRef.current;
      const fallbackVideo = audio.fallbackVideoRef.current;
      // Audio or video is playing fine — no stall
      const anyMediaPlaying = (audioEl && !audioEl.paused) || (fallbackVideo && !fallbackVideo.paused);
      if (anyMediaPlaying) {
        stallCheckCount = 0;
        return;
      }
      stallCheckCount++;
      if (stallCheckCount >= STALL_CHECK_LIMIT && !stallDetected) {
        stallDetected = true;
        const fallbackStartTime = Date.now();
        const startMs = currentTimeMs;
        // eslint-disable-next-line no-console
        console.warn('[Medley] Running in fallback mode (no audio)');
        clearInterval(checkInterval);
        audio.fallbackTimerRef.current = setInterval(() => {
          if (audio.isPausedRef.current) return;
          const elapsed = Date.now() - fallbackStartTime;
          const time = startMs + elapsed;
          setCurrentTimeMs(time);

          if (time >= snippetDuration) {
            if (audio.fallbackTimerRef.current) clearInterval(audio.fallbackTimerRef.current);
            audio.fallbackTimerRef.current = null;
            setIsPlaying(false);

            const activeIds = getActivePlayerIds();
            // Finalize pending note scores before transitioning
            finalizeSnippetScores(activeIds);

            activeIds.forEach(id => {
              const p = playersRef.current.find(p => p.id === id);
              if (p) p.snippetsSung++;
            });
            features.buildSnippetHighlight(currentSnippetIdx);
            teamBonuses.checkSynergy();
            teamBonuses.finalizeComeback();
            teamBonuses.syncTeamBonusResult();
            if (isEliminationMode) {
              elimination.eliminateLowestScorer();
              const remainingAfterElim = playersRef.current.filter(p => !p.isEliminated);
              if (remainingAfterElim.length <= 1) {
                setPhase('round-results');
                return;
              }
            }
            forceRender();

            if (currentSnippetIdx < medleySongs.length - 1) {
              setPhase('transition');
            } else {
              setPhase('round-results');
            }
          }
        }, 80);
      }
    }, 500);

    return () => {
      clearInterval(checkInterval);
      if (audio.fallbackTimerRef.current) { clearInterval(audio.fallbackTimerRef.current); audio.fallbackTimerRef.current = null; }
    };
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, medleySongs.length, pauseDialogAction, finalizeSnippetScores]);

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;

    const loop = setInterval(() => {
      // Don't advance while paused
      if (audio.isPausedRef.current) return;

      // Read time from whichever media element is actually playing (like PTM)
      const audioEl = audio.audioRef.current;
      const fallbackVideo = audio.fallbackVideoRef.current;
      let songTimeMs: number | null = null;
      if (audioEl && !audioEl.paused && audioEl.readyState >= 2) {
        songTimeMs = audioEl.currentTime * 1000;
      } else if (fallbackVideo && !fallbackVideo.paused && fallbackVideo.readyState >= 2) {
        songTimeMs = fallbackVideo.currentTime * 1000;
      }
      if (songTimeMs === null) return;

      // Cancel fallback timer now that real media is driving time
      if (audio.fallbackTimerRef.current) {
        clearInterval(audio.fallbackTimerRef.current);
        audio.fallbackTimerRef.current = null;
      }

      const effectiveStart = audio.effectiveSnippetRef.current?.startTime ?? currentSnippet.startTime;
      const effectiveEnd = audio.effectiveSnippetRef.current?.endTime ?? currentSnippet.endTime;
      const snippetTime = songTimeMs - effectiveStart;
      setCurrentTimeMs(snippetTime);

      // Check snippet end
      if (songTimeMs >= effectiveEnd) {
        // Finalize pending note scores for active players before transitioning
        const activeIds = getActivePlayerIds();
        finalizeSnippetScores(activeIds);

        // Stop whichever media is playing
        if (audioEl && !audioEl.paused) audioEl.pause();
        if (audio.fallbackVideoRef.current && !audio.fallbackVideoRef.current.paused) audio.fallbackVideoRef.current.pause();
        if (audioEl) audioEl.playbackRate = 1.0; // Reset playback rate
        setIsPlaying(false);

        // Count snippet as sung for active players
        activeIds.forEach(id => {
          const p = playersRef.current.find(p => p.id === id);
          if (p) p.snippetsSung++;
        });

        // Feature #17: Build highlight for this snippet
        features.buildSnippetHighlight(currentSnippetIdx);

        // Feature #18: Check team synergy at snippet end
        teamBonuses.checkSynergy();
        // Feature #18: Finalize comeback bonus (if active on last snippet)
        teamBonuses.finalizeComeback();
        // Sync team bonus result to state for UI
        teamBonuses.syncTeamBonusResult();

        forceRender();

        // Feature #10: Elimination — eliminate lowest scorer after snippet
        if (isEliminationMode) {
          elimination.eliminateLowestScorer();
          // Feature #10: If only 1 player remains, end game immediately
          const remainingAfterElim = playersRef.current.filter(p => !p.isEliminated);
          if (remainingAfterElim.length <= 1) {
            setPhase('round-results');
            return;
          }
        }

        // Feature #16: Mystery mode — show reveal
        if (settings.mysteryMode) {
          features.setMysteryReveal(true);
          features.setMysteryRevealSong(currentSnippet);
          // After 2 seconds, continue to transition/round-results
          setTimeout(() => {
            features.setMysteryReveal(false);
            features.setMysteryRevealSong(null);
            if (currentSnippetIdx < medleySongs.length - 1) {
              setPhase('transition');
            } else {
              setPhase('round-results');
            }
          }, 2000);
          return;
        }

        // Move to next or round-results
        if (currentSnippetIdx < medleySongs.length - 1) {
          setPhase('transition');
        } else {
          setPhase('round-results');
        }
        return;
      }

      // Score ALL active players individually using their own pitch
      const absTime = effectiveStart + snippetTime;
      const activeIds = getActivePlayerIds();
      for (const pid of activeIds) {
        const playerPitch = multiPitchRef.current.getPlayerPitch(pid);
        scorePlayer(pid, playerPitch, absTime);
      }

      // Feature #5: Push scoring events to UI state (throttled to ~100ms)
      const now = Date.now();
      if (now - lastScoringUiUpdateRef.current > 80 && scoringEventsRef.current.length > 0) {
        lastScoringUiUpdateRef.current = now;
        setLastScoringEvents([...scoringEventsRef.current]);
        // Keep events for 1.5 seconds, then discard
        const cutoff = now - 1500;
        scoringEventsRef.current = scoringEventsRef.current.filter(e => e.timestamp > cutoff);
      }

      // Keep display state in sync with ref mutations for live score updates
      forceRender();
    }, 50);

    return () => clearInterval(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, scorePlayer, getActivePlayerIds, forceRender, isEliminationMode, elimination.eliminateLowestScorer, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, settings.mysteryMode, medleySongs.length, teamBonuses.syncTeamBonusResult, finalizeSnippetScores]);

  // ── Transition: pulse then next snippet ──
  useEffect(() => {
    if (phase !== 'transition') return;
    const transitionTime = settings.transitionTime ?? 3;
    setTransitionCount(transitionTime);

    const interval = setInterval(() => {
      setTransitionCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const nextIdx = currentSnippetIdx + 1;
          setCurrentSnippetIdx(nextIdx);
          setPhase('playing');
          setIsPlaying(true); // CRITICAL: must re-enable playing for the next snippet
          setCurrentTimeMs(0);
          audio.lastPlayPhaseRef.current = ''; // Reset so the play effect fires for new snippet
          // Feature #18: Pre-check comeback boost before the last snippet starts
          teamBonuses.preCheckComeback(nextIdx);
          return transitionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentSnippetIdx, teamBonuses.preCheckComeback]);

  // ==================== ACTIONS ====================

  // ── Start game ──
  const handleStart = useCallback(async () => {
    if (medleySongs.length === 0) return;
    elimination.resetFinalFaceOff();
    setCurrentTimeMs(0);

    // Initialize multi-pitch detection (non-blocking).
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Multi-pitch init failed:', e);
    }

    // Start playing immediately (no countdown phase)
    audio.cancelFallbackTimer();
    audio.effectiveSnippetRef.current = null;
    setPhase('playing');
    setIsPlaying(true);
    setCurrentTimeMs(0);
    audio.lastPlayPhaseRef.current = ''; // Reset so the play effect fires
  }, [multiPitch, audio.cancelFallbackTimer, audio.effectiveSnippetRef, audio.lastPlayPhaseRef]);

  // ── Round complete ──
  const handleRoundComplete = useCallback(() => {
    // Final sync of team bonus result before recording
    teamBonuses.syncTeamBonusResult();
    teamBonuses.computeMVP();
    teamBonuses.syncTeamBonusResult(); // Sync again after MVP is computed

    const roundResult: MedleyRoundResult = {
      playedAt: Date.now(),
      snippetCount: medleySongs.length,
      playMode: settings.playMode,
      playerScores: {},
      teamScores: isTeam
        ? {
            teamA: playersRef.current.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0),
            teamB: playersRef.current.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0),
          }
        : undefined,
      eliminationOrder: isEliminationMode ? [...elimination.eliminationOrderRef.current] : undefined,
      snippetHighlights: features.highlightsRef.current.length > 0 ? [...features.highlightsRef.current] : undefined,
      teamBonusResult: isTeam && settings.teamBonusesEnabled ? { ...teamBonuses.teamBonusResultRef.current } : undefined,
    };
    for (const p of playersRef.current) {
      roundResult.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
        snippetsSung: p.snippetsSung,
      };
    }

    onRoundComplete(roundResult, [...playersRef.current]);
  }, [medleySongs.length, isTeam, isEliminationMode, onRoundComplete, settings.playMode, settings.teamBonusesEnabled, teamBonuses.computeMVP, teamBonuses.syncTeamBonusResult, teamBonuses.teamBonusResultRef, elimination.eliminationOrderRef, features.highlightsRef]);

  // ── End song early ──
  const handleEndEarly = useCallback(() => {
    if (audio.audioRef.current) {
      audio.audioRef.current.pause();
      audio.audioRef.current.playbackRate = 1.0; // Reset playback rate
    }
    if (audio.fallbackVideoRef.current) {
      audio.fallbackVideoRef.current.pause();
    }
    audio.cancelFallbackTimer();
    setIsPlaying(false);
    setIsSongPlaying(false);
    // NOTE: Do NOT call multiPitch.stop() here. Pitch detection must remain
    // alive across snippets — it is only started once in handleStart() and
    // cleaned up on unmount / full game end.

    // Count snippet as sung for active players
    const activeIds = getActivePlayerIds();
    // Finalize pending note scores for active players before transitioning
    finalizeSnippetScores(activeIds);
    activeIds.forEach(id => {
      const p = playersRef.current.find(p => p.id === id);
      if (p) p.snippetsSung++;
    });

    // Feature #17: Build highlight for this snippet
    features.buildSnippetHighlight(currentSnippetIdx);

    // Feature #18: Check team synergy at snippet end
    teamBonuses.checkSynergy();
    // Feature #18: Finalize comeback bonus (if active on last snippet)
    teamBonuses.finalizeComeback();
    // Sync team bonus result to state for UI
    teamBonuses.syncTeamBonusResult();

    forceRender();

    if (currentSnippetIdx < medleySongs.length - 1) {
      setPhase('transition');
    } else {
      setPhase('round-results');
    }
  }, [currentSnippetIdx, medleySongs.length, getActivePlayerIds, finalizeSnippetScores, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, teamBonuses.syncTeamBonusResult, setIsSongPlaying, forceRender, audio.cancelFallbackTimer, audio.audioRef, audio.fallbackVideoRef]);

  // ── Cleanup on unmount ──
  // DO-NOT-CHANGE: Dependency must be [] (not [multiPitch]).
  // useMultiPitchDetector returns a new object every render, so [multiPitch]
  // caused the cleanup to fire on every re-render, which cleared the
  // countdown interval mid-countdown (killing the game start).
  useEffect(() => {
    return () => {
      multiPitch.stop();
      audio.cancelFallbackTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──
  const snippetProgress = currentSnippet
    ? Math.min((currentTimeMs / currentSnippet.duration) * 100, 100)
    : 0;
  const totalProgress = medleySongs.length > 0
    ? ((currentSnippetIdx + 1) / medleySongs.length) * 100
    : 0;

  // ── Get current lyric line ──
  const currentLyricLine = useMemo(() => {
    if (!audio.snippetLyrics.length || !currentSnippet) return null;
    const absoluteTime = currentSnippet.startTime + currentTimeMs;
    for (let i = 0; i < audio.snippetLyrics.length; i++) {
      const line = audio.snippetLyrics[i];
      const nextLine = audio.snippetLyrics[i + 1];
      if (absoluteTime >= line.startTime && (!nextLine || absoluteTime < nextLine.startTime)) {
        return line;
      }
    }
    return null;
  }, [currentTimeMs, audio.snippetLyrics, currentSnippet]);

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
    currentTimeMs,
    isPlaying,
    restoredSong: audio.restoredSong,
    showBackgroundVideo,
    useAnimatedBackground,
    playersDisplay: ___playersDisplay,
    snippetProgress,
    totalProgress,
    currentMatchup,
    currentLyricLine,
    lastScoringEvents,
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
    handleEndEarly,
    handleRoundComplete,
    handleShowFinalResults,
    forceRender,
  };
}
