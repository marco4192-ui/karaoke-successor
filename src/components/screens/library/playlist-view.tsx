'use client';

import { useState } from 'react';
import { Song } from '@/types/game';
import { Playlist, getPlaylistEntries, exportPlaylist, importPlaylist } from '@/lib/playlist-manager';
import { StorageKeys, setJson } from '@/lib/storage';
import { SongCard } from './song-card';
import { VirtualizedSongGrid } from './virtualized-song-grid';
import { safeConfirm } from '@/lib/safe-dialog';
import { SongCardProps } from './types';
import { MusicIcon, TrashIcon, QueueIcon, PlayIcon } from '@/components/icons';
import { PlaylistQueueConfigModal } from './playlist-queue-config-modal';
import { Button } from '@/components/ui/button';
import { EditPlaylistModal } from './edit-playlist-modal';
import { safeAlert } from '@/lib/safe-dialog';
import { useTranslation } from '@/lib/i18n/translations';
import { toast } from '@/hooks/use-toast';

interface PlaylistViewProps {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  loadedSongs: Song[];
  onPlaylistSelect: (_playlist: Playlist | null) => void;
  onPlaylistDelete: (_playlistId: string) => void;
  onRemoveSongFromPlaylist: (_playlistId: string, _songId: string) => void;
  onSongClick: (_song: Song) => void;
  onShowCreatePlaylist: () => void;
  songCardProps: Omit<SongCardProps, 'song'>;
  activeProfileId: string | null;
  addToQueue: (_song: Song, _playerId: string, _playerName: string) => void;
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
}: PlaylistViewProps) {
  const { t } = useTranslation();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Playlist | null>(null);
  const [showQueueConfig, setShowQueueConfig] = useState(false);
  const [queueConfigSongs, setQueueConfigSongs] = useState<Song[]>([]);

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditTarget(playlist);
    setShowEditModal(true);
  };

  /**
   * Resolve a playlist against the live library: returns the AVAILABLE songs
   * (in playlist order) plus the count of entries whose song is currently
   * missing from the library (greyed out in the UI, skipped during playback —
   * they resolve again automatically once the song returns).
   */
  const getResolvedPlaylistSongs = (playlistId: string): { resolved: Song[]; missingCount: number } => {
    const entries = getPlaylistEntries(playlistId, loadedSongs);
    const resolved: Song[] = [];
    let missingCount = 0;
    for (const entry of entries) {
      if (entry.song) resolved.push(entry.song);
      else missingCount++;
    }
    return { resolved, missingCount };
  };

  /** Toast informing the user how many playlist songs were skipped because they are not in the library. */
  const notifySkippedSongs = (missingCount: number) => {
    if (missingCount <= 0) return;
    toast({
      title: t('libraryPlaylist.missingSkippedTitle'),
      description: t('libraryPlaylist.missingSkippedDesc').replace('{n}', String(missingCount)),
    });
  };

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
          {t('libraryPlaylist.backToPlaylists')}
        </button>
      )}
      
      {!selectedPlaylist ? (
        // Show all playlists
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {playlists.length} {playlists.length !== 1 ? t('libraryPlaylist.playlists') : t('libraryPlaylist.playlist')}
            </h2>
            <div className="flex gap-2">
            <Button
              onClick={onShowCreatePlaylist}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('libraryPlaylist.createPlaylist')}
            </Button>
            <Button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const result = importPlaylist(data);
                    if (result) {
                      onPlaylistSelect(null);
                      window.location.reload();
                    } else {
                      safeAlert(t('libraryPlaylist.invalidFormat'));
                    }
                  } catch {
                    safeAlert(t('libraryPlaylist.importFailed'));
                  }
                };
                input.click();
              }}
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('libraryPlaylist.import')}
            </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {playlists.map((playlist) => {
              const { resolved: playlistSongs, missingCount } = getResolvedPlaylistSongs(playlist.id);
              return (
                <button
                  key={playlist.id}
                  onClick={() => onPlaylistSelect(playlist)}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-left group relative"
                >
                  {/* System playlist badge */}
                  {playlist.isSystem && (
                    <div className="absolute top-2 right-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                      {t('libraryPlaylist.system')}
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
                  <p className="text-xs text-white/40">
                    {playlistSongs.length} {playlistSongs.length !== 1 ? t('libraryPlaylist.songs') : t('libraryPlaylist.song')}
                    {missingCount > 0 && (
                      <span className="text-white/30"> · {t('libraryPlaylist.missingCount').replace('{n}', String(missingCount))}</span>
                    )}
                  </p>
                  
                  {/* Edit & Delete buttons for non-system playlists */}
                  {!playlist.isSystem && (
                    <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPlaylist(playlist);
                        }}
                        className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/40 transition-all"
                        title={t('libraryPlaylist.editPlaylist')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (await safeConfirm(t('libraryPlaylist.deleteConfirm').replace('{name}', playlist.name))) {
                            onPlaylistDelete(playlist.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all"
                        title={t('libraryPlaylist.deletePlaylist')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
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
              {/* Export playlist */}
              {!selectedPlaylist.isSystem && (
                <Button
                  onClick={() => {
                    const data = exportPlaylist(selectedPlaylist.id);
                    if (!data) { safeAlert(t('libraryPlaylist.exportFailed')); return; }
                    const json = JSON.stringify(data, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${selectedPlaylist.name.replace(/[^a-zA-Z0-9äöüß]/g, '_')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  variant="outline"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {t('libraryPlaylist.export')}
                </Button>
              )}
              <Button
                onClick={() => {
                  // Only AVAILABLE songs can be queued — songs missing from the
                  // library are skipped (with a toast) and stay greyed out in the
                  // playlist until they return.
                  const { resolved, missingCount } = getResolvedPlaylistSongs(selectedPlaylist.id);
                  notifySkippedSongs(missingCount);
                  setQueueConfigSongs(resolved);
                  setShowQueueConfig(true);
                }}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                disabled={!activeProfileId || getResolvedPlaylistSongs(selectedPlaylist.id).resolved.length === 0}
              >
                <QueueIcon className="w-4 h-4 mr-2" />
                {t('libraryPlaylist.addToQueue')}
              </Button>
              <Button
                onClick={() => {
                  // Jukebox filters by song ID set — store ONLY the resolved IDs so
                  // missing entries are never handed to the jukebox pool.
                  const { resolved, missingCount } = getResolvedPlaylistSongs(selectedPlaylist.id);
                  notifySkippedSongs(missingCount);
                  if (resolved.length > 0) {
                    setJson(StorageKeys.JUKEBOX_PLAYLIST, resolved.map(s => s.id));
                  }
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
              >
                <PlayIcon className="w-4 h-4 mr-2" />
                {t('libraryPlaylist.playInJukebox')}
              </Button>
            </div>
          </div>
          
          {(() => {
            const { resolved: playlistSongs, missingCount } = getResolvedPlaylistSongs(selectedPlaylist.id);
            if (playlistSongs.length === 0 && missingCount === 0) {
              return (
                <div className="text-center py-12">
                  <p className="text-white/60">{t('libraryPlaylist.empty')}</p>
                  <p className="text-white/40 text-sm mt-2">{t('libraryPlaylist.emptyDesc')}</p>
                </div>
              );
            }
            const missingEntries = getPlaylistEntries(selectedPlaylist.id, loadedSongs).filter(e => e.missing);
            return (
              <>
                {playlistSongs.length > 0 && (
                  <VirtualizedSongGrid
                    songs={playlistSongs}
                    songCardProps={songCardProps}
                    renderSongCard={(song) => (
                      <div className="relative group">
                        <SongCard song={song} {...songCardProps} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveSongFromPlaylist(selectedPlaylist.id, song.id);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10"
                          title={t('libraryPlaylist.removeFromPlaylist')}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    )}
                  />
                )}

                {/* Songs that are in the playlist but no longer in the library —
                    greyed out, not clickable/playable, but manually removable.
                    They resolve again automatically once the song returns
                    (stable song IDs across rescans). */}
                {missingCount > 0 && (
                  <div className="mt-4" data-testid="playlist-missing-songs">
                    <p className="text-sm font-medium text-white/50 mb-2">
                      {t('libraryPlaylist.missingSongs').replace('{n}', String(missingCount))}
                    </p>
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                      {missingEntries.map((entry) => (
                        <div
                          key={entry.songId}
                          className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 opacity-40 select-none cursor-default"
                          aria-disabled="true"
                        >
                          <MusicIcon className="w-4 h-4 text-white/30 shrink-0" aria-hidden="true" />
                          <span className="text-sm text-white/50 truncate flex-1">{t('libraryPlaylist.songMissing')}</span>
                          <button
                            onClick={() => onRemoveSongFromPlaylist(selectedPlaylist.id, entry.songId)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all pointer-events-auto"
                            title={t('libraryPlaylist.removeFromPlaylist')}
                            aria-label={t('libraryPlaylist.removeFromPlaylist')}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Edit Playlist Modal */}
      <EditPlaylistModal
        show={showEditModal}
        onClose={setShowEditModal}
        onSuccess={() => onPlaylistSelect(null)}
        playlist={editTarget}
      />

      {/* Playlist Queue Config Modal */}
      <PlaylistQueueConfigModal
        show={showQueueConfig}
        onClose={setShowQueueConfig}
        songs={queueConfigSongs}
      />
    </div>
  );
}
