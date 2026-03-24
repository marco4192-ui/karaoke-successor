# Code Analysis Report - Karaoke Successor

## Executive Summary
This report documents findings from a comprehensive code analysis of the Karaoke Successor application. The analysis identified unused code modules, partially implemented features, duplicate logic, and features that exist in code but are not accessible in the UI.

---

## 1. UNUSED CODE MODULES

### 1.1 `src/lib/audio/spectrogram.ts` 
**Status: COMPLETELY UNUSED**
- NOT imported anywhere in the codebase
- Contains: `SpectrogramConfig`, `getColorFromValue()`, `generateVisualBars()`, `createWaveformPath()`, `createCircularSpectrogram()`
- **Impact:** Dead code, increases bundle size
- **Recommendation:** Remove or integrate into UI

### 1.2 `src/lib/audio/video-player.ts`
**Status: COMPLETELY UNUSED**
- NOT imported anywhere
- Contains: `VideoPlayerManager` class with full YouTube/local video handling
- **Impact:** Dead code (~250 lines)
- **Recommendation:** Remove or integrate for better video management

### 1.3 `src/lib/audio/audio-manager.ts`
**Status: COMPLETELY UNUSED**
- NOT imported anywhere
- Contains: `AudioManager` and `SyntheticAudioGenerator` classes
- **Impact:** Dead code (~217 lines)
- **Recommendation:** Remove or integrate for centralized audio handling

### 1.4 `src/lib/game/pitch-graph.ts`
**Status: COMPLETELY UNUSED**
- NOT imported anywhere
- Contains: `PitchGraphRenderer` class - a complete real-time pitch visualization system
- **Impact:** Valuable feature not available to users
- **Recommendation:** Integrate into GameScreen for pitch visualization

---

## 2. PARTIALLY IMPLEMENTED FEATURES

### 2.1 Star Power System (`src/lib/game/star-power.ts`)
**Status: PARTIALLY IMPLEMENTED**
- **What works:** 
  - StarPowerBar component renders
  - Manual "demo" button to charge meter
- **What's broken:**
  - NOT connected to actual gameplay scoring
  - Does NOT charge from note hits during singing
  - Meter only fills via manual demo button
- **Root cause:** `game-screen.tsx` has its own scoring logic that doesn't call `getStarPowerChargeFromNote()`
- **Fix required:** Connect star power charging to `checkNoteHits()` in game-screen.tsx

### 2.2 Duplicate Scoring Logic
**Status: DUPLICATE IMPLEMENTATION**
- **File 1:** `src/lib/game/scoring.ts` - Centralized scoring module
- **File 2:** `src/components/screens/game-screen.tsx` - Has its own scoring functions
- **Problem:** 
  - `scoring.ts` exports `evaluateNote()`, `updatePlayerStats()` but these are only used in `use-game-loop.ts`
  - `game-screen.tsx` defines duplicate functions: `evaluateTick()`, `calculateTickPoints()`, `calculateNoteCompletionBonus()`
- **Impact:** Inconsistent behavior, maintenance burden
- **Fix required:** Consolidate scoring logic into `scoring.ts` and use everywhere

---

## 3. INCOMPLETE FEATURES IN UI

### 3.1 Online Multiplayer Screen
**Status: INCOMPLETE IMPLEMENTATION**
- **File:** `src/components/screens/online-multiplayer-screen.tsx`
- **What's missing:**
  - No note highway rendering during gameplay
  - Game loop is not fully implemented
  - Only shows "Singing in Progress" text instead of actual game
- **Impact:** Online mode is not playable
- **Fix required:** Integrate full game loop and note rendering

### 3.2 Party Mode Routing
**Status: PARTIALLY BROKEN**
- The following party modes from `party-screen.tsx` have special screens:
  - `tournament` → TournamentSetupScreen ✓ WORKS
  - `battle-royale` → BattleRoyaleSetupScreen ✓ WORKS
  - `online` → OnlineMultiplayerScreen ⚠ INCOMPLETE
- The following modes just set `gameMode` and go to library (may not work correctly):
  - `pass-the-mic`
  - `companion-singalong`
  - `medley`
  - `missing-words`
  - `duet`
  - `blind`
- **Recommendation:** Verify each party mode works correctly or add dedicated screens

---

## 4. LOGICAL ISSUES

### 4.1 Duet Mode P2 Scoring
**Status: POTENTIAL ISSUE**
- In `game-screen.tsx`, P2 scoring uses the same pitch detection as P1 (line ~1965-1968):
  ```typescript
  if (isDuetMode && pitchResult) {
    setP2Volume(pitchResult.volume);
    setP2DetectedPitch(pitchResult.frequency);
    checkP2NoteHits(adjustedTime, pitchResult);
  }
  ```
- **Problem:** Both players use the same microphone input - not realistic for actual duet mode
- **Fix required:** Implement multi-microphone support using `MultiMicrophoneManager`

### 4.2 Timing Offset Initialization
**Status: MINOR ISSUE**
- `timingOffset` in game-screen.tsx initializes to 0 but doesn't load from saved song settings
- The offset CAN be adjusted during gameplay, but the starting value should come from `song.timingOffset` if available

---

## 5. DEAD IMPORTS

### 5.1 page.tsx - Unused Imports
Several imports in `src/app/page.tsx` may be unused:
- `ImportScreen` - Used only in routing, check if actually rendered
- `KaraokeEditor` - Check if editor screen uses this correctly
- `ScoreCard`, `ShortsCreator` - Social features, verify usage

---

## 6. FILES ANALYZED

| File | Status | Notes |
|------|--------|-------|
| `src/app/page.tsx` | OK | Main entry, navigation works |
| `src/components/screens/game-screen.tsx` | WARN | Duplicate scoring, star power not connected |
| `src/components/screens/settings-screen.tsx` | OK | Settings work correctly |
| `src/components/screens/library-screen.tsx` | OK | Library functions properly |
| `src/components/screens/home-screen.tsx` | OK | Navigation works |
| `src/components/screens/party-screen.tsx` | OK | Mode selection works |
| `src/components/screens/online-multiplayer-screen.tsx` | WARN | Incomplete game implementation |
| `src/components/game/tournament-screen.tsx` | OK | Fully functional |
| `src/components/game/battle-royale-screen.tsx` | OK | Fully functional |
| `src/lib/game/star-power.ts` | WARN | Not connected to gameplay |
| `src/lib/game/scoring.ts` | WARN | Only used in use-game-loop |
| `src/lib/game/pitch-graph.ts` | ERROR | Not imported anywhere |
| `src/lib/audio/spectrogram.ts` | ERROR | Not imported anywhere |
| `src/lib/audio/video-player.ts` | ERROR | Not imported anywhere |
| `src/lib/audio/audio-manager.ts` | ERROR | Not imported anywhere |

---

## 7. RECOMMENDED FIXES (Priority Order)

### HIGH PRIORITY
1. **Connect Star Power to gameplay** - Charge meter from note hits
2. **Fix Online Multiplayer** - Add proper game loop and note highway
3. **Consolidate scoring logic** - Use `scoring.ts` everywhere

### MEDIUM PRIORITY
4. **Remove or integrate unused modules** - Clean up dead code
5. **Verify party mode implementations** - Test each mode
6. **Implement multi-mic for duet mode** - Proper P2 input

### LOW PRIORITY
7. **Clean up unused imports** - Reduce bundle size
8. **Add timing offset persistence** - Load from song settings

---

## 8. NEXT STEPS

1. Fix Star Power integration in `game-screen.tsx`
2. Complete Online Multiplayer game loop
3. Consolidate scoring functions
4. Remove unused modules or integrate them
5. Test all party modes

---

*Report generated: ${new Date().toISOString()}*
