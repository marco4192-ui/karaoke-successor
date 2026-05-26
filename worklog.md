---
Task ID: 1
Agent: main
Task: Fix 1 - Battle Royale crashes after first round (React error #185)

Work Log:
- Analyzed React error #185 (Maximum update depth exceeded / cross-component setState during render)
- Added `mountedRef` declaration to `use-battle-royale-game.ts` (was missing, referenced in game loop)
- Added unmount guard in countdown timeout to prevent setState after unmount
- Changed countdown condition from `||` to `&&` to prevent PlayingView rendering during state transitions

Stage Summary:
- 3 targeted changes across 2 files
- Fixed the crash by preventing stale state updates during round transitions
---
Task ID: 2+3
Agent: main
Task: Fix 2 (microphones not active) + Fix 3 (mic badge position)

Work Log:
- Changed mic re-init guard from `managerRef.current && isInitializedRef.current` to `managerRef.current` in use-multi-pitch-detector.ts
- Changed badge position from `top-3` to `top-0` in playing-view.tsx

Stage Summary:
- Fixed mic re-initialization after round transitions (singleton manager was in stale state)
- Aligned mic status badge to top edge of screen
---
Task ID: 4
Agent: main
Task: Fix 4 - Tournament manual winner overlay

Work Log:
- Added `manualWinnerMatch` state to TournamentBracketView
- Added "Set Winner Manually" button below "Start Next Match" in bracket view
- Added manual winner dialog overlay matching MatchAbortDialog style
- Fixed onManualWinner handler to look up match from bracket instead of currentTournamentMatch

Stage Summary:
- Manual winner selection now works from bracket view without redirecting to settings
- Uses overlay dialog instead of navigation
---
Task ID: 5+6+7
Agent: main
Task: Fix 5 (Blind/MW lyrics logic), Fix 6 (hide notes in blind), Fix 7 (hardcore mode)

Work Log:
- Fixed next line preview to also hide for Blind mode (was only hiding for Missing Words)
- Updated duet-note-highway.tsx PlayerLyrics to hide preview in blind sections
- Removed incorrect `isHiddenNote` check from note-highway.tsx (notes hidden only in blind sections now)
- Added `hardcoreMissingWords` parameter to useGameModes hook
- Fixed Missing Words hardcore effect to use correct `hardcoreMissingWords` value (was using blind hardcore)
- Added `hardcoreMissingWords` store selector in game-screen-hook.ts

Stage Summary:
- Blind Karaoke: text always visible, notes hidden during blind passages
- Missing Words: notes always visible, text hidden for specific words
- Hardcore mode for Missing Words now uses its own setting correctly

---
Task ID: batch5
Agent: Main Agent (4 parallel sub-agents)
Task: 5 improvements — Console, testIds, editor covers, PTM pitch, party terminator

Work Log:
- Analyzed project structure: 200+ files across components, lib, hooks, app
- Identified all relevant files for 5 tasks via parallel exploration agent

Task 1 — Console aktivieren:
- Added `compiler: { removeConsole: false }` to next.config.ts
- Next.js 14+ strips console.log/error/warn in production by default
- Now all console output is visible in DevTools for debugging

Task 2 — data-testid / aria-label:
- Added ~60 unique data-testid attributes across 13 files
- Editor: search, refresh, back, filters, select-mode, batch-suggest, song cards
- Party: mode buttons (9 dynamic), setup back/start/change-song
- Home: navigation buttons, profile buttons (dynamic)
- Library: editor button
- Settings: tab bar (9 dynamic), save button
- Game HUD: pause, fullscreen, audio effects slider, reverb/echo sliders, presets
- PTM: start, back, duration, difficulty, random-switches, player selection, song selection

Task 3 — Editor Cover-Bilder:
- Added useEffect hook that calls ensureSongUrls() for all editor songs
- Processes songs in batches of 20 for performance
- Only updates state when cover URLs actually change (avoids infinite loops)
- Safe for browser (ensureSongUrls is no-op) and Tauri (converts relative paths)
- Error handling with console.warn on failures; fallback emoji always visible

Task 4 — Pass-the-Mic Pitch:
- Added debug logging to startGame(): logs mic ID, success/failure, retry attempts
- Added retry mechanism: if switchMicrophone fails, wait 500ms and retry once
- Added toast notification when pitch detection completely fails
- Added logging to use-ptm-scoring.ts: logs when pitchResult is null, logs shouldSkipPitch reasons
- Added logging to use-pitch-detector.ts: logs successful/failed device initialization with device ID
- Mic handoff effect: added logging for player mic switches

Task 5 — Party-Mode Terminator:
- Rewrote handleSongAbort() in karaoke-app.tsx with two-tier approach:
  - Tier 1 (preserve): Tournament match abort, competitive abort, medley abort, rate-my-song abort
  - Tier 2 (nuclear): All other cases → party.resetPartyState() + resetGame() + setGameMode('standard')
- Added console.log to resetPartyState() for debugging
- Hardened computePartyModeActive() in use-screen-navigation.ts:
  - Added checks for companionPlayers, cptmPlayers, selectedGameMode
  - Relaxed PTM check (removed passTheMicSong requirement)

TypeScript check: 0 new errors (all errors pre-existing in unrelated files)
Conflicts resolved during rebase (party-screen.tsx, unified-party-setup.tsx — merged both accessibility + test IDs)

Stage Summary:
- 20 files changed, 243 insertions, 82 deletions
- Commit: d0f0d1f8 pushed to main
- All 5 tasks implemented:
  1. Console: Console output now visible in production builds
  2. Test IDs: ~60 data-testid + aria-label attributes added
  3. Editor covers: URL restoration via ensureSongUrls()
  4. PTM pitch: Robustness + debug logging + retry + toast
  5. Party terminator: Nuclear resetPartyState() in handleSongAbort()

---
Task ID: 1
Agent: main + 6 subagents
Task: Fix 9 UX issues in karaoke-successor Tauri app

Work Log:
- Analyzed all 9 issues using 6 parallel Explore agents
- Dispatched 6 parallel implementation agents (one per file group)
- Resolved git rebase conflict (old file path deleted in remote)
- All changes compile with zero TypeScript errors
- Pushed to main as commit b32682a

Stage Summary:
- Fix 1: Added asyncPool concurrency limiter (20) for cover image loading in song-library.ts
- Fix 2: Added audio fade-in (800ms), full media cleanup on BR transitions
- Fix 3: Fixed library scrollability with flex layout + min-h-0 overflow container
- Fix 4: Fixed hardcoreMissingWords hardcoded false, threaded through DuetNoteHighway
- Fix 5: Added descriptive text to editor select mode toggle button (i18n EN+DE)
- Fix 6: Moved FullscreenButton into editor header row next to back button
- Fix 7: Added release year filter to all party modes (types, hook, UI, i18n, filterSongs)
- Fix 8: Verified hover feedback already exists on all library buttons
- Fix 9: Fixed BR pause to also stop video + pitch detection
- 19 files changed, 184 insertions, 52 deletions
