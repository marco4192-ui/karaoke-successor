# R27-b — Agent Work Record: microphone-manager.ts Auslagerung

**Task ID:** R27-b · **Agent:** R27-b (refactoring, NULL behavior change)
**Scope:** `src/lib/audio/microphone-manager.ts` (1015 lines, clean @ HEAD `ac367a16`) → re-export facade + 5 modules in `src/lib/audio/microphone/`
**Note:** `/agent-ctx` is not writable in this sandbox (Permission denied at fs root); this file + `worklog.md` entry serve as the work record (established R10–R13 convention).

## Result
| File | Lines | Content |
|---|---|---|
| `microphone-manager.ts` (facade) | 14 | module map + 4 re-export lines; import path `@/lib/audio/microphone-manager` unchanged for all 6 importers |
| `microphone/types.ts` | 112 | MicrophoneDevice, MicrophoneConfig, ExtendedMicConfig, MicrophoneStatus (+export, NOT re-exported), AssignedMicrophone, OPTIMAL_KARAOKE_CONFIG (private), OPTIMAL_EXTENDED_CONFIG, MAX_MICROPHONES |
| `microphone/microphone-instance.ts` | 226 | `export class MicrophoneInstance` (ORIG 116–339, +export keyword, not re-exported) |
| `microphone/mic-config-storage.ts` | 97 | StoredMicConfig + pure saveMicsConfig/loadMicsConfig (incl. all v1→v2 migrations + needsSave re-persist) |
| `microphone/multi-microphone-manager.ts` | 597 | full manager; only saveConfig/loadConfig became thin delegates; savedMicConfigs typed StoredMicConfig[] |
| `microphone/singleton.ts` | 11 | getMultiMicrophoneManager() |

## Verification numbers
- Coverage (verify-mic-split.py, whitespace-stripped per-line mapping): **863/868 = 99.42 %**
- Unmapped ORIG lines (all 5 = documented deltas): L51 `interface MicrophoneStatus {` (+export), L117 `class MicrophoneInstance {` (+export), L351 inline field type (→ `StoredMicConfig[]`), L857 `Array.from(this.assignedMics.values()).map` (→ `mics.map`), L927 `this.savedMicConfigs = config.assignedMics;` (→ `return config.assignedMics;`)
- Export probe: 8/8 public symbols identical (no missing, no extra)
- `npx tsc --noEmit`: **exit 0** (one transient error in parallel agent R27-a's untracked in-flight `motto-banner.tsx` — zero import relation to this task — was fixed by that agent; scoped tsc of this task's graph was exit 0 throughout)
- Targeted eslint (facade + microphone/): **0 errors / 0 warnings** = baseline (0/0)
- `bun run test`: **256/256**
- Dev server (never restarted): `GET /` → **HTTP 200**, dev.log `✓ Compiled`, zero compile errors

## Invariants kept
- (a) `savedMicConfigs` populated synchronously in constructor via `loadConfig()` → delegate → pure `loadMicsConfig()`; async `restoreMics()` reads it afterwards — unchanged.
- (b) `restoreMics()` skips device enumeration when no saved configs (`if (this.savedMicConfigs.length === 0) return;`) — verbatim.
- localStorage key `MULTI_MIC_CONFIG` ('karaoke-multi-mic-config'), format `version: 2`, migration logic, catch comments, German UI strings — byte-identical.
- No importer files touched. No new lint suppressions, no `any`.

## Artifacts
- `tmp-analysis/r27b/microphone-manager-ORIG.ts` (git HEAD backup)
- `tmp-analysis/r27b/generate-mic-split.py` (line-exact slicer, asserts on every edit point)
- `tmp-analysis/r27b/verify-mic-split.py` (coverage proof)
