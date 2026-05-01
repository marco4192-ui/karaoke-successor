'use client';

import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import type { PtmPlayer, PassTheMicSettings } from '@/components/game/ptm-types';
import type { PassTheMicRoundResult } from '@/lib/game/party-store';

interface PtmIntroScreenProps {
  currentPlayer: PtmPlayer | undefined;
  isMedleyMode: boolean;
  medleySnippetCount: number;
  safeSettings: PassTheMicSettings;
  seriesHistory: PassTheMicRoundResult[];
  mediaLoaded: boolean;
  startGame: () => void;
  audioSong: Song | undefined;
  isYouTube: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playersCount: number;
}

export function PtmIntroScreen({
  currentPlayer,
  isMedleyMode,
  medleySnippetCount,
  safeSettings,
  seriesHistory,
  mediaLoaded,
  startGame,
  audioSong,
  isYouTube,
  audioRef,
  videoRef,
  playersCount,
}: PtmIntroScreenProps) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden audio/video elements — must be in DOM during intro so refs
          are populated before startGame fires. Without these, audioRef.current
          is null when the countdown reaches zero, causing
          "No media element available at game start". */}
      {audioSong?.audioUrl && (
        <audio
          key={audioSong.id}
          ref={audioRef}
          src={audioSong.audioUrl}
          className="hidden"
          preload="auto"
        />
      )}
      {!audioSong?.audioUrl && audioSong?.videoBackground && !isYouTube && (
        <video
          key={`video-${audioSong.id}`}
          ref={videoRef}
          src={audioSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          preload="auto"
        />
      )}
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-5xl mb-6">🎤</div>
        <h2 className="text-2xl font-bold mb-2">Pass the Mic</h2>
        <p className="text-white/60 mb-8">
          {isMedleyMode
            ? `🎵 Medley — ${medleySnippetCount} Songs`
            : `${audioSong?.title} — ${audioSong?.artist}`}
        </p>

        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl max-w-md w-full mb-6 p-8 text-center">
          <div className="text-sm text-white/60 mb-2">STARTSPIELER</div>
          <div className="flex items-center justify-center gap-4 mb-4">
            {currentPlayer?.avatar ? (
              <img
                src={currentPlayer.avatar}
                alt={currentPlayer.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-cyan-500"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-cyan-500 text-white"
                style={{ backgroundColor: currentPlayer?.color }}
              >
                {currentPlayer?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-3xl font-bold">{currentPlayer?.name}</span>
          </div>
          <div className="text-sm text-white/40">
            {playersCount} Spieler
            {isMedleyMode
              ? ` - ${medleySnippetCount} Snippets`
              : ` - ${safeSettings.segmentDuration}s Segmente`}
            {safeSettings.sharedMicName && (
              <span> - 🎤 {safeSettings.sharedMicName}</span>
            )}
            {seriesHistory.length > 0 && (
              <span> - Runde {seriesHistory.length + 1}</span>
            )}
          </div>
        </div>

        {!mediaLoaded && (
          <div className="mb-4 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <p className="text-white/40 text-sm mt-2">Lied wird geladen...</p>
          </div>
        )}
        <Button
          onClick={startGame}
          disabled={!mediaLoaded}
          className="px-12 py-4 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
        >
          🎤 Singen starten!
        </Button>
      </div>
    </div>
  );
}
