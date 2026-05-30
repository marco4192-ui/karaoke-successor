'use client';

import { Button } from '@/components/ui/button';
import { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
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
  const { t } = useTranslation();

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
        <h2 className="text-2xl font-bold mb-2">{t('passTheMic.playingTitle')}</h2>
        <p className="text-white/60 mb-8">
          {isMedleyMode
            ? t('passTheMic.medleyLabel').replace('{n}', String(medleySnippetCount))
            : `${audioSong?.title ?? ''} — ${audioSong?.artist ?? ''}`}
        </p>

        <div className="bg-[#00F3B2]/10 border-[3px] border-black rounded-xl max-w-md w-full mb-6 p-8 text-center" style={{ boxShadow: '5px 5px 0px #00F3B2' }}>
          <div className="text-sm text-white/60 mb-2">{t('passTheMic.startPlayer')}</div>
          <div className="flex items-center justify-center gap-4 mb-4">
            {currentPlayer?.avatar ? (
              <img
                src={currentPlayer.avatar}
                alt={currentPlayer.name}
                className="w-20 h-20 rounded-full object-cover border-[3px] border-black" style={{ boxShadow: '4px 4px 0px #00F3B2' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold border-[3px] border-black text-white" style={{ boxShadow: '4px 4px 0px #00F3B2', backgroundColor: currentPlayer?.color }}
              >
                {currentPlayer?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-3xl font-bold">{currentPlayer?.name}</span>
          </div>
          <div className="text-sm text-white/40">
            {playersCount} {t('passTheMic.players')}
            {isMedleyMode
              ? ` - ${t('passTheMic.snippets').replace('{n}', String(medleySnippetCount))}`
              : ''}
            {safeSettings.sharedMicName && (
              <span> - 🎤 {safeSettings.sharedMicName}</span>
            )}
            {seriesHistory.length > 0 && (
              <span> - {t('passTheMic.round').replace('{n}', String(seriesHistory.length + 1))}</span>
            )}
          </div>
        </div>

        {!mediaLoaded && (
          <div className="mb-4 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-[#00F3B2] border-t-transparent rounded-full" />
            <p className="text-white/40 text-sm mt-2">{t('passTheMic.loadingSong')}</p>
          </div>
        )}
        <Button
          onClick={startGame}
          disabled={!mediaLoaded}
          className="px-12 py-4 text-xl bg-[#00F3B2] hover:bg-[#00F3B2]/80 text-black font-bold border-[3px] border-black disabled:opacity-50" style={{ boxShadow: '4px 4px 0px #000000' }}
          data-testid="ptm-start-button"
        >
          {t('passTheMic.startSinging')}
        </Button>
      </div>
    </div>
  );
}
