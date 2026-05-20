# Companion App — Fixes, Verbesserungen & Ideen

> Erstellt: 2026-05-21
> Status: **IN PROGRESS**

---

## 🔴 Kritische Bugs (API/Security)

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 1 | `post-handlers.ts` | Auth auf gamestate/results/markplaying/queuecompleted/setAdPlaying/sethostprofiles | ✅ DONE |
| 2 | `post-handlers.ts` | Vote-Deduplizierung für tournament_crowd_vote | ✅ DONE |
| 3 | `post-handlers.ts` | command-Handler ist No-Op → implementieren oder entfernen | ⏸️ DEFERRED (No risk) |
| 4 | `post-handlers.ts` | Bounded sizes für jukeboxWishlist, tournamentCrowdVotes | ✅ DONE |
| 5 | `get-handlers.ts` | IP-basiertes Reconnect stiehlt Sessions bei NAT → clientId-basiert | ✅ DONE |
| 6 | `mobile-state.ts` | PIN als Query-Parameter → POST-Body; Brute-Force-Schutz | ✅ DONE |
| 7 | `mobile-state.ts` | Max client limit; purge completed queue items | ✅ DONE |
| 8 | `route.ts` | Rate limiting inkonsistent → per-action Limits | ✅ DONE |

## 🔴 Kritische Bugs (Memory/Hooks)

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 9 | `use-mobile-pitch-detection.ts` | startMicrophone nicht idempotent → Guard einbauen | ✅ DONE |
| 10 | `use-mobile-pitch-detection.ts` | AbortController für pitch upload fetch | ✅ DONE |
| 11 | `use-mobile-pitch-detection.ts` | setCurrentPitch throttle auf ~20fps | ✅ DONE |
| 12 | `use-mobile-connection.ts` | wakeUpTimerRef nicht bei Unmount geleert | ✅ DONE |
| 13 | `use-mobile-connection.ts` | Exponential Backoff bei Reconnect-Fehlern | ✅ DONE |
| 14 | `use-battle-royale-companion-polling.ts` | Cache Map wird nie geleert → clear bei gameStatus change | ✅ DONE |

## 🔴 Kritische Bugs (Game Logic)

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 15 | `companion-game.tsx` | playersSnapshot nicht vor song-results synchronisiert | ✅ DONE |
| 16 | `companion-types.ts` | randomTurnDuration() ignoriert Settings (hartcodiert 20-45s) | ✅ DONE |

## 🟠 Fehlerhaftes Error Handling (systematisch)

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 17 | `companion-list-section.tsx` | Falsche Fehlermeldung („kickFailed" bei Fetch-Fehler) | ⏳ TODO |
| 18 | `companion-list-section.tsx` | response.ok checks fehlen | ⏳ TODO |
| 19 | `mobile-profile-create-view.tsx` | Dead __isLoading → Spinner anzeigen oder entfernen | ⏳ TODO |
| 20 | `mobile-profile-create-view.tsx` | Silent catch → Error Toast anzeigen | ⏳ TODO |
| 21 | `mobile-profile-create-view.tsx` | response.ok check fehlt | ⏳ TODO |
| 22 | `mobile-profile-edit-view.tsx` | Silent catch → Error Toast | ⏳ TODO |
| 23 | `mobile-profile-edit-view.tsx` | Save-Button nicht disabled bei leerem Namen | ⏳ TODO |
| 24 | `remote-control-view.tsx` | Memory leak in polling (isMounted guard) | ⏳ TODO |
| 25 | `remote-control-view.tsx` | response.ok checks fehlen (4 fetches) | ⏳ TODO |
| 26 | `remote-control-view.tsx` | Command debounce fehlt | ⏳ TODO |
| 27 | `mobile-device-section.tsx` | Clipboard-Failure nicht behandelt | ⏳ TODO |
| 28 | `mobile-device-section.tsx` | response.ok check fehlt | ⏳ TODO |
| 29 | `use-mobile-data.ts` | response.ok checks fehlen (4 fetches) | ⏳ TODO |
| 30 | `use-mobile-data.ts` | Optimistic queue add ohne Rollback bei Server-Reject | ⏳ TODO |
| 31 | `use-mobile-game-sync.ts` | Alle Errors silently swallowed | ⏳ TODO |
| 32 | `use-mobile-game-sync.ts` | response.ok check fehlt | ⏳ TODO |
| 33 | `use-mobile-client.ts` | AbortController auf fetches fehlt | ⏳ TODO |
| 34 | `use-mobile-pitch-polling.ts` | response.ok check fehlt | ⏳ TODO |
| 35 | `mobile-screen.tsx` | response.ok check fehlt | ⏳ TODO |

## 🟡 i18n — Hartcodierte Strings

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 36 | `mobile-client-view.tsx` | „Karaoke ZERO" → t() | ⏳ TODO |
| 37 | `mobile-client-view.tsx` | „P1"/„P2" → t() | ⏳ TODO |
| 38 | `remote-control-view.tsx` | 4 Fehlermeldungen auf Englisch → t() | ⏳ TODO |
| 39 | `companion-game.tsx` | „COMPANION SING-A-LONG" Badge → t() | ✅ DONE |
| 40 | `companion-game.tsx` | „combo" → t() | ✅ DONE |
| 41 | `companion-setup.tsx` | Difficulty-Labels manuell kapitalisiert → t() | ⏳ TODO |
| 42 | `companion-setup.tsx` | „Unknown" Fallback → t() | ⏳ TODO |
| 43 | `companion-list-section.tsx` | Xm / Xh Ym nicht übersetzt | ⏳ TODO |
| 44 | `mobile-songs-view.tsx` | „Unknown" für Titel/Artist → t() | ⏳ TODO |
| 45 | `mobile-results-view.tsx` | #KaraokeZERO hartcodiert | ⏳ TODO |

## 🟡 UI/UX-Probleme

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 46 | `mobile-bottom-nav.tsx` | Kein safe-area für iPhones | ⏳ TODO |
| 47 | `mobile-bottom-nav.tsx` | results/jukebox nicht als aktiv markiert | ⏳ TODO |
| 48 | `mobile-bottom-nav.tsx` | remote Tab hat andere Farbe (purple vs cyan) | ⏳ TODO |
| 49 | `mobile-bottom-nav.tsx` | Fehlende aria-current/role Attribute | ⏳ TODO |
| 50 | `mobile-profile-create-view.tsx` | Zwei Avatar-Uploads gleichzeitig sichtbar | ⏳ TODO |
| 51 | `mobile-queue-view.tsx` | Positionen springen bei completed-Filter | ⏳ TODO |
| 52 | `mobile-queue-view.tsx` | Hartcodierte Slot-Count [1,2,3] → Konstante | ⏳ TODO |
| 53 | `mobile-mic-view.tsx` | Volume-Bar kann >100% → clamp | ⏳ TODO |
| 54 | `mobile-mic-view.tsx` | Fehlende aria-labels | ⏳ TODO |
| 55 | `mobile-songs-view.tsx` | Kein Debounce auf Suche | ⏳ TODO |
| 56 | `mobile-songs-view.tsx` | Kein Error-State bei Song-Loading | ⏳ TODO |
| 57 | `mobile-home-view.tsx` | Kein „Nothing playing" Empty-State | ⏳ TODO |
| 58 | `mobile-home-view.tsx` | Array index als key → item.id nutzen | ⏳ TODO |
| 59 | `mobile-jukebox-view.tsx` | Array index als key | ⏳ TODO |
| 60 | `mobile-jukebox-view.tsx` | Kein Remove aus Wishlist möglich | ⏳ TODO |
| 61 | `mobile-results-view.tsx` | Clipboard-Failure nicht behandelt | ⏳ TODO |
| 62 | `mobile-results-view.tsx` | accuracy.toFixed(1) ohne NaN-Guard | ⏳ TODO |
| 63 | `companion-series-results.tsx` | UUID-Fallback-Namen statt lesbare Namen | ⏳ TODO |
| 64 | `companion-game.tsx` | „End Song Early" ohne Bestätigungsdialog | ⏳ TODO |
| 65 | `companion-list-section.tsx` | confirm() Browser-Dialog → Custom Modal | ⏳ TODO |

## 🟠 Code-Qualität / Duplikation

| # | Datei | Fix | Status |
|---|-------|-----|--------|
| 66 | `mobile-screen.tsx` | ~70 Zeilen duplizierte IP-Detection → Shared Utility nutzen | ⏳ TODO |
| 67 | `remote-control-view.tsx` | Unused `profile` Prop entfernen | ⏳ TODO |
| 68 | `mobile-types.ts` | cptmTurn Shape → SingalongTurn Typ wiederverwenden | ⏳ TODO |
| 69 | `mobile-types.ts` | gameMode → GameMode Union Type; QueueItem.status → Union | ⏳ TODO |
| 70 | `mobile-views.tsx` | RemoteControlView nicht exportiert | ⏳ TODO |
| 71 | `companion-singalong-screen.tsx` | GamePhase nicht re-exportiert; irreführender Filename | ⏳ TODO |
| 72 | `mobile-profile-create-view.tsx` | Input max-length Validation fehlt | ⏳ TODO |
| 73 | `mobile-profile-edit-view.tsx` | Keine Bestätigung bei Profil-Wechsel | ⏳ TODO |

## 💡 Neue Feature-Ideen (Backlog)

| # | Idee | Priorität |
|---|------|-----------|
| F1 | Realtime Pitch Visualizer auf dem Handy | Mittel |
| F2 | Live-Leaderboard während Sing-A-Long | Mittel |
| F3 | Song-Challenge-Mode (zufälliger Song für nächsten Spieler) | Niedrig |
| F4 | In-Game Chat (Companion → Host) | Niedrig |
| F5 | Mood-Based Queue (Party/Chill/Power) | Niedrig |
| F6 | Photo-Booth (Selfie + Score-Card Overlay) | Niedrig |
| F7 | Achievements auf dem Companion-Profil | Niedrig |
| F8 | Error Boundary um alle Mobile-Views | Hoch |
| F9 | Offline-Indikator / Fallback-UI | Hoch |
| F10 | Onboarding-Flow für neue Nutzer | Mittel |
| F11 | Swipe-to-Remove in Queue | Mittel |
| F12 | Song-Vorschau (15s Clip auf dem Handy) | Mittel |
| F13 | Haptic Feedback auf Tab-Wechsel | Niedrig |
| F14 | Pull-to-Refresh in Listen-Views | Mittel |
| F15 | Queue-Reorder Endpoint | Mittel |
| F16 | WebSocket/SSE statt Polling | Hoch |
| F17 | Batch-Pitch API (ein Request für mehrere Frames) | Mittel |
| F18 | Play Again mit gleicher Spieler-Konfiguration | Mittel |

---

## Fortschritt

- Batch 1 (API Security): ✅ DONE (8/8 Fixes)
- Batch 2 (Game/Hooks): ✅ DONE (8/8 Fixes)
- Batch 3 (Admin/Client): ⏳ IN PROGRESS
- Batch 4 (UI Views): ⏳ TODO
- Batch 5 (Hooks): ⏳ TODO
- Batch 6 (Kleinteile): ⏳ TODO
- TypeScript-Check: ⏳ TODO
- Git Push: ⏳ TODO
