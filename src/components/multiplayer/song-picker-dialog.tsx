'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Song } from '@/types/game';

interface SongPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: Song[];
  selectedSong: Song | null;
  onSelectSong: (song: Song) => void;
}

export function SongPickerDialog({
  open,
  onOpenChange,
  songs,
  selectedSong,
  onSelectSong,
}: SongPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-white/20 max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select a Song</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-2">
            {songs.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                No songs available. Add songs to your library first.
              </div>
            ) : (
              songs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => onSelectSong(song)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    selectedSong?.id === song.id
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {song.coverImage && (
                    <img
                      src={song.coverImage}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 text-left">
                    <div className="font-medium">{song.title}</div>
                    <div className="text-sm text-white/60">{song.artist}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
