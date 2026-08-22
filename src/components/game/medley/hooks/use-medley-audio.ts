import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import type { Note, LyricLine, Song } from '@/types/game';
import type { MedleySong, MedleyGamePhase, VoiceModifier } from '../medley-types';
import { VOICE_MODIFIERS } from '../medley-types';

// ===================== PARAMS =====================

export interface UseMedleyAudioParams {
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  phase: MedleyGamePhase;
  phaseRef: React.MutableRefObject<MedleyGamePhase>;
  isPlaying: boolean;
  activeModifier: VoiceModifier;
  pauseDialogAction: string | null;
  currentTimeMs: number;
}

// ===================== RETURN =====================

export interface UseMedleyAudioReturn {
  // Refs
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Separate video ref for audio fallback — NOT shared with GameBackground */
  fallbackVideoRef: React.RefObject<HTMLVideoElement | null>;
  // Shared refs (read by game loop / fallback timer in main hook)
  scoringMetaRef: React.MutableRefObject<ReturnType<typeof calculateScoringMetadata> | null>;
  /** Beat duration (ms) used for the current snippet's scoring metadata. */
  beatDurationRef: React.MutableRefObject<number>;
  effectiveSnippetRef: React.MutableRefObject<{ startTime: number; endTime: number } | null>;
  isPausedRef: React.MutableRefObject<boolean>;
  fallbackTimerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  lastPlayPhaseRef: React.MutableRefObject<string>;
  isPreparingRef: React.MutableRefObject<boolean>;
  // State
  audioUrl: string | null;
  audioError: string | null;
  restoredSong: Song | null;
  mediaReady: boolean;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];
  // Actions
  cancelFallbackTimer: () => void;
}

// ===================== HOOK =====================

/**
 * Audio & media management for the Medley game.
 *
 * Owns all audio/video refs, loading logic, playback effects,
 * pause/resume sync, and modifier playback-rate application.
 */
export function useMedleyAudio({
  currentSnippet,
  currentSnippetIdx,
  phase,
  phaseRef,
  isPlaying,
  activeModifier,
  pauseDialogAction,
  currentTimeMs,
}: UseMedleyAudioParams): UseMedleyAudioReturn {
  const { t } = useTranslation();

  // ── Audio / Video ──
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Separate ref for video-as-audio fallback — NOT shared with GameBackground
  // which would overwrite videoRef.current with its own visual <video> element.
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [restoredSong, setRestoredSong] = useState<Song | null>(null);
  // Track whether audio media is loaded and ready to play (set by prepare effect)
  const mediaReadyRef = useRef(false);
  // State mirror so the play effect re-fires when media becomes ready
  const [mediaReady, setMediaReady] = useState(false);
  // Flag: play was requested but audio wasn't ready yet (set by play trigger, consumed by canplay handler)
  const playWhenReadyRef = useRef(false);
  // Flag: prepare effect is actively loading audio/lyrics — suppress stall fallback
  const isPreparingRef = useRef(false);
  // Ref to the fallback timer so the game loop can cancel it when audio starts
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Effective snippet range (may differ from currentSnippet after repositioning)
  const effectiveSnippetRef = useRef<{ startTime: number; endTime: number } | null>(null);

  // ── Ref to track the currently playing media (audio or fallback video)
  // so we can cancel the fallback timer when real media starts.
  const playingMediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  // ── Pause ref (shared with game loop to freeze time during pause) ──
  const isPausedRef = useRef(false);
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      isPausedRef.current = true;
      return;
    }
    isPausedRef.current = false;
  }, [pauseDialogAction]);

  // ── Snippet notes (for lyrics display) ──
  const [snippetNotes, setSnippetNotes] = useState<Note[]>([]);
  const [snippetLyrics, setSnippetLyrics] = useState<LyricLine[]>([]);

  // ── Scoring metadata ──
  const scoringMetaRef = useRef<ReturnType<typeof calculateScoringMetadata> | null>(null);
  const beatDurationRef = useRef(500);

  // De-dup key for the play effect
  const lastPlayPhaseRef = useRef<string>('');

  // ── Helper: cancel fallback timer ──
  const cancelFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  // ── Pause / Resume sync ──
  // Only reacts to explicit pause dialog toggles (user clicks pause/resume).
  // Does NOT interfere with the centralized "play on phase" effect.
  // Uses mediaReadyRef to avoid calling pause()/play() on an unloaded element.
  const wasPausedByDialogRef = useRef(false);
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      wasPausedByDialogRef.current = true;
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (fallbackVideoRef.current && !fallbackVideoRef.current.paused) fallbackVideoRef.current.pause();
    } else if (pauseDialogAction === null && wasPausedByDialogRef.current) {
      wasPausedByDialogRef.current = false;
      // Only resume if we were the ones who paused (not the play-on-phase effect)
      if (phase !== 'playing') return;
      if (audioRef.current && mediaReadyRef.current && currentSnippet) {
        // eslint-disable-next-line no-console
        console.log('[Medley] Resuming playback after user pause');
        audioRef.current.currentTime = (currentSnippet.startTime + currentTimeMs) / 1000;
        audioRef.current.play().catch(() => {});
      } else if (fallbackVideoRef.current && fallbackVideoRef.current.paused && fallbackVideoRef.current.readyState >= 2 && currentSnippet) {
        fallbackVideoRef.current.currentTime = (currentSnippet.startTime + currentTimeMs) / 1000;
        fallbackVideoRef.current.play().catch(() => {});
      }
    }
  }, [pauseDialogAction, phase, currentSnippet, currentTimeMs]);

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
      setMediaReady(false);
      isPreparingRef.current = true;

      try {
        const prepared = await ensureSongUrls(currentSnippet.song);
        if (cancelled) return;

        // Safety net: load lyrics if not present (same as PTM medley setup).
        // In Tauri, lyrics are stored separately in IndexedDB / .txt files.
        let preparedWithLyrics = prepared;
        if (!preparedWithLyrics.lyrics || preparedWithLyrics.lyrics.length === 0) {
          try {
            const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
            const lyrics = await loadSongLyrics(preparedWithLyrics);
            if (lyrics.length > 0) {
              preparedWithLyrics = { ...preparedWithLyrics, lyrics };
            }
          } catch { /* non-critical */ }
        }

        // Store fully restored song for GameBackground usage
        setRestoredSong(preparedWithLyrics);

        // Determine effective snippet range — may need repositioning if lyrics
        // were empty when generateMedleySnippets ran (it fell back to 10s).
        // Now that lyrics are loaded, check overlap and reposition if needed.
        let snippetStart = currentSnippet.startTime;
        let snippetEnd = currentSnippet.endTime;
        if (preparedWithLyrics.lyrics && preparedWithLyrics.lyrics.length > 0) {
          const hasOverlap = preparedWithLyrics.lyrics.some(line =>
            line.notes.some(n =>
              n.startTime < snippetEnd && (n.startTime + n.duration) > snippetStart,
            ),
          );
          if (!hasOverlap) {
            // Reposition snippet to where the lyrics actually are
            const allNotes = preparedWithLyrics.lyrics.flatMap(l => l.notes);
            if (allNotes.length > 0) {
              const snippetMs = currentSnippet.duration;
              const firstNote = allNotes[0].startTime;
              const lastNote = allNotes[allNotes.length - 1].startTime;
              const noteRangeEnd = lastNote + 5000;
              const maxStart = Math.max(firstNote, noteRangeEnd - snippetMs);
              let bestStart = firstNote;
              let bestCount = 0;
              for (let t = Math.max(firstNote, 10000); t <= maxStart; t += 2000) {
                const count = allNotes.filter(n => n.startTime >= t && n.startTime <= t + snippetMs).length;
                if (count > bestCount) { bestCount = count; bestStart = t; }
              }
              snippetStart = bestStart;
              snippetEnd = Math.min(bestStart + snippetMs, preparedWithLyrics.duration);
              // eslint-disable-next-line no-console
              console.log(`[Medley] Repositioned snippet from ${currentSnippet.startTime}-${currentSnippet.endTime} to ${snippetStart}-${snippetEnd}ms (lyrics had no overlap)`);
            }
          }
        }
        effectiveSnippetRef.current = { startTime: snippetStart, endTime: snippetEnd };

        // Extract notes within effective snippet range
        const notes: Note[] = [];
        const lyrics: LyricLine[] = [];
        if (preparedWithLyrics.lyrics && preparedWithLyrics.lyrics.length > 0) {
          for (const line of preparedWithLyrics.lyrics) {
            const lineNotes = line.notes.filter(
              n => n.startTime < snippetEnd && (n.startTime + n.duration) > snippetStart,
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
          beatDurationRef.current = beatDuration;
          scoringMetaRef.current = calculateScoringMetadata(notes, beatDuration);
        } else {
          scoringMetaRef.current = null;
        }

        // eslint-disable-next-line no-console
        console.log(`[Medley] Prepared snippet: notes=${notes.length}, lyrics=${lyrics.length}, audioUrl=${prepared.audioUrl ? 'yes' : 'no'}, range=${snippetStart}-${snippetEnd}ms`);

        // Load audio (or video-as-audio fallback) directly here.
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
            setMediaReady(true);
            // eslint-disable-next-line no-console
            console.log('[Medley] Audio media ready');
            // If play was already requested (phase is playing), play now
            if (playWhenReadyRef.current && phaseRef.current === 'playing') {
              audio.currentTime = snippetStart / 1000;
              audio.play().catch(e => {
                // eslint-disable-next-line no-console
                console.warn('[Medley] Delayed play after load failed:', e);
              });
              playWhenReadyRef.current = false;
            }
          }
        } else if (prepared.videoBackground) {
          // No separate audio file — use video element as audio source
          // eslint-disable-next-line no-console
          console.log('[Medley] No audioUrl, using video as audio fallback');
          const video = fallbackVideoRef.current;
          if (video) {
            // Ensure video src is set
            if (!video.src || video.src !== prepared.videoBackground) {
              video.src = prepared.videoBackground;
            }
            await new Promise<void>((resolve) => {
              if (cancelled) { resolve(); return; }
              if (video.readyState >= 3) { resolve(); return; }
              const onReady = () => {
                video.removeEventListener('canplay', onReady);
                video.removeEventListener('error', onError);
                resolve();
              };
              const onError = () => {
                video.removeEventListener('canplay', onReady);
                video.removeEventListener('error', onError);
                resolve();
              };
              video.addEventListener('canplay', onReady);
              video.addEventListener('error', onError);
              video.load();
            });
            if (cancelled) return;
            mediaReadyRef.current = true;
            setMediaReady(true);
            // eslint-disable-next-line no-console
            console.log('[Medley] Video fallback media ready');
            // If play was already requested (phase is playing), play now
            if (playWhenReadyRef.current && phaseRef.current === 'playing') {
              video.currentTime = snippetStart / 1000;
              video.play().catch(e => {
                // eslint-disable-next-line no-console
                console.warn('[Medley] Delayed video play after load failed:', e);
              });
              playWhenReadyRef.current = false;
            }
          } else {
            setAudioError(t('medley.noAudioAvailable'));
          }
        } else {
          setAudioError(t('medley.noAudioAvailable'));
        }
      } catch {
        if (!cancelled) setAudioError(t('medley.audioLoadFailed'));
      }
    };

    prepare().finally(() => { if (!cancelled) isPreparingRef.current = false; });
    return () => { cancelled = true; isPreparingRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnippet?.song.id, currentSnippetIdx]);

  // ── Play audio when entering 'playing' phase OR when media becomes ready ──
  // Centralized: ALL initial play attempts go through this effect.
  // Fires on: phase/isPlaying change (user triggered) AND mediaReady change (load completed).
  // Supports both audio element and video element as audio source (fallback).
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSnippet) return;
    // De-duplicate: only play once per (snippet, phase, mediaReady) combination
    const dedupKey = `${currentSnippetIdx}-${phase}-${mediaReady}`;
    if (lastPlayPhaseRef.current === dedupKey) return;
    lastPlayPhaseRef.current = dedupKey;

    // Determine primary media element: audio if ready, else video fallback
    const audio = audioRef.current;
    const fallbackVideo = fallbackVideoRef.current;
    const useVideoAsAudio = !audio?.src && fallbackVideo?.src && fallbackVideo?.readyState >= 2;
    const media = (audio && mediaReadyRef.current) ? audio : (useVideoAsAudio ? fallbackVideo : null);

    if (!media) {
      // Neither audio nor video ready — set flag to play when canplay fires
      playWhenReadyRef.current = true;
      // eslint-disable-next-line no-console
      console.log('[Medley] Play requested but no media ready, will retry after load');
      return;
    }

    if (!media.paused) return; // Already playing

    // Cancel fallback timer — real media is about to play
    cancelFallbackTimer();
    playingMediaRef.current = media;

    // eslint-disable-next-line no-console
    console.log('[Medley] Playing media for snippet', currentSnippetIdx);
    const effectiveStart = effectiveSnippetRef.current?.startTime ?? currentSnippet.startTime;
    media.currentTime = effectiveStart / 1000;
    // Apply active voice modifier playback rate
    const modDef = VOICE_MODIFIERS.find(m => m.id === activeModifier);
    if (modDef) media.playbackRate = modDef.playbackRate;
    media.play().catch(e => {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Play on phase enter failed:', e);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isPlaying, currentSnippetIdx, mediaReady]);

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

  return {
    audioRef,
    videoRef,
    fallbackVideoRef,
    scoringMetaRef,
    beatDurationRef,
    effectiveSnippetRef,
    isPausedRef,
    fallbackTimerRef,
    lastPlayPhaseRef,
    isPreparingRef,
    audioUrl,
    audioError,
    restoredSong,
    mediaReady,
    snippetNotes,
    snippetLyrics,
    cancelFallbackTimer,
  };
}
