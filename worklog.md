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
