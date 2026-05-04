# Code Review 4 — Worklog

## Review Summary
- **Date**: 2025-05-05
- **Scope**: Fresh full review of karaoke-successor/src/ (318 files)
- **TSC**: 0 errors | **ESLint**: 0 errors (26 no-console warnings)
- **Branch**: origin/master
- **Starting Commit**: 1035a46

---

## Issues Found

### P0 — Bugs / Non-functional Features
| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 1 | Score achievements unreachable (100k/500k/1m vs MAX 10000) | achievements.ts | ✅ Fixed |
| 2 | speed_demon achievement unreachable (playbackRate not in results) | use-game-loop.ts, game-screen.tsx | ✅ Fixed |
| 3 | 6 of 8 challenge modes have no gameplay effect | player-progression.ts, use-note-scoring.ts, game-screen.tsx | ✅ Fixed |

### P1 — Code Quality
| # | Issue | File(s) | Status |
|---|-------|---------|--------|
| 4 | Misleading comment in scoring.ts | scoring.ts | ✅ Fixed |
| 5 | Duplicated perfect-note estimation logic | scoring.ts, results-screen.tsx, use-game-flow-handlers.ts | ✅ Fixed |

---

## Changes Log

### Fix 1: Score Achievements (commit `d29c948`)
- **Problem**: `score_100k`, `score_500k`, `score_1m` required 100k/500k/1M points but MAX_POINTS_PER_SONG = 10,000
- **Fix**: Replaced with realistic thresholds: `score_8k` (8000, uncommon), `score_9k` (9000, rare), `score_9500` (9500, legendary)
- **Files**: `src/lib/game/achievements.ts`

### Fix 2: speed_demon Achievement (commit `0a4a744`)
- **Problem**: `playbackRate` was never included in game results, so `playbackRate >= 1.5` was always false
- **Fix**: Added `playbackRate` to `UseGameLoopOptions`, included in `generateResults()`, passed from `game-screen.tsx` via `practiceMode.playbackRate`
- **Files**: `src/hooks/use-game-loop.ts`, `src/components/screens/game-screen.tsx`

### Fix 3: Challenge Mode Modifiers (commit `740c4f4`)
- **Problem**: 6 of 8 challenge modes played as 'standard' with no gameplay effect
- **Fix**: Implemented 4 modifiers:
  - `no_pitch_guide`: Hides pitch graph and spectrogram during challenge
  - `double_speed`: Auto-sets practice playback rate (e.g. 1.5x for speed-demon)
  - `perfect_only`: Only "Perfect" hits (accuracy > 0.95) award points
  - `golden_only`: Only golden notes award points
  - `pitch_shift`: Left as TODO (requires Web Audio API pitch shifting, too complex)
- **Files**: `src/lib/game/player-progression.ts`, `src/hooks/use-note-scoring.ts`, `src/components/screens/game-screen.tsx`

### Fix 4: Scoring Comment Cleanup (commit `077f873`)
- **Problem**: Comment referenced non-existent `noteScoreMultiplier` variable; 12-line dead comment about removed function
- **Fix**: Replaced with accurate description of golden/normal weight normalization; removed dead comment block
- **Files**: `src/lib/game/scoring.ts`

### Fix 5: Consolidate estimatePerfectNotes (commit `8180491`)
- **Problem**: Identical perfect-note estimation logic duplicated in `results-screen.tsx` and `use-game-flow-handlers.ts`
- **Fix**: Extracted `estimatePerfectNotes()` to `scoring.ts` as shared export; both files now import from single source
- **Files**: `src/lib/game/scoring.ts`, `src/components/screens/results-screen.tsx`, `src/hooks/use-game-flow-handlers.ts`

---

## Known Limitations
- **pitch_shift challenge**: Requires Web Audio API real-time pitch shifting (audio time-stretch + transpose). This is a significant audio pipeline change that requires dedicated development. Not implemented in this pass.
- **UNENTSCHIEDEN hardcoded string**: `results-screen.tsx` line 561 has a German string "UNENTSCHIEDEN" that should use `t('draw')` for i18n. This is a minor i18n issue.
