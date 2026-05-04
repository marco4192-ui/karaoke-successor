// YouTube IFrame API Type Declarations

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(_secondsseconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setVolume(_volumevolume: number): void;
  getVolume(): number;
  setPlaybackRate(_raterate: number): void;
  getPlaybackRate(): number;
  destroy(): void;
  getVideoData(): { video_id: string; title: string; author: string };
}

export interface YTPlayerOptions {
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
}

export interface YTStatic {
  Player: new (_idid: string | HTMLElement, _optionsoptions: YTPlayerOptions) => YTPlayer;
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
    YT: YTStatic;
    onYouTubeIframeAPIReady: () => void;
  }
  
  const YT: YTStatic | undefined;
}

export {};
