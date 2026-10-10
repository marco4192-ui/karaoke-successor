'use client';

// ═══════════════════════════════════════════════════════════════════════════
// useCompanionRemoteEvents — QR-Runde (Auslagerung aus karaoke-app.tsx)
//
// Bündelt ALLE Desktop-Listener für Companion-/Remote-Events:
// Navigation, Party-Mode/Difficulty/Start, Pause/Resume, Leave-Dialog,
// Fullscreen-Toggle, Party-Cancel, Song-Auswahl (Library), Voting,
// Zufalls-Song (Ctrl+R/Ctrl+D-Spiegel) und Play-Queue (Ctrl+Q-Spiegel).
// Der Block war ~360 Zeilen in karaoke-app.tsx — Logik ist 1:1 unverändert.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { getAllSongs } from '@/lib/game/song-library';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import type { Screen } from '@/types/screens';

export interface CompanionRemoteEventsOptions {
  /** Navigiert mit Party-Mode-Guard (aus useScreenNavigation) */
  navigateWithGuard: (target: Screen) => void;
  /** Setzt den Screen direkt (ohne Guard) */
  setScreen: (s: Screen) => void;
  /** Aktueller Screen — für isPlaying der globalen Fernsteuerung */
  screen: Screen;
  /** Pause/Resume aus useGameFlowHandlers */
  pauseGame: () => void;
  resumeGame: () => void;
  /** Vollbild-Umschalter aus useAppEffects */
  toggleFullscreen: () => void;
  /** Direkter Party-Aktiv-Check (computePartyModeActive) */
  isPartyActiveDirect: boolean;
  /** Lokaler State der App: wer hat pausiert */
  setPauseInitiator: (v: string | null) => void;
  /** Lokaler State der App: Queue-Autoplay-Flag (Ctrl+Q) */
  setAutoPlayNext: (v: boolean) => void;
}

export function useCompanionRemoteEvents(opts: CompanionRemoteEventsOptions) {
  const {
    navigateWithGuard,
    setScreen,
    screen,
    pauseGame,
    resumeGame,
    toggleFullscreen,
    isPartyActiveDirect,
    setPauseInitiator,
    setAutoPlayNext,
  } = opts;

  // Store-Zugriffe (Aktionen sind stabil; gameState wird nur on-demand gelesen)
  const { resetGame, setGameMode, setSong, setDifficulty } = useGameStore();
  const party = usePartyStore();

  // ── Global remote control from mobile companions ──
  const handleRemoteNavigation = useCallback((targetScreen: string) => {
    const screenMap: Record<string, Screen> = {
      'home': 'home', 'library': 'library', 'settings': 'settings',
      'queue': 'queue', 'party': 'party', 'profile': 'profile',
      'highscores': 'highscores', 'achievements': 'achievements',
      'jukebox': 'jukebox', 'editor': 'editor',
      'dailyChallenge': 'dailyChallenge', 'online': 'online',
      'party-setup': 'party-setup',
    };
    navigateWithGuard(screenMap[targetScreen] || 'home');
  }, [navigateWithGuard]);

  useGlobalRemoteControl({
    navigateToScreen: handleRemoteNavigation,
    isPlaying: screen === 'game',
  });

  // ── Handle remote party-mode events dispatched by global remote control ──
  useEffect(() => {
    const handleRemotePartyMode = (e: Event) => {
      const { mode } = (e as CustomEvent).detail || {};
      if (!mode) return;
      if (mode === 'online') {
        setScreen('online');
        return;
      }
      party.setSelectedGameMode(mode);
      setScreen('party-setup');
    };
    window.addEventListener('remote-party-mode', handleRemotePartyMode);
    return () => window.removeEventListener('remote-party-mode', handleRemotePartyMode);
  }, [party, setScreen]);

  // ── Handle remote party-difficulty events from companion ──
  useEffect(() => {
    const handleRemotePartyDifficulty = (e: Event) => {
      const { difficulty } = (e as CustomEvent).detail || {};
      if (!difficulty) return;
      // Dispatch event that UnifiedPartySetup can listen to
      window.dispatchEvent(new CustomEvent('party-set-difficulty', { detail: { difficulty } }));
    };
    window.addEventListener('remote-party-difficulty', handleRemotePartyDifficulty);
    return () => window.removeEventListener('remote-party-difficulty', handleRemotePartyDifficulty);
  }, []);

  // ── Handle remote party-start events from companion ──
  useEffect(() => {
    const handleRemotePartyStart = () => {
      // Robust selectors first (unified setup "Ready to Play", mode starting
      // screens, PTM/CPTM/BR intros), then fall back to a text search.
      const byId = document.querySelector<HTMLButtonElement>('#party-start-btn:not([disabled])');
      if (byId) { byId.click(); return; }

      const byTestId = document.querySelector<HTMLButtonElement>(
        '[data-testid="party-starting-start-button"]:not([disabled])'
      );
      if (byTestId) { byTestId.click(); return; }

      const introButtons = [
        'ptm-start-button',
      ].map(id => document.querySelector<HTMLButtonElement>(`[data-testid="${id}"]:not([disabled])`));
      const introBtn = introButtons.find(Boolean);
      if (introBtn) { introBtn!.click(); return; }

      // Fallback: first visible "Start"/"Spiel starten" button
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
      const startBtn = buttons.find(b => {
        const text = b.textContent?.toLowerCase() || '';
        return (text.includes('start') || text.includes('spiel starten')) && !b.disabled;
      });
      startBtn?.click();
    };
    window.addEventListener('remote-party-start', handleRemotePartyStart);
    return () => window.removeEventListener('remote-party-start', handleRemotePartyStart);
  }, []);

  // ── Handle companion pause: show desktop pause dialog with pauser name ──
  useEffect(() => {
    const handleCompanionPause = (e: Event) => {
      const { fromName } = (e as CustomEvent).detail || {};
      pauseGame();
      setPauseInitiator(fromName || 'Companion');
      party.setPauseDialogAction('song-pause');
      // Notify Socket.IO to push pause state to companions
      window.dispatchEvent(new CustomEvent('pause-state-change', {
        detail: { isPaused: true, pauseInitiator: fromName || 'Companion' },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: 'song-pause' },
      }));
    };
    window.addEventListener('remote-companion-pause', handleCompanionPause);
    return () => window.removeEventListener('remote-companion-pause', handleCompanionPause);
  }, [pauseGame, party.setPauseDialogAction, setPauseInitiator]);

  // ── Handle companion resume: dismiss desktop pause dialog and resume game ──
  useEffect(() => {
    const handleCompanionResume = () => {
      resumeGame();
      setPauseInitiator(null);
      party.setPauseDialogAction(null);
      // Notify Socket.IO to push resume state to companions
      window.dispatchEvent(new CustomEvent('pause-state-change', {
        detail: { isPaused: false, pauseInitiator: null },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: null },
      }));
    };
    window.addEventListener('remote-companion-resume', handleCompanionResume);
    return () => window.removeEventListener('remote-companion-resume', handleCompanionResume);
  }, [resumeGame, party.setPauseDialogAction, setPauseInitiator]);

  // ── Handle companion-triggered leave dialog (sync with desktop) ──
  useEffect(() => {
    const handleShowLeave = () => {
      // Item 14: ignore stale companion commands once the party is over —
      // otherwise the leave dialog would pop up on non-party screens.
      // Bug 12: DIRECT party-active check — the navigation flag can be
      // latched false while a party game still runs.
      if (!isPartyActiveDirect) return;
      party.setPauseDialogAction('party-leave');
      // Notify Socket.IO to push party-leave to companions
      window.dispatchEvent(new CustomEvent('party-leave-change', {
        detail: { show: true },
      }));
      window.dispatchEvent(new CustomEvent('desktop-dialog-change', {
        detail: { dialog: 'party-leave' },
      }));
    };
    window.addEventListener('remote-party-show-leave', handleShowLeave);
    return () => window.removeEventListener('remote-party-show-leave', handleShowLeave);
  }, [party.setPauseDialogAction, isPartyActiveDirect]);

  useEffect(() => {
    const handleLeaveConfirm = () => {
      // Clear the dialog FIRST — mirrors handlePartyModeEnd which calls
      // closeDialog() before resetPartyState(). Without this, if
      // resetPartyState() is blocked by the safety net (medley/CPTM),
      // the desktop overlay would stay open forever.
      party.setPauseDialogAction(null);
      // Item 14: force — explicit companion leave confirmation must fully
      // reset the party even when the medley/CPTM safety net would block.
      party.resetPartyState(true);
      resetGame();
      setGameMode('standard');
      setScreen('home');
    };
    window.addEventListener('remote-party-leave-confirm', handleLeaveConfirm);
    return () => window.removeEventListener('remote-party-leave-confirm', handleLeaveConfirm);
  }, [party.setPauseDialogAction, party.resetPartyState, resetGame, setScreen, setGameMode]);

  useEffect(() => {
    const handleLeaveCancel = () => {
      party.setPauseDialogAction(null);
    };
    window.addEventListener('remote-party-leave-cancel', handleLeaveCancel);
    return () => window.removeEventListener('remote-party-leave-cancel', handleLeaveCancel);
  }, [party.setPauseDialogAction]);

  // ── Handle toggle-fullscreen event from remote control ──
  useEffect(() => {
    const handleToggleFullscreen = () => toggleFullscreen();
    window.addEventListener('toggle-fullscreen', handleToggleFullscreen);
    return () => window.removeEventListener('toggle-fullscreen', handleToggleFullscreen);
  }, [toggleFullscreen]);

  // ── Handle remote party cancel from companion (leave party-setup, reset state) ──
  useEffect(() => {
    const handleRemotePartyCancel = () => {
      // force — explicit companion cancel of the party setup must fully reset
      party.resetPartyState(true);
      resetGame();
      setGameMode('standard');
      setScreen('party');
    };
    window.addEventListener('remote-party-cancel', handleRemotePartyCancel);
    return () => window.removeEventListener('remote-party-cancel', handleRemotePartyCancel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle remote party song selection from companion (library mode) ──
  useEffect(() => {
    const handleRemotePartySelectSong = async (e: Event) => {
      const { songId } = (e as CustomEvent).detail || {};
      if (!songId) return;
      const allSongs = getAllSongs();
      const song = allSongs.find(s => s.id === songId);
      if (!song) {
        // eslint-disable-next-line no-console
        console.error('[RemotePartySelectSong] Song not found:', songId);
        return;
      }
      // Load lyrics and URLs
      let songWithUrls = song;
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        songWithUrls = await ensureSongUrls(song);
        try {
          const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
          const withLyrics = await getSongByIdWithLyrics(song.id);
          if (withLyrics) songWithUrls = withLyrics;
        } catch { /* non-critical */ }
      } catch { /* non-critical */ }
      // Navigate to library screen with the song selected
      // The library screen will show the party setup overlay which auto-starts
      // SAFETY NET (same as the inline onSelectSong): a party-only game-store
      // mode with NO active party (selectedGameMode === null) is stale —
      // resetGame() preserves gameMode, so it would survive a party reset and
      // re-route this companion pick into a broken GameScreen. Clamp to standard.
      const rawRemoteMode = party.selectedGameMode || useGameStore.getState().gameState.gameMode;
      const REMOTE_PARTY_ONLY_MODES = new Set([
        'pass-the-mic', 'companion-singalong', 'rate-my-song',
        'missing-words', 'blind', 'medley', 'battle-royale', 'tournament',
      ]);
      const currentMode = !party.selectedGameMode && REMOTE_PARTY_ONLY_MODES.has(rawRemoteMode)
        ? 'standard'
        : rawRemoteMode;
      resetGame();
      if (currentMode && currentMode !== 'standard') {
        setGameMode(currentMode);
      }
      setSong(songWithUrls);
      // Same branching logic as the inline onSelectSong callback
      if (currentMode === 'pass-the-mic') {
        const playerCount = party.passTheMicPlayers?.length || 2;
        const segments = generatePtmSegments(songWithUrls.duration, playerCount, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setPassTheMicSegments(segments);
        // Set screen SYNCHRONOUSLY so companion sees 'pass-the-mic-game' immediately
        // instead of staying on 'library' during the async URL/lyrics work
        setScreen('pass-the-mic-game');
        // Then do async URL/lyrics enrichment in the background
        (async () => {
          try {
            const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
            let sw = await ensureSongUrls(songWithUrls);
            if (!sw.lyrics?.length || sw.lyrics.every(l => l.notes.length === 0)) {
              try {
                const { getSongByIdWithLyrics } = await import('@/lib/game/song-library');
                const wl = await getSongByIdWithLyrics(sw.id);
                if (wl?.lyrics?.length) sw = { ...sw, lyrics: wl.lyrics };
              } catch { /* */ }
            }
            const scoreSegments = generatePtmSegments(sw.duration, playerCount, party.passTheMicSettings?.segmentDuration, sw.lyrics);
            party.setPassTheMicSegments(scoreSegments);
            party.setPassTheMicSong(sw);
          } catch { party.setPassTheMicSong(songWithUrls); }
        })();
      } else if (currentMode === 'companion-singalong') {
        party.setCptmSong(songWithUrls);
        party.setLibrarySelectedSong(songWithUrls);
        setScreen('party-setup');
      } else {
        setScreen('game');
      }
    };
    window.addEventListener('remote-party-select-song', handleRemotePartySelectSong);
    return () => window.removeEventListener('remote-party-select-song', handleRemotePartySelectSong);
  }, [resetGame, setGameMode, setSong, setScreen]);

  // ── Handle remote party vote from companion ──
  useEffect(() => {
    const handleRemotePartyVote = async (e: Event) => {
      const { songId } = (e as CustomEvent).detail || {};
      if (!songId) return;
      // Find the song in the voting songs list
      const selectedSong = party.votingSongs.find(s => s.id === songId);
      if (!selectedSong) return;
      // Ensure URLs
      let songWithUrls = selectedSong;
      try {
        const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
        songWithUrls = await ensureSongUrls(selectedSong);
        if (!songWithUrls.lyrics || songWithUrls.lyrics.length === 0) {
          try {
            const { loadSongLyrics } = await import('@/lib/game/song-lyrics-loader');
            const lyrics = await loadSongLyrics(songWithUrls);
            if (lyrics.length > 0) songWithUrls = { ...songWithUrls, lyrics };
          } catch { /* */ }
        }
      } catch { /* */ }
      // Start the game with the voted song (same as SongVotingModal.onVote)
      resetGame();
      if (party.selectedGameMode) {
        setGameMode(party.selectedGameMode);
        setDifficulty(party.unifiedSetupResult?.difficulty || 'medium');
      }
      setSong(songWithUrls);
      if (party.selectedGameMode === 'companion-singalong') {
        const cptmPlayers = party.cptmPlayers || [];
        const cptmSegments = generatePtmSegments(songWithUrls.duration, cptmPlayers.length || 2, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setCptmSegments(cptmSegments);
        setScreen('companion-singalong-game');
      } else if (party.selectedGameMode === 'pass-the-mic') {
        // Use PTM game screen so intro phase is shown
        const ptmPlayers = party.passTheMicPlayers || [];
        const segments = generatePtmSegments(songWithUrls.duration, ptmPlayers.length || 2, party.passTheMicSettings?.segmentDuration, songWithUrls.lyrics);
        party.setPassTheMicSegments(segments);
        party.setPassTheMicSong(songWithUrls);
        setScreen('pass-the-mic-game');
      } else {
        setScreen('game');
      }
    };
    window.addEventListener('remote-party-vote', handleRemotePartyVote);
    return () => window.removeEventListener('remote-party-vote', handleRemotePartyVote);
  }, [resetGame, setGameMode, setSong, setScreen, party]);

  // ── Handle remote random song events (mirror Ctrl+R / Ctrl+D) ──
  useEffect(() => {
    const handleRemoteRandomSong = (e: Event) => {
      const { mode } = (e as CustomEvent).detail || {};
      const songs = getAllSongs();
      if (songs.length === 0) return;
      const randomSong = songs[Math.floor(Math.random() * songs.length)];
      resetGame();
      if (mode === 'duel') {
        setGameMode('duel');
      } else {
        setGameMode('standard');
      }
      setSong(randomSong);
      setScreen('game');
    };
    window.addEventListener('remote-random-song', handleRemoteRandomSong);
    return () => window.removeEventListener('remote-random-song', handleRemoteRandomSong);
  }, [resetGame, setGameMode, setSong, setScreen]);

  // ── Handle remote play-queue event (mirror Ctrl+Q) ──
  useEffect(() => {
    const handleRemotePlayQueue = () => {
      const q = useGameStore.getState().queue;
      // Check both zustand queue and companion server queue
      if (q.length === 0) {
        // No items in local queue — check companion queue
        fetch('/api/mobile?action=getqueue')
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.queue && data.queue.length > 0) {
              // Sync companion queue items into zustand store
              const store = useGameStore.getState();
              data.queue.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (!store.queue.some((qi: { id: string }) => qi.id === item.id)) {
                  store.addCompanionToQueue(item);
                }
              });
              // Now navigate to queue with autoPlay
              setAutoPlayNext(true);
              navigateWithGuard('queue');
            }
          })
          .catch(() => {});
        return;
      }
      setAutoPlayNext(true);
      navigateWithGuard('queue');
    };
    window.addEventListener('remote-play-queue', handleRemotePlayQueue);
    return () => window.removeEventListener('remote-play-queue', handleRemotePlayQueue);
  }, [navigateWithGuard, setAutoPlayNext]);
}
