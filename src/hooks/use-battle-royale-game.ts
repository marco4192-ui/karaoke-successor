'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getActivePlayers,
  getPlayersByScore,
  getBattleRoyaleStats,
  updatePlayerScore,
  getBountyMultiplier,
  getCurrentMedleySnippet,
  eliminateWeakestMidRound,
  getEffectiveRoundDuration,
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from '@/lib/game/battle-royale';
import { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { calculatePitchStats, getVisibleNotes, PitchStats, NOTE_WINDOW } from '@/lib/game/note-utils';
import { useMultiPitchDetector, type PlayerPitchConfig } from '@/hooks/use-multi-pitch-detector';
import { shuffleArray } from '@/lib/utils';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { usePartyStore } from '@/lib/game/party-store';
import { useBattleRoyaleRoundHandlers } from '@/hooks/use-battle-royale-round-handlers';
import { getSongLoudnessGainDb, applyLoudnessVolume, isSameOriginMedia } from '@/lib/audio/loudness';
import { resetSharedGainNode } from '@/lib/audio/shared-media-source';
import { StorageKeys, getBool, getNumber } from '@/lib/storage';

function getActiveNotesAtTime(notes: Note[], timeMs: number): Note[] {
  if (notes.length === 0) return [];
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].startTime + notes[mid].duration < timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const result: Note[] = [];
  for (let i = lo; i < notes.length; i++) {
    const note = notes[i];
    if (note.startTime > timeMs) break;
    if (timeMs >= note.startTime && timeMs <= note.startTime + note.duration) {
      result.push(note);
    }
  }
  return result;
}

/** Stable empty array pinned to visibleNotesRef while the note highway is hidden (Fix 15). */
const EMPTY_VISIBLE_NOTES: Array<Note & { lineIndex: number; line: LyricLine }> = [];

// ── Ghost notes (user request: mic failures as ghost notes) ──────────
// Visual performance samples, same shape as the Medley strips pipeline
// (see getMultiPlayerNoteOverlay): wrong-pitch misses become ghost bars at
// the sung pitch in the player's colour, hits fill the per-player strips.
export interface BrNotePerformanceSample {
  time: number;
  accuracy: number;
  hit: boolean;
  sungPitch?: number | null;
}

/** Cap per note — a 3s note at 100 ms cadence needs 30; 120 is generous. */
const MAX_BR_PERF_SAMPLES = 120;
/** Notes whose last sample is older than this (ms, song-relative) drop out of the synced snapshot. */
const BR_PERF_PRUNE_MS = 6000;

/** Build an immutable snapshot (new Maps, copied arrays) for React state —
 *  drops notes that have fully scrolled past and caps the sample arrays. */
function snapshotBrPerformance(
  src: Map<string, Map<string, BrNotePerformanceSample[]>>,
  currentTime: number,
): Map<string, Map<string, BrNotePerformanceSample[]>> {
  const out = new Map<string, Map<string, BrNotePerformanceSample[]>>();
  for (const [playerId, notes] of src) {
    const playerMap = new Map<string, BrNotePerformanceSample[]>();
    for (const [noteKey, samples] of notes) {
      const lastTime = samples.length > 0 ? samples[samples.length - 1].time : -1;
      if (lastTime < currentTime - BR_PERF_PRUNE_MS) continue;
      playerMap.set(noteKey, samples.slice(-MAX_BR_PERF_SAMPLES));
    }
    if (playerMap.size > 0) out.set(playerId, playerMap);
  }
  return out;
}

interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (_game: BattleRoyaleGame) => void;
}

interface UseBattleRoyaleGameReturn {
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  snippetTimeLeft: number | null; // #1 Medley: time left in current snippet
  currentSnippetIndex: number; // #1 Medley
  totalSnippets: number; // #1 Medley
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Base audio volume (master volume × per-song loudness gain) that ALL BR fades run toward/from. */
  baseVolumeRef: React.MutableRefObject<number>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  handleVoteSubmit: (_playerId: string, _songIndex: number) => void;
  handleStartRoundAfterVote: () => void;
  handleGrandFinaleIntroComplete: () => void;
  setCurrentTime: (_time: number) => void;
  previousRoundScores: Record<string, number>; // #9 Trend tracking
  bountyPlayerId: string | null; // #6 Bounty
  bountyMultiplier: number; // #6 Bounty
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  playerPitchMap: Map<string, PitchDetectionResult | null>; // Per-player pitch data
  multiPitchErrors: Map<string, string>; // Per-player pitch errors
  /** Per-player note performance samples (ghost notes): playerId → noteKey → samples. */
  brNotePerformance: Map<string, Map<string, BrNotePerformanceSample[]>>;
  songProgress: number; // 0-100
  countdown: number;
  eliminationPhase: null | 'eliminating' | 'survivor-flash';
  /** Seconds until the next mid-round elimination (full-song rhythm rounds
   *  only; null when no rhythm elimination is scheduled). Drives the HUD
   *  badge so the configured interval is VISIBLE while playing. */
  nextEliminationIn: number | null;
  /** Latest mid-round elimination notice ({name} + id) for the non-blocking
   *  HUD banner; auto-clears after a few seconds. */
  midRoundEliminationNotice: { id: string; name: string } | null;
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const onUpdateGameRef = useRef(onUpdateGame);
  onUpdateGameRef.current = onUpdateGame;

  const stats = useMemo(() => getBattleRoyaleStats(game), [game]);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];

  // Use effective difficulty (may be escalated) instead of base difficulty
  const difficulty = game.effectiveDifficulty;

  // #1 Medley: current snippet info
  const currentSnippetIndex = game.currentSnippetIndex;
  const totalSnippets = game.medleySnippetList.length;

  // ── Song & Media ───────────────────────────────────────────────────
  // Determine which song to load: medley snippet or main round song
  const currentMedleySnippet = getCurrentMedleySnippet(game);
  const currentRoundSongId = currentMedleySnippet?.songId ?? currentRound?.songId;

  const {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
  } = useBattleRoyaleSongMedia({
    currentRoundSongId,
    songs,
    gameCurrentRound: game.currentRound,
    medleySnippetIndex: game.medleySnippetList.length > 0 ? game.currentSnippetIndex : undefined,
  });

  // ── Loudness normalization: base volume for ALL BR audio fades ──
  // BR plays short snippets with imperative fades; every fade-in/out now runs
  // toward/from this base instead of a literal 1. The base combines the
  // persisted master volume with the per-song loudness gain toward the 89 dB
  // reference. R9: quiet-song BOOSTS go through the shared Web Audio gain node
  // (applyLoudnessVolume) instead of being clamped away; attenuations fold
  // into the element volume as before. Analysis is cached per songId and
  // never blocks playback: until the gain arrives the base is just the master
  // volume.
  const baseVolumeRef = useRef(1);
  useEffect(() => {
    let cancelled = false;
    const songId = currentSong?.id;
    const audioUrl = resolvedAudioUrlRef.current;
    const masterVolume = getNumber(StorageKeys.MASTER_VOLUME, 100) / 100;
    baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume));
    if (!songId || !audioUrl || !getBool(StorageKeys.LOUDNESS_NORMALIZATION, true)) return;
    getSongLoudnessGainDb(songId, audioUrl)
      .then((gainDb) => {
        if (cancelled) return;
        // R9 (user request 3 — volume normalization "greift nicht"):
        // previously the boost was CLAMPED away here (Math.min(1, master ×
        // 10^(gain/20))) — quiet songs stayed quiet in BR because element.volume
        // cannot exceed 1. Now boosts (> 0 dB) run through the same Web Audio
        // GainNode path the regular game screen uses (applyLoudnessVolume),
        // while the fade base stays at master volume. Attenuation (<= 0 dB)
        // keeps folding into element volume as before.
        if (gainDb > 0) {
          baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume));
          if (audioRef.current && isSameOriginMedia(audioRef.current)) {
            applyLoudnessVolume(audioRef.current, masterVolume * 100, gainDb);
          }
        } else {
          baseVolumeRef.current = Math.min(1, Math.max(0, masterVolume * Math.pow(10, gainDb / 20)));
        }
        // Apply immediately (lowering only — never interrupt an active fade-out
        // or raise the volume mid-fade; PlayingView's per-second reset effect
        // re-asserts the base afterwards).
        if (audioRef.current && audioRef.current.volume > baseVolumeRef.current) {
          audioRef.current.volume = baseVolumeRef.current;
        }
      })
      .catch(() => {
        // Never throw — analysis failure means gain 0 (base = master volume).
      });
    return () => {
      cancelled = true;
      // Song change: reset any boost left on the shared gain node so the
      // previous song's gain cannot leak into the next one.
      if (audioRef.current) resetSharedGainNode(audioRef.current);
    };
  }, [currentSong?.id, mediaLoaded, audioRef, resolvedAudioUrlRef]);

  // ── Companion Pitch Polling ────────────────────────────────────────
  const { companionPitchCacheRef } = useBattleRoyaleCompanionPolling({
    gameStatus: game.status,
    players: game.players,
  });

  // ── Multi-Pitch Detection (one detector per local mic player) ─────
  // Build player configs from ACTIVE (non-eliminated) mic players, each with
  // their own microphoneId. Use a stable key so this only recalculates when
  // player IDs/types/devices/elimination change, NOT on every scoring tick
  // (which changes game.players every ~100ms).
  // Fix 18: the key MUST include the elimination flag — otherwise the memo
  // would keep returning the stale array (with eliminated players) forever.
  const playerConfigsKey = game.players.map(p => `${p.id}:${p.playerType}:${p.microphoneId ?? ''}:${p.stereoChannel ?? ''}:${p.eliminated ? 'e' : 'a'}`).join('|');
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    game.players
      .filter(p => p.playerType === 'microphone' && !p.eliminated)
      .map(p => ({
        playerId: p.id,
        type: 'local' as const,
        deviceId: p.microphoneId,
        stereoChannel: p.stereoChannel,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerConfigsKey],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty,
    autoStart: false,
  });

  // Ref to multiPitch for use in game loop callbacks (avoids stale closure)
  const multiPitchRef = useRef(multiPitch);
  multiPitchRef.current = multiPitch;

  // ── Fix 18: tear down detectors of newly eliminated mic players ─────
  // Eliminated players' microphones must stop recording immediately: their
  // detector/stream/analyser is torn down via multiPitch.removePlayer →
  // PitchDetectorManager.removePlayer (stream.stop + analyser.disconnect).
  // Diffs the eliminated set against the previous render so each player is
  // removed exactly once.
  const prevEliminatedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const eliminatedNow = new Set(
      game.players.filter(p => p.eliminated).map(p => p.id),
    );
    const prev = prevEliminatedIdsRef.current;
    prevEliminatedIdsRef.current = eliminatedNow;

    for (const playerId of eliminatedNow) {
      if (prev.has(playerId)) continue;
      // removePlayer is idempotent (manager early-returns unknown ids), so
      // this is safe even before/after manager re-initialization.
      multiPitchRef.current.removePlayer(playerId);
    }
  }, [game.players]);

  // ── Game State ─────────────────────────────────────────────────────
  const mountedRef = useRef(true);
  const [currentTime, setCurrentTime] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastCurrentTimeUpdateRef = useRef(0);

  // Item 3 (BR perf): note-performance sampling removed entirely — the BR
  // note highway uses the flat single-colour fill driven purely by the sing
  // line, so no per-tick samples are collected or synced to state. This
  // saves per-tick array pushes AND a Map copy + setState every ~100ms (a
  // full PlayingView re-render) in the most performance-critical mode.
  const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Pre-fetched next song (warmed during the last seconds of a round) —
   *  consumed by handleStartRound via consumePrefetchedSong. Declared here
   *  (before the round handlers) because the consume callback closes over it. */
  const prefetchedSongRef = useRef<Song | null>(null);
  /** Store-write throttling (user rule 6.1): scores accumulate here between
   *  throttled store writes — see the game loop for the full rationale. */
  const pendingScoredGameRef = useRef<BattleRoyaleGame | null>(null);
  const lastStoreWriteRef = useRef(0);

  // ── R14 (user request 6 — “Ausfälle bei der Wertung”): pitch hold ──
  // A single null detection frame (YIN miss on a note onset/vibrato turn,
  // momentary volume dip, rAF cadence mismatch with the 60ms scoring tick)
  // used to skip that scoring tick entirely — sustained singing regularly
  // produced gaps in the rating. We now bridge short dropouts: while the
  // microphone is still audible (volume above silence level) the last valid
  // pitch keeps scoring for up to PITCH_HOLD_MS. Real pauses (volume → 0)
  // are NOT bridged, and neither are long dropouts.
  const PITCH_HOLD_MS = 200;
  /** volume (0–1, amplified) above which a null-pitch frame counts as "still singing, detector just missed". */
  const PITCH_HOLD_MIN_VOLUME = 0.04;
  const lastValidPitchRef = useRef<Map<string, { note: number; at: number }>>(new Map());

  // ── Countdown state (V3) ───────────────────────────────────────────
  // DO-NOT-CHANGE: countdown is derived synchronously from game.status to avoid
  // a one-frame gap where game.status='countdown' but countdown=0 (from stale useState).
  // This gap caused the raw PlayingView (with pause overlay) to flash briefly during
  // round transitions before the countdown overlay could cover it.
  const targetCountdown = game.status === 'countdown' ? game.settings.countdownDuration : 0;
  const [countdown, setCountdown] = useState(targetCountdown);
  useEffect(() => { setCountdown(targetCountdown); }, [targetCountdown]);
  const gameRefRef = useRef<{ current: BattleRoyaleGame }>({ current: game } as { current: BattleRoyaleGame });
  // gameRef is provided by round handlers below, but we need a placeholder here

  useEffect(() => {
    if (countdown <= 0 || game.status !== 'countdown') return;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      const next = countdown - 1;
      if (next <= 0) {
        onUpdateGame({ ...gameRefRef.current.current, status: 'playing' });
      }
      setCountdown(next);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, game.status]);

  // ── Scoring window (user rule 6.2: "sehr wenig Punkte") ─────────────
  // The 10,000-point budget used to be spread over the ENTIRE song's notes,
  // but a round only ever plays a slice of it (round duration or medley
  // snippet) — so players could only ever reach a fraction of the tick pool.
  // The metadata is now computed over the notes inside the ACTUAL play
  // window only, which puts per-tick points on par with a regular game of
  // that length. BR plays songs from position 0, so the window is simply
  // [0, windowMs).
  const playWindowMs = useMemo(() => {
    if (game.medleySnippetList.length > 0) {
      return (getCurrentMedleySnippet(game)?.duration ?? 30) * 1000;
    }
    const round = game.rounds[game.rounds.length - 1];
    return round && round.duration > 0 ? round.duration * 1000 : 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rounds/snippets only change on transitions
  }, [game.medleySnippetList, game.currentSnippetIndex, game.rounds, game.currentRound]);

  // ── Pre-compute timing data for scoring ────────────────────────────
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex, line });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    // 6.2: window-restricted metadata (see playWindowMs above). Fall back to
    // the full song when the window has (almost) no notes (long intro) so the
    // pool never degenerates.
    const windowNotes = playWindowMs > 0
      ? allNotes.filter(n => n.startTime < playWindowMs)
      : allNotes;
    const metaNotes = windowNotes.length >= 4 ? windowNotes : allNotes;
    const scoringMetadata = calculateScoringMetadata(metaNotes, beatDurationMs);
    const pitchStats = calculatePitchStats(allNotes);
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata, pitchStats };
  }, [currentSong, playWindowMs]);

  // ── Visible notes ref (updated every frame) ────────────────────────
  const visibleNotesRef = useRef<Array<Note & { lineIndex: number; line: LyricLine }>>([]);
  const pitchStatsRef = useRef<PitchStats | null>(null);

  // ── Per-player note performance (ghost notes) ─────────────────────
  // Written on every scoring tick inside the rAF game loop (plain ref, no
  // render), synced into React state throttled at 200 ms — the same refs +
  // throttled-state pattern the store writes use (rule 6.1) so the party
  // tree doesn't re-render at tick rate.
  const brNotePerformanceRef = useRef<Map<string, Map<string, BrNotePerformanceSample[]>>>(new Map());
  const [brNotePerformance, setBrNotePerformance] = useState<Map<string, Map<string, BrNotePerformanceSample[]>>>(new Map());
  const lastPerfSyncRef = useRef(0);

  /** Push a visual sample for a player + note (stable key formula: note.id || `note-${startTime}`). */
  const pushPerformanceSample = useCallback((playerId: string, note: Note, sample: BrNotePerformanceSample) => {
    const noteKey = note.id || `note-${note.startTime}`;
    let playerMap = brNotePerformanceRef.current.get(playerId);
    if (!playerMap) {
      playerMap = new Map();
      brNotePerformanceRef.current.set(playerId, playerMap);
    }
    let samples = playerMap.get(noteKey);
    if (!samples) {
      samples = [];
      playerMap.set(noteKey, samples);
    }
    if (samples.length >= MAX_BR_PERF_SAMPLES) samples.splice(0, samples.length - MAX_BR_PERF_SAMPLES + 1);
    samples.push(sample);
  }, []);

  // ── Fix 15: note-highway work is gated on the showNoteHighway setting ──
  // BR doesn't need the singing visualization when the highway is hidden, so
  // the game loop skips visible-note recomputation and note-performance state
  // syncs entirely. The rAF loop reads it via ref (stable closure); the memo
  // below reads the plain value (proper dep).
  const showNoteHighwaySetting = game.settings.showNoteHighway;
  const showNoteHighwaySettingRef = useRef(showNoteHighwaySetting);
  useEffect(() => {
    showNoteHighwaySettingRef.current = game.settings.showNoteHighway;
  }, [game.settings.showNoteHighway]);

  const timingDataRef = useRef(timingData);
  timingDataRef.current = timingData;
  pitchStatsRef.current = timingData?.pitchStats ?? null;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  // ── Random song picker ─────────────────────────────────────────────
  const getRandomSong = useCallback((excludeIds?: string[]): Song | null => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    if (playableSongs.length === 0) return null;
    return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  }, [songs]);

  const getRandomSongs = useCallback((count: number, excludeIds?: string[]): Song[] => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    const shuffled = shuffleArray(playableSongs);
    return shuffled.slice(0, count);
  }, [songs]);

  // Resolve a song by id (host-voted first-round song from party setup)
  const getSongById = useCallback((id: string): Song | null => {
    return songs.find(s => s.id === id) ?? null;
  }, [songs]);

  // ── Round Handlers ────────────────────────────────────────────────
  // Consume the pre-fetched song so the next round starts without a loading
  // pause (the media was already warmed during the previous round's tail).
  const consumePrefetchedSong = useCallback((): Song | null => {
    const song = prefetchedSongRef.current;
    prefetchedSongRef.current = null;
    return song;
  }, []);

  const {
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    handleRoundEndRef,
    onSnippetEndRef,
    activePlayersRef,
    gameRef,
    roundEndingRef,
    eliminationPhase,
  } = useBattleRoyaleRoundHandlers({
    game,
    activePlayers,
    onUpdateGame,
    stopPitch: multiPitch.stop,
    audioRef,
    videoRef,
    audioHasPlayedRef,
    getRandomSong,
    getRandomSongs,
    getSongById,
    consumePrefetchedSong,
  });

  // Keep gameRefRef in sync with gameRef from round handlers
  useEffect(() => {
    gameRefRef.current = gameRef;
  }, [gameRef]);

  // ── Pause state (read from store, used by game loop + round timer) ───
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const pausedRef = useRef(pauseDialogAction === 'song-pause');
  pausedRef.current = pauseDialogAction === 'song-pause';

  // Stop pitch detection while paused (like standard game mode does)
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      multiPitch.stop();
    } else if (pauseDialogAction === null && gameRef.current.status === 'playing') {
      // Restart pitch detection after unpause (game init effect won't re-fire)
      if (!multiPitch.isRunning) {
        multiPitch.start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- multiPitch is stable for .stop()/.start()
  }, [pauseDialogAction]);

  // ── Mid-round eliminations (user request 2.2-R2) ─────────────────
  // Full-song rounds (songSelection random/vote) eliminate the weakest
  // player in the CONFIGURED rhythm while the song keeps playing — only
  // the player is out, the round is never interrupted. The interval comes
  // from getEffectiveRoundDuration (the same settings value the setup
  // slider shows; the shrinking-timer setting reduces it in later rounds) —
  // there are NO hardcoded intervals. Timestamp-based instead of
  // setInterval so the rhythm survives pause/unpause (the deadline shifts
  // by the paused time) and is frozen per round.
  // Medley keeps its snippet-based budget; grand finale rounds decide via
  // round wins, not eliminations.

  // HUD notice state (2.2-R3): who just went out + seconds until the next
  // elimination — makes the configured rhythm visible while playing.
  const [midRoundEliminationNotice, setMidRoundEliminationNotice] = useState<{ id: string; name: string } | null>(null);
  const elimNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nextEliminationIn, setNextEliminationIn] = useState<number | null>(null);
  useEffect(() => () => {
    if (elimNoticeTimerRef.current !== null) clearTimeout(elimNoticeTimerRef.current);
  }, []);

  const handleMidRoundElimination = useCallback(() => {
    if (roundEndingRef.current) return;
    // Base on the not-yet-flushed accumulation so the elimination decision
    // sees the very latest scores (same rationale as the game loop).
    const base = pendingScoredGameRef.current ?? gameRef.current;
    const result = eliminateWeakestMidRound(base);
    if (!result) return;
    const updated = result.game;
    gameRef.current = updated;
    // Keep the loop's pending base consistent so the throttled store write
    // can never revert the elimination.
    pendingScoredGameRef.current = updated;

    // Non-blocking HUD notice (user follow-up 2.2-R3: the inline ✕ on the
    // player card is easy to miss — surface WHO just went out so the
    // configured rhythm is unmissable).
    const eliminated = updated.players.find(p => p.id === result.eliminatedId);
    if (eliminated) {
      setMidRoundEliminationNotice({ id: eliminated.id, name: eliminated.name });
      if (elimNoticeTimerRef.current !== null) {
        clearTimeout(elimNoticeTimerRef.current);
      }
      elimNoticeTimerRef.current = setTimeout(() => {
        elimNoticeTimerRef.current = null;
        setMidRoundEliminationNotice(null);
      }, 3500);
    }

    if (updated.status === 'completed') {
      // Last man standing mid-song: stop media + pitch, then commit — the
      // screen router switches to the WinnerView.
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
      audioHasPlayedRef.current = false;
      multiPitch.stop();
      roundEndingRef.current = true; // game loop stops touching the game
    }
    onUpdateGame(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs + stable multiPitch object
  }, []);

  const handleMidRoundElimRef = useRef(handleMidRoundElimination);
  useEffect(() => {
    handleMidRoundElimRef.current = handleMidRoundElimination;
  }, [handleMidRoundElimination]);

  // Full-song rhythm rounds: random/vote, no medley, no grand finale.
  const isFullSongRound =
    (game.settings.songSelection === 'random' || game.settings.songSelection === 'vote') &&
    !game.settings.medleyMode &&
    !game.isGrandFinale;

  // Elimination clock: deadline timestamp (ms) or null when disarmed.
  const nextElimAtRef = useRef<number | null>(null);
  const elimPausedAtRef = useRef<number | null>(null);

  // Effective rhythm for the given game state — always from the settings
  // (roundDuration / finalRoundDuration / shrinking timer).
  const elimIntervalSec = useCallback((g: BattleRoyaleGame): number =>
    Math.max(5, getEffectiveRoundDuration(
      g.settings,
      g.currentRound,
      g.players.filter(p => !p.eliminated).length,
      g.isGrandFinale,
    )), []);

  // Arm the clock at the START of each full-song round (playing transition
  // or round change). Frozen afterwards — in-round eliminations only
  // re-arm AFTER firing (see the ticker), never mid-interval.
  useEffect(() => {
    if (game.status !== 'playing' || !isFullSongRound) {
      nextElimAtRef.current = null;
      elimPausedAtRef.current = null;
      return;
    }
    nextElimAtRef.current = Date.now() + elimIntervalSec(gameRef.current) * 1000;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads gameRef.current on purpose (freeze the interval at round start)
  }, [game.status, game.currentRound, isFullSongRound]);

  // Pause: shift the deadline by the paused duration — the rhythm rests
  // during the pause and resumes where it was, never firing while paused.
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      elimPausedAtRef.current = Date.now();
    } else if (elimPausedAtRef.current !== null) {
      if (nextElimAtRef.current !== null) {
        nextElimAtRef.current += Date.now() - elimPausedAtRef.current;
      }
      elimPausedAtRef.current = null;
    }
  }, [pauseDialogAction]);

  // Ticker: cheap 500ms check that fires the elimination when the deadline
  // passes, then re-arms with a freshly computed interval (player count may
  // have changed) or disarms when the finale duel / game end takes over.
  // Also SELF-HEALING (2.2-R3): if the deadline is null while a rhythm round
  // is still running (e.g. a missed transition after an unexpected state
  // change), re-arm instead of silently staying disarmed — the rhythm must
  // never stop mid-round.
  useEffect(() => {
    if (game.status !== 'playing' || !isFullSongRound) {
      setNextEliminationIn(null);
      return;
    }
    const iv = setInterval(() => {
      if (pauseDialogAction === 'song-pause') return; // paused — the clock is shifted, not ticking
      let next = nextElimAtRef.current;

      // Self-heal: re-arm a lost deadline (never extend an armed one).
      if (next === null) {
        const g0 = gameRef.current;
        const active0 = g0.players.filter(p => !p.eliminated).length;
        const finaleEnabled0 = g0.settings.grandFinaleBestOf > 1;
        const rhythmApplies = g0.status === 'playing' && !g0.isGrandFinale &&
          (finaleEnabled0 ? active0 > 2 : active0 > 1);
        if (rhythmApplies) {
          next = Date.now() + elimIntervalSec(g0) * 1000;
          nextElimAtRef.current = next;
        }
      }

      if (next === null) {
        setNextEliminationIn(null);
        return;
      }
      setNextEliminationIn(Math.max(0, Math.ceil((next - Date.now()) / 1000)));
      if (Date.now() < next) return;

      handleMidRoundElimRef.current();

      // Re-arm or disarm based on the post-elimination state
      const g = gameRef.current;
      const active = g.players.filter(p => !p.eliminated).length;
      const finaleEnabled = g.settings.grandFinaleBestOf > 1;
      if (g.status === 'completed' || (finaleEnabled ? active <= 2 : active <= 1)) {
        // The finale duel decides between the last two / last man standing
        // won — no further rhythm eliminations.
        nextElimAtRef.current = null;
        setNextEliminationIn(null);
      } else {
        nextElimAtRef.current = Date.now() + elimIntervalSec(g) * 1000;
      }
    }, 500);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + primitives only
  }, [game.status, isFullSongRound, pauseDialogAction]);

  // ── Item 8.1: Companion game-state sync ──────────────────────────
  // Same mechanism CPTM/PTM use (useMobileGameSync): pushes the current
  // (snippet) song + isPlaying to all companion apps so a participating
  // player's phone shows the BR in-game screen and streams pitch (the
  // mobile pitch loop only runs/sends while gameState.isPlaying is true).
  const brCompanionPlaying = game.status === 'playing' && pauseDialogAction !== 'song-pause';
  useMobileGameSync(
    currentSong,
    brCompanionPlaying,
    'battle-royale',
    game.status === 'completed',
    undefined,
    'battle-royale-game',
  );

  // Item 8.1: on unmount (game over / party left) tell the companions the BR
  // game is over — stops their microphone/pitch stream immediately instead of
  // relying on the next periodic sync.
  useEffect(() => {
    return () => {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: { isPlaying: false, songEnded: true, brGameData: null },
        }),
      }).catch(() => { /* best-effort */ });
    };
  }, []);

  // ── Round Timer ────────────────────────────────────────────────────
  const { roundTimeLeft, snippetTimeLeft } = useBattleRoyaleRoundTimer({
    gameStatus: game.status,
    roundDuration: currentRound?.duration,
    gameCurrentRound: game.currentRound,
    handleRoundEndRef,
    medleySnippetList: game.medleySnippetList,
    currentSnippetIndex: game.currentSnippetIndex,
    onSnippetEndRef,
    isPaused: pauseDialogAction === 'song-pause',
  });

  // ── Game Initialization & Playback ─────────────────────────────────
  // Track which round last triggered a fade-in so we can skip the fade on
  // snippet transitions within the same round (Bug #3: audible volume dips).
  const lastFadeInRoundRef = useRef<number>(-1);

  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      let cancelled = false;
      const currentRoundNum = game.currentRound;
      const isNewRound = currentRoundNum !== lastFadeInRoundRef.current;
      // IMPORTANT: Don't fade in during snippet transitions within the same round.
      // Only fade in when a new round starts — snippet transitions should be seamless.
      // Do NOT remove this check — fading on every snippet causes audible volume dips.

      const initGame = async () => {
        // Initialize multi-pitch detector (one per local mic player)
        const ok = await multiPitch.initialize();
        if (cancelled) return;
        if (ok) {
          multiPitch.start();
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] Multi-pitch initialization failed – mic detection unavailable. Check microphone permissions and ensure at least one player has playerType="microphone".');
        }

        const audio = audioRef.current;
        const fadeInAudio = () => {
          if (!audio) return;
          audio.volume = 0;
          const fadeStart = performance.now();
          const FADE_DURATION = 800; // 800ms fade-in
          const fadeIn = (now: number) => {
            if (cancelled || !audio) return;
            const elapsed = now - fadeStart;
            const progress = Math.min(elapsed / FADE_DURATION, 1);
            // Fade toward the normalized base volume (master × loudness gain),
            // NOT a literal 1 — re-read the ref every frame so a gain that
            // arrives mid-fade is respected immediately.
            audio.volume = Math.max(0, Math.min(1, baseVolumeRef.current * progress));
            if (progress < 1) requestAnimationFrame(fadeIn);
          };
          requestAnimationFrame(fadeIn);
        };

        const startPlayback = (onReady: () => void) => {
          if (!audio || !resolvedAudioUrlRef.current) return;
          if (audio.readyState >= 3) {
            onReady();
          } else {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              onReady();
            };
            audio.addEventListener('canplay', onCanPlay);
          }
        };

        if (audio && resolvedAudioUrlRef.current) {
          startPlayback(() => {
            if (cancelled || pausedRef.current) return;
            if (isNewRound) {
              // New round: smooth 800ms fade-in from silence
              fadeInAudio();
              lastFadeInRoundRef.current = currentRoundNum;
            } else {
              // Snippet transition within same round: set volume to the
              // normalized base immediately so there's no audible dip
              // between snippets.
              audio.volume = baseVolumeRef.current;
            }
            audio.play()
              .then(() => { audioHasPlayedRef.current = true; })
              // eslint-disable-next-line no-console
              .catch(e => console.error('Audio play error:', e));
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] No audio URL resolved');
        }
        if (videoRef.current && resolvedVideoUrlRef.current && !pausedRef.current) {
          // eslint-disable-next-line no-console
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }

        startGameLoopRef.current();
      };
      initGame();

      return () => {
        cancelled = true;
        multiPitch.stop();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, mediaLoaded, currentSong]);

  // ── Pre-fetch next song during last 5 seconds of round ──
  const prefetchedMediaRef = useRef<{ audioUrl?: string; videoUrl?: string } | null>(null);

  useEffect(() => {
    if (
      game.status !== 'playing' ||
      roundTimeLeft > 5 ||
      roundTimeLeft === 0 ||
      game.settings.songSelection === 'vote' || // can't pre-pick in voting mode
      game.settings.medleyMode // medley rounds bundle several fresh snippets
    ) return;

    // Only pre-fetch once per round
    if (prefetchedSongRef.current) return;

    const preFetch = async () => {
      try {
        // Pick a random song (same logic as handleStartRound)
        const recentlyPlayed = game.recentlyPlayedSongIds || [];
        const candidates = songs.filter(
          s => s.audioUrl && !recentlyPlayed.includes(s.id)
        );
        if (candidates.length === 0) return;

        const randomIndex = Math.floor(Math.random() * candidates.length);
        const nextSong = candidates[randomIndex];

        // Pre-resolve URLs
        let preparedSong = nextSong;
        try {
          const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
          preparedSong = await ensureSongUrls(nextSong);
        } catch { /* non-critical */ }

        prefetchedSongRef.current = preparedSong;

        // Pre-warm audio element
        if (preparedSong.audioUrl && audioRef.current) {
          prefetchAudioRef.current = new Audio();
          prefetchAudioRef.current.preload = 'auto';
          prefetchAudioRef.current.src = preparedSong.audioUrl;
          prefetchedMediaRef.current = { audioUrl: preparedSong.audioUrl };
        }
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[BattleRoyale] Pre-fetch failed');
      }
    };

    preFetch();

    return () => {
      // Clear pre-fetch when round ends (new game state)
      if (prefetchAudioRef.current) {
        prefetchAudioRef.current.pause();
        prefetchAudioRef.current.src = '';
        prefetchAudioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, roundTimeLeft, songs, game.recentlyPlayedSongIds, game.settings.songSelection]);

  // Clear prefetch + pending score accumulation when the round changes —
  // a stale pendingScoredGameRef from the PREVIOUS round would otherwise be
  // resurrected by the next game-loop tick (old players/rounds bleeding
  // into the new round). The round handlers already committed the fresh
  // post-elimination game (including the final scores via gameRef).
  useEffect(() => {
    prefetchedSongRef.current = null;
    prefetchedMediaRef.current = null;
    pendingScoredGameRef.current = null;
    // Fresh round → fresh performance samples (ghosts must never bleed
    // across songs/rounds; the note keys would collide otherwise).
    brNotePerformanceRef.current = new Map();
    setBrNotePerformance(new Map());
    // R14 (6): pitch hold must not bridge across rounds either — the new
    // round's audio time restarts at 0, so a stale lastValidPitch entry
    // would look "fresh" to the diff check.
    lastValidPitchRef.current = new Map();
  }, [game.currentRound]);

  // ── Game Loop for simultaneous per-player scoring ──────────────────
  const startGameLoopRef = useRef<() => void>(() => {});

  // ── Store-write throttling (user rule 6.1: stutter even without 4 mics) ──
  // Every scoring tick used to push the whole game object into the party
  // store (~10 Hz), re-rendering the entire party tree — the visible hitch
  // of the note highway whenever singing was evaluated. Scores now
  // accumulate in a ref and the store is written at most every 400 ms.
  // gameRef is kept fresh on EVERY tick (plain ref assignment, no render),
  // so round-end handlers (elimination) still see the very latest scores.
  const STORE_WRITE_INTERVAL_MS = 400;

  const startGameLoop = useCallback(() => {
    // R9 (user request 2.3 — latency): 100 → 60 ms scoring cadence. The tick
    // only does light math per player (evaluate + score update), so the extra
    // 6-7 ticks/s cost nothing measurable while cutting the average
    // pitch→score latency by ~20 ms.
    const TICK_INTERVAL = 60;
    let lastTickTime = performance.now();

    const gameLoop = (timestamp: number) => {
      if (roundEndingRef.current) return; // Stop immediately when round is ending
      if (gameRef.current.status !== 'playing') return;
      // Skip scoring ticks while paused (audio is paused, don't score silence)
      if (pausedRef.current) { gameLoopRef.current = requestAnimationFrame(gameLoop); return; }

      const deltaTime = timestamp - lastTickTime;

      // Update visible notes every frame — but ONLY when the note highway is
      // shown (Fix 15). When hidden, pin a stable empty array so consumers see
      // a constant reference instead of per-frame recomputation.
      const tdForVis = timingDataRef.current;
      const currentAudioTimeForVis = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      if (tdForVis) {
        if (showNoteHighwaySettingRef.current) {
          visibleNotesRef.current = getVisibleNotes(tdForVis.allNotes, currentAudioTimeForVis, NOTE_WINDOW);
        } else {
          visibleNotesRef.current = EMPTY_VISIBLE_NOTES;
        }
      }

      if (audioRef.current) {
        const now = performance.now();
        if (now - lastCurrentTimeUpdateRef.current >= 25) {
          setCurrentTime(audioRef.current.currentTime * 1000);
          lastCurrentTimeUpdateRef.current = now;
        }
      }

      const td = timingDataRef.current;
      if (deltaTime >= TICK_INTERVAL && td && currentSongRef.current) {
        lastTickTime = timestamp;

        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;

        // Resume from the not-yet-flushed accumulation (never lose scores
        // to a throttled store write), else from the latest game ref.
        let batchedGame = pendingScoredGameRef.current ?? gameRef.current;
        let scoreChanged = false;

        const activeNotes = getActiveNotesAtTime(td.allNotes, currentAudioTime);

        if (activeNotes.length > 0) {
          const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone');
          const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion');

          const comboMap = new Map(batchedGame.players.map(p => [p.id, p.currentCombo]));

          /** Pick the active note closest to the player's detected pitch. */
          const findClosestNote = (detectedNote: number) => {
            if (activeNotes.length === 1) return activeNotes[0];
            let best = activeNotes[0];
            let bestDist = Math.abs(detectedNote - best.pitch);
            for (let i = 1; i < activeNotes.length; i++) {
              const dist = Math.abs(detectedNote - activeNotes[i].pitch);
              if (dist < bestDist) { bestDist = dist; best = activeNotes[i]; }
            }
            return best;
          };

          /** Shared scoring tick for a single player (mic or companion).
           *  Returns [updatedGame, activeNote, tick] so callers can reuse evaluation results. */
          const scorePlayerTick = (
            playerId: string,
            detectedNote: number,
            currentGame: BattleRoyaleGame,
          ): { game: BattleRoyaleGame; activeNote: Note; tick: { accuracy: number; hit: boolean } } => {
            const activeNote = findClosestNote(detectedNote);
            const tick = evaluateAndScoreTick(detectedNote, activeNote, difficultyRef.current, td.scoringMetadata);

            let updatedGame: BattleRoyaleGame;
            if (tick.hit) {
              const bountyMult = getBountyMultiplier(currentGame, playerId);
              const adjustedPoints = Math.round(tick.points * bountyMult);
              updatedGame = updatePlayerScore(
                currentGame,
                playerId,
                adjustedPoints,
                tick.accuracy,
                1, 0, 1,
              );
            } else {
              const currentCombo = comboMap.get(playerId) || 0;
              if (currentCombo > 0) {
                updatedGame = updatePlayerScore(
                  currentGame,
                  playerId,
                  0, 0, 0, 1,
                  -currentCombo,
                );
              } else {
                updatedGame = currentGame;
              }
            }
            return { game: updatedGame, activeNote, tick };
          };

          // Score all active MICROPHONE players — each with THEIR OWN pitch detector.
          // R9 (user request 2.1 — "nur jeder zweite Ton wird gewertet"): the
          // isSinging gate is REMOVED from scoring. The VocalDetector classifies
          // sustained steady notes (low pitch variance, no fresh onset) as
          // "humming" — exactly what a held karaoke syllable looks like — so the
          // gate dropped ticks in a regular per-note rhythm (same fix the
          // single-player mode already made, see use-note-scoring.ts P1).
          // Pitch presence + the detector's own volume/noise gates filter noise.
          // R14 (user request 6): + pitch hold — see lastValidPitchRef above.
          for (const player of micPlayers) {
            const playerPitch = multiPitchRef.current.getPlayerPitch(player.id);

            let detectedNote: number | null = null;
            if (playerPitch && playerPitch.note != null) {
              detectedNote = playerPitch.note;
              lastValidPitchRef.current.set(player.id, { note: detectedNote, at: currentAudioTime });
            } else {
              const lastValid = lastValidPitchRef.current.get(player.id);
              const stillAudible = (playerPitch?.volume ?? 0) >= PITCH_HOLD_MIN_VOLUME;
              // diff >= 0 guards the round change: each round loads a new
              // <audio> element, so currentAudioTime resets to 0 and a bare
              // `diff <= PITCH_HOLD_MS` would bridge a stale pitch for the
              // whole following round.
              const diff = lastValid ? currentAudioTime - lastValid.at : -1;
              if (lastValid && stillAudible && diff >= 0 && diff <= PITCH_HOLD_MS) {
                detectedNote = lastValid.note; // bridge the dropout
              }
            }
            if (detectedNote == null) continue;

            const { game: updatedGame, activeNote, tick } = scorePlayerTick(player.id, detectedNote, batchedGame);
            // Ghost notes: record the visual sample (hit or wrong-pitch miss
            // at the player's actually-sung pitch) for this player + note.
            pushPerformanceSample(player.id, activeNote, {
              time: currentAudioTime,
              accuracy: tick.accuracy,
              hit: tick.hit,
              sungPitch: detectedNote,
            });
            if (updatedGame !== batchedGame) {
              batchedGame = updatedGame;
              scoreChanged = true;
            }
          }

          // Score all active COMPANION players (uses polling cache)
          // Item 8.1: cache is keyed by profile id (BR player ids ARE profile
          // ids), so companion pitch flows into BR scoring like CPTM/PTM.
          for (const player of companionPlayers) {
            const cachedPitch = companionPitchCacheRef.current.get(player.id);

            // R9 (2.1): isSinging gate removed for companions too (see mic
            // loop above) — score on detected pitch presence.
            // R14 (6): same pitch hold as mic players — the phone-side
            // detector misses frames just like the local YIN does.
            if (cachedPitch) {
              let detectedNote: number | null = null;
              if (cachedPitch.note != null) {
                detectedNote = cachedPitch.note;
                lastValidPitchRef.current.set(player.id, { note: detectedNote, at: currentAudioTime });
              } else {
                const lastValid = lastValidPitchRef.current.get(player.id);
                // Companions transmit no volume — the time window alone
                // bounds the bridge (phone-side staleness is handled by the
                // polling hook's eviction).
                const diff = lastValid ? currentAudioTime - lastValid.at : -1;
                if (lastValid && diff >= 0 && diff <= PITCH_HOLD_MS) {
                  detectedNote = lastValid.note;
                }
              }
              if (detectedNote != null) {
                const { game: updatedGame, activeNote, tick } = scorePlayerTick(player.id, detectedNote, batchedGame);
                // Ghost notes (companions too): same sample recording as the
                // mic players so their misses also render as ghost bars.
                pushPerformanceSample(player.id, activeNote, {
                  time: currentAudioTime,
                  accuracy: tick.accuracy,
                  hit: tick.hit,
                  sungPitch: detectedNote,
                });
                if (updatedGame !== batchedGame) {
                  batchedGame = updatedGame;
                  scoreChanged = true;
                }
              }
            }
          }
        }

        // ── Ghost-note state sync (throttled 200 ms) ──────────────────
        // Replaces the removed Item-3 sync: per-player samples exist again,
        // so the note highway can render strips + ghosts like the other
        // modes. Immutable snapshot → new Map identities → memo-safe.
        const nowPerfSync = performance.now();
        if (
          nowPerfSync - lastPerfSyncRef.current >= 200 &&
          brNotePerformanceRef.current.size > 0 &&
          mountedRef.current
        ) {
          lastPerfSyncRef.current = nowPerfSync;
          setBrNotePerformance(snapshotBrPerformance(brNotePerformanceRef.current, currentAudioTime));
        }

        if (scoreChanged) {
          // Accumulate + keep gameRef current WITHOUT re-rendering (plain ref
          // assignment) — round-end handlers read gameRef and must see these
          // scores even if the throttled store write hasn't happened yet.
          pendingScoredGameRef.current = batchedGame;
          gameRef.current = batchedGame;
        }
        // Throttled store write (6.1): at most every 400 ms — the party tree
        // re-renders ~2.5×/s instead of ~10×/s while singing is evaluated.
        const nowWrite = performance.now();
        if (
          pendingScoredGameRef.current &&
          nowWrite - lastStoreWriteRef.current >= STORE_WRITE_INTERVAL_MS &&
          mountedRef.current &&
          !roundEndingRef.current
        ) {
          lastStoreWriteRef.current = nowWrite;
          onUpdateGameRef.current(pendingScoredGameRef.current);
          pendingScoredGameRef.current = null;
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => { startGameLoopRef.current = startGameLoop; }, [startGameLoop]);

  // ── Companion live-singing feed (ghost/hit monitor on the phones) ──
  // Pushes a compact per-player singing summary while a round is playing:
  // current note, target note, hit rate of the active note and combo streak
  // → companions render a live monitor (hits + ghost-style pitch offsets).
  // 500 ms cadence: the general /api/mobile POST limit is 300/min and the
  // gamestate push already uses 120/min (2 s) — this fits in the budget.
  useEffect(() => {
    if (game.status !== 'playing') return;
    const interval = setInterval(() => {
      if (gameRef.current.status !== 'playing' || pausedRef.current) return;
      const td = timingDataRef.current;
      if (!td) return;
      const t = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      const activeNotes = getActiveNotesAtTime(td.allNotes, t);
      if (activeNotes.length === 0) return;

      const players = activePlayersRef.current
        .filter(p => !p.eliminated)
        .map(p => {
          // Live pitch: local mic players via their own detector, companion
          // players via the polling cache (profile ids = player ids).
          const pitch = p.playerType === 'companion'
            ? companionPitchCacheRef.current.get(p.id)
            : multiPitchRef.current.getPlayerPitch(p.id);
          const sungNote = pitch && pitch.note != null ? pitch.note : null;
          const singing = !!pitch && pitch.note != null && pitch.isSinging !== false;

          // Target: the active note closest to the sung pitch (or the first).
          let targetNote: number | null = activeNotes[0].pitch;
          if (sungNote != null) {
            let best = activeNotes[0].pitch;
            let bestDist = Math.abs(sungNote - best);
            for (let i = 1; i < activeNotes.length; i++) {
              const dist = Math.abs(sungNote - activeNotes[i].pitch);
              if (dist < bestDist) { bestDist = dist; best = activeNotes[i].pitch; }
            }
            targetNote = best;
          }

          // Hit rate over the recent samples of the active notes (ghost monitor).
          let hitRate = 0;
          const perfMap = brNotePerformanceRef.current.get(p.id);
          if (perfMap) {
            let hits = 0;
            let total = 0;
            for (const note of activeNotes) {
              const samples = perfMap.get(note.id || `note-${note.startTime}`);
              if (!samples || samples.length === 0) continue;
              for (let i = Math.max(0, samples.length - 12); i < samples.length; i++) {
                if (samples[i].hit) hits++;
                total++;
              }
            }
            if (total > 0) hitRate = hits / total;
          }

          const gamePlayer = gameRef.current.players.find(gp => gp.id === p.id);
          return {
            id: p.id,
            name: p.name,
            color: p.color,
            singing,
            sungNote,
            targetNote,
            hitRate: Math.round(hitRate * 100) / 100,
            streak: gamePlayer?.currentCombo ?? 0,
          };
        });

      if (players.length === 0) return;
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'br-singing',
          payload: { players, serverTime: Date.now() },
        }),
      }).catch(() => { /* live monitor is best-effort */ });
    }, 500);
    return () => clearInterval(interval);
  }, [game.status, audioRef, timingDataRef, companionPitchCacheRef]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  // Use empty deps + multiPitchRef to avoid re-firing every render.
  // multiPitch is a new object every render (playerPitches Map changes ~50Hz),
  // so [multiPitch] as dep would call stop() every render, which creates
  // a new empty Map via setPlayerPitches(new Map()), triggering another
  // render → infinite loop (React #185 "Maximum update depth exceeded").
  useEffect(() => {
    return () => {
      multiPitchRef.current.stop();
    };
   
  }, []);

  return {
    stats,
    sortedPlayers,
    activePlayers,
    currentSong,
    currentTime,
    roundTimeLeft,
    snippetTimeLeft,
    currentSnippetIndex,
    totalSnippets,
    audioRef,
    videoRef,
    baseVolumeRef,
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    setCurrentTime,
    previousRoundScores: game.previousRoundScores,
    bountyPlayerId: game.bountyPlayerId,
    bountyMultiplier: game.settings.bountyMultiplier,
    pitchStats: pitchStatsRef.current,
    visibleNotes: visibleNotesRef.current,
    playerPitchMap: multiPitch.playerPitches,
    multiPitchErrors: multiPitch.errors,
    brNotePerformance,
    songProgress: currentSong && currentSong.duration > 0
      ? Math.min(100, Math.max(0, (currentTime / currentSong.duration) * 100))
      : 0,
    countdown,
    eliminationPhase,
    nextEliminationIn,
    midRoundEliminationNotice,
  };
}
