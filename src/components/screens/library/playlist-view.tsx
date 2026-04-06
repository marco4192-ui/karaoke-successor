'use client';

import React from 'react';
import { Song } from '@/types/game';
import { Playlist, getPlaylistSongs } from '@/lib/playlist-manager';
import { SongCard } from './song-card';
import { safeConfirm } from '@/lib/safe-dialog';
import { SongCardProps } from './types';
import { MusicIcon, TrashIcon, QueueIcon, PlayIcon } from './icons';
import { Button } from '@/components/ui/button';

interface PlaylistViewProps {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  loadedSongs: Song[];
  onPlaylistSelect: (playlist: Playlist | null) => void;
  onPlaylistDelete: (playlistId: string) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onSongClick: (song: Song) => void;
  onShowCreatePlaylist: () => void;
  songCardProps: Omit<SongCardProps, 'song'>;
  activeProfileId: string | null;
  playerQueueCount: number;
  addToQueue: (song: Song, playerId: string, playerName: string) => void;
  activeProfileName: string;
}

export function PlaylistView({
  playlists,
  selectedPlaylist,
  loadedSongs,
  onPlaylistSelect,
  onPlaylistDelete,
  onRemoveSongFromPlaylist,
  onShowCreatePlaylist,
  songCardProps,
  activeProfileId,
  playerQueueCount,
  addToQueue,
  activeProfileName,
}: PlaylistViewProps) {
  return (
    <div className="space-y-6">
      {/* Back button if viewing playlist songs */}
      {selectedPlaylist && (
        <button
          onClick={() => onPlaylistSelect(null)}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Playlists
        </button>
      )}
      
      {!selectedPlaylist ? (
        // Show all playlists
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {playlists.length} Playlist{playlists.length !== 1 ? 's' : ''}
            </h2>
            <Button
              onClick={onShowCreatePlaylist}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Playlist
            </Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {playlists.map((playlist) => {
              const playlistSongs = getPlaylistSongs(playlist.id, loadedSongs);
              return (
                <button
                  key={playlist.id}
                  onClick={() => onPlaylistSelect(playlist)}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-left group relative"
                >
                  {/* System playlist badge */}
                  {playlist.isSystem && (
                    <div className="absolute top-2 right-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                      System
                    </div>
                  )}
                  
                  {/* Cover Image */}
                  <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center">
                    {playlistSongs.length > 0 && playlistSongs[0].coverImage ? (
                      <img src={playlistSongs[0].coverImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MusicIcon className="w-12 h-12 text-white/30" />
                    )}
                  </div>
                  
                  {/* Playlist Name */}
                  <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                  <p className="text-xs text-white/40">{playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}</p>
                  
                  {/* Delete button for non-system playlists */}
                  {!playlist.isSystem && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (safeConfirm(`Delete "${playlist.name}"?`)) {
                          onPlaylistDelete(playlist.id);
                        }
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                      title="Delete playlist"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        // Show songs in selected playlist
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
              {selectedPlaylist.description && (
                <p className="text-white/60 text-sm">{selectedPlaylist.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                  songs.forEach(song => {
                    if (activeProfileId && playerQueueCount < 3) {
                      addToQueue(song, activeProfileId, activeProfileName);
                    }
                  });
                }}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                disabled={!activeProfileId}
              >
                <QueueIcon className="w-4 h-4 mr-2" />
                Add to Queue
              </Button>
              <Button
                onClick={() => {
                  const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                  if (songs.length > 0) {
                    localStorage.setItem('jukebox-playlist', JSON.stringify(songs.map(s => s.id)));
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                Play in Jukebox
              </Button>
            </div>
          </div>
          
          {getPlaylistSongs(selectedPlaylist.id, loadedSongs).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60">This playlist is empty</p>
              <p className="text-white/40 text-sm mt-2">Add songs from the library</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {getPlaylistSongs(selectedPlaylist.id, loadedSongs).map((song) => (
                <div key={song.id} className="relative group">
                  <SongCard 
                    song={song}
                    {...songCardProps}
                  />
                  {/* Remove from playlist button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSongFromPlaylist(selectedPlaylist.id, song.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10"
                    title="Remove from playlist"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
