# Code Review Worklog

## Review #12 — 2026-05-06

**Baseline:** TSC 0 Errors | ESLint 7 Errors (nur `no-require-imports` in Build-Scripts/Bundled-Files) / 98 Warnings

### Summary
Review #12 nach ~160 Fixes in Reviews #1-#11. Vollständige Neu-Analyse aller ~319 TS/TSX-Dateien via 4 parallele Agenten. 9 Befunde verifiziert und gefixt (3 HIGH, 4 MEDIUM, 2 LOW). 1 Fehlalarm identifiziert und verworfen (`player-progression.ts` Locale-Datumsparsing — `toDateString()` gibt IMMER Englisch-Strings zurück).

### Fixes Applied

#### Fix 1: Fehlendes `isRap`-Feld in `convertNotesToLyricLines` (HIGH — Logic-Bug)
**Datei:** `src/lib/parsers/notes-to-lyric-lines.ts:49-59`
**Schweregrad:** HIGH
**Problem:** Die Funktion wird als „Single Source of Truth" für Note-Konvertierung bezeichnet, setzte aber `isRap` nicht auf den Note-Objekten. Sowohl `ultrastar-parser.ts` als auch `folder-scanner.ts` setzen `isRap: note.type === 'R' || note.type === 'G'` korrekt, aber dieser zentrale Converter nicht. Rap-Notes wurden beim Singen nicht als Rap erkannt und anders bewertet, wenn der Loader-Codepfad durch `song-lyrics-loader.ts` → `convertNotesToLyricLines()` ging.
**Fix:** `isRap: note.type === 'R' || note.type === 'G'` ergänzt.

#### Fix 2: `ratingCount` wird bei Rating-Verbesserung nicht kumuliert (HIGH — Logic-Bug)
**Datei:** `src/lib/game/rate-my-song-ranking.ts:94-96, 150-152`
**Schweregrad:** HIGH
**Problem:** Wenn ein Spieler eine bessere Bewertung erreicht (`entry.rating > old.rating`), wird der gesamte Eintrag durch `newEntry` ersetzt, der `ratingCount` aus dem neuen Eintrag übernimmt (nur die neuen Votes). Die bisher akkumulierten `old.ratingCount` Votes gehen verloren. Der gewichtete Score `rating * log2(ratingCount + 1)` fällt dadurch künstlich zurück. Gleicher Bug in `addDailyRateMySongEntry`.
**Fix:** `newEntry.ratingCount = old.ratingCount + entry.ratingCount` in beiden Funktionen.

#### Fix 3: MIDI-Tempo-Changes ignorieren — falsche Note-Dauer (HIGH — Logic-Bug)
**Datei:** `src/lib/parsers/multi-format-import.ts:212-243`
**Schweregrad:** HIGH
**Problem:** `tickDurationMs` wurde nur EINMAL nach dem Parsen mit dem letzten Tempo-Wert berechnet. Bei MIDI-Dateien mit Tempo-Änderungen (Ritardando, Accelerando — sehr häufig bei .kar-Dateien) erhielten Notes vor einer Tempo-Änderung eine falsche Dauer und Startzeit.
**Fix:** Tempo-Map (`tempoMap`) aufgebaut, die alle Tempo-Änderungen mit Tick-Position aufzeichnet. Neue `tickToMs()`-Funktion konvertiert jede Tick-Position individuell unter Berücksichtigung aller Tempo-Changes. Interface `MIDIKaraokeData` auf `startTimeMs` umgestellt (statt `tick`), `convertToSong` entsprechend aktualisiert.

#### Fix 4: Fehlender `isSongPlaying`-Guard in Companion-Singalong (MEDIUM)
**Datei:** `src/components/game/companion-singalong-screen.tsx:261-263`
**Schweregrad:** MEDIUM
**Problem:** Jeder Re-Render bei `isPlaying`/`phase`-Änderung feuerte `setIsSongPlaying()` auf den Party-Store, auch wenn der Wert sich nicht geändert hatte. `ptm-game-screen.tsx` und `medley-game-screen.tsx` hatten bereits einen `lastIsSongPlayingRef`-Guard, aber `companion-singalong-screen.tsx` nicht. Verursachte unnötige Re-Renders in allen Store-Abonnenten.
**Fix:** `lastIsSongPlayingRef`-Guard hinzugefügt (gleiches Pattern wie ptm-game-screen). Cleanup auf Unmount ergänzt (`setIsSongPlaying(false)`).

#### Fix 5: `previewDurationTimeoutRef` nicht gelöscht bei neuem Preview (MEDIUM)
**Datei:** `src/hooks/use-library-preview.ts:137`
**Schweregrad:** MEDIUM
**Problem:** Wenn `handlePreviewStart` aufgerufen wird, während bereits ein Preview läuft (dessen Duration-Timeout noch aktiv ist), wird das alte Timeout nicht mit `clearTimeout` gelöscht. Das alte Timeout kann das neue Preview unerwartet vorzeitig stoppen.
**Fix:** `clearTimeout(previewDurationTimeoutRef.current)` vor dem Setzen des neuen Timeouts.

#### Fix 6: Konfetti-Intervall läuft ewig weiter (MEDIUM — CPU-Leak)
**Datei:** `src/components/game/ptm-song-results.tsx:266-279`
**Schweregrad:** MEDIUM
**Problem:** Das `setInterval` lief weiter, auch wenn `confettiParticles` nach ~3 Sekunden ein leeres Array war. `setInterval` feuerte alle 50ms `setConfettiParticles(prev => prev.filter(...))` auf ein leeres Array — unnötige CPU-Last für die gesamte restliche Komponenten-Lebensdauer.
**Fix:** `animating`-Flag hinzugefügt; Interval cleart sich selbst sobald `next.length === 0`. Cleanup return setzt `animating = false`.

#### Fix 7: `difficulty` Stale Closure im Battle Royale Game Loop (MEDIUM)
**Datei:** `src/hooks/use-battle-royale-game.ts:314, 348`
**Schweregrad:** MEDIUM
**Problem:** `startGameLoop` war in `useCallback` mit `[]` Deps gewickelt, las `difficulty` aber direkt aus dem Closure. Wenn sich der Schwierigkeitsgrad zwischen Runden änderte, verwendete der Scoring-Loop weiter den alten Wert.
**Fix:** `difficultyRef` hinzugefügt und `difficultyRef.current` im Game-Loop verwendet (konsistentes Pattern mit anderen State-Variablen).

#### Fix 8: `applyEffectPreset` nicht in `useCallback` (LOW — Performance)
**Datei:** `src/hooks/use-game-audio-effects.ts:183-189`
**Schweregrad:** LOW
**Problem:** `applyEffectPreset` war eine Plain-Function, die bei jedem Render eine neue Referenz erzeugte. Dies destabilisierte memoisierte Kindkomponenten und Dep-Arrays in Consumern.
**Fix:** In `useCallback` mit `[audioEffectsRef]` gewickelt. Deklaration vor das Return-Objekt verschoben.

#### Fix 9: P3/P4 Combo-Ref Fallback dokumentiert (LOW — Latenter Bug)
**Datei:** `src/hooks/use-note-scoring.ts:426-430`
**Schweregrad:** LOW
**Problem:** `checkPlayerNoteHits` hat eine binäre `_playerIndex === 1 ? p2 : p1` Fallunterscheidung. Spieler-Index >= 2 würden fälschlicherweise P1's Combo-Ref teilen. Momentan nur `checkP2NoteHits` als Aufrufer (immer Index 1), also kein aktiver Bug.
**Fix:** Kommentar hinzugefügt, der die Limitation dokumentiert.

### Dead Code (aufgelistet, nicht gelöscht)

#### Unbenutzte Imports
| Datei | Import | Vermutliche Funktion |
|---|---|---|
| `src/components/screens/settings-screen.tsx:14` | `setJson`, `clearAll` | Wurden früher für Settings-Reset/Export verwendet |
| `src/hooks/use-folder-scanner.ts:4` | `getItem` | Wurde früher für Cache-Lookup verwendet |
| `src/lib/game/song-library.ts:4` | `setItem`, `getJson` | Wurden früher für Storage-Operationen verwendet |
| `src/lib/i18n/translations.ts:6` | `getItem` | Wurde früher für Sprach-Lookup verwendet |

#### Unbenutzte Typ-Exports
| Datei | Export | Vermutliche Funktion |
|---|---|---|
| `src/lib/game/ptm-next-song.ts` | `PtmNextSongResult`, `PtmNextMedleyResult`, `PtmNextSongAction` | Für zukünftige Erweiterung des Pass-the-Mic Song-Pickers gedacht |

#### Unbenutzte Props/Variablen
| Datei | Name | Vermutliche Funktion |
|---|---|---|
| `src/components/game/note-highway.tsx:298` | `_playerColor` | Früher für benutzerdefinierte Spielerfarben gedacht, jetzt über `colorScheme` gelöst |
| `src/hooks/use-note-scoring.ts:63` | `beatDuration` (Interface-Parameter) | Wird im Interface deklariert aber nie verwendet — tatsächlicher Wert kommt von `timingData.beatDuration` |
| `src/hooks/use-mobile-connection.ts:61` | `_isWakeUp` | Für Wake-on-LAN Feature gedacht, noch nicht implementiert |

### Verbesserungsvorschläge

1. **Dreifachimplementierung der Lyric-Line-Gruppierung konsolidieren:** `ultrastar-parser.ts`, `folder-scanner.ts` und `notes-to-lyric-lines.ts` haben jeweils leicht unterschiedliche Implementierungen. `notes-to-lyric-lines.ts` ist der designierte Single Source of Truth, sollte aber überall genutzt werden. Insbesondere der BPM-abhängige Zeilenumbruch-Threshold unterscheidet sich (feste 8 Beats vs. `480000 / bpm` ms).

2. **`scanFilesFromFileList` Background-Bilder ergänzen:** Der Fallback-Pfad (wenn File System Access API nicht unterstützt wird) ignoriert `BACKGROUND_EXTENSIONS`. Nur `scanDirectoryHandle` erkennt Hintergrundbilder.

3. **`note-utils.tsx:369` — Objekt-Spread im Hot-Path:** `{ ...note, line: note.line }` erzeugt pro Frame unnötige Kopien (bei 60fps ~1800 Allokationen/Sekunde). `result.push(note)` würde ausreichen.

4. **`pitch-graph.ts:61-66` — Target-Note-Punkte:** Für jeden Target-Note wird alle 50ms ein Punkt hinzugefügt. Bei 500 Notes à 2s → 20.000 Points. Das `history`-Array wird bei jedem Frame mit `filter(p => p.isTarget)` durchlaufen — O(n) pro Frame.

5. **`use-remote-control.ts:244` — Callbacks im Effect-Dep-Array:** `stop`, `onBack`, `onEnd` vom Parent werden im Dependency-Array verwendet. Wenn nicht mit `useCallback` memoisiert, wird das `setInterval` bei jedem Parent-Re-Render neu gestartet. Empfehlung: Callbacks über Refs einspeisen.

6. **`competitive-words-blind.ts:291-295` — Irreführender Kommentar:** Der Kommentar beschreibt ein Verhalten, das der Code nicht implementiert. Sollte korrigiert werden.

### Files Changed
- `src/lib/parsers/notes-to-lyric-lines.ts` — Fix #1
- `src/lib/game/rate-my-song-ranking.ts` — Fix #2
- `src/lib/parsers/multi-format-import.ts` — Fix #3
- `src/components/game/companion-singalong-screen.tsx` — Fix #4
- `src/hooks/use-library-preview.ts` — Fix #5
- `src/components/game/ptm-song-results.tsx` — Fix #6
- `src/hooks/use-battle-royale-game.ts` — Fix #7
- `src/hooks/use-game-audio-effects.ts` — Fix #8
- `src/hooks/use-note-scoring.ts` — Fix #9

---

## Review #11 — 2026-05-06

**Baseline:** TSC 0 Errors | ESLint 0 Errors / 54 Warnings

### Summary
Review #11 zeigt deutlich diminishing returns — die Codebase ist in exzellentem Zustand nach 10 vorherigen Reviews. Nur 3 genuine Issues gefunden.

### Fixes Applied

#### Fix 1: Fallback-Scoring vergibt 0 Punkte für Edge-Hits (Logic-Bug)
**Datei:** `src/lib/game/party-scoring.ts:144`
**Schweregrad:** Medium
**Problem:** In `evaluateAndScoreTick()`, wenn kein `scoringMeta` vorliegt (Fallback-Pfad), konnte ein Treffer am Rand der Toleranz 0 Punkte erhalten. `accuracy * 10` ergab z.B. `0.1`, was `Math.round()` auf 0 rundete. Ein Hit (`isHit=true`) sollte immer mindestens 1 Punkt geben.
**Fix:** `Math.max(1, ...)` auch im Fallback-Pfad ergänzt.

#### Fix 2: Dead State `p1ScoreEvents` / `p2ScoreEvents` entfernt
**Datei:** `src/hooks/use-note-scoring.ts`
**Schweregrad:** Low
**Problem:** `p1ScoreEvents` und `p2ScoreEvents` wurden via `setP1ScoreEvents`/`setP2ScoreEvents` geschrieben und vom Hook returned, aber in `game-screen.tsx` nie destrukt oder konsumiert. Verursachte unnötige State-Updates und Speicherverbrauch.
**Fix:** State-Deklarationen, Resets und duet-spezifische Events entfernt. P2-Events werden jetzt in den allgemeinen `scoreEvents` Stream geschrieben.

#### Fix 3: `startGameLoop` in `useCallback` gewickelt
**Datei:** `src/hooks/use-battle-royale-game.ts:256`
**Schweregrad:** Low
**Problem:** `startGameLoop` war eine Plain-Function (nicht in `useCallback` gewickelt), was bei jedem Render eine Neuerstellung und unnötiges Sync-Effect-Auslösen verursachte. In einem performance-kritischen Game-Loop-Setup ist das suboptimal.
**Fix:** In `useCallback` mit `[]` Deps gewickelt (liest alle State über Refs).

### Dead Code (aufgelistet, nicht gelöscht)
- Kein weiterer Dead Code gefunden, der nicht bereits in vorherigen Reviews behandelt wurde.

### Files Changed
- `src/lib/game/party-scoring.ts` — Fix #1
- `src/hooks/use-note-scoring.ts` — Fix #2
- `src/hooks/use-battle-royale-game.ts` — Fix #3
