'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { PlayIcon, VolumeIcon, VolumeMutedIcon, CheckIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import {
  preloadLibrary,
  getLibraryPreloadStatus,
  subscribeLibraryPreload,
} from '@/lib/game/library-preload';
import { StorageKeys, getString } from '@/lib/storage';

/** Intro animation (AFTER10 KARAOKE neon clock loop, 1920x1080, ~5.2 s). */
const SPLASH_VIDEO = '/splash/infinity-clock.mp4';
/** Title-screen music ("Under the Glare", 2:54) — loops until Start. */
const SPLASH_MUSIC = '/splash/under-the-glare.mp3';
/** Splash music volume when no master-volume preference is stored. */
const DEFAULT_VOLUME = 0.7;

interface SplashScreenProps {
  /** Called after the fade-out finished — the app behind becomes interactive. */
  onEnter: () => void;
}

/**
 * R86: Animated title screen for app launches.
 * R87: The user-supplied GIF was replaced by a higher-resolution H.264 video
 * ("Infinity clock loop", 1920x1080) that carries the AFTER10 KARAOKE neon
 * wordmark itself. The video file is served WITHOUT any audio track (stripped
 * at conversion) and played muted — its background sounds can never play;
 * the only sound is the looping MP3 title music.
 *
 * The R87 library preload now starts THE MOMENT the opener appears: the
 * splash triggers the shared preloadLibrary() coordinator (deduplicated
 * with the app's R84 boot warm-up — one single IndexedDB/cover-restore run)
 * and surfaces its progress as a chip above the Start button: spinner
 * "Musikbibliothek wird geladen…" → checkmark "Musikbibliothek bereit".
 * Clicking Start reveals a fully warmed-up app.
 *
 * Audio/autoplay: browsers and Tauri webviews may block sound without a
 * user gesture. We attempt autoplay on mount; if it is rejected, the first
 * pointer/key interaction anywhere resumes playback. The muted video itself
 * always autoplays (muted + playsInline is policy-safe). The master-volume
 * preference (settings) is respected when present.
 *
 * The splash shows on every cold start of the main route — like a game's
 * attract screen. The companion route (/mobile) never shows it.
 */
export function SplashScreen({ onEnter }: SplashScreenProps) {
  const { t } = useTranslation();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Ref mirrors of state used inside window listeners (stale-closure guard). */
  const mutedRef = useRef(false);
  const leavingRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // ── R87: shared music-library preload — trigger + observe ──
  // preloadLibrary() is deduplicated: the app boot (useAppEffects) joins the
  // exact same in-flight promise instead of racing a second IndexedDB run.
  const libraryStatus = useSyncExternalStore(
    subscribeLibraryPreload,
    getLibraryPreloadStatus,
    () => 'idle' as const,
  );

  useEffect(() => {
    preloadLibrary().catch(() => { /* coordinator already warns */ });
  }, []);

  // ── Video: enforce muted (autoplay policy) + belt-and-suspenders play ──
  // The file itself has no audio track; muted is additionally set via ref
  // because React does not reliably serialize the muted DOM attribute.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => { /* gradient backdrop stays — non-critical */ });
  }, []);

  // ── Music: loop + autoplay-with-gesture-fallback ──
  useEffect(() => {
    const stored = parseFloat(getString(StorageKeys.MASTER_VOLUME, ''));
    const volume = Number.isFinite(stored) && stored > 0 ? Math.min(1, stored) : DEFAULT_VOLUME;

    const audio = new Audio(SPLASH_MUSIC);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    /** Resume-on-gesture handler (installed only when autoplay was blocked). */
    let resume: (() => void) | null = null;

    audio.play().then(() => {
      setAudioStarted(true);
    }).catch(() => {
      // Autoplay blocked — the first interaction (click/keypress) starts
      // the music. Not an error: the Start button click itself is a
      // gesture, so the very first user action always brings sound back.
      resume = () => {
        window.removeEventListener('pointerdown', resume!);
        window.removeEventListener('keydown', resume!);
        if (leavingRef.current || mutedRef.current) return;
        audio.play().then(() => setAudioStarted(true)).catch(() => {/* stay silent */});
      };
      window.addEventListener('pointerdown', resume);
      window.addEventListener('keydown', resume);
    });

    return () => {
      if (resume) {
        window.removeEventListener('pointerdown', resume);
        window.removeEventListener('keydown', resume);
      }
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // ── Enter the app: fade visual + music out, then hand over ──
  const enter = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    setLeaving(true);

    const audio = audioRef.current;
    if (audio) {
      const startVolume = audio.volume;
      const t0 = performance.now();
      const fadeMs = 650;
      const step = () => {
        if (!audioRef.current) return; // unmounted mid-fade
        const k = Math.min(1, (performance.now() - t0) / fadeMs);
        audioRef.current.volume = Math.max(0, startVolume * (1 - k));
        if (k < 1) {
          requestAnimationFrame(step);
        } else {
          audioRef.current.pause();
        }
      };
      requestAnimationFrame(step);
    }

    // Match the CSS fade (700 ms) — hand over to the app right when the
    // splash is fully transparent.
    window.setTimeout(onEnter, 720);
  }, [onEnter]);

  // ── Keyboard: Enter / Space / Escape start the app ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        enter();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enter]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const audio = audioRef.current;
    if (audio) {
      audio.muted = next;
      // Un-muting before any successful play() would do nothing — try to
      // start playback so the toggle is immediately audible.
      if (!next && audio.paused && !leavingRef.current) {
        audio.play().then(() => setAudioStarted(true)).catch(() => {/* still gesture-blocked */});
      }
    }
  }, []);

  return (
    <div
      data-testid="splash-screen"
      role="dialog"
      aria-modal="true"
      aria-label={t('core.branding')}
      className={`fixed inset-0 z-[200] overflow-hidden transition-opacity duration-700 ${
        leaving ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        // Deep-night backdrop that blends with the video's dark navy edges
        // and shows while the first frames decode.
        background:
          'radial-gradient(ellipse at center, #0a1226 0%, #05070f 55%, #02030a 100%)',
      }}
    >
      {/* Full-bleed neon clock loop (1920x1080, audio track stripped at
          conversion + muted + playsInline → the video's own background
          sounds can never play; only the title music is audible).
          Landscape: object-cover for a full-bleed stage look (only the
          video's dark vignette gets cropped). Portrait (phones): object-
          contain so the embedded AFTER10 KARAOKE wordmark is never cut —
          the letterbox bars blend into the dark radial backdrop. */}
      <video
        ref={videoRef}
        src={SPLASH_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onCanPlay={() => setVideoReady(true)}
        className={`absolute inset-0 w-full h-full object-contain landscape:object-cover select-none transition-opacity duration-1000 ${
          videoReady ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Bottom gradient so the Start button stays legible over the video */}
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {/* Music toggle (top right) */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? t('splash.soundOn') : t('splash.soundOff')}
        title={muted ? t('splash.soundOn') : t('splash.soundOff')}
        data-testid="splash-mute"
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 transition-colors"
      >
        {muted ? <VolumeMutedIcon className="w-5 h-5" /> : <VolumeIcon className="w-5 h-5" />}
      </button>

      {/* Track credit (bottom left) */}
      <p className="absolute bottom-3 left-4 z-10 text-[11px] text-white/40 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        {t('splash.trackCredit')}
      </p>

      {/* Keyboard hint (bottom right) */}
      <p className="absolute bottom-3 right-4 z-10 text-[11px] text-white/35 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] hidden sm:block">
        {t('splash.hint')}
      </p>

      {/* Bottom center: library warm-up chip + Start button */}
      <div className="absolute inset-x-0 bottom-8 sm:bottom-12 z-10 flex flex-col items-center gap-3 px-4">
        {/* R87 library preload status — non-critical, hidden on error */}
        {(libraryStatus === 'loading' || libraryStatus === 'ready') && (
          <div
            data-testid="splash-library-status"
            data-state={libraryStatus}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full
                       bg-black/45 border border-white/10 backdrop-blur-sm
                       text-[12px] text-white/70 pointer-events-none
                       [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]"
          >
            {libraryStatus === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                <span>{t('splash.libraryLoading')}</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('splash.libraryReady')}</span>
              </>
            )}
          </div>
        )}

        {/* Start button */}
        <button
          type="button"
          onClick={enter}
          autoFocus
          data-testid="splash-start"
          className="flex items-center gap-3 px-10 py-4 rounded-full
                     bg-gradient-to-r from-purple-500 to-cyan-500
                     hover:from-purple-400 hover:to-cyan-400
                     text-white text-lg font-bold tracking-wide
                     shadow-[0_0_35px_rgba(34,211,238,0.45)] hover:shadow-[0_0_50px_rgba(34,211,238,0.65)]
                     transition-all duration-300 hover:scale-105 active:scale-95
                     animate-pulse"
        >
          <PlayIcon className="w-6 h-6" />
          {t('splash.start')}
        </button>
      </div>

      {/* Screen-reader context: what this overlay is */}
      <span className="sr-only">{t('splash.srOverlay')}</span>

      {/* Silent-autoplay badge: subtle hint when the browser blocked sound */}
      {!audioStarted && !muted && !leaving && (
        <p
          data-testid="splash-audio-blocked"
          className="absolute top-5 left-1/2 -translate-x-1/2 z-10 text-[11px] text-white/50 bg-black/40 border border-white/10 rounded-full px-3 py-1"
        >
          {t('splash.audioBlockedHint')}
        </p>
      )}
    </div>
  );
}
