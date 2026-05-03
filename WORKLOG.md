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

---

# Code Review — Fresh Review #5

**Datum:** 2026-04-30
**Repo:** karaoke-successor
**Branch:** origin/master
**Stand:** Commit c418aa4

---

## Zusammenfassung

Vorherige Sessions: 68 + 7 + 6 + 13 Punkte umgesetzt.
Diese Session: Fokus auf aufwendigere Aufgaben — Dead-Code-Features implementieren + kritische Bugs beheben.

---

## Gefundene Punkte

### A1: Achievement-Checking-System war nie implementiert (DEAD CODE → IMPLEMENTIERT)
- **Datei:** `src/lib/game/achievements.ts`, `src/components/screens/results-screen.tsx`
- **Beschreibung:** 21 Achievements waren definiert mit Kriterien (score, combo, accuracy, etc.) und Belohnungen (XP, Titel), aber es gab keine Funktion, die nach einem Spiel prüft, ob Achievements freigeschaltet werden. Die Achievements-Anzeige zeigte immer 0/21. Das komplette System war definiert aber nie in den Spiel-Flow eingebunden.
- **Fix:** `checkAndUnlockAchievements()` Funktion implementiert, die alle 21 Definitions gegen das Spielergebnis prüft. In `results-screen.tsx` nach jedem Spiel aufgerufen. Neue Achievements werden direkt im Profil gespeichert.

### A2: Daily-Challenge-Submission war nie eingebunden (DEAD CODE → IMPLEMENTIERT)
- **Datei:** `src/lib/game/daily-challenge.ts`, `src/components/screens/daily-challenge-screen.tsx`, `src/components/screens/results-screen.tsx`
- **Beschreibung:** `submitChallengeResult()` existierte mit vollständiger Logik (XP, Streaks, Badges), wurde aber nie aufgerufen. Daily Challenges konnten gestartet aber nie abgeschlossen werden. Die Streak-Anzeige blieb immer bei 0.
- **Fix:** Daily-Challenge-Screen setzt ein localStorage-Flag beim Start. Results Screen prüft das Flag und ruft `submitChallengeResult()` auf. Flag wird sofort gelöscht um Doppel-Submission zu verhindern.

### A3: `accuracy` nie aktualisiert → Tournament-Ergebnisse immer 'poor'
- **Datei:** `src/hooks/use-game-flow-handlers.ts`
- **Beschreibung:** `buildGameResultFromState()` las `p.accuracy` aus dem Game Store, aber `use-note-scoring.ts` aktualisiert nur `score`, `combo`, `maxCombo`, `notesHit`, `notesMissed` — nie `accuracy` (immer 0). Tournament-Spiele hatten immer Rating 'poor'.
- **Fix:** Accuracy wird jetzt aus `notesHit / (notesHit + notesMissed) * 100` berechnet statt den veralteten Store-Wert zu lesen.

### A4: P2-Accuracy gegen Total Notes statt P2-Notes berechnet
- **Datei:** `src/hooks/use-game-loop.ts`
- **Beschreibung:** In `generateResults()` wurde P2-Accuracy mit `totalNotes` (alle Noten) als Nenner berechnet. In Duet-Mode singt P2 aber nur `player='P2'` zugewiesene Noten. P2-Accuracy war künstlich niedrig.
- **Fix:** Zählt P2-assigned Notes aus den Lyrics. Falls keine Zuweisung existiert (Duel), Fallback auf `totalNotes`.

### A5: Party-Scoring Fallback nicht normalisiert → unbeschränkte Scores
- **Datei:** `src/lib/game/party-scoring.ts`
- **Beschreibung:** Wenn `scoringMeta` null (kein BPM), gab der Fallback `accuracy * 10` Punkte pro Tick ohne Cap. Bei langen Songs (2000+ Ticks) erreichte man 20000+ statt 10000 Punkte.
- **Fix:** Fallback auf `Math.min(accuracy * 10, 3)` pro Tick gecappt.

### A6: Duet-Mode P2 bekommt keine Highscores/XP
- **Datei:** `src/components/screens/results-screen.tsx`
- **Beschreibung:** `isMultiplayerMode` enthielt `'duel'`, `'competitive-words'`, `'competitive-blind'` aber nicht `'duet'`. P2 im Duet-Modus bekam nie Highscores oder XP.
- **Fix:** `'duet'` zur Liste hinzugefügt.

### A7: `recordRound` fehlt in Dependency-Array
- **Datei:** `src/components/game/ptm-game-screen.tsx`
- **Beschreibung:** Das Segment-Switching useEffect rief `recordRound()` auf, aber die Funktion war nicht im Dependency-Array. Bei externer Änderung von `passTheMicSeriesHistory` wurde eine veraltete Closure verwendet.
- **Fix:** `recordRound` zum Dependency-Array hinzugefügt.

### A8: Dead Code Bereinigung
- **Dateien:** 5 Dateien
- **Beschreibung:** Leerer `if (fullSong) {}` Block, ungenutzte `DailyChallengeConfig`-Interface, unnötige Exports (`getSongById`, `hasMedia`, `clearAllMedia`), Duplikat der `nrc_round` Logik.
- **Fix:** Leeren Block entfernt, `DailyChallengeConfig` gelöscht, unnötige Exports zu internen Funktionen gemacht, Inline-Logik durch Funktionsaufruf ersetzt.

---

## Umsetzungs-Log

### ✅ A1 — Achievement-Checking-System implementiert
- **Commit:** `c418aa4`
- **Dateien:** `src/lib/game/achievements.ts`, `src/components/screens/results-screen.tsx`

### ✅ A2 — Daily-Challenge-Submission eingebunden
- **Commit:** `0e398a9`
- **Dateien:** `src/lib/game/daily-challenge.ts`, `src/components/screens/daily-challenge-screen.tsx`, `src/components/screens/results-screen.tsx`

### ✅ A3 — accuracy-Bug in Tournament-Ergebnissen gefixt
- **Commit:** `98fddfc`
- **Datei:** `src/hooks/use-game-flow-handlers.ts`

### ✅ A4 — P2-Accuracy für Duet-Mode korrigiert
- **Commit:** `ea55bb7`
- **Datei:** `src/hooks/use-game-loop.ts`

### ✅ A5 — Party-Scoring Fallback gecappt
- **Commit:** `4b1e84d`
- **Datei:** `src/lib/game/party-scoring.ts`

### ✅ A6 — Duet P2 Highscores/XP aktiviert
- **Commit:** `7d815ed`
- **Datei:** `src/components/screens/results-screen.tsx`

### ✅ A7 — Dependency-Array repariert
- **Commit:** `e659d8a`
- **Datei:** `src/components/game/ptm-game-screen.tsx`

### ✅ A8 — Dead Code Bereinigung
- **Commit:** `b8f6b1b`
- **Dateien:** 5 Dateien (results-screen, player-progression, song-library, media-db, medley-game-screen)

---

# Code Review — Fresh Review #6

**Datum:** 2026-04-30
**Repo:** karaoke-successor
**Branch:** origin/master
**Stand:** Commit adca7b5

---

## Zusammenfassung

Vorherige Sessions: 68 + 7 + 6 + 13 + 8 = 102 Punkte umgesetzt.
Diese Session: 6 kritische Bugs + 6 Bugs gefixt. Dead Code und Verbesserungen dokumentiert (nicht gelöscht).

---

## Gefundene & Gefixte Punkte

### C1: TDZ-Crash in results-screen.tsx — `player2Result` vor Deklaration referenziert
- **Datei:** `src/components/screens/results-screen.tsx`, Zeile 292/336
- **Beschreibung:** Im useEffect wurde `player2Result` bei Zeile 292 referenziert (`isDuelWin = isDuel && player2Result && ...`), aber erst bei Zeile 336 mit `const player2Result = results.players[1]` deklariert. Da `const` in der Temporal Dead Zone ist, warf dies einen ReferenceError sobald `isDuel` truthy war. In Duel/Duet-Mode: P2-Highscore nie gespeichert, Achievements nie geprüft, XP nie aktualisiert, Daily Challenge nie submitted.
- **Fix:** `player2Result` und `isMultiplayerMode` Deklaration vor die Achievement-Prüfung verschoben.

### C2: (False Positive — `as const` Streak Milestones)
- **Beschreibung:** Ursprünglich als Typ-Mismatch gemeldet. Bei genauerer Prüfung: `as const` ist ein reines TypeScript-Compiletime-Feature. Zur Laufzeit funktioniert `XP_REWARDS.STREAK_MILESTONES[7]` einwandfrei. Kein Bug.

### C3: Performance-Stats verwenden `totalSessions` statt `songsCompleted`
- **Datei:** `src/lib/game/player-progression.ts`, Zeile 740
- **Beschreibung:** `updatePerformanceStats(stats, gameData, stats.totalSessions` nutzt Session-Anzahl (App-Öffnungen) als Divisor für Score/Accuracy-Durchschnitte statt der Anzahl tatsächlich gespielter Songs.
- **Fix:** `stats.totalSessions` → `stats.songsCompleted`.

### C4: YouTube `wasPlayingBeforeAdRef` ist Plain Object statt `useRef`
- **Datei:** `src/hooks/use-youtube-game.ts`, Zeile 48
- **Beschreibung:** `const wasPlayingBeforeAdRef = { current: false }` erzeugt bei jedem Render ein neues Objekt. `handleAdEnd` (stable via useCallback) captured das initiale Objekt, liest also immer den Initialwert `false`. Auto-Resume nach Werbepausen funktionierte nicht.
- **Fix:** `{ current: false }` → `useRef(false)`, `useRef` zum Import hinzugefügt.

### C5: PTM Mobile-Sync sendet falschen Phase-Wert
- **Datei:** `src/components/game/ptm-game-screen.tsx`, Zeile 187
- **Beschreibung:** `phase === 'results'` wird als `isEnded`-Flag an Mobile-Clients gesendet. Aber `GamePhase` definiert `'song-results' | 'series-results'`, nie `'results'`. Mobile-Companions wurden nie über Spielende informiert.
- **Fix:** `phase === 'results'` → `phase === 'song-results' || phase === 'series-results'`.

### C6: UltraStar-Parser fehlt BOM/Line-Ending-Normalisierung
- **Datei:** `src/lib/parsers/ultrastar-parser.ts`, Zeile 74
- **Beschreibung:** `parseUltraStarTxt()` splittet rohen Content auf `\n` ohne vorherige Normalisierung. Dateien mit UTF-8 BOM (`\uFEFF`) oder Windows-Zeilenenden (`\r\n`) parsen fehlerhaft — Titel beginnt mit BOM-Zeichen, `\r` bleibt in Lyrics.
- **Fix:** `normalizeTxtContent(content)` (aus `utils.ts`) vor dem Split aufgerufen.

### B1: VIDEOGAP/VIDEOSTART als `parseInt` statt `parseFloat` geparst
- **Datei:** `src/lib/tauri-file-storage.ts`, Zeilen 473/475
- **Beschreibung:** `#VIDEOGAP:` und `#VIDEOSTART:` unterstützen Sekundenbruchteile (z.B. `-1.5`), werden aber mit `parseInt` geparst → abgeschnitten auf `-1`. Falsches Video-Sync.
- **Fix:** `parseInt` → `parseFloat` mit Komma-Replace.

### B2: Editor-Animations-Loop wird bei Playback-Rate-Wechsel nicht neugestartet
- **Datei:** `src/hooks/use-editor-playback.ts`, Zeile 87
- **Beschreibung:** `playbackRate` fehlt im Dependency-Array des rAF-Effects. Bei Rate-Änderung während der Wiedergabe driftet die visuelle Timeline vom Audio.
- **Fix:** `playbackRate` zum Dependency-Array hinzugefügt.

### B3: `detectBpm` löscht vorheriges Pitch-Analyse-Ergebnis nicht
- **Datei:** `src/hooks/use-audio-analysis.ts`
- **Beschreibung:** Wechsel zwischen Pitch-Analyse und BPM-Erkennung lässt das alte Ergebnis stehen. Verwirrende UI-Anzeige.
- **Fix:** `setResult(null)` in `detectBpm`, `setBpmResult(null)` in `analyzePitch`.

### B4: Results-Screen ohne Guard für leere Players-Liste
- **Datei:** `src/components/screens/results-screen.tsx`, Zeile 486
- **Beschreibung:** Guard prüft nur `!results || !song`, nicht `!results.players?.length`. Zugriff auf `results.players[0]` crasht bei leerem Array.
- **Fix:** `!results.players || results.players.length === 0` zum Guard hinzugefügt.

### B5: Unused Import `getAllSongs` in tournament-screen.tsx
- **Datei:** `src/components/game/tournament-screen.tsx`, Zeile 17
- **Fix:** Import entfernt.

### B6: Battle-Royale `duration` verwendet `||` statt `??`
- **Datei:** `src/components/game/battle-royale-screen.tsx`, Zeile 79
- **Beschreibung:** `duration || 60` würde auch bei `duration === 0` (möglicherweise gültig für "no limit") auf 60 fallen. Richtig: `duration ?? 60`.
- **Fix:** `||` → `??`.

---

## Umsetzungs-Log

### ✅ C1 — TDZ-Crash gefixt
- **Commit:** `78d0e58`
- **Datei:** `src/components/screens/results-screen.tsx`

### ✅ C3 — Performance-Stats Divisor korrigiert
- **Commit:** `95857d0`
- **Datei:** `src/lib/game/player-progression.ts`

### ✅ C4 — useRef statt Plain Object
- **Commit:** `5de96e1`
- **Datei:** `src/hooks/use-youtube-game.ts`

### ✅ C5 — PTM Phase-Wert korrigiert
- **Commit:** `808c946`
- **Datei:** `src/components/game/ptm-game-screen.tsx`

### ✅ C6 — BOM-Normalisierung hinzugefügt
- **Commit:** `fba0157`
- **Datei:** `src/lib/parsers/ultrastar-parser.ts`

### ✅ B1 — VIDEOGAP/VIDEOSTART parseFloat
- **Commit:** `ab9d95f`
- **Datei:** `src/lib/tauri-file-storage.ts`

### ✅ B2 — Editor Playback-Rate Dependency
- **Commit:** `9b9b25c`
- **Datei:** `src/hooks/use-editor-playback.ts`

### ✅ B3 — Analyse-Ergebnis-Clearing
- **Commit:** `2dc56a3`
- **Datei:** `src/hooks/use-audio-analysis.ts`

### ✅ B4 — Empty Players Guard
- **Commit:** `460adce`
- **Datei:** `src/components/screens/results-screen.tsx`

### ✅ B5+B6 — Unused Import + Nullish Coalescing
- **Commit:** `adca7b5`
- **Dateien:** `tournament-screen.tsx`, `battle-royale-screen.tsx`

---

## Dead Code (nicht gelöscht — nur dokumentiert)

### D1: `isPlayerFinished()` — competitive-words-blind.ts
- **Wahrscheinliche Funktion:** Prüft, ob ein Spieler alle Runden absolviert hat. Wurde für Round-Management geplant, aber `getNextRoundPairing` nutzt `singCounts` direkt.

### D2: `markChallengeCompleted()` — daily-challenge.ts
- **Wahrscheinliche Funktion:** Einfache Alternative zu `submitChallengeResult()`, die nur den Abschluss-Flag setzt ohne Scoring. Nachdem `submitChallengeResult` eingebunden wurde, überflüssig.

### D3: `getNextSong()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Nächsten Song aus der Warteschlange per Modulo-Index holen. Die Song-Auswahl läuft jetzt über andere Mechanismen.

### D4: `getActivePlayersByType()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Aktive (nicht eliminierte) Spieler nach Typ (Mikrofon vs Companion) filtern.

### D5: `setPlayerActive()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Spieler-Mikrofon mid-game stummschalten.

### D6: `removeCompanionPlayer()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Companion bei Disconnect während Setup entfernen.

### D7: `updateCompanionHeartbeat()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Heartbeat-Timestamp für Companion aktualisieren um Disconnects zu erkennen.

### D8: `serializeBattleRoyale()` / `deserializeBattleRoyale()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Game-State für Persistenz über Page-Reload serialisieren.

### D9: `getEliminationOrder()` — battle-royale.ts
- **Wahrscheinliche Funktion:** Spieler nach Eliminierungs-Runde sortieren für Ergebnis-Anzeige.

### D10: `calculateRounds()` — tournament.ts (nur intern genutzt)
- **Wahrscheinliche Funktion:** Anzahl Runden aus Spielerzahl berechnen. Export unnötig.

### D11: Viele `XP_SOURCES`-Einträge — player-progression.ts
- **Wahrscheinliche Funktion:** `DAILY_COMPLETE`, `CHALLENGE_COMPLETE`, `DUET_COMPLETE`, `LEVEL_UP` etc. — definiert aber nie referenziert (Daily Challenge hat eigenes XP-System).

### D12: `PERFECT_CHALLENGE: 50` — daily-challenge.ts
- **Wahrscheinliche Funktion:** XP-Belohnung für 100% Accuracy in Accuracy-Challenge. Definiert aber nie vergeben.

### D13: `VoiceRecorder` Klasse — audio-effects.ts (~40 Zeilen)
- **Wahrscheinliche Funktion:** MediaRecorder-basiertes Voice-Recording für Share-Feature. Implementierung läuft über `use-replay-recorder`.

### D14: `getSpectrogramData()`, `getAnalyser()`, `isActive()`, `getCurrentPreset()`, `getSettings()` — audio-effects.ts
- **Wahrscheinliche Funktion:** Analyser-Daten für Visualisierung, Status-Abfrage, Preset-Abfrage, Settings-Serialisierung. Alles für eine geplante aber nicht implementierte Preset-Panel-UI.

### D15: Sechs `*Enabled()` Setzer + Bulk-Setter — audio-effects.ts
- **Wahrscheinliche Funktion:** Individuelle Effekt-Toggle (Reverb/Delay/EQ/Compressor/Distortion) und Master-Volume. Für geplante UI-Steuerelemente.

### D16: `resetPitchDetectorManager()` — pitch-detector.ts
- **Wahrscheinliche Funktion:** Singleton-Reset für Tests/Hot-Reload. Analog zu `resetPitchDetector` das verwendet wird.

### D17: `resetMicrophoneManager()` — microphone-manager.ts
- **Wahrscheinliche Funktion:** Singleton-Reset für Tests/Cleanup.

### D18: `checkOptimalSettings()`, `getAllMicsSettingsStatus()`, `applyOptimalSettingsToAll()` — microphone-manager.ts
- **Wahrscheinliche Funktion:** Mikrofon-Compliance-Check für alle Spieler, Ein-Klick-Optimal-Einstellungen.

### D19: `getConnectedDevice()` — microphone-manager.ts
- **Wahrscheinliche Funktion:** Aktuelle Mikrofon-Info für UI-Anzeige.

### D20: `getMicrophoneForPlayer()` — microphone-manager.ts
- **Wahrscheinliche Funktion:** Lookup welches Mikrofon welchem Spieler zugewiesen ist.

### D21: P3/P4 Scoring State — use-note-scoring.ts
- **Wahrscheinliche Funktion:** `p3ScoreEvents`, `p4ScoreEvents`, `p3State`, `p4State` etc. — geplant für 4-Spieler-Party-Mode. Architektur nutzt jetzt `useMultiPitchDetector`.

### D22: `emitConfetti` — game-screen.tsx
- **Wahrscheinliche Funktion:** Konfetti-Partikel bei Meilensteinen (Song-Abschluss, Highscore). Destructured aber nie aufgerufen.

### D23: `onSelectSong` — daily-challenge-screen.tsx
- **Wahrscheinliche Funktion:** Für geplante "Eigenen Song wählen"-Funktion. Deklariert aber nie aufgerufen.

### D24: `folderMap` Variable — folder-scanner.ts
- **Wahrscheinliche Funktion:** Map für Folder-Hierarchie. Deklariert aber nie befüllt oder gelesen.

### D25: `hasMedia()` — media-db.ts (private)
- **Wahrscheinliche Funktion:** Prüft ob Media für eine Song-ID existiert. Definiert aber nie aufgerufen.

### D26: `clearAllMedia()` — media-db.ts (private)
- **Wahrscheinliche Funktion:** Dev-Console-Hilfsfunktion. Unzugänglich da nicht exportiert.

### D27: `weeklyProgress` Datenstruktur — player-progression.ts
- **Wahrscheinliche Funktion:** Tracking der letzten 7 Tage. Initialisiert als leeres Array, nie befüllt, nie gelesen.

### D28: `combinedScore` — use-mobile-data.ts
- **Wahrscheinliche Funktion:** Alternative Scoring-Strategie für Song-Suche. Berechnet aber nie verwendet.

---

## Verbesserungsvorschläge

### I1: YIN-Algorithmus Heap-Allokation in pitch-detector.ts
- **Beschreibung:** `yinPitchDetection()` allokiert `new Float32Array(buffer.length / 2)` (~8KB) pro Frame bei 60fps = ~480KB/s GC-Druck.
- **Vorschlag:** Puffer in `initialize()` vorallozieren und wiederverwenden.

### I2: Audio-Effect-Chain reconnect bei jeder Setting-Änderung
- **Beschreibung:** `connectEffectChain()` disconnectet/reconnectet die gesamte Audio-Graph bei JEDEM einzelnen Setting-Change → kurze Audio-Unterbrechungen.
- **Vorschlag:** Per-Node-Connection-Management oder Gain-Node-Bypass (Gain=0 statt Disconnect).

### I3: Microphone-Permission-Prompt bei jedem `getMicrophones()` Aufruf
- **Beschreibung:** `navigator.mediaDevices.getUserMedia` wird nur für Permission-Prompt aufgerufen, triggert aber jedes Mal eine kurze Mikrofon-Aktivierung.
- **Vorschlag:** Erst `enumerateDevices()` versuchen, nur bei leeren Labels `getUserMedia` aufrufen.

### I4: `useGameLoop` Hook aufteilen (783 Zeilen)
- **Beschreibung:** Ein einzelner Hook handhabt Countdown, Media, Game-Loop, Pause/Resume, Store-Sync und Results.
- **Vorschlag:** Extrahieren in `useGameCountdown`, `useGamePauseSync`, `useGameResultsGeneration`.

### I5: `notePerformance` State-Updates bei 60fps verursachen GC-Druck
- **Beschreibung:** `setNotePerformance` erstellt bei jedem Tick neue Map + trimmed Array. Konsumiert aber nur bei ~10Hz von UI.
- **Vorschlag:** Ref-basierte Speicherung mit 10Hz-Sync zu State.

### I6: Song-Library `scanInProgress` Boolean ist nicht Thread-Safe
- **Beschreibung:** TOCTOU Race Condition bei parallelen `loadCustomSongsFromStorage` Aufrufen.
- **Vorschlag:** Promise-basierte Lock-Implementierung.

### I7: Dual XP/Level-Systeme (Daily Challenge vs Main Progression)
- **Beschreibung:** Daily Challenge nutzt 10-Level-System, Main Progression nutzt formelbasiertes unendliches System.
- **Vorschlag:** Vereinheitlichen oder klar benennen (DailyChallengeTier vs PlayerLevel).

### I8: Viele `ExtendedPlayerStats`-Felder initialisiert aber nie aktualisiert
- **Beschreibung:** `duetsCompleted`, `duelsWon`, `challengesCompleted`, `vocalRange`, `milestones.hundredSongs` etc.
- **Vorschlag:** Implementieren oder entfernen um Storage-Bloat zu vermeiden.

### I9: `connectEffectChain()` mit Gain-Node-Bypass statt Disconnect/Reconnect
- **Siehe I2.** Wichtig für flackerfreies Audio bei Effect-Toggle während der Wiedergabe.

### I10: Battle-Royale: 9 exportierte Funktionen sind Dead Code
- **Siehe D3-D9.** Entweder entfernen oder Companion-Disconnect/Persistenz implementieren.

### I11: Mobile Pitch-Detection rAF-Loop stoppt nie bei Song-Ende
- **Beschreibung:** Loop läuft weiter auf Stille, verschwendet CPU/Batterie auf Mobile.
- **Vorschlag:** Early Return mit `cancelAnimationFrame` wenn Song endet.

### I12: Song-Library-Sync sendet alle Songs alle 30 Sekunden
- **Beschreibung:** Bei großen Libraries (>1000 Songs) riesige JSON-Payloads.
- **Vorschlag:** Nur bei Änderungen syncen oder Hash/ETag-basiert.

### I13: Playlist-Manager `initializePlaylists` behandelt korrupte Daten nicht
- **Beschreibung:** `JSON.parse` Fehler wird geschluckt, aber korrupte Daten nie bereinigt.
- **Vorschlag:** Try-Catch mit `localStorage.removeItem` bei Parse-Fehler.

### I14: Library-Cache speichert Blob-URLs die nach Reload ungültig sind
- **Beschreibung:** `URL.createObjectURL` Ergebnisse sind nicht persistent.
- **Vorschlag:** Relative Dateipfade statt Blob-URLs speichern.

### I15: `folder-scanner.ts` dupliziert UltraStar-Header-Parsing (3 Kopien)
- **Beschreibung:** `parseUltraStarMetadata()`, `tauri-file-storage.ts:processFolder()`, und `ultrastar-parser.ts` parsen dieselben Header.
- **Vorschlag:** Gemeinsame `parseUltraStarHeaders()` Utility extrahieren.

---

# Code Review — Fresh Review #7

**Datum:** 2026-04-30
**Repo:** karaoke-successor
**Branch:** origin/master
**Stand:** Commit 3bb17bf

---

## Zusammenfassung

Dead Code Review (D1-D28): Die meisten Items waren bereits in vorherigen Sessions bereinigt oder werden tatsächlich verwendet. 6 echte Dead-Code-Items entfernt (D21-D27, exkl. D22).
Verbesserungen (I1-I15): 11 von 15 umgesetzt. 4 übersprungen (I4, I7, I14, I15) wegen zu hohem Regressionsrisiko oder fehlender Relevanz für Tauri-only App.

---

## Dead Code — Umsetzungs-Log

### D22 — emitConfetti aus game-screen.tsx entfernt
Wurde destruktured aber nie aufgerufen.

### D23 — onSelectSong Prop aus DailyChallengeScreen entfernt
Deklariert als Prop aber im gesamten Component-Body nie verwendet.

### D24 — folderMap Variable aus scanFilesFromFileList entfernt
Map deklariert aber nie befüllt oder gelesen.

### D21 — Dead P3/P4 Scoring State aus use-note-scoring.ts entfernt
P3/P4 scoring functions, states, refs und return-Werte entfernt. Referenzierten undefinierte Variablen.

### D27 — weeklyProgress Feld aus ExtendedPlayerStats entfernt
Typ-Definition und Initialisierung entfernt. Wurde nie aktualisiert oder gelesen.

## Verbesserungen — Umsetzungs-Log

### I1 — YIN-Algorithmus Heap-Allokation optimiert
yinBuffer in initialize() voralloziert. Spart ~480KB/s GC-Druck bei 60fps.

### I2+I9 — Audio-Effect-Chain Reconnect minimiert
effectStateChanged() trackt Enable/Disable-Toggles. Chain wird nur reconnectet bei Enable-State-Änderung.

### I3 — Microphone-Permission-Prompt nur bei Bedarf
Erst enumerateDevices(), getUserMedia nur wenn Labels leer.

### I5 — notePerformance State-Updates 60fps auf 10Hz gedrosselt
Ref-basierte Speicherung + throttled State-Sync (100ms).

### I6 — Song-Library scanInProgress Thread-Safe
Boolean-Lock durch Promise-basiertes Lock ersetzt.

### I8 — ExtendedPlayerStats ungenutzte Felder entfernt
challengesWon, topThreeFinishes, topTenFinishes, perfectChallenges, vocalRange, duetsCompleted, duelsWon, duelsLost, songsShared.

### I11 — Mobile Pitch-Detection rAF-Loop stoppt bei Song-Ende
cancelAnimationFrame statt endlos weiterlaufen.

### I12 — Song-Library-Sync nur bei Änderungen
Song-Count-Check vor Sync vermeidet redundante POSTs.

### I13 — Playlist-Manager korrupte Daten bereinigt
JSON.parse-Validierung + localStorage-Key-Löschung bei Parse-Fehler.

### Übersprungen: I4 (zu riskant), I7 (Design-Thema), I14 (Tauri-only), I15 (3 verschiedene Kontexte)
