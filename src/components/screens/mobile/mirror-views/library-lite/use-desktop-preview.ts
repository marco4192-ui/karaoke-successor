'use client';

// ===================== Library-Lite-Mirror — Desktop-Preview-Hook =====================
//
// Desktop-Preview-Tracking (nur kontrollierender Companion) inkl.
// Start/Stop-Handler (R27a-Auslagerung aus mirror-library-lite.tsx —
// State und Callback-Bodies byte-identisch).

import { useCallback, useState } from 'react';

export function useDesktopPreview(onSendDesktopCommand: (screen: string) => void) {
  // Desktop-Preview tracking (controlling companion only)
  const [desktopPreviewSongId, setDesktopPreviewSongId] = useState<string | null>(null);

  // Desktop-Preview: Song auf Desktop-Lautsprechern abspielen (nur kontrollierender Companion)
  const handleDesktopPreview = useCallback((songId: string) => {
    // Stop previous preview if switching to a different song
    if (desktopPreviewSongId && desktopPreviewSongId !== songId) {
      onSendDesktopCommand('song_preview_stop');
    }
    setDesktopPreviewSongId(songId);
    onSendDesktopCommand('song_preview:' + songId);
  }, [desktopPreviewSongId, onSendDesktopCommand]);

  const handleStopDesktopPreview = useCallback(() => {
    if (desktopPreviewSongId) {
      onSendDesktopCommand('song_preview_stop');
      setDesktopPreviewSongId(null);
    }
  }, [desktopPreviewSongId, onSendDesktopCommand]);

  return { desktopPreviewSongId, handleDesktopPreview, handleStopDesktopPreview };
}
