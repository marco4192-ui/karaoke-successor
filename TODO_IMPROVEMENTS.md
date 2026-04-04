# Karaoke Successor - To-Do Liste für Verbesserungen und Fehlerbehebungen

Erstellt: 2026-04-04
Letztes Update: 2026-04-05

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

## CODE-REVIEW RUND 3 (2026-04-05) — Re-Audit + Dateigrößen-Reduzierung

### 🔧 Code-Qualität & Aufräumen

- [ ] **#37** `game-screen.tsx` — Dreifache visibleNotes Code-Duplikation
  - Die drei useMemo-Hooks `visibleNotes`, `p1VisibleNotes`, `p2VisibleNotes` (Zeilen 633-742) haben identische Binary-Search-Logik
  - Fix: Gemeinsame Utility-Funktion `getVisibleNotes()` erstellen und wiederverwenden
  - Erwartete Reduzierung: ~70 Zeilen

- [ ] **#38** `game-screen.tsx` — Konstanten innerhalb der Component-Funktion
  - `SING_LINE_POSITION`, `NOTE_WINDOW`, `VISIBLE_TOP`, `VISIBLE_BOTTOM`, `VISIBLE_RANGE` werden bei jedem Render neu erstellt
  - Fix: Als `const` außerhalb der Komponente definieren

- [ ] **#39** `game-screen.tsx` — Unused Import `Badge`
  - `Badge` wird importiert (Zeile 5) aber nie verwendet
  - Fix: Import entfernen

- [ ] **#42** `use-multi-pitch-detector.ts` — Unused Import `resetPitchDetectorManager`
  - Wird importiert (Zeile 7) aber nie im File benutzt
  - Fix: Import entfernen

### 🏗️ Dateigrößen-Reduzierung durch Auslagerung

- [ ] **#40** `game-screen.tsx` (1142 Zeilen) — Video-Background Sektion auslagern
  - Die Video-Background-Rendering-Logik (Zeilen 858-951) ist ~95 Zeilen lang mit komplexer Verschachtelung
  - Fix: In `GameBackground.tsx` Component auslagern
  - Erwartete Reduzierung: ~80 Zeilen

- [ ] **#43** `settings-screen.tsx` (1848 Zeilen) — Größte Datei, dringend aufteilen
  - Fix: Tabs in separate Components auslagern (MicrophoneTab, LibraryTab, EditorTab, AIAssetsTab, etc.)
  - Erwartete Reduzierung: Ziel < 400 Zeilen

- [ ] **#44** `results-screen.tsx` (1319 Zeilen) — Aufteilen
  - Fix: Score-Zusammenfassung, Statistik-Details, Action-Buttons in eigene Components
  - Erwartete Reduzierung: Ziel < 500 Zeilen

- [ ] **#45** `page.tsx` (749 Zeilen) — Weiter reduzieren
  - Fix: Song-Auswahl, Party-Modus-Setup, Screen-Navigation in eigene Hooks/Components
  - Erwartete Reduzierung: Ziel < 500 Zeilen

### 🛡️ Sicherheit & Guards

- [ ] **#41** `library-cache.ts` — Fehlender typeof window Guard
  - Fix #18 sollte SSR-Guards in 5 Dateien hinzufügen, aber `library-cache.ts` hat keinen Guard
  - Fix: `typeof window === 'undefined'` Guard hinzufügen

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
