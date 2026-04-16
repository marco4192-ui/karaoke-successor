# Karaoke Successor - To-Do Liste für Verbesserungen und Fehlerbehebungen

Erstellt: 2026-04-04
Letztes Update: 2026-04-17

---

## ALLE KRITISCHEN FEHLER BEHOBEN ✅

- [x] **#1** PitchDetectorManager Import bricht Build — `ea8a8e5`
- [x] **#2** Duplicate NoteShapeStyle Typdefinition — `e26e278`
- [x] **#4** useStarPower Hook: Space-Key kollidiert → Star Power komplett entfernt
- [x] **#5** Game-Screen God-Component (1699→1124 Zeilen) — `f131360`
- [x] **#6** Doppelte Media-Initialisierung konsolidiert — `83310c6`
- [x] **#7** Doppelte Pitch-Polling entfernt — `6a4753a`
- [x] **#8** useGameSettings 500ms Polling entfernt — `29da881`
- [x] **#9** Race Condition in checkNoteHits — `b47fb2f`
- [x] **#10** AudioManager createMediaElementSource Guard — `2b927a7`
- [x] **#11** checkPlayerNoteHits Abhängigkeits-Problem — `f88bebc`
- [x] **#12** Star Power Charge aus Scoring entfernt (verifiziert)
- [x] **#13** localStorage → IndexedDB Migration — `4cbe71d`
- [x] **#14** handleTournamentGameEnd Typ-Mismatch — `b569654`
- [x] **#15** PitchDetector Singleton Reset — `6de0f04`
- [x] **#16** Blind Mode Math.random() Flackern — `f0ac080`
- [x] **#17** Missing Words Mode Render-Flicker — `f0ac080`
- [x] **#18** Tauri-spezifische Checks (5 Dateien) — `cdd98c7`
- [x] **#19** Busy-Waiting → Event-basiertes Laden — `8d7d7c4`
- [x] **#20** Global State → Zustand usePartyStore — `534d68b`
- [x] **#21** Duplizierte Icons (87 Zeilen entfernt) — `360b968`
- [x] **#22** getAllSongs() Cache TTL + Cleanup — `d8216ba`
- [x] Star Power komplett aus Codebase entfernt (Feature)
- [x] Live Streaming komplett aus Codebase entfernt (Feature)

---

## CODE-REVIEW RUND 2 (2026-04-05)

### ✅ Falsch-Positive (bereits behoben oder nicht existent)

- [x] ~~**#23** `spectrogram.ts` Duplicate identifier `maxDecibels`~~ — FALSCH POSITIV: `minDecibels` und `maxDecibels` sind verschiedene Properties, kein Duplikat
- [x] ~~**#24** `party-store.ts` medleySongs Typ~~ — BEREITS BEHOBEN: Verwendet korrekt `MedleySong[]`
- [x] ~~**#25** `page.tsx` setGameMode(null)~~ — FALSCH POSITIV: `setGameMode(null)` existiert nicht im Code
- [x] ~~**#26** `game-screen.tsx` visibleNotes fehlt `lineIndex`~~ — BEREITS BEHOBEN: `lineIndex` wird durch Spread-Operator erhalten
- [x] ~~**#27** `ultrastar-parser.ts` DuetPlayer-Typ~~ — FALSCH POSITIV: DuetPlayer-Typ enthält bereits `'both'`
- [x] ~~**#29** `use-game-loop.ts` Audio src Reset~~ — BEREITS BEHOBEN: Guard mit src-Vergleich existiert
- [x] ~~**#30** `use-game-media.ts` Timeout→mediaLoaded~~ — BY DESIGN: Timeout soll nicht den Spielablauf blockieren
- [x] ~~**#31** `use-game-loop.ts` Cleanup Dependency~~ — FALSCH POSITIV: `setAudioEffects` IST im Dependency-Array
- [x] ~~**#33** `song-library.ts` loadCustomSongsFromStorage() nie aufgerufen~~ — FALSCH POSITIV: Wird in page.tsx aufgerufen
- [x] ~~**#34** `use-game-loop.ts` players[0] undefined~~ — BEREITS BEHOBEN: Null-Check existiert

### ✅ Echte Probleme (behoben)

- [x] **#32** `visual-effects.tsx` useSongEnergy — AnalyserNode + Source-Leak — `5d99cb9`
  - Fix: `sourceElementRef` trackt Audio-Element-Identität, Source wird bei Element-Wechsel zurückgesetzt
  - Fix: AnalyserNode wird in Cleanup korrekt disconnected
  - Resultat: Kein AudioNode-Leak mehr bei Song-Wechseln

- [x] **#35** `use-game-media.ts` waitForMediaEvent — Listener-Leak bei Timeout — `5d99cb9`
  - Fix: AbortController entfernt Listener bei Timeout
  - Fix: `settled`-Flag verhindert Double-Resolve
  - Resultat: Keine orphaned Listener mehr

- [x] **#36** `game-screen.tsx` Audio Effects — Lazy Init statt doppeltem getUserMedia — `5d99cb9`
  - Fix: Audio Effects werden erst bei Panel-Öffnung initialisiert, nicht bei Spielstart
  - Fix: Gleiche Audio-Constraints wie PitchDetector (echo cancel, noise suppression)
  - Resultat: Kein unnötiger zweiter Mikrofon-Stream

- [x] **#28** `duet-note-highway.tsx` + `single-player-lyrics.tsx` — `gameMode as any` → Union-Type — `5d99cb9`
  - Fix: `as any` ersetzt durch `as 'standard' | 'missing-words' | 'duel' | 'blind' | 'duet'`
  - Resultat: Vollständige Typsicherheit

---

## CODE-REVIEW RUND 3 (2026-04-05) — Re-Audit + Dateigrößen-Reduzierung ✅ ALLE ABGESCHLOSSEN

### 🔧 Code-Qualität & Aufräumen — Alle bereits vorher behoben

- [x] **#37** `game-screen.tsx` — Dreifache visibleNotes Code-Duplikation — BEREITS BEHOBEN: `getVisibleNotes()` Utility existiert
- [x] **#38** `game-screen.tsx` — Konstanten innerhalb der Component — BEREITS BEHOBEN: Konstanten in `note-utils.tsx` ausgelagert
- [x] **#39** `game-screen.tsx` — Unused Import `Badge` — BEREITS BEHOBEN: Import existiert nicht mehr
- [x] **#42** `use-multi-pitch-detector.ts` — Unused Import — BEREITS BEHOBEN: `resetPitchDetectorManager` nicht mehr importiert
- [x] **#40** `game-screen.tsx` — Video-Background — BEREITS BEHOBEN: `GameBackground.tsx` Component existiert
- [x] **#41** `library-cache.ts` — SSR Guard — BEREITS BEHOBEN: `typeof indexedDB === 'undefined'` Guard in `openDatabase()`

### 🏗️ Dateigrößen-Reduzierung durch Auslagerung — ALLE ABGESCHLOSSEN

- [x] **#43** `settings-screen.tsx` — **1848 → 314 Zeilen (83% Reduzierung)** ✅ `4179153`, `54083ce`
  - 7 Tab-Components extrahiert: settings-icons.tsx, library-tab.tsx, graphic-sound-tab.tsx, general-tab.tsx, about-tab.tsx, webcam-tab.tsx, mobile-device-section.tsx
  - `useFolderScanner` Hook (389 Zeilen): Folder scanning, browsing, library reset
  - `SettingsTabBar` Component (50 Zeilen): Tab navigation

- [x] **#44** `results-screen.tsx` — **1319 → 383 Zeilen (71% Reduzierung)** ✅ `c5df146`
  - 7 Components extrahiert: constants.tsx, song-highscore-modal.tsx, score-visualization.tsx, upload-status.tsx, song-leaderboard-preview.tsx, share-section.tsx, queue-next-song.tsx

- [x] **#45** `page.tsx` — **749 → 332 Zeilen (56% Reduzierung)** ✅ `54083ce`
  - 3 Components extrahiert: navbar.tsx, party-setup-section.tsx, party-game-screens.tsx

### 📊 Zusammenfassung der Dateigrößen-Reduzierung

| Datei | Vorher | Nachher | Reduzierung |
|-------|--------|---------|-------------|
| settings-screen.tsx | 1848 | 314 | -83% |
| results-screen.tsx | 1319 | 383 | -71% |
| page.tsx | 749 | 332 | -56% |
| game-screen.tsx | 1124 | 965 | -14% |
| **Gesamt** | **5040** | **1994** | **-60%** |

---

## CODE-REVIEW RUND 4 (2026-04-05) — Proaktive Dateigrößen-Reduzierung ✅ ALLE ABGESCHLOSSEN

### 🏗️ Weitere Dateigrößen-Reduzierung — 10 Dateien refaktoriert

- [x] **#46** `game-screen.tsx` — **965 → 651 Zeilen (33% Reduzierung)** ✅ `2df835c`
  - 5 Module extrahiert: useGameAudioEffects, useYouTubeGame, useGameModes, useMobileGameSync, game-hud.tsx

- [x] **#47** `mobile-client-view.tsx` — **1911 → 189 Zeilen (90% Reduzierung)** ✅ `3b1ce38`
  - 7 Module extrahiert: mobile-types, mobile-icons, remote-control-view, mobile-views (8 Views), use-mobile-connection, use-mobile-pitch-detection, use-mobile-data

- [x] **#48** `library-screen.tsx` — **1904 → 278 Zeilen (85% Reduzierung)** ✅ `de3a279`
  - 13 Module extrahiert: types, icons, utils, song-card, song-start-modal, playlist-view, add-to-playlist-modal, folder-view, library-filters, create-playlist-form/modal, use-library-filters, use-library-preview

- [x] **#49** `karaoke-editor.tsx` — **1338 → 246 Zeilen (82% Reduzierung)** ✅ `7daa3cb`
  - 8 Module extrahiert: editor-header, tools-panel, editor-note-tab, editor-song-info-tab, editor-metadata-tab, use-editor-history, use-editor-playback, use-editor-keyboard-shortcuts

- [x] **#50** `battle-royale-screen.tsx` — **1176 → 82 Zeilen (93% Reduzierung)** ✅ `53bd2b3`
  - 8 Module extrahiert: use-battle-royale-game, setup-screen, playing-view, round-setup-view, elimination-view, winner-view, player-card, lyrics-display

- [x] **#51** `character-screen.tsx` — **871 → 149 Zeilen (83% Reduzierung)** ✅ `680849b`
  - 6 Module extrahiert: country-options, profile-sync-section, character-card, create-character-form, player-progression-card, character-settings-card

- [x] **#52** `jukebox-screen.tsx` — **834 → 25 Zeilen (97% Reduzierung)** ✅ `1c3d81c`
  - 4 Module extrahiert: jukebox-types, use-jukebox, jukebox-setup-view, jukebox-player-view

- [x] **#53** `import-screen.tsx` — **775 → 96 Zeilen (88% Reduzierung)** ✅ `4e75dc9`
  - 6 Module extrahiert: import-types, use-import-screen, drop-zone, ultrastar-tab, folder-scan-tab, import-preview

- [x] **#54** `unified-party-setup.tsx` — **869 → 75 Zeilen (91% Reduzierung)** ✅ `03051c2`
  - 4 Module extrahiert: types, config, hook, components (7 UI-Komponenten)

- [x] **#55** `microphone-settings-panel.tsx` — **839 → 149 Zeilen (82% Reduzierung)** ✅ `add120c`
  - 4 Module extrahiert: microphone-card, microphone-presets, use-microphone-settings, settings-icons

### 📊 Gesamtzusammenfassung Dateigrößen-Reduzierung (alle Runden)

| Runde | Dateien | Zeilen davor | Zeilen danach | Reduzierung |
|-------|---------|-------------|---------------|-------------|
| Runde 3 | 4 | 5040 | 1994 | -60% |
| Runde 4 | 10 | 9707 | 1940 | -80% |
| **Gesamt** | **14 Dateien** | **14747** | **3934** | **-73%** |

---

## CODE-REVIEW RUND 5 (2026-04-17) — Dead Code Analyse + Hook-Bugfixes

### 📝 Dead Code Analysis — 28 vollständig tote Dateien annotiert

Alle Dateien mit JSDoc-Kommentaren versehen, die mögliche Funktion und
Revival-Potenzial dokumentieren. Dead Code wurde NICHT gelöscht.

**Tote Hooks (6 Dateien, ~1.088 Zeilen):**
- `use-audio-effects.ts` — Ersetzt durch useGameAudioEffects (lazy init)
- `use-current-lyrics.ts` — Logik inline in game-screen.tsx dupliziert
- `use-duel-mode.ts` — P2-Scoring direkt in game-screen/useGameModes
- `use-i18n.ts` — App nutzt t() direkt statt React-Hook
- `use-multi-pitch-detector.ts` — Multi-Mic-Pitch nie integriert
- `use-practice-mode.ts` — Practice-Panel verwaltet eigenen State

**Tote Lib-Dateien (10 Dateien, ~3.131 Zeilen):**
- `auth-service.ts` — Profile direkt via user-db verwaltet
- `audio-manager.ts` — Audio über hooks/native-audio verwaltet
- `video-player.ts` — Video über youtube-player/GameBackground
- `gameplay-features.ts` — Achievements/DailyChallenge woanders
- `pwa.ts` — Tauri-only App, PWA nicht relevant
- `audio-analyzer.ts` — YIN-Pitch-Detection für Auto-Transkription
- `lyric-editor.ts` — Reducer-Pattern nie integriert
- `multi-format-import.ts` — Nur UltraStar-Parser aktiv
- `song-storage.ts` — IndexedDB-Cache reicht aus
- `theme-config.ts` — themes.ts verwendet andere Presets

**Tote Components (12 Dateien, ~4.079 Zeilen):**
- `audio-effects-panel.tsx`, `background-video.tsx`, `note-lane.tsx`,
  `single-player-highway.tsx`, `youtube-background-player.tsx`, `player-card.tsx`,
  `ai-assistant-panel.tsx`, `online-leaderboard.tsx`, `multiplayer-lobby-screen.tsx`,
  `character-screen-enhanced.tsx`, `player-profile-panel.tsx`, `library-settings-tab.tsx`,
  `user-profile-screen.tsx`

**Dead Exports annotiert (scoring.ts: 10, store.ts: 9):**
- scoring.ts: SCORING_TICK_INTERVAL, GOLDEN_NOTE_MULTIPLIER, PERFECT_NOTE_MULTIPLIER,
  PERFECT_GOLDEN_MULTIPLIER, TickEvaluation, getPitchClass, getRelativePitchDiff,
  calculateFinalRating, getRatingColor, getRatingText
- store.ts: selectGameState, selectCurrentSong, selectPlayers, selectDifficulty,
  selectGameMode, selectProfiles, selectActiveProfile, selectQueue, selectHighscores

### 🔧 Hook-Bugfixes — 7 kritische Issues behoben

- [x] **#56** `use-game-loop.ts` — Game Loop 10Hz Restart durch endGameAndCleanup Chain — `7eb5347`
  - Fix: endGameAndCleanupRef pattern — verhindert Game-Loop-Restart bei jedem Scoring-Tick
  - Ursache: players → generateResults → endGameAndCleanup Dependency-Kette

- [x] **#57** `use-game-loop.ts` — Media Watchdog stale nativeAudioTime — `7eb5347`
  - Fix: nativeAudioTimeRef.current statt Closure-Wert
  - Ursache: Watchdog-closure fing nativeAudioTime=0 ein (vor Native-Audio-Start)

- [x] **#58** `use-medley-game.ts` — Game Loop 50Hz Restart durch pitchResult — `c10f009`
  - Fix: pitchResultRef pattern (gleiches Muster wie use-game-loop.ts)
  - Ursache: pitchResult in Dependency-Array, Updated ~50x/Sekunde

- [x] **#59** `use-mobile-client.ts` — 60 HTTP Requests/Sekunde — `c10f009`
  - Fix: Throttle auf max 2 Hz (500ms Intervall)
  - Ursache: currentTime in useCallback-Dependencies → useEffect bei jedem Frame

- [x] **#60** `use-game-media.ts` — Race Condition bei schnellem Song-Wechsel — `c10f009`
  - Fix: Cancellation-Flag Pattern
  - Ursache: Async restoreUrls() ohne Abbruch-Möglichkeit

### ⚠️ Offene Hook-Issues (mittlere/niedrige Priorität)

- [ ] **#61** `use-battle-royale-game.ts` — Game Loop stale closures (pitchResult, game state)
- [ ] **#62** `use-battle-royale-game.ts` — Simultaneous score updates lose intermediate results
- [ ] **#63** `use-battle-royale-game.ts` — Async initGame not cancelled on effect cleanup
- [ ] **#64** `use-battle-royale-game.ts` — 4s setTimeout in handleRoundEnd not cleaned up
- [ ] **#65** `use-mobile-pitch-detection.ts` — Stale isPlaying/songEnded in startMicrophone
- [ ] **#66** `use-mobile-pitch-detection.ts` — No unmount cleanup for microphone
- [ ] **#67** `use-websocket.ts` — createRoom/joinRoom listeners never removed
- [ ] **#68** `use-note-scoring.ts` — notePerformance Map grows unboundedly during gameplay

---

## ERWEITERUNGSIDEEN (für später)

- [ ] **A.1** useNoteScoring in Web Worker auslagern
- [ ] **A.2** Virtual Scrolling für Song-Bibliothek
- [ ] **A.3** React.memo für Note-Highway und Score-Display
- [ ] **A.4** Debounce für updatePlayer Aufrufe
- [ ] **B.1** Server-seitige Scoring-Validierung
- [ ] **B.2** Replay-System
- [ ] **B.3** ELO-Rating für Multiplayer
- [ ] **C.1** Native File Dialog für Song-Import
- [ ] **C.2** Native Audio Processing über Tauri Commands
- [ ] **C.3** Tauri Plugin für System-Media-Controls
- [ ] **C.4** Offline-Modus mit lokaler SQLite
- [ ] **D.1** Waveform-basiertes Note-Editing
- [ ] **D.2** Auto-Beat-Detection aus Audiosignal
- [ ] **D.3** Import von Vocaluxe/UltraStar-Datenbanken
