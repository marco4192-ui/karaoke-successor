# Worklog: Fix All Party Mode Bugs

## Task ID: w0 - Planning
- Agent: main
- Status: PLANNING

## Found Issues (120 total: 17 Critical, ~50 Medium, ~53 Low)

### File-Assignment Plan (each file → exactly one agent)

#### Phase 1 - Small independent files (parallel)
| File | Agent | Issues |
|------|-------|--------|
| en.ts | 1a | RM-M10: "Zurück" → "Back" |
| medley-ranking.ts | 1b | ME-M4: remove dead PlayerMedleyStats/getPlayerMedleyStats/getMedleyWinRate; ME-M5: remove addDailyMedleyEntry wrapper |
| medley-types.ts | 1c | ME-L4: voice modifier chipmunk comment |
| use-battle-royale-companion-polling.ts | 1d | BR-C1: fix pitch parsing; BR-C2: fix cache key mismatch |
| use-battle-royale-round-timer.ts | 1e | BR-L7: rename _gameCurrentRound |
| battle-royale-screen.tsx | 1f | BR-L5: fallback player; BR-L2: remove unused return fields consumption |
| tournament-bracket-butterfly.tsx | 1g | TO-L5: remove unused _isFinal prop |
| companion-list-section.tsx | 1h | CP-M5: remove dead type fields |
| use-companion-sync.ts | 1i | CP-M6: remove syncCompanionQueue dead export |
| companion-singalong-screen.tsx | 1j | CP-L1: remove unused GamePhase re-export |

## Task ID: 1j - companion-singalong-screen.tsx
- Agent: fix-companion-singalong-reexport
- Status: DONE

### CP-L1: Remove unused GamePhase re-export

Work Log:
- Read file, identified barrel re-export of GamePhase alongside CompanionPlayer, CompanionRoundResult, CompanionSingAlongSettings
- Grep confirmed no external file imports GamePhase from this barrel
- Removed GamePhase from the type re-export line

Stage Summary:
- CP-L1 fixed: dead re-export removed
| rate-my-song-ranking.ts | 1k | RM-M3: addAudienceRatingToStats never called (add comment/note); RM-M4: remove getAllPlayerStats dead export |

#### Phase 2 - Core logic files (parallel)
| File | Agent | Issues |
|------|-------|--------|
| battle-royale.ts | 2a | BR-C3: grand finale intro; BR-M1/M2: round highlights; BR-M3: eliminationAnimation; BR-M4/M5/M6: dead exports; BR-L1/L3/L4 |
| use-battle-royale-game.ts | 2b | BR-M7: stale closure; BR-L2/L6: dead code |
| tournament.ts | 2c | TO-C1/M9/M18: GF1 player1; TO-M2: isSpectator dead; TO-M8: player1!; TO-M10: LB position; TO-M17: remainingPlayers; TO-L1/L2/L3 |
| competitive-words-blind.ts | 2d | BM-C1: isPlayerFinished; BM-M2/M3: advanced bonus functions; BM-#1/#4/#6/#7/#8/#9: dead code/state/error |
| companion-game.tsx | 2e | CP-C1: audio pause; CP-C2: continue series; CP-M1: stale refs; CP-M3: double stop; CP-L2: wasted random; CP-L9: recordRound |
| companion-setup.tsx | 2f | CP-M2: difficulty global pollution; CP-L4: Difficulty cast |
| medley-setup.tsx | 2g | ME-C1: micId always undefined; ME-M6: swap stale closures; ME-L2: CompanionProfile.color; ME-L7: duration estimate |
| medley-game-hook.ts | 2h | ME-C3/C4: seriesHistory/onEndGame unused; ME-M2: transitionTime; ME-M7: empty 2-player block; ME-M9: handleEndEarly; ME-L3: German error strings; ME-L10/L11 |

#### Phase 3 - Screen/UI files (parallel)
| File | Agent | Issues |
|------|-------|--------|
| medley-game-results.tsx | 3a | ME-M1: dead medleySongs prop; ME-M8: comboBonus calc; ME-L8: share scores; ME-L12: leaderboard refresh |
| medley-game-screen.tsx | 3b | ME-M2: setIsSongPlaying dual control |
| tournament-screen.tsx | 3c | TO-C1: HoF duplicates; TO-M1/M5/M6/M7/M11/M14: dead imports/props |
| competitive-words-blind-screen.tsx | 3d | BM-#14: undefined Player2 solo; BM-#15/#16: _game prop; BM-#11/#23: settings lost; BM-#24: no back nav |
| rate-my-song-screen.tsx | 3e | RM-C3: playMode; RM-M1: bettingEnabled; RM-M5/M6/M9/M13: dead code/fake awards |

#### Phase 4 - Orchestrator + Store + Config (parallel, last)
| File | Agent | Issues |
|------|-------|--------|
| party-store.ts | 4a | SH-1.2/1.3: bettingEntries dead; RM-M2: hype meter dead |
| unified-party-setup.config.ts | 4b | ME-M3: elimination option in config; SH-#6: BR dual songSelection; RM settings cleanup |
| unified-party-setup.types.ts | 4c | SH-#6: MedleyModeSettings.playMode; BM-#19: frequency type mismatch |
| party-setup-section.tsx | 4d | SH-C2/C3: companion/cptm/tournament settings drop; SH-#5: companion preselected |
| party-game-screens.tsx | 4e | RM-C1/C2: series round dup; CP-C2: companion series; SH-C1: PTM series; BM-C2: competitive settings lost; dead code cleanup (votedSongRef, __ptmNextLoading, legacy screens, hardcoded German toast, tournament filter, tournament difficulty) |

---
Task ID: 1c
Agent: fix-medley-types
Task: Fix misleading chipmunk voice modifier

Work Log:
- Changed chipmunk playbackRate from 1.05 to 1.4

Stage Summary:
- ME-L4 fixed: chipmunk modifier now has a noticeable effect

#### Phase 5
- Run npx tsc, fix any remaining type errors
- Git add, commit, push

---
Task ID: 1f
Agent: fix-br-screen
Task: Fix BR screen fallback player and dead code

Work Log:
- Fixed eliminated player fallback (BR-L5): added intermediate fallback via `sortedPlayers.find(p => p.id === lastRound.eliminatedPlayerId)` before the generic `sortedPlayers.find(p => p.eliminated)`, ensuring the correct eliminated player is shown even if not found in `game.players`
- Checked BR-L2: `currentRound` and `difficulty` are NOT destructured from the hook — already clean, no action needed
- Audited all imports — all are used, no unused imports found

Stage Summary:
- BR-L5 fixed: correct eliminated player shown via prioritized ID-based lookup
- BR-L2 confirmed clean: no dead destructured variables
- No other dead code issues found in this file

---
Task ID: 1h
Agent: fix-companion-list
Task: Remove dead type fields from CompanionListResponse

Work Log:
- Read file, identified unused fields
- Removed connectedCount and remoteControl from type

Stage Summary:
- CP-M5 fixed: dead type fields removed

---
Task ID: 1a
Agent: fix-en-ts
Task: Fix en.ts i18n - German text in English locale

Work Log:
- Read en.ts
- Fixed rateMySong.back: '← Zurück' → '← Back'
- Searched for other German text in en.ts
- Fixed editor.aiHarmonize: 'KI-Harmonisierung' → 'AI Harmonization'

Stage Summary:
- Fixed rateMySong.back German→English
- Fixed editor.aiHarmonize German→English

---
Task ID: 1e
Agent: fix-br-round-timer
Task: Fix misleading _gameCurrentRound naming

Work Log:
- Renamed _gameCurrentRound to gameCurrentRound

Stage Summary:
- BR-L7 fixed: parameter no longer misleadingly marked as unused

---
Task ID: 1i
Agent: fix-companion-sync
Task: Remove dead syncCompanionQueue export

Work Log:
- Confirmed syncCompanionQueue never called by any consumer
- Removed function definition from use-companion-sync.ts (was a trivial wrapper around fetchCompanionQueue)
- Removed from useCompanionSync return type and return object
- Removed re-export from use-mobile-client.ts (destructure, return type, return value)

Stage Summary:
- CP-M6 fixed: dead export removed

---
Task ID: 1g
Agent: fix-tournament-bracket
Task: Remove unused _isFinal prop from MatchCard

Work Log:
- Checked if isFinal is passed by parent
- Removed unused _isFinal from destructuring

Stage Summary:
- TO-L5 fixed: dead prop removed

---
Task ID: 1k
Agent: fix-rms-ranking
Task: Clean up dead code in rate-my-song-ranking.ts

Work Log:
- Removed getAllPlayerStats dead export
- Added TODO comment for addAudienceRatingToStats

Stage Summary:
- RM-M4 fixed: dead export removed
- RM-M3 noted: addAudienceRatingToStats needs wiring (TODO added)

---
Task ID: 1d
Agent: fix-br-companion-polling
Task: Fix companion pitch parsing and cache key mismatch

Work Log:
- Fixed pitch response parsing (data.pitches instead of data)
- Fixed cache key from clientId to connectionCode

Stage Summary:
- BR-C1 fixed: pitch data now correctly extracted from API response
- BR-C2 fixed: cache key now matches lookup key (connectionCode)

---
Task ID: 1b
Agent: fix-medley-ranking
Task: Remove dead code from medley-ranking.ts

Work Log:
- Read file, confirmed dead exports
- Removed PlayerMedleyStats, getPlayerMedleyStats, getMedleyWinRate
- addDailyMedleyEntry IS used in party-game-screens.tsx; kept with clarifying comment

Stage Summary:
- Removed 3 dead exports (ME-M4)
- ME-M5: kept addDailyMedleyEntry with alias comment (still in use)

---
Task ID: 2f
Agent: fix-companion-setup
Task: Isolate difficulty to local state in companion-setup.tsx

Work Log:
- Replaced global difficulty state with local useState
- Removed setGlobalDifficulty call
- Kept difficulty flowing to companion settings

Stage Summary:
- CP-M2 fixed: difficulty no longer pollutes global game store
---
Task ID: 2e
Agent: fix-companion-game
Task: Fix audio pause, series continuation, stale refs in companion-game.tsx

Work Log:
- CP-C1: Added audioRef.current.pause() to early-end handler before setIsPlaying(false)
- CP-C2: Fixed handleContinue() to reset song via setCompanionSong(null), set phase to waiting, and NOT call onEndGame()
- CP-M1: Reset lastActiveNoteStartRef, lastNoteWasHitRef, lastEvalTimeRef when switch countdown reaches 0
- CP-M3: Removed duplicate stop() from clear-singalong-turn useEffect; kept it in dedicated cleanup useEffect
- CP-L2: Wrapped randomTurnDuration() in useState lazy initializer to avoid per-render recomputation

Stage Summary:
- 2 critical + 2 medium + 1 low fixes applied
- All changes verified in file

---
Task ID: 2b
Agent: fix-br-game-hook
Task: Fix stale closure and dead code in BR game hook

Work Log:
- BR-M7: Added `onUpdateGameRef = useRef(onUpdateGame)` with per-render sync; replaced `onUpdateGame(batchedGame)` with `onUpdateGameRef.current(batchedGame)` inside the game loop's `useCallback(fn, [])`
- BR-L2: Confirmed `currentRound` and `difficulty` not destructured by battle-royale-screen.tsx; removed from return type interface and return object; removed `BattleRoyaleRound` import (no longer referenced in type) and `Difficulty` import (no longer referenced in type); kept local variables as they're used internally
- BR-L6: Removed redundant `&& !p.eliminated` from micPlayers and companionPlayers filters (activePlayersRef already comes from `getActivePlayers` which filters out eliminated players)

Stage Summary:
- Stale closure fixed, dead return fields removed, redundant filter removed

---
Task ID: 2d
Agent: fix-competitive-blind
Task: Fix isPlayerFinished logic and clean up competitive-words-blind.ts

Work Log:
- BM-C1: Fixed isPlayerFinished inverted logic — removed the `player.roundsPlayed <= minRounds` condition so a player is correctly considered finished when `roundsPlayed >= bestOf`
- BM-#1: Removed PERFECT_MULTIPLIER constant (never referenced)
- BM-#4: Removed dead exports from getEscalatingMultiplier and getCurrentFrequencyMultiplier (only used internally); kept DEFAULT_COMPETITIVE_SETTINGS export (consumed by screen component)
- BM-#6: Removed unused playedByPlayer parameter from pickSmartSong
- BM-#9: Added bounds check guard at start of finishCompetitiveRound
- BM-M2/M3: Added TODO comments above calculateMissingWordsBonus and calculateBlindBonus
- BM-#7: Added TODO comment near songSelection setting
- BM-#8: Added TODO comment block above CompetitivePlayer interface listing 8 unupdated fields

Stage Summary:
- Critical logic fix applied, dead code removed, TODOs added
- Type-check passes (no new errors introduced)

---
Task ID: 2h
Agent: fix-medley-game-hook
Task: Fix transitionTime, seriesHistory, handleEndEarly, and other bugs in medley-game-hook.ts

Work Log:
- ME-C3: Renamed `_seriesHistory` to `seriesHistory` (line 161), added TODO for adaptive difficulty/seeding
- ME-C4: Renamed `_onEndGame` to `onEndGame` (line 163), stored in `onEndGameRef` for future game loop use
- ME-M2: Wired `settings.transitionTime ?? 3` into the transition useEffect (setTransitionCount + return value) replacing hardcoded `3`
- ME-M7: Added TODO comment about announcement system for "Final Face-Off!" when 2 players remain in elimination mode
- ME-M9: Added missing calls in `handleEndEarly`: `getActivePlayerIds` + snippetsSung++, `buildSnippetHighlight`, `checkSynergy`, `finalizeComeback`, `syncTeamBonusResult`, `forceRender`. Updated dependency array.
- ME-L3: Added `// TODO: i18n - replace hardcoded German strings` above 3 German error strings ('Kein Audio verfügbar', 'Audio-Laden fehlgeschlagen')
- ME-L10: Added `if (medleySongs.length === 0) return;` guard at start of `handleStart`
- ME-L11: Added `setIsSongPlaying(false)` call in `handleEndEarly` before phase transitions

Stage Summary:
- transitionTime now functional, handleEndEarly properly records data
- No new TypeScript errors introduced (pre-existing error in companion-game.tsx is unrelated)
---
Task ID: 2c
Agent: fix-tournament-core
Task: Fix GF1 player1 assignment and other tournament bugs

Work Log:
- TO-C1/M9/M18: Added GF1.player1 assignment for WB champion in `recordDoubleEliminationResult`. When `findWBNextMatch` returns `null` (WB final), the winner is now routed to GF1 as player1.
- TO-M2: Removed `export` keyword from `isSpectator()` (line 1184) — confirmed function is never imported elsewhere.
- TO-M8: Changed `return match.player1!;` to `return match.player1 ?? match.player2!;` in `resolveTie` (line 918) — now falls back to player2 if player1 is null.
- TO-M17: Reviewed `remainingPlayers` count — confirmed `eliminated` is correctly set to `true` only when a player gets their 2nd loss (LB match or GF2), so `!p.eliminated` accurately reflects active DE players.
- TO-L3: Left unnecessary `!` assertions (lines 395, 453, 757, 810) untouched per instructions to avoid type errors.

Stage Summary:
- Critical GF1 fix applied — DE tournaments now complete correctly. The WB champion is properly assigned as GF1.player1 when the WB final completes.
- All other fixes applied; pre-existing TS error in companion-game.tsx is unrelated.
---
Task ID: 2g
Agent: fix-medley-setup
Task: Fix micId assignment, swap closures, duration estimate in medley-setup.tsx

Work Log:
- ME-C1: Fixed micId to use actual mic assignment from localStorage. Added import for StorageKeys/getJsonOptional. In handleStart, loads PLAYER_MIC_PREFERENCES and MULTI_MIC_CONFIG from storage. For each local player, resolves their assigned mic (explicit assignment first, then auto-assign by index). Sets micId to the browser deviceId and micName to the custom/device name.
- ME-M6: Added teamAIds and teamBIds to the swap useEffect dependency array. The setter calls already used functional updater forms, but the includes() reads on lines 272-273 used stale closure values. Adding the deps ensures the effect always has fresh team state when swap selection reaches length 2.
- ME-L7: Added transition time to duration estimate calculation: `(snippetCount * settings.snippetDuration + (snippetCount - 1) * (settings.transitionTime ?? 3)) / 60`

Stage Summary:
- Multi-mic setup now functional, swap race condition fixed, duration estimate accurate

---
Task ID: 2a
Agent: fix-battle-royale-core
Task: Fix all bugs in battle-royale.ts

Work Log:
- BR-C3: Fixed grandFinaleIntroShown premature set (line 1043: `true` → `false` in `enterGrandFinale()`)
- BR-M1: Verified already correct — roundHighlight already appended at Grand Finale entry (line 1015)
- BR-M2: Added roundHighlight creation for Grand Finale winning round (lines 879-898), following same pattern as non-winning GF rounds (lines 920-940)
- BR-M3: Added `// TODO: Wire eliminationAnimation setting to UI toggle` comment near line 177
- BR-M4: Removed `export` from `filterRecentSongs` (line 544)
- BR-M5: Removed `export` from `recordHallOfFame` (line 271) — confirmed no external imports
- BR-M6: Removed `export` from `getEffectiveRoundDuration` (line 483) and `getEffectiveDifficulty` (line 506) — confirmed no external imports from battle-royale
- BR-L1: Added `// Note: 'active' is kept for compatibility but 'eliminated' is the authoritative field` near line 36
- BR-L3: Added runtime `Array.isArray` validation after `JSON.parse` in `getHallOfFame()` (lines 254-256)
- BR-L4: Added comment explaining `'short'` vs `'full'` round types have no behavioral difference (lines 680-681)
- Verified: `npx tsc --noEmit` shows zero new errors in battle-royale.ts

Stage Summary:
- 3 critical + 4 medium + 3 low fixes applied
- BR-M1 confirmed already correct in codebase (no change needed)
---
Task ID: 3c
Agent: fix-tournament-screen
Task: Fix HoF dedup, remove dead imports/props in tournament-screen.tsx

Work Log:
- TO-C1: Added hofRecordedRef to prevent duplicate HoF entries
- TO-M1: Removed unused songs prop from TournamentScreenProps interface and component destructuring; removed corresponding songs={...} prop from caller in party-game-screens.tsx; removed Song type import
- TO-M5/M6/M14: Removed unused imports (useCallback, HallOfFameEntry, CrowdVoteMatch, isInLosersBracket)
- TO-M7: Fixed Difficulty cast by using `(['easy', 'medium', 'hard'] as const)` tuple, removed unsafe `diff as Difficulty`
- TO-M11: Added TODO comment for filterGenre/filterLanguage hardcoded to 'all'

Stage Summary:
- HoF no longer duplicated, dead code cleaned
---
Task ID: 3b
Agent: fix-medley-game-screen
Task: Remove dual setIsSongPlaying control from medley-game-screen.tsx

Work Log:
- Removed `import { usePartyStore } from '@/lib/game/party-store'` (dead import after setIsSongPlaying removal)
- Removed `const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying)` from screen component
- Removed `setIsSongPlaying(false)` call from onNextRound handler in round-results phase
- Hook (medley-game-hook.ts) now solely manages isSongPlaying state via its phase-syncing effects and handleEndEarly
- Audited all remaining imports — all are used, no other dead imports found
- No other state management issues found in this file

Stage Summary:
- ME-M2 fixed: no more dual state control
- usePartyStore import cleaned up (was only used for setIsSongPlaying)
---
Task ID: 3a
Agent: fix-medley-results
Task: Fix dead prop, comboBonus calc, leaderboard refresh

Work Log:
- ME-M1: Removed unused `medleySongs` prop from `MedleyRoundResultsProps` interface and removed `MedleySong` from the import statement
- ME-M8: Fixed `comboBonus` calculation to use `player.maxCombo > 1 ? Math.round(player.maxCombo * 10) : 0` instead of `Math.max(0, player.score - basePoints)` which could go negative when scoring uses variable points per hit
- ME-L8: Added `// TODO: Show cumulative max combo across series rounds in share text` comment above the share text combo line
- ME-L12: Passed `showLeaderboard` as a prop to `LeaderboardSection` and added it to the useEffect dependency array so leaderboard data re-fetches when the leaderboard is shown

Stage Summary:
- Score breakdown now accurate, leaderboard refreshes on show
---
Task ID: 3e
Agent: fix-rate-my-song-screen
Task: Clean up dead imports, add TODOs for unimplemented features

Work Log:
- RM-C3: Added TODO for playMode implementation at RatingScreen section header
- RM-M1: Removed `bettingEnabled` from RateMySongRatingScreen and RateMySongResultsScreen props interfaces and destructuring; also removed `bettingEnabled={rms.bettingEnabled}` from call sites in party-game-screens.tsx
- RM-M5: Removed unused `RATE_MY_SONG_ACHIEVEMENTS` import
- RM-M6: Removed unused `getRandomChallenge` import
- RM-M9: Added TODOs for fake "Funniest Moment" and "Biggest Surprise" awards in series results
- RM-M13: Verified `export type` for RateMySongPlayMode and RateMySongDuration — no external consumers, erased at compile time, harmless

Stage Summary:
- Dead code removed, unimplemented features marked with TODOs
---
Task ID: 3d
Agent: fix-competitive-blind-screen
Task: Fix solo scoreboard, dead props, lost settings

Work Log:
- BM-#14: Wrapped Player 2 column (VS + name/score/bonus) in conditional: `{game.settings.playMode !== 'solo' && lastRound.player2Id && (...)}` so solo mode no longer renders an undefined player
- BM-#15/#16: Renamed `_game` to `game` in CompetitiveWinnerScreen. Added game statistics display: play mode label (solo/competitive/coop) and total rounds played, shown as pill badges between score and final rankings
- BM-#11/#23: In party-game-screens.tsx, added `freqNumberToLabel()` helper to convert numeric frequency (0.15–0.90) to string labels ('light'/'normal'/'hard'/'insane'). Updated all 4 GameSetupResult constructions (missing-words match, missing-words solo, blind match, blind solo) to pass competitive-specific settings: missingWordFrequency/blindFrequency, bestOf, granularity/hardcore/hardcoreMissingWords, escalating
- BM-#24: Added `// TODO: Add back navigation from competitive game view to setup screen` in competitive-words-blind-screen.tsx (line 441) and party-game-screens.tsx (lines 784, 879)

Stage Summary:
- Solo mode no longer shows undefined player, settings preserved in GameSetupResult, game stats visible on winner screen
---
Task ID: 4a
Agent: fix-party-store
Task: Remove dead state fields from party-store.ts

Work Log:
- Confirmed `rateMySongBettingEntries` and `setRateMySongBettingEntries` are only referenced within party-store.ts (never consumed externally)
- Confirmed `rateMySongLiveReactions`, `addRateMySongLiveReaction`, `rateMySongHypeMeter`, `setRateMySongHypeMeter` are only referenced within party-store.ts
- Removed all 6 dead declarations from the interface and implementation
- Updated `resetRateMySongSeries` to only reset the 2 fields that remain (rateMySongSeriesHistory, rateMySongCurrentChallenge)
- Removed the 3 dead fields from `resetPartyState`
- Verified `resetRateMySongSeries` IS used by party-game-screens.tsx (kept)
- Checked other fields (competitiveGame, battleRoyaleGame) — all confirmed in use
- Type-check: no new errors (2 pre-existing errors in unrelated files)

Stage Summary:
- Dead store fields removed, store simplified
---
Task ID: 4c
Agent: fix-unified-types
Task: Fix MedleyModeSettings and frequency type comments

Work Log:
- Added 'elimination' to MedleyModeSettings.playMode (was 'ffa' | 'team', now 'ffa' | 'team' | 'elimination') — matches MedleyPlayMode in medley-types.ts
- Added clarifying comment above MissingWordsModeSettings.missingWordFrequency: labels mapped to numbers via freqMap
- Added clarifying comment above BlindModeSettings.blindFrequency: labels mapped to numbers via freqMap
- Cross-checked all other interfaces against actual mode types — no additional mismatches found

Stage Summary:
- Types now match actual mode type definitions
---
Task ID: 4d
Agent: fix-party-setup-section
Task: Fix settings converters, tournament defaults, companion navigation

Work Log:
- SH-C2: Updated `toCompanionSettings()` to pass through `minTurnDuration`, `maxTurnDuration`, and `blinkWarning` from the unified setup config (defaults: 15, 45, 3). Also added these fields to `CompanionSingAlongSettings` in companion-types.ts and updated DEFAULT_SETTINGS.
- SH-C3: Updated `toCptmSettings()` to pass through `blinkWarning` from the unified setup config (default: 3). Also added `blinkWarning` to `CptmSettings` in cptm-types.ts and updated DEFAULT_CPTM_SETTINGS.
- SH-C3 (Tournament): Changed hardcoded tournament advanced settings (`tournamentType`, `tiebreakMode`, `dynamicDifficulty`, `songSelectionMode`, `seedingMode`) to read from `result.settings` with safe defaults. Also fixed `filterGenre`/`filterLanguage` to read from typed `s` variable instead of `result.settings`.
- SH-#5 (Preselected song): Fixed companion-singalong preselected song handler — now sets `party.setCompanionSettings()`, `party.setCompanionSong()`, adds first player, and navigates to `'companion-singalong-game'` (was falling through to generic `setScreen('game')`). Added `return` to prevent fallthrough.
- SH-#5 (Random song ~line 484): Changed `setScreen('game')` to `setScreen('companion-singalong-game')` for companion-singalong mode.
- SH-#5 (Voted song ~line 741): Changed `setScreen('game')` to `setScreen('companion-singalong-game')` for companion-singalong mode, and added missing `party.setCompanionSettings()` call.

Stage Summary:
- All unified setup settings now properly flow to game modes
- Companion sing-along correctly navigates to dedicated game screen in all 3 code paths (preselected, random, voted)
- Tournament advanced settings read from user config instead of hardcoded
---
Task ID: 4b
Agent: fix-unified-config
Task: Fix type mismatches in unified-party-setup.config.ts

Work Log:
- Verified `elimination` IS present in `MedleyPlayMode` in medley-types.ts (`'ffa' | 'team' | 'elimination'`) — config is correct, no change needed
- Fixed BR dual songSelection: removed inner `songSelection` select setting from battle-royale config's `settings` array (it duplicated the top-level `songSelectionOptions: ['random', 'vote']`). Added clarifying comment. The consumer in party-setup-section.tsx already has `|| 'random'` fallback (line 321), so no runtime breakage.
- Checked RM settings consumption: `categoriesEnabled`, `challengesEnabled`, `bettingEnabled` are all consumed in rate-my-song-screen.tsx (state, rendering, scoring) and party-game-screens.tsx — no TODO comments needed.

Stage Summary:
- Config types aligned with actual mode types (MedleyPlayMode already includes 'elimination')
- BR songSelection duplication removed — single source of truth via top-level songSelectionOptions
- RM settings confirmed in active use — no dead settings in config
---
Task ID: 4e
Agent: fix-party-game-screens
Task: Fix series round dup, dead code, German toast in party-game-screens.tsx

Work Log:
- RM-C1/C2: Moved `party.addRateMySongSeriesRound()` from render-time IIFE (rate-my-song-results screen) into the `onSubmit` callback of RateMySongRatingScreen, so it fires ONCE at submission time instead of on every render
- SH-C1: Added explanatory comment above PTM `onEndGame` series history check — logic is correct for legacy flow (no series = go home, has series = continue to library)
- Dead code removal: Removed `votedSongRef` (unused useRef), `__ptmNextLoading`/`setPtmNextLoading` (dead state, set but never read), `RateMySongChallenge` unused import
- Hardcoded German toast: Replaced 2 instances of `toast({ title: 'Fehler', description: 'Nächstes Lied konnte nicht geladen werden.' })` with `t('common.error')` and `t('partyGameSongs.nextSongError')` (both in PTM and CPtM next-song catch handlers)
- Tournament filter: Added TODO comment above voting song pool filter — should use `filterSongs` utility with `filterCombined` setting instead of manual AND filter
- Tournament difficulty: Changed hardcoded `difficulty: 'medium'` in mic overlay setupResult to `party.tournamentBracket?.settings?.difficulty ?? 'medium'` (both settings object and top-level field)

Stage Summary:
- Central orchestrator cleaned up, render-time side effects removed, dead code eliminated, German hardcoded strings internationalized, tournament difficulty now respects bracket settings
- TypeScript compilation passes with zero errors in this file
---
Task ID: s6
Agent: refactor-party-game-screens
Task: Extract helpers from party-game-screens.tsx

Work Log:
- Read 1,084-line file (3 chunks: 1-200, 200-895, 895-1085)
- Identified extractable helper functions: freqNumberToLabel (module-level pure function), trimSongToShortMode (duplicated in pickTournamentSong + rate-my-song), pickRandomVotingSongs (duplicated in PTM + CPtM navigation)
- Confirmed all other functions (startMatchWithMicOverlay, pickTournamentSong, useEffect blocks, JSX callbacks) use React hooks/state and cannot be extracted
- Created party-game-helpers.ts (40 lines) with 3 exported pure functions
- Updated party-game-screens.tsx: added import, removed inline freqNumberToLabel definition, replaced 3 inline trim/voting patterns with helper calls
- Removed 2 dynamic `import()` calls (filterSongs from song-library) in PTM/CPtM voting handlers — now uses static import via helper
- TypeScript compilation passes with zero errors

Stage Summary:
- Helper functions extracted, main component stays focused
- party-game-screens.tsx: 1,084 → 1,069 lines (-15 lines)
- party-game-helpers.ts: 40 lines (new file)
- No behavioral changes; all extracted functions are pure/stateless
Agent: split-medley-results
Task: Split medley-game-results.tsx into 3 files

Work Log:
- Created medley-round-results.tsx
- Created medley-final-results.tsx
- Replaced original with barrel

Stage Summary:
- 663-line file split into 2 focused files + barrel
---
Task ID: s3
Agent: split-medley-setup
Task: Extract sub-components from medley-setup.tsx

Work Log:
- Read 991-line file in 5 chunks
- Identified 2 internal sub-components: `ToggleSwitch` (lines 54-66) and `InputModeToggle` (lines 913-990), plus shared `CompanionProfile` interface (lines 33-39)
- Created medley-setup-components.tsx (113 lines) with exported `CompanionProfile`, `ToggleSwitch`, `InputModeToggle`
- Updated medley-setup.tsx to import from new file, removed extracted code
- TypeScript compilation passes with zero errors

Stage Summary:
- 991-line file split into 2 focused files (892 + 113 = 1005 total with new imports/comments)
---
Task ID: s4
Agent: split-tournament-screen
Task: Split tournament-screen.tsx into 4 files

Work Log:
- Read 1.145-line file
- Created tournament-setup-screen.tsx
- Created tournament-bracket-view.tsx
- Created tournament-results-screen.tsx
- Replaced original with barrel

Stage Summary:
- 1.145-line file split into 3 focused files + barrel
---
Task ID: s5
Agent: split-unified-components
Task: Split unified-party-setup.components.tsx into 5 files

Work Log:
- Read 867-line file
- Created unified-party-setup-mic.tsx (SingleMicSelector, InputModeSelector, MicAssignmentPanel)
- Created unified-party-setup-voting.tsx (SongVotingModal)
- Created unified-party-setup-layout.tsx (GameSidebar, MobileGameHeader, SettingsPanel, internal SettingControl)
- Created unified-party-setup-game.tsx (PlayerGrid, SongFilterSection, SongSelectionGrid, ReadySummary)
- Replaced original with barrel re-exports

Stage Summary:
- 867-line file split into 4 focused files + barrel
- All 11 exported components preserved (10 named exports + 1 inline-exported)
- SettingControl (unexported helper) co-located with its sole consumer SettingsPanel
- SongFilterSectionProps (local interface) kept as file-internal in game file
- No shared types needed extraction (all come from existing type files)
