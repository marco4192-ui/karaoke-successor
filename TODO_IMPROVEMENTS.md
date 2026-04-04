# Karaoke Successor - To-Do Liste für Verbesserungen und Fehlerbehebungen

Erstellt: 2026-04-04
Letztes Update: 2026-04-04

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

## NEUE FEHLER (Code-Review 2026-04-04)

- [ ] **#23** `spectrogram.ts:14-15` Duplicate identifier `maxDecibels` — Build-Error
- [ ] **#24** `party-store.ts:45` medleySongs ist `Song[]` aber muss `MedleySong[]` sein — 6× TS-Error in page.tsx
- [ ] **#25** `page.tsx:378,443,475` setGameMode(null) — GameMode|null nicht erlaubt, null-Check fehlt
- [ ] **#26** `game-screen.tsx:968,969,993` visibleNotes fehlt `lineIndex` Property für NoteWithLine
- [ ] **#27** `ultrastar-parser.ts:654` DuetPlayer-Typ erlaubt 'both' nicht, aber Code erzeugt es
- [ ] **#28** `duet-note-highway.tsx:175` + `single-player-lyrics.tsx:155` GameMode string→enum Typfehler
- [ ] **#29** `use-game-loop.ts:297-300` Audio src wird bei jedem Countdown-Start neu gesetzt → Playback zurückgesetzt
- [ ] **#30** `use-game-media.ts:163-201` Media-Warte-Timeout setzt mediaLoaded=true auch bei Fehlschlag
- [ ] **#31** `use-game-loop.ts:374-397` Unmount-Cleanup: audioEffects Dependency fehlt setAudioEffects
- [ ] **#32** `game-screen.tsx:213` useSongEnergy(audioRef.current) übergibt DOM-Node statt Ref
- [ ] **#33** `song-library.ts` loadCustomSongsFromStorage() wird nie aufgerufen — App startet nur mit localStorage
- [ ] **#34** `use-game-loop.ts:118-119` players[0] kann undefined sein wenn Spiel endet ohne Spieler
- [ ] **#35** `use-game-media.ts` Media-Event-Listener wird nie entfernt (addEventListener ohne cleanup)

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
