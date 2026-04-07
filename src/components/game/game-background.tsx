'use client';

import React from 'react';
import type { Song } from '@/types/game';
import { YouTubePlayer } from '@/components/game/youtube-player';
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
  isPlaying: boolean;
  isAdPlaying: boolean;
  songEnergy: number;
  volume: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  // Callbacks
  onYoutubeTimeUpdate: (time: number) => void;
  onAdStart: () => void;
  onAdEnd: () => void;
  onVideoEnded: () => void;
  onVideoCanPlay: () => void;
  onYoutubeError: (errorCode: number) => void;
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

  // YouTube video (visible + audio)
  if (showBackgroundVideo && isYouTube && youtubeVideoId) {
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
        onError={onYoutubeError}
      />
    );
  }

  // Hidden YouTube (audio only — video disabled but using YouTube audio)
  if (!showBackgroundVideo && isYouTube && youtubeVideoId && useYouTubeAudio) {
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
          onError={onYoutubeError}
        />
      </div>
    );
  }

  // Local video file — separate audio (video muted, audio plays separately)
  if (showBackgroundVideo && effectiveSong?.videoBackground && !effectiveSong?.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-bg-${effectiveSong?.id}`}
        ref={videoRef}
        src={effectiveSong.videoBackground}
        className="absolute inset-0 w-full h-full object-cover"
        muted={true}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onVideoEnded}
      />
    );
  }

  // Video with embedded audio — visible AND plays audio
  if (showBackgroundVideo && effectiveSong?.videoBackground && effectiveSong?.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-embedded-${effectiveSong?.id}`}
        ref={videoRef}
        src={effectiveSong.videoBackground}
        className="absolute inset-0 w-full h-full object-cover"
        muted={false}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onVideoEnded}
        onCanPlay={onVideoCanPlay}
      />
    );
  }

  // Background image from #BACKGROUND: or #COVER: tag
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
