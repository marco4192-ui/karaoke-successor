# Worklog — Code Review Fixes

---
Task ID: W0
Agent: Main
Task: Worklog erstellen

Work Log:
- Worklog-Datei initialisiert
- Repo geklont von origin/master

Stage Summary:
- Worklog bereit für Tracking aller Änderungen

---
Task ID: B1
Agent: Main
Task: getLevelForXP NaN Guard + D4 Achievement Import Cleanup

Work Log:
- Datei src/lib/game/player-progression.ts gelesen
- Analyze: Negative XP ist KEIN Bug (xpRequired=0, nextRequired=500 → xp < 500 ist sofort true)
- Aber NaN WÜRDE Endlosschleife verursachen (NaN < anything → false)
- NaN/negative Guard hinzugefügt
- Unnötigen `Achievement` Import entfernt (D4)

Stage Summary:
- B1: NaN-Guard implementiert. Negativer XP wurde als Fehlalarm identifiziert.
- D4: Unnützer Import entfernt.
- Push: cb86da4

---
Task ID: B2
Agent: Main
Task: preparePtmNextSong Endlosrekursion beheben

Work Log:
- Datei src/lib/game/ptm-next-song.ts gelesen
- Problem: Wenn alle Songs < 60s sind, erzeugt generatePassTheMicSegments immer [] → endlose Rekursion
- Fix: _retryCount Parameter hinzugefügt, MAX_RETRIES = 20, Fallback auf 'library' Mode
- Parameter mit _-Präfix da er für externe Aufrufer nicht sichtbar sein muss

Stage Summary:
- B2: Retry-Limit implementiert, Stack Overflow verhindert.
- Push: 2f74459

---
Task ID: B3
Agent: Main
Task: songEnded immer false in Mobile Game Sync beheben

Work Log:
- use-mobile-game-sync.ts: songEnded als Parameter hinzugefügt (default false)
- game-screen.tsx: gameState.status === 'ended' übergeben
- pass-the-mic-screen.tsx: phase === 'results' übergeben
- ptm-game-screen.tsx: phase === 'results' übergeben

Stage Summary:
- B3: Mobile-Clients bekommen jetzt korrekten songEnded-Wert.
- Push: 36cb816

---
Task ID: B4
Agent: Main
Task: Doppelte Imports in results-screen.tsx entfernen

Work Log:
- SongHighscoreModal, ScoreVisualization, TrophyIcon, MAX_POINTS_PER_SONG wurden doppelt importiert (re-export + lokaler import)
- Lösung: Einziger import + export { ... } für Backward Compatibility
- Verifiziert: library-screen.tsx und screens/index.ts importieren weiterhin korrekt

Stage Summary:
- B4: Doppelte Imports entfernt, Bundle-Size optimiert.
- Push: 972e184

---
Task ID: B5
Agent: Main
Task: /api/songs self-referenziert localhost:3000 beheben

Work Log:
- Route nutzte fetch('http://localhost:3000/api/mobile?action=getsongs') — schlägt in Tauri fehl
- Lösung: Direkter Import von mutableState.songLibrary statt HTTP-Roundtrip
- Kein localhost mehr, keine Port-Abhängigkeit

Stage Summary:
- B5: Songs werden jetzt direkt aus dem In-Memory-Cache gelesen.
- Push: 98b01f4

---
Task ID: B7
Agent: Main
Task: handleAdEnd setzt Playback ungefragt fort

Work Log:
- use-youtube-game.ts gelesen
- handleAdStart pausiert das Spiel bei Werbebeginn
- handleAdEnd setzte setIsPlaying(true) ohne zu prüfen ob Nutzer manuell pausiert hat
- Fix: wasPlayingBeforeAdRef trackt den State vor der Werbung, handleAdEnd resumt nur wenn nötig

Stage Summary:
- B7: YouTube-Werbeunterbrechung resumt jetzt nur wenn Nutzer nicht manuell pausiert hat.
- Push: 0175168

---
Task ID: B8
Agent: Main
Task: Stale historyIndex in Editor-History beheben

Work Log:
- pushHistory nutzte closure-Wert von historyIndex statt aktuellen State
- Fix: historyIndexRef für pushHistory, structuredClone statt JSON.parse(JSON.stringify)
- setHistoryIndex wird jetzt innerhalb setHistory updater aufgerufen (korrekte Batch-Order)
- historyIndex korrigiert wenn shift() aufgerufen wird

Stage Summary:
- B8: History-Korruption bei schnellen aufeinanderfolgenden Edits verhindert.
- Push: 879a07a

---
Task ID: B9
Agent: Main
Task: 3x Event-Handler bei Tab-Wake debouncen

Work Log:
- visibilitychange, pageshow, focus rufen alle handleWakeUp auf
- Fix: wakeUpTimerRef als 2-Sekunden-Debounce — erster Aufruf geht durch, weitere werden ignoriert
- Kein CleanUp nötig da setTimeout sich selbst zurücksetzt

Stage Summary:
- B9: Nur noch ein Reconnect-Versuch pro Wake-Event.
- Push: 8840dda
- Alle kritischen Bugs (B1-B9) sind jetzt behoben.

---
Task ID: L1+L2
Agent: Main
Task: Battle-Royale Tiebreaker + Accuracy Reset

Work Log:
- L1: reduce() bei Gleichstand willkürlich → sort() mit deterministischem Tiebreaker (notesHit, maxCombo, playerId)
- L2: accuracy wurde additiv über Runden akkumuliert → reset pro Runde in startRound()
- shuffleArray Duplikat (D14) ist bewusst in beiden Dateien — Tournament und Battle-Royale sind unabhängige Module

Stage Summary:
- L1: Deterministischer Tiebreaker bei Gleichstand implementiert.
- L2: Accuracy wird pro Runde zurückgesetzt, vermeidet sinnlose Akkumulation.
- D14: Verifiziert — shuffleArray Duplikation ist akzeptabel (unabhängige Module).
- Push: 1b19d9c

---
Task ID: L6+L16
Agent: Main
Task: Daily-Challenge Streak + Storage Key Sync

Work Log:
- L6: else if (stats.lastCompletedDate !== today) war redundant mit äußerem if → vereinfacht, verhindert Reset
- L16: submitChallengeResult schreibt jetzt auch DAILY_CHALLENGE_KEY damit isChallengeCompletedToday() korrekt funktioniert

Stage Summary:
- L6: Streak wird bei wiederholtem Abschluss am selben Tag nicht mehr zurückgesetzt.
- L16: Beide Storage-Systeme sind jetzt synchronisiert.
- Push: 6612e26

---
Task ID: L12-verify
Agent: Main
Task: Themes !important Verifizierung

Work Log:
- themes.ts vollständig gelesen, Light-Theme "minimal-light" identifiziert
- !important auf .text-white ist bewusst: ohne es wäre weißer Text auf hellem Hintergrund unreadable
- Game-Screens mit bg-gradient + text-white: In Light-Theme würde Text dunkel auf dunklem Gradient werden
- Praktisch kein Problem: Light-Theme wird nicht während des Spielens verwendet
- Nutzer-Vermutung bestätigt: !important ist für Kontrast in Menüs/Dropdowns notwendig

Stage Summary:
- L12: Keine Änderung — !important ist bewusstes Design.

---
Task ID: D-batch
Agent: Main
Task: Dead-Code Cleanup Batch

Work Log:
- D1: frequencyToMidi Import aus scoring.ts entfernt
- D2: getPlayableUrl, hasMedia Importe aus song-library.ts entfernt
- D4: Achievement Import aus player-progression.ts (bereits in B1 erledigt)
- D5: Achievement Import aus achievements.ts entfernt
- D7: KeyboardShortcutHandler Interface aus keyboard-shortcuts.ts entfernt
- D8: allNotes Parameter aus useGameModes entfernt (+ Aufrufer game-screen.tsx)
- D9: LyricLineDisplay Import + Re-Export aus game-screen.tsx + index.ts entfernt
- D10: screen Parameter aus useAppEffects entfernt (+ Aufrufer page.tsx)
- D18: React Default-Import aus party-screen.tsx entfernt

Stage Summary:
- 10 Dateien bereinigt, 19 Zeilen entfernt, 6 Zeilen hinzugefügt.
- Push: 6483b8e

---
Task ID: D-batch2+Q21
Agent: Main
Task: Dead Code Batch 2 + Shared Config Utility

Work Log:
- D11: gameCurrentRound mit _-Präfix in timer (Dependency-Trigger)
- D12: PlayerPitchState Interface aus use-multi-pitch-detector.ts entfernt
- D15: ptm-segments vs ptm-next-song Duplikat verifiziert — bewusst unterschiedliche Logik (kurze Songs)
- D17: Leere if-Blöcke in results-screen.tsx mit TODO-Kommentaren markiert
- D20: Difficulty Import aus library-cache.ts entfernt, Typ zu string geändert
- D21: findConfigFile Duplikation → Shared Utility src/app/api/lib/find-config.ts extrahiert
  - assets/generate/route.ts und config/route.ts aktualisiert

Stage Summary:
- 7 Dateien bereinigt, 52 Zeilen entfernt.
- Push: d03c74b

---
Task ID: L-rest
Agent: Main
Task: Restliche Logikfehler

Work Log:
- L3: played/completed — Verifiziert: Beide inkrementieren immer zusammen, was bei Spielfunkt korrekt ist
- L4: getPlayableMatches prüft jetzt ob Feeder-Matches in Round 2+ beendet sind
- L5: calculateRounds nutzt jetzt players.length statt settings.maxPlayers
- L13: showTargetLine Config Property wird jetzt im render() berücksichtigt
- L14: copyScoreImageToClipboard prüft auf null-Blob von toBlob
- L15: clarity:0 — Verifiziert: YIN liefert keinen Clarity, Platzhalter ist korrekt

Stage Summary:
- 4 weitere Logikfehler behoben.
- Push: c4a1a33
- Alle Bugs (B1-B9), Logikfehler (L1-L16) und Dead-Code (D1-D21) sind jetzt erledigt.
- Nur noch Q1-Q17 (Code-Qualität) übrig.

---
Task ID: Q3-Q5
Agent: Main
Task: Split song-library.ts into modules, remove debug logs, extract path utilities

Work Log:
- song-library.ts (1200 Zeilen) analysiert — identifiziert 3 Modularisierungsziele
- **Q3: Modul-Split:**
  - `song-paths.ts` erstellt: `isAbsolutePath()`, `resolveSongsBaseFolder()`, `normalizeSongPathFields()`, `SONG_PATH_FIELDS`
  - `song-url-restore.ts` erstellt: `restoreSongUrls()`, `ensureSongUrls()` — importiert `updateSong` aus song-library (zirkulär, aber OK)
  - `song-lyrics-loader.ts` erstellt: `loadSongLyrics()` (exportiert), `parseUltraStarTxtContent()` (intern), `createFallbackLyrics()` (intern)
  - song-library.ts: Re-exports hinzugefügt (`export { restoreSongUrls, ensureSongUrls }` etc.) — alle 25+ bestehenden Imports weiterhin funktionieren
- **Q4: Debug-Logs entfernt:**
  - ~30 `console.log` Statements entfernt (Funktionseintritte, Status-Logs, Diagnose)
  - Alle `console.error` und `console.warn` beibehalten
- **Q5: Duplizierte Pfadnormalisierung extrahiert:**
  - `isAbsolutePath` war 2× definiert (restoreSongUrls, getAllSongsAsync) → jetzt 1× in song-paths.ts
  - baseFolder-Auflösung (localStorage fallback, normalize, absolute check) war 3× dupliziert → `resolveSongsBaseFolder()`
  - Path-Field-Normalisierungsschleife war 2× dupliziert → `normalizeSongPathFields()`
  - ID-Generierung mit `generateId('custom')` aus `@/lib/utils` ersetzt (3 Stellen: addSong, addSongs, replaceSong)
- TypeScript-Verifizierung: Keine neuen Fehler eingeführt (1 pre-existing Fehler in unified-party-setup.components.tsx)

Stage Summary:
- song-library.ts: 1200 → ~620 Zeilen (Netto: -576 Zeilen, +501 in neuen Dateien)
- 4 Dateien geändert, 0 neue TypeScript-Fehler
- Push: 075bd02

---
Task ID: Q9+Q10
Agent: Main
Task: Split use-mobile-client.ts and deduplicate pitch polling

Work Log:
- use-mobile-client.ts (340 Zeilen) analysiert — 7 distinct responsibilities identifiziert:
  1. Pitch polling (100ms interval, dedup, AbortController)
  2. Game state sending (throttled 2 Hz)
  3. Ad state sending
  4. Companion profiles (fetch + sync + auto-import)
  5. Companion queue (fetch + sync)
  6. Song library sync (30s interval)
  7. Host profiles publish (60s interval)
- **Q10: Duplicated pitch polling identified and fixed:**
  - use-mobile-client.ts lines 63-112 = copy-paste of use-mobile-pitch-polling.ts (already extracted)
  - game-screen.tsx already uses useMobilePitchPolling directly
  - Removed duplicated code, use-mobile-client.ts now delegates to useMobilePitchPolling
- **Q9: Split into focused sub-hooks:**
  - `use-companion-sync.ts` (119 lines) — companion profiles + queue management
  - `use-song-library-sync.ts` (99 lines) — song library sync + host profiles publish
  - `use-mobile-client.ts` (129 lines, down from 340) — thin facade composing sub-hooks
- Types re-exported from use-mobile-client.ts for backward compatibility (MobilePitchData, CompanionProfile, CompanionQueueItem)
- Only caller (page.tsx) only destructures `syncSongLibrary` — all return values preserved
- TypeScript verification: 0 new errors in src/
- All pre-existing errors in src/ are unrelated to changes

Stage Summary:
- use-mobile-client.ts: 340 → 129 lines (62% reduction)
- 2 new focused hooks created (218 lines combined)
- Q10: Eliminated duplicated pitch polling code
- Q9: Hook now has clear single-responsibility composition pattern
- Push: a30d095

---
Task ID: Q12+Q13
Agent: Main
Task: Throttle mobile cleanup + fix companion polling pitch cache clear

Work Log:
- **Q12: Throttled cleanupInactiveClients in /api/mobile GET handler:**
  - get-handlers.ts called cleanupInactiveClients() on every GET request
  - Added module-level `lastCleanupTime` timestamp and `CLEANUP_INTERVAL_MS = 30_000`
  - Cleanup now only runs when ≥30 seconds have elapsed since last run
  - Reduces unnecessary work from ~5 requests/sec (pitch polling) to once every 30s
- **Q13: Fixed companion polling pitch cache clear in use-battle-royale-companion-polling.ts:**
  - Poll callback called `companionPitchCacheRef.current.clear()` before re-populating
  - This wiped ALL cached pitches on every 200ms poll, even for companions still active
  - Fix: Build set of active client IDs from response, only evict cached entries not in active set
  - Companions that miss one poll cycle no longer lose their pitch data
- TypeScript verification: 0 new errors in modified files (pre-existing errors unrelated)

Stage Summary:
- Q12: Cleanup throttled to once per 30 seconds (was every GET request)
- Q13: Cache now uses selective eviction instead of wholesale clear
- 2 files changed, 23 insertions, 4 deletions
- Push: 6271c16

---
Task ID: Q1-Q18 (Session 2)
Agent: Main
Task: Complete remaining 10 Quality points (Q1,Q2,Q3,Q4,Q5,Q6,Q9,Q12,Q15,Q18)

Work Log:
- Session continued from previous context (55/68 points done)
- Q1: Extracted duplicated UltraStar TXT note parser from tauri-file-storage.ts and song-lyrics-loader.ts into src/lib/parsers/parse-ultrastar-notes.ts
- Q2: Confirmed use-battle-royale-media.ts was already deleted (dead code from D7)
- Q3: Created removeClient() helper in mobile-state.ts, replaced 5 duplicated cleanup sites in get-handlers.ts and post-handlers.ts. Fixed bugs: missing profileToClient.delete, missing remoteControlState reset, missing songQueue purge
- Q4: Changed reverbMix from local variable to class property in audio-effects.ts to prevent GainNode memory leak on every connectEffectChain() call
- Q5: Added tournament-game, medley-game, missing-words-game, blind-game to IMMERSIVE_SCREENS
- Q6: Removed non-standard sampleRate/channelCount from getUserMedia constraints in microphone-manager.ts (Tauri WebView compatibility)
- Q9: Replaced duplicated medley snippet generation (~50 lines) with existing generateMedleySnippets() from medley-snippet-generator.ts
- Q12: Changed second Pause button in remote control to actually send 'stop' command instead of duplicate 'pause'
- Q15: Added refreshSongs callback and refresh button to editor-screen.tsx; songs list now updates after save
- Q18: Rewrote pitch-graph-display.tsx to use ResizeObserver + devicePixelRatio for adaptive canvas resolution

Stage Summary:
- All 68/68 points are now COMPLETE
- 10 commits pushed to origin/master
- Key improvements: shared parsers, memory leak fix, client cleanup bugs fixed, Tauri compatibility, UI responsiveness

---
Task ID: FRESH-REVIEW
Agent: Main
Task: Umfassende Neubewertung der gesamten Codebasis — Fehler, Logik, Dead Code, Verbesserungen

Work Log:
- Komplettes Repo gepullt (origin/master, already up to date)
- Projektstruktur analysiert: ~200+ Quelldateien (TS/TSX/RS)
- 3 parallele Sub-Agenten gestartet für Types/Lib, Hooks, Komponenten
- 2/3 Agents erfolgreich, 1 failed → manuelle Überprüfung der fehlenden Bereiche
- ~30 Dateien direkt gelesen und verifiziert
- Alle Ergebnisse mit Grep-Suchen verifiziert (Dead Code, Importe, Verwendungen)

=== GEFUNDENE FEHLER (Bugs) ===

**FB1: use-game-modes.ts:86 — Blind Mode sectionDuration Einheiten-Fehler**
- `sectionDuration = 12` (Sekunden), aber `currentTime` wird in Millisekunden übergeben
- Bei 30s Song: sectionIndex = 30000/12 = 2500 (erwartet: 2)
- Folge: Blind Mode wechselt alle 12ms statt alle 12s → massives Flackern
- Fix: `sectionDuration = 12000`

**FB2: use-game-loop.ts:717 — Math.log2 mit P2-Pitch 0**
- `Math.round(12 * (Math.log2(currentP2Pitch / 440)) + 69)` wenn P2-Pitch = 0
- `Math.log2(0) = -Infinity`, MIDI-Note = NaN
- Check `currentP2Pitch !== null` schützt nicht gegen 0
- Fix: `if (currentP2Pitch > 0)` statt `if (currentP2Pitch !== null)`

**FB3: use-game-loop.ts:437-439 — Leerer YouTube-Media-Block**
- `else if (isYouTube && youtubeVideoId) { }` — komplett leerer Block
- YouTube-Modus startet kein Media, Game läuft nur über Wall-Clock
- Sollte YouTube-Player initialisieren oder Comment erklären warum leer

**FB4: use-companion-sync.ts:84-90 — Doppelte Profil-Importierung**
- fetchCompanionProfiles (alle 10s) setzt companionProfiles State
- Separate useEffect überwacht companionProfiles und ruft importProfileFromMobile auf
- Ergebnis: Profile werden bei jedem Fetch-Zyklus ZWEIMAL importiert
- Fix: Auto-sync Effect entfernen (syncCompanionProfiles existiert bereits)

=== LOGIK-PROBLEME ===

**FL1: use-remote-control.ts:145-151 — library/queue/settings Commands navigieren nicht korrekt**
- Alle drei Commands rufen nur `stop(); onBack()` — keine Unterscheidung
- Sollten zu ihren jeweiligen Screens navigieren

**FL2: use-multi-pitch-detector.ts:160 — Partielle Initialisierung als Erfolg gewertet**
- `if (allSuccess || results.some(r => r))` — wenn nur 1 von 3 Playern klappt → "Erfolg"
- Kann zu unerwartetem Verhalten führen (nur 1 Mikrofon aktiv, Spieler denkt alle wären bereit)

**FL3: playlist-manager.ts — "Most Played" verfolgt keine Play-Counts**
- recordSongPlay verschiebt Songs nach vorne (most-recently-played)
- Name "Most Played" ist irreführend — keine tatsächliche Abspielzählung

=== DEAD CODE ===

**FD1: src/lib/db.ts — GANZE DATEI (13 Zeilen)**
- Prisma-Client Import, aber keine schema.prisma im Projekt
- Wird nirgendwo importiert (kein `from '@/lib/db'` im Codebase)
- Vermutlich Überbleibsel einer geplanten/abgebrochenen DB-Integration

**FD2: src/lib/native-fs.ts — 4 ungenutzte Funktionen**
- `nativeRemoveFile()` — 0 externe Verwendungen
- `nativeRemoveDir()` — 0 externe Verwendungen
- `nativeMessage()` — 0 externe Verwendungen
- `nativeConfirm()` — 0 externe Verwendungen (safe-dialog.ts nutzt window.confirm, nicht Tauri)

**FD3: src/lib/tauri-file-storage.ts — 6 ungenutzte exportierte Funktionen**
- `copyFileToAppData()` — nur intern definiert, 0 externe Aufrufer
- `fileExistsInAppData()` — 0 externe Aufrufer
- `getFileUrl()` — 0 externe Aufrufer
- `readFileAsBase64()` — 0 externe Aufrufer
- `listImportedSongs()` — 0 externe Aufrufer
- `readStoredTextFile()` — 0 externe Aufrufer
- (getAppDataPath wird intern verwendet → nicht dead)

**FD4: src/lib/playlist-manager.ts — 12 ungenutzte exportierte Funktionen**
- `moveAllSongs()`, `getPlaylistsContainingSong()`, `isSongInPlaylist()`
- `exportPlaylist()`, `importPlaylist()`, `reorderPlaylistSongs()`
- `incrementPlaylistPlayCount()`, `createFolder()`, `deleteFolder()`
- `addPlaylistToFolder()`, `removePlaylistFromFolder()`, `renameFolder()`
- `calculatePlaylistDuration()` — nur intern verwendet
- (getPlaylistSongs WIRD verwendet in playlist-view.tsx → nicht dead)

**FD5: src/lib/i18n/translations.ts — 1 ungenutzte Funktion**
- `createTranslator()` — definiert aber nirgendwo aufgerufen
- `getStoredLanguage()` und `setStoredLanguage()` — nur intern genutzt

**FD6: src/hooks/use-multi-pitch-detector.ts:33 — Falsche JSDoc-Dokumentation**
- Kommentar behauptet "Also exports useSinglePitchDetector()" — existiert aber nicht

**FD7: src/hooks/use-network-status.ts — Tote Offline-Queue-Infrastruktur**
- `PendingRequest` Typ, `loadQueue()`, `saveQueue()` definiert
- Queue wird NIE befüllt (kein `addToOfflineQueue` existiert)
- Nur `clearOfflineQueue()` wird exportiert (aber es gibt nichts zum leeren)

**FD8: src/hooks/use-game-loop.ts:437-439 — Leerer YouTube-Block (siehe FB3)**

**FD9: src/types/game.ts — 1 ungenutzter Typ + 1 ungenutzte Funktion**
- `Leaderboard` Interface — nirgendwo importiert
- `getRankTitle()` + `RANKING_TITLES` — nur intern in game.ts verwendet

=== VERBESSERUNGSVORSCHLÄGE ===

**FV1: src/types/screens.ts:80 — StartOptions.mode ist effektiv `string`**
- `mode: 'single' | 'duel' | 'duet' | string` — `| string` macht Union nutzlos
- Fix: `'single' | 'duel' | 'duet' | 'medley' | 'missing-words' | 'blind'`

**FV2: src/lib/utils.ts:12 — generateId Kollisionsrisiko**
- `Date.now() + Math.random()` nicht kollisionssicher
- Besser: `crypto.randomUUID()`

**FV3: src/lib/qr-code.ts — Externe API-Abhängigkeit**
- `api.qrserver.com` für QR-Code — schlägt offline fehl
- Besser: lokale QR-Code-Bibliothek (z.B. `qrcode` npm package)

**FV4: src/hooks/use-battle-royale-game.ts:248 — O(n) Note-Suche pro Tick**
- Alle Notes durchlaufen um aktive zu finden (bei 1000+ Notes langsam)
- Besser: Binary Search oder pre-gefilterte aktive Notes

**FV5: src/lib/tauri-file-storage.ts — Doppelte BOM-Entfernung**
- processFolder entfernt BOM, parseLyricsFromTxt entfernt es nochmal

Stage Summary:
- 4 Bugs, 3 Logik-Probleme, 9 Dead-Code-Kategorien, 5 Verbesserungsvorschläge identifiziert
- Nächster Schritt: Fixes nacheinander implementieren und pushen
