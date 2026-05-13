'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Song, LyricLine, Note, EMPTY_PLAYER_SCORE } from '@/types/game';

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
const SCORING_THROTTLE_MS = 250;
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { useGameMedia } from '@/hooks/use-game-media';
import { useSmoothedPitch } from '@/hooks/use-smoothed-pitch';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useYouTubeGame } from '@/hooks/use-youtube-game';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculatePitchStats, PitchStats, NOTE_WINDOW, getVisibleNotes } from '@/lib/game/note-utils';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';

import type { PtmPlayer, PtmSegment, PassTheMicSettings, GamePhase } from '@/components/game/ptm-types';
import { DEFAULT_SETTINGS } from '@/components/game/ptm-types';

// ===================== HOOK INTERFACE =====================

export interface PtmGameScreenProps {
  players: PtmPlayer[];
  song: Song;
  segments: PtmSegment[];
  settings: PassTheMicSettings | null;
  onUpdateGame: (_players: PtmPlayer[], _segments: PtmSegment[]) => void;
  onEndGame: () => void;
  onNavigate?: (_screen: string) => void;
  onPause?: () => void;
}

export interface PtmGameHookReturn {
  // Phase
  phase: GamePhase;
  countdown: number;

  // Media
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoLoadedRef: React.RefObject<boolean>;
  audioSong: Song | null;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  handleAdStart: () => void;
  handleAdEnd: () => void;
  onYoutubeTimeUpdate: (_time: number) => void;

  // Game state
  isPlaying: boolean;
  currentTime: number;
  smoothedPitch: number | null;
  currentPlayerIndex: number;
  currentPlayer: PtmPlayer | undefined;
  players: PtmPlayer[];
  isMedleyMode: boolean;

  // Note data
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  pitchStats: PitchStats;
  scoringMeta: ReturnType<typeof calculateScoringMetadata> | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  displayDuration: number;
  songEnergy: number;

  // Settings
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: 'rounded' | 'sharp' | 'pill' | 'diamond';
  safeSettings: PassTheMicSettings;

  // Transition
  transitionVisible: boolean;
  transitionNextPlayer: { id: string; name: string; avatar?: string; color: string } | null;
  completeTransition: () => void;

  // Series
  passTheMicSeriesHistory: PassTheMicRoundResult[];
  currentSegmentIndex: number;
  medleySnippetCount: number;
  initialSegmentsLength: number;

  // Callbacks
  startGame: () => Promise<void>;
  togglePause: () => void;
  handleEndSong: () => void;
  handleMediaEnded: () => void;
  handleMediaError: () => void;
  isRetryingSnippet: boolean;
  handleContinue: () => void;
  handleEndSeries: () => void;
  handleEndSeriesComplete: () => void;
  handleContinueWithPlayers: () => void;
  activeWebcamStreamsRef: React.RefObject<MediaStream[]>;
  onEndGame: () => void;
}

// ===================== MAIN HOOK =====================

export function usePtmGameLogic({
  players: initialPlayers,
  song,
  segments: initialSegments,
  settings,
  onUpdateGame,
  onEndGame,
  onNavigate,
  onPause: _onPause,
}: PtmGameScreenProps): PtmGameHookReturn {
  const safeSettings: PassTheMicSettings = settings ?? DEFAULT_SETTINGS;
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const passTheMicSeriesHistory = usePartyStore(s => s.passTheMicSeriesHistory);
  const setPassTheMicSeriesHistory = usePartyStore(s => s.setPassTheMicSeriesHistory);
  const setPassTheMicPlayers = usePartyStore(s => s.setPassTheMicPlayers);
  const setPassTheMicSong = usePartyStore(s => s.setPassTheMicSong);
  const setPassTheMicSegments = usePartyStore(s => s.setPassTheMicSegments);
  const setPassTheMicSettings = usePartyStore(s => s.setPassTheMicSettings);
  const ptmMedleySnippets = usePartyStore(s => s.ptmMedleySnippets);
  const ptmSongSelection = usePartyStore(s => s.ptmSongSelection);
  const { setGameMode, resetGame } = useGameStore();
  const lastIsSongPlayingRef = useRef(false);
  const activeWebcamStreamsRef = useRef<MediaStream[]>([]);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountGuardRef = useRef(false);

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);
  const [isRetryingSnippet, setIsRetryingSnippet] = useState(false);

  // ── Media: URL restoration, lyrics, media element refs ──
  const {
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    videoLoadedRef,
  } = useGameMedia(song);

  // ── Game settings (display preferences) ──
  const {
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
  } = useGameSettings();

  // ── YouTube handling ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [youtubeTime, setYoutubeTime] = useState(0);

  const {
    youtubeVideoId,
    isYouTube,
    useYouTubeAudio,
    isAdPlaying,
    handleAdStart,
    handleAdEnd,
  } = useYouTubeGame({
    effectiveSong,
    isPlaying,
    setIsPlaying,
  });

  // ── Song energy (for animated background) ──
  const [songEnergy, setSongEnergy] = useState(0);

  // ── Smoothed pitch ──
  const { pitchResult, stop, switchMicrophone } = usePitchDetector();
  const smoothedPitch = useSmoothedPitch(pitchResult?.note ?? null, 0.55, 0.15);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<PtmPlayer[]>(
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE }))
  );
  const [, rerender] = useState(0);
  // Force-render is needed because score updates mutate refs (for performance) instead of state.
  // Calling forceRender() triggers a re-render to pick up the latest ref values.
  const forceRender = useCallback(() => rerender(n => n + 1), []);
  const fallbackLyricsRef = useRef<LyricLine[] | null>(null);
  const medleyRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const medleyCanplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentSwitchHandledRef = useRef(false);
  const transitionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pre-computed player schedule: maps segment index → player index ──
  // Built once on mount so segment switches are deterministic and race-free.
  interface PtmScheduleEntry { segmentIndex: number; playerIndex: number; }
  const scheduleRef = useRef<PtmScheduleEntry[]>([]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  currentPlayerIndexRef.current = currentPlayerIndex;
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Set initial player from first segment's assignment & build pre-computed schedule ──
  useEffect(() => {
    const players = playersRef.current;
    const segCount = initialSegments.length;

    if (segCount <= 1) {
      // Single segment — assign to a random player
      const randomIdx = Math.floor(Math.random() * players.length);
      scheduleRef.current = [{ segmentIndex: 0, playerIndex: randomIdx }];
      const randomPlayer = players[randomIdx];
      const assigned = initialSegments.map(seg => ({ ...seg, playerId: randomPlayer.id }));
      setCurrentPlayerIndex(randomIdx);
      onUpdateGame(players, assigned);
      return;
    }

    // Build a pool with equal appearances per player, then shuffle
    const baseRepeats = Math.floor(segCount / players.length);
    const remainder = segCount % players.length;
    const pool: number[] = []; // player indices
    for (let p = 0; p < players.length; p++) {
      const count = baseRepeats + (p < remainder ? 1 : 0);
      for (let r = 0; r < count; r++) pool.push(p);
    }

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Avoid consecutive same-player assignments where possible
    for (let i = 1; i < pool.length; i++) {
      if (pool[i] === pool[i - 1]) {
        for (let j = i + 1; j < pool.length; j++) {
          if (pool[j] !== pool[i]) {
            [pool[i], pool[j]] = [pool[j], pool[i]];
            break;
          }
        }
      }
    }

    // Build schedule and assign playerIds to segments
    const schedule: PtmScheduleEntry[] = initialSegments.map((_, i) => ({
      segmentIndex: i,
      playerIndex: pool[i] ?? 0,
    }));
    scheduleRef.current = schedule;

    const assigned = initialSegments.map((seg, i) => ({
      ...seg,
      playerId: players[schedule[i]?.playerIndex ?? 0]?.id,
    }));

    // Set initial player from first segment's schedule entry
    setCurrentPlayerIndex(schedule[0]?.playerIndex ?? 0);
    onUpdateGame(players, assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Medley mode support ──
  const isMedleyMode = ptmMedleySnippets.length > 1;
  const currentSnippet = isMedleyMode ? ptmMedleySnippets[currentSegmentIndex] : null;
  // In medley mode, use the current snippet's song for audio; otherwise use effectiveSong
  const audioSong = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
  // For notes/lyrics, use snippet song in medley mode, or fallback lyrics if loaded.
  // CRITICAL: Use a ref for fallbackLyricsRef.current to ensure useMemo picks up changes
  // when forceRender() is called (fallback lyrics loaded async).
  const fallbackRef = useRef(fallbackLyricsRef.current);
  fallbackRef.current = fallbackLyricsRef.current;
  const notesSource = useMemo(() => {
    if (!audioSong) return null;
    if (audioSong.lyrics && audioSong.lyrics.length > 0) return audioSong;
    if (fallbackRef.current && fallbackRef.current.length > 0) {
      return { ...audioSong, lyrics: fallbackRef.current };
    }
    return audioSong;
  }, [audioSong, fallbackRef.current]);

  // ── Medley preloading: preload next snippet's audio while current is playing ──
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!isMedleyMode || phase !== 'playing') {
      // Cleanup preload when not in medley playing mode
      if (preloadRef.current) {
        preloadRef.current.src = '';
        preloadRef.current = null;
      }
      return;
    }

    const nextIdx = currentSegmentIndex + 1;
    if (nextIdx >= ptmMedleySnippets.length) return; // No next snippet

    const nextSnippet = ptmMedleySnippets[nextIdx];
    const nextAudioUrl = nextSnippet?.song?.audioUrl;
    if (!nextAudioUrl) return;

    // Create/reuse an Audio object to preload the next snippet
    if (!preloadRef.current) {
      preloadRef.current = new Audio();
    }
    const audio = preloadRef.current;
    // Only preload if not already loaded or different URL
    if (audio.src !== nextAudioUrl) {
      audio.src = nextAudioUrl;
      audio.preload = 'auto';
      // Start loading immediately
      audio.load();
    }

    return () => {
      // Don't clean up during unmount — let the browser cache it
    };
  }, [isMedleyMode, phase, currentSegmentIndex, ptmMedleySnippets]);

  // ── Transition state ──
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionNextPlayer, setTransitionNextPlayer] = useState<{
    id: string; name: string; avatar?: string; color: string;
  } | null>(null);

  // ── Mobile game sync ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'pass-the-mic', phase === 'song-results' || phase === 'series-results');

  // ── Song playing status for Escape handler (ref-guarded to prevent React #185) ──
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Cleanup: reset isSongPlaying on unmount ──
  useEffect(() => {
    unmountGuardRef.current = false;
    return () => {
      unmountGuardRef.current = true;
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (countdownRetryRef.current) {
        clearTimeout(countdownRetryRef.current);
        countdownRetryRef.current = null;
      }
    };
  }, [setIsSongPlaying]);

  // ── Pause / Resume sync ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      else if (videoRef.current && !videoRef.current.paused && !isYouTube) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      else if (videoRef.current && videoRef.current.paused && !isYouTube) videoRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase, audioRef, videoRef, isYouTube]);

  // ── Reset transition refs when segment changes (prevents stale state) ──
  useEffect(() => {
    segmentSwitchHandledRef.current = false;
    // Clean up transition hide timer from previous segment
    if (transitionHideTimerRef.current) {
      clearTimeout(transitionHideTimerRef.current);
      transitionHideTimerRef.current = null;
    }
  }, [currentSegmentIndex]);

  // ── Safety: load lyrics if effectiveSong has no lyrics ──
  // Uses getSongByIdWithLyrics for comprehensive loading (IndexedDB + filesystem).
  // This handles cases where the song was stored without lyrics in the party store
  // or where loadSongLyrics alone fails to find the TXT data.
  // CRITICAL: Also clear fallback when effectiveSong gains lyrics (e.g., after useGameMedia async load).
  useEffect(() => {
    const src = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
    if (!src) {
      fallbackLyricsRef.current = null;
      return;
    }
    if (src.lyrics && src.lyrics.length > 0) {
      // effectiveSong now has lyrics — clear fallback to avoid stale data
      if (fallbackLyricsRef.current) {
        fallbackLyricsRef.current = null;
      }
      return;
    }
    let cancelled = false;
    import('@/lib/game/song-library').then(({ getSongByIdWithLyrics }) => {
      getSongByIdWithLyrics(src.id).then(songWithLyrics => {
        if (cancelled || !songWithLyrics?.lyrics?.length) return;
        fallbackLyricsRef.current = songWithLyrics.lyrics;
        forceRender();
      }).catch(() => {});
    }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: run when effectiveSong or snippet changes
  }, [effectiveSong, currentSnippet, isMedleyMode, forceRender]);

  // ── Pre-compute note data for highway ──
  const { allNotes, sortedLines, pitchStats, scoringMeta } = useMemo(() => {
    if (!notesSource?.lyrics?.length) {
      return { allNotes: [], sortedLines: [], pitchStats: { minPitch: 40, maxPitch: 80, pitchRange: 40 } as PitchStats, scoringMeta: null };
    }

    const notes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    const lines = [...notesSource.lyrics].sort((a, b) => a.startTime - b.startTime);

    lines.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        notes.push({ ...note, lineIndex, line });
      });
    });
    notes.sort((a, b) => a.startTime - b.startTime);

    const bd = notesSource.bpm ? 15000 / notesSource.bpm : 500;
    const ps = calculatePitchStats(notes);
    const meta = calculateScoringMetadata(notes, bd);

    return { allNotes: notes, sortedLines: lines, pitchStats: ps, scoringMeta: meta };
  }, [notesSource]);

  const visibleNotes = useMemo(
    () => getVisibleNotes(allNotes, currentTime, NOTE_WINDOW),
    [currentTime, allNotes]
  );

  // ── Scoring ──
  const lastEvalTimeRef = useRef(0);

  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    const difficulty = safeSettings.difficulty;
    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, currentTime);
    if (!activeNote) return;

    if (currentTime - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = currentTime;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current[currentPlayerIndex];
    const idx = currentPlayerIndex;

    if (tick.hit) {
      p.score += tick.points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [currentTime, pitchResult, notesSource, safeSettings.difficulty, currentPlayerIndex, scoringMeta, forceRender]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      scoreCurrentPlayer();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, scoreCurrentPlayer]);

  // ── RAF-based time tracking (smooth 40fps like normal game screens) ──
  // IMPORTANT: Must depend on audioSong AND phase because:
  // 1. audioSong changes trigger re-attachment when URLs are restored.
  // 2. Phase changes (intro→playing) re-mount the <audio>/<video> DOM elements.
  // Uses requestAnimationFrame for smooth note highway animation instead of
  // the ~4Hz timeupdate events which cause jerky note movement.
  const lastCurrentTimeUpdateRef = useRef(0);

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;

    const timeLoop = () => {
      let elapsedMs: number;

      if (isYouTube && youtubeTime > 0) {
        elapsedMs = youtubeTime * 1000;
      } else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsedMs = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2 && !isYouTube) {
        elapsedMs = videoRef.current.currentTime * 1000;
      } else {
        // Fallback: keep current time (no regression)
        elapsedMs = currentTimeRef.current;
      }

      // Throttle React state updates to ~40fps (25ms) for smooth visuals
      const now = performance.now();
      if (now - lastCurrentTimeUpdateRef.current >= 25) {
        setCurrentTime(elapsedMs);
        lastCurrentTimeUpdateRef.current = now;
      }

      rafId = requestAnimationFrame(timeLoop);
    };

    rafId = requestAnimationFrame(timeLoop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, isYouTube, youtubeTime, audioRef, videoRef]);

  // ── Legacy timeupdate fallback (non-playing phases: intro, countdown) ──
  useEffect(() => {
    if (phase === 'playing') return; // handled by RAF loop above

    if (isYouTube && youtubeTime > 0) {
      setCurrentTime(youtubeTime * 1000);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }

    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => setCurrentTime(video.currentTime * 1000);
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [audioRef, videoRef, isYouTube, youtubeTime, audioSong, phase]);

  // ── Song energy tracking ──
  // Use a ref for currentTime to avoid re-creating the interval every ~250ms
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Pre-sort note start times for O(log n) binary search instead of O(n) filter
  const sortedNoteStarts = useMemo(() => {
    return allNotes.map(n => n.startTime).sort((a, b) => a - b);
  }, [allNotes]);

  useEffect(() => {
    if (!isPlaying || phase !== 'playing') { setSongEnergy(0); return; }
    const interval = setInterval(() => {
      // Binary search: count notes within ±2s of current time
      const t = currentTimeRef.current;
      const lo = t - 2000;
      const hi = t + 2000;
      // bisect_left for lo
      let left = 0, right = sortedNoteStarts.length;
      while (left < right) {
        const mid = (left + right) >> 1;
        if (sortedNoteStarts[mid] < lo) left = mid + 1;
        else right = mid;
      }
      const startIdx = left;
      // bisect_left for hi
      left = startIdx; right = sortedNoteStarts.length;
      while (left < right) {
        const mid = (left + right) >> 1;
        if (sortedNoteStarts[mid] < hi) left = mid + 1;
        else right = mid;
      }
      const nearbyNotes = left - startIdx;
      setSongEnergy(Math.min(1, nearbyNotes / 5));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, phase, sortedNoteStarts]);

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Show transition text (does NOT change phase — game continues playing) ──
  const showTransitionText = useCallback((nextPlayerIdx: number) => {
    const nextPlayer = playersRef.current[nextPlayerIdx];
    if (!nextPlayer) return;
    setTransitionNextPlayer({
      id: nextPlayer.id,
      name: nextPlayer.name,
      avatar: nextPlayer.avatar,
      color: nextPlayer.color,
    });
    setTransitionVisible(true);
  }, []);

  // Dismiss transition overlay (user skips via Space/click).
  // The actual segment switch is handled by the time-based game loop below.
  const completeTransition = useCallback(() => {
    setTransitionVisible(false);
  }, []);

  // ── Record round results ──
  const recordRound = useCallback(() => {
    const round: PassTheMicRoundResult = {
      songTitle: isMedleyMode ? `Medley (${ptmMedleySnippets.length} Songs)` : (effectiveSong?.title || song.title),
      songArtist: isMedleyMode ? '' : (effectiveSong?.artist || song.artist),
      playedAt: Date.now(),
      playerScores: {},
    };
    for (const p of playersRef.current) {
      round.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
      };
    }
    setPassTheMicSeriesHistory([...passTheMicSeriesHistory, round]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isMedleyMode/ptmMedleySnippets.length excluded; recordRound uses refs
  }, [effectiveSong, song, passTheMicSeriesHistory, setPassTheMicSeriesHistory]);

  // ── Segment switching (deterministic, using pre-computed schedule) ──
  // Phase stays 'playing' throughout — no 'transitioning' phase.
  // The transition overlay is purely visual and non-blocking.
  const TRANSITION_LEAD_TIME = 2000; // Show typing text 2s before segment end
  const transitionShownRef = useRef(false);

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSegment) return;

    const schedule = scheduleRef.current;
    if (!schedule.length) return;

    // Show transition text 2s before segment end (visual only, game continues)
    if (currentSegmentIndex < initialSegments.length - 1 &&
        !transitionShownRef.current &&
        currentTime >= currentSegment.endTime - TRANSITION_LEAD_TIME) {
      transitionShownRef.current = true;
      const nextEntry = schedule[currentSegmentIndex + 1];
      if (nextEntry) {
        showTransitionText(nextEntry.playerIndex);
      }
    }

    // Switch player at segment end (deterministic, single code path)
    if (currentTime >= currentSegment.endTime && !segmentSwitchHandledRef.current) {
      segmentSwitchHandledRef.current = true;

      if (currentSegmentIndex < initialSegments.length - 1) {
        const currentEntry = schedule[currentSegmentIndex];
        const nextSegIdx = currentSegmentIndex + 1;
        const nextEntry = schedule[nextSegIdx];

        // Count segment as sung for the current player
        if (currentEntry) {
          playersRef.current[currentEntry.playerIndex].segmentsSung++;
        }

        setCurrentSegmentIndex(nextSegIdx);
        setCurrentPlayerIndex(nextEntry?.playerIndex ?? currentPlayerIndexRef.current);

        // Auto-hide transition text after 1.5s
        if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
        transitionHideTimerRef.current = setTimeout(() => {
          setTransitionVisible(false);
          transitionHideTimerRef.current = null;
        }, 1500);
      } else {
        // Song finished
        setIsPlaying(false);
        setTransitionVisible(false);
        recordRound();
        setPhase('song-results');
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments, showTransitionText, recordRound]);

  // ── Random switch (rare mid-segment, no phase change) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !safeSettings.randomSwitches) return;
    const interval = setInterval(() => {
      if (Math.random() < 0.003) {
        const currentIndex = currentPlayerIndexRef.current;
        const next = (currentIndex + 1 + Math.floor(Math.random() * (playersRef.current.length - 1))) % playersRef.current.length;
        playersRef.current[currentIndex].segmentsSung++;
        setCurrentPlayerIndex(next);
        // Show transition text briefly (non-blocking)
        showTransitionText(next);
        // Auto-hide after 2s
        if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
        transitionHideTimerRef.current = setTimeout(() => {
          setTransitionVisible(false);
          transitionHideTimerRef.current = null;
        }, 2000);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isPlaying, showTransitionText, safeSettings.randomSwitches]);

  // ── Mic handoff ──
  useEffect(() => {
    if (phase !== 'playing') return;
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;
    if (player.micId && player.micId !== 'default') {
      switchMicrophone(player.micId).catch(() => {});
    }
  }, [currentPlayerIndex, phase, switchMicrophone]);

  // ── Medley mode: seek to snippet start when segment changes ──
  useEffect(() => {
    if (!isMedleyMode || !currentSnippet || phase !== 'playing') return;

    // Use requestAnimationFrame to ensure the new audio/video element (from key change)
    // has been committed to the DOM before we try to access it via refs.
    medleyRetryTimerRef.current = null;
    medleyCanplayTimerRef.current = null;

    const rafId = requestAnimationFrame(() => {
      const media = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
      if (!media) {
        // Media element not ready yet — retry after a short delay
        const retryTimer = setTimeout(() => {
          if (unmountGuardRef.current) return;
          const m2 = audioRef.current || (videoRef.current && !isYouTube ? videoRef.current : null);
          if (m2 && isPlaying) {
            m2.currentTime = currentSnippet.startTime / 1000;
            m2.play().catch(() => {});
          }
        }, 200);
        medleyRetryTimerRef.current = retryTimer;
        return;
      }

      const seekAndPlay = () => {
        if (unmountGuardRef.current) return;
        media.currentTime = currentSnippet.startTime / 1000;
        if (isPlaying) {
          media.play().catch(() => {});
          // Also play background video (muted) when audio is a separate element
          if (media !== videoRef.current && videoRef.current && !isYouTube && videoRef.current.paused) {
            videoRef.current.currentTime = currentSnippet.startTime / 1000;
            videoRef.current.play().catch(() => {});
          }
        }
      };

      // If media is ready, seek immediately
      if (media.readyState >= 2) {
        seekAndPlay();
      } else {
        // Wait for canplay
        const onCanPlay = () => {
          if (unmountGuardRef.current) {
            media.removeEventListener('canplay', onCanPlay);
            return;
          }
          seekAndPlay();
          media.removeEventListener('canplay', onCanPlay);
        };
        media.addEventListener('canplay', onCanPlay);
        // Also clean up after timeout to avoid leaking listeners
        medleyCanplayTimerRef.current = setTimeout(() => {
          media.removeEventListener('canplay', onCanPlay);
        }, 5000);
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (medleyRetryTimerRef.current) { clearTimeout(medleyRetryTimerRef.current); medleyRetryTimerRef.current = null; }
      if (medleyCanplayTimerRef.current) { clearTimeout(medleyCanplayTimerRef.current); medleyCanplayTimerRef.current = null; }
    };
  }, [currentSegmentIndex, isMedleyMode, currentSnippet, phase, isPlaying, audioRef, videoRef, isYouTube]);

  // ── Start game (countdown → playing) ──

  const startGame = async () => {
    // Guard: ensure lyrics are available before starting
    // Use notesSource which includes fallback lyrics from the safety effect
    const songToCheck = notesSource || (isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong);
    if (!songToCheck?.lyrics || songToCheck.lyrics.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[PTM] No lyrics loaded, attempting reload...');
      const fallbackSrc = isMedleyMode && currentSnippet ? currentSnippet.song : effectiveSong;
      try {
        const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
        if (!fallbackSrc) return;
        const songWithLyrics = await getSongByIdWithLyrics(fallbackSrc.id);
        if (songWithLyrics?.lyrics?.length) {
          fallbackLyricsRef.current = songWithLyrics.lyrics;
          forceRender();
        }
      } catch { /* non-critical */ }
    }

    setPhase('countdown');
    setCountdown(3);
    // Use assigned mic if set and not default
    const micId = safeSettings.sharedMicId && safeSettings.sharedMicId !== 'default'
      ? safeSettings.sharedMicId
      : (safeSettings.micId && safeSettings.micId !== 'default' ? safeSettings.micId : undefined);

    try {
      // switchMicrophone handles stop → destroy → re-init → start
      await switchMicrophone(micId);
    } catch { /* pitch may fail in some envs */ }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);
          // In medley mode, seek to the first snippet's start time
          const seekTo = isMedleyMode && ptmMedleySnippets[0]
            ? ptmMedleySnippets[0].startTime / 1000
            : 0;

          // Use requestAnimationFrame to ensure media element is available
          // after any key-based re-mounting (medley mode changes audioSong.id)
          requestAnimationFrame(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = seekTo;
              audioRef.current.play().catch(() => {});
              // Also play background video (muted) for visual effect when using separate audio
              if (videoRef.current && videoRef.current !== audioRef.current && !isYouTube && videoRef.current.paused) {
                videoRef.current.currentTime = seekTo;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current && !isYouTube) {
              // Embedded audio: play the video element instead
              videoRef.current.currentTime = seekTo;
              videoRef.current.play().catch(() => {});
            } else {
              // Media element not ready yet — retry shortly
              // eslint-disable-next-line no-console
              console.warn('[PTM] No media element available at game start, retrying...');
              countdownRetryRef.current = setTimeout(() => {
                countdownRetryRef.current = null;
                if (unmountGuardRef.current) return; // component already unmounted
                if (audioRef.current) {
                  audioRef.current.currentTime = seekTo;
                  audioRef.current.play().catch(() => {});
                } else if (videoRef.current && !isYouTube) {
                  videoRef.current.currentTime = seekTo;
                  videoRef.current.play().catch(() => {});
                }
              }, 300);
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
  };

  // ── Continue series: reset per-song scores, pick next song based on selection mode ──
  const handleContinue = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    const resetPlayers = playersRef.current.map(p => ({
      ...p, ...EMPTY_PLAYER_SCORE, segmentsSung: 0,
    }));
    setPassTheMicPlayers(resetPlayers);
    setPassTheMicSegments([]);
    setPassTheMicSong(null);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    // Navigate based on how the user originally chose their song:
    // - random → auto-pick next random song (handled in party-game-screens)
    // - vote → show vote overlay again
    // - medley → auto-generate new medley (handled in party-game-screens)
    // - library → go to library for manual selection
    const sel = ptmSongSelection || (isMedleyMode ? 'medley' : 'library');
    const targetScreen = sel === 'random' ? 'ptm-next-random'
      : sel === 'medley' ? 'ptm-next-medley'
      : sel === 'vote' ? 'song-voting'
      : 'library';
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, isMedleyMode, setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

  // ── End series completely: clean up ──
  const handleEndSeriesComplete = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    setPassTheMicPlayers([]);
    setPassTheMicSegments([]);
    setPassTheMicSettings(null);
    setPassTheMicSeriesHistory([]);
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    resetGame();
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => {
      setPassTheMicSong(null);
      onNavigate?.('party-setup');
    }, 0);
  }, [setPassTheMicPlayers, setPassTheMicSong, setPassTheMicSegments, setPassTheMicSettings, setPassTheMicSeriesHistory, setIsSongPlaying, resetGame, onNavigate, stop]);

  // ── Continue with same players (after winner ceremony) ──
  const handleContinueWithPlayers = useCallback(() => {
    // Stop pitch detector BEFORE navigating to avoid unmount errors
    try { stop(); } catch { /* ignore */ }
    // Reset series history but keep players
    setPassTheMicSeriesHistory([]);
    setPassTheMicSegments([]);
    setGameMode('pass-the-mic');
    setIsSongPlaying(false);
    lastIsSongPlayingRef.current = false;
    // Navigate based on song selection mode (same as handleContinue)
    const sel = ptmSongSelection || 'library';
    const targetScreen = sel === 'random' ? 'ptm-next-random'
      : sel === 'medley' ? 'ptm-next-medley'
      : sel === 'vote' ? 'song-voting'
      : 'library';
    // Defer navigation to avoid React unmount race condition
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [ptmSongSelection, setPassTheMicSeriesHistory, setPassTheMicSegments, setGameMode, onNavigate, setIsSongPlaying, stop]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      try { stop(); } catch { /* already stopped */ }
      // Clean up any active webcam streams
      activeWebcamStreamsRef.current.forEach(stream => {
        stream.getTracks().forEach(t => t.stop());
      });
      activeWebcamStreamsRef.current = [];
      // Remove any orphaned webcam video elements
      document.querySelectorAll('video[style*="z-index:100"]').forEach(el => el.remove());
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [stop]);

  // ── Toggle pause/resume (used by HUD controls) ──
  // CRITICAL: Pause/resume BOTH audio AND video independently (like Escape key does).
  // For YouTube songs, audioRef/videoRef may be null — the YouTube player is controlled via setIsPlaying.
  // Also syncs isSongPlaying in the party store so the Escape handler stays consistent.
  const togglePause = useCallback(() => {
    if (isPlaying) {
      // Pause ALL media elements — audio, video, and background video
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused && !isYouTube) videoRef.current.pause();
      setIsPlaying(false);
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    } else if (phase === 'playing') {
      setIsPlaying(true);
      // Resume media elements
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      if (videoRef.current && videoRef.current.paused && !isYouTube) videoRef.current.play().catch(() => {});
    }
  }, [isPlaying, phase, audioRef, videoRef, isYouTube, setIsSongPlaying]);

  // ── Handle ending the song early ──
  const handleEndSong = useCallback(() => {
    setIsPlaying(false);
    recordRound();
    setPhase('song-results');
  }, [recordRound]);

  // ── Shared handler for audio/video/background end — avoids triplicated logic ──
  const handleMediaEnded = useCallback(() => {
    if (phase === 'playing') {
      setIsPlaying(false);
      recordRound();
      setPhase('song-results');
    }
  }, [phase, recordRound]);

  // ── Handle media error — in medley mode, retry with a different song ──
  const handleMediaError = useCallback(() => {
    if (!isMedleyMode || phase !== 'playing') return;
    // Don't retry if already retrying (prevent infinite loops)
    if (isRetryingSnippet) return;

    setIsRetryingSnippet(true);
    setIsPlaying(false);

    // Try to load a replacement snippet from the library
    (async () => {
      try {
        const { getAllSongs } = await import('@/lib/game/song-library');
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        const { generateMedleySnippets } = await import('@/components/game/medley/medley-snippet-generator');

        const songs = getAllSongs();
        // Generate 1 snippet from a random song (different from current if possible)
        const snippets = generateMedleySnippets(songs, 1, 30);
        if (snippets.length === 0) {
          // No songs available — fall through to song end
          setIsRetryingSnippet(false);
          recordRound();
          setPhase('song-results');
          return;
        }

        let prepared = await ensureSongUrls(snippets[0].song);
        // Load lyrics
        if (!prepared.lyrics || prepared.lyrics.length === 0) {
          try {
            const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
            const lyrics = await loadSongLyrics(prepared);
            if (lyrics.length > 0) prepared = { ...prepared, lyrics };
          } catch { /* non-critical */ }
        }

        const newSnippet = { ...snippets[0], song: prepared };

        // Replace the current snippet in the store
        const setPtmMedleySnippets = usePartyStore.getState().setPtmMedleySnippets;
        const updatedSnippets = [...ptmMedleySnippets];
        if (currentSegmentIndex < updatedSnippets.length) {
          updatedSnippets[currentSegmentIndex] = newSnippet;
          setPtmMedleySnippets(updatedSnippets);
        }

        // Reset segment switch guard so it can detect the new end time
        segmentSwitchHandledRef.current = false;

        // Clear fallback lyrics so they get re-loaded for the new snippet
        fallbackLyricsRef.current = null;

        setIsRetryingSnippet(false);

        // The audio/video elements will re-mount because the key (song.id) changed
        // The medley seek effect will handle seeking and playing
        // Need to re-trigger playing state after snippet replacement
        setTimeout(() => {
          if (!unmountGuardRef.current) {
            setIsPlaying(true);
          }
        }, 500);
      } catch {
        // Retry failed — fall through to song end
        setIsRetryingSnippet(false);
        recordRound();
        setPhase('song-results');
      }
    })();
  }, [isMedleyMode, phase, isRetryingSnippet, currentSegmentIndex, ptmMedleySnippets, recordRound]);

  return {
    // Phase
    phase,
    countdown,

    // Media
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    videoLoadedRef,
    audioSong,
    isYouTube,
    youtubeVideoId,
    useYouTubeAudio,
    isAdPlaying,
    handleAdStart,
    handleAdEnd,
    onYoutubeTimeUpdate: setYoutubeTime,

    // Game state
    isPlaying,
    currentTime,
    smoothedPitch,
    currentPlayerIndex,
    currentPlayer,
    players: playersRef.current,
    isMedleyMode,

    // Note data
    allNotes,
    sortedLines,
    pitchStats,
    scoringMeta,
    visibleNotes,
    displayDuration,
    songEnergy,

    // Settings
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    safeSettings,

    // Transition
    transitionVisible,
    transitionNextPlayer,
    completeTransition,

    // Series
    passTheMicSeriesHistory,
    currentSegmentIndex,
    medleySnippetCount: ptmMedleySnippets.length,
    initialSegmentsLength: initialSegments.length,

    // Callbacks
    startGame,
    handleEndSong,
    togglePause,
    handleMediaEnded,
    handleMediaError,
    isRetryingSnippet,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
    handleContinueWithPlayers,
    activeWebcamStreamsRef,
    onEndGame,
  };
}
