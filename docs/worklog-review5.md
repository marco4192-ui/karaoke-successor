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
- **Date:** 2025-05-05
- **Details:** `score: 80000` → `score: 8000`. The old target was 8× the theoretical maximum score per song (MAX_POINTS_PER_SONG = 10000). Changed to 8000 (80% of max) — achievable with "Excellent" rating.
- **Files:** `src/lib/game/daily-challenge.ts` (line 134)

---

(Updates follow after each fix)
