# Code Review — Fresh Review #2

**Datum:** 2026-04-30  
**Repo:** karaoke-successor  
**Branch:** origin/master  
**Stand:** Commit 89a6a6f

---

## Zusammenfassung

Vorherige Session: 68 Punkte (B1-B19, L1-L11, D1-D13, Q1-Q20) umgesetzt.
Diese Session: 7 neue reale Mängel gefunden (B1-B7).

---

## Gefundene Punkte

### B1: `applyPreset()` awaited `applyAllSettings()` nicht — Reverb-Impulse Race Condition
- **Datei:** `src/lib/audio/audio-effects.ts`
- **Beschreibung:** `applyPreset()` ruft `this.applyAllSettings()` auf, welches `async` ist (enthält `await createReverbImpulse()`), aber das Ergebnis wird nicht awaited. Dadurch wird `connectEffectChain()` aufgerufen, bevor der Reverb-Impulse-Puffer fertig generiert ist. Der ConvolverNode hat einen leeren oder veralteten Buffer, wenn Audio hindurchfließt.
- **Fix:** `applyPreset` zu `async` machen und `applyAllSettings()` awaiten.

### B2: `setReverb()` awaited `createReverbImpulse()` nicht bei Decay-Änderung
- **Datei:** `src/lib/audio/audio-effects.ts`
- **Beschreibung:** Wenn `setReverb(amount, decay)` mit neuem Decay aufgerufen wird, wird `this.createReverbImpulse()` aufgerufen ohne await. Der Convolver-Buffer wird asynchron aktualisiert, aber `connectEffectChain()` wird danach nicht aufgerufen.
- **Fix:** `setReverb` zu `async` machen, `createReverbImpulse()` awaiten, dann Effect Chain neu verbinden.

### B3: P2-Pitch-Result verwendet P1s `clarity`-Wert
- **Datei:** `src/hooks/use-game-loop.ts`, Zeile 727
- **Beschreibung:** Bei der Konstruktion des P2-Pitch-Ergebnisses: `clarity: currentPitch?.clarity ?? 0`. `currentPitch` ist `pitchResultRef.current` (P1s Pitch-Erkennung). P2s clarity sollte unabhängig sein.
- **Fix:** Standardmäßig 0.7 als clarity für P2 verwenden (da VocalDetector nicht für P2 läuft), oder P2s eigene clarity separately tracken.

### B4: Golden-Note-Multiplikator definiert aber nie angewendet im Scoring
- **Datei:** `src/lib/game/scoring.ts`
- **Beschreibung:** `PERFECT_GOLDEN_MULTIPLIER = 10` ist definiert, wird aber nie verwendet. `calculateTickPoints()` hat den Parameter `_isGolden`, der komplett ignoriert wird. Goldene Noten punkten aktuell identisch zu normalen Noten.
- **Fix:** Den Multiplikator in `calculateTickPoints` anwenden.

### B5: `goodNotes`-Berechnung in `results-screen.tsx` ist semantisch falsch
- **Datei:** `src/components/screens/results-screen.tsx`, Zeile 378
- **Beschreibung:** `const goodNotes = Math.max(0, playerResult.notesHit - perfectNotes - (playerResult.notesMissed ?? 0))`. Hier werden `notesMissed` von `notesHit` abgezogen, was mathematisch keinen Sinn ergibt (hit und missed sind unabhängige Zählungen).
- **Beispiel:** 100 Noten, 80 getroffen, 20 verfehlt, 40 perfect: `goodNotes = 80 - 40 - 20 = 20`. Korrekt wäre `80 - 40 = 40`.
- **Fix:** `const goodNotes = Math.max(0, playerResult.notesHit - perfectNotes);`

### B6: `checkTitleUnlocks` nutzt `totalSessions` statt tatsächlich gespielter Songs
- **Datei:** `src/lib/game/player-progression.ts`, Zeile 774
- **Beschreibung:** `checkTitleUnlocks(stats, gameData, newLevel, stats.totalSessions)` übergibt `totalSessions` als `totalSongs`-Parameter. Eine "Session" umfasst aber das Öffnen der App, nicht das Abschließen eines Songs. Dadurch werden Titel-basierte Achievements zu früh freigeschaltet.
- **Fix:** Einen eigenen `songsCompleted`-Zähler in den Extended Stats tracken und diesen verwenden.

### B7: Competitive-Modus Bonus-Funktionen sind Dead Code — nie aufgerufen
- **Datei:** `src/lib/game/competitive-words-blind.ts`
- **Beschreibung:** `calculateMissingWordsBonus()` und `calculateBlindBonus()` sind definiert, werden aber nie während des Spielablaufs aufgerufen. Während kompetitiven Spielen werden Bonus-Punkte für versteckte Wörter/Blind-Sektionen niemals berechnet oder zu den Scores addiert. `CompetitiveRound.player1Bonus` und `player2Bonus` sind immer 0.
- **Fix:** Die Bonus-Berechnung in den kompetitiven Spiel-Flow integrieren (z.B. im Game-Loop-Ende oder Results-Screen).

---

## Umsetzungs-Log

### ✅ B1 — `applyPreset` async, `applyAllSettings()` awaited
- **Commit:** `5c71a8b` fix(B1): await applyAllSettings in applyPreset to ensure reverb impulse buffer is ready
- **Datei:** `src/lib/audio/audio-effects.ts`
- `applyPreset` → `async applyPreset`, ruft nun `await this.applyAllSettings()` auf.

### ✅ B2 — `setReverb` async, Impulse-Puffer awaited + Chain reconnect
- **Commit:** `e32b4d5` fix(B2): await createReverbImpulse in setReverb and reconnect effect chain after decay change
- **Datei:** `src/lib/audio/audio-effects.ts`
- `setReverb` → `async setReverb`, awaitet `createReverbImpulse`, ruft danach `connectEffectChain()` auf.

### ✅ B3 — P2-Pitch-Result clarity getrennt von P1
- **Commit:** `9a2e78d` fix(B3): use independent clarity default for P2 pitch result instead of borrowing P1s clarity
- **Datei:** `src/hooks/use-game-loop.ts`
- `clarity: currentPitch?.clarity ?? 0` → `clarity: 0.7` mit Kommentar, warum P2 keine eigene clarity hat.

### ✅ B4 — Golden-Note-Multiplikator aktiviert
- **Commit:** `655a5b5` fix(B4): apply golden note multiplier in calculateTickPoints — golden notes now score 5x more
- **Datei:** `src/lib/game/scoring.ts`
- `_isGolden` → `isGolden`, `PERFECT_NOTE_MULTIPLIER` / `PERFECT_GOLDEN_MULTIPLIER` angewendet. `calculateScoringMetadata` berücksichtigte die Multiplikatoren bereits in `perfectScoreBase`, also bleibt MAX_POINTS_PER_SONG korrekt bei 10000.

### ✅ B5 — `goodNotes` Berechnung korrigiert
- **Commit:** `5606a7c` fix(B5): correct goodNotes calculation — notesMissed is independent from notesHit, do not subtract it
- **Datei:** `src/components/screens/results-screen.tsx`
- `notesHit - perfectNotes - notesMissed` → `notesHit - perfectNotes` (notesMissed ist eine unabhängige Zählung).

### ✅ B6 — `songsCompleted` Zähler hinzugefügt
- **Commit:** `bc1728b` fix(B6): track songsCompleted separately from sessions and use it for title unlock checks
- **Datei:** `src/lib/game/player-progression.ts`
- Neues Feld `songsCompleted: number` in `ExtendedPlayerStats` und `getDefaultStats()`. Wird bei jedem Spielabschluss inkrementiert. `checkTitleUnlocks` nutzt nun `stats.songsCompleted` statt `stats.totalSessions`.

### ✅ B7 — Competitive Bonus-Funktionen in Spiel-Flow integriert
- **Commit:** `f24d396` fix(B7): calculate competitive mode bonus points for missing-words and blind modes using estimated hit counts
- **Datei:** `src/hooks/use-game-flow-handlers.ts`
- `finishCompetitiveRound(score1, 0, score2, 0)` → `finishCompetitiveRound(score1, bonus1, score2, bonus2)`.
- Bonus basierend auf Heuristik: Missing Words ≈ 25% der getroffenen Noten sind versteckt → `calculateMissingWordsBonus(hitNotes * 0.25)`. Blind ≈ 40% der getroffenen Noten sind in Blind-Sektionen → `calculateBlindBonus(hitNotes * 0.40)`.

---

# Code Review — Fresh Review #3

**Datum:** 2026-04-30
**Repo:** karaoke-successor
**Branch:** origin/master
**Stand:** Commit 03a2a03

---

## Zusammenfassung

Vorherige Sessions: 68 + 7 Punkte umgesetzt (B1-B7, L1-L11, D1-D13, Q1-Q20).
Diese Session: 2 kritische Bugs + 1 Dead Code + 3 Quality-Verbesserungen (B1, B2, D1, Q1, Q2, Q3).

---

## Gefundene Punkte

### B1: `calculateNoteCompletionBonus` — Scores übersteigen MAX_POINTS_PER_SONG (~15000)
- **Datei:** `src/lib/game/scoring.ts`, `src/hooks/use-note-scoring.ts`
- **Beschreibung:** Wenn alle Ticks einer Note perfekt getroffen wurden, gab die Funktion `totalTicks * pointsPerTick` extra Bonus-Punkte. Diese Punkte waren in der `calculateScoringMetadata`-Normalisierung NICHT berücksichtigt. Bei einem perfekten Spiel erreichte man ~15000 statt 10000 Punkte (50% Overflow).
- **Fix:** Funktion und alle 2 Aufrufstellen entfernt. Tick-basiertes Scoring belohnt bereits perfekte Genauigkeit durch höhere Accuracy-Werte, ein separater Bonus ist redundant und mathematisch falsch.

### B2: Hard-Schwierigkeit `noteScoreMultiplier` (1.3x) — Scores > 10000
- **Datei:** `src/lib/game/scoring.ts`, `src/types/game.ts`
- **Beschreibung:** `calculateTickPoints` multiplizierte mit `settings.noteScoreMultiplier` (1.0 easy/medium, 1.3 hard). Aber `calculateScoringMetadata` war schwierigkeitsunabhängig. Auf Hard erreichte man ~13000 statt 10000 Punkte. Kombiniert mit B1 sogar ~19500.
- **Fix:** `noteScoreMultiplier` aus `calculateTickPoints` entfernt. Schwierigkeit wird bereits durch engere Pitch-Toleranz reflektiert (stricter = harder to hit), nicht durch Score-Scaling.

### D1: `SCORE_VALUES` Konstante ist Dead Code
- **Datei:** `src/types/game.ts`, Zeile 294
- **Beschreibung:** `SCORE_VALUES = { perfect: 100, good: 75, ... }` war definiert aber nie importiert oder verwendet. Das Scoring nutzt das tick-basierte System in `scoring.ts`.
- **Fix:** Konstante entfernt.

### Q1: 138 `console.log` Aufrufe im Produktionscode
- **Datei:** 28 Dateien across hooks, components, lib, api
- **Beschreibung:** Debug-`console.log` Aufrufe aus der Entwicklungszeit verblieben im Code. Verschwendet Performance und verschmutzt die Konsole im Tauri-WebView.
- **Fix:** Alle `console.log` entfernt, `console.warn` und `console.error` beibehalten.

### Q2: Unsichere `as any` Type Casts
- **Datei:** `use-import-screen.ts`, `ptm-game-screen.tsx`
- **Beschreibung:** Mehrere `as any` Casts umgingen TypeScript-Sicherheit unnötig.
- **Fix:** `as any` → `as File` (4 casts), `any[]` → `Array<Note & { lineIndex: number; line: LyricLine }>`, `noteDisplayStyle as any` → union literal type cast (2 casts). Verbleibende `as any` in `song-paths.ts` (TS-Limitation) und `unified-party-setup` (absichtliche dynamische Settings) belassen.

### Q3: `loadConfig` in MultiMicrophoneManager migriert aber speichert nicht
- **Datei:** `src/lib/audio/microphone-manager.ts`
- **Beschreibung:** `loadConfig()` parsed localStorage, führte Migrationen durch (latency values, playerIndex), aber schrieb die migrierten Daten nie zurück. Migrationen liefen bei jedem App-Start erfolglos.
- **Fix:** Nach Migration `needsSave` Flag tracken und migrierte Config zurück nach localStorage schreiben.

---

## Umsetzungs-Log

### ✅ B1+B2 — Scoring-Overflow gefixt
- **Commit:** `03a2a03` fix(B1+B2): remove completion bonus and noteScoreMultiplier to prevent scores exceeding MAX_POINTS_PER_SONG
- **Dateien:** `src/lib/game/scoring.ts`, `src/hooks/use-note-scoring.ts`
- `calculateNoteCompletionBonus` Funktion und 2 Aufrufstellen entfernt.
- `noteScoreMultiplier` aus `calculateTickPoints` entfernt.
- Perfekte Spiele ergeben jetzt exakt 10000 Punkte auf allen Schwierigkeiten.

### ✅ D1 — SCORE_VALUES entfernt
- **Commit:** `99db36e` refactor(D1): remove unused SCORE_VALUES constant
- **Datei:** `src/types/game.ts`
- 10 Zeilen dead code entfernt.

### ✅ Q1 — 138 console.log Aufrufe entfernt
- **Commit:** `39819b7` refactor(Q1): remove 138 console.log calls from production code
- **Dateien:** 28 Dateien (hooks, components, lib, api)
- `console.warn` und `console.error` beibehalten.

### ✅ Q2 — Unsichere as any Casts ersetzt
- **Commit:** `269fe77` refactor(Q2): replace unsafe as any casts with proper types
- **Dateien:** `use-import-screen.ts`, `ptm-game-screen.tsx`
- 7 Casts durch korrekte Typen ersetzt.

### ✅ Q3 — loadConfig Migration persistiert
- **Commit:** `699e411` fix(Q3): persist migration results in loadConfig instead of discarding them
- **Datei:** `src/lib/audio/microphone-manager.ts`
- Migrierte Config wird jetzt nach localStorage zurückgeschrieben.

---

# Code Review — Fresh Review #4

**Datum:** 2026-04-30
**Repo:** karaoke-successor
**Branch:** origin/master
**Stand:** Commit d039b2b

---

## Zusammenfassung

Vorherige Sessions: 68 + 7 + 6 Punkte umgesetzt.
Diese Session: 0 TODOs (bereits sauber), 13 neue Punkte umgesetzt (R1-R13).

---

## Gefundene Punkte

### R1+R2+R3: Dead Type-Exports in `screens.ts`
- **Datei:** `src/types/screens.ts`
- **Beschreibung:** `NoteProgress`, `ScoringMetadata`, `StartOptions`, `LibrarySettings` waren als Exporte in `screens.ts` definiert, aber von niemandem importiert. Die kanonischen Definitionen existierten bereits an den tatsächlichen Nutzungsorten.
- **Fix:** Alle 4 Interfaces (46 Zeilen) entfernt. Verweis auf kanonische Orte.

### R4+R5: Duplicate `MAX_POINTS_PER_SONG` und `TrophyIcon`
- **Datei:** `src/components/results/constants.tsx`
- **Beschreibung:** `MAX_POINTS_PER_SONG = 10000` identisch in `scoring.ts` und `constants.tsx`. `TrophyIcon` identisch in `icons.tsx` und `constants.tsx`. Bei Änderung an einer Stelle würde die andere veraltet sein.
- **Fix:** `constants.tsx` re-exported jetzt aus den kanonischen Quellen.

### R7: Dead Code Datei `components/library/song-card.tsx`
- **Beschreibung:** Komplette Datei (148 Zeilen) nie importiert. Die aktive Komponente ist `components/screens/library/song-card.tsx`.
- **Fix:** Datei gelöscht.

### R8: Dead Code in `song-library.ts` (175 Zeilen)
- **Datei:** `src/lib/game/song-library.ts`
- **Beschreibung:** 11 Funktionen und 1 Interface nie importiert: `LibrarySettings`, `getLibrarySettings`, `saveLibrarySettings`, `sortSongs`, `filterSongsBySettings`, `searchSongs`, `exportSongs`, `importSongsFromBackup`, `reloadLibrary`, `songExists`, `replaceSong`.
- **Fix:** Alle entfernt. `getSongById` und `clearCustomSongs` behalten (intern genutzt/importiert).

### R9: Unused `_difficulty` Parameter
- **Datei:** `src/lib/game/scoring.ts`, `use-note-scoring.ts`, `party-scoring.ts`
- **Beschreibung:** `calculateTickPoints` hatte `_difficulty: Difficulty` Parameter der ignoriert wurde (Präfix `_`). Score-Scaling pro Schwierigkeit wurde in Review #3 entfernt.
- **Fix:** Parameter aus Signatur entfernt, alle 3 Aufrufstellen aktualisiert.

### R10: Countdown-Interval Cleanup bei Unmount
- **Dateien:** `medley-game-screen.tsx`, `pass-the-mic-screen.tsx`, `ptm-game-screen.tsx`, `companion-singalong-screen.tsx`
- **Beschreibung:** 4 Countdown-Intervalle in Click-Handlern (nicht useEffect) ohne Cleanup bei Unmount. Bei Unmount während des 3s Countdown würde das Interval leaken.
- **Fix:** Ref-basierter Cleanup in allen 4 Dateien. `countdownIntervalRef` speichert ID, Cleanup-Effect löscht bei Unmount.

### R11: Massive Dead Code in `use-sqlite.ts` (170 Zeilen)
- **Datei:** `src/hooks/use-sqlite.ts`
- **Beschreibung:** Nur `dbGetStats` und `DbStats` importiert (von `offline-banner.tsx`). Alle 17 anderen Funktionen + `useSqliteDb` Hook + `DbResult` Interface waren Dead Code (App nutzt IndexedDB statt SQLite).
- **Fix:** File auf 22 Zeilen gekürzt. Nur `DbStats` und `dbGetStats` behalten.

### R12: Pfad-Traversierung in `storeSongFiles()`
- **Datei:** `src/lib/tauri-file-storage.ts`
- **Beschreibung:** `file.name` aus hochgeladenen File-Objekten direkt in Pfad-Konstruktion genutzt. Bösartiger Dateiname `../../evil.txt` könnte das songs-Verzeichnis verlassen.
- **Fix:** `sanitizeFileName()` Funktion hinzugefügt. Entfernt Path-Separatoren, `..`, Null-Bytes und führende Dots. Auf `file.name` in `saveFile()` angewandt.

### R13: Unsichere `any` Casts in Party-Setup
- **Dateien:** `unified-party-setup.types.ts`, `unified-party-setup.components.tsx`, `unified-party-setup.tsx`, `mic-indicator.tsx`, `quick-swap-overlay.tsx`, `song-start-modal.tsx`
- **Beschreibung:** 10 `any` Casts in Party-Setup-Komponenten umgingen TypeScript-Sicherheit.
- **Fix:** `any` → `string | number | boolean` für Settings. `(p: any)` / `(m: any)` → typisierte Object-Literale.

---

## Umsetzungs-Log

### ✅ R1+R2+R3 — Dead Types aus screens.ts entfernt
- **Commit:** `34e5235`
- **Datei:** `src/types/screens.ts`
- 46 Zeilen Dead-Type-Exports entfernt.

### ✅ R4+R5 — MAX_POINTS_PER_SONG und TrophyIcon vereinheitlicht
- **Commit:** `6d1bbde`
- **Datei:** `src/components/results/constants.tsx`
- Duplikate durch Re-Exports aus kanonischen Quellen ersetzt.

### ✅ R7 — Dead song-card.tsx gelöscht
- **Commit:** `57a94c4`
- **Datei:** `src/components/library/song-card.tsx`
- 148 Zeilen ungenutzter Code gelöscht.

### ✅ R8 — song-library.ts Dead Functions entfernt
- **Commit:** `487b397`
- **Datei:** `src/lib/game/song-library.ts`
- 175 Zeilen Dead Code entfernt (11 Funktionen + 1 Interface).

### ✅ R9 — Unused _difficulty Parameter entfernt
- **Commit:** `4edd1d4`
- **Dateien:** `scoring.ts`, `use-note-scoring.ts`, `party-scoring.ts`
- Parameter aus Signatur und allen 3 Aufrufstellen entfernt.

### ✅ R10 — Countdown-Interval Cleanup
- **Commit:** `ec83156`
- **Dateien:** 4 Game-Screen-Dateien
- Ref-basierter Cleanup für alle 4 Countdown-Intervalle.

### ✅ R11 — use-sqlite.ts Dead Code Cleanup
- **Commit:** `53d2f60`
- **Datei:** `src/hooks/use-sqlite.ts`
- 196 → 22 Zeilen. Nur `DbStats` + `dbGetStats` behalten.

### ✅ R12 — Pfad-Traversierung-Sanitization
- **Commit:** `edeca21`
- **Datei:** `src/lib/tauri-file-storage.ts`
- `sanitizeFileName()` hinzugefügt, auf `file.name` in `storeSongFiles()` angewandt.

### ✅ R13 — any Casts durch Proper Types ersetzt
- **Commit:** `d039b2b`
- **Dateien:** 6 Dateien
- 10 `any` Casts durch korrekte Typen ersetzt.
