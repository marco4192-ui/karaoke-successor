'use client';

import { useRef } from 'react';
import { useJukebox } from './jukebox/use-jukebox';
import { JukeboxSetupView } from './jukebox/jukebox-setup-view';
import { JukeboxPlayerView } from './jukebox/jukebox-player-view';

export function JukeboxScreen() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const j = useJukebox({ containerRef, videoRef, audioRef });

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 ${
        j.isFullscreen ? 'fixed inset-0 z-50 bg-black flex' : ''
      }`}
    >
      {j.isPlaying && j.currentSong ? (
        <JukeboxPlayerView j={j} videoRef={videoRef} audioRef={audioRef} />
      ) : (
        <JukeboxSetupView j={j} />
      )}
    </div>
  );
}
