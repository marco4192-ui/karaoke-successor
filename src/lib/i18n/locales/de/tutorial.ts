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
    offerHint: 'Jederzeit über das ?-Symbol in der Menüleiste erneut verfügbar.',

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
        partyModes: {
          title: 'Die Modi-Auswahl',
          body: 'Hier wählt ihr den Party-Modus: Battle Royal (Last Man Standing), Pass-the-Mic (Mikro-Weitergabe), Turnier (K.-o.-Baum), Medley und mehr.\n\nJede Karte zeigt, was dich erwartet — ein Klick startet die Spielerauswahl.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke ohne Wettkampf: Playlists bauen, Songs einreihen, Vorlieben teilen. Ideal als Hintergrund-Entertainer.',
        },
        jukeboxView: {
          title: 'Im Jukebox-Menü',
          body: 'Über „Playlists ansehen" greifst du direkt auf alle gespeicherten Playlists zu — auch die, die du in der Bibliothek erstellt hast. Ein Klick reiht sie komplett in die Warteschlange ein.',
        },
        highscoreCard: {
          title: 'Bestenlisten',
          body: 'Highscores pro Song und Schwierigkeit — schlage deine Freunde (oder dich selbst).',
        },
        highscoreView: {
          title: 'Die Bestenlisten',
          body: 'Gefiltert nach Song und Schwierigkeit — inklusive Filterleiste oben. Die Handy-Symbole zeigen die Companion-App-Nutzung an.',
        },
        settingsCard: {
          title: 'Einstellungen',
          body: 'Mikrofone, Sprache, Gameplay-Feintuning, Darstellung und Grafik — alles Feinjustieren passiert hier.',
        },
        settingsView: {
          title: 'Die Einstellungs-Reiter',
          body: 'Oben wählt du den Bereich: Allgemein (Sprache), Gameplay, Darstellung, Grafik & Sound, Mikrofon, Mobil (Handy-Anbindung) und mehr.',
        },
        finish: {
          title: 'Geschafft! 🎉',
          body: 'Du kennst jetzt die Grundlagen.\n\nTipp: Das ?-Symbol in der Menüleiste bringt dich jederzeit zurück — auch zu einzelnen Themen-Kapiteln, zur Editor-Tour oder zur Settings-Tour.',
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
          body: 'Du kennst jetzt den Editor-Baukasten.\n\nDenk dran: Strg+Z rettet alles, und das ?-Symbol in der Menüleiste bringt dich jederzeit zu diesen Kapiteln zurück.',
        },
      },
    },

    // ═══ Settings-Tour (R28) ═══
    settings: {
      title: 'Einstellungen',
      desc: 'Alle Einstellungen im Überblick: Tabs, Grundeinstellungen, Audio, Bibliothek, Companion-Geräte und Backup.',
      chapters: {
        overview: 'Überblick',
        basics: 'Basis-Einstellungen',
        sound: 'Audio & Mikrofon',
        library: 'Bibliothek & Motto',
        devices: 'Geräte & Companion',
        data: 'Sync, Backup & Info',
      },
      steps: {
        welcome: {
          title: 'Die Einstellungen 👋',
          body: 'Diese Tour führt dich ausschließlich durch die Einstellungen — Tab für Tab.\n\nIch wechsle automatisch in den jeweiligen Tab und erkläre, was du dort findest.',
        },
        tabBar: {
          title: 'Die Tab-Leiste',
          body: 'Alle Einstellungen sind in Tabs gegliedert: Allgemein, Gameplay, Darstellung, Audio, Mikrofon, Mobile, Webcam, Bibliothek, Genres & Sprachen, Motto-Party, Sync & Backup und Über.\n\nSeit R28 erklärt ein kurzer Einleitungstext oben in jedem Tab, wozu er dient.',
        },
        general: {
          title: 'Allgemein',
          body: 'Sprache der Oberfläche, Standard-Schwierigkeit, Online-Aktivitäten und die komplette Tastaturkürzel-Übersicht.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Scoring an/aus, Partikel-Effekte, Autoplay der Queue und weitere Verhaltens-Schalter für Runden und Ergebnisse.',
        },
        appearance: {
          title: 'Darstellung',
          body: 'Themes, animierter Hintergrund oder eigenes Hintergrundvideo, Lyrics-Stil und -Größe, Noten-Anzeige und der Performance-Modus für schwächere Rechner.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Ausgabegerät (inkl. ASIO), Master- und Preview-Lautstärke, Mikrofon-Empfindlichkeit, Loudness-Normalisierung und YouTube-Videoqualität.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Geräteauswahl, Empfindlichkeit, Noise-Gate und Live-Pegel — plus Presets. Smartphones bindest du über den Mobile-Tab ein.',
        },
        libraryTab: {
          title: 'Bibliothek',
          body: 'Songs-Ordner festlegen (jeder Unterordner = ein Song) und einlesen, Bibliothek zurücksetzen oder alle Daten löschen — plus der Import aus anderen Karaoke-Systemen.',
        },
        taxonomy: {
          title: 'Genres & Sprachen',
          body: 'Eigene Genre- und Sprach-Einträge anlegen — sie erscheinen in allen Auswahllisten und fließen in die KI-Harmonisierung ein.',
        },
        motto: {
          title: 'Motto-Party',
          body: 'Stelle das ganze Spiel auf ein Motto ein (z. B. „80er Jahre Party“): Bei aktivem Motto ersetzt es alle Suchfelder und Filter — jede Song-Auswahl greift nur noch auf passende Songs zu.',
        },
        mobile: {
          title: 'Mobile & Companion',
          body: 'Smartphones per QR-Code verbinden — als Mikrofon, Fernbedienung oder Mitsing-Gerät. Du siehst alle verbundenen Geräte und ihre Verbindungscodes.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Webcam als animierten Song-Hintergrund nutzen: Auflösung, Spiegelung, Sättigung, Blur und weitere Effekte — mit Live-Vorschau.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Sicherungen erstellen und wiederherstellen, Daten zwischen Geräten synchronisieren. Im Desktop-Build werden Spielerdaten zusätzlich dauerhaft im AppData-Ordner gespiegelt.',
        },
        about: {
          title: 'Über',
          body: 'Version, Plattform, Lizenzen und mitwirkende Projekte — das digitale Impressum von Karaoke ZERO.',
        },
        finish: {
          title: 'Fertig konfiguriert! ⚙️',
          body: 'Du kennst jetzt alle Einstellungen.\n\nDas ?-Symbol in der Menüleiste bringt dich jederzeit zu dieser Tour zurück — auch kapitelweise.',
        },
      },
    },
  },
};
