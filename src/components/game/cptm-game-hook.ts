'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Song, Note, LyricLine, EMPTY_PLAYER_SCORE } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useGameMedia } from '@/hooks/use-game-media';
import { useGameSettings } from '@/hooks/use-game-settings';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculatePitchStats, PitchStats, getVisibleNotes, NOTE_WINDOW } from '@/lib/game/note-utils';
import type { CptmPlayer, CptmSegment, CptmSettings, CptmRoundResult, GamePhase } from './cptm-types';
import { DEFAULT_CPTM_SETTINGS } from './cptm-types';

// ===================== CONSTANTS =====================

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
const SCORING_THROTTLE_MS = 250;

/** Companion pitch polling interval in ms (5 polls/sec) */
const COMPANION_POLL_MS = 200;

/** Maximum age (ms) before a cached companion pitch is considered stale and evicted */
const STALE_PITCH_MS = 1000;

/** Default lead time in seconds before segment end to start blink warning */
const DEFAULT_BLINK_LEAD_TIME = 3;

// ===================== COMPANION PITCH CACHE TYPES =====================

interface CompanionPitchEntry {
  note: number | null;
  frequency: number | null;
  clarity: number;
  volume: number;
  isSinging: boolean;
  /** Timestamp when this pitch was last updated from the companion API */
  lastUpdated: number;
}

// ===================== HOOK INTERFACES =====================

export interface CptmGameHookProps {
  players: CptmPlayer[];
  song: Song;
  segments: CptmSegment[];
  settings: CptmSettings | null;
  onUpdateGame: (_players: CptmPlayer[], _segments: CptmSegment[]) => void;
  onEndGame: () => void;
  onNavigate?: (_screen: string) => void;
  onPause?: () => void;
}

export interface CptmGameHookReturn {
  // Phase
  phase: GamePhase;
  countdown: number;

  // Media
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;

  // Game state
  currentPlayerIndex: number;
  currentPlayer: CptmPlayer | undefined;
  players: CptmPlayer[];

  // Note data
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  sortedLines: LyricLine[];
  scoringMeta: ReturnType<typeof calculateScoringMetadata> | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  displayDuration: number;

  // Settings
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  noteDisplayStyle: string;
  noteShapeStyle: 'rounded' | 'sharp' | 'pill' | 'diamond';
  safeSettings: CptmSettings;

  // Series
  cptmSeriesHistory: CptmRoundResult[];
  currentSegmentIndex: number;

  // Callbacks
  startGame: () => Promise<void>;
  togglePause: () => void;
  handleEndSong: () => void;
  handleMediaEnded: () => void;
  handleContinue: () => void;
  handleEndSeries: () => void;
  handleEndSeriesComplete: () => void;
  onEndGame: () => void;
}

// ===================== MAIN HOOK =====================

export function useCptmGameLogic({
  players: initialPlayers,
  song,
  segments: initialSegments,
  settings,
  onUpdateGame,
  onEndGame: _onEndGame,
  onNavigate,
  onPause: _onPause,
}: CptmGameHookProps): CptmGameHookReturn {
  const safeSettings: CptmSettings = settings ?? DEFAULT_CPTM_SETTINGS;

  // ── Party store selectors ──
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const cptmSeriesHistory = usePartyStore(s => s.cptmSeriesHistory);
  const setCptmSeriesHistory = usePartyStore(s => s.setCptmSeriesHistory);
  const setCptmPlayers = usePartyStore(s => s.setCptmPlayers);
  const setCptmSong = usePartyStore(s => s.setCptmSong);
  const setCptmSegments = usePartyStore(s => s.setCptmSegments);
  const setCptmSettings = usePartyStore(s => s.setCptmSettings);
  const cptmSongSelection = usePartyStore(s => s.cptmSongSelection);
  const { setGameMode, resetGame } = useGameStore();

  // ── Refs for cleanup ──
  const lastIsSongPlayingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountGuardRef = useRef(false);

  // ── Phase management ──
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [countdown, setCountdown] = useState(3);

  // ── Media: URL restoration, lyrics, media element refs ──
  const {
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
  } = useGameMedia(song);

  // ── Game settings (display preferences) ──
  const {
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
  } = useGameSettings();

  // ── Playback state ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // ── Player state (local, mutable for performance) ──
  const playersRef = useRef<CptmPlayer[]>(
    initialPlayers.map(p => ({ ...p, ...EMPTY_PLAYER_SCORE }))
  );
  const [, rerender] = useState(0);
  const forceRender = useCallback(() => rerender(n => n + 1), []);
  const fallbackLyricsRef = useRef<LyricLine[] | null>(null);
  const segmentSwitchHandledRef = useRef(false);
  const transitionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pre-computed player schedule: maps segment index → player index ──
  interface CptmScheduleEntry { segmentIndex: number; playerIndex: number; }
  const scheduleRef = useRef<CptmScheduleEntry[]>([]);

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  currentPlayerIndexRef.current = currentPlayerIndex;
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Companion pitch cache ──
  // Maps profileId (player.id) → latest pitch data from companion apps
  const companionPitchCacheRef = useRef<Map<string, CompanionPitchEntry>>(new Map());
  const companionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const companionAbortRef = useRef<AbortController | null>(null);

  // ── Blink lead time from settings (default 3s) ──
  const blinkLeadTime = (safeSettings as unknown as Record<string, unknown>).blinkWarning as number | undefined ?? DEFAULT_BLINK_LEAD_TIME;

  // ── Build pre-computed player schedule on mount ──
  useEffect(() => {
    const players = playersRef.current;
    const segCount = initialSegments.length;

    if (segCount <= 1) {
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
    const pool: number[] = [];
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

    const schedule: CptmScheduleEntry[] = initialSegments.map((_, i) => ({
      segmentIndex: i,
      playerIndex: pool[i] ?? 0,
    }));
    scheduleRef.current = schedule;

    const assigned = initialSegments.map((seg, i) => ({
      ...seg,
      playerId: players[schedule[i]?.playerIndex ?? 0]?.id,
    }));

    setCurrentPlayerIndex(schedule[0]?.playerIndex ?? 0);
    onUpdateGame(players, assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mobile game sync ──
  useMobileGameSync(effectiveSong, isPlaying && phase === 'playing', 'companion-pass-the-mic', phase === 'song-results' || phase === 'series-results');

  // ── Song playing status for Escape handler ──
  useEffect(() => {
    const newVal = isPlaying && phase === 'playing';
    if (lastIsSongPlayingRef.current !== newVal) {
      lastIsSongPlayingRef.current = newVal;
      setIsSongPlaying(newVal);
    }
  }, [isPlaying, phase, setIsSongPlaying]);

  // ── Pause / Resume sync ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      else if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    } else if (pauseDialogAction === null && isPlaying && phase === 'playing') {
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      else if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [pauseDialogAction, isPlaying, phase, audioRef, videoRef]);

  // ── Reset transition refs when segment changes ──
  useEffect(() => {
    segmentSwitchHandledRef.current = false;
    blinkWarningSentRef.current = false;
    if (transitionHideTimerRef.current) {
      clearTimeout(transitionHideTimerRef.current);
      transitionHideTimerRef.current = null;
    }
  }, [currentSegmentIndex]);

  // ── Safety: load lyrics if effectiveSong has no lyrics ──
  useEffect(() => {
    const src = effectiveSong;
    if (!src) {
      fallbackLyricsRef.current = null;
      return;
    }
    if (src.lyrics && src.lyrics.length > 0) {
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
  }, [effectiveSong, forceRender]);

  // ── Build notesSource from effectiveSong (with fallback lyrics) ──
  const fallbackRef = useRef(fallbackLyricsRef.current);
  fallbackRef.current = fallbackLyricsRef.current;
  const notesSource = useMemo(() => {
    if (!effectiveSong) return null;
    if (effectiveSong.lyrics && effectiveSong.lyrics.length > 0) return effectiveSong;
    if (fallbackRef.current && fallbackRef.current.length > 0) {
      return { ...effectiveSong, lyrics: fallbackRef.current };
    }
    return effectiveSong;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fallbackRef.current is intentionally read inside useMemo for async-loaded lyrics
  }, [effectiveSong, fallbackRef.current]);

  // ── Pre-compute note data for highway ──
  const { allNotes, sortedLines, pitchStats: _pitchStats, scoringMeta } = useMemo(() => {
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

  // ── Companion pitch polling ──
  // Polls /api/mobile?action=getpitch every 200ms during playing phase.
  // Response: Array<{ clientId, code, data: PitchData, profile: MobileProfile | null }>
  // We map profile.id → player.id for scoring.
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      return;
    }

    const pollCompanionPitch = async () => {
      if (companionAbortRef.current) companionAbortRef.current.abort();
      companionAbortRef.current = new AbortController();

      try {
        const res = await fetch('/api/mobile?action=getpitch', {
          signal: companionAbortRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();

        const pitchEntries = Array.isArray(data) ? data : [];
        const now = Date.now();
        const activeProfileIds = new Set<string>();

        for (const entry of pitchEntries) {
          const profileId = entry.profile?.id;
          const pitchData = entry.data;
          if (!profileId || !pitchData) continue;

          activeProfileIds.add(profileId);
          companionPitchCacheRef.current.set(profileId, {
            note: pitchData.note ?? null,
            frequency: pitchData.frequency ?? null,
            clarity: pitchData.clarity ?? 0,
            volume: pitchData.volume ?? 0,
            isSinging: pitchData.isSinging ?? false,
            lastUpdated: now,
          });
        }

        // Evict stale entries not seen in this poll cycle
        for (const [cachedProfileId, cachedEntry] of companionPitchCacheRef.current.entries()) {
          if (!activeProfileIds.has(cachedProfileId) && (now - cachedEntry.lastUpdated) > STALE_PITCH_MS) {
            companionPitchCacheRef.current.delete(cachedProfileId);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Silently ignore polling errors
      }
    };

    pollCompanionPitch();
    companionPollRef.current = setInterval(pollCompanionPitch, COMPANION_POLL_MS);

    return () => {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      if (companionAbortRef.current) companionAbortRef.current.abort();
    };
  }, [phase, isPlaying]);

  // ── Scoring (using companion pitch cache) ──
  const lastEvalTimeRef = useRef(0);

  const scoreCurrentPlayer = useCallback(() => {
    // Get the current active player's pitch from companion cache
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;

    const cachedPitch = companionPitchCacheRef.current.get(player.id);
    if (!cachedPitch || cachedPitch.note == null) return;

    // Build a fake pitchResult from cached data
    const pitchResult = {
      note: cachedPitch.note,
      frequency: cachedPitch.frequency ?? 0,
      clarity: cachedPitch.clarity,
      volume: cachedPitch.volume,
      isSinging: cachedPitch.isSinging,
    };

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
  }, [currentTime, notesSource, safeSettings.difficulty, currentPlayerIndex, scoringMeta, forceRender]);

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

  // ── RAF-based time tracking (smooth ~40fps) ──
  const lastCurrentTimeUpdateRef = useRef(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;

    const timeLoop = () => {
      let elapsedMs: number;

      if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsedMs = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
        elapsedMs = videoRef.current.currentTime * 1000;
      } else {
        elapsedMs = currentTimeRef.current;
      }

      const now = performance.now();
      if (now - lastCurrentTimeUpdateRef.current >= 25) {
        setCurrentTime(elapsedMs);
        lastCurrentTimeUpdateRef.current = now;
      }

      rafId = requestAnimationFrame(timeLoop);
    };

    rafId = requestAnimationFrame(timeLoop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, audioRef, videoRef]);

  // ── Legacy timeupdate fallback (non-playing phases) ──
  useEffect(() => {
    if (phase === 'playing') return;

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
  }, [audioRef, videoRef, effectiveSong, phase]);

  // ── Display duration ──
  const displayDuration = useMemo(() => {
    if (!effectiveSong) return 0;
    if (effectiveSong.end) return effectiveSong.end;
    return effectiveSong.duration;
  }, [effectiveSong]);

  // ── Companion turn signals ──
  // Sends turn warnings/activations to companion apps via POST to /api/mobile

  /**
   * Send a cptm turn signal to the companion app.
   * - profileId: the player whose turn it currently is (null if no one)
   * - nextProfileId: the player who is next (null if none)
   * - countdown: countdown value (null if turn is active)
   * - isActive: whether the signal is active
   */
  const sendCompanionTurnSignal = useCallback((
    profileId: string | null,
    nextProfileId: string | null,
    countdown: number | null,
    isActive: boolean,
  ) => {
    try {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            cptmTurn: { profileId, nextProfileId, countdown, isActive },
          },
        }),
      }).catch(() => {
        // Silently ignore — companion may not be connected
      });
    } catch {
      // Ignore
    }
  }, []);

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
      // Clear companion turn signal on unmount
      sendCompanionTurnSignal(null, null, null, false);
    };
  }, [setIsSongPlaying, sendCompanionTurnSignal]);

  // ── Blink warning countdown management ──
  const blinkWarningSentRef = useRef(false);
  const blinkCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkCountdownValueRef = useRef(0);

  // Clean up blink countdown interval on unmount
  useEffect(() => {
    return () => {
      if (blinkCountdownRef.current) {
        clearInterval(blinkCountdownRef.current);
        blinkCountdownRef.current = null;
      }
    };
  }, []);

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
  }, [effectiveSong, song, cptmSeriesHistory, setCptmSeriesHistory]);

  // ── Segment switching with companion turn signals ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSegment) return;

    const schedule = scheduleRef.current;
    if (!schedule.length) return;

    const isLastSegment = currentSegmentIndex >= initialSegments.length - 1;

    // Send blink warning to NEXT player before segment ends
    if (!isLastSegment && !blinkWarningSentRef.current &&
        currentTime >= currentSegment.endTime - (blinkLeadTime * 1000)) {
      blinkWarningSentRef.current = true;

      const nextEntry = schedule[currentSegmentIndex + 1];
      if (nextEntry) {
        const nextPlayer = playersRef.current[nextEntry.playerIndex];
        if (nextPlayer) {
          // Send blink warning with countdown starting at blinkLeadTime
          blinkCountdownValueRef.current = blinkLeadTime;
          sendCompanionTurnSignal(null, nextPlayer.id, blinkLeadTime, true);

          // Countdown every second: 3 → 2 → 1
          if (blinkCountdownRef.current) clearInterval(blinkCountdownRef.current);
          blinkCountdownRef.current = setInterval(() => {
            blinkCountdownValueRef.current--;
            const remaining = blinkCountdownValueRef.current;
            if (remaining > 0) {
              sendCompanionTurnSignal(null, nextPlayer.id, remaining, true);
            } else {
              // Countdown finished — clear interval (turn signal sent at segment switch)
              if (blinkCountdownRef.current) {
                clearInterval(blinkCountdownRef.current);
                blinkCountdownRef.current = null;
              }
            }
          }, 1000);
        }
      }
    }

    // Switch player at segment end (deterministic)
    if (currentTime >= currentSegment.endTime && !segmentSwitchHandledRef.current) {
      segmentSwitchHandledRef.current = true;

      // Clean up blink countdown
      if (blinkCountdownRef.current) {
        clearInterval(blinkCountdownRef.current);
        blinkCountdownRef.current = null;
      }

      if (!isLastSegment) {
        const currentEntry = schedule[currentSegmentIndex];
        const nextSegIdx = currentSegmentIndex + 1;
        const nextEntry = schedule[nextSegIdx];

        // Count segment as sung for the current player
        if (currentEntry) {
          playersRef.current[currentEntry.playerIndex].segmentsSung++;
        }

        setCurrentSegmentIndex(nextSegIdx);

        const nextPlayerIdx = nextEntry?.playerIndex ?? currentPlayerIndexRef.current;
        setCurrentPlayerIndex(nextPlayerIdx);

        // Send "YOUR TURN" signal to the next player
        const nextPlayer = playersRef.current[nextPlayerIdx];
        if (nextPlayer) {
          sendCompanionTurnSignal(nextPlayer.id, null, null, true);
        }

        // Auto-hide any transition after 1.5s
        if (transitionHideTimerRef.current) clearTimeout(transitionHideTimerRef.current);
        transitionHideTimerRef.current = setTimeout(() => {
          transitionHideTimerRef.current = null;
        }, 1500);
      } else {
        // Song finished
        setIsPlaying(false);
        recordRound();
        setPhase('song-results');
        // Clear all turn signals
        sendCompanionTurnSignal(null, null, null, false);
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments, blinkLeadTime, sendCompanionTurnSignal, recordRound]);

  // ── Start game (countdown → playing) ──
  const startGame = async () => {
    // Guard: ensure lyrics are available before starting
    const songToCheck = notesSource || effectiveSong;
    if (!songToCheck?.lyrics || songToCheck.lyrics.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[CPTM] No lyrics loaded, attempting reload...');
      try {
        const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
        if (!effectiveSong) return;
        const songWithLyrics = await getSongByIdWithLyrics(effectiveSong.id);
        if (songWithLyrics?.lyrics?.length) {
          fallbackLyricsRef.current = songWithLyrics.lyrics;
          forceRender();
        }
      } catch { /* non-critical */ }
    }

    setPhase('countdown');
    setCountdown(3);

    // No microphone needed for CPtM — pitch comes from companion apps

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          countdownIntervalRef.current = null;
          setPhase('playing');
          setIsPlaying(true);
          setCurrentTime(0);

          // Send "YOUR TURN" to the first player's companion
          const firstPlayer = playersRef.current[currentPlayerIndexRef.current];
          if (firstPlayer) {
            sendCompanionTurnSignal(firstPlayer.id, null, null, true);
          }

          requestAnimationFrame(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
              if (videoRef.current && videoRef.current !== audioRef.current && videoRef.current.paused) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            } else if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
            } else {
              // Media element not ready yet — retry shortly
              // eslint-disable-next-line no-console
              console.warn('[CPTM] No media element available at game start, retrying...');
              countdownRetryRef.current = setTimeout(() => {
                countdownRetryRef.current = null;
                if (unmountGuardRef.current) return;
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch(() => {});
                } else if (videoRef.current) {
                  videoRef.current.currentTime = 0;
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
    const targetScreen = sel === 'random' ? 'cptm-next-random'
      : sel === 'vote' ? 'song-voting'
      : sel === 'medley' ? 'cptm-next-medley'
      : 'library';
    setTimeout(() => onNavigate?.(targetScreen), 0);
  }, [cptmSongSelection, setCptmPlayers, setCptmSong, setCptmSegments, setGameMode, onNavigate, setIsSongPlaying, sendCompanionTurnSignal]);

  // ── End series ──
  const handleEndSeries = useCallback(() => {
    setPhase('series-results');
  }, []);

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
  }, [setCptmPlayers, setCptmSong, setCptmSegments, setCptmSettings, setCptmSeriesHistory, setIsSongPlaying, resetGame, onNavigate, sendCompanionTurnSignal]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (blinkCountdownRef.current) clearInterval(blinkCountdownRef.current);
      if (companionPollRef.current) clearInterval(companionPollRef.current);
      if (companionAbortRef.current) companionAbortRef.current.abort();
    };
  }, []);

  // ── Toggle pause/resume ──
  const togglePause = useCallback(() => {
    if (isPlaying) {
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      setIsPlaying(false);
      setIsSongPlaying(false);
      lastIsSongPlayingRef.current = false;
    } else if (phase === 'playing') {
      setIsPlaying(true);
      if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => {});
      if (videoRef.current && videoRef.current.paused) videoRef.current.play().catch(() => {});
    }
  }, [isPlaying, phase, audioRef, videoRef, setIsSongPlaying]);

  // ── Handle ending the song early ──
  const handleEndSong = useCallback(() => {
    setIsPlaying(false);
    recordRound();
    setPhase('song-results');
    sendCompanionTurnSignal(null, null, null, false);
  }, [recordRound, sendCompanionTurnSignal]);

  // ── Shared handler for audio/video end ──
  const handleMediaEnded = useCallback(() => {
    if (phase === 'playing') {
      setIsPlaying(false);
      recordRound();
      setPhase('song-results');
      sendCompanionTurnSignal(null, null, null, false);
    }
  }, [phase, recordRound, sendCompanionTurnSignal]);

  // ── Return ──
  return {
    // Phase
    phase,
    countdown,

    // Media
    effectiveSong,
    mediaLoaded,
    audioRef,
    videoRef,
    isPlaying,
    currentTime,

    // Game state
    currentPlayerIndex,
    currentPlayer,
    players: playersRef.current,

    // Note data
    allNotes,
    sortedLines,
    scoringMeta,
    visibleNotes,
    displayDuration,

    // Settings
    showBackgroundVideo,
    useAnimatedBackground,
    noteDisplayStyle,
    noteShapeStyle,
    safeSettings,

    // Series
    cptmSeriesHistory,
    currentSegmentIndex,

    // Callbacks
    startGame,
    togglePause,
    handleEndSong,
    handleMediaEnded,
    handleContinue,
    handleEndSeries,
    handleEndSeriesComplete,
    onEndGame: _onEndGame,
  };
}
