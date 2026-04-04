# Karaoke Successor - To-Do Liste für Verbesserungen und Fehlerbehebungen

Erstellt: 2026-04-04
Letztes Update: 2026-04-04

---

## ABGESCHLOSSEN ✅

- [x] **#1** PitchDetectorManager Import bricht Build — `use-multi-pitch-detector.ts` → `ea8a8e5`
- [x] **#2** Duplicate NoteShapeStyle Typdefinition — `note-utils.tsx` vs `screens.ts` → `e26e278`
- [x] **#4** useStarPower Hook: Space-Key kollidiert mit Game-Controls → Star Power komplett entfernt
- [x] **#7** Doppelte Pitch-Polling (useMobileClient + Game-Screen) → `6a4753a`
- [x] **#8** useGameSettings Polling alle 500ms optimieren → `29da881`
- [x] **#9** Race Condition in checkNoteHits — stale closure über activePlayer → `b47fb2f`
- [x] **#11** useNoteScoring — checkPlayerNoteHits Abhängigkeits-Problem → `f88bebc`
- [x] **#14** handleTournamentGameEnd — setResults mit falschem Typ → `b569654`
- [x] **#15** PitchDetector Singleton Reset bei Song-Wechsel → `6de0f04`
- [x] **#16** Blind Mode nutzt Math.random() in useEffect — Flackern → `f0ac080`
- [x] **#17** Missing Words Mode generiert bei jedem Render neue Indizes → `f0ac080`
- [x] **#19** Busy-Waiting bei Media-Laden durch Event-basiertes Laden ersetzen → `8d7d7c4`
- [x] Star Power komplett aus Codebase entfernt (Feature)
- [x] Live Streaming komplett aus Codebase entfernt (Feature)

---

## KRITISCHE FEHLER (Break/Must-Fix)

- [ ] **#5** Game-Screen ist ~1760 Zeilen — God-Component auftrennen
- [ ] **#6** Doppelte Media-Initialisierung und URL-Wiederherstellung aufräumen
- [ ] **#10** AudioManager.loadAudio — createMediaElementSource Guard
- [ ] **#13** SongLibrary.saveCustomSongs — localStorage Overflow (→ IndexedDB)

## MITTEL-PRIORITÄT

- [ ] **#12** Star Power Charge aus Scoring komplett entfernt? (prüfen)
- [ ] **#18** Tauri-spezifische Checks fehlen in vielen Dateien
- [ ] **#20** Globaler State in page.tsx statt Context/Zustand
- [ ] **#22** Kein Cleanup für getAllSongs() Cache

## NIEDRIGE PRIORITÄT

- [ ] **#21** Duplicated Icons in page.tsx

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
