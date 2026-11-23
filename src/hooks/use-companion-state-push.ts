'use client';

/**
 * Companion state push (R106 — extracted from the AfterTenKaraoke monolith).
 *
 * Keeps the mobile-companion data store in sync with the desktop app state:
 * - Tournament bracket: immediate debounced push on any bracket change so the
 *   companion "open duels" list never feels stale.
 * - Settings snapshot: local JSON compare every 5 s, push-on-change only,
 *   60 s keep-alive re-push + pull-on-reconnect heals server restarts.
 * - Jukebox mirror state: same push-on-change pattern (every 3 s).
 * - Highscores: top-100 pushed on change + 15 s keep-alive.
 * - Daily challenge snapshots: per-profile slots/weekly/streak/badges (5 s).
 * - Global profile-toggle event from companions (works from any screen).
 *
 * All pushes are fire-and-forget POSTs to /api/mobile — failures are
 * non-critical and healed by the keep-alive/pull cycles.
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { buildSettingsSnapshot } from '@/lib/companion/settings-snapshot';
import { buildDailySnapshots } from '@/lib/companion/daily-snapshot';
import { getJukeboxMirrorSnapshot } from '@/components/screens/jukebox/use-jukebox';

export function useCompanionStatePush(
  /** Ref to the screen-sync function (tournament changes trigger a 250 ms debounced re-sync). */
  syncScreenRef: RefObject<(() => Promise<void>) | null>,
): void {
  const profiles = useGameStore((s) => s.profiles);

  // ── Tournament bracket live push ──
  // Bracket changes (duel started / finished, manual winner, vote started or
  // skipped) must reach the companion "open duels" list quickly — waiting for
  // the 2s interval makes the list feel stale. Push immediately (debounced
  // 250ms so a burst of changes results in a single POST).
  const tournamentBracketObj = usePartyStore((s) => s.tournamentBracket);
  const currentTournamentMatchObj = usePartyStore((s) => s.currentTournamentMatch);
  const tournamentVotingMatchObj = usePartyStore((s) => s.tournamentVotingMatch);
  useEffect(() => {
    const id = setTimeout(() => { void syncScreenRef.current?.(); }, 250);
    return () => clearTimeout(id);
  }, [tournamentBracketObj, currentTournamentMatchObj, tournamentVotingMatchObj, syncScreenRef]);

  // ── R33/P16+: Settings snapshot — global push ON CHANGE only ──
  // Replaces the old 2s gamestate embedding (values + webcam config +
  // default difficulty were POSTed every 2 s regardless of changes). Now a
  // cheap LOCAL check (localStorage read + JSON compare) runs every 5 s and
  // POSTs ONLY when the snapshot actually changed. A 60 s keep-alive re-push
  // heals server restarts (the store is in-memory), and companions
  // additionally PULL the snapshot on every (re)connect — so a fresh or
  // returning-after-absence companion always sees the real desktop values.
  const settingsPushRef = useRef<{ serialized: string; lastPushAt: number }>({ serialized: '', lastPushAt: 0 });
  useEffect(() => {
    const pushSnapshot = (force = false) => {
      try {
        const snapshot = buildSettingsSnapshot();
        const serialized = JSON.stringify(snapshot);
        const ref = settingsPushRef.current;
        const now = Date.now();
        // Skip when unchanged AND the last successful push is fresh (< 60 s)
        if (!force && serialized === ref.serialized && now - ref.lastPushAt < 60_000) return;
        settingsPushRef.current = { serialized, lastPushAt: now };
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'settingssnapshot', payload: { snapshot } }),
        }).catch(() => {
          // Push failed (server hiccup) — allow an immediate retry on the
          // next check instead of waiting for the 60 s keep-alive.
          settingsPushRef.current.lastPushAt = 0;
        });
      } catch { /* non-critical */ }
    };
    pushSnapshot(true); // initial push so late-joining companions find data
    const interval = setInterval(() => pushSnapshot(), 5000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // Settings may have changed while this tab was hidden (second window)
        // — re-check immediately, force keeps the keep-alive clock honest.
        pushSnapshot(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── R33/P8: Jukebox state push for the companion Jukebox mirror ──
  // Same push-on-change pattern as the settings snapshot above: a cheap LOCAL
  // read (module-level mirror singleton from use-jukebox.ts — filters/shuffle/
  // repeat written by the hook, pool derived fresh from storage) runs every
  // 3 s and POSTs ONLY when the state actually changed. A 60 s keep-alive
  // re-push heals server restarts (the companion data store is in-memory);
  // companions additionally PULL via GET action=getjukeboxstate on view load.
  const jukeboxPushRef = useRef<{ serialized: string; lastPushAt: number }>({ serialized: '', lastPushAt: 0 });
  useEffect(() => {
    const pushJukeboxState = (force = false) => {
      try {
        const snap = getJukeboxMirrorSnapshot();
        // Compare WITHOUT updatedAt (a fresh timestamp would defeat the JSON
        // compare) — the timestamp is only attached to the POSTed payload.
        const serialized = JSON.stringify([
          snap.filters, snap.poolPlaylistId, snap.poolPlaylistName, snap.shuffle, snap.repeat,
        ]);
        const ref = jukeboxPushRef.current;
        const now = Date.now();
        // Skip when unchanged AND the last successful push is fresh (< 60 s)
        if (!force && serialized === ref.serialized && now - ref.lastPushAt < 60_000) return;
        jukeboxPushRef.current = { serialized, lastPushAt: now };
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // NOTE: the server stores the payload OBJECT AS-IS (unlike
          // 'dailystate', which extracts payload.daily) and GET getjukeboxstate
          // returns it under the 'jukebox' key — so the payload must be the
          // FLAT state object for use-mobile-data's data.jukebox read to work.
          body: JSON.stringify({
            type: 'jukeboxstate',
            payload: {
              filters: snap.filters,
              poolPlaylistId: snap.poolPlaylistId || null,
              poolPlaylistName: snap.poolPlaylistName,
              shuffle: snap.shuffle,
              repeat: snap.repeat,
              updatedAt: now,
            },
          }),
        }).catch(() => {
          // Push failed (server hiccup) — allow an immediate retry on the
          // next 3 s check instead of waiting for the 60 s keep-alive.
          jukeboxPushRef.current.lastPushAt = 0;
        });
      } catch { /* non-critical */ }
    };
    pushJukeboxState(true); // initial push so late-joining companions find data
    const interval = setInterval(() => pushJukeboxState(), 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // Jukebox state may have changed while this tab was hidden —
        // re-check immediately, force keeps the keep-alive clock honest.
        pushJukeboxState(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── R33/P10: Highscores push for the companion Highscores mirror ──
  // Push the top-100 local highscores whenever they change (cheap JSON
  // compare) or every 15 s as a keep-alive after server restarts.
  const highscoresObj = useGameStore.getState().highscores;
  const highscoresRef = useRef<string>('');
  useEffect(() => {
    const pushHighscores = () => {
      try {
        const entries = (useGameStore.getState().highscores ?? []).slice(0, 100).map(h => ({
          playerId: h.playerId,
          playerName: h.playerName,
          playerColor: h.playerColor,
          songTitle: h.songTitle,
          artist: h.artist,
          score: h.score,
          accuracy: h.accuracy,
          maxCombo: h.maxCombo,
          difficulty: h.difficulty,
          gameMode: h.gameMode,
          date: h.playedAt ? new Date(h.playedAt).toISOString() : undefined,
        }));
        const serialized = JSON.stringify(entries);
        if (serialized === highscoresRef.current) return; // unchanged
        highscoresRef.current = serialized;
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'highscores', payload: { entries } }),
        }).catch(() => { /* ignore */ });
      } catch { /* non-critical */ }
    };
    pushHighscores();
    const interval = setInterval(pushHighscores, 15000);
    return () => clearInterval(interval);
  }, [highscoresObj?.length, profiles]);

  // ── R33/P12: Daily-Challenge snapshot push for the companion Daily mirror ──
  // Per-profile slots/weekly/streak/badges. Computed every 5 s (cheap,
  // localStorage reads only) and pushed via POST type:'dailystate'.
  useEffect(() => {
    const pushDaily = () => {
      try {
        const allProfiles = useGameStore.getState().profiles ?? [];
        if (allProfiles.length === 0) return;
        const daily = buildDailySnapshots(allProfiles);
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'dailystate', payload: { daily } }),
        }).catch(() => { /* ignore */ });
      } catch { /* non-critical */ }
    };
    pushDaily();
    const interval = setInterval(pushDaily, 5000);
    return () => clearInterval(interval);
  }, [profiles]);

  // ── R33/P11: Global profile-toggle handler from the companion ──
  // profile_toggle:<id>:<0|1> used to only work while the character screen
  // was mounted. Handle it globally so the controlling companion can
  // activate/deactivate players from ANY desktop screen (idempotent with the
  // character-screen listener — both set the same isActive value).
  useEffect(() => {
    const handleRemoteProfileToggle = (e: Event) => {
      const { profileId, isActive } = (e as CustomEvent<{ profileId: string; isActive: boolean }>).detail || {};
      if (!profileId) return;
      useGameStore.getState().updateProfile(profileId, { isActive: !!isActive });
    };
    window.addEventListener('remote-profile-toggle', handleRemoteProfileToggle);
    return () => window.removeEventListener('remote-profile-toggle', handleRemoteProfileToggle);
  }, []);
}
