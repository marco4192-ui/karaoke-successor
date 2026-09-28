// Tutorial / Live-Tour texts (basics + editor) — EN
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
    // Overlay controls
    ariaLabel: 'Guided tour',
    skipTour: 'End tour',
    back: 'Back',
    next: 'Next',
    finish: 'Done',
    clickHint: 'Click it now',
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
        },
        heroButtons: {
          title: 'Quick start',
          body: '"Start Singing" takes you straight to the library. "Party Mode" opens the 9 party games for groups.',
        },
        dailyCard: {
          title: 'Daily challenge',
          body: '5 slots per day with rotating tasks — the more slots you clear, the bigger your XP bonus. Fresh tasks drop at midnight.',
        },
        weeklyCard: {
          title: 'Weekly challenge',
          body: 'The weekly counterpart: 5 slots across the week with bigger XP rewards. Perfect for long-term goals.',
        },
        modeLauncher: {
          title: 'Sing: Single, Duel & Duet',
          body: '🎤 Single: one player, one mic.\n⚔️ Duel: two players on the SAME song — most points wins.\n🎭 Duet: two voices on two tracks — the library automatically shows only matching duet songs.',
        },
        libraryNav: {
          title: 'The library',
          body: 'All your songs live here. Search by title or artist — the fuzzy search even forgives typos.',
        },
        filters: {
          title: 'Filters',
          body: 'Genre, language, year, decade, duet songs and viral hits — slice the library however you like.',
        },
        songCard: {
          title: 'Songs',
          body: 'Clicking a song card opens the start dialog: mode, players, microphones and difficulty.',
        },
        startModal: {
          title: 'The start dialog',
          body: 'Set everything here: mode (single/duel/duet), who sings, which mic everyone gets, and the difficulty.\n\nThen hit "Start" — and off you go!',
        },
        partyCard: {
          title: 'Party modes',
          body: '9 games for 2–24 players: Battle Royale, Pass-the-Mic, Medley contest, tournament, missing words, blind karaoke and more — phones can join as mics.',
        },
        partyModes: {
          title: 'The mode picker',
          body: 'This is where you pick the party mode: Battle Royale (last man standing), Pass-the-Mic, tournament (bracket), medley and more.\n\nEach card shows what to expect — one click opens player selection.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke without competition: build playlists, queue songs, share favourites. The perfect background entertainer.',
        },
        jukeboxView: {
          title: 'Inside the jukebox menu',
          body: '"Browse playlists" gives you direct access to every saved playlist — including the ones you created in the library. One click enqueues the whole playlist.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores per song and difficulty — beat your friends (or yourself).',
        },
        highscoreView: {
          title: 'The highscore boards',
          body: 'Filtered by song and difficulty — with the filter bar on top. The phone icons show companion app usage.',
        },
        settingsCard: {
          title: 'Settings',
          body: 'Microphones, language, gameplay fine-tuning, appearance and graphics — all the knobs live here.',
        },
        settingsView: {
          title: 'The settings tabs',
          body: 'Pick a section at the top: General (language), Gameplay, Appearance, Graphics & Sound, Microphone, Mobile (phone connection) and more.',
        },
        finish: {
          title: 'Done! 🎉',
          body: 'You know the basics now.\n\nTip: the ? icon in the menu bar brings you back anytime — including individual topic chapters, the editor tour and the settings tour.',
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
        },
        songList: {
          title: 'Song selection',
          body: 'Search a song to open it. Filters reveal songs with missing metadata — the editor harmonizes those later.',
        },
        noSongs: {
          title: 'No songs yet',
          body: 'The editor needs songs in the library. Import songs first (library → import / folder scan) and come back.',
        },
        openSong: {
          title: 'Open a song',
          body: 'Click a song in the list now to open it in the editor.',
        },
        leftPanel: {
          title: 'Toolbar',
          body: 'Everything for notes: add, duplicate, delete, split, merge — plus note types, voices and tap mode (coming up).',
        },
        lyricsPanel: {
          title: 'Lyrics panel',
          body: 'The lyric lines sit on the left. Double-click a line to jump playback right there — text and timing are editable here.',
        },
        subHeaderTools: {
          title: 'Editing notes',
          body: 'Notes are the blocks on the pitch lanes: add, duplicate, delete, split (one note → two) and merge (two → one).\n\nEdit selected notes in tempo: ⌫ deletes, ↑/↓ transposes.',
        },
        noteTypes: {
          title: 'Note types',
          body: '5 types for new notes:\n: Normal (pitch counts)\n* Golden (extra points)\nF Freestyle (any note counts)\nR Rap (timing only)\nG Rap-gold',
        },
        voices: {
          title: 'Voices',
          body: 'P1 = player 1, P2 = player 2 (duet!), P4/P8 = third/fourth voice. Every note belongs to a voice — that\'s how duet songs with separate parts are made.',
        },
        tapMode: {
          title: 'Tap mode — the turbo 🥁',
          body: 'Hold the key and tap along: every click drops a note at the current playback position, lyric line by lyric line. Create notes in real time.',
        },
        panels: {
          title: 'Header panels',
          body: 'Three panels top right: metadata (genre/language/year), audio analysis and the AI assistant.',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'The harmonize turbo: AI and rule suggestions for genre, language and year — with listen-before-assign, manual fine-editing and a review queue for uncertain matches.',
        },
        shortcuts: {
          title: 'Shortcuts',
          body: 'All keyboard shortcuts at a glance — the editor is a keyboard instrument. Click through!',
        },
        finish: {
          title: 'Ready to build! 🛠️',
          body: 'You now know the editor toolbox.\n\nRemember: Ctrl+Z saves everything, and the ? icon in the menu bar brings you back to these chapters anytime.',
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
        },
        tabBar: {
          title: 'The tab bar',
          body: 'All settings are organized into tabs: General, Gameplay, Appearance, Audio, Microphone, Mobile, Webcam, Library, Genres & Languages, Theme Party, Sync & Backup and About.\n\nSince R28, a short intro text at the top of each tab explains what it does.',
        },
        general: {
          title: 'General',
          body: 'Interface language, default difficulty, online activities and the complete keyboard shortcut overview.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Scoring on/off, particle effects, queue autoplay and more behavior switches for rounds and results.',
        },
        appearance: {
          title: 'Appearance',
          body: 'Themes, animated background or your own background video, lyrics style and size, note display and the performance mode for weaker machines.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Output device (incl. ASIO), master and preview volume, microphone sensitivity, loudness normalization and YouTube video quality.',
        },
        microphone: {
          title: 'Microphone',
          body: 'Device selection, sensitivity, noise gate and live level — plus presets. Smartphones are connected via the Mobile tab.',
        },
        libraryTab: {
          title: 'Library',
          body: 'Set the songs folder (each subfolder = one song) and scan it, reset the library or delete all data — plus the import from other karaoke systems.',
        },
        taxonomy: {
          title: 'Genres & Languages',
          body: 'Create your own genre and language entries — they appear in all dropdowns and feed into the AI harmonization.',
        },
        motto: {
          title: 'Theme Party',
          body: 'Set the whole game to a theme (e.g. an 80s party): when active, the theme replaces all search fields and filters — every song selection only draws from matching songs.',
        },
        mobile: {
          title: 'Mobile & Companion',
          body: 'Connect smartphones via QR code — as microphone, remote control or sing-along device. You see all connected devices and their connection codes.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Use the webcam as an animated song background: resolution, mirroring, saturation, blur and more effects — with a live preview.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Create and restore backups, synchronize data between devices. In the desktop build, player data is also mirrored permanently to the AppData folder.',
        },
        about: {
          title: 'About',
          body: 'Version, platform, licenses and contributing projects — the digital imprint of Karaoke ZERO.',
        },
        finish: {
          title: 'Fully configured! ⚙️',
          body: 'You now know all the settings.\n\nThe ? icon in the menu bar brings you back to this tour anytime — chapter by chapter if you like.',
        },
      },
    },
  },
};
