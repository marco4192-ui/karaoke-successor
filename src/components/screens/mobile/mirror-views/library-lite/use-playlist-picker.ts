'use client';

// ===================== Library-Lite-Mirror — Playlist-Picker-Hook =====================
//
// Playlist-Picker-State und alle Playlist-Handler (Liste laden, Song
// hinzufuegen, neue Playlist erstellen, schliessen). R27a-Auslagerung aus
// mirror-library-lite.tsx — State- und Callback-Bodies byte-identisch
// (inkl. DO-NOT-CHANGE playlist_add/playlist_create_add API-Kontrakt).

import { useCallback, useState } from 'react';
import { haptic } from './helpers';
import type { MobileSong } from '../../mobile-types';

export interface UsePlaylistPickerParams {
  overlaySong: MobileSong | null;
  clientId: string | null;
  closeOverlay: () => void;
}

export function usePlaylistPicker({ overlaySong, clientId, closeOverlay }: UsePlaylistPickerParams) {
  // Playlist-Picker State
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const [playlists, setPlaylists] = useState<Array<{ id: string; name: string; isSystem?: boolean }>>([]);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [playlistAdding, setPlaylistAdding] = useState<string | null>(null);

  // DO-NOT-CHANGE: Playlist-Add via mobile API. Der Desktop muss den
  // 'playlist_add'-Action-Type unterstuetzen, um den Song in eine
  // gewaehlte Playlist aufzunehmen. Zeigt Playlist-Auswahl an.
  const handleOverlayPlaylist = useCallback(async () => {
    if (!overlaySong) return;
    haptic();
    setShowPlaylistPicker(true);
    setPlaylistLoading(true);
    setNewPlaylistName('');
    setShowNewPlaylist(false);
    setPlaylistAdding(null);
    try {
      const res = await fetch('/api/mobile?action=playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(Array.isArray(data.playlists) ? data.playlists : []);
      }
    } catch { /* ignore */ }
    finally { setPlaylistLoading(false); }
  }, [overlaySong]);

  // Song zu einer bestehenden Playlist hinzufuegen
  const handleAddToPlaylist = useCallback(async (playlistId: string) => {
    if (!overlaySong) return;
    haptic();
    setPlaylistAdding(playlistId);
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'playlist_add',
          clientId,
          payload: {
            playlistId,
            songId: overlaySong.id,
          },
        }),
      });
      setShowPlaylistPicker(false);
      closeOverlay();
    } catch { /* ignore */ }
    finally { setPlaylistAdding(null); }
  }, [overlaySong, clientId, closeOverlay]);

  // Neue Playlist erstellen und Song hinzufuegen
  const handleCreateAndAddPlaylist = useCallback(async () => {
    if (!overlaySong || !newPlaylistName.trim()) return;
    haptic();
    setPlaylistAdding('new');
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'playlist_create_add',
          clientId,
          payload: {
            name: newPlaylistName.trim(),
            songId: overlaySong.id,
          },
        }),
      });
      setShowPlaylistPicker(false);
      setShowNewPlaylist(false);
      closeOverlay();
    } catch { /* ignore */ }
    finally { setPlaylistAdding(null); }
  }, [overlaySong, newPlaylistName, clientId, closeOverlay]);

  // Playlist-Picker schliessen
  const closePlaylistPicker = useCallback(() => {
    haptic();
    setShowPlaylistPicker(false);
  }, []);

  return {
    showPlaylistPicker,
    playlists,
    playlistLoading,
    newPlaylistName,
    setNewPlaylistName,
    showNewPlaylist,
    setShowNewPlaylist,
    playlistAdding,
    handleOverlayPlaylist,
    handleAddToPlaylist,
    handleCreateAndAddPlaylist,
    closePlaylistPicker,
  };
}
