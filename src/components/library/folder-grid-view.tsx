'use client';

import React from 'react';
import { Song } from '@/types/game';
import { LibraryGroupBy } from '@/hooks/use-library-settings';
import { getSortedFolderKeys } from '@/lib/library-utils';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import {
  MusicIcon,
  FolderIcon,
} from '@/components/icons';

export interface FolderGridViewProps {
  groupedSongs: Map<string, Song[]>;
  groupBy: LibraryGroupBy;
  onOpenFolder: (folder: string) => void;
}

/**
 * FolderGridView component
 * Displays songs grouped by artist, title, genre, language, or folder.
 */
export function FolderGridView({
  groupedSongs,
  groupBy,
  onOpenFolder,
}: FolderGridViewProps) {
  const getGroupDisplayName = (key: string): string => {
    if (groupBy === 'language') {
      return LANGUAGE_NAMES[key] || key;
    }
    return key;
  };

  const sortedFolderKeys = getSortedFolderKeys(groupedSongs, groupBy);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
      {sortedFolderKeys.map((folderKey) => {
        const songs = groupedSongs.get(folderKey) || [];
        const displayName = getGroupDisplayName(folderKey);
        
        return (
          <button
            key={folderKey}
            onClick={() => onOpenFolder(folderKey)}
            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
          >
            {/* Folder Icon */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
              <FolderIcon className="w-6 h-6 text-yellow-400" />
            </div>
            
            {/* Folder Name */}
            <h3 className="font-semibold text-white truncate">{displayName}</h3>
            <p className="text-xs text-white/40">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
            
            {/* Preview covers */}
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
