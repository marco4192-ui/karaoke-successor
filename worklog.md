---
Task ID: 1
Agent: Main Agent (Research Phase)
Task: i18n migration - Research hardcoded texts across entire codebase

Work Log:
- Pulled latest code from main branch
- Checked existing i18n system: useTranslation() hook, flat key system, 17 languages
- Found existing translations cover basic sections (nav, home, library, song, game, results, editor, settings, mic, party, profile, queue, highscore, jukebox, mobile, achievements, daily, common)
- Launched 3 parallel research agents to scan all component directories

Stage Summary:
- Total hardcoded strings found: ~850+ across ~90+ files
- Screens (components/screens/): ~350+ strings in 43 files
- Game Components (components/game/): ~180+ strings in 25 files  
- Settings/Dialogs/Import/Results/Social/Party/UI: ~324+ strings in 24 files
- Mix: ~40% German, ~55% English, ~5% mixed
- Key German-heavy areas: character-screen, queue-screen, mobile views, mic views, medley, competitive-words-blind, match-abort-dialog, rate-my-song
- Files already using i18n: editor-screen.tsx, general-tab.tsx, settings-screen.tsx (via tx prop)
- Translation keys need to be added to EN and DE (other languages use EN fallback)

---
Task ID: 2
Agent: Main Agent (Implementation Phase)
Task: i18n migration - Replace all hardcoded texts with t() calls

Work Log:
- Added ~500+ translation keys to EN and DE in locales/index.ts
- Updated 12 game HUD/utility components (difficulty-badge, pause-button, fullscreen-button, webcam-button, game-hud, connection-status, ptm-hud-player-score, practice-panel, prominent-score-display, note-highway, duet-note-highway, game-enhancements)
- Updated 6 Battle Royale components
- Updated 5 Medley components (setup, game-screen, game-playing, game-results, song-results)
- Updated 5 competitive/tournament components (match-abort, rate-my-song, competitive-words, tournament-screen, tournament-bracket)
- Updated 10 companion/PTM/game components (companion-setup, companion-game, companion-series-results, pass-the-mic, ptm-song-results, ptm-intro, ptm-game-screen, game-screen, pitch-graph)
- Updated 9 home/character screen components
- Updated 9 queue/party/achievements/daily/highscore/results/mobile screens
- Updated 22 dialog/settings/import/ui components
- Updated 7 results components
- Updated 11 library components
- Updated 6 social/party/jukebox components
- Updated 11 mobile view/remote-control components

Stage Summary:
- Total commits: 12 i18n-related commits pushed to main
- Total new translation keys: ~500+ (EN + DE each)
- Total component files updated: ~120+
- Build: ✅ All builds passed
- All hardcoded German and English texts replaced with i18n-compatible t() calls
- Other languages (es, fr, it, pt, ja, ko, zh, ru, nl, pl, sv, no, da, fi) use EN fallback for new keys

---
Task ID: 3
Agent: Main Agent
Task: Editor access button, smaller tiles, rawLyrics in lyrics tab

Work Log:
- Added `onNavigateToEditor` prop to LibraryScreen component
- Added Editor button (pencil icon + "F10" keyboard hint) to library screen header
- Wired `onNavigateToEditor={() => setScreen('editor')}` in karaoke-app.tsx
- Reduced editor library tiles from grid-cols-2/3/4/5 to grid-cols-4/6/8/10 (roughly 1/4 size)
- Reduced tile padding from p-3 to p-1.5, font sizes from text-sm to text-[10px], gap from gap-4 to gap-2
- Removed unused Badge import from editor-screen.tsx
- Rewrote editor-lyrics-tab.tsx with three display modes:
  - Mode 1: No notes but rawLyrics exists → shows parsed syllables as amber "pending" text
  - Mode 2: Notes exist → standard note-based lyrics + unassigned syllable counter + pending section
  - Mode 3: Nothing → empty state
- Added import of `parseLyricsToSyllables` and `FileText` icon to editor-lyrics-tab.tsx
- TypeScript check passed with zero errors
- Pushed as commit bfc2c6d

Stage Summary:
- Files modified: library-screen.tsx, karaoke-app.tsx, editor-screen.tsx, editor-lyrics-tab.tsx
- Editor is now accessible via button in Library header (not just F10 hotkey)
- Editor library tiles are ~1/4 of previous size
- Lyrics tab shows rawLyrics text and progressive syllable assignment visualization
