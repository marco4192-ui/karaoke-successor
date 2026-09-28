'use client';

// ===================== Library-Lite-Mirror — Song-Overlay-Hook =====================
//
// Overlay-State (Song, Schwierigkeit, Partner, Adding, Challenge) und alle
// Overlay-Handler (oeffnen/schliessen, Queue, Spiel-Start, Herausfordern,
// Party-Select mit Preview-Stop). R27a-Auslagerung aus
// mirror-library-lite.tsx — State-, Effect- und Callback-Bodies byte-identisch;
// einzige Deltas: `gameState.partyGameMode` → Parameter `partyGameMode`
// (Body + Dep-Array von openOverlayWithPreviewStop).

import { useCallback, useEffect, useState } from 'react';
import { haptic } from './helpers';
import type { GameMode, MobileSong } from '../../mobile-types';

export interface UseSongOverlayParams {
  difficulty: 'easy' | 'medium' | 'hard';
  onLoadOpponents: () => void;
  clientId: string | null;
  libGameMode: GameMode;
  allPartners: Array<{ id: string; name: string }>;
  playerMicSource: 'companion' | 'microphone';
  partnerMicSource: 'companion' | 'microphone';
  duetPartsSwapped: boolean;
  onSendDesktopCommand: (screen: string) => void;
  handleStopDesktopPreview: () => void;
  partyGameMode: string | null | undefined;
}

export function useSongOverlay({
  difficulty,
  onLoadOpponents,
  clientId,
  libGameMode,
  allPartners,
  playerMicSource,
  partnerMicSource,
  duetPartsSwapped,
  onSendDesktopCommand,
  handleStopDesktopPreview,
  partyGameMode,
}: UseSongOverlayParams) {
  // ---- Overlay-State ----
  const [overlaySong, setOverlaySong] = useState<MobileSong | null>(null);
  const [ovDifficulty, setOvDifficulty] = useState<'easy' | 'medium' | 'hard'>(difficulty || 'medium');
  // Sync ovDifficulty when the difficulty prop changes (e.g. from desktop global settings)
  useEffect(() => { setOvDifficulty(difficulty || 'medium'); }, [difficulty]);
  const [ovPartnerId, setOvPartnerId] = useState<string | null>(null);
  const [ovAdding, setOvAdding] = useState(false);
  const [ovChallengeSent, setOvChallengeSent] = useState(false);

  // Abgeleitete Werte fuer Overlay-Handler (vor den Callbacks deklariert)
  const needsChallenge = libGameMode === 'duel' || libGameMode === 'duet';
  const missingOpponent = needsChallenge && !ovPartnerId;

  // ---- Overlay-Handler ----

  const openOverlay = useCallback((song: MobileSong) => {
    haptic();
    setOverlaySong(song);
    setOvDifficulty('medium');
    setOvPartnerId(null);
    setOvChallengeSent(false);
    // Lade Gegner/Host-Profile fuer Duell/Duett-Auswahl
    onLoadOpponents();
  }, [onLoadOpponents]);

  const closeOverlay = useCallback(() => {
    haptic();
    setOverlaySong(null);
  }, []);

  // Zur Queue: Direkt an die API senden mit lokalem Overlay-State.
  const handleOverlayQueue = useCallback(async () => {
    if (!overlaySong || ovAdding || missingOpponent) return;
    setOvAdding(true);
    const partner = ovPartnerId ? allPartners.find((p) => p.id === ovPartnerId) : null;
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queue',
          clientId,
          payload: {
            songId: overlaySong.id,
            songTitle: overlaySong.title,
            songArtist: overlaySong.artist,
            gameMode: libGameMode,
            difficulty: ovDifficulty,
            partnerId: partner?.id || undefined,
            partnerName: partner?.name || undefined,
            playerMicSource,
            partnerMicSource,
            duetPartsSwapped,
          },
        }),
      });
      if (res.ok) closeOverlay();
    } catch { /* ignore */ }
    finally { setOvAdding(false); }
  }, [overlaySong, ovAdding, missingOpponent, libGameMode, ovDifficulty, ovPartnerId, allPartners, clientId, playerMicSource, partnerMicSource, duetPartsSwapped, closeOverlay]);

  // Stop desktop preview when opening overlay (game start) or switching songs
  const openOverlayWithPreviewStop = useCallback((song: MobileSong) => {
    // Party-Modus: Song direkt fuer Party auswaehlen, kein Overlay
    if (partyGameMode) {
      haptic();
      onSendDesktopCommand(`party_select_song:${song.id}`);
      return;
    }
    handleStopDesktopPreview();
    openOverlay(song);
  }, [handleStopDesktopPreview, openOverlay, partyGameMode, onSendDesktopCommand]);

  // Spiel starten: Direkt an die API senden mit lokalem Overlay-State
  // (gameMode, difficulty, partner), NICHT ueber use-mobile-data.ts das
  // einen veralteten State haette.
  const handleOverlayStart = useCallback(async () => {
    if (!overlaySong || ovAdding || missingOpponent) return;
    handleStopDesktopPreview();
    setOvAdding(true);
    const partner = ovPartnerId ? allPartners.find((p) => p.id === ovPartnerId) : null;
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'queue',
          clientId,
          payload: {
            songId: overlaySong.id,
            songTitle: overlaySong.title,
            songArtist: overlaySong.artist,
            gameMode: libGameMode,
            difficulty: ovDifficulty,
            partnerId: partner?.id || undefined,
            partnerName: partner?.name || undefined,
            playerMicSource,
            partnerMicSource,
            duetPartsSwapped,
          },
        }),
      });
      if (res.ok) {
        onSendDesktopCommand('play_queue');
        closeOverlay();
      }
    } catch { /* ignore */ }
    finally {
      setOvAdding(false);
    }
  }, [overlaySong, ovAdding, missingOpponent, libGameMode, ovDifficulty, ovPartnerId, allPartners, clientId, playerMicSource, partnerMicSource, duetPartsSwapped, onSendDesktopCommand, closeOverlay, handleStopDesktopPreview]);

  // DO-NOT-CHANGE: Herausfordern per Chat-Nachricht (wie Desktop-App).
  // Sendet song_challenge an die API, die eine Chat-Nachricht erstellt.
  // clientId MUSS im Body sein, sonst liefert der Server 400.
  const handleOverlayChallenge = useCallback(async () => {
    if (!overlaySong || ovChallengeSent) return;
    haptic();
    setOvChallengeSent(true);
    try {
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'song_challenge',
          clientId,
          payload: {
            songId: overlaySong.id,
            songTitle: overlaySong.title,
            songArtist: overlaySong.artist,
            gameMode: libGameMode,
            challengedPartnerId: ovPartnerId || undefined,
          },
        }),
      });
      if (res.ok) {
        setTimeout(() => closeOverlay(), 1200);
      } else {
        setOvChallengeSent(false);
      }
    } catch {
      setOvChallengeSent(false);
    }
  }, [overlaySong, ovChallengeSent, libGameMode, ovPartnerId, clientId, closeOverlay]);

  return {
    overlaySong,
    ovDifficulty,
    setOvDifficulty,
    ovPartnerId,
    setOvPartnerId,
    ovAdding,
    ovChallengeSent,
    needsChallenge,
    missingOpponent,
    openOverlay,
    closeOverlay,
    handleOverlayQueue,
    openOverlayWithPreviewStop,
    handleOverlayStart,
    handleOverlayChallenge,
  };
}
