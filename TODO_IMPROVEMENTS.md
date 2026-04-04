# Karaoke Successor - To-Do Liste für Verbesserungen und Fehlerbehebungen

Erstellt: 2026-04-04

---

## KRITISCHE FEHLER (Break/Must-Fix)

- [ ] **#1** PitchDetectorManager Import bricht Build — `use-multi-pitch-detector.ts`
- [ ] **#2** Duplicate NoteShapeStyle Typdefinition — `note-utils.tsx` vs `screens.ts`
- [ ] **#4** useStarPower Hook: Space-Key kollidiert mit Game-Controls (prüfen ob noch vorhanden)
- [ ] **#9** Race Condition in checkNoteHits — stale closure über activePlayer
- [ ] **#11** useNoteScoring — checkPlayerNoteHits Abhängigkeits-Problem
- [ ] **#12** Star Power Charge aus Scoring komplett entfernt? (prüfen)
- [ ] **#14** handleTournamentGameEnd — setResults mit falschem Typ
- [ ] **#16** Blind Mode nutzt Math.random() in useEffect — Flackern
- [ ] **#17** Missing Words Mode generiert bei jedem Render neue Indizes

## MITTEL-PRIORITÄT

- [ ] **#5** Game-Screen ist ~1760 Zeilen — God-Component auftrennen
- [ ] **#6** Doppelte Media-Initialisierung und URL-Wiederherstellung aufräumen
- [ ] **#7** Doppelte Pitch-Polling (useMobileClient + Game-Screen)
- [ ] **#8** useGameSettings Polling alle 500ms optimieren
- [ ] **#10** AudioManager.loadAudio — createMediaElementSource Guard
- [ ] **#13** SongLibrary.saveCustomSongs — localStorage Overflow
- [ ] **#19** Busy-Waiting bei Media-Laden durch Event-basiertes Laden ersetzen

## NIEDRIGE PRIORITÄT

- [ ] **#15** PitchDetector Singleton Reset bei Song-Wechsel
- [ ] **#18** Tauri-spezifische Checks fehlen in vielen Dateien
- [ ] **#20** Globaler State in page.tsx statt Context/Zustand
- [ ] **#21** Duplicated Icons in page.tsx
- [ ] **#22** Kein Cleanup für getAllSongs() Cache

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
