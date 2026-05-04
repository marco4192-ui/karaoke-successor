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

