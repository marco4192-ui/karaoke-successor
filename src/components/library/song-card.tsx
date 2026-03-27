'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Song } from '@/types/game';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { MusicIcon, PlayIcon } from '@/components/icons';

/**
 * SongCard - Card component for displaying a song in the library grid
 * Shows cover image, video preview on hover, and basic song info
 */

interface SongCardProps {
  song: Song;
  previewSong: Song | null;
  onSongClick: (song: Song) => void;
  onPreviewStart: (song: Song) => void;
  onPreviewStop: () => void;
  previewVideoRefs: React.MutableRefObject<Map<string, HTMLVideoElement>>;
}

export function SongCard({ 
  song, 
  previewSong, 
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs 
}: SongCardProps) {
  return (
    <div 
      className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer group"
      onClick={() => onSongClick(song)}
      onMouseEnter={() => onPreviewStart(song)}
      onMouseLeave={onPreviewStop}
    >
      {/* Cover Image / Video Preview */}
      <div className="relative aspect-square bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden">
        {song.coverImage && (
          <img 
            src={song.coverImage} 
            alt={song.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {song.videoBackground && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={song.videoBackground}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id ? 'opacity-100' : 'opacity-0'
            }`}
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            loop
            playsInline
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {song.youtubeUrl && previewSong?.id === song.id && (
          <div className="absolute inset-0 w-full h-full">
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(song.youtubeUrl)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(song.youtubeUrl)}&controls=0&showinfo=0&rel=0&modestbranding=1&start=${Math.floor((song.preview?.startTime || 0) / 1000)}`}
              className="w-full h-full object-cover pointer-events-none"
              style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        )}
        
        {!song.coverImage && !song.videoBackground && !song.youtubeUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          previewSong?.id === song.id && (song.videoBackground || song.youtubeUrl) ? 'opacity-0' : 
          previewSong?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        
        <div className="absolute top-2 right-2 flex gap-1">
          {song.hasEmbeddedAudio && (
            <Badge className="bg-purple-500/80 text-xs">Video</Badge>
          )}
        </div>
        
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/60 text-xs">
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

export type { SongCardProps };
