---
Task ID: C-D-Implementation
Agent: Main Agent
Task: Implement C & D extension points from TODO_IMPROVEMENTS.md

Work Log:
- Read TODO_IMPROVEMENTS.md and identified all C & D points
- Verified each point against actual codebase implementation
- C.2 (Native Audio Processing): Already implemented — Rust analysis_commands + useAudioAnalysis hook + AudioAnalysisPanel UI. Marked as done.
- C.3 (System Media Controls): Already implemented — useMediaSession hook using Media Session API in Tauri WebView. Marked as done.
- D.1 (Waveform Note Editing): Already implemented — waveform.tsx with note overlays, click-to-seek, double-click-to-add. Marked as done.
- D.2 (Auto-Beat-Detection): Already implemented — Rust audio_detect_bpm + detectBpm() in useAudioAnalysis. Marked as done.
- C.4 (Offline SQLite): NOT implemented (only network detection existed). Implemented from scratch:
  1. Added rusqlite (bundled) to Cargo.toml
  2. Created src-tauri/src/db/mod.rs — DbState, connection management, WAL mode
  3. Created src-tauri/src/db/schema.rs — Schema v1 with 7 tables, migration system
  4. Created src-tauri/src/db/commands.rs — 20 Tauri commands for full CRUD
  5. Registered all commands + DbState in lib.rs
  6. Created src/hooks/use-sqlite.ts — typed wrapper + useSqliteDb hook
  7. Updated OfflineBanner to show SQLite stats when offline
  8. Fixed .gitignore (target/ accidentally committed)

Stage Summary:
- All C & D points in TODO_IMPROVEMENTS.md are now marked as done
- Commits: b296e7e (TODO update), 0288fda (SQLite Rust backend), c5f1883 (gitignore fix), ffb44cc (frontend hook), ebb3762 (offline banner), 6ebbc09 (final TODO)
- All pushes went to origin/master
- Total new files: db/mod.rs, db/schema.rs, db/commands.rs, use-sqlite.ts
- Total new Tauri commands: 20
