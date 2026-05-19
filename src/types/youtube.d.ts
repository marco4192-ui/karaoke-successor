// YouTube IFrame API Type Declarations

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(_seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(_volume: number): void;
  getVolume(): number;
  setPlaybackRate(_rate: number): void;
  getPlaybackRate(): number;
  destroy(): void;
  getVideoData(): { video_id: string; title: string; author: string };
}

interface YTPlayerAPI {
  Player: new (
    _id: string | HTMLElement,
    _options?: {
      videoId?: string;
      playerVars?: {
        autoplay?: number;
        controls?: number;
        disablekb?: number;
        fs?: number;
        modestbranding?: number;
        rel?: number;
        showinfo?: number;
        start?: number;
        origin?: string;
        playsinline?: number;
        iv_load_policy?: number;
      };
      events?: {
        onReady?: (event: { target: YTPlayer }) => void;
        onStateChange?: (event: { data: number; target: YTPlayer }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT: YTPlayerAPI;
    onYouTubeIframeAPIReady: () => void;
  }

  const YT: YTPlayerAPI | undefined;
}

export {};
