/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Video playback manager supporting three sources — local files,
 * YouTube URLs, and direct URLs. Wraps HTMLVideoElement and YouTube IFrame API
 * with a unified play/pause/seek/volume interface. Handles YouTube API loading
 * and player creation dynamically.
 *
 * Currently, the app uses separate approaches:
 * - useYouTubeGame hook manages YouTube playback via the youtube-player.tsx component
 * - use-game-media.ts handles local video files through HTMLVideoElement directly
 * - GameBackground.tsx component manages video backgrounds
 *
 * This class provides a cleaner unified interface that could consolidate the
 * current fragmented video handling. The YouTube integration with IFrame API
 * is more robust than the current approach.
 *
 * Consider: Useful as a unified video backend if video background support is
 * expanded or if the YouTube integration needs to be more robust.
 */

// Video Player Manager - Handles video backgrounds for songs
import type { YTPlayer, YTStatic } from '@/types/youtube';

export class VideoPlayerManager {
  private videoElement: HTMLVideoElement | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private volume = 1.0;
  private isMuted = false;
  private playbackRate = 1.0;

  // Callbacks
  private onTimeUpdateCallback: ((time: number) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;
  private onLoadedCallback: (() => void) | null = null;

  // Video source types
  private sourceType: 'file' | 'youtube' | 'url' = 'url';
  private youtubePlayer: YTPlayer | null = null;
  private youtubeId: string | null = null;

  async initialize(container: HTMLElement): Promise<void> {
    // Create video element
    this.videoElement = document.createElement('video');
    this.videoElement.className = 'absolute inset-0 w-full h-full object-cover';
    this.videoElement.playsInline = true;
    this.videoElement.muted = true; // Video is muted, audio plays separately
    
    // Set up event listeners
    this.videoElement.ontimeupdate = () => {
      this.currentTime = this.videoElement?.currentTime || 0;
      this.onTimeUpdateCallback?.(this.currentTime * 1000);
    };
    
    this.videoElement.onended = () => {
      this.isPlaying = false;
      this.onEndedCallback?.();
    };
    
    this.videoElement.onloadedmetadata = () => {
      this.duration = (this.videoElement?.duration || 0) * 1000;
      this.onLoadedCallback?.();
    };
    
    container.appendChild(this.videoElement);
  }

  async loadVideo(source: string, type: 'file' | 'youtube' | 'url' = 'url'): Promise<void> {
    this.sourceType = type;
    
    if (type === 'youtube') {
      await this.loadYouTubeVideo(source);
    } else {
      await this.loadDirectVideo(source);
    }
  }

  private async loadDirectVideo(url: string): Promise<void> {
    if (!this.videoElement) return;
    
    this.videoElement.src = url;
    this.videoElement.load();
  }

  private async loadYouTubeVideo(url: string): Promise<void> {
    // Extract YouTube ID from URL
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    this.youtubeId = match ? match[1] : null;
    
    if (!this.youtubeId) {
      console.error('Invalid YouTube URL');
      return;
    }
    
    // Load YouTube IFrame API
    if (typeof window !== 'undefined' && typeof window.YT === 'undefined') {
      await this.loadYouTubeAPI();
    }
    
    // Create YouTube player
    const container = document.createElement('div');
    container.id = 'youtube-player';
    this.videoElement?.parentElement?.appendChild(container);
    
    this.youtubePlayer = new window.YT.Player('youtube-player', {
      videoId: this.youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => {
          this.duration = this.youtubePlayer?.getDuration() || 0;
          this.onLoadedCallback?.();
        },
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.onEndedCallback?.();
          }
        },
      },
    });
  }

  private loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady = () => {
        resolve();
      };
    });
  }

  play(): void {
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.playVideo();
    } else if (this.videoElement) {
      this.videoElement.play();
    }
    this.isPlaying = true;
  }

  pause(): void {
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.pauseVideo();
    } else if (this.videoElement) {
      this.videoElement.pause();
    }
    this.isPlaying = false;
  }

  stop(): void {
    this.pause();
    this.seek(0);
  }

  seek(time: number): void {
    const seconds = time / 1000;
    
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.seekTo(seconds, true);
    } else if (this.videoElement) {
      this.videoElement.currentTime = seconds;
    }
    
    this.currentTime = time;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.videoElement) {
      this.videoElement.volume = this.volume;
    }
    // Note: YouTube volume is handled separately via audio element
  }

  mute(): void {
    this.isMuted = true;
    if (this.videoElement) {
      this.videoElement.muted = true;
    }
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.mute();
    }
  }

  unmute(): void {
    this.isMuted = false;
    if (this.videoElement) {
      this.videoElement.muted = false;
    }
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.unMute();
    }
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.25, Math.min(2, rate));
    if (this.videoElement) {
      this.videoElement.playbackRate = this.playbackRate;
    }
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      this.youtubePlayer.setPlaybackRate(this.playbackRate);
    }
  }

  getCurrentTime(): number {
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      return (this.youtubePlayer.getCurrentTime() || 0) * 1000;
    }
    return this.currentTime;
  }

  getDuration(): number {
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      return (this.youtubePlayer.getDuration() || 0) * 1000;
    }
    return this.duration;
  }

  getIsPlaying(): boolean {
    if (this.sourceType === 'youtube' && this.youtubePlayer) {
      return this.youtubePlayer.getPlayerState() === window.YT.PlayerState.PLAYING;
    }
    return this.isPlaying;
  }

  onTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdateCallback = callback;
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  onLoaded(callback: () => void): void {
    this.onLoadedCallback = callback;
  }

  destroy(): void {
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.src = '';
      this.videoElement.remove();
      this.videoElement = null;
    }
    if (this.youtubePlayer) {
      this.youtubePlayer.destroy();
      this.youtubePlayer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement = null;
    }
  }
}
