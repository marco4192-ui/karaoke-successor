'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { DailymotionPlayer } from '@/components/game/dailymotion-player';
import { VimeoPlayer } from '@/components/game/vimeo-player';
import { RutubePlayer } from '@/components/game/rutube-player';
import { VKPlayer } from '@/components/game/vk-player';
import { BilibiliPlayer } from '@/components/game/bilibili-player';
import { NiconicoPlayer } from '@/components/game/niconico-player';
import { MANUAL_START_PLATFORMS, type VideoPlatform } from '@/lib/url-utils';
import { useTranslation } from '@/lib/i18n/translations';
import type { Song } from '@/types/game';
import type { UseJukeboxReturn } from '../jukebox-types';
import { getSongPlatformVideo, isVideoBreak } from '../video-break';

// ==================== PLATFORM VIDEO DISPATCH ====================

/** How long (ms) to wait for playback signs of life (time ticks) before the
 *  generic start-assist button appears (autoplay blocked / stalled player). */
const START_ASSIST_DELAY_MS = 8000;
/** How long the bilibili start-assist stays visible from mount — bilibili has
 *  no API, so playback can never be detected and the button cannot react. */
const BILIBILI_ASSIST_WINDOW_MS = 20000;
/** No activity at all (no ready/tick/ad/error/duration) for this long while the
 *  jukebox wants playback → dead player (blocked script, black-screen hang) →
 *  auto-skip to the next queue item so the jukebox keeps running. */
const DEAD_PLAYER_TIMEOUT_MS = 25000;

/**
 * Renders the correct streaming-platform player for a song with a platform
 * video URL — for video breaks (link queue) AND karaoke songs with #VIDEO.
 *
 * - Video break: video + SOUND (the link is the audio source).
 * - Karaoke song with separate #MP3: video muted, audio via <audio> (fixes
 *   the former double-audio issue for YouTube songs in the jukebox).
 *
 * JUKEBOX AUTO-START (vs. the karaoke game's manual gates):
 * - Bilibili/Niconico get autoStart (autoplay=1 embed + play-command retries).
 * - All players can be REMOUNTED via restartKey right after a start-assist
 *   click: autoplay is reliably allowed immediately after a fresh user
 *   gesture, so ONE in-app click replaces the old "press play in-frame AND
 *   confirm the gate" double interaction.
 * - A dead-player watchdog auto-skips when NOTHING ever happens (formerly the
 *   infinite black screen the app never noticed).
 */
export function JukeboxPlatformVideo({
  j,
  song,
  platformVideo,
}: {
  j: UseJukeboxReturn;
  song: Song;
  platformVideo: { platform: NonNullable<VideoPlatform>; url: string };
}) {
  const { t } = useTranslation();
  const { platform, url } = platformVideo;
  const videoGap = song.videoGap || 0;
  const startTime = song.start || 0;

  // Karaoke songs with a separate audio track keep their audio master (MP3);
  // the platform video stays muted in that case.
  const hasSeparateAudio = !!song.audioUrl && !song.hasEmbeddedAudio;
  const effectiveMuted = hasSeparateAudio || j.isMuted || j.volume === 0;
  const playerIsPlaying = j.isPlaying && !j.platformPaused;

  // Jukebox auto-start platforms (the game keeps its manual-gate flow):
  // Bilibili — autoplay=1, clock runs with playback, no gate.
  // Niconico — autoplay=1 + play-command retries + manual-gate fallback.
  const platformAutoStart = platform === 'bilibili' || platform === 'nicovideo';

  // Manual start gate (niconico API-dead / auto-start fallback). Bilibili no
  // longer needs it in the jukebox (autoStart). Reset happens via the
  // key-based remount in SongDisplay (url change).
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [gateRequired, setGateRequired] = useState(
    (MANUAL_START_PLATFORMS as readonly string[]).includes(platform) && !platformAutoStart,
  );

  // ── Start assist: ONE button for all start problems ──
  // A click confirms a pending manual gate AND remounts the player with
  // autoplay right after the fresh user gesture (browsers reliably allow
  // autoplay then). See the render block at the bottom.
  const [restartKey, setRestartKey] = useState(0);
  const [ticksSeen, setTicksSeen] = useState(false);
  const [assistDue, setAssistDue] = useState(false); // generic: 8 s without any time tick
  const [bilibiliAssist, setBilibiliAssist] = useState(false); // bilibili: 20 s from mount
  const mountedAtRef = useRef(0); // set in the re-arm effect (impure-init-free)
  const activityRef = useRef({ ready: false, tick: false, ad: false, error: false, duration: false });

  // (Re-)arm the assist/bookkeeping per player instance. Song URL changes
  // remount the whole component (SongDisplay key); restartKey bumps remount
  // only the player element below.
  useEffect(() => {
    setTicksSeen(false);
    setAssistDue(false);
    setBilibiliAssist(platform === 'bilibili');
    mountedAtRef.current = Date.now();
    activityRef.current = { ready: false, tick: false, ad: false, error: false, duration: false };
    if (platform !== 'bilibili') return;
    const hide = setTimeout(() => setBilibiliAssist(false), BILIBILI_ASSIST_WINDOW_MS);
    return () => clearTimeout(hide);
  }, [platform, url, restartKey, song.id]);

  // Generic assist timer: fires after 8 s — the render decides whether it
  // applies (no ticks yet, playback wanted, no ad running).
  useEffect(() => {
    const to = setTimeout(() => setAssistDue(true), START_ASSIST_DELAY_MS);
    return () => clearTimeout(to);
  }, [platform, url, restartKey, song.id]);

  const gatePending = gateRequired && !gateConfirmed;
  const showStartAssist = gatePending || (playerIsPlaying && (
    bilibiliAssist
    || (assistDue && !ticksSeen && !j.isAdPlaying)
  ));

  const handleStartAssist = () => {
    setGateConfirmed(true);      // releases a pending manual gate (niconico)
    setBilibiliAssist(false);    // handled — close the 20 s window
    setRestartKey(k => k + 1);   // remount with autoplay + fresh user gesture
  };

  // Auto-skip broken videos: a jukebox must keep running — after a player
  // error (embed-disabled, deleted, geo-blocked…) advance to the next item.
  // jRef/songIdRef keep the LATEST state so a stale timeout never skips a song
  // the user selected in the meantime.
  const jRef = useRef(j);
  jRef.current = j;
  const songIdRef = useRef(song.id);
  songIdRef.current = song.id;
  const skipScheduledRef = useRef(false);
  const handleError = useCallback(() => {
    if (skipScheduledRef.current) return;
    skipScheduledRef.current = true;
    setTimeout(() => {
      skipScheduledRef.current = false;
      if (jRef.current.currentSong?.id === songIdRef.current) {
        jRef.current.playNext();
      }
    }, 3500);
  }, []);

  // Dead-player watchdog: while the jukebox wants playback and NOTHING ever
  // happened (no ready/tick/ad/error/duration — e.g. a blocked API script or
  // an iframe that never loaded), auto-skip instead of hanging on a black
  // screen forever. Suppressed while a gate is pending or the start-assist
  // button is visible (user-actionable states).
  const liveRef = useRef({ gatePending: false, assistVisible: false, playing: false });
  // Synced after each render (not during) — the watchdog reads it with a
  // one-commit delay, which is irrelevant at a 5 s polling cadence.
  useEffect(() => {
    liveRef.current = { gatePending, assistVisible: showStartAssist, playing: playerIsPlaying };
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const live = liveRef.current;
      if (!live.playing || live.gatePending || live.assistVisible) return;
      const a = activityRef.current;
      if (a.ready || a.tick || a.ad || a.error || a.duration) return;
      if (Date.now() - mountedAtRef.current < DEAD_PLAYER_TIMEOUT_MS) return;
      // eslint-disable-next-line no-console
      console.warn('[Jukebox] Platform player showed no signs of life — skipping to next item');
      handleError();
    }, 5000);
    return () => clearInterval(iv);
  }, [handleError]);

  // Only video breaks take the player-reported duration (karaoke songs use
  // their TXT duration — the platform video may be longer than the song).
  const handleDuration = useCallback((seconds: number) => {
    if (isVideoBreak(song)) j.setDuration(seconds);
  }, [j, song]);

  const commonProps = {
    videoGap,
    onReady: () => { activityRef.current.ready = true; },
    onTimeUpdate: (time: number) => {
      if (time > 0 && !activityRef.current.tick) {
        activityRef.current.tick = true;
        setTicksSeen(true); // playback is flowing — hide the start assist
      }
      j.setYoutubeTime(time);
    },
    onEnded: j.handleMediaEnd,
    onAdStart: () => { activityRef.current.ad = true; j.setIsAdPlaying(true); },
    onAdEnd: () => j.setIsAdPlaying(false),
    isPlaying: playerIsPlaying,
    startTime,
  };

  let player: React.ReactNode = null;
  // Jukebox volume (0..1) — forwarded to every player whose platform API
  // supports programmatic volume. Bilibili embeds have NO playback API, so
  // the slider cannot reach them (the UI shows a hint for that case).
  const volumeProp = j.volume;
  if (platform === 'youtube') {
    const videoId = extractYouTubeId(url) || '';
    player = (
      <YouTubePlayer
        key={restartKey}
        videoId={videoId}
        {...commonProps}
        muted={effectiveMuted}
        volume={volumeProp}
        onDuration={(seconds) => { activityRef.current.duration = true; handleDuration(seconds); }}
        interactive={j.isAdPlaying}
        onError={handleError}
      />
    );
  } else if (platform === 'rutube') {
    player = <RutubePlayer key={restartKey} videoUrl={url} {...commonProps} muted={effectiveMuted} volume={volumeProp} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'vk') {
    player = <VKPlayer key={restartKey} videoUrl={url} {...commonProps} muted={effectiveMuted} volume={volumeProp} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'dailymotion') {
    player = <DailymotionPlayer key={restartKey} videoUrl={url} {...commonProps} muted={effectiveMuted} volume={volumeProp} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'vimeo') {
    player = <VimeoPlayer key={restartKey} videoUrl={url} {...commonProps} muted={effectiveMuted} volume={volumeProp} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'bilibili') {
    player = (
      <BilibiliPlayer
        key={restartKey}
        videoUrl={url}
        {...commonProps}
        autoStart
        manualStartConfirmed={gateConfirmed}
        onError={handleError}
      />
    );
  } else if (platform === 'nicovideo') {
    player = (
      <NiconicoPlayer
        key={restartKey}
        videoUrl={url}
        {...commonProps}
        autoStart
        volume={volumeProp}
        manualStartConfirmed={gateConfirmed}
        onManualGateRequired={() => setGateRequired(true)}
        onDuration={(seconds) => { activityRef.current.duration = true; handleDuration(seconds); }}
        onError={handleError}
      />
    );
  }

  return (
    <>
      {player}
      {/* Start assist — ONE click solves every start problem: it confirms a
          pending manual gate (niconico) and remounts the player with autoplay
          immediately after this fresh user gesture, which browsers reliably
          allow. Covers: bilibili autoplay blocked, niconico autoplay blocked,
          YouTube autoplay blocked, stalled embeds. */}
      {showStartAssist && (
        <div className="absolute inset-x-0 top-14 z-20 flex justify-center px-4 pointer-events-none">
          <button
            onClick={handleStartAssist}
            title={t('jukeboxPlayer.startVideoHint')}
            className="pointer-events-auto px-4 py-2.5 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-white text-sm font-semibold shadow-[0_0_25px_rgba(34,211,238,0.5)] border border-cyan-300/50 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
          >
            <span aria-hidden>▶️</span>
            {t('jukeboxPlayer.startVideo')}
          </button>
        </div>
      )}
    </>
  );
}
