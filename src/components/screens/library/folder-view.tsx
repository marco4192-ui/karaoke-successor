'use client';

import React from 'react';
import { Song } from '@/types/game';
import { SongCard } from './song-card';
import { SongCardProps, LibraryGroupBy } from './types';
import { getSortedFolderKeys } from './utils';
import { FolderIcon, MusicIcon } from './icons';

interface FolderViewProps {
  groupedSongs: Map<string, Song[]>;
  groupBy: LibraryGroupBy;
  onOpenFolder: (folder: string) => void;
  getGroupDisplayName: (key: string) => string;
}

export function FolderView({
  groupedSongs,
  groupBy,
  onOpenFolder,
  getGroupDisplayName,
}: FolderViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
      {getSortedFolderKeys(groupedSongs, groupBy).map((folderKey) => {
        const songs = groupedSongs.get(folderKey) || [];
        const folderDisplayName = getGroupDisplayName(folderKey);
        
        return (
          <button
            key={folderKey}
            onClick={() => onOpenFolder(folderKey)}
            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
              <FolderIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="font-semibold text-white truncate">{folderDisplayName}</h3>
            <p className="text-xs text-white/40">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
            <div className="flex -space-x-2 mt-3">
              {songs.slice(0, 4).map((song, i) => (
                <div 
                  key={song.id}
                  className="w-8 h-8 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 border-2 border-gray-900 overflow-hidden"
                  style={{ zIndex: 4 - i }}
                >
                  {song.coverImage ? (
                    <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicIcon className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                </div>
              ))}
              {songs.length > 4 && (
                <div className="w-8 h-8 rounded bg-black/50 border-2 border-gray-900 flex items-center justify-center text-xs text-white/60">
                  +{songs.length - 4}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
