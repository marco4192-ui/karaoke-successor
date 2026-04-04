'use client';

import { useState, useEffect } from 'react';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

/**
 * Hook to poll mobile companion pitch data from the server.
 * Extracted from game-screen.tsx to reduce its size.
 * 
 * Polls /api/mobile?action=getpitch every 50ms when a song is active.
 */
export function useMobilePitchPolling(song: { id: string } | null): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);

  useEffect(() => {
    if (!song) {
      setMobilePitch(null);
      setHasMobileClient(false);
      return;
    }

    const pollMobilePitch = async () => {
      try {
        const response = await fetch('/api/mobile?action=getpitch');
        const data = await response.json();
        if (data.success && data.pitch) {
          setMobilePitch(data.pitch.data);
          setHasMobileClient(true);
        }
      } catch {
        // Ignore polling errors — companion may not be connected
      }
    };

    const pollInterval = setInterval(pollMobilePitch, 50);

    return () => clearInterval(pollInterval);
  }, [song]);

  return { mobilePitch, hasMobileClient };
}
