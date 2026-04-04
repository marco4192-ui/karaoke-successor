'use client';

import React from 'react';
import { Song } from '@/types/game';
import { Playlist, addSongToPlaylist } from '@/lib/playlist-manager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MusicIcon } from './icons';

interface AddToPlaylistModalProps {
  show: boolean;
  onClose: (open: boolean) => void;
  song: Song | null;
  playlists: Playlist[];
  onSongAdded: () => void;
  onCreateNewPlaylist: () => void;
}

export function AddToPlaylistModal({
  show,
  onClose,
  song,
  playlists,
  onSongAdded,
  onCreateNewPlaylist,
}: AddToPlaylistModalProps) {
  if (!song) return null;

  const handleAdd = (playlistId: string) => {
    addSongToPlaylist(playlistId, song.id);
    onSongAdded();
    onClose(false);
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription className="text-white/60">
            Select a playlist to add &quot;{song.title}&quot; to
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
          {playlists.filter(p => !p.isSystem || p.id !== 'system-favorites' || !p.songIds.includes(song.id)).map((playlist) => {
            const isInPlaylist = playlist.songIds.includes(song.id);
            return (
              <button
                key={playlist.id}
                onClick={() => { if (!isInPlaylist) handleAdd(playlist.id); }}
                disabled={isInPlaylist}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                  isInPlaylist 
                    ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                    : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                }`}
              >
                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center flex-shrink-0">
                  {playlist.isSystem ? (
                    <span className="text-lg">
                      {playlist.id === 'system-favorites' ? '⭐' : 
                       playlist.id === 'system-recently-played' ? '🕐' : '🔥'}
                    </span>
                  ) : (
                    <MusicIcon className="w-5 h-5 text-white/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{playlist.name}</div>
                  <div className="text-xs text-white/40">{playlist.songIds.length} songs</div>
                </div>
                {isInPlaylist && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Added
                  </span>
                )}
              </button>
            );
          })}
          {playlists.length === 0 && (
            <div className="text-center py-8 text-white/60">
              <p>No playlists yet</p>
              <Button 
                onClick={() => {
                  onClose(false);
                  onCreateNewPlaylist();
                }}
                className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Create Your First Playlist
              </Button>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onClose(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onClose(false);
              onCreateNewPlaylist();
            }}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Playlist
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
