'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Video/animated background component for the game screen.
 * Supports local video files, YouTube videos, and gradient animations as
 * backgrounds behind the note highway and lyrics.
 *
 * Currently, game backgrounds are handled by GameBackground.tsx which uses
 * a different architecture — it integrates with the store and supports
 * image backgrounds, gradient animations, and webcam backgrounds.
 * YouTube backgrounds use the youtube-background-player.tsx component separately.
 *
 * This component predates the current GameBackground system and was likely
 * replaced during the Round 3/4 refactoring.
 *
 * Consider: The gradient animation feature from this component could be
 * integrated into GameBackground.tsx if animated gradient backgrounds are desired.
 */

import React, { useRef, RefObject } from 'react';
import { Song } from '@/types/game';
import { YouTubePlayer } from './youtube-player';
import { MusicReactiveBackground, AnimatedGradientBackground } from './music-reactive-background';

export interface BackgroundVideoProps {
  song: Song | null;
  isPlaying: boolean;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  useYouTubeAudio: boolean;
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;
  volume: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoLoadedRef: RefObject<boolean>;
  onYoutubeTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onAdStart: () => void;
  onAdEnd: () => void;
  isAdPlaying: boolean;
  startTime?: number;
}

export function BackgroundVideo({
  song,
  isPlaying,
  isYouTube,
  youtubeVideoId,
  useYouTubeAudio,
  showBackgroundVideo,
  useAnimatedBackground,
  volume,
  videoRef,
  videoLoadedRef,
  onYoutubeTimeUpdate,
  onEnded,
  onAdStart,
  onAdEnd,
  isAdPlaying,
  startTime = 0,
}: BackgroundVideoProps) {
  if (!song) return null;

  // YouTube video with visible player
  if (showBackgroundVideo && isYouTube && youtubeVideoId) {
    return (
      <YouTubePlayer
        videoId={youtubeVideoId}
        videoGap={song.videoGap || 0}
        onReady={() => {}}
        onTimeUpdate={onYoutubeTimeUpdate}
        onEnded={onEnded}
        onAdStart={onAdStart}
        onAdEnd={onAdEnd}
        isPlaying={isPlaying}
        startTime={startTime}
        interactive={isAdPlaying}
      />
    );
  }

  // Hidden YouTube for audio only (video disabled but using YouTube audio)
  if (!showBackgroundVideo && isYouTube && youtubeVideoId && useYouTubeAudio) {
    return (
      <div className="hidden">
        <YouTubePlayer
          videoId={youtubeVideoId}
          videoGap={song.videoGap || 0}
          onReady={() => {}}
          onTimeUpdate={onYoutubeTimeUpdate}
          onEnded={onEnded}
          onAdStart={onAdStart}
          onAdEnd={onAdEnd}
          isPlaying={isPlaying}
          startTime={startTime}
        />
      </div>
    );
  }

  // Local video file - separate audio (video muted, audio plays separately)
  if (showBackgroundVideo && song.videoBackground && !song.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-bg-${song.id}`}
        ref={videoRef}
        src={song.videoBackground}
        className="absolute inset-0 w-full h-full object-cover"
        muted={true}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onEnded}
      />
    );
  }

  // Video with embedded audio - visible AND plays audio
  if (showBackgroundVideo && song.videoBackground && song.hasEmbeddedAudio && !isYouTube) {
    return (
      <video
        key={`video-embedded-${song.id}`}
        ref={videoRef}
        src={song.videoBackground}
        className="absolute inset-0 w-full h-full object-cover"
        muted={false}
        playsInline
        autoPlay={false}
        preload="auto"
        onEnded={onEnded}
        onLoadedMetadata={() => {}}
        onCanPlay={() => {
          if (videoLoadedRef.current) {
            videoLoadedRef.current = true;
          }
        }}
      />
    );
  }

  // Background image from #BACKGROUND: or #COVER: tag
  if (showBackgroundVideo && !useAnimatedBackground && (song.backgroundImage || song.coverImage)) {
    return (
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${song.backgroundImage || song.coverImage})`,
        }}
      >
        {/* Dark overlay for better note visibility */}
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  // Music-reactive animated background (default fallback or when enabled)
  if (useAnimatedBackground) {
    return (
      <MusicReactiveBackground
        volume={volume}
        isPlaying={isPlaying}
        bpm={song.bpm}
        intensity={1}
      />
    );
  }

  // Default animated gradient background
  return (
    <AnimatedGradientBackground
      volume={volume}
      isPlaying={isPlaying}
      bpm={song.bpm}
    />
  );
}
