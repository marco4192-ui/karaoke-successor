'use client';

// ===================== Library-Lite-Mirror — Playlist-Picker-Overlay =====================
//
// Das z-[60]-Sheet zur Playlist-Auswahl: Header, Song-Info, Loading,
// Playlist-Liste, leerer Zustand und Neue-Playlist-Section. R27a-Auslagerung
// aus mirror-library-lite.tsx — JSX byte-identisch übernommen.

import { useTranslation } from '@/lib/i18n/translations';
import { haptic } from './helpers';
import type { MobileSong } from '../../mobile-types';

export interface PlaylistPickerOverlayProps {
  overlaySong: MobileSong;
  playlists: Array<{ id: string; name: string; isSystem?: boolean }>;
  playlistLoading: boolean;
  playlistAdding: string | null;
  newPlaylistName: string;
  setNewPlaylistName: (v: string) => void;
  showNewPlaylist: boolean;
  setShowNewPlaylist: (v: boolean) => void;
  closePlaylistPicker: () => void;
  handleAddToPlaylist: (playlistId: string) => void;
  handleCreateAndAddPlaylist: () => void;
}

export function PlaylistPickerOverlay({
  overlaySong,
  playlists,
  playlistLoading,
  playlistAdding,
  newPlaylistName,
  setNewPlaylistName,
  showNewPlaylist,
  setShowNewPlaylist,
  closePlaylistPicker,
  handleAddToPlaylist,
  handleCreateAndAddPlaylist,
}: PlaylistPickerOverlayProps) {
  const { t } = useTranslation();
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end bg-black/60 backdrop-blur-sm"
      onClick={closePlaylistPicker}
    >
      <div
        className="w-full rounded-t-2xl bg-[#16162a] border-t border-white/10 p-5 pb-8 max-h-[70vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">{t('mobile.mirrorPlaylistPick') || 'Playlist waehlen'}</h3>
          <button
            onClick={closePlaylistPicker}
            className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 active:bg-white/20 transition-colors"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Song-Info */}
        <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 mb-4">
          <span className="text-base">{'\u{1F3B5}'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{overlaySong.title}</p>
            <p className="truncate text-xs text-white/40">{overlaySong.artist}</p>
          </div>
        </div>

        {/* Loading */}
        {playlistLoading && (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Playlist-Liste */}
        {!playlistLoading && playlists.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            {playlists.filter((p) => !p.isSystem).map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAddToPlaylist(pl.id)}
                disabled={playlistAdding === pl.id}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-left bg-white/5 border border-white/10 active:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <span className="text-base">{'\u{1F4C1}'}</span>
                <span className="flex-1 text-sm font-medium text-white truncate">{pl.name}</span>
                {playlistAdding === pl.id && <span className="animate-spin text-xs">{'\u23F3'}</span>}
                {playlistAdding !== pl.id && <span className="text-white/20 text-xs">{'\u2795'}</span>}
              </button>
            ))}
          </div>
        )}

        {!playlistLoading && playlists.filter((p) => !p.isSystem).length === 0 && !showNewPlaylist && (
          <p className="text-xs text-white/30 text-center py-3">
            {t('mobile.mirrorNoPlaylists') || 'Keine Playlists vorhanden'}
          </p>
        )}

        {/* Neue Playlist */}
        {!showNewPlaylist ? (
          <button
            onClick={() => { haptic(); setShowNewPlaylist(true); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium bg-cyan-500/10 border border-cyan-400/20 text-cyan-400 active:scale-[0.98] transition-all"
          >
            <span>{'\u2795'}</span>
            <span>{t('mobile.mirrorNewPlaylist') || 'Neue Playlist erstellen'}</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder={t('mobile.mirrorPlaylistName') || 'Playlist-Name'}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 bg-white/5 border border-white/10 outline-none focus:border-cyan-400/50 transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { haptic(); setShowNewPlaylist(false); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white/70 active:bg-white/20 transition-all"
              >
                {t('mobile.mirrorCancel') || 'Abbrechen'}
              </button>
              <button
                onClick={handleCreateAndAddPlaylist}
                disabled={!newPlaylistName.trim() || playlistAdding === 'new'}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 active:scale-[0.97] transition-all disabled:opacity-40"
              >
                {playlistAdding === 'new' ? '\u23F3' : t('mobile.mirrorCreateAdd') || 'Erstellen & Hinzufuegen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
