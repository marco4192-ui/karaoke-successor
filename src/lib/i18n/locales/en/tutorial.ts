// Tutorial / Live-Tour texts (basics + editor + settings + R29: profile,
// queue, chat, companion, achievements) — EN
// Every step may carry an optional `details` text — the "More info" button
// in the tooltip expands the deep-dive (short body first, details on demand).
export const tutorialTranslations = {
  tutorial: {
    // ? help menu
    helpButtonTitle: 'Help & tutorials',
    helpDialogTitle: 'Help & tutorials',
    helpDialogDesc: 'Re-watch the complete tours — or jump straight into a topic and get just that part explained.',
    helpFooter: 'Tour keyboard: → next · ← back · Esc quit',
    startFullTour: 'Full tour',
    stepsCount: '{n} steps',
    completedBadge: 'Completed',
    // Tour groups in the help menu (R29: 8 tours need structure)
    groupGettingStarted: 'Getting started',
    groupAreas: 'Areas & functions',
    groupAdvanced: 'For pros',
    // Overlay controls
    ariaLabel: 'Guided tour',
    skipTour: 'End tour',
    back: 'Back',
    next: 'Next',
    finish: 'Done',
    clickHint: 'Click it now',
    // "More info" expansion (R29)
    moreDetails: 'More info',
    lessDetails: 'Show less',
    // First-launch offer
    offerTitle: 'Welcome to Karaoke ZERO!',
    offerBody: 'Want a quick walk-through of the basics? In 2 minutes you\'ll know daily challenges, sing modes, the library and party games.',
    offerStart: 'Start tour',
    offerLater: 'Maybe later',
    offerHint: 'Available anytime via the ? icon in the menu bar.',

    // ═══ Basic tour ═══
    basic: {
      title: 'Basics',
      desc: 'The round trip: challenges, sing modes, library, party & more.',
      chapters: {
        welcome: 'Welcome',
        challenges: 'Daily & Weekly',
        singing: 'Start singing',
        party: 'Party modes',
        more: 'More areas',
      },
      steps: {
        welcome: {
          title: 'Welcome! 👋',
          body: 'This is a live tour: I highlight the important spots and explain them.\n\nControls: "Next" (or key →), "Back" (←) and "End tour" (Esc). Let\'s go!',
          details: 'You can pause the tour anytime and resume later: the ? icon in the menu bar opens the help menu with all tours — playable chapter by chapter too.\n\nMany steps have a "More info" button below: it expands extra details without losing the short text.',
        },
        heroButtons: {
          title: 'Quick start',
          body: '"Start Singing" takes you straight to the library. "Party Mode" opens the 9 party games for groups.',
          details: 'The quick-start cards are shortcuts for the most common paths:\n• "Start Singing" = open the library, pick a song, go (solo, duel or duet).\n• "Party Mode" = the game collection for up to 32 players, phones can join as mics.\n\nEverything you see here is also reachable via the menu bar — the cards just save clicks.',
        },
        dailyCard: {
          title: 'Daily challenge',
          body: '5 slots per day with rotating tasks — the more slots you clear, the bigger your XP bonus. Fresh tasks drop at midnight.',
          details: 'How the system works:\n• Each of the 5 slots holds a different task type (e.g. "sing an 80s song", "score 8000 points").\n• Slots unlock in sequence — slot 2 only after slot 1 is completed.\n• Every slot is playable in several difficulties; higher ones give more XP (up to 3× multiplier).\n• The bonus grows with the number of cleared slots: 5/5 earns the full daily bonus.\n\nTasks draw from YOUR library — the selection always adapts to your songs.',
        },
        weeklyCard: {
          title: 'Weekly challenge',
          body: 'The weekly counterpart: 5 slots across the week with bigger XP rewards. Perfect for long-term goals.',
          details: 'Weekly challenges work like the daily ones, but:\n• The 5 slots run for 7 days — no daily reset, collect at your own pace.\n• XP rewards per slot are bigger: 250–500 XP base instead of 100–200 daily — and the difficulty multiplier (up to 3×) applies on top.\n• Reset happens Monday morning.\n\nTip: daily and weekly run in parallel — playing both levels you fastest.',
        },
        modeLauncher: {
          title: 'Sing: Single, Duel & Duet',
          body: '🎤 Single: one player, one mic.\n⚔️ Duel: two players on the SAME song — most points wins.\n🎭 Duet: two voices on two tracks — the library automatically shows only matching duet songs.',
          details: 'The three modes in detail:\n• Single: classic karaoke — you sing all the notes, your score hits the leaderboards.\n• Duel: both players sing the same note track simultaneously. Points run separately — the comparison at the end shows who was better. Perfect for rematches.\n• Duet: the song has two separate voices (P1/P2) — everyone sings "their" parts, shared phrases earn team bonus. Duet songs are marked with the 🎭 filter in the library.\n\nMicrophones: up to 4 physical microphones plus smartphones as additional inputs (see Settings → Microphone).',
        },
        libraryNav: {
          title: 'The library',
          body: 'All your songs live here. Search by title or artist — the fuzzy search even forgives typos.',
          details: 'Search tips:\n• The fuzzy search finds "Dancing Qun" → "Dancing Queen". It ignores case and single typos.\n• It searches title, artist AND genre at once — "Rock" also finds songs with genre Rock.\n\nSorting via the dropdown (title A–Z, artist, recently added). Songs get into the library via import, folder scan or playlists — the path lives in the Library tab of the settings.',
        },
        filters: {
          title: 'Filters',
          body: 'Genre, language, year, decade, duet songs and viral hits — slice the library however you like.',
          details: 'All filters combine — e.g. "Genre: Rock + Language: English + Era: 80s" shows exactly the English rock songs of the eighties.\n\nSpecial filters:\n• Duet: only songs with two voice tracks.\n• Viral hits: songs currently in the viral charts (configured in Settings → Library).\n• Custom genres & languages: create your own categories in Settings → Genres & Languages — they appear in these filters immediately.\n\n"Reset filters" (✕) clears everything in one go.',
        },
        songCard: {
          title: 'Songs',
          body: 'Clicking a song card opens the start dialog: mode, players, microphones and difficulty.',
          details: 'Every song card shows:\n• Cover plus title/artist\n• Difficulty (easy/medium/hard/expert) and star rating\n• Key metadata like genre and language — straight from the song or harmonized via AI (Editor → Metadata Studio).\n\nThe preview icon starts a short teaser without opening the start dialog.',
        },
        startModal: {
          title: 'The start dialog',
          body: 'Set everything here: mode (single/duel/duet), who sings, which mic everyone gets, and the difficulty.\n\nThen hit "Start" — and off you go!',
          details: 'The key options:\n• Mode: single, duel (2 players, same track) or duet (2 voices) — in duet mode both players pick their voice (P1/P2).\n• Microphones: every player can get their own input device — or a smartphone as mic (companion app).\n• Difficulty: affects scoring — harder difficulties forgive less and reward precision (higher score potential, more XP).\n• "Add to queue" instead of "Start": enqueues the song instead of starting immediately — ideal when several people want to sing.',
        },
        partyCard: {
          title: 'Party modes',
          body: '9 games for up to 32 players: Battle Royale, Pass-the-Mic, Medley contest, tournament, missing words, blind karaoke and more — phones can join as mics.',
          details: 'The 9 modes at a glance:\n• Battle Royale: everyone sings, the weakest is eliminated each round — last man standing.\n• Pass-the-Mic: the mic rotates from player to player — everyone sings their part.\n• Medley contest: teams sing through short song snippets with special rules.\n• Tournament: elimination bracket with duels — the winner climbs every round.\n• Missing Words: lyrics get blanked out — sing the missing word to score.\n• Blind Karaoke: the note display blacks out in passages — ears only!\n• Rate my Song & Companion Singalong and more — each mode card explains itself.\n\nAlmost all modes support the companion app as mic and controller.',
        },
        partyModes: {
          title: 'The mode picker',
          body: 'This is where you pick the party mode: Battle Royale (last man standing), Pass-the-Mic, tournament (bracket), medley and more.\n\nEach card shows what to expect — one click opens player selection.',
          details: 'After clicking a mode card, player selection follows: pick profiles (or connect companion devices), then set team sizes, round counts or time limits depending on the mode.\n\nTheme-party tip: when a theme is active in the settings (e.g. "80s Party"), every song selection in party mode automatically draws only from matching songs — the party stays on topic.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke without competition: build playlists, queue songs, share favourites. The perfect background entertainer.',
          details: 'The jukebox is the relaxed mode:\n• Pick playlists or single songs as the pool.\n• Optional video breaks in between so the vibe never breaks.\n• No scoring, no mics needed — songs just run with lyrics.\n\nPerfect as all-night entertainment or for warming up before the first round.',
        },
        jukeboxView: {
          title: 'Inside the jukebox menu',
          body: '"Browse playlists" gives you direct access to every saved playlist — including the ones you created in the library. One click enqueues the whole playlist.',
          details: 'The jukebox playlist settings offer:\n• Whether videos are shown (if the songs have any)\n• Video-break mode: intermission videos between songs, e.g. for announcements\n• Whether the pool is shuffled or runs in fixed order\n\nStarts fullscreen — exit with Escape or the stop button on top.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores per song and difficulty — beat your friends (or yourself).',
          details: 'The boards remember per song and difficulty:\n• Score, accuracy, golden notes and date\n• Which player achieved the entry (profile avatar)\n• Whether the entry came via the companion app (phone icon) or the desktop\n\nWith online mode enabled (profile screen) you additionally see global boards and compete with players from other installations.',
        },
        highscoreView: {
          title: 'The highscore boards',
          body: 'Filtered by song and difficulty — with the filter bar on top. The phone icons show companion app usage.',
          details: 'The filter bar on top allows:\n• Search by song or player\n• Filter by difficulty\n• Switch local/global (when online is enabled)\n\nAnti-cheat: every entry carries a song fingerprint — manipulated results are detected and flagged.',
        },
        settingsCard: {
          title: 'Settings',
          body: 'Microphones, language, gameplay fine-tuning, appearance and graphics — all the knobs live here.',
          details: 'The 12 settings tabs in a flash:\n• General: language, default difficulty, online\n• Gameplay: score display, particles, combo, replay recording\n• Appearance: themes, lyrics style, background\n• Audio: output device, volume, loudness, YouTube quality\n• Microphone: devices, sensitivity, noise gate, presets\n• Mobile: connect & manage companion devices\n• Webcam: webcam as background\n• Library: songs folder, import, viral charts, reset\n• Genres & Languages: custom categories\n• Theme Party: activate & configure the theme\n• Sync & Backup: safeties\n• About: version, platform, licenses\n\nThere is a dedicated, in-depth settings tour for all tabs in the ? help menu.',
        },
        settingsView: {
          title: 'The settings tabs',
          body: 'Pick a section at the top: General (language), Gameplay, Appearance, Audio, Microphone, Mobile (phone connection) and more.',
          details: 'A short intro text at the top of each tab explains what it does — you never have to guess where an option belongs.\n\nThe matching tour: "Settings" in the ? help menu walks you through every tab.',
        },
        finish: {
          title: 'Done! 🎉',
          body: 'You know the basics now.\n\nTip: the ? icon in the menu bar brings you back anytime — including individual topic chapters, the editor tour and the settings tour.',
          details: 'What now? A few suggestions for your first minutes:\n1. Create a profile (Profiles in the menu bar) — without one you play, but collect no XP.\n2. Import songs (Settings → Library).\n3. A few daily-challenge rounds for the XP boost.\n4. Friends coming over? Try party mode — the companion app turns every phone into a mic (there is a dedicated companion tour).',
        },
      },
    },

    // ═══ Editor tour ═══
    editor: {
      title: 'Editor tour',
      desc: 'Notes, lyrics, voices & harmonize — the song toolbox.',
      chapters: {
        entry: 'Getting in',
        layout: 'Layout',
        notes: 'Editing notes',
        extras: 'Extras & harmonize',
      },
      steps: {
        welcome: {
          title: 'The editor ✏️',
          body: 'This is where songs become playable karaoke tracks: place notes, time lyrics, assign voices.\n\nSandbox tip: practise on a test song — changes can be undone with Ctrl+Z.',
          details: 'The editor works with the UltraStar format: every note has a start time, a duration, a pitch and a text (syllable). Many notes form the note highway you see in the game.\n\nSources for new songs:\n• Text import (UltraStar/TXT) in the editor\n• MIDI import (notes generated from MIDI)\n• AI harmonize: lyrics + audio → note suggestions\n\nEverything is non-destructive: until you save, the original song stays untouched.',
        },
        songList: {
          title: 'Song selection',
          body: 'Search a song to open it. Filters reveal songs with missing metadata — the editor harmonizes those later.',
          details: 'The filter chips above the list show songs without genre/language/year — the fastest way to songs the Metadata Studio has not processed yet.\n\nThe search covers title and artist — case does not matter.',
        },
        noSongs: {
          title: 'No songs yet',
          body: 'The editor needs songs in the library. Import songs first (library → import / folder scan) and come back.',
          details: 'How to get songs:\n• Settings → Library → set the songs folder: every subfolder is read as one song (audio/video + UltraStar text).\n• Alternatively single files via the import dialog.\n• Or create a new song in the editor ("New Song") and bring lyrics + audio together yourself.',
        },
        openSong: {
          title: 'Open a song',
          body: 'Click a song in the list now to open it in the editor.',
          details: 'Once open you see the toolbar (sub-header) on top and the timeline with waveform, note lanes and lyrics.\n\nThe song stays open until you close it via "Back" — unsaved changes ask for confirmation first.',
        },
        leftPanel: {
          title: 'Toolbar',
          body: 'Everything for notes: add, duplicate, delete, split, merge — plus note types, voices and tap mode (coming up).',
          details: 'The tools in order:\n• ➕ Add note: drops at the playhead\n• ⧉ Duplicate: copies the selected note right behind it\n• 🗑 Delete: removes the selection\n• ✂ Split: one note → two (at the middle)\n• ⇄ Merge: joins the selected note with the next one\n\nSelection via click; shift-click for multiple. Then the keyboard takes over: ⌫ deletes, ↑/↓ transposes, ←/→ nudges.',
        },
        lyricsPanel: {
          title: 'Lyrics panel',
          body: 'The lyric lines sit on the left. Double-click a line to jump playback right there — text and timing are editable here.',
          details: 'The lyrics panel is text AND timing in one:\n• Clicking a syllable selects the matching note in the timeline.\n• Double-click jumps to the spot (playback follows).\n• Right-click (or pen icon) opens line editing: change text, split syllables at word boundaries, shift the timing of the whole line.\n\nThe word-boundary splitting uses language detection to distribute syllables onto words sensibly — no more manual slicing.',
        },
        subHeaderTools: {
          title: 'Editing notes',
          body: 'Notes are the blocks on the pitch lanes: add, duplicate, delete, split (one note → two) and merge (with the next note).\n\nEdit selected notes in tempo: ⌫ deletes, ↑/↓ transposes.',
          details: 'Precision tips:\n• Zoom: Ctrl+mouse wheel over the timeline — zoom in for fine timing.\n• Playback: Space toggles play/pause, Shift+Space plays only the selection.\n• Transposing several notes: select them all, ↑/↓ moves the whole bundle.\n\nFor timing: the note start must hit the syllable onset in the vocals — the waveform helps find the onsets.',
        },
        noteTypes: {
          title: 'Note types',
          body: '5 types for new notes:\n: Normal (pitch counts)\n* Golden (extra points)\nF Freestyle (any note counts)\nR Rap (timing only)\nG Rap-gold',
          details: 'What each type means in the game:\n• Normal (:): classic sing note — pitch and timing count.\n• Golden (*): rendered gold, double points on hits. Perfect for song highlights.\n• Freestyle (F): pitch irrelevant, only text/timing counts — good for spoken parts.\n• Rap (R): judges timing and rhythm instead of melody.\n• Rap-gold (G): like rap, but with extra points.\n\nThe type can be changed later: select the note and pick a new type in the toolbar.',
        },
        voices: {
          title: 'Voices',
          body: 'P1 = player 1, P2 = player 2 (duet!), P4/P8 = third/fourth voice. Every note belongs to a voice — that\'s how duet songs with separate parts are made.',
          details: 'Voice assignment:\n• The voice dropdown picks the track new notes land on.\n• Placed notes can move: select and switch the voice.\n• In duet mode in the game, every player picks their track — the library automatically filters songs with at least 2 voices.\n\nP4/P8 even allow quartet setups; the main game modes use P1/P2.',
        },
        tapMode: {
          title: 'Tap mode — the turbo 🥁',
          body: 'Hold the key and tap along: every click drops a note at the current playback position, lyric line by lyric line. Create notes in real time.',
          details: 'How tap recording runs:\n1. Activate tap mode in the toolbar.\n2. Start playback — the song runs with audible audio.\n3. Click in the rhythm of the syllables — every interaction drops a note at the playhead with the last chosen pitch.\n4. Then polish: correct pitches (↑/↓ on selected notes) and adjust durations.\n\nTap mode is 5–10× faster than placing notes by hand — whole songs in minutes instead of hours.',
        },
        panels: {
          title: 'Header panels',
          body: 'Three panels top right: metadata (genre/language/year), audio analysis and the AI assistant.',
          details: 'What the three panels do:\n• Metadata: edit genre, language and year of the open song directly — feeds filters and theme party.\n• Audio analysis: analyzes the audio file (loudness, key, BPM) and suggests values.\n• AI assistant: lyrics completion, song identification and note harmonization via AI — requires a configured AI provider (Settings → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'The harmonize turbo: AI and rule suggestions for genre, language and year — with listen-before-assign, manual fine-editing and a review queue for uncertain matches.',
          details: 'The studio workflow:\n1. "Analyze all songs" — the rule engine (file paths, tags) and optionally AI suggest genre/language/year.\n2. Suggestions carry confidence: green = certain, yellow = review.\n3. Listen: clicking a song plays a snippet — verify suggestions the quick way.\n4. Assign individually or "apply all greens".\n\nThe review queue collects uncertain matches for later — nothing gets lost.',
        },
        shortcuts: {
          title: 'Shortcuts',
          body: 'All keyboard shortcuts at a glance — the editor is a keyboard instrument. Click through!',
          details: 'The most important shortcuts:\n• Ctrl+Z / Ctrl+Y: undo / redo\n• Space: play/pause\n• ⌫: delete selected notes\n• ↑/↓: transpose (Shift = whole octave) · ←/→: nudge in time (Shift = coarse)\n• M: merge with the next note\n• Ctrl+S: save · Ctrl+C/V: copy/paste notes\n\nThe shortcuts panel in the left bar shows all keys at a glance.',
        },
        finish: {
          title: 'Ready to build! 🛠️',
          body: 'You now know the editor toolbox.\n\nRemember: Ctrl+Z saves everything, and the ? icon in the menu bar brings you back to these chapters anytime.',
          details: 'Recommended order for a new song:\n1. Attach audio/video (song info tab)\n2. Import or type lyrics (lyrics tab)\n3. Tap notes (tap mode) or AI harmonize\n4. Maintain metadata (genre/language/year — important for filters!)\n5. Save — from now on the song appears in the library.',
        },
      },
    },

    // ═══ Settings tour (R28) ═══
    settings: {
      title: 'Settings',
      desc: 'All settings at a glance: tabs, general settings, audio, library, companion devices and backup.',
      chapters: {
        overview: 'Overview',
        basics: 'Basic settings',
        sound: 'Audio & Microphone',
        library: 'Library & Theme',
        devices: 'Devices & Companion',
        data: 'Sync, Backup & Info',
      },
      steps: {
        welcome: {
          title: 'The settings 👋',
          body: 'This tour walks you through the settings exclusively — tab by tab.\n\nI automatically switch to each tab and explain what you find there.',
          details: 'The tabs in tour order: General, Gameplay, Appearance, Audio, Microphone, Mobile (companion), Webcam, Library, Genres & Languages, Theme Party, Sync & Backup and About.\n\nEvery tab has a short intro on top — this tour deepens it step by step.',
        },
        tabBar: {
          title: 'The tab bar',
          body: 'All settings are organized into tabs: General, Gameplay, Appearance, Audio, Microphone, Mobile, Webcam, Library, Genres & Languages, Theme Party, Sync & Backup and About.\n\nA short intro text at the top of each tab explains what it does.',
          details: 'Orientation help — when searching, ask yourself…\n• "How does the game BEHAVE?" → Gameplay\n• "How does it LOOK?" → Appearance\n• "How does it SOUND?" → Audio / Microphone\n• "Connect devices?" → Mobile (companion) / Microphone\n• "My songs?" → Library\n• "Back up data?" → Sync & Backup\n\nThe tabs scroll horizontally on narrow windows — just swipe right.',
        },
        general: {
          title: 'General',
          body: 'Interface language, default difficulty, online activities and the complete keyboard shortcut overview.',
          details: 'Language: 16 languages are available. Switching applies live to the entire interface.\n\nDefault difficulty: applies to new rounds unless the start dialog picks another.\n\nOnline activities control whether highscores upload globally and daily challenges generate online.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Score display, particle effects, combo display, replay recording, auto-fullscreen and more behavior switches for rounds and results.',
          details: 'The key switches:\n• Score display: for pure fun singing without a score readout.\n• Particles & effects: disable on weaker machines.\n• Replay: records audio and webcam while singing — the replay plays on the results screen.\n• Auto-fullscreen: enters fullscreen automatically when a song starts.\n• Warning cues: short beeps before blind and missing-word passages.\n\nAdditionally: combo display and more.',
        },
        appearance: {
          title: 'Appearance',
          body: 'Themes, animated background or your own background video, lyrics style and size, note display and the performance mode for weaker machines.',
          details: 'Lyrics style: 10 visual themes — "Classic", "Concert", "Retro", "Neon", "Minimal" and more.\n\nBackground: besides themes, a custom video works too — in the game it runs behind the notes, dimmed.\n\nPerformance mode cuts animations and backgrounds drastically — worth it from ~2015 hardware.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Output device (incl. ASIO), master and preview volume, microphone sensitivity, loudness normalization and YouTube video quality.',
          details: 'ASIO: only relevant for Windows + ASIO-capable sound cards — reduces latency for mic monitoring.\n\nLoudness normalization evens out volume differences between songs — the defaults are well chosen.\n\nYouTube quality: affects songs with a YouTube video source; higher quality = more bandwidth.',
        },
        microphone: {
          title: 'Microphone',
          body: 'Device selection, sensitivity, noise gate and live level — plus presets. Smartphones are connected via the Mobile tab.',
          details: 'Presets: typical setups ("Optimal", "Low Latency", "High Accuracy", "Noisy Environment", "Bass", "Soprano") set sensitivity + noise gate in sensible combinations.\n\nNoise gate: filters breaths and room noise — the live level shows in real time what gets through.\n\nImportant for multiplayer: EVERY player can get their OWN device — assignment happens in the start dialog per round.',
        },
        libraryTab: {
          title: 'Library',
          body: 'Set the songs folder (each subfolder = one song) and scan it, reset the library or delete all data — plus the import from other karaoke systems.',
          details: 'Folder format: one subfolder per song with audio/video + TXT (UltraStar format). The scanner recognizes common combos (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport from other systems: a SingStar archive? An UltraStar collection? The import converter takes over metadata and lyrics automatically.\n\nCareful with "delete all data": the double confirmation asks twice — still make a backup first (Sync & Backup tab).',
        },
        taxonomy: {
          title: 'Genres & Languages',
          body: 'Create your own genre and language entries — they appear in all dropdowns and feed into the AI harmonization.',
          details: 'Why custom entries? Standard lists do not cover everything ("Schlager", "K-Pop", "Dialect" …). Custom entries:\n• appear immediately in the library filters\n• are selectable in the editor and Metadata Studio\n• harmonize along (the AI suggests them for matching songs)\n\nDeleting works too — songs keep the entry until reassigned.',
        },
        motto: {
          title: 'Theme Party',
          body: 'Set the whole game to a theme (e.g. an 80s party): when active, the theme replaces all search fields and filters — every song selection only draws from matching songs.',
          details: 'The theme filter knows several fields, freely combinable (AND logic):\n• Genre (e.g. rock)\n• Language (e.g. English)\n• Era/year (e.g. 1980–1989)\n\nEffect: library, party song selection AND companion app show only the theme pool — guests cannot pick anything off-topic.\n\nDeactivating the theme returns everything to the normal view instantly; played songs/highscores stay untouched.',
        },
        mobile: {
          title: 'Mobile & Companion',
          body: 'Connect smartphones via QR code — as microphone, remote control or sing-along device. You see all connected devices and their connection codes.',
          details: 'Connection: scan the QR code (same Wi-Fi!) or type the URL — the dedicated companion tour explains the details in the ? help menu.\n\nThis tab also shows:\n• All connected devices with status (active, role, last activity)\n• Assigning profiles to devices\n• Kicking individual devices\n\nThe per-profile QR codes (for claiming) live in the profile screen\'s settings card.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Use the webcam as an animated song background: resolution, mirroring, saturation, blur and more effects — with a live preview.',
          details: 'The webcam background runs behind the notes during the song — you watch yourselves sing!\n\nEffects: mirroring (like a selfie), saturation, soft blur, sepia — instantly visible in the live preview.\n\nPrivacy: the camera runs locally only, nothing is stored or sent.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Create and restore backups, synchronize data between devices. In the desktop build, player data is also mirrored permanently to the AppData folder.',
          details: 'A backup contains: profiles (with XP/progress), highscores, settings and playlist definitions — as one file for archiving or moving.\n\nThe AppData mirror (desktop build) protects against browser data loss: even if the browser storage is wiped, the desktop build restores everything.\n\nRestoring overwrites current data — again: back up first.',
        },
        about: {
          title: 'About',
          body: 'Version, platform, licenses and contributing projects — the digital imprint of Karaoke ZERO.',
          details: 'You also see the build channel (web/desktop) and can check for updates. The licenses list the open-source projects used — thanks to everyone involved!',
        },
        finish: {
          title: 'Fully configured! ⚙️',
          body: 'You now know all the settings.\n\nThe ? icon in the menu bar brings you back to this tour anytime — chapter by chapter if you like.',
          details: 'Recommendation for your first setup evening:\n1. Library tab: scan the songs folder\n2. Microphone tab: pick a preset + check the live level\n3. Mobile tab: connect phones (companion tour!)\n4. Theme tab: think about a party theme\n5. Sync & Backup: pull the first backup\n\nWith that, the karaoke night is on rails.',
        },
      },
    },

    // ═══ Profile tour (R29) ═══
    profile: {
      title: 'Profiles & Characters',
      desc: 'Create players, track XP & progress, online sync and companion claiming.',
      chapters: {
        overview: 'Overview',
        characters: 'Characters & Progress',
        online: 'Online & Companion',
      },
      steps: {
        welcome: {
          title: 'Your player profiles 👤',
          body: 'Profiles are the identities in the game: XP, level, statistics and achievements live on the profile — and highscores carry your name.\n\nThis tour shows how to create and manage profiles.',
          details: 'Why profiles?\n• XP & level: sung songs, challenges and achievements collect experience — the level rises along with the rank name (Beginner → Divine).\n• Leaderboards: highscore entries show your avatar.\n• Party modes: every player selection draws from this list.\n• Companion devices can "claim" a profile and sing under its identity.\n\nProfiles live in browser storage (local) or in an online account (sync) — you choose when creating them.',
        },
        topBar: {
          title: 'The action bar',
          body: 'Up here you toggle online leaderboards, switch local/global and open the creation form for new profiles.',
          details: 'The bar\'s elements:\n• Online switch: enables/disables online features globally (leaderboards, account registration)\n• Local/Global: which board the highscore view shows\n• "Load profile": signs you in with a sync code and pulls your online profile onto this device\n• "New profile": opens the creation form (next step)',
        },
        createButton: {
          title: 'Creating a profile',
          body: '"New profile" opens the form: name, avatar image, country and storage mode (local or with an online account).',
          details: 'The form fields:\n• Name: appears on leaderboards and in parties\n• Avatar: upload your own picture or an initial on a color\n• Country: flag for global leaderboards\n• Storage mode: "Local" saves only on this device; "Online" optionally registers an account (email + password) and allows syncing across devices.\n\nOnline accounts only exist with online mode enabled — registration runs in the background, the profile is usable immediately.',
        },
        empty: {
          title: 'No profiles yet',
          body: 'This is where your players take shape. Click "New profile" and create the first character — everything works without one, but XP and achievements only collect on profiles.',
        },
        cards: {
          title: 'The character cards',
          body: 'Each card shows avatar, level, rank and storage mode. Clicking selects the profile and shows its details below.\n\nThe dot top right: green = active, red = deactivated.',
          details: 'Card symbols:\n• ✓ bubble: the currently active profile (the start dialog remembers it)\n• Rank icon + "Lv. X": the profile\'s progress\n• 💾/🌐 badge: stored locally or online\n• 📱 badge: this profile is claimed by a companion device\n• Flag: the chosen country\n\nClick a card = select it. Deactivating (red) works in the progression card — deactivated profiles vanish from player selections but keep all their data.',
        },
        progression: {
          title: 'The progression card',
          body: 'XP bar to the next level plus the core statistics: songs sung, golden notes, best combo and total score.\n\nThe active switch on the right deactivates the profile temporarily.',
          details: 'Understanding the stats:\n• Songs played: every finished round counts\n• Golden notes: collected per song — shows how precisely you hit highlights\n• Best combo: longest flawless streak of all time\n• Total score: sum of all scores\n\nThe active switch: deactivated profiles disappear from player selection and queue (duel/duet songs then ask for re-selection) but lose NOTHING — reactivating is enough.',
        },
        settingsCard: {
          title: 'Profile settings',
          body: 'Edit name & avatar, change country, privacy options — and the profile QR code that lets a phone claim this profile.',
          details: 'Privacy: controls which statistics are visible on global leaderboards.\n\nShow QR code: generates a code pointing DIRECTLY at this profile — the phone scanning it connects as this profile (ideal: every singer gets their phone with their profile).\n\nDeleting removes the profile permanently — highscores remain as anonymous entries. For online profiles the app asks again before deleting.',
        },
        onlineToggle: {
          title: 'Online leaderboards',
          body: 'The switch enables online features: global highscores, account registration and profile sync between devices.',
          details: 'Off = completely offline: everything stays local, no network requests for leaderboards.\n\nOn = you get the "Global" tab in the leaderboards and can create/load online profiles.\n\nSwitching applies immediately — already collected local highscores always stay.',
        },
        loginButton: {
          title: 'Loading a profile',
          body: 'Already registered? "Load profile" pulls your online profile via email/sync code onto this device — progress and highscores come along.',
          details: 'The login dialog knows two ways:\n• Email + password (as during registration)\n• Sync code: the short code from your profile — easier on a foreign machine\n\nAfter login the loaded profile merges with the local one (the higher progress wins). Syncs then run automatically in the background.',
        },
        companionClaim: {
          title: 'Companion claiming 📱',
          body: 'When a phone connects with a profile, the card shows a 📱. The phone sings and selects under that profile — name, XP and achievements accrue there.',
          details: 'Setting up claiming (3 ways):\n1. Scan the QR code in the profile settings — connects DIRECTLY with that profile\n2. On the phone after connecting, pick a profile from the list\n3. Here in the settings\' Mobile tab: device → assign profile\n\nA profile can only be claimed by ONE device at a time. Disconnecting: in the Mobile tab or by the phone itself.',
        },
        finish: {
          title: 'Team complete! 🎭',
          body: 'You now know how profiles work — from XP to online sync to phone claiming.\n\nContinue with achievements: the "Achievements & Progress" tour shows what your profile can collect.',
        },
      },
    },

    // ═══ Queue tour (R29) ═══
    queue: {
      title: 'Queue',
      desc: 'Enqueue songs, reorder, rules & companion requests.',
      chapters: {
        overview: 'Overview',
        manage: 'Managing',
        companion: 'Companion & Shortcuts',
      },
      steps: {
        welcome: {
          title: 'The queue 🎶',
          body: 'The queue organizes your karaoke night: songs line up, everyone gets a turn — nobody has to babysit the PC.\n\nThis tour covers enqueueing, sorting and the rules.',
          details: 'Three ways to enqueue:\n1. Library → click a song → in the start dialog pick "Add to queue" instead of "Start"\n2. After a song: "Play next song" on the result screen keeps the flow going\n3. Via the companion app: guests enqueue from their phones (marked with 📱 badges)\n\nThe menu bar shows the queue length as a counter button — you can see the evening coming.',
        },
        navButton: {
          title: 'The queue button',
          body: 'In the menu bar, "Queue" leads here — the number on the button shows how many songs are waiting.',
        },
        title: {
          title: 'The song queue',
          body: 'The list shows all waiting songs with position, mode (solo/duel/duet) and players — sorted by enqueue time.',
        },
        empty: {
          title: 'Still empty',
          body: 'No songs in the queue yet. Add some from the library (start dialog → "Add to queue") — or let guests enqueue via the companion app.',
        },
        list: {
          title: 'The queue list',
          body: 'Every card: position, song, mode badge and the players. Clicking a card starts the song immediately — even out of order.',
          details: 'The badges:\n• 🎤 Solo / ⚔️ Duel / 🎭 Duet — the mode the song was enqueued with\n• 📱 — added via the companion app\n\nClick a card = play now. The ✕ button on the right removes the entry, ▶ starts it.\n\nKeyboard: Enter plays, Delete removes, ↑/↓ move through the list.',
        },
        reorder: {
          title: 'Changing the order',
          body: 'Drag cards to their new position — only local entries can be moved, companion requests keep their order.',
          details: 'Drag & drop: grab a card and pull up or down with the button held. The list shows the drop position live.\n\nWhy companion entries stay fixed: the guest app sorts by submission time — if the host could reshuffle, requests would feel manipulated. You can still remove them.',
        },
        playNext: {
          title: 'Play next song',
          body: 'The button starts the top entry — the standard move between rounds. Alternatively click any card directly.',
          details: 'The result screen after every song offers the same button ("Play next song") — the flow continues without a detour to the queue view.\n\nThe queue view\'s "Play next song" button does the same — the top entry starts with one click.',
        },
        clearAll: {
          title: 'Clear everything',
          body: '"Clear all" empties the whole queue — companion entries included. There is no way back, so use with care.',
        },
        rules: {
          title: 'The rules',
          body: 'The official rulebook sits at the bottom: max 3 songs per player, FIFO order, remove your own songs, pick a character first …',
          details: 'The rules in detail:\n• Max 3 songs per player at once — nobody can block the queue. Whoever sang may enqueue again.\n• FIFO: first in = first up. Drag & drop reorders locally.\n• Own songs removable anytime; others only via "Clear all" or as host.\n• Character first: the queue needs active profiles for duel/duet, otherwise it asks for re-selection on start.\n• Companion requests show the 📱 badge and count like your own.',
        },
        companionAdd: {
          title: 'Requests from phones 📱',
          body: 'Guests enqueue songs via the companion app — they appear with a 📱 badge in the list and count toward their 3-song limit.',
          details: 'How it looks for guests: in the app, pick a song, choose the mode, submit — the request lands in this list.\n\nYou as host see immediately: who requested (player avatar) and that it is a phone request (📱). The 3-item limit applies per profile — including via phone.\n\nMore in the companion tour.',
        },
        autoplay: {
          title: 'Shortcut & flow',
          body: 'Ctrl+Q starts the top queue entry from anywhere — the classic when the next round should roll immediately.',
          details: 'The flow between rounds: song ends → result screen → "Play next song" button (or Ctrl+Q) keeps the evening going.\n\nCtrl+Q works from everywhere — no detour to the queue view needed.',
        },
        finish: {
          title: 'The queue is waiting! 🎧',
          body: 'You now know enqueueing, sorting and the rules.\n\nTip: combine the Ctrl+Q shortcut + companion requests for a smoothly self-running karaoke night.',
        },
      },
    },

    // ═══ Chat tour (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Open the panel, send messages, the "send as" picker & song challenges.',
      chapters: {
        basics: 'Opening the chat',
        usage: 'Sending messages',
        challenges: 'Challenges',
      },
      steps: {
        welcome: {
          title: 'The party chat 💬',
          body: 'The chat connects desktop and companion apps: talk without interrupting the singing — and even challenge each other to song duels.\n\nI\'ll open the panel for you in a moment.',
          details: 'What the chat can do:\n• Text messages between desktop (host) and all connected phones\n• Sender choice: the host can write on behalf of a player\n• Song challenges: guests call for duels — accept on the desktop and go\n\nPrerequisite: for phones to join the conversation, companion devices must be connected (Mobile tab of the settings — see the companion tour).',
        },
        navButton: {
          title: 'Opening the chat',
          body: 'The chat button in the menu bar opens the panel — it slides in as a side panel over the screen and closes with ✕ or a click next to it.',
        },
        panel: {
          title: 'The chat panel',
          body: 'The history runs on the left, you write at the bottom. The panel stays open until you close it — even when switching screens.',
        },
        messages: {
          title: 'The history',
          body: 'Your messages appear on the right in cyan (as host), contributions from phones on the left in purple. Every message carries its timestamp.',
          details: 'Background updates: the panel pulls new messages every 3 seconds — you miss nothing even while it runs in the background.\n\nThe chat button in the menu bar stays put — new messages are right there the moment you reopen the panel.',
        },
        sendAs: {
          title: '"Send as"',
          body: 'You are the host — but you may write on behalf of a player: the dropdown picks the identity. 🖥️ = host, 📱 = player.',
          details: 'What this is good for:\n• The host types for someone without a phone ("Anna says: chorus again!")\n• Stage announcements in the name of the moderator profile\n\nThe color dot next to the dropdown shows the player color — the history stays clear about who "spoke".',
        },
        input: {
          title: 'Writing a message',
          body: 'Type into the field (max 200 characters) and press Enter — or use the send button.',
        },
        send: {
          title: 'Sending',
          body: 'Submit with Enter or the button — the message appears in the history instantly and on every connected phone.',
        },
        songChallenges: {
          title: 'Song challenges ⚔️',
          body: 'Guests can challenge you to a song right from the app: a challenge card appears in the chat — "Accept challenge" starts the duel.',
          details: 'How the challenge runs:\n1. A guest picks a song in the app and taps "Challenge"\n2. The card appears in the chat with song, challenger and the accept button\n3. Accept on the desktop — the start dialog opens with duel mode preselected\n4. Sing! The winner takes the glory (and the points)\n\nNote: "Send as" must be set to a player for this — the opponent has to be identifiable.',
        },
        companionSide: {
          title: 'On the phones',
          body: 'The companion app has its own chat tab — that\'s where guests type. What you see here, they see in real time and vice versa.',
        },
        finish: {
          title: 'Message delivered! 💌',
          body: 'You now know the chat — from the panel to song challenges.\n\nCombined with the companion tour it becomes clear how phones and desktop work together.',
        },
      },
    },

    // ═══ Companion tour (R29) ═══
    companion: {
      title: 'Companion App',
      desc: 'Connect smartphones: mic, remote control, song requests & sing-along.',
      chapters: {
        connect: 'Connecting',
        features: 'What the app can do',
        control: 'Remote control: Take Control',
        solo: 'Without control',
        help: 'Help on the companion',
        manage: 'Managing devices',
      },
      steps: {
        welcome: {
          title: 'Phones as accessories 📱',
          body: 'The companion app turns every smartphone into a karaoke accessory: microphone, remote control, song selection and chat — no installation, straight in the browser.\n\nThis tour covers the desktop side of the flow.',
          details: 'The principle: the desktop is the host (music, notes, scores) — phones connect over the Wi-Fi and become, as needed:\n• 🎤 Microphones (with pitch detection on the phone!)\n• 🎮 Remote controls (steering screens)\n• 🎵 Song browsers with queue requests\n• 💬 Chat participants\n• 🪞 Live mirrors of the desktop screen\n\nNo app store, no account — scan the QR, done.',
        },
        mobileTab: {
          title: 'Opening the Mobile tab',
          body: 'The connection starts in Settings → Mobile. I just opened the tab for you.',
        },
        qrCode: {
          title: 'Scanning the QR code',
          body: 'The big code on the left is the direct route: open the phone camera, scan, the app loads in the browser. Important: phone and PC in the same Wi-Fi.',
          details: 'The QR code contains the desktop\'s LAN address (e.g. http://192.168.1.42:3000/mobile) — that is why both devices must share a network.\n\nIf the code refuses: the URL below can be typed or copied (button). In public Wi-Fi without device visibility the connection sadly fails — use a personal hotspot instead.',
        },
        connectionInfo: {
          title: 'URL & copy button',
          body: 'On the right the address as text — with a copy button for sharing (e.g. via messenger to your guests). The green line confirms the detected network IP.',
          details: 'Pre-sharing tip: send the URL to guests before the party — as soon as the desktop runs, everyone connects instantly.\n\nThe yellow warning appears when no LAN IP was detected (e.g. pure localhost operation) — then only the same machine can reach it.',
        },
        roles: {
          title: 'The app\'s roles',
          body: 'After connecting the app offers, depending on context:\n\n🎤 Mic view with pitch display\n🎮 Remote control for the desktop\n🎵 Song browser + queue requests\n💬 Chat\n🪞 Live mirror of the screen',
          details: 'The roles in detail:\n• Microphone: the phone measures pitch and transmits it live — the desktop shows the notes like from a "real" mic. Works for all modes (duel too: two phones!).\n• Remote control: screens, buttons and confirmations from the phone — great for hosts walking the room.\n• Song browser: the whole library on the phone — including preview and queue requests with the 📱 badge on the desktop.\n• Chat: messages to the desktop and other guests.\n• Mirror: the desktop screen (game, results) is mirrored on the phone — guests see everything from their seats.',
        },
        chatRole: {
          title: 'Chat on the desktop',
          body: 'What guests type in the app chat lands in the desktop chat (chat button in the menu bar) — and back. There is a dedicated chat tour for that.',
        },
        queueRole: {
          title: 'Requests in the queue',
          body: 'Guests enqueue songs from their phones — they appear on the desktop in the queue with the 📱 badge. Another tour covers that too.',
        },
        singAlong: {
          title: 'Sing-along modes 🎶',
          body: 'In the party modes Companion Singalong and Pass-the-Mic guests sing straight over their phones — pitch detection runs on the device, the desktop orchestrates.',
          details: 'Companion Singalong: every guest gets lyrics + pitch display on their phone — the desktop shows the shared note highway.\n\nPass-the-Mic: the mic rotates — even mixed between phone and physical mic.\n\nFor both: the better the Wi-Fi, the smoother the pitch. If it stutters, a machine closer to the router helps.',
        },
        takeControl: {
          title: 'Take Control 🎮',
          body: 'A phone drives the desktop only on command now: the "Take control" button on the companion claims the remote — before and after that, the phone taps only for itself.',
          details: 'The mechanism behind "Take control":\n• Control is reserved exclusively for exactly one device (remote lock).\n• Desktop and controlling phone stay in sync: each side instantly sees what the other does.\n• All remaining phones show the status "Controlled by …" and wait.\n\nControl ends via "Release" — or automatically when the phone loses the connection.',
        },
        controlSync: {
          title: 'Desktop and phone in lockstep',
          body: 'Back in the Mobile tab: as host you see all devices here. When a phone takes control it mirrors the desktop screen and operates screens, buttons and confirmations — mouse and keyboard on the desktop stay fully usable.',
          details: 'Because both sides run synchronously nobody can "tap away": click on the desktop and the controlling phone follows — tap on the phone and the desktop switches screens.\n\nIn the device list you recognize the controlling device by its remote badge.',
        },
        controlHandover: {
          title: 'Only one remote at a time',
          body: 'Control is exclusive: while one phone steers, no second can take over — its button instead shows who is in control. Releasing or disconnecting frees the control instantly.',
          details: 'Good to know:\n• The host can keep clicking anytime — the controlling phone follows (and keeps the control).\n• If the controlling phone loses the connection (battery, Wi-Fi), control automatically falls back to the desktop.\n• A kick from the device list also ends the control.',
        },
        soloOverview: {
          title: 'Guests without control 🙋',
          body: 'Most guests never need the remote: connected phones without Take Control are standalone companions — they request songs, chat, sing along and check their own achievements without touching the desktop.',
          details: 'What non-controlling phones can do:\n• 🎵 Queue their own songs (with the 📱 badge)\n• 💬 Join the party chat\n• 🎤 Sing in party modes (Companion Singalong, Pass-the-Mic)\n• 🗳️ Vote in polls (tournament, Battle Royale)\n• 🏆 View their own highscores and achievements',
        },
        soloQueue: {
          title: 'Requests without control',
          body: 'Even without the remote every guest queues their own songs: pick a song on the phone, enqueue — done. The request lands here with the 📱 badge and counts towards the profile\'s 3-song limit.',
        },
        soloParty: {
          title: 'Sing along & vote',
          body: 'Party participation always runs through the phones: in Companion Singalong and Pass-the-Mic guests sing straight on their device, in tournament and Battle Royale they vote by tap — all without Take Control.',
        },
        soloStats: {
          title: 'Own achievements & highscores',
          body: 'Every guest keeps their own album: on the phone they can view their own highscores and achievements — no Take Control needed. Whatever the profile earns, the guest can check from the couch.',
        },
        soloLimits: {
          title: 'What stays locked',
          body: 'Without control, settings, profiles, party setup, daily challenges and the jukebox stay off-limits — they remain reserved for the desktop (or a companion with Take Control).',
          details: 'Why the lock? These areas change the game state or configuration for everyone: settings, profile management, party setup, daily challenges and the jukebox. That is what explicit control is for — "Take control" unlocks them for exactly one phone.\n\nThe desktop host always keeps everything in their own hands.',
        },
        helpButton: {
          title: 'Help on every phone ❓',
          body: 'You know the ? menu here in the menu bar — every connected phone gets its own "?" button. One tap opens the companion help right on the device.',
        },
        helpLocal: {
          title: 'Read only, never control',
          body: 'The companion help is a pure reading view: it sends no commands to the desktop and never starts a desktop tour. Guests can open it anytime — even while someone sings or controls.',
          details: 'The help is deliberately kept apart from the control system: a guest who just wants to look something up ("How do I queue a song?") has zero influence on the running night — and the tours here on the desktop remain your host business.\n\nOpen it via the "?" button in the companion app; close it by simply closing the view.',
        },
        deviceList: {
          title: 'The device list',
          body: 'Back in the Mobile tab: all connected devices show connection time, role, assigned profile and last activity — including a kick button.',
          details: 'The device card shows:\n• Connection duration ("for 12 min")\n• What the device is doing (mic active, remote control …)\n• The claimed profile — a dropdown assigns a different one\n• Kick: disconnects the device (it can reconnect instantly)\n\nTip: give profiles speaking names — the list stays clear even with many guests.',
        },
        profileClaim: {
          title: 'Profile claiming',
          body: 'Every device can claim a profile: the guest then sings under their own name with their own XP — the profile screen shows the claim with a 📱 badge.',
          details: 'Ways to claim:\n1. Scan the profile QR in the profile settings (most direct)\n2. In the app after connecting, pick from the list\n3. Here in the device list via the dropdown\n\nDetails also in the profile tour.',
        },
        microphoneFallback: {
          title: 'Phone instead of mic setup',
          body: 'When everyone sings via phone you can skip the microphone tab entirely — the app regulates sensitivity itself. Physical mics are configured in the microphone tab as shown.',
        },
        finish: {
          title: 'Connected! 🔗',
          body: 'You now know how phones dock and what they can do.\n\nNext step: open the URL on your own phone and run a first test — mic mode is the most impressive.',
        },
      },
    },

    // ═══ Achievements tour (R29) ═══
    achievements: {
      title: 'Achievements & Progress',
      desc: 'Achievements, XP levels, rarities and daily challenges.',
      chapters: {
        overview: 'Overview',
        unlock: 'Unlocking achievements',
        daily: 'Daily Challenges',
      },
      steps: {
        welcome: {
          title: 'Achievements & progress 🏆',
          body: 'Everything you collect: achievements with rarities, XP levels with rank titles and the daily challenges as the XP engine.\n\nThis tour walks the achievements screen and the challenges.',
          details: 'The three systems together:\n• XP: the "fuel" — from songs, challenges and achievements\n• Levels & ranks: rise with XP (Beginner → Divine), showing progress at a glance\n• Achievements: milestones with rewards — some secret until you unlock them\n\nEverything hangs on the profile — whoever sings, collects (see the profile tour).',
        },
        navButton: {
          title: 'The achievements button',
          body: 'In the menu bar, the first trophy leads to the leaderboards (highscores) — the second trophy right next to it opens the achievements.',
        },
        playerSelector: {
          title: 'Player selection',
          body: 'Up here you pick whose achievements you view — handy for showing off your collection. The number on the profile shows its unlocked count.',
        },
        stats: {
          title: 'The stat cards',
          body: 'Four cards at a glance: unlocked achievements, XP collected from them, completeness in percent and the current level with rank name.',
          details: 'The percent card computes: unlocked ÷ all achievements. 100 % is the collector\'s hurdle — usually rewarded with its own secret achievement.\n\nThe level card additionally shows the rank name ("Novice", "Legend", "Divine" …) — the names come from the profile\'s progression system.',
        },
        filters: {
          title: 'Filters',
          body: 'Left: the status filters (all / unlocked / locked). Right: the categories: performance, progression, social and special.',
          details: 'The categories mean:\n• Performance: singing feats (combos, golden notes, perfect rounds)\n• Progression: collection milestones (songs played, XP amounts, levels)\n• Social: party and multiplayer actions (duels, companion rounds)\n• Special: secrets and curiosities — the description reveals itself only on unlock\n\nCombinable: "Locked + Special" shows what still awaits you.',
        },
        grid: {
          title: 'The achievement cards',
          body: 'Each card: icon, name, description, rarity and XP reward. Unlocked ones glow golden with a date — locked ones stay grey.',
          details: 'The rarities (color coded):\n• Common — comes naturally with regular play\n• Rare — requires deliberate action\n• Epic — hard work or lucky coincidences\n• Legendary — for the few\n\nUnlocking happens automatically once the condition is met — toast notification included. The XP lands on the profile instantly.',
        },
        xpSystem: {
          title: 'How XP flows',
          body: 'XP comes from three sources: sung songs (by difficulty), challenges (daily/weekly) and achievements. Levels unlock ranks — and some features like profile badges.',
          details: 'XP sources at a glance:\n• Finished song: base XP by difficulty (easy → expert, rising)\n• Daily slot: 100–200 XP base, ×0.5–3 by difficulty, plus bonuses\n• Weekly slot: 250–500 XP base, ×0.5–3 by difficulty\n• Achievement: one-time per achievement (5–7500 XP depending on the achievement)\n\nThe level bar in the profile screen shows the way to the next level; the rank climbs with XP (Beginner → Divine).',
        },
        navDaily: {
          title: 'To the challenges',
          body: 'The daily challenges have their own screen — the star button in the menu bar leads there. Navigating now.',
        },
        playerSelection: {
          title: 'Step 1: pick players',
          body: 'Guided flow: first pick who plays — only then do the tasks appear. Multiple players possible; the statistics belong to the first.',
          details: 'Why the selection first? Slots and statistics are per profile — without a chosen player there would be nothing to compute.\n\nThe card shows all active profiles; selection by click. Afterwards step 2 (tasks) and step 3 (playing) unfold.',
        },
        slots: {
          title: 'Step 2: the 5 slots',
          body: 'Five task slots per day, unlocking in sequence. Each slot shows the task, playable difficulties and the XP value — higher difficulties multiply.',
          details: 'Slot mechanics:\n• Slots 2–5 open only after the previous one is completed — the chain forces variety.\n• Every task is a condition on the next song ("genre rock", "at least 80 % accuracy" …) — the library automatically filters matching songs.\n• Difficulty choice per slot: up to 3× XP multiplier on Insane.\n\nAt midnight five fresh tasks drop — the chain restarts.',
        },
        badges: {
          title: 'Badges & weekly',
          body: 'Clearing slots earns daily badges (bronze/silver/gold) with extra XP. The weekly counterpart runs 7 days with fat rewards — same mechanics, bigger pot.',
          details: 'Badge tiers per day:\n• Bronze: 1 slot\n• Silver: 3 slots\n• Gold: all 5 slots — plus the daily bonus XP\n\nWeekly: 5 slots over 7 days, 250–500 XP base per slot (× difficulty multiplier), reset on Mondays. Playing daily AND weekly levels you significantly faster than songs alone.',
        },
        challengeModes: {
          title: 'Challenge modes',
          body: 'Besides the slots there are free challenge modes with modifiers (e.g. "1.5× speed", "hidden lyrics") — for custom rules and extra XP beyond the daily tasks.',
          details: 'The modes are freely selectable: pick a mode, its modifiers apply automatically, the XP reward grows with the difficulty.\n\nCompleted modes unlock chained follow-up challenges — the longer you play, the more opens up.',
        },
        finish: {
          title: 'Collection time! 🏅',
          body: 'You now know achievements, XP and challenges — the three engines of progress.\n\nTip to start: play 2 daily slots today — the rest comes on its own.',
        },
      },
    },
  },
};
