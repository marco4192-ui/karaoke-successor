# Worklog — Review 5 (Comprehensive Code Review)

## Session Start: 2025-05-05

## Found Issues
- **P0 (2):** Daily Challenge Score-Target unreachable, Weekly Progress Off-by-One
- **P1 (4):** Pitch detector race condition, unused score param, 2 reserved dead functions
- **P2 (6):** Unused React imports, unused variables, unused interface, type duplicate, dead re-exports, confusing logic

---

### Fix 1: P0-1 — Daily Challenge Score-Target
- **Status:** ✅ done
- **Commit:** 7277144
- **Details:** `score: 80000` → `score: 8000`. 80000 was 8× the theoretical max (MAX_POINTS_PER_SONG = 10000). Changed to 8000 (80% — "Excellent" rating achievable).
- **Files:** `src/lib/game/daily-challenge.ts` (line 134)

### Fix 2: P0-2 — Weekly Progress Off-by-One
- **Status:** ✅ done
- **Commit:** aaaab53
- **Details:** `dayOfWeek` from `Date.getDay()` (0=Sun) was used directly as array index in a Monday-starting array. Sunday (0) overwrote Monday's slot. Added conversion: `weekIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1`.
- **Files:** `src/lib/game/daily-challenge.ts` (line 410)

### Fix 3: P1-1 — Race Condition in switchMicrophone
- **Status:** ✅ done
- **Commit:** 0ad88b0
- **Details:** `destroy()` and `resetPitchDetector()` were called without `await`. `getPitchDetector()` ran synchronously before `resetPitchDetector()`'s microtask completed, returning the destroyed instance. Added `await resetPitchDetector()` and removed redundant separate `destroy()` call (resetPitchDetector already calls destroy internally).
- **Files:** `src/hooks/use-pitch-detector.ts` (lines 43-47)

### Fix 4: P1-2 — calculateSongXP score-Parameter used
- **Status:** ✅ done
- **Commit:** 48fbdfe
- **Details:** The `score` parameter was declared but never used. Added score-based XP bonus: up to 100 bonus XP proportional to `score/MAX_SCORE`. A perfect 10000 score now earns 100 bonus XP on top of accuracy/combo/etc bonuses. Updated all 5 affected tests.
- **Files:** `src/lib/game/player-progression.ts` (lines 352-382), `src/__tests__/player-progression.test.ts`

### Fix 5: P1-3 — Dead Code: deleteReplaysForSong exported
- **Status:** ✅ done
- **Commit:** e51cc4b
- **Details:** `_deleteReplaysForSong()` was a fully implemented but private function. Exported as `deleteReplaysForSong()` so it can be used when songs are removed from the library.
- **Files:** `src/lib/db/replay-db.ts` (line 166)

### Fix 6: P1-4 — Dead Code: nativeWriteFileBytes exported
- **Status:** ✅ done
- **Commit:** f6bd60a
- **Details:** `_nativeWriteFileBytes()` wrapped an existing Tauri command `native_write_file_bytes` but was private. Exported for use in import features (e.g. importing audio/images).
- **Files:** `src/lib/native-fs.ts` (line 61)

### Fix 7: P2-1 — 41 Unused React Imports Removed
- **Status:** ✅ done
- **Commit:** f356ae8
- **Details:** Removed `import React from 'react'` from 41 files where it was unnecessary (Next.js 17+ JSX transform). Kept it in `error-boundary.tsx` (uses `React.Component`, `React.ErrorInfo`) and `note-utils.tsx` (uses `React.CSSProperties`, `React.ReactNode`). Also kept in 4 files that reference `React.Dispatch`, `React.SetStateAction`, `React.Fragment`.
- **Files:** 41 component files across components/dialogs, editor, game, home, import, party, results, screens, settings

### Fix 8: P2-2 — 4 Unused Local Variables Removed
- **Status:** ✅ done
- **Commit:** c7e3dec
- **Details:**
  - `__isIdle` in `editor/audio-analysis-panel.tsx` — computed but never read
  - `__lineBreakBeat` in `editor/new-song-dialog.tsx` — computed but never used (comment: "Already accounted for")
  - `__winner` in `game/ptm-song-results.tsx` — `sorted[0]` stored but never read
  - `__isPartyMode` in `library/song-start-modal.tsx` — complex boolean expression, never used
  - Also prefixed unused `stateRef` parameter with `_` in `use-note-scoring.ts`
  - Left `currentPreset` in `audio-effects.ts` as-is (private class field, no TS/ESLint error)
- **Files:** 5 files

### Fix 9: P2-3 — Unused _SuggestionItem Interface Removed
- **Status:** ✅ done
- **Commit:** 4eb3340
- **Details:** 7-field interface in `ai-assistant-panel.tsx` was never referenced. Removed.
- **Files:** `src/components/editor/panels/ai-assistant-panel.tsx`

### Fix 10: P2-4 — PitchData Duplication — No Change
- **Status:** ✅ analyzed (no change needed)
- **Details:** Two `PitchData` interfaces exist: `mobile-types.ts` (3 fields) and `api/mobile/mobile-types.ts` (5 fields). They serve different purposes — the mobile type is intentionally simpler for the pitch detection hook. Keeping both.

### Fix 11: P2-5 — Dead Re-Exports Removed from ptm-types
- **Status:** ✅ done
- **Commit:** 4eb3340
- **Details:** `export type { PassTheMicPlayer, PassTheMicSegment }` re-exported from `pass-the-mic-screen` but no consumer imported through this barrel. All consumers import directly from the source file. Removed the dead re-exports.
- **Files:** `src/components/game/ptm-types.ts`

### Fix 12: P2-6 — isPlayerFinished Logic Clarified
- **Status:** ✅ done
- **Commit:** 4eb3340
- **Details:** The condition `player.roundsPlayed <= minRounds && player.roundsPlayed >= bestOf` was counterintuitive. Added a detailed comment explaining why `<=` (not `>=`) is correct: it returns true only for the player(s) with the fewest rounds who have also reached bestOf.
- **Files:** `src/lib/game/competitive-words-blind.ts` (lines 289-295)

---

## Summary
- **12 issues found**, **12 addressed** (11 fixed, 1 analyzed-no-change)
- **9 commits pushed** to origin/master
- **0 new TypeScript errors** introduced
- **34/34 unit tests passing** (karaoke project)
- **26 ESLint warnings** (all `no-console`, pre-existing)
