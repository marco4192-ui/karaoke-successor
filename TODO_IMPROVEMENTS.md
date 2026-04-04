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

### 🔧 Echte Probleme (zu beheben)

- [ ] **#32** `game-screen.tsx:216` useSongEnergy(audioRef.current) — AnalyserNode + Source-Leak
  - Problem: `useSongEnergy` erhält DOM-Node-Wert statt Ref. Jeder Effect-Lauf erstellt neue AnalyserNode ohne alte zu trennen.
  - Zusätzlich: `sourceRef.current` wird nie zurückgesetzt → wenn sich Audio-Element ändert, bleibt alte Source auf dem alten Element.
  - Effekt: Audio-Node-Leak bei jedem Song-Wechsel, abnehmende Performance.

- [ ] **#35** `use-game-media.ts:144-161` waitForMediaEvent — Listener-Leak bei Timeout
  - Problem: `addEventListener` mit `{ once: true }` wird registriert. Wenn Timeout zuerst feuert, bleibt Listener bis zum Event oder GC hängen.
  - Fix: Listener explizit mit `AbortController` entfernen.

- [ ] **#36** `game-screen.tsx:389-403` Audio Effects — Zweites getUserMedia für Mikrofon
  - Problem: AudioEffectsEngine ruft `navigator.mediaDevices.getUserMedia({ audio: true })` auf, aber PitchDetector hat bereits Mikrofon-Zugriff. Doppelter Stream = Verschwendung + doppelte Berechtigungs-Abfrage in Tauri.
  - Fix: Den existierenden MediaStream vom PitchDetector wiederverwenden oder MediaStream.clone() nutzen.

- [ ] **#28** `duet-note-highway.tsx:175` + `single-player-lyrics.tsx:155` — `gameMode as any` Type-Cast
  - Problem: `gameMode` wird mit `as any` an LyricLineDisplay übergeben, obwohl korrekter GameMode-Typ verfügbar.
  - Fix: Korrekten Typ `gameMode as GameMode` verwenden oder Props-Typ korrigieren.

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
