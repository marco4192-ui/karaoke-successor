// Tutorial / Live-Tour texts (Grundfunktionen + Editor)
export const tutorialTranslations = {
  tutorial: {
    // ?-Hilfemenü
    helpButtonTitle: 'Hilfe & Tutorials',
    helpDialogTitle: 'Hilfe & Tutorials',
    helpDialogDesc: 'Schaue dir die kompletten Touren an — oder springe gezielt in ein Thema und lass dir nur diesen Teil erklären.',
    helpFooter: 'Tastatur in der Tour: → Weiter · ← Zurück · Esc Beenden',
    startFullTour: 'Komplette Tour',
    stepsCount: '{n} Schritte',
    completedBadge: 'Abgeschlossen',
    // Overlay-Steuerung
    ariaLabel: 'Anleitung',
    skipTour: 'Tour beenden',
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Fertig',
    clickHint: 'Jetzt anklicken',
    // Erststart-Angebot
    offerTitle: 'Willkommen bei Karaoke ZERO!',
    offerBody: 'Möchtest du eine kurze Führung durch die Grundfunktionen? In 2 Minuten kennst du Daily-Challenges, Sing-Modi, Bibliothek und Party-Spiele.',
    offerStart: 'Tour starten',
    offerLater: 'Vielleicht später',
    offerHint: 'Jederzeit über das ?-Symbol unten rechts erneut verfügbar.',

    // ═══ Grundfunktionen-Tour ═══
    basic: {
      title: 'Grundfunktionen',
      desc: 'Der Rundflug: Challenges, Sing-Modi, Bibliothek, Party & mehr.',
      chapters: {
        welcome: 'Willkommen',
        challenges: 'Daily & Weekly',
        singing: 'Singen starten',
        party: 'Party-Modi',
        more: 'Weitere Bereiche',
      },
      steps: {
        welcome: {
          title: 'Willkommen! 👋',
          body: 'Das hier ist eine Live-Tour: Ich hebe die wichtigen Stellen hervor und erkläre sie.\n\nSteuerung: „Weiter" (oder Taste →), „Zurück" (←) und „Tour beenden" (Esc). Los geht\'s!',
        },
        heroButtons: {
          title: 'Schnellstart',
          body: '„Singen starten" bringt dich direkt in die Bibliothek. „Party-Modus" öffnet die 9 Party-Spiele für Gruppen.',
        },
        dailyCard: {
          title: 'Tages-Challenge',
          body: '5 Slots pro Tag mit wechselnden Aufgaben — je mehr Slots du schaffst, desto mehr XP-Bonus kassierst du. Um Mitternacht gibt es neue Aufgaben.',
        },
        weeklyCard: {
          title: 'Wochen-Challenge',
          body: 'Das wöchentliche Gegenstück: 5 Slots über die Woche verteilt mit größeren XP-Belohnungen. Perfekt für langfristige Ziele.',
        },
        modeLauncher: {
          title: 'Singen: Single, Duell & Duett',
          body: '🎤 Single: ein Spieler, ein Mikro.\n⚔️ Duell: zwei Spieler am GLEICHEN Song — wer mehr Punkte holt, gewinnt.\n🎭 Duett: zwei Stimmen auf zwei Spuren — die Library zeigt dir automatisch nur passende Duett-Songs.',
        },
        libraryNav: {
          title: 'Die Bibliothek',
          body: 'Hier findest du alle Songs. Suche nach Titel oder Künstler — die fuzzy-Suche verzeiht sogar Tippfehler.',
        },
        filters: {
          title: 'Filter',
          body: 'Genre, Sprache, Jahr, Jahrzehnt, Duett-Songs und virale Hits — filtere die Bibliothek nach Lust und Laune.',
        },
        songCard: {
          title: 'Songs',
          body: 'Ein Klick auf eine Song-Karte öffnet den Start-Dialog: Modus, Spieler, Mikrofone und Schwierigkeit.',
        },
        startModal: {
          title: 'Der Start-Dialog',
          body: 'Hier stellst du alles ein: Modus (Single/Duell/Duett), wer mitsingt, welches Mikro jeder bekommt und die Schwierigkeit.\n\nDann: „Start" — und ab geht die Luzi!',
        },
        partyCard: {
          title: 'Party-Modi',
          body: '9 Spiele für 2–24 Spieler: Battle Royal, Pass-the-Mic, Medley-Wettbewerb, Turnier, Fehlende Wörter, Blind-Karaoke und mehr — inklusive Handy-Anbindung als Mikro.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke ohne Wettkampf: Playlists bauen, Songs einreihen, Vorlieben teilen. Ideal als Hintergrund-Entertainer.',
        },
        highscoreCard: {
          title: 'Bestenlisten',
          body: 'Highscores pro Song und Schwierigkeit — schlage deine Freunde (oder dich selbst).',
        },
        settingsCard: {
          title: 'Einstellungen',
          body: 'Mikrofone, Sprache, Gameplay-Feintuning, Darstellung und Grafik — alles Feinjustieren passiert hier.',
        },
        finish: {
          title: 'Geschafft! 🎉',
          body: 'Du kennst jetzt die Grundlagen.\n\nTipp: Das ?-Symbol unten rechts bringt dich jederzeit zurück — auch zu einzelnen Themen-Kapiteln oder zur Editor-Tour.',
        },
      },
    },

    // ═══ Editor-Tour ═══
    editor: {
      title: 'Editor-Tour',
      desc: 'Noten, Lyrics, Stimmen & Harmonize — der Song-Baukasten.',
      chapters: {
        entry: 'Einstieg',
        layout: 'Aufbau',
        notes: 'Noten bearbeiten',
        extras: 'Extras & Harmonize',
      },
      steps: {
        welcome: {
          title: 'Der Editor ✏️',
          body: 'Hier machst du aus Songs spielbare Karaoke-Tracks: Noten setzen, Lyrics timen, Stimmen zuweisen.\n\nSandbox-Tipp: Übe an einem Test-Song — Änderungen lassen sich per Undo (Strg+Z) zurücknehmen.',
        },
        songList: {
          title: 'Song-Auswahl',
          body: 'Suche einen Song, um ihn zu öffnen. Filter zeigen Songs mit fehlenden Metadaten — die harmonisiert der Editor später.',
        },
        noSongs: {
          title: 'Keine Songs vorhanden',
          body: 'Der Editor braucht Songs in der Bibliothek. Importiere zuerst Songs (Bibliothek → Import bzw. Ordner-Scan) und komm dann wieder.',
        },
        openSong: {
          title: 'Song öffnen',
          body: 'Klicke jetzt auf einen Song in der Liste, um ihn im Editor zu öffnen.',
        },
        leftPanel: {
          title: 'Werkzeugleiste',
          body: 'Alles für Noten: Hinzufügen, Duplizieren, Löschen, Teilen, Verschmelzen — dazu Notentypen, Stimmen und der Tap-Modus (kommt gleich).',
        },
        lyricsPanel: {
          title: 'Lyrics-Panel',
          body: 'Links stehen die Lyrics-Zeilen. Doppelklick auf eine Zeile springt mit der Wiedergabe genau dorthin — Text und Timing lassen sich hier bearbeiten.',
        },
        subHeaderTools: {
          title: 'Noten bearbeiten',
          body: 'Noten sind die Blöcke auf den Tonhöhen-Bahnen: Hinzufügen, Duplizieren, Löschen, Teilen (eine Note → zwei) und Verschmelzen (zwei → eine).\n\nMarkierte Noten bearbeitest du im Takt: ⌫ löscht, ↑/↓ transponiert.',
        },
        noteTypes: {
          title: 'Notentypen',
          body: '5 Typen für neue Noten:\n: Normal (Tonhöhe zählt)\n* Gold (Extrapunkte)\nF Freestyle (jeder Ton zählt)\nR Rap (nur Timing)\nG Rap-Gold',
        },
        voices: {
          title: 'Stimmen',
          body: 'P1 = Spieler 1, P2 = Spieler 2 (Duett!), P4/P8 = dritte/vierte Stimme. Jede Note gehört zu einer Stimme — so entstehen Duett-Songs mit getrennten Parts.',
        },
        tapMode: {
          title: 'Tap-Modus — der Turbo 🥁',
          body: 'Halte die Taste gedrückt und klopfe im Rhythmus: Jeder Klick platziert eine Note an der aktuellen Abspielposition, Textzeile für Textzeile. So erstellst du Noten in Echtzeit.',
        },
        panels: {
          title: 'Kopfzeilen-Panels',
          body: 'Drei Panels oben rechts: Metadaten (Genre/Sprache/Jahr), Audio-Analyse und der KI-Assistent.',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Der Harmonize-Turbo: KI- und Regel-Vorschläge für Genre, Sprache und Jahr — mit Vorhören vor dem Zuweisen, manueller Feinbearbeitung und Review-Queue für unsichere Treffer.',
        },
        shortcuts: {
          title: 'Shortcuts',
          body: 'Alle Tastenkürzel auf einen Blick — der Editor ist ein Tastatur-Instrument. Klick dich durch!',
        },
        finish: {
          title: 'Bereit zum Bauen! 🛠️',
          body: 'Du kennst jetzt den Editor-Baukasten.\n\nDenk dran: Strg+Z rettet alles, und das ?-Symbol unten rechts bringt dich jederzeit zu diesen Kapiteln zurück.',
        },
      },
    },
  },
};
