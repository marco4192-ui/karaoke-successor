/**
 * Medley Contest — Core Game Logic Hook
 *
 * Contains all state management, audio control, scoring, and game loop
 * for the Medley game mode.  The UI components consume this hook via
 * a thin wrapper (MedleyGameScreen).
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
import type { Note, LyricLine, PitchDetectionResult, Difficulty } from '@/types/game';
import { EMPTY_PLAYER_SCORE } from '@/types/game';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult, MedleyScoringEvent,
  VoiceModifier, MedleyHighlight, TeamBonusResult,
} from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';

// ===================== PROPS =====================

export interface MedleyGameScreenProps {
  players: MedleyPlayer[];
  songs: MedleySong[];
  settings: MedleySettings;
  matchups: SnippetMatchup[];
  /** Cumulative series history (from previous rounds) */
  seriesHistory: MedleyRoundResult[];
  onRoundComplete: (_result: MedleyRoundResult, _updatedPlayers: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

// ===================== RETURN TYPE =====================

export interface MedleyGameState {
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
  audioUrl: string | null;
  audioError: string | null;
  currentTimeMs: number;
  isPlaying: boolean;

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

  // Actions
  handleStart: () => Promise<void>;
  handleEndEarly: () => void;
  handleRoundComplete: () => void;
  handleShowFinalResults: () => void;
  forceRender: () => void;
}

// ===================== HELPERS =====================

/**
 * Compute the dynamic difficulty for a given snippet index.
 * Ramps from 'easy' on the first snippet to 'hard' on the last.
 */
function getDynamicDifficulty(
  snippetIdx: number,
  totalSnippets: number,
): Difficulty {
  if (totalSnippets <= 1) return 'medium';
  const ratio = snippetIdx / (totalSnippets - 1); // 0→1
  if (ratio < 0.33) return 'easy';
  if (ratio < 0.66) return 'medium';
  return 'hard';
}

/**
 * Pick a random voice modifier.
 * 40% chance of 'none' (no effect).
 */
function pickRandomModifier(): VoiceModifier {
  if (Math.random() < 0.35) return 'none';
  const nonNone = VOICE_MODIFIERS.filter(m => m.id !== 'none');
  const pick = nonNone[Math.floor(Math.random() * nonNone.length)];
  return pick.id;
}

// ===================== HOOK =====================

export function useMedleyGame({
  players: initialPlayers,
  songs: medleySongs,
  settings,
  matchups,
  seriesHistory: _seriesHistory,
  onRoundComplete,
  onEndGame: _onEndGame,
}: MedleyGameScreenProps): MedleyGameState {
  // Subscribe to specific fields only (NOT the entire store) to minimize re-renders.
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const isTeam = settings.playMode === 'team';
  const isEliminationMode = settings.playMode === 'elimination';

  // ── Phase ──
  const [phase, setPhase] = useState<MedleyGamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [transitionCount, setTransitionCount] = useState(3);

  // ── Current snippet ──
  const [currentSnippetIdx, setCurrentSnippetIdx] = useState(0);
  const currentSnippet = medleySongs[currentSnippetIdx] || null;
  const currentSnippetRef = useRef(currentSnippet);
  currentSnippetRef.current = currentSnippet;

  // ── Audio ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase]);

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
  useEffect(() => {
    if (!audioRef.current) return;
    const modDef = VOICE_MODIFIERS.find(m => m.id === activeModifier);
    if (modDef) {
      audioRef.current.playbackRate = modDef.playbackRate;
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

  // ── Prepare snippet audio + notes ──
  useEffect(() => {
    if (!currentSnippet) return;
    let cancelled = false;

    const prepare = async () => {
      setAudioUrl(null);
      setAudioError(null);

      try {
        const prepared = await ensureSongUrls(currentSnippet.song);
        if (cancelled) return;

        if (prepared.audioUrl) {
          setAudioUrl(prepared.audioUrl);
        } else {
          setAudioError('Kein Audio verfügbar');
        }

        // Extract notes within snippet range
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
      } catch {
        if (!cancelled) setAudioError('Audio-Laden fehlgeschlagen');
      }
    };

    prepare();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnippet?.song.id, currentSnippetIdx]);

  // ── Audio element ──
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onErr = () => { setAudioError('Audio-Laden fehlgeschlagen'); };
    audio.addEventListener('error', onErr);
    return () => { audio.removeEventListener('error', onErr); };
  }, [audioUrl]);

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

  // ── Feature #18: Check for team synergy ──
  const checkSynergy = useCallback(() => {
    if (!isTeam || !settings.teamBonusesEnabled) return;
    if (currentSnippetIdx >= matchups.length) return;
    const matchup = matchups[currentSnippetIdx];
    const playerA = playersRef.current.find(p => p.id === matchup.playerA.id);
    const playerB = playersRef.current.find(p => p.id === matchup.playerB.id);
    if (!playerA || !playerB) return;

    const accA = playerA.notesHit + playerA.notesMissed > 0
      ? playerA.notesHit / (playerA.notesHit + playerA.notesMissed)
      : 0;
    const accB = playerB.notesHit + playerB.notesMissed > 0
      ? playerB.notesHit / (playerB.notesHit + playerB.notesMissed)
      : 0;

    if (accA > 0.8 && accB > 0.8) {
      // Synergy! Add 300 to both teams
      const teamAId = String(playerA.team);
      const teamBId = String(playerB.team);
      const prevA = teamBonusResultRef.current.synergyPoints[teamAId] || 0;
      const prevB = teamBonusResultRef.current.synergyPoints[teamBId] || 0;
      teamBonusResultRef.current.synergyPoints[teamAId] = prevA + 300;
      teamBonusResultRef.current.synergyPoints[teamBId] = prevB + 300;
      teamBonusResultRef.current.teamBonusTotal[teamAId] = (teamBonusResultRef.current.teamBonusTotal[teamAId] || 0) + 300;
      teamBonusResultRef.current.teamBonusTotal[teamBId] = (teamBonusResultRef.current.teamBonusTotal[teamBId] || 0) + 300;
      // Add to player scores too
      playerA.score += 300;
      playerB.score += 300;
      setSynergyTriggered(true);
      setTimeout(() => setSynergyTriggered(false), 2000);
    }
  }, [isTeam, settings.teamBonusesEnabled, currentSnippetIdx, matchups]);

  // ── Feature #18: Pre-check comeback boost BEFORE the last snippet starts ──
  // This runs when transitioning TO the last snippet, so the multiplier applies during scoring.
  const preCheckComeback = useCallback((snippetIdx: number) => {
    if (!isTeam || !settings.teamBonusesEnabled) return;
    const isLastSnippet = snippetIdx === medleySongs.length - 1;
    if (!isLastSnippet) return;

    const teamAScore = playersRef.current.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0);
    const teamBScore = playersRef.current.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0);

    const underdogTeam = teamAScore < teamBScore ? 0 : teamBScore < teamAScore ? 1 : null;
    if (underdogTeam !== null) {
      const teamId = String(underdogTeam);
      teamBonusResultRef.current.comebackTeamId = teamId;
      teamBonusResultRef.current.comebackMultiplier = 1.5;
      // Set the active flag so scorePlayer can apply 1.5x multiplier
      comebackActiveTeamIdRef.current = underdogTeam;
      setComebackActiveTeamIdState(underdogTeam);
      setComebackTriggered(true);
      setComebackTeamId(underdogTeam);
      setTimeout(() => { setComebackTriggered(false); setComebackTeamId(null); }, 3000);
    } else {
      comebackActiveTeamIdRef.current = null;
      setComebackActiveTeamIdState(null);
    }
  }, [isTeam, settings.teamBonusesEnabled, medleySongs.length]);

  // ── Feature #18: Calculate comeback bonus AFTER the last snippet ends ──
  const finalizeComeback = useCallback(() => {
    if (!isTeam || !settings.teamBonusesEnabled) return;
    if (!teamBonusResultRef.current.comebackTeamId) return;

    const underdogTeam = parseInt(teamBonusResultRef.current.comebackTeamId, 10);
    const teamId = teamBonusResultRef.current.comebackTeamId;
    const currentBonus = teamBonusResultRef.current.teamBonusTotal[teamId] || 0;
    // Calculate the extra bonus that was applied during scoring via the 1.5x multiplier
    const teamPlayers = playersRef.current.filter(p => p.team === underdogTeam);
    const snippetScores = teamPlayers.map(p => {
      const start = snippetScoreSnapshotsRef.current[p.id];
      return start ? p.score - start.score : 0;
    });
    const totalSnippetScore = snippetScores.reduce((s, v) => s + v, 0);
    // Since we multiplied by 1.5 during scoring, the bonus is the 0.5x extra
    const bonus = Math.round(totalSnippetScore / 3); // 0.5x of the total (which already includes the 1.5x)
    teamBonusResultRef.current.teamBonusTotal[teamId] = currentBonus + bonus;
    comebackActiveTeamIdRef.current = null;
    setComebackActiveTeamIdState(null);
  }, [isTeam, settings.teamBonusesEnabled]);

  // ── Feature #17: Build highlight for a snippet that just ended ──
  const buildSnippetHighlight = useCallback((snippetIdx: number) => {
    const snapshot = snippetScoreSnapshotsRef.current;
    const song = medleySongs[snippetIdx];
    if (!song) return;

    const activeIds = isEliminationMode
      ? playersRef.current.filter(p => !p.isEliminated).map(p => p.id)
      : isTeam && snippetIdx < matchups.length
        ? [matchups[snippetIdx].playerA.id, matchups[snippetIdx].playerB.id]
        : playersRef.current.map(p => p.id);

    let bestPlayerId: string | undefined;
    let bestPlayerScore = -Infinity;
    let worstPlayerId: string | undefined;
    let worstPlayerScore = Infinity;
    let highestComboPlayerId: string | undefined;
    let highestComboValue = 0;

    for (const pid of activeIds) {
      const player = playersRef.current.find(p => p.id === pid);
      if (!player) continue;
      const start = snapshot[pid];
      const snippetScore = start ? player.score - start.score : player.score;

      if (snippetScore > bestPlayerScore) {
        bestPlayerScore = snippetScore;
        bestPlayerId = pid;
      }
      if (snippetScore < worstPlayerScore) {
        worstPlayerScore = snippetScore;
        worstPlayerId = pid;
      }
      if (player.maxCombo > highestComboValue) {
        highestComboValue = player.maxCombo;
        highestComboPlayerId = pid;
      }
    }

    highlightsRef.current.push({
      snippetIdx,
      songTitle: song.song.title,
      songArtist: song.song.artist,
      bestPlayerId,
      bestPlayerScore: bestPlayerScore > -Infinity ? bestPlayerScore : undefined,
      worstPlayerId,
      worstPlayerScore: worstPlayerScore < Infinity ? worstPlayerScore : undefined,
      highestComboPlayerId,
      highestComboValue: highestComboValue > 0 ? highestComboValue : undefined,
    });
    setHighlights([...highlightsRef.current]);
  }, [isEliminationMode, isTeam, matchups, medleySongs]);

  // ── Feature #10: Eliminate lowest scorer ──
  const eliminateLowestScorer = useCallback(() => {
    if (!isEliminationMode) return;

    const activePlayers = playersRef.current.filter(p => !p.isEliminated);
    if (activePlayers.length <= 2) return; // Don't eliminate if only 2 remain

    // Sort by score ascending
    const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
    const lowestScore = sorted[0].score;

    // Find all players tied for lowest
    const tied = sorted.filter(p => p.score === lowestScore);
    // Randomly eliminate one of the tied players
    const toEliminate = tied[Math.floor(Math.random() * tied.length)];

    const pIdx = playersRef.current.findIndex(p => p.id === toEliminate.id);
    if (pIdx !== -1) {
      playersRef.current[pIdx] = { ...toEliminate, isEliminated: true };
      eliminationOrderRef.current = [...eliminationOrderRef.current, toEliminate.id];
      setEliminationOrder([...eliminationOrderRef.current]);
    }

    forceRender();

    // Check if only 2 remain — if so, we still continue with remaining songs
    const remainingActive = playersRef.current.filter(p => !p.isEliminated);
    if (remainingActive.length <= 2) {
      // The next snippet will be the final
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

    if (shouldSkipPitch(pitch, settings.difficulty)) return;
    if (!scoringMetaRef.current || !currentSnippet) return;

    const activeNote = findActiveNoteFlat(snippetNotes, absTime);
    if (!activeNote) return;

    // Throttle: evaluate every ~250ms per player
    const lastEval = lastEvalTimeRef.current[playerId] || 0;
    if (absTime - lastEval < 250) return;
    lastEvalTimeRef.current[playerId] = absTime;

    if (pitch.note == null) return;

    // Feature #9: Use dynamic difficulty for evaluation if enabled
    const effectiveDifficulty = settings.dynamicDifficulty
      ? getDynamicDifficulty(currentSnippetIdx, medleySongs.length)
      : settings.difficulty;

    const tick = evaluateAndScoreTick(pitch.note, activeNote, effectiveDifficulty, scoringMetaRef.current);
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
  }, [snippetNotes, currentSnippet, settings.difficulty, settings.dynamicDifficulty, currentSnippetIdx, medleySongs.length]);

  // ── Game loop ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;

    const loop = setInterval(() => {
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
    setTransitionCount(3);

    const interval = setInterval(() => {
      setTransitionCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const nextIdx = currentSnippetIdx + 1;
          setCurrentSnippetIdx(nextIdx);
          setPhase('playing');
          // Feature #18: Pre-check comeback boost before the last snippet starts
          preCheckComeback(nextIdx);
          return 3;
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
    setPhase('countdown');
    setCountdown(3);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          if (audioRef.current && currentSnippetRef.current) {
            audioRef.current.currentTime = currentSnippetRef.current.startTime / 1000;
            // eslint-disable-next-line no-console
            audioRef.current.play().catch(e => console.warn('[Medley] Play failed:', e));
            setIsPlaying(true);
            setCurrentTimeMs(0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;

    // Initialize multi-pitch detection IN PARALLEL with countdown.
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Multi-pitch init failed:', e);
    }
  }, [multiPitch]);

  // ── Feature #18: Compute MVP ──
  const computeMVP = useCallback(() => {
    if (!isTeam || !settings.teamBonusesEnabled) return;
    const allPlayers = playersRef.current;
    if (allPlayers.length === 0) return;
    const best = allPlayers.reduce((best, p) => p.score > best.score ? p : best, allPlayers[0]);
    teamBonusResultRef.current.mvpPlayerId = best.id;
  }, [isTeam, settings.teamBonusesEnabled]);

  // ── Round complete ──
  const handleRoundComplete = useCallback(() => {
    // Final sync of team bonus result before recording
    syncTeamBonusResult();
    computeMVP();
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
  }, [medleySongs.length, isTeam, isEliminationMode, onRoundComplete, settings.playMode, settings.teamBonusesEnabled, computeMVP, syncTeamBonusResult]);

  // ── End song early ──
  const handleEndEarly = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.playbackRate = 1.0; // Reset playback rate
    }
    setIsPlaying(false);
    multiPitch.stop();

    if (currentSnippetIdx < medleySongs.length - 1) {
      setPhase('transition');
    } else {
      setPhase('round-results');
    }
  }, [currentSnippetIdx, medleySongs.length, multiPitch]);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      multiPitch.stop();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [multiPitch]);

  // ── Helpers ──
  const snippetProgress = currentSnippet
    ? (currentTimeMs / currentSnippet.duration) * 100
    : 0;
  const totalProgress = medleySongs.length > 0
    ? (currentSnippetIdx / medleySongs.length) * 100
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
    audioUrl,
    audioError,
    currentTimeMs,
    isPlaying,
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
