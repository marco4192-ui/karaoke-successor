# Review 9 — Worklog

## Setup
- Repo geklont und mit origin/master synchronisiert
- Branch: master, Remote: origin (GitHub)

---

## H-Priorität Fixes (H1-H20)

### H1: visual-effects.tsx — AudioContext/AnalyserNode Cleanup ✅ BEREITS BEHOBEN
- Cleanup war bereits in Zeilen 746-764 implementiert (disconnect, close, cancelAnimationFrame)

### H2: ptm-game-screen.tsx — Timer-Leak in Countdown-Retry ✅ FIXIERT
- `return () => clearTimeout(retryId)` wurde von `setCountdown` Updater als State-Wert interpretiert
- Fix: `countdownRetryRef` hinzugefügt, Timer-ID im Ref gespeichert, Cleanup in Unmount-Effect
- Commit: 2851d22

### H3: ptm-game-screen.tsx — Timer-Leak retryTimer in rAF ✅ BEREITS BEHOBEN
- Timer wurden bereits in Refs gespeichert und im Cleanup aufgeräumt

### H4: youtube-player.tsx — Timer-Leak in Ad-End-Erkennung ✅ FIXIERT
- setTimeout(500ms) nie aufgeräumt
- Fix: `adEndTimerRef` hinzugefügt, Cleanup in Effect-Cleanup und vor neuem Timer
- Commit: 2851d22

### H5: companion-singalong-screen.tsx — Stale currentTime ✅ FIXIERT
- `currentTime` React-State in useCallback gefangen → 80ms-Interval bei jedem onTimeUpdate neu erstellt
- Fix: `currentTimeRef` eingeführt, liest immer aktuellen Wert ohne Callback-Neuerstellung
- Commit: b068aa3

### H6: companion-singalong-screen.tsx — Ganze-Store-Subscription ✅ FIXIERT
- `usePartyStore()` ohne Selektor → unnötige Re-Renders
- Fix: Individuelle Selektoren für alle benötigten State/Setter

### H7: battle-royale/playing-view.tsx — Ganze-Store-Anti-Pattern ✅ FIXIERT
- Gleicher Fix wie H6: Individuelle Selektoren statt ganzem Store

### H8: use-replay-recorder.ts — Kein Unmount-Cleanup ✅ FIXIERT
- MediaRecorder lief nach Unmount weiter
- Fix: useEffect-Cleanup hinzugefügt, stoppt Recorder und releast Streams

### H9: use-native-audio.ts — Race Condition ✅ FIXIERT
- Unlisten Refs nicht gesetzt bevor Promise aufgelöst
- Fix: `cancelled` Flag, unlisten sofort aufgerufen wenn Effect bereits bereinigt

### H10: use-multi-pitch-detector.ts — Re-Initialisierung ✅ FIXIERT
- `initialize()` early-return bei bereits initialisiert → Player-Wechsel funktionierte nicht
- Fix: Stoppe und zerstöre alten Manager vor Re-Initialisierung

### H11-H20: Multiple Fixes ✅ FIXIERT
- H11: Stale totalPlayers in BR setup
- H12: setState inside setState updater
- H13: unchecked_transaction → transaction (5 Dateien)
- H14: block_in_place für viral_refresh_charts
- H15: Division-by-zero Guard in convert_channels
- H16: #END:0 Parse-Fix
- H17: Blob-URL Tracking in folder-scanner
- H18: midiPitchToFrequency statt hardcoded 440Hz
- H19: Blob-URL Cleanup bei Exception
- H20: existingSongs Memo Dependencies

---

## Mittel-Priorität Fixes

### Memory Leaks ✅ FIXIERT (10 Issues)
- player-progression.ts: try/catch für localStorage
- shorts-creator.tsx: Animation Loop Guard, rAF Drosselung
- karaoke-editor.tsx: setTimeout Cleanup
- editor-screen.tsx: setTimeout Cleanup
- use-import-screen.ts: setTimeout Cleanup für Auto-Navigation
- use-folder-scanner.ts: Zwei setTimeout Cleanup
- use-mobile-data.ts: Fünf setTimeout Cleanup
- companion-list-section.tsx: setTimeout Cleanup

### Logic Errors ✅ FIXIERT (11 Issues)
- getLevelForXP: Max-Iterations-Guard
- lowestScore: Infinity → 0
- Daily-Challenge: Typ-abhängiges Sortieren
- PTM Webcam-Toggle: Duplikate behoben
- note-highway: playerColor Prop verwendet
- rate-my-song: .toFixed(1) für Durchschnitt
- medley-snippet-generator: endTime Clamp
- StepMania Parser: Off-by-one Fix
- notes-to-lyric-lines: BPM-abhängiger Zeilenumbruch
- karaoke-editor: Stale lyrics Closure
- tauri-file-storage: HTML-Entity Regex Fix

### Race Conditions ✅ FIXIERT (7 Issues)
- use-game-loop: gameMode + nativeAudio deps
- use-game-loop: Video-src Guard
- use-battle-royale-game: currentSongRef
- use-remote-control: isPlayingRef
- use-replay-recorder: Doppeltes onReplaySaved entfernt
- results-screen: useCallback für Handler

### Performance ✅ FIXIERT (7 Issues)
- use-note-scoring: Skip-Index für O(1) pro Frame
- medley-game-screen: O(n²) → O(n)
- lyric-line-display: 25 Intervalle → 1 Shared Interval
- pitch-graph: O(n) Filter → findIndex + slice
- library-cache: IndexedDB Connection-Caching
- song-url-restore: Sequentiell → Parallel
- playlist-manager: O(n²) → O(n log n) Sort

### Security ✅ FIXIERT (6 Issues)
- PIN-basierte Auth für privilegierte Endpoints
- Rate-Limit Map Cleanup
- Input-Größen-Limits
- Fehler-Sanitisierung
- Mobile-State Cleanup (24h)

### Error Handling ✅ FIXIERT (6 Issues)
- Difficulty Type-Guard
- IndexedDB/localStorage Reconciliation
- replay-db Concurrency Guard
- replay-db Batched Delete
- savePlaylists Error Propagation
- Path Validation (Directory Traversal)

### Rust-Specific ✅ FIXIERT (6 Issues)
- Timeline-Lücken bei Frame-Skip
- analysis_duration_ms Minimum
- Dateigrößen-Check für alle Pfade
- Path Validation canonicalize Fix
- Resampling Error Propagation
- Dead AppHandle Parameter entfernt

---

## Dead Code Removal

### Komplette tote Dateien ✅ GELÖSCHT (12 Dateien, ~2.124 Zeilen)
- D1-D10: UI Komponenten (sidebar, chart, command, sheet, form, table, alert, avatar, toggle, collapsible)
- D11: keyboard-shortcuts.ts (Duplikat)
- D12: microphone-settings.tsx (altes Panel)

### Tote Exporte ✅ ENTFERNT (15+ Exporte, ~684 Zeilen)
- D13-D21: Verschiedene ungenutzte Funktionen (getSongPlayCount, isFavorite, removeSong, etc.)
- D22-D27: Ungenutzte Komponenten (ScoreCardMini, MinusIcon, VoiceVisualizer, etc.)
- Zusätzliche: getCurrentLyrics, unused vars in ptm/new-song-dialog/battle-royale

### Icon-Konsolidierung ✅ ERLEDIGT
- 15 Icon-Definitionen in icons.tsx konsolidiert
- settings-icons.tsx, library/icons.tsx, mobile-icons.tsx → Re-Exports
- 205 Zeilen Duplikat-Code entfernt

### NPM Dependencies ✅ ENTFERNT
- recharts, cmdk, react-hook-form, @hookform/resolvers

---

## Statistiken
- **Commits**: 17
- **Behobene Issues**: ~90+
- **Zeilen entfernt**: ~3.000+ (Dead Code)
- **Zeilen hinzugefügt**: ~500 (Fixes)
- **Netto**: ~2.500 Zeilen weniger Code

## Verbleibende Verbesserungsvorschläge (I1-I14)
→ Siehe TODO_IMPROVEMENTS.md für Details
- I1: Frontend-Tests (vitest/jest)
- I2: Accessibility (a11y)
- I3: i18n Hartcodierte Strings
- I4: Logging-System (tracing/log)
- I5: File-Splitting (mobile-views.tsx, ptm-game-screen.tsx, game-screen.tsx)
- I6: Store-Optimierung (weitere Selektoren)
- I7: Einheitliche Utility-Funktionen (useTimeout Hook, etc.)
- I8: Cache-Migration
- I9: Blob-URL-Lifecycle (weiteres System)
- I10: Rust Error Handling (.expect() → Result)
- I11: Performance Hotpaths (weitere Optimierungen)
- I12: Playlist-DB Konsistenz
- I13: Song-ID Generierung (crypto.randomUUID)
- I14: Beforeunload-Cleanup (synchrone Methode)
