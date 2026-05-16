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

---
Task ID: 4
Agent: Main Agent
Task: Game screen improvements - combo overlap, webcam controls, particles, per-player score events

Work Log:
- Fixed combo glow overlap: moved from `top-28` to `top-40`, reduced font from `text-3xl` to `text-2xl`
- Replaced WebcamToggleButton with WebcamQuickControls in game-screen.tsx header
- Updated GameHudShell to use WebcamQuickControls + WebcamBackground instead of old WebcamButton
- Boosted particle emitter counts: PerfectHit 14 sparks + 5 stars + 4 golden, GoldenNote 18 + 10 + 6 fireworks, ComboFirework up to 35/burst, Confetti 50 pieces with longer life (180)
- Boosted AnimatedBackground: 5 disco lights, 4 floating particles/frame, 25 rising columns, 3 pulsing rings
- Added `player?: 'P1' | 'P2'` field to ScoreEvent in use-note-scoring.ts
- Tag P1 events with `player: 'P1'` in checkNoteHits, P2 events with `player: 'P2'` in checkPlayerNoteHits
- Rewrote ScoreEventsDisplay to support duel/duet mode: P1 events on left, P2 events on right
- Passed `isDuetMode` from game-screen.tsx to ScoreEventsDisplay
- TypeScript check passed with zero errors
- Pushed as commit 27f9701

Stage Summary:
- Files modified: prominent-score-display.tsx, game-screen.tsx, game-hud-shell.tsx, visual-effects.tsx, score-events-display.tsx, use-note-scoring.ts
- Combo glow no longer overlaps score display
- Webcam quick controls (size/position/device/mirror) available in-game on all screens
- Particle density significantly increased across all effects
- Duel/duet score events now properly assigned to each player's side

---
Task ID: 1-6
Agent: main
Task: Six UI/UX fixes: PTM performance, settings reorder, webcam cards, jukebox heading/translations/CTRL-J

Work Log:
- Read ptm-game-hook.ts, graphic-sound-tab.tsx, appearance-tab.tsx, webcam-tab.tsx, jukebox files, settings-screen.tsx, keyboard shortcuts, i18n files
- Replaced timeupdate-based time tracking (~4Hz) in PTM with RAF-based tracking (~40fps) throttled to 25ms, matching normal game screen behavior
- Moved Performance Mode card from GraphicSoundTab to AppearanceTab, updated props in settings-screen.tsx
- Reordered webcam-tab.tsx cards: Info → Settings → Preview
- Added heading to jukebox-setup-view.tsx
- Added 23 missing jukeboxPlayer translation keys to both en.ts and de.ts
- Implemented auto-start jukebox via custom event (jukebox:start) on CTRL-J
- npx tsc --noEmit passed clean
- Pushed as d6414e4

Stage Summary:
- PTM notes now scroll smoothly at 40fps instead of jerky 4Hz
- Performance Mode now logically lives under Appearance settings
- Webcam settings cards in correct user-requested order
- Jukebox setup view has visible heading
- All jukebox field labels properly translated in German and English
- CTRL-J navigates to jukebox and auto-starts playback
---
Task ID: 1
Agent: main
Task: Fix Ultrastar txt import — make all txt format conversions robust

Work Log:
- Investigated the complete import pipeline (3 paths: Ultrastar Tab, Folder Scan, Alternate Format Tab)
- Found 3 bugs causing Ultrastar .txt files to be silently ignored:
  1. detectFileFormat() note regex /^[:*]\s+\d+/m was too strict — didn't match compact notation (:0) or all note types (F, R, G)
  2. alternate-format-tab.tsx always passed ArrayBuffer for .txt files — typeof check failed → returned 'unknown'
  3. Ultrastar was completely missing from the alternate-format tab's FORMAT list and handleProcess switch
- Rewrote detectFileFormat() with 5-tier heuristic detection:
  a) Note lines regex: /^(?:P[12]:\s*)?[:*FGR]\s*-?\d+\s+\d+\s+-?\d+/m (compact+standard, all types, duet prefixes)
  b) Line-break markers combined with UltraStar headers
  c) End marker E + UltraStar headers
  d) Header-only files (no notes, just metadata)
  e) Ambiguous #BPM: resolved via companion headers (#GAP/#MP3 = Ultrastar, #STEPS/#DIFFICULTY = StepMania)
- Fixed alternate-format-tab.tsx: passes string for text formats, ArrayBuffer only for MIDI
- Added Ultrastar to alternate-format tab (FORMATS list + handleProcess case using parseUltraStarTxt + convertUltraStarToSong)
- Fixed StepMania being blocked by lyrics check (it's a rhythm-game format without lyrics)
- TypeScript compiles clean, all 28 Ultrastar parser tests pass

Stage Summary:
- Commit: f153a98 "fix: robust txt format detection for all karaoke variants"
- Files changed: src/lib/parsers/multi-format-import.ts, src/components/import/alternate-format-tab.tsx
- All txt karaoke formats now handled: Ultrastar (all variants), StepMania, SingStar, MIDI, KaraokeMugen
