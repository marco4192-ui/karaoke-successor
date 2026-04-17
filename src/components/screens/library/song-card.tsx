'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SongCardProps } from './types';
import { MusicIcon, PlayIcon } from './icons';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { WaveformBar } from './waveform-bar';

export function SongCard({ 
  song, 
  previewSong,
  previewAudio,
  onSongClick, 
  onPreviewStart, 
  onPreviewStop, 
  previewVideoRefs,
  isViralHit,
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
        {/* Static Cover Image */}
        {song.coverImage && (
          <img 
            src={song.coverImage} 
            alt={song.title} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id && (song.videoBackground || song.videoUrl || song.youtubeUrl || song.relativeVideoPath) ? 'opacity-0' : 'opacity-100'
            }`} 
          />
        )}
        
        {/* Video Preview - Local Video (also render for relative paths so the ref is available for URL restoration) */}
        {(song.videoBackground || song.videoUrl || song.relativeVideoPath) && (
          <video
            ref={(el) => {
              if (el) {
                previewVideoRefs.current.set(song.id, el);
              } else {
                previewVideoRefs.current.delete(song.id);
              }
            }}
            src={song.videoUrl || song.videoBackground || undefined}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              previewSong?.id === song.id ? 'opacity-100' : 'opacity-0'
            }`}
            // Mute only if there's a separate audio file; unmute for videos with embedded audio
            muted={!song.hasEmbeddedAudio && !!song.audioUrl}
            playsInline
            preload="metadata"
            onLoadedData={(e) => {
              const video = e.currentTarget;
              if (previewSong?.id === song.id) {
                // Respect #PREVIEWSTART for video start time
                const previewStartSec = song.previewStart
                  ? song.previewStart
                  : song.preview?.startTime
                    ? song.preview.startTime / 1000
                    : 0;
                if (previewStartSec > 0 && video.duration >= previewStartSec) {
                  video.currentTime = previewStartSec;
                }
                video.play().catch(() => {});
              }
            }}
          />
        )}
        
        {/* Video Preview - YouTube */}
        {song.youtubeUrl && previewSong?.id === song.id && (() => {
          const ytId = extractYouTubeId(song.youtubeUrl);
          if (!ytId) return null;
          return (
            <div className="absolute inset-0 w-full h-full">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&enablejsapi=1&start=${Math.floor(song.previewStart || (song.preview?.startTime || 0) / 1000)}`}
                className="w-full h-full object-cover pointer-events-none"
                style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          );
        })()}
        
        {/* Fallback Music Icon */}
        {!song.coverImage && !song.videoBackground && !song.videoUrl && !song.youtubeUrl && !song.relativeVideoPath && (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicIcon className="w-16 h-16 text-white/30" />
          </div>
        )}
        
        {/* Play indicator on hover - only show if no video */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
          previewSong?.id === song.id && (song.videoBackground || song.videoUrl || song.youtubeUrl || song.relativeVideoPath) ? 'opacity-0' : 
          previewSong?.id === song.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}>
          <div className="w-14 h-14 rounded-full bg-cyan-500/80 flex items-center justify-center">
            <PlayIcon className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isViralHit && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg animate-pulse">
              <span className="text-sm">&#128293;</span>Viral
            </div>
          )}
          {(song.hasEmbeddedAudio || song.videoBackground || song.videoUrl || song.youtubeUrl || song.relativeVideoPath) && (
            <Badge className="bg-purple-500/80 text-xs">Video</Badge>
          )}
        </div>
        
        {/* D.1: Audio Waveform — real-time frequency visualization during preview */}
        <WaveformBar audio={previewAudio || null} isActive={previewSong?.id === song.id && !!song.audioUrl} />

        {/* Duration */}
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-white/90 text-black text-xs font-bold">
            {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
          </Badge>
        </div>
      </div>
      
      {/* Song Info */}
      <div className="p-3">
        <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
        <p className="text-xs text-white/60 truncate">{song.artist}</p>
      </div>
    </div>
  );
}
