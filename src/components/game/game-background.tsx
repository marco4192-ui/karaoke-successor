'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Song } from '@/types/game';
import type { VideoPlatform } from '@/lib/url-utils';
import { YouTubePlayer } from '@/components/game/youtube-player';
import { DailymotionPlayer } from '@/components/game/dailymotion-player';
import { VimeoPlayer } from '@/components/game/vimeo-player';
import { RutubePlayer } from '@/components/game/rutube-player';
import { VKPlayer } from '@/components/game/vk-player';
import { BilibiliPlayer } from '@/components/game/bilibili-player';
import { NiconicoPlayer } from '@/components/game/niconico-player';
import { MusicReactiveBackground } from '@/components/game/music-reactive-background';
import {
  AnimatedBackground as VisualAnimatedBackground,
} from '@/components/game/visual-effects';

export interface GameBackgroundProps {
  effectiveSong: Song | null;
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  useYouTubeAudio: boolean;
  /** Detected streaming platform (YouTube / Dailymotion / Vimeo / Rutube / VK / Bilibili / Niconico). */
  videoPlatform?: VideoPlatform;
  /** Full platform video URL (non-YouTube players consume the raw URL). */
  platformVideoUrl?: string | null;
  /** True when the streaming player (any platform) must provide the audio. */
  usePlatformAudio?: boolean;
  /** True once the user confirmed the manual song-start gate (Bilibili / Niconico fallback). */
  manualStartConfirmed?: boolean;
  /** A player requests the manual gate (Niconico API dead). */
  onManualGateRequired?: () => void;
  isPlaying: boolean;
  isAdPlaying: boolean;
  songEnergy: number;
  volume: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  // Callbacks
  onYoutubeTimeUpdate: (_time: number) => void;
  onAdStart: () => void;
  onAdEnd: () => void;
  onVideoEnded: () => void;
  onVideoCanPlay: () => void;
  onYoutubeError: (_errorCode: number) => void;
}

/**
 * Game background layer component.
 * Handles all background variants: YouTube, local video, background image, animated, music-reactive.
 */
export function GameBackground({
  effectiveSong,
  showBackgroundVideo,
  useAnimatedBackground,
  isYouTube,
  youtubeVideoId,
  useYouTubeAudio,
  videoPlatform,
  platformVideoUrl,
  usePlatformAudio,
  manualStartConfirmed,
  onManualGateRequired,
  isPlaying,
  isAdPlaying,
  songEnergy,
  volume,
  videoRef,
  onYoutubeTimeUpdate,
  onAdStart,
  onAdEnd,
  onVideoEnded,
  onVideoCanPlay,
  onYoutubeError,
}: GameBackgroundProps) {
  const videoGap = effectiveSong?.videoGap || 0;
  // Fallback: try videoBackground, then videoUrl, then youtubeUrl
  const effectiveVideoUrl = effectiveSong?.videoBackground || effectiveSong?.videoUrl || effectiveSong?.youtubeUrl;

  // ── Video error fallback (user req 3.1 + 7) ──
  // A broken video link used to leave a BLACK area behind the notes. When the
  // PRIMARY video source fails (platform player onError OR the local <video>
  // onerror), flip `videoFailed` and skip every video branch — the render then
  // falls through to the #BACKGROUND image, then the cover image, then the
  // animated / music-reactive backgrounds (never a black screen).
  const [videoFailed, setVideoFailed] = useState(false);

  // Reset when the song or its video URL changes (new song / round / custom URL)
  const videoSourceKey = `${effectiveSong?.id ?? 'none'}|${platformVideoUrl ?? ''}|${youtubeVideoId ?? ''}|${effectiveVideoUrl ?? ''}`;
  const prevVideoSourceKeyRef = useRef(videoSourceKey);
  useEffect(() => {
    if (prevVideoSourceKeyRef.current !== videoSourceKey) {
      prevVideoSourceKeyRef.current = videoSourceKey;
      setVideoFailed(false);
    }
  }, [videoSourceKey]);

  const handleVideoError = useCallback((errorCode: number) => {
    // eslint-disable-next-line no-console
    console.warn('[GameBackground] Video source failed — falling back to background/cover image', { platform: videoPlatform, errorCode });
    setVideoFailed(true);
    // Keep the parent's error handling intact (error message UI etc.)
    onYoutubeError?.(errorCode);
  }, [onYoutubeError, videoPlatform]);

  // NOTE on interactive platforms (Bilibili, Niconico): their blocks below
  // intentionally ignore showBackgroundVideo — the user must see and click
  // the player to start the audio, so they render visible even when
  // background videos are disabled.

  // Sync video play/pause with isPlaying prop
  useEffect(() => {
    if (!videoRef?.current) return;
    const video = videoRef.current;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  // DO-NOT-CHANGE: videoRef?.current (not videoRef) ensures this re-fires when the
  // <video> DOM element is recreated (e.g., song/round change). videoRef is a stable
  // ref object whose identity never changes, so depending on it would miss element swaps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, videoRef?.current]);

  // ── Rutube — postMessage Player API; start gate = position gate (no ad events) ──
  if (!videoFailed && showBackgroundVideo && videoPlatform === 'rutube' && platformVideoUrl) {
    return (
      <RutubePlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive={isAdPlaying}
        onError={handleVideoError}
      />
    );
  }

  // ── VK Video — official SDK with OFFICIAL ad events (adStarted/adCompleted) ──
  if (!videoFailed && showBackgroundVideo && videoPlatform === 'vk' && platformVideoUrl) {
    return (
      <VKPlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive={isAdPlaying}
        onError={handleVideoError}
      />
    );
  }

  // ── Bilibili — iframe only, ALWAYS interactive + visible (manual start gate) ──
  // NOTE: rendered even when background videos are disabled — the user MUST
  // see and click the player to start the audio (no programmatic play).
  if (!videoFailed && videoPlatform === 'bilibili' && platformVideoUrl) {
    return (
      <BilibiliPlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive
        manualStartConfirmed={manualStartConfirmed}
        onError={handleVideoError}
      />
    );
  }

  // ── Niconico — unofficial jsapi; ALWAYS interactive (autoplay often gesture-gated);
  // falls back to the manual gate when the API is dead ──
  if (!videoFailed && videoPlatform === 'nicovideo' && platformVideoUrl) {
    return (
      <NiconicoPlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive
        manualStartConfirmed={manualStartConfirmed}
        onManualGateRequired={onManualGateRequired}
        onError={handleVideoError}
      />
    );
  }

  // Hidden Rutube (audio only — SDK-driven playback works while hidden)
  if (!videoFailed && !showBackgroundVideo && videoPlatform === 'rutube' && platformVideoUrl && usePlatformAudio) {
    return (
      <div className="hidden">
        <RutubePlayer
          videoUrl={platformVideoUrl}
          videoGap={videoGap}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onVideoEnded}
          onAdStart={onAdStart}
          onAdEnd={onAdEnd}
          isPlaying={isPlaying}
          startTime={effectiveSong?.start || 0}
          onError={handleVideoError}
        />
      </div>
    );
  }

  // Hidden VK (audio only)
  if (!videoFailed && !showBackgroundVideo && videoPlatform === 'vk' && platformVideoUrl && usePlatformAudio) {
    return (
      <div className="hidden">
        <VKPlayer
          videoUrl={platformVideoUrl}
          videoGap={videoGap}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onVideoEnded}
          onAdStart={onAdStart}
          onAdEnd={onAdEnd}
          isPlaying={isPlaying}
          startTime={effectiveSong?.start || 0}
          onError={handleVideoError}
        />
      </div>
    );
  }

  // ── Dailymotion — official ad events (AD_START/AD_END) drive the game-wait flow ──
  if (!videoFailed && showBackgroundVideo && videoPlatform === 'dailymotion' && platformVideoUrl) {
    return (
      <DailymotionPlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive={isAdPlaying}
        onError={handleVideoError}
      />
    );
  }

  // Hidden Dailymotion (audio only — video disabled but the platform provides the audio)
  if (!videoFailed && !showBackgroundVideo && videoPlatform === 'dailymotion' && platformVideoUrl && usePlatformAudio) {
    return (
      <div className="hidden">
        <DailymotionPlayer
          videoUrl={platformVideoUrl}
          videoGap={videoGap}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onVideoEnded}
          onAdStart={onAdStart}
          onAdEnd={onAdEnd}
          isPlaying={isPlaying}
          startTime={effectiveSong?.start || 0}
          onError={handleVideoError}
        />
      </div>
    );
  }

  // ── Vimeo — ad-free embeds; restrictions surface via the error event ──
  if (!videoFailed && showBackgroundVideo && videoPlatform === 'vimeo' && platformVideoUrl) {
    return (
      <VimeoPlayer
        videoUrl={platformVideoUrl}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive={isAdPlaying}
        onError={handleVideoError}
      />
    );
  }

  // Hidden Vimeo (audio only)
  if (!videoFailed && !showBackgroundVideo && videoPlatform === 'vimeo' && platformVideoUrl && usePlatformAudio) {
    return (
      <div className="hidden">
        <VimeoPlayer
          videoUrl={platformVideoUrl}
          videoGap={videoGap}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onVideoEnded}
          isPlaying={isPlaying}
          startTime={effectiveSong?.start || 0}
          onError={handleVideoError}
        />
      </div>
    );
  }

  // YouTube video (visible + audio)
  if (!videoFailed && showBackgroundVideo && isYouTube && youtubeVideoId) {
    return (
      <YouTubePlayer
        videoId={youtubeVideoId}
        videoGap={videoGap}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onVideoEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={effectiveSong?.start || 0}
        interactive={isAdPlaying}
        onError={handleVideoError}
      />
    );
  }

  // Hidden YouTube (audio only — video disabled but using YouTube audio)
  if (!videoFailed && !showBackgroundVideo && isYouTube && youtubeVideoId && useYouTubeAudio) {
    return (
      <div className="hidden">
        <YouTubePlayer
          videoId={youtubeVideoId}
          videoGap={videoGap}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onVideoEnded}
          onAdStart={onAdStart}
          onAdEnd={onAdEnd}
          isPlaying={isPlaying}
          startTime={effectiveSong?.start || 0}
          onError={handleVideoError}
        />
      </div>
    );
  }

  // Local video file — separate audio (video muted, audio plays separately)
  if (!videoFailed && showBackgroundVideo && effectiveVideoUrl && !effectiveSong?.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-bg-${effectiveSong?.id}`}
        ref={videoRef}
        src={effectiveVideoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        muted={true}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onVideoEnded}
        // Broken video URL/file → image fallback (#BACKGROUND, then cover)
        onError={() => handleVideoError(5)}
      />
    );
  }

  // Video with embedded audio — visible AND plays audio
  if (!videoFailed && showBackgroundVideo && effectiveVideoUrl && effectiveSong?.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-embedded-${effectiveSong?.id}`}
        ref={videoRef}
        src={effectiveVideoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        muted={false}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onVideoEnded}
        onCanPlay={onVideoCanPlay}
        // Broken video URL/file → image fallback (#BACKGROUND, then cover)
        onError={() => handleVideoError(5)}
      />
    );
  }

  // Background image from #BACKGROUND: or #COVER: tag — also the FALLBACK layer
  // when the video source errored (videoFailed skips all video branches above):
  // #BACKGROUND image first, cover image second, animated background after that.
  if (showBackgroundVideo && !useAnimatedBackground && (effectiveSong?.backgroundImage || effectiveSong?.coverImage)) {
    return (
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${effectiveSong?.backgroundImage || effectiveSong?.coverImage})`,
        }}
      >
        {/* Dark overlay for better note visibility */}
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  // Visual effects animated background with disco lights and particles
  if (useAnimatedBackground) {
    return (
      <VisualAnimatedBackground
        hasVideo={false}
        hasBackgroundImage={!!effectiveSong?.backgroundImage || !!effectiveSong?.coverImage}
        backgroundImage={effectiveSong?.backgroundImage || effectiveSong?.coverImage}
        songEnergy={songEnergy}
        isPlaying={isPlaying}
      />
    );
  }

  // Default: Music-reactive animated background
  return (
    <MusicReactiveBackground
      volume={volume}
      isPlaying={isPlaying}
      bpm={effectiveSong?.bpm}
      intensity={1}
    />
  );
}
