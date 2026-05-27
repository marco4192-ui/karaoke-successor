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

---
Task ID: 2
Agent: Main Agent
Task: Fix Blind Karaoke mode — 4 bugs resolved

Work Log:
- Analyzed complete Blind Karaoke pipeline: useGameModes → game store → NoteHighway/DuetNoteHighway/NoteLane
- Found Bug 1: blindFrequency had no unifiedSetupResult fallback (same pattern as missingWordFrequency bug)
- Found Bug 2: blindHardcore had no unifiedSetupResult fallback
- Found Bug 3: NoteLane (low-perf mode) completely ignored blind mode
- Found Bug 4: Shared lastMWWarningKeyRef between blind and missing-words warning effects
- Verified existing pipeline is correct: passage-based pattern generation, per-frame tracking, first passage always visible
- Fixed all 4 issues across 4 files
- Verified: zero TypeScript errors in src/
- Committed as 2d1dd3f and pushed to origin/main

Stage Summary:
- Fix 1 (game-screen-hook.ts): Added dual-source selector for blindFrequency reading from competitiveGame or unifiedSetupResult with label→number conversion.
- Fix 2 (game-screen-hook.ts): Added fallback for blindHardcore reading from unifiedSetupResult.settings.hardcore.
- Fix 3 (note-lane.tsx + game-screen.tsx): Added isBlindSection, gameMode, isBlindHardcore props to NoteLane. Notes hidden when blind section active, 🙈 indicator shown, pitch indicator hidden. Hardcore mode: lyrics replaced with underscores when notes visible. Passed props from game-screen.tsx.
- Fix 4 (use-game-modes.ts): Split lastMWWarningKeyRef into separate lastBlindWarningKeyRef and lastMWWarningKeyRef refs. Updated all references in blind warning effect and reset effect.
