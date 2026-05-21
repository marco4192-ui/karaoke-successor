'use client';

import { Song } from '@/types/game';
import { Badge } from '@/components/ui/badge';
import { SongCardProps } from './types';
import { MusicIcon, PlayIcon } from '@/components/icons';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { WaveformBar } from './waveform-bar';
import { useTranslation } from '@/lib/i18n/translations';

function hasVideo(song: SongCardProps['song']): boolean {
  return !!(song.videoBackground || song.videoUrl || song.youtubeUrl || song.relativeVideoPath);
}

export function SongCard({ 
  song, 
  previewSong,
  previewAudio,
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs,
  isViralHit,
  viralChartInfo,
}: SongCardProps) {
  const { t } = useTranslation();
  const isPreviewing = previewSong?.id === song.id;
  const songHasVideo = hasVideo(song);

  // Pick the best chart entry (lowest position = highest ranked)
  const bestChart = viralChartInfo?.length
    ? viralChartInfo.reduce((best, entry) => (!best || entry.chartPosition < best.chartPosition ? entry : best), viralChartInfo[0])
    : null;

  const effectiveSong = isPreviewing && previewSong ? previewSong : song;
  const showBackgroundDuringPreview = isPreviewing && !songHasVideo && !!effectiveSong.backgroundImage;

  return (
    <div 
      className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
      onClick={() => onSongClick(song)}
      onMouseEnter={() => onPreviewStart(song)}
      onMouseLeave={onPreviewStop}
    >
      <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
        {effectiveSong.backgroundImage && (
          <img 
            src={effectiveSong.backgroundImage} 
            alt="" 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              showBackgroundDuringPreview ? 'opacity-100' : 'opacity-0'
            }`} 
          />
        )}
        
        {effectiveSong.coverImage && (
          <img 
            src={effectiveSong.coverImage} 
            alt={effectiveSong.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing && songHasVideo ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {(song.videoBackground || song.videoUrl || song.relativeVideoPath) && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={effectiveSong.videoUrl || effectiveSong.videoBackground || undefined}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isPreviewing ? 'opacity-100' : 'opacity-0'
            }`}
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                const previewStartSec = effectiveSong.previewStart
                  ? effectiveSong.previewStart
                  : effectiveSong.preview?.startTime
                    ? effectiveSong.preview.startTime / 1000
                    : 0;
                if (previewStartSec > 0 && video.duration >= previewStartSec) {
                  video.currentTime = previewStartSec;
                }
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {song.youtubeUrl && isPreviewing && (() => {
          const ytId = extractYouTubeId(song.youtubeUrl);
          if (!ytId) return null;
          return (
            <div className="absolute inset-0 w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&start=${Math.floor(effectiveSong.previewStart || (effectiveSong.preview?.startTime || 0) / 1000)}`}
                className="w-full h-full object-cover pointer-events-none"
                style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          );
        })()}
        
        {!effectiveSong.coverImage && !effectiveSong.backgroundImage && !songHasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          isPreviewing && songHasVideo ? 'opacity-0' : 
          isPreviewing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {isViralHit && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse" title={bestChart ? `${bestChart.source} — ${bestChart.playlistName}` : undefined}>
              <span className="text-sm">&#128293;</span>{bestChart ? `#${bestChart.chartPosition}` : t('songCard.viral')}
            </div>
          )}
          {(song.hasEmbeddedAudio || songHasVideo) && (
            <Badge className="bg-purple-500/80 text-xs">{t('songCard.video')}</Badge>
          )}
        </div>
        
        <WaveformBar audio={previewAudio || null} isActive={isPreviewing && !!previewAudio} />

        <div className="absolute bottom-2 right-2">
          <Badge className="bg-white/90 text-black text-xs font-bold">
            {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
          </Badge>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
        <p className="text-xs text-white/60 truncate">{song.artist}</p>
      </div>
    </div>
  );
}
