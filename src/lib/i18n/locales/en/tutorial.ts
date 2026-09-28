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
          body: 'Pick a section at the top: General (language), Gameplay, Appearance, Graphics & Sound, Microphone, Mobile (phone connection) and more.\n\nEvery tab opens with a short intro — and the dedicated settings tour walks you through all of it.',
        },
        finish: {
          title: 'Done! 🎉',
          body: 'You know the basics now.\n\nTip: the ? icon in the menu bar brings you back anytime — including individual topic chapters and the settings and editor tours.',
        },
      },
    },

    // ═══ Settings tour (R26) ═══
    settings: {
      title: 'Settings',
      desc: 'Every settings tab — from language and microphones to theme party and backup.',
      chapters: {
        overview: 'Overview',
        basics: 'Basic settings',
        devices: 'Devices',
        library: 'Library & theme',
        backup: 'Backup & wrap-up',
      },
      steps: {
        welcome: {
          title: 'The settings ⚙️',
          body: 'This tour is all about the settings: every tab, what lives inside it, and when it matters.\n\nWe will hop from tab to tab together — no clicking required on your part.',
        },
        tabBar: {
          title: 'The tab bar',
          body: 'The settings are organized into tabs: General, Gameplay, Appearance, Audio, Microphone, Mobile, Webcam, Library, Genres & Languages, Theme Party, Viral Charts, Sync & Backup, and About.\n\nEach tab opens with a short intro explaining what to expect inside.',
        },
        generalTab: {
          title: 'General',
          body: 'The basics: app language (applies instantly, 16 languages), default difficulty for new rounds, and online mode.\n\nTip: the AI providers for harmonize and audio analysis are configured here too.',
        },
        gameplayTab: {
          title: 'Gameplay',
          body: 'Fine-tune the experience: toggle the score display, combo counter and particles while singing, enable replay recording, and use comforts like auto-fullscreen and warning cues.',
        },
        appearanceTab: {
          title: 'Appearance',
          body: 'The look: themes restyle the entire app, lyric style and size adapt the lyrics. Plus background videos, note display (sealed/exact) and the performance mode for weaker machines.',
        },
        graphicSoundTab: {
          title: 'Audio',
          body: 'Everything sound: pick the audio output device, set preview and master volume, choose the YouTube video quality — and loudness normalization automatically evens out loud/quiet songs (89 dB target).',
        },
        microphoneTab: {
          title: 'Microphone',
          body: 'Your voice is the controller: add microphones (up to 4, USB and SingStar mics work too), adjust sensitivity and gain, test noise and echo suppression.\n\nPhones appear here as soon as they are connected via the Mobile tab.',
        },
        mobileTab: {
          title: 'Mobile — the companion app',
          body: 'Smartphones as microphones and controllers: manage paired devices and assign their microphones to players — pairing works via QR code or connection code over the same Wi-Fi.',
        },
        webcamTab: {
          title: 'Webcam',
          body: 'Your webcam as a live singing background: pick the source and fine-tune mirroring, blur and overlay opacity — or disable the background entirely.',
        },
        libraryTab: {
          title: 'Library',
          body: 'Song management: set the folder to scan (the library fills itself from it) and check the statistics.\n\nThe danger zone resets the library or all data — high scores and profiles survive a library reset.',
        },
        taxonomyTab: {
          title: 'Genres & languages',
          body: 'Your own vocabulary for the library: create custom genres and languages — they instantly appear in every dropdown and are treated as equal categories by harmonization.',
        },
        mottoTab: {
          title: 'Theme party',
          body: 'The party genius: enable it, give it a name (e.g. “80s Party”) and define search fields + filters — from then on the motto replaces all in-game filters and every song selection only draws from matching songs.',
        },
        viralTab: {
          title: 'Viral charts',
          body: 'Choose the country of the viral charts (Germany, USA, Japan …) — the viral hits then show up as a filter in the library. The refresh button pulls the latest entries.',
        },
        syncTab: {
          title: 'Sync & backup',
          body: 'The moving helper: export everything (songs, high scores, profiles, playlists, settings — optionally including song media) to a file and restore it on the same or another device.\n\nThe preview shows exactly what a backup contains before you restore it.',
        },
        finish: {
          title: 'Setup complete! ✅',
          body: 'You now know every settings tab.\n\nEach tab also explains itself in its short intro — and the ? icon in the menu bar brings you back to this tour anytime.',
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
          body: 'You now know the editor toolbox.\n\nRemember: Ctrl+Z saves everything, and the ? icon (in the menu bar, here in the editor also at the bottom right) brings you back to these chapters anytime.',
        },
      },
    },
  },
};
