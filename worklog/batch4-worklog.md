# Batch 4 Worklog - Settings/UI/META Fixes

## Fix 1: Settings/Editor - Center title lines on screen
- Status: DONE (commit 02a3d5d)
- File: src/components/screens/settings-screen.tsx
- Change: Added `max-w-7xl mx-auto px-4 md:px-6 lg:px-8` to both the header div and tab bar div, ensuring they stay centered even when Editor tab is active (which removes max-w from the outer container).

## Fix 2: Companion App Connection URL - dynamic instead of hardcoded
- Status: DONE (commit 38edc1e)
- Files:
  - src/lib/qr-code.ts (both src/ and src/src/)
  - src/components/screens/character/character-settings-card.tsx
- Change: `buildCompanionUrl()` now reads the actual port from `window.location.port` instead of hardcoding 3000. All callers updated to pass `undefined` instead of hardcoded `3000`.

## Fix 3: PTM Settings - Microphone selection display fix
- Status: DONE (commit d25ff45)
- File: src/lib/audio/microphone-manager.ts
- Root cause: `saveConfig()` only saved `deviceId` but NOT `id`. The `SingleMicSelector` reads from `MULTI_MIC_CONFIG` expecting `id`, so dropdown options had `value=undefined` and couldn't match.
- Change: Added `id` to the saveConfig output. Added migration in loadConfig to generate IDs for old entries missing `id`.

## Fix 4: META-data internationalization (Language + Genre normalization)
- Status: DONE (commit d61d55f)
- Files:
  - NEW: src/lib/parsers/meta-normalizer.ts
  - src/lib/game/song-library.ts
  - src/hooks/use-library-filters.ts
  - src/lib/parsers/ultrastar-parser.ts
- Changes:
  - Created `meta-normalizer.ts` with language alias mapping (30+ languages, various spellings like English/Englisch/Ingles/Ingelese all → "English")
  - Genre splitting on commas: "Soundtrack, K-Pop" → song appears in both "Soundtrack" and "K-Pop" filters
  - Updated `getGenres()`, `getLanguages()`, `filterSongs()` in song-library.ts
  - Updated `use-library-filters` hook for consistent normalization in library screen
  - Normalized language at parse time in ultrastar-parser.ts
