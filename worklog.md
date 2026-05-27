---
Task ID: 1
Agent: Main Agent
Task: Fix Missing Words mode — 3 critical bugs + library quick-start pipeline

Work Log:
- Analyzed complete Missing Words pipeline: useGameModes → game store → LyricLineDisplay
- Identified Bug 1: note-highway.tsx removed note blocks in missing-words mode despite comment saying notes should stay visible
- Identified Bug 2: game-screen.tsx did not pass hardcoreMissingWords to DuetNoteHighway
- Identified Bug 3: Preview text was fully hidden or showed raw text; needed underscore replacement for hidden words
- Identified Bonus: Library quick-start path dropped competitive settings (hardcoreMissingWords, frequency, granularity, escalating)
- Fixed all 4 issues across 5 files
- Verified: zero TypeScript errors in src/
- Committed as ac2c448 and pushed to origin/main

Stage Summary:
- Fix 1 (note-highway.tsx): Removed isHiddenNote check that returned null for missing-words notes. Notes are always visible now; only text is hidden.
- Fix 2 (game-screen.tsx): Added hardcoreMissingWords={g.gameState.hardcoreMissingWords} prop to DuetNoteHighway component.
- Fix 3 (single-player-lyrics.tsx + duet-note-highway.tsx): Replaced nextLineHasHiddenContent logic with two separate computations: shouldHidePreview (blind mode only) and previewText (with missing-words underscore replacement). Preview now shows visible words while hiding only the missing words as underscores.
- Fix 4 (game-screen-hook.ts): Added fallback selectors that read from unifiedSetupResult when competitiveGame is null, with label→number conversion for missingWordFrequency.
