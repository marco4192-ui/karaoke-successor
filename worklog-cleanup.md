# Worklog — Code Cleanup & Fixes

## Gestartet: 2025-05-01

---


---

## H1: AudioContext/AnalyserNode Lifecycle (shared-media-source, visual-effects, spectrogram)

**Date:** 2025-05-01

**Files changed:**
- `src/lib/audio/shared-media-source.ts` — Made async, added `context.resume()` for Tauri, connected `source → destination` once centrally
- `src/components/game/visual-effects.tsx` — `useSongEnergy`: await async init, removed duplicate `analyser → destination`, added cancellation guard
- `src/components/game/spectrogram-display.tsx` — await async init, removed duplicate `analyser → destination`, added cancellation guard

**Summary:** LiveWaveform/SpectrogramVisualizer/VoiceVisualizer confirmed not present (already dead code removed). Fixed the underlying shared-media-source pattern: AudioContext is now properly resumed in Tauri webviews, and `source → destination` is connected once centrally to prevent audio duplication when multiple consumers (useSongEnergy + SpectrogramDisplay) tap the same audio element.

---

## H2-H20: High Priority Fixes (Batch 1)

**Date:** 2025-05-01

**Summary of changes:**
- H2+H3: ptm-game-screen.tsx — Added unmountGuardRef for stale .play() calls
- H4: youtube-player.tsx — Already implemented (cleanup exists)
- H5: companion-singalong-screen.tsx — Already implemented (currentTimeRef)
- H6-H7: Store selectors — Already implemented (individual selectors)
- H8: use-replay-recorder.ts — Already implemented (cleanup effect)
- H9: use-native-audio.ts — Already implemented (cancelled flag)
- H10: use-multi-pitch-detector.ts — Already implemented (re-init support)
- H11-H12: battle-royale/setup-screen.tsx — Already implemented
- H13: Rust unchecked_transaction — Already implemented (uses transaction())
- H14: charts/commands.rs — Already implemented (block_in_place)
- H15: audio/player.rs — Already implemented (src_channels == 0 guard)
- H16: ultrastar-parser.ts — Fixed #END:0 treated as undefined
- H17: folder-scanner.ts — Fixed critical stack overflow in createTrackedBlobUrl (was calling itself!)
- H18: multi-format-import.ts — Fixed non-deterministic pitch in text import
- H19: alternate-format-tab.tsx — Already implemented (tempBlobUrl tracking)
- H20: use-import-screen.ts — Already implemented (scannedSongs dependency)
