'use client';

/**
 * Companion remote-event wiring (R106 — extracted from the AfterTenKaraoke
 * monolith, verbatim).
 *
 * Registers ALL window-level listeners for companion-issued remote commands:
 * navigation, party mode/difficulty/start, pause/resume, leave dialog,
 * song selection + voting, random song, play queue, CPTM start confirmations
 * and fullscreen toggles. The handlers mirror the desktop keyboard
 * shortcuts (Ctrl+R/D/Q) and drive the same store actions.
 *
 * Local component state setters that these handlers write
 * (setPauseInitiator, setAutoPlayNext) are passed in as parameters so the
 * owning state stays in the App component.
 */

import { useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useGlobalRemoteControl } from '@/hooks/use-global-remote-control';
import { computePartyModeActive } from '@/hooks/use-screen-navigation';
import { toast } from '@/hooks/use-toast';
import { generatePtmSegments } from '@/lib/game/ptm-segments';
import { getAllSongs } from '@/lib/game/song-library';
import type { Screen } from '@/types/screens';

export interface CompanionRemoteEventsParams {
  /** Current screen (drives the remote-control isPlaying guard). */
  screen: Screen;
  setScreen: (_s: Screen) => void;
  navigateWithGuard: (_s: Screen) => void;
  closeDialog: () => void;
  toggleFullscreen: () => void;
  setPauseInitiator: (_v: string | null) => void;
  setAutoPlayNext: (_v: boolean) => void;
}

export function useCompanionRemoteEvents({
  screen,
  setScreen,
  navigateWithGuard,
  closeDialog,
  toggleFullscreen,
  setPauseInitiator,
  setAutoPlayNext,
}: CompanionRemoteEventsParams): void {
  const { t } = useTranslation();
  const { setSong, setGameMode, setDifficulty, resetGame, pauseGame, resumeGame } = useGameStore();
  const party = usePartyStore();
  const isPartyActiveDirect = computePartyModeActive(party);

  // ── Global remote control from mobile companions ─
  const handleRemoteNavigation = useCallback((targetScreen: string) => {
    const screenMap: Record<string, Screen> = {
      'home': 'home', 'library': 'library', 'settings': 'settings',
      'queue': 'queue', 'party': 'party', 'profile': 'profile',
      'highscores': 'highscores', 'achievements': 'achievements',
      'jukebox': 'jukebox', 'editor': 'editor',
      'dailyChallenge': 'dailyChallenge', 'online': 'online',
      'party-setup': 'party-setup',
    };
    const target = screenMap[targetScreen] || 'home';
    // R51/Bug12 — Companion „Zurück zum Setup" (Vote-Screen-Button/Footer-Tab):
    // Das ist ein Schritt INNERHALB des Party-Flows, kein Verlassen. Der
    // Leave-Guard soll nur beim Desktop-Navbar-Klick greifen (NavBar bekommt
    // navigateWithGuard); die Companion-App behandelt party-setup bereits als
    // Flow-Schritt (Footer-Exemption „going back to setup doesn't leave the
    // party"). Deshalb hier direkt — ohne Guard — navigieren, exakt wie die
    // internen Party-Screens (PartySetupSection/PartyGameScreens) es tun.
    if (target === 'party-setup') {
      setScreen('party-setup');
      return;
    }
    navigateWithGuard(target);
  }, [navigateWithGuard, setScreen]);

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
  }, [pauseGame, party.setPauseDialogAction]);

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
  }, [resumeGame, party.setPauseDialogAction]);

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

  // ── Handle companion "Song beenden" (R37) ──
  // companion_end_early now means EXACTLY what its label says: end the
  // current song early, with per-mode semantics (medley snippet → transition,
  // PTM/CPTM song → song-results, BR → round end, standard game → cleanup).
  // Outside a party, keep the legacy Escape fallback (pause dialog → Abort →
  // Library) — there is no mode screen listening for 'karaoke-end-song' on
  // non-party screens anyway, and a paused standard song must stay operable.
  useEffect(() => {
    const handleCompanionEndEarly = () => {
      if (!isPartyActiveDirect) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }
      // Close any open pause dialog first (the phone's Abort button also
      // lives inside the pause overlay) so the following phase change does
      // not leave a stale 'song-pause' on screen. The mode hooks' latch
      // guards (wasPausedRef) ensure no auto-resume fires for the ended song.
      party.setPauseDialogAction(null);
      window.dispatchEvent(new CustomEvent('karaoke-end-song', { detail: {} }));
    };
    window.addEventListener('remote-companion-end-early', handleCompanionEndEarly);
    return () => window.removeEventListener('remote-companion-end-early', handleCompanionEndEarly);
  }, [isPartyActiveDirect, party.setPauseDialogAction]);

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

      // R60 — CRASH-FIX (Spiegel des Desktop-onVote aus party-setup-section):
      // NUR nächste-Runde-Votes (nextRoundPick 'ptm'/'cptm', laufende Serie mit
      // existierendem Roster) kehren direkt ins Spiel zurück. Eine INITIALE
      // Vote aus dem Party-Setup startete previously das Spiel mit leerem
      // cptmPlayers-Roster („faking 2 players") — der erste Segment-Wechsel
      // crashte dann mit „Cannot read properties of undefined (reading
      // 'segmentsSung')". Initiale Votes wählen den Song jetzt nur VOR auf
      // dem Setup-Screen aus (genau wie der Desktop-Klick-Pfad).
      const pick = party.nextRoundPick;
      const isCptm = pick === 'cptm';
      const isPtm = pick === 'ptm';
      const roster = isCptm ? party.cptmPlayers : (isPtm ? party.passTheMicPlayers : []);

      const preselectOnSetup = () => {
        party.setLibrarySelectedSong(songWithUrls);
        party.setSongSelectionMethod('vote');
        setScreen('party-setup');
      };

      if (!isCptm && !isPtm) {
        // Initial vote from the party setup — pre-select, don't start the game
        preselectOnSetup();
        return;
      }
      if (roster.length === 0) {
        // Degenerate roster (setup not completed) — never launch the game engine
        preselectOnSetup();
        return;
      }

      const segments = generatePtmSegments(
        songWithUrls.duration,
        roster.length,
        isCptm
          ? (party.cptmSettings?.segmentDuration ?? party.passTheMicSettings?.segmentDuration)
          : party.passTheMicSettings?.segmentDuration,
        songWithUrls.lyrics,
      );
      if (segments.length === 0) {
        // R51 <60s-Guard: Segment-Engine lehnt zu kurze Songs ab — ohne
        // Guard würde der Screen-Wechsel auf einen leeren Game-Screen laufen.
        toast({ title: t('party.songTooShortVote') });
        preselectOnSetup();
        return;
      }

      party.setNextRoundPick(null);
      resetGame();
      if (party.selectedGameMode) {
        setGameMode(party.selectedGameMode);
        setDifficulty(party.unifiedSetupResult?.difficulty || 'medium');
      }
      setSong(songWithUrls);
      party.setIsSongPlaying(false);
      if (isCptm) {
        // R51/Bug13: cptmSong + Segmente + zurückgesetzte Start-Bestätigungen
        // gehören zusammen — sonst schwarzer Screen / hängende Intro-Badges.
        party.setCptmSegments(segments);
        party.setCptmSong(songWithUrls);
        party.setCptmStartConfirmed([]);
        setScreen('companion-singalong-game');
      } else {
        party.setPassTheMicSegments(segments);
        party.setPassTheMicSong(songWithUrls);
        setScreen('pass-the-mic-game');
      }
    };
    window.addEventListener('remote-party-vote', handleRemotePartyVote);
    return () => window.removeEventListener('remote-party-vote', handleRemotePartyVote);
  }, [resetGame, setGameMode, setSong, setScreen, party, t]);

  // ── R51/Bug13: CPTM Starting-Screen — Teilnehmer-Bestätigungen sammeln ──
  // Jeder Companion-Spieler bestätigt per Start-Button
  // (cptm_confirm_start:<playerId>, Participation-Command). Der Desktop
  // sammelt die Bestätigungen im Party-Store; die CPTM-Intro-Ansicht zeigt
  // die Übersicht (wer bereit ist / wer fehlt) und startet automatisch,
  // sobald ALLE Spieler bestätigt haben und die Medien geladen sind.
  useEffect(() => {
    const handleCptmConfirmStart = (e: Event) => {
      const { playerId } = (e as CustomEvent).detail || {};
      if (!playerId) return;
      const st = usePartyStore.getState();
      // Nur bestätigen, was auch wirklich ein CPTM-Spieler ist (Schutz vor
      // gefälschten/fremden IDs) — und nur während der Intro-Phase sinnvoll.
      if (!st.cptmPlayers.some(p => p.id === playerId)) return;
      if (st.cptmStartConfirmed.includes(playerId)) return; // dedup
      st.setCptmStartConfirmed([...st.cptmStartConfirmed, playerId]);
    };
    window.addEventListener('remote-cptm-confirm-start', handleCptmConfirmStart);
    return () => window.removeEventListener('remote-cptm-confirm-start', handleCptmConfirmStart);
  }, []);

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
  }, [navigateWithGuard]);

}

