'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MusicIcon } from '@/components/icons';

interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

interface MobileSongsViewProps {
  songs: MobileSong[];
  songSearch: string;
  songsLoading: boolean;
  onSearchChange: (search: string) => void;
  onAddToQueue: (song: MobileSong) => void;
}

/**
 * Songs browser view for mobile companion app
 * Shows searchable list of songs with add to queue functionality
 */
export function MobileSongsView({
  songs,
  songSearch,
  songsLoading,
  onSearchChange,
  onAddToQueue,
}: MobileSongsViewProps) {
  // Filter songs by search
  const filteredSongs = React.useMemo(() => {
    if (!songSearch) return songs;
    const query = songSearch.toLowerCase();
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query)
    );
  }, [songs, songSearch]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4">
      {/* Search */}
      <div className="relative mb-4">
        <Input
          id="song-search-modal"
          name="song-search-modal"
          value={songSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search songs..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
        />
      </div>

      {/* Song List */}
      {songsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          {filteredSongs.map((song) => (
            <div
              key={song.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              {/* Cover */}
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                {song.coverImage ? (
                  <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MusicIcon className="w-6 h-6 text-white/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-white/40 truncate">{song.artist}</p>
              </div>

              {/* Duration */}
              <span className="text-xs text-white/30">{formatDuration(song.duration)}</span>

              {/* Add to Queue Button */}
              <Button
                size="sm"
                onClick={() => onAddToQueue(song)}
                className="bg-cyan-500 hover:bg-cyan-400 text-white px-3"
              >
                +
              </Button>
            </div>
          ))}

          {filteredSongs.length === 0 && (
            <div className="text-center py-12 text-white/40">No songs found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default MobileSongsView;
