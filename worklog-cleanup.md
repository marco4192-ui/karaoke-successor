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
