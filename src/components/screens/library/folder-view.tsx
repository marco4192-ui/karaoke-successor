'use client';

import { Song } from '@/types/game';
import { LibraryGroupBy } from './types';
import { getSortedFolderKeys } from './utils';
import { FolderIcon, MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import { LANGUAGE_FLAGS } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';

interface FolderViewProps {
  groupedSongs: Map<string, Song[]>;
  groupBy: LibraryGroupBy;
  onOpenFolder: (_folder: string) => void;
  getGroupDisplayName: (_key: string) => string;
}

/** Map common genre names to descriptive emojis */
const GENRE_ICONS: Record<string, string> = {
  'pop': '🎤',
  'rock': '🎸',
  'hip-hop': '🎧',
  'hip hop': '🎧',
  'rap': '🎙️',
  'r&b': '🎷',
  'soul': '💜',
  'country': '🤠',
  'electronic': '🎛️',
  'edm': '🎛️',
  'dance': '💃',
  'house': '🔊',
  'techno': '⚡',
  'trance': '🌀',
  'jazz': '🎺',
  'blues': '🎵',
  'classical': '🎻',
  'opera': '🎭',
  'latin': '🌴',
  'reggaeton': '🔥',
  'reggae': '🟢',
  'k-pop': '🌟',
  'metal': '🤘',
  'punk': '⚡',
  'folk': '🪕',
  'indie': '🕶️',
  'alternative': '🌈',
  'ballad': '💕',
  'soundtrack': '🎬',
  'schlager': '🎪',
  'deutschpop': '🇩🇪',
  'deutschrock': '🇩🇪',
  'children': '🧸',
  'christmas': '🎄',
  'disco': '🪩',
  'funk': ' groovin',
  'gospel': '⛪',
  'musical': '🎭',
  'oldies': '📻',
  'swing': '🎷',
  'anime': '🇯🇵',
};

function getGenreIcon(genre: string): string {
  const key = genre.toLowerCase();
  return GENRE_ICONS[key] || '🎶';
}

function getLanguageFlag(langCode: string): string {
  return LANGUAGE_FLAGS[langCode as Language] || '🌍';
}

export function FolderView({
  groupedSongs,
  groupBy,
  onOpenFolder,
  getGroupDisplayName,
}: FolderViewProps) {
  const { t } = useTranslation();
  const isLetterGroup = groupBy === 'artist' || groupBy === 'title';
  const isLanguageGroup = groupBy === 'language';
  const isGenreGroup = groupBy === 'genre';

  return (
    <div className="pr-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 pb-4">
      {getSortedFolderKeys(groupedSongs, groupBy).map((folderKey) => {
        const songs = groupedSongs.get(folderKey) || [];
        const folderDisplayName = getGroupDisplayName(folderKey);

        // Determine icon visual based on groupBy type
        const renderIcon = () => {
          if (isLetterGroup) {
            // Large artistic letter for A-Z grouping
            return (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center mb-3 group-hover:from-cyan-500/50 group-hover:to-blue-600/50 transition-all">
                <span className="text-2xl font-black bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  {folderKey}
                </span>
              </div>
            );
          }

          if (isLanguageGroup) {
            // National flag for language grouping
            const flag = getLanguageFlag(folderKey);
            return (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 flex items-center justify-center mb-3 group-hover:from-emerald-500/30 group-hover:to-teal-600/30 transition-all">
                <span className="text-3xl">{flag}</span>
              </div>
            );
          }

          if (isGenreGroup) {
            // Descriptive emoji for genre grouping
            const icon = getGenreIcon(folderKey);
            return (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center mb-3 group-hover:from-purple-500/30 group-hover:to-pink-600/30 transition-all">
                <span className="text-3xl">{icon}</span>
              </div>
            );
          }

          // Default: folder icon for 'folder' grouping
          return (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
              <FolderIcon className="w-6 h-6 text-yellow-400" />
            </div>
          );
        };

        return (
          <button
            key={folderKey}
            onClick={() => onOpenFolder(folderKey)}
            className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
          >
            {renderIcon()}
            <h3 className="font-semibold text-white truncate">{folderDisplayName}</h3>
            <p className="text-xs text-white/40">{songs.length} {songs.length !== 1 ? t('folderView.songs') : t('folderView.song')}</p>
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
    </div>
  );
}
