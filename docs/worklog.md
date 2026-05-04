# Karaoke Successor — Code Review Worklog

## Session 3 — Code Review Fixes

**Datum:** 2026-05-05  
**Scope:** 73 doppelte Parameternamen, 3 echte Bugs, 3 Dead States, unsichere Type-Assertions, leere Catch-Blöcke, duplizierte Typen, Event-Listener Leak, leere Kommentare

---

### Fix 1: Bug 2 — Unsafe Type-Assertion in folder-scan-tab.tsx
**Datei:** `src/components/import/folder-scan-tab.tsx`, `src/lib/parsers/folder-scanner.ts`
**Problem:** `files as unknown as FileList` — `File[]` wurde unsicher zu `FileList` gecastet
**Lösung:** `scanFilesFromFileList()` Parameter-Typ von `FileList` zu `FileList | File[]` geändert
**Commit:** `3860890`

---

## Session 6 — Code Review Fixes (Review 5)

**Datum:** 2026-05-05
**Scope:** 2 TS-Fehler, 4 Dead-Code-Einträge, 1 Logik-Warnung, Verbesserungsvorschläge

### Fix 1: P0-1 — Gebrochene Re-Exports in ptm-game-screen.tsx
**Datei:** `src/components/game/ptm-types.ts`
**Problem:** `ptm-game-screen.tsx:33` re-exportierte `PassTheMicPlayer` und `PassTheMicSegment` aus `ptm-types.ts`, aber die Typen dort waren zu `PtmPlayer`/`PtmSegment` umbenannt worden.
**Lösung:** Backward-compatible Type-Aliases (`export type PassTheMicPlayer = PtmPlayer` etc.) in `ptm-types.ts` hinzugefügt.
**Verifikation:** TSC 0 Errors
**Commit:** `2265440`

### Fix 2: DC-A+B — Duplizierte PTM-Typen konsolidiert
**Dateien:** `ptm-types.ts`, `pass-the-mic-screen.tsx`, `ptm-next-song.ts`, `ptm-segments.ts`, `party-setup-section.tsx`, `results-screen.tsx`
**Problem:** `PassTheMicPlayer`, `PassTheMicSegment`, `PassTheMicSettings`, und `DEFAULT_SETTINGS` waren doppelt definiert (in `pass-the-mic-screen.tsx` lokal und in `ptm-types.ts` kanonisch). Die lokale `DEFAULT_SETTINGS` hatte `randomSwitches: true`, die kanonische nicht. Die lokale `PassTheMicSettings` fehlten `sharedMicId`/`sharedMicName`.
**Lösung:** Duplikate aus `pass-the-mic-screen.tsx` entfernt, Import von `ptm-types.ts`. `randomSwitches: true` zur kanonischen `DEFAULT_SETTINGS` hinzugefügt. 4 Verbraucher aktualisiert.
**Verifikation:** TSC 0 Errors
**Commit:** `516cf67`

### Fix 3: DC-C — Unbenutzte _loopCount/_resetLoopCount entfernt
**Datei:** `src/components/screens/game-screen.tsx`
**Problem:** `_loopCount` und `_resetLoopCount` wurden destrukturiert aber nie verwendet.
**Lösung:** Hook-Aufruf ohne Destrukturierung beibehalten (hat essentielle Seiteneffekte: playbackRate, Loop-Detection).
**Verifikation:** TSC 0 Errors
**Commit:** `a26dc53`

### Fix 4: DC-D — Unbenutzter Parameter _stateRef entfernt
**Datei:** `src/hooks/use-note-scoring.ts`
**Problem:** `checkPlayerNoteHits` empfing `_stateRef` (p2StateRef) als Parameter, las aber nie davon. State wird via `setPlayerState` und ref-basiertem Combo-Tracking verwaltet.
**Lösung:** Parameter und Argument am Aufrufort entfernt.
**Commit:** `e42898e`

### Fix 5: L-1 — react-hooks/exhaustive-deps Warnungen behoben
**Datei:** `src/hooks/use-note-scoring.ts`
**Problem:** `checkPlayerNoteHits` und `checkNoteHits` verwendeten `hasPerfectOnly`/`hasGoldenOnly` im Body, aber diese standen nicht im useCallback-Dependenz-Array → Risiko von stale closures.
**Lösung:** `hasPerfectOnly` und `hasGoldenOnly` zu beiden Dep-Arrays hinzugefügt.
**Verifikation:** ESLint 0 Warnings für die Datei
**Commit:** `e42898e`

---
