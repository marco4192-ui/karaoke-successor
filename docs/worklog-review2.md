# Code Review 2 — Worklog

## Session Start: 2026-05-04

### Bug #1: seekAudio() ignoriert Position (FIXED)
- **Datei:** `src/lib/audio/native-audio.ts`
- **Problem:** Parametername `_positionMspositionMs` (Merge-Artefakt), invoke bekam leeres `{}`
- **Ursache:** Fehlerhafter Merge hat Parametername verdoppelt und invoke-Aufruf beschädigt
- **Fix:** Parameter auf `positionMs` korrigiert, invoke bekommt `{ positionMs }`
- **Verifikation:** Rust-Backend erwartet `position_ms: u64` — camelCase→snake_case Konvertierung passt
- **Aufrufer:** `use-native-audio.ts:184` übergibt bereits korrekt `positionMs`

