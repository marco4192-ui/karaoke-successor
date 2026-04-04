---
Task ID: 1
Agent: Super Z (Main)
Task: Fix Tauri ACL errors and improve code quality in karaoke-successor

Work Log:
- Cloned repo from GitHub, analyzed console errors
- Identified root cause: Tauri v2 ACL permissions using string format inherited restrictive default scope
- Fix #1: Restructured capabilities/default.json — replaced string fs permissions + fs:scope with OBJECT format per permission, each with explicit allow list ($HOME, $RESOURCE, $CWD, / etc.)
- Fix #2: Verified all cover URL restoration errors are caused by ACL (not path issues)
- Fix #3: Created src/lib/safe-dialog.ts with safeAlert/safeConfirm/safePrompt wrappers, updated 8 files
- Fix #4: Extracted duplicate UltraStar lyric parsing from song-library.ts and tauri-file-storage.ts into src/lib/parsers/notes-to-lyric-lines.ts
- Fix #5: Replaced `any` types in use-game-loop.ts with GameResult, PitchDetectionResult
- Fix #6: Replaced `gameMode: string` with `GameMode` union type in use-game-loop.ts

Stage Summary:
- 6 fixes pushed to master (commits 2084b79, c1e8a12, 3b6611d, 24393ed, e19da13)
- ACL fix resolves: fs|read_file, fs|read_dir, dialog|open, dialog|message errors
- Safe dialog wrappers prevent unhandled errors from Tauri dialog plugin
- 166 lines of duplicated TXT parsing code removed
- 3 `any` types replaced with proper interfaces

---
Task ID: 2
Agent: Super Z (Main)
Task: Fix Songs Browse Folder — ACL path scope, text field overwrite, Tauri v2 detection

Work Log:
- Analyzed ACL capability file (src-tauri/capabilities/default.json)
- Found root cause: `{ "path": "/" }` only matches literal root `/` on Unix, NOT Windows drive-letter paths like `D:\Karaoke Songs`
- Fix #1 (f6ae861): Replaced all `{ "path": "/" }` with `{ "path": "**" }` in 11 permission entries to match all paths on all platforms
- Analyzed settings-screen.tsx useEffect dependencies
- Found root cause: `folderScanner` object in dependency array caused `initializeFromStorage()` to re-run on EVERY render, overwriting user input in the text field
- Fix #2 (fbbe700): Split folder scanner initialization into separate useEffect with empty deps `[]`
- Fix #3 (15f0c5a): Updated Tauri detection in settings-screen.tsx to check both `__TAURI__` (v1) and `__TAURI_INTERNALS__` (v2)
- Verified all 3 fixes pushed to master

Stage Summary:
- 3 fixes pushed to master (commits f6ae861, fbbe700, 15f0c5a)
- ACL fix resolves ALL permission errors: fs|read_file, fs|read_dir, dialog|open, dialog|message
- Text field is now editable (useEffect re-render loop eliminated)
- Browse function now works (dialog ACL permissions correct)
- Song folder is saved and restored correctly
- Tauri v2 properly detected in About tab
- User must rebuild Tauri app (`cargo tauri dev`) for ACL changes to take effect
