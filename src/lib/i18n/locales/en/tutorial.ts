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
    offerHint: 'Available anytime via the ? icon at the bottom right.',

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
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke without competition: build playlists, queue songs, share favourites. The perfect background entertainer.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores per song and difficulty — beat your friends (or yourself).',
        },
        settingsCard: {
          title: 'Settings',
          body: 'Microphones, language, gameplay fine-tuning, appearance and graphics — all the knobs live here.',
        },
        finish: {
          title: 'Done! 🎉',
          body: 'You know the basics now.\n\nTip: the ? icon at the bottom right brings you back anytime — including individual topic chapters and the editor tour.',
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
          body: 'You now know the editor toolbox.\n\nRemember: Ctrl+Z saves everything, and the ? icon at the bottom right brings you back to these chapters anytime.',
        },
      },
    },
  },
};
