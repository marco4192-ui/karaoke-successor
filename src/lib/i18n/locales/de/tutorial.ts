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
          body: 'Oben wählt du den Bereich: Allgemein (Sprache), Gameplay, Darstellung, Grafik & Sound, Mikrofon, Mobil (Handy-Anbindung) und mehr.\n\nJeder Reiter beginnt mit einer kurzen Einleitung — und die eigene Einstellungen-Tour erklärt alles im Detail.',
        },
        finish: {
          title: 'Geschafft! 🎉',
          body: 'Du kennst jetzt die Grundlagen.\n\nTipp: Das ?-Symbol in der Menüleiste bringt dich jederzeit zurück — auch zu einzelnen Themen-Kapiteln oder zur Einstellungen- und Editor-Tour.',
        },
      },
    },

    // ═══ Einstellungen-Tour (R26) ═══
    settings: {
      title: 'Einstellungen',
      desc: 'Alle Reiter der Einstellungen — von Sprache über Mikrofon bis Motto-Party und Backup.',
      chapters: {
        overview: 'Überblick',
        basics: 'Basis-Einstellungen',
        devices: 'Geräte',
        library: 'Bibliothek & Motto',
        backup: 'Sicherung & Abschluss',
      },
      steps: {
        welcome: {
          title: 'Die Einstellungen ⚙️',
          body: 'Diese Tour widmet sich ausschließlich den Einstellungen: alle Reiter, was du darin findest und wann sie wichtig werden.\n\nWir springen gemeinsam von Reiter zu Reiter — du musst nichts anklicken.',
        },
        tabBar: {
          title: 'Die Reiter-Leiste',
          body: 'Die Einstellungen sind in Reiter gegliedert: Allgemein, Gameplay, Darstellung, Audio, Mikrofon, Mobile, Webcam, Bibliothek, Genres & Sprachen, Motto-Party, Virale Charts, Sync & Backup und Über.\n\nJeder Reiter beginnt mit einer kurzen Einleitung, die erklärt, was dich darin erwartet.',
        },
        generalTab: {
          title: 'Allgemein',
          body: 'Die Grundeinstellungen: App-Sprache (sofort wirksam, 16 Sprachen), Standard-Schwierigkeit für neue Runden und der Online-Modus.\n\nTipp: Hier stellst du auch die KI-Anbieter für Harmonize und Audio-Analyse ein.',
        },
        gameplayTab: {
          title: 'Gameplay',
          body: 'Das Feintuning fürs Spielerlebnis: Punkteanzeige, Combo-Counter und Partikel während des Singens ein-/ausschalten, Replay-Aufnahmen aktivieren und Komfortfunktionen wie Auto-Vollbild und Vorwarnungs-Hinweise nutzen.',
        },
        appearanceTab: {
          title: 'Darstellung',
          body: 'Die Optik: Themes ändern das komplette Erscheinungsbild, Songtext-Stil und -Größe passen die Lyrics an. Dazu Hintergrund-Videos, Noten-Darstellung (Versiegelt/Exakt) und der Leistungsmodus für schwächere Rechner.',
        },
        graphicSoundTab: {
          title: 'Audio',
          body: 'Alles rund um den Klang: Audio-Ausgabegerät wählen, Vorschau- und Gesamtlautstärke regeln, die YouTube-Videoqualität festlegen — und die Lautstärke-Harmonisierung gleicht laut/leise Songs automatisch an (89 dB Ziel).',
        },
        microphoneTab: {
          title: 'Mikrofon',
          body: 'Deine Stimme ist das Spielgerät: Mikrofone hinzufügen (bis zu 4, auch USB- und SingStar-Mics), Empfindlichkeit und Verstärkung justieren, Rausch- und Echo-Unterdrückung testen.\n\nHandys erscheinen hier, sobald sie über den Mobile-Reiter verbunden sind.',
        },
        mobileTab: {
          title: 'Mobile — die Companion-App',
          body: 'Smartphones als Mikrofon und Steuerung: Gekoppelte Geräte verwalten, deren Mikrofone den Spielern zuweisen — die Verbindung läuft per QR-Code oder Verbindungscode über dasselbe WLAN.',
        },
        webcamTab: {
          title: 'Webcam',
          body: 'Die Webcam als Live-Hintergrund beim Singen: Quelle wählen, Spiegelung, Blur-Effekt und Overlay-Transparenz feinjustieren — oder den Hintergrund komplett deaktivieren.',
        },
        libraryTab: {
          title: 'Bibliothek',
          body: 'Die Songs-Verwaltung: Ordner für den Scan festlegen (die Bibliothek füllt sich dann automatisch), Statistiken einsehen.\n\nDer Gefahrenbereich setzt die Bibliothek oder alle Daten zurück — Highscores und Profile bleiben bei einem Bibliotheks-Reset erhalten.',
        },
        taxonomyTab: {
          title: 'Genres & Sprachen',
          body: 'Dein eigener Wortschatz für die Bibliothek: Eigene Genres und Sprachen anlegen — sie erscheinen sofort in allen Auswahllisten und werden von der Harmonisierung als gleichwertige Kategorien berücksichtigt.',
        },
        mottoTab: {
          title: 'Motto-Party',
          body: 'Das Party-Genie: Aktivieren, einen Motto-Namen vergeben (z. B. „80er Jahre Party“) und Suchfelder + Filter festlegen — ab dann ersetzt das Motto alle Filter im Spiel und jede Song-Auswahl greift nur noch auf passende Songs zu.',
        },
        viralTab: {
          title: 'Virale Charts',
          body: 'Hier bestimmst du das Land der Viral-Charts (Deutschland, USA, Japan …) — die viralen Hits landen dann als Filter in der Bibliothek. Der Aktualisieren-Knopf holt die neuesten Einträge ab.',
        },
        syncTab: {
          title: 'Sync & Backup',
          body: 'Der Umzugs-Helfer: Alles (Songs, Highscores, Profile, Playlists, Einstellungen — optional inkl. Song-Medien) als Datei exportieren und auf demselben oder einem anderen Gerät wiederherstellen.\n\nDie Vorschau zeigt vor dem Einspielen exakt, was im Backup steckt.',
        },
        finish: {
          title: 'Einrichtung abgeschlossen! ✅',
          body: 'Du kennst jetzt jeden Einstellungs-Reiter.\n\nJeder Reiter erklärt sich zusätzlich selbst in seiner kurzen Einleitung — und das ?-Symbol in der Menüleiste bringt dich jederzeit zu dieser Tour zurück.',
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
          body: 'Du kennst jetzt den Editor-Baukasten.\n\nDenk dran: Strg+Z rettet alles, und das ?-Symbol (in der Menüleiste, hier im Editor auch unten rechts) bringt dich jederzeit zu diesen Kapiteln zurück.',
        },
      },
    },
  },
};
