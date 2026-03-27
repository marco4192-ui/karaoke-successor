'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MedleySong } from './use-medley-setup';

interface SongQueueDisplayProps {
  medleySongs: MedleySong[];
  currentSongIndex: number;
  isPlaying: boolean;
}

export function SongQueueDisplay({ medleySongs, currentSongIndex, isPlaying }: SongQueueDisplayProps) {
  return (
    <Card className="bg-white/5 border-white/10 mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Song Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {medleySongs.map((medleySong, index) => (
            <div 
              key={index}
              className={`flex-shrink-0 p-3 rounded-lg min-w-[140px] ${
                index === currentSongIndex 
                  ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500' 
                  : index < currentSongIndex 
                    ? 'bg-white/5 border border-white/10 opacity-50' 
                    : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {medleySong.song.coverImage ? (
                  <img src={medleySong.song.coverImage} alt="" className="w-10 h-10 rounded object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                    🎵
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{medleySong.song.title}</p>
                  <p className="text-xs text-white/40">{Math.floor(medleySong.duration / 1000)}s</p>
                </div>
              </div>
              {index < currentSongIndex && <div className="text-xs text-green-400 mt-1">✓ Done</div>}
              {index === currentSongIndex && isPlaying && <div className="text-xs text-purple-400 mt-1">♪ Now</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
