/**
 * Medley Contest — Core Game Logic Hook
 *
 * Composes sub-modules for scoring, team bonuses, elimination, and
 * highlights.  This hook owns all React state, effects, and the game
 * loop; pure computations are delegated to focused modules.
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
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNoteFlat, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { useTranslation } from '@/lib/i18n/translations';
import { useGameSettings } from '@/hooks/use-game-settings';
import type { Note, LyricLine, PitchDetectionResult, Difficulty, Song } from '@/types/game';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult, MedleyScoringEvent,
  VoiceModifier, MedleyHighlight, TeamBonusResult,
} from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';

// ── Sub-module imports ──
import { getDynamicDifficulty, pickRandomModifier } from './medley-scoring';
import { computeSynergy, computeComebackPreCheck, computeComebackFinalize, computeMVP as computeMVPPure } from './medley-team-bonuses';
import { computeElimination } from './medley-elimination';
import { buildSnippetHighlight as buildHighlightPure } from './medley-highlights';

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
  countdown: number;
  transitionCount: number;

  // Current snippet
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];

  // Audio
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
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
  const [countdown, setCountdown] = useState(3);
  const [transitionCount, setTransitionCount] = useState(3);
  // Keep phaseRef in sync (used in async callbacks to avoid stale closures)
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Current snippet ──
  const [currentSnippetIdx, setCurrentSnippetIdx] = useState(0);
  const currentSnippet = medleySongs[currentSnippetIdx] || null;
  const currentSnippetRef = useRef(currentSnippet);
  currentSnippetRef.current = currentSnippet;

  // ── Audio / Video ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [restoredSong, setRestoredSong] = useState<Song | null>(null);
  // Track whether audio media is loaded and ready to play (set by prepare effect)
  const mediaReadyRef = useRef(false);
  // Flag: play was requested but audio wasn't ready yet (set by play trigger, consumed by canplay handler)
  const playWhenReadyRef = useRef(false);

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

  // ── Snippet notes (for lyrics display) ──
  const [snippetNotes, setSnippetNotes] = useState<Note[]>([]);
  const [snippetLyrics, setSnippetLyrics] = useState<LyricLine[]>([]);

  // ── Feature #5: Scoring events for UI feedback ──
  const [lastScoringEvents, setLastScoringEvents] = useState<MedleyScoringEvent[]>([]);
  const scoringEventsRef = useRef<MedleyScoringEvent[]>([]);
  // Throttle UI update for scoring events to ~100ms
  const lastScoringUiUpdateRef = useRef(0);

  // ── Feature #9: Dynamic difficulty ──
  const [currentDynamicDifficulty, setCurrentDynamicDifficulty] = useState<Difficulty | null>(null);

  // ── Feature #10: Elimination ──
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const eliminationOrderRef = useRef<string[]>([]);
  const [finalFaceOff, setFinalFaceOff] = useState(false);

  // ── Feature #15: Voice modifier ──
  const [activeModifier, setActiveModifier] = useState<VoiceModifier>('none');
  const [modifierJustRevealed, setModifierJustRevealed] = useState(false);

  // ── Feature #16: Mystery mode ──
  const [mysteryReveal, setMysteryReveal] = useState(false);
  const [mysteryRevealSong, setMysteryRevealSong] = useState<MedleySong | null>(null);

  // ── Feature #17: Highlights ──
  const highlightsRef = useRef<MedleyHighlight[]>([]);
  const [highlights, setHighlights] = useState<MedleyHighlight[]>([]);
  // Track per-snippet scores for highlights
  const snippetScoreSnapshotsRef = useRef<Record<string, { score: number; combo: number }>>({});

  // ── Feature #18: Team bonuses ──
  const [synergyTriggered, setSynergyTriggered] = useState(false);
  const [comebackTriggered, setComebackTriggered] = useState(false);
  const [comebackTeamId, setComebackTeamId] = useState<number | null>(null);
  const [comebackActiveTeamIdState, setComebackActiveTeamIdState] = useState<number | null>(null);
  /** Ref for comeback team — used in game loop scoring to avoid stale closures & game loop restarts */
  const comebackActiveTeamIdRef = useRef<number | null>(null);
  const [teamBonusResultState, setTeamBonusResultState] = useState<TeamBonusResult>({
    synergyPoints: {},
    comebackTeamId: null,
    comebackMultiplier: 1,
    mvpPlayerId: null,
    teamBonusTotal: {},
  });
  const teamBonusResultRef = useRef<TeamBonusResult>({
    synergyPoints: {},
    comebackTeamId: null,
    comebackMultiplier: 1,
    mvpPlayerId: null,
    teamBonusTotal: {},
  });
  /** Helper to sync teamBonusResult ref to state for UI */
  const syncTeamBonusResult = useCallback(() => {
    setTeamBonusResultState({ ...teamBonusResultRef.current });
  }, []);

  // ── Multi-pitch detection (one detector per player) ──
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    initialPlayers.map(p => ({
      playerId: p.id,
      type: p.inputType,
      deviceId: p.micId,
      mobileClientId: p.mobileClientId,
    })),
    [initialPlayers],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty: settings.difficulty,
    autoStart: false,
  });

  // ── Scoring metadata ──
  const scoringMetaRef = useRef<ReturnType<typeof calculateScoringMetadata> | null>(null);
  // Per-player last evaluation time for throttling
  const lastEvalTimeRef = useRef<Record<string, number>>({});

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

  // ── Pause / Resume sync ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      // Resume: seek to correct position and play
      if (audioRef.current && currentSnippet) {
        // eslint-disable-next-line no-console
        console.log('[Medley] Resuming playback');
        audioRef.current.currentTime = (currentSnippet.startTime + currentTimeMs) / 1000;
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [pauseDialogAction, isPlaying, phase, currentSnippet, currentTimeMs]);

  // ── Feature #9: Apply dynamic difficulty when snippet changes ──
  useEffect(() => {
    if (settings.dynamicDifficulty && phase === 'playing') {
      const diff = getDynamicDifficulty(currentSnippetIdx, medleySongs.length);
      setCurrentDynamicDifficulty(diff);
      multiPitch.setDifficulty(diff);
    } else if (!settings.dynamicDifficulty) {
      setCurrentDynamicDifficulty(null);
    }
  }, [currentSnippetIdx, settings.dynamicDifficulty, medleySongs.length, phase, multiPitch]);

  // ── Feature #15: Pick modifier when snippet changes ──
  useEffect(() => {
    if (phase === 'playing' && settings.modifiersEnabled) {
      const mod = pickRandomModifier();
      setActiveModifier(mod);
      setModifierJustRevealed(true);
      // Hide modifier reveal after 2 seconds
      const timer = setTimeout(() => setModifierJustRevealed(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setActiveModifier('none');
      setModifierJustRevealed(false);
    }
  }, [currentSnippetIdx, phase, settings.modifiersEnabled]);

  // ── Feature #15: Apply playback rate when modifier changes ──
  // Only updates the rate on an already-playing audio element (does NOT call play/load)
  useEffect(() => {
    if (!audioRef.current) return;
    const modDef = VOICE_MODIFIERS.find(m => m.id === activeModifier);
    if (modDef) {
      audioRef.current.playbackRate = modDef.playbackRate;
    } else {
      audioRef.current.playbackRate = 1.0;
    }
  }, [activeModifier]);

  // ── Feature #16: Reset mystery reveal when snippet changes ──
  useEffect(() => {
    setMysteryReveal(false);
    setMysteryRevealSong(null);
  }, [currentSnippetIdx]);

  // ── Snapshot scores at snippet start for highlights ──
  useEffect(() => {
    if (phase === 'playing') {
      const snapshot: Record<string, { score: number; combo: number }> = {};
      for (const p of playersRef.current) {
        snapshot[p.id] = { score: p.score, combo: p.combo };
      }
      snippetScoreSnapshotsRef.current = snapshot;
    }
  }, [currentSnippetIdx, phase]);

  // ── Prepare snippet audio + notes + video ──
  // Loads audio directly (sets src + waits for canplay) to avoid race condition
  // where a separate effect's load() call aborts a pending play().
  useEffect(() => {
    if (!currentSnippet) return;
    let cancelled = false;

    const prepare = async () => {
      setAudioUrl(null);
      setAudioError(null);
      mediaReadyRef.current = false;

      try {
        const prepared = await ensureSongUrls(currentSnippet.song);
        if (cancelled) return;

        // Store fully restored song for GameBackground usage
        setRestoredSong(prepared);

        // Extract notes within snippet range (does NOT depend on audio loading)
        const notes: Note[] = [];
        const lyrics: LyricLine[] = [];
        if (prepared.lyrics) {
          for (const line of prepared.lyrics) {
            const lineNotes = line.notes.filter(
              n => n.startTime < currentSnippet.endTime && (n.startTime + n.duration) > currentSnippet.startTime,
            );
            if (lineNotes.length > 0) {
              notes.push(...lineNotes);
              lyrics.push(line);
            }
          }
        }
        notes.sort((a, b) => a.startTime - b.startTime);
        setSnippetNotes(notes);
        setSnippetLyrics(lyrics);

        // Compute scoring metadata
        if (notes.length > 0 && prepared.bpm) {
          const beatDuration = 15000 / prepared.bpm;
          scoringMetaRef.current = calculateScoringMetadata(notes, beatDuration);
        } else {
          scoringMetaRef.current = null;
        }

        // Diagnostic: log notes/lyrics count
        // eslint-disable-next-line no-console
        console.log(`[Medley] Prepared snippet: notes=${notes.length}, lyrics=${lyrics.length}, audioUrl=${prepared.audioUrl ? 'yes' : 'no'}`);

        // Load audio directly here (not in a separate effect!)
        // A separate effect calling load() would race with play() and cause
        // "play() was interrupted by a call to pause()" errors.
        if (prepared.audioUrl) {
          setAudioUrl(prepared.audioUrl);
          const audio = audioRef.current;
          if (audio) {
            audio.src = prepared.audioUrl;
            // Wait for audio to be loadable
            await new Promise<void>((resolve) => {
              if (cancelled) { resolve(); return; }
              if (audio.readyState >= 3) { resolve(); return; }
              const onReady = () => {
                audio.removeEventListener('canplay', onReady);
                audio.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                audio.removeEventListener('canplay', onReady);
                audio.removeEventListener('error', onError);
                resolve();
              };
              audio.addEventListener('canplay', onReady);
              audio.addEventListener('error', onError);
              audio.load();
            });
            if (cancelled) return;
            mediaReadyRef.current = true;
            // eslint-disable-next-line no-console
            console.log('[Medley] Audio media ready');
            // If play was already requested (countdown finished before load), play now
            if (playWhenReadyRef.current && phaseRef.current === 'playing') {
              audio.currentTime = currentSnippet.startTime / 1000;
              audio.play().catch(e => {
                // eslint-disable-next-line no-console
                console.warn('[Medley] Delayed play after load failed:', e);
              });
              playWhenReadyRef.current = false;
            }
          }
        } else {
          setAudioError(t('medley.noAudioAvailable'));
        }
      } catch {
        if (!cancelled) setAudioError(t('medley.audioLoadFailed'));
      }
    };

    prepare();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnippet?.song.id, currentSnippetIdx]);

  // ── Play audio when entering 'playing' phase ──
  // Centralized: ALL play attempts go through this effect.
  // Handles first snippet (countdown→playing) and subsequent snippets (transition→playing).
  // Uses mediaReadyRef to avoid calling play() on an unloaded audio element.
  const lastPlayPhaseRef = useRef<string>('');
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;
    // Avoid re-triggering on unrelated re-renders (e.g. score updates)
    if (lastPlayPhaseRef.current === `${currentSnippetIdx}-${phase}`) return;
    lastPlayPhaseRef.current = `${currentSnippetIdx}-${phase}`;

    const audio = audioRef.current;
    if (!audio) return;

    if (!mediaReadyRef.current) {
      // Audio not loaded yet — set flag to play when canplay fires
      playWhenReadyRef.current = true;
      // eslint-disable-next-line no-console
      console.log('[Medley] Play requested but media not ready, will retry after load');
      return;
    }

    if (!audio.paused) return; // Already playing

    audio.currentTime = currentSnippet.startTime / 1000;
    // Apply active voice modifier playback rate
    const modDef = VOICE_MODIFIERS.find(m => m.id === activeModifier);
    if (modDef) audio.playbackRate = modDef.playbackRate;
    audio.play().catch(e => {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Play on phase enter failed:', e);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, currentSnippetIdx]);

  // ── Get current lyric line ──
  const currentLyricLine = useMemo(() => {
    if (!snippetLyrics.length || !currentSnippet) return null;
    const absoluteTime = currentSnippet.startTime + currentTimeMs;
    for (let i = 0; i < snippetLyrics.length; i++) {
      const line = snippetLyrics[i];
      const nextLine = snippetLyrics[i + 1];
      if (absoluteTime >= line.startTime && (!nextLine || absoluteTime < nextLine.startTime)) {
        return line;
      }
    }
    return null;
  }, [currentTimeMs, snippetLyrics, currentSnippet]);

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

  // ── Feature #18: Check for team synergy (delegates to pure function) ──
  const checkSynergy = useCallback(() => {
    const result = computeSynergy({
      isTeam,
      teamBonusesEnabled: settings.teamBonusesEnabled,
      snippetIdx: currentSnippetIdx,
      matchups,
      players: playersRef.current,
      currentBonusResult: teamBonusResultRef.current,
    });
    if (!result) return;

    // Apply synergy results to refs
    for (const [teamId, pts] of Object.entries(result.synergyPoints)) {
      teamBonusResultRef.current.synergyPoints[teamId] = pts;
      teamBonusResultRef.current.teamBonusTotal[teamId] = (teamBonusResultRef.current.teamBonusTotal[teamId] || 0) + 300;
    }
    for (const bonus of result.playerBonuses) {
      const p = playersRef.current.find(p => p.id === bonus.playerId);
      if (p) p.score += bonus.points;
    }
    setSynergyTriggered(true);
    setTimeout(() => setSynergyTriggered(false), 2000);
  }, [isTeam, settings.teamBonusesEnabled, currentSnippetIdx, matchups]);

  // ── Feature #18: Pre-check comeback boost BEFORE the last snippet starts ──
  const preCheckComeback = useCallback((snippetIdx: number) => {
    const result = computeComebackPreCheck({
      isTeam,
      teamBonusesEnabled: settings.teamBonusesEnabled,
      snippetIdx,
      totalSnippets: medleySongs.length,
      players: playersRef.current,
    });
    if (!result) {
      comebackActiveTeamIdRef.current = null;
      setComebackActiveTeamIdState(null);
      return;
    }

    teamBonusResultRef.current.comebackTeamId = result.teamId;
    teamBonusResultRef.current.comebackMultiplier = result.multiplier;
    comebackActiveTeamIdRef.current = result.underdogTeam;
    setComebackActiveTeamIdState(result.underdogTeam);
    setComebackTriggered(true);
    setComebackTeamId(result.underdogTeam);
    setTimeout(() => { setComebackTriggered(false); setComebackTeamId(null); }, 3000);
  }, [isTeam, settings.teamBonusesEnabled, medleySongs.length]);

  // ── Feature #18: Calculate comeback bonus AFTER the last snippet ends ──
  const finalizeComeback = useCallback(() => {
    const bonus = computeComebackFinalize({
      isTeam,
      teamBonusesEnabled: settings.teamBonusesEnabled,
      comebackTeamId: teamBonusResultRef.current.comebackTeamId,
      players: playersRef.current,
      snippetScoreSnapshots: snippetScoreSnapshotsRef.current,
    });
    if (bonus > 0 && teamBonusResultRef.current.comebackTeamId) {
      const teamId = teamBonusResultRef.current.comebackTeamId;
      const currentBonus = teamBonusResultRef.current.teamBonusTotal[teamId] || 0;
      teamBonusResultRef.current.teamBonusTotal[teamId] = currentBonus + bonus;
    }
    comebackActiveTeamIdRef.current = null;
    setComebackActiveTeamIdState(null);
  }, [isTeam, settings.teamBonusesEnabled]);

  // ── Feature #17: Build highlight for a snippet that just ended (delegates to pure function) ──
  const buildSnippetHighlight = useCallback((snippetIdx: number) => {
    const song = medleySongs[snippetIdx];
    if (!song) return;

    const highlight = buildHighlightPure({
      snippetIdx,
      song,
      players: playersRef.current,
      isEliminationMode,
      isTeam,
      matchups,
      snippetScoreSnapshots: snippetScoreSnapshotsRef.current,
    });
    highlightsRef.current.push(highlight);
    setHighlights([...highlightsRef.current]);
  }, [isEliminationMode, isTeam, matchups, medleySongs]);

  // ── Feature #10: Eliminate lowest scorer (delegates to pure function) ──
  const eliminateLowestScorer = useCallback(() => {
    const result = computeElimination({
      isEliminationMode,
      players: playersRef.current,
    });
    if (!result.toEliminateId) return;

    const pIdx = playersRef.current.findIndex(p => p.id === result.toEliminateId);
    if (pIdx !== -1) {
      playersRef.current[pIdx] = { ...playersRef.current[pIdx], isEliminated: true };
      eliminationOrderRef.current = [...eliminationOrderRef.current, result.toEliminateId];
      setEliminationOrder([...eliminationOrderRef.current]);
    }

    forceRender();

    // Check if only 2 remain — trigger final face-off flag
    if (result.remainingCount === 2) {
      setFinalFaceOff(true);
    }
  }, [isEliminationMode, forceRender]);

  // ── Score a single player based on THEIR pitch result ──
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
    if (!scoringMetaRef.current || !currentSnippet) return;

    const activeNote = findActiveNoteFlat(snippetNotes, absTime);
    if (!activeNote) return;

    // Throttle: evaluate every ~250ms per player
    const lastEval = lastEvalTimeRef.current[playerId] || 0;
    if (absTime - lastEval < 250) return;
    lastEvalTimeRef.current[playerId] = absTime;

    if (pitch.note == null) return;

    const tick = evaluateAndScoreTick(pitch.note, activeNote, effectiveDiff, scoringMetaRef.current);
    const pIdx = playersRef.current.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;
    const p = playersRef.current[pIdx];

    if (tick.hit) {
      // Feature #18: Apply comeback multiplier for underdog team players
      let points = tick.points;
      if (comebackActiveTeamIdRef.current !== null && p.team === comebackActiveTeamIdRef.current) {
        points = Math.round(points * 1.5);
      }
      p.score += points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;

      // Feature #5: Record scoring event
      scoringEventsRef.current.push({
        playerId,
        points,
        hit: true,
        golden: activeNote.isGolden,
        timestamp: Date.now(),
      });
    } else {
      p.combo = 0;
      p.notesMissed++;

      // Feature #5: Record miss event
      scoringEventsRef.current.push({
        playerId,
        points: -10,
        hit: false,
        golden: false,
        timestamp: Date.now(),
      });
    }

    playersRef.current[pIdx] = { ...p };
  }, [snippetNotes, currentSnippet, settings.difficulty, settings.dynamicDifficulty, currentSnippetIdx, medleySongs.length, multiPitch]);

  // ── Audio stall fallback timer ──
  // If audio fails to play or stalls, auto-advance after a grace period.
  // Uses a long grace period (8s) to avoid false positives during loading.
  // Also freezes during pause (isPausedRef).
  const isPausedRef = useRef(false);
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      isPausedRef.current = true;
      return;
    }
    isPausedRef.current = false;
  }, [pauseDialogAction]);

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet || isPausedRef.current) return;

    const snippet = currentSnippet;
    const snippetDuration = snippet.endTime - snippet.startTime;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let stallDetected = false;
    let stallCheckCount = 0;
    const STALL_CHECK_LIMIT = 16; // 16 × 500ms = 8 seconds grace period

    const checkInterval = setInterval(() => {
      if (isPausedRef.current) return;
      const audio = audioRef.current;
      // Audio is playing fine — no stall
      if (audio && !audio.paused) {
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
        fallbackTimer = setInterval(() => {
          if (isPausedRef.current) return;
          const elapsed = Date.now() - fallbackStartTime;
          const time = startMs + elapsed;
          setCurrentTimeMs(time);

          if (time >= snippetDuration) {
            if (fallbackTimer) clearInterval(fallbackTimer);
            fallbackTimer = null;
            setIsPlaying(false);

            const activeIds = getActivePlayerIds();
            activeIds.forEach(id => {
              const p = playersRef.current.find(p => p.id === id);
              if (p) p.snippetsSung++;
            });
            buildSnippetHighlight(currentSnippetIdx);
            checkSynergy();
            finalizeComeback();
            syncTeamBonusResult();
            if (isEliminationMode) {
              eliminateLowestScorer();
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
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, medleySongs.length, pauseDialogAction]);

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;

    const loop = setInterval(() => {
      // Don't advance while paused
      if (isPausedRef.current) return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const songTimeMs = audio.currentTime * 1000;
      const snippetTime = songTimeMs - currentSnippet.startTime;
      setCurrentTimeMs(snippetTime);

      // Check snippet end
      if (songTimeMs >= currentSnippet.endTime) {
        audio.pause();
        audio.playbackRate = 1.0; // Reset playback rate
        setIsPlaying(false);

        // Count snippet as sung for active players
        const activeIds = getActivePlayerIds();
        activeIds.forEach(id => {
          const p = playersRef.current.find(p => p.id === id);
          if (p) p.snippetsSung++;
        });

        // Feature #17: Build highlight for this snippet
        buildSnippetHighlight(currentSnippetIdx);

        // Feature #18: Check team synergy at snippet end
        checkSynergy();
        // Feature #18: Finalize comeback bonus (if active on last snippet)
        finalizeComeback();
        // Sync team bonus result to state for UI
        syncTeamBonusResult();

        forceRender();

        // Feature #10: Elimination — eliminate lowest scorer after snippet
        if (isEliminationMode) {
          eliminateLowestScorer();
          // Feature #10: If only 1 player remains, end game immediately
          const remainingAfterElim = playersRef.current.filter(p => !p.isEliminated);
          if (remainingAfterElim.length <= 1) {
            setPhase('round-results');
            return;
          }
        }

        // Feature #16: Mystery mode — show reveal
        if (settings.mysteryMode) {
          setMysteryReveal(true);
          setMysteryRevealSong(currentSnippet);
          // After 2 seconds, continue to transition/round-results
          setTimeout(() => {
            setMysteryReveal(false);
            setMysteryRevealSong(null);
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
      const absTime = currentSnippet.startTime + snippetTime;
      const activeIds = getActivePlayerIds();
      for (const pid of activeIds) {
        const playerPitch = multiPitch.getPlayerPitch(pid);
        scorePlayer(pid, playerPitch, absTime);
      }

      // Feature #5: Push scoring events to UI state (throttled to ~100ms)
      const now = Date.now();
      if (now - lastScoringUiUpdateRef.current > 100 && scoringEventsRef.current.length > 0) {
        lastScoringUiUpdateRef.current = now;
        setLastScoringEvents([...scoringEventsRef.current]);
        // Keep events for 1.5 seconds, then discard
        const cutoff = now - 1500;
        scoringEventsRef.current = scoringEventsRef.current.filter(e => e.timestamp > cutoff);
      }

      // Keep display state in sync with ref mutations for live score updates
      forceRender();
    }, 80);

    return () => clearInterval(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, currentSnippet, currentSnippetIdx, scorePlayer, getActivePlayerIds, multiPitch, forceRender, isEliminationMode, eliminateLowestScorer, buildSnippetHighlight, checkSynergy, finalizeComeback, settings.mysteryMode, medleySongs.length, syncTeamBonusResult]);

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
          lastPlayPhaseRef.current = ''; // Reset so the play effect fires for new snippet
          // Feature #18: Pre-check comeback boost before the last snippet starts
          preCheckComeback(nextIdx);
          return transitionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentSnippetIdx, preCheckComeback]);

  // ── Countdown interval ref for cleanup on unmount ──
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Start game ──
  const handleStart = useCallback(async () => {
    if (medleySongs.length === 0) return;
    setPhase('countdown');
    setCountdown(3);
    setFinalFaceOff(false);
    setCurrentTimeMs(0);

    // Start the countdown interval — when it hits 0, set phase to 'playing'.
    // The centralized "play on phase" effect handles audio.play() to avoid
    // race conditions with load(). The stall fallback timer handles the
    // case where audio never loads.
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTimeMs(0);
          lastPlayPhaseRef.current = ''; // Reset so the play effect fires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;

    // Initialize multi-pitch detection IN PARALLEL with countdown (non-blocking).
    // Even if this fails or hangs, the countdown above is already ticking.
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Multi-pitch init failed:', e);
    }
  }, [multiPitch]);

  // ── Feature #18: Compute MVP (delegates to pure function) ──
  const computeMVPHook = useCallback(() => {
    if (!isTeam || !settings.teamBonusesEnabled) return;
    const mvpId = computeMVPPure(playersRef.current);
    if (mvpId) teamBonusResultRef.current.mvpPlayerId = mvpId;
  }, [isTeam, settings.teamBonusesEnabled]);

  // ── Round complete ──
  const handleRoundComplete = useCallback(() => {
    // Final sync of team bonus result before recording
    syncTeamBonusResult();
    computeMVPHook();
    syncTeamBonusResult(); // Sync again after MVP is computed

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
      eliminationOrder: isEliminationMode ? [...eliminationOrderRef.current] : undefined,
      snippetHighlights: highlightsRef.current.length > 0 ? [...highlightsRef.current] : undefined,
      teamBonusResult: isTeam && settings.teamBonusesEnabled ? { ...teamBonusResultRef.current } : undefined,
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
  }, [medleySongs.length, isTeam, isEliminationMode, onRoundComplete, settings.playMode, settings.teamBonusesEnabled, computeMVPHook, syncTeamBonusResult]);

  // ── End song early ──
  const handleEndEarly = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.playbackRate = 1.0; // Reset playback rate
    }
    setIsPlaying(false);
    setIsSongPlaying(false);
    // NOTE: Do NOT call multiPitch.stop() here. Pitch detection must remain
    // alive across snippets — it is only started once in handleStart() and
    // cleaned up on unmount / full game end.

    // Count snippet as sung for active players
    const activeIds = getActivePlayerIds();
    activeIds.forEach(id => {
      const p = playersRef.current.find(p => p.id === id);
      if (p) p.snippetsSung++;
    });

    // Feature #17: Build highlight for this snippet
    buildSnippetHighlight(currentSnippetIdx);

    // Feature #18: Check team synergy at snippet end
    checkSynergy();
    // Feature #18: Finalize comeback bonus (if active on last snippet)
    finalizeComeback();
    // Sync team bonus result to state for UI
    syncTeamBonusResult();

    forceRender();

    if (currentSnippetIdx < medleySongs.length - 1) {
      setPhase('transition');
    } else {
      setPhase('round-results');
    }
  }, [currentSnippetIdx, medleySongs.length, getActivePlayerIds, buildSnippetHighlight, checkSynergy, finalizeComeback, syncTeamBonusResult, setIsSongPlaying, forceRender]);

  // ── Cleanup on unmount ──
  // DO-NOT-CHANGE: Dependency must be [] (not [multiPitch]).
  // useMultiPitchDetector returns a new object every render, so [multiPitch]
  // caused the cleanup to fire on every re-render, which cleared the
  // countdown interval mid-countdown (killing the game start).
  useEffect(() => {
    return () => {
      multiPitch.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
    countdown,
    transitionCount,
    currentSnippet,
    currentSnippetIdx,
    snippetNotes,
    snippetLyrics,
    audioRef,
    videoRef,
    audioUrl,
    audioError,
    currentTimeMs,
    isPlaying,
    restoredSong,
    showBackgroundVideo,
    useAnimatedBackground,
    playersDisplay: ___playersDisplay,
    snippetProgress,
    totalProgress,
    currentMatchup,
    currentLyricLine,
    lastScoringEvents,
    currentDynamicDifficulty,
    // Feature #10
    isEliminationMode,
    eliminationOrder,
    activePlayerCount,
    totalPlayerCount,
    finalFaceOff,
    // Feature #15
    activeModifier,
    modifierJustRevealed,
    // Feature #16
    isMysteryMode: settings.mysteryMode,
    mysteryReveal,
    mysteryRevealSong,
    // Feature #17
    highlights,
    // Feature #18
    synergyTriggered,
    comebackTriggered,
    comebackTeamId,
    comebackActiveTeamId: comebackActiveTeamIdState,
    teamBonusResult: teamBonusResultState,
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
