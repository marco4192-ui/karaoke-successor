// Tutorial / Live-Tour texts (Grundfunktionen + Editor + Settings + R29: Profile, Queue, Chat, Companion, Erfolge)
// Jeder Schritt kann optional ein `details`-Feld tragen — der „Mehr erfahren"-
// Button im Tooltip klappt den Deep-Dive-Text aus (kurzer Body, Details auf Abruf).
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
    // Tour-Gruppen im Hilfemenü (R29: 8 Touren brauchen Gliederung)
    groupGettingStarted: 'Erste Schritte',
    groupAreas: 'Bereiche & Funktionen',
    groupAdvanced: 'Für Profis',
    // Overlay-Steuerung
    ariaLabel: 'Anleitung',
    skipTour: 'Tour beenden',
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Fertig',
    clickHint: 'Jetzt anklicken',
    // „Mehr erfahren"-Ausklappbereich (R29)
    moreDetails: 'Mehr erfahren',
    lessDetails: 'Weniger anzeigen',
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
          details: 'Du kannst die Tour jederzeit unterbrechen und später weitermachen: Das ?-Symbol in der Menüleiste öffnet das Hilfemenü mit allen Touren — auch kapitelweise.\n\nBei vielen Schritten gibt es unten den Button „Mehr erfahren": Er klappt zusätzliche Details aus, ohne dass du den Kurztext verlierst.',
        },
        heroButtons: {
          title: 'Schnellstart',
          body: '„Singen starten" bringt dich direkt in die Bibliothek. „Party-Modus" öffnet die 9 Party-Spiele für Gruppen.',
          details: 'Die Schnellstart-Karten sind Abkürzungen für die häufigsten Wege:\n• „Singen starten" = Bibliothek öffnen, Song aussuchen, loslegen (Solo, Duell oder Duett).\n• „Party-Modus" = die Spiele-Sammlung für 2–24 Spieler, inklusive Handy-Anbindung.\n\nAlles, was du hier siehst, erreichst du auch über die Menüleiste oben — die Karten sparen nur Klicks.',
        },
        dailyCard: {
          title: 'Tages-Challenge',
          body: '5 Slots pro Tag mit wechselnden Aufgaben — je mehr Slots du schaffst, desto mehr XP-Bonus kassierst du. Um Mitternacht gibt es neue Aufgaben.',
          details: 'So funktioniert das System im Detail:\n• Jeder der 5 Slots enthält eine andere Aufgabenart (z. B. „Sing einen Song der 80er", „Erreiche 8000 Punkte").\n• Slots schalten sich der Reihe nach frei — Slot 2 erst, wenn Slot 1 abgeschlossen (oder übersprungen) ist.\n• Jeder Slot ist in mehreren Schwierigkeiten spielbar; höhere Schwierigkeiten geben mehr XP (bis zu 3× Multiplikator).\n• Der Bonus wächst mit der Anzahl geschaffter Slots: 5/5 am Tag gibt den vollen Bonus.\n\nDie Aufgaben beziehen sich auf deine eigene Bibliothek — die Auswahl passt sich also immer an deine Songs an.',
        },
        weeklyCard: {
          title: 'Wochen-Challenge',
          body: 'Das wöchentliche Gegenstück: 5 Slots über die Woche verteilt mit größeren XP-Belohnungen. Perfekt für langfristige Ziele.',
          details: 'Weekly-Challenges funktionieren wie die Daily-Challenges, aber:\n• Die 5 Slots laufen über 7 Tage — kein täglicher Reset, du kannst in Ruhe sammeln.\n• Die XP-Belohnungen pro Slot sind deutlich größer (z. B. 500–2000 XP statt 100–400).\n• Reset ist immer Montagfrüh.\n\nTipp: Daily und Weekly laufen parallel — wer beides spielt, levelt am schnellsten.',
        },
        modeLauncher: {
          title: 'Singen: Single, Duell & Duett',
          body: '🎤 Single: ein Spieler, ein Mikro.\n⚔️ Duell: zwei Spieler am GLEICHEN Song — wer mehr Punkte holt, gewinnt.\n🎭 Duett: zwei Stimmen auf zwei Spuren — die Library zeigt dir automatisch nur passende Duett-Songs.',
          details: 'Die drei Modi im Detail:\n• Single: Klassisches Karaoke — du singst alle Noten, dein Score landet in den Bestenlisten.\n• Duell: Beide Spieler singen dieselbe Note-Spur gleichzeitig. Punkte laufen getrennt — am Ende zeigt der Vergleich, wer besser war. Perfekt für Revanchen.\n• Duett: Der Song hat zwei getrennte Stimmen (P1/P2) — jeder singt „seine" Parts, gemeinsam gibt es Team-Bonus auf gemeinsame Phrasen. Duett-Songs erkennst du am 🎭-Filter in der Bibliothek.\n\nMikrofone: Du kannst beliebig viele Mikrofone oder Smartphones zuweisen (siehe Einstellungen → Mikrofon).',
        },
        libraryNav: {
          title: 'Die Bibliothek',
          body: 'Hier findest du alle Songs. Suche nach Titel oder Künstler — die fuzzy-Suche verzeiht sogar Tippfehler.',
          details: 'Such-Tipps:\n• Die fuzzy-Suche findet „Dancing Qun" → „Dancing Queen". Sie ignoriert Groß-/Kleinschreibung und einzelne Tippfehler.\n• Gesucht wird gleichzeitig in Titel, Künstler UND Genre — „Rock" findet also auch Songs mit Genre Rock.\n\nSortieren kannst du über das Dropdown (Titel A–Z, Künstler, zuletzt hinzugefügt). Songs kommen über Import, Ordner-Scan oder Playlists in die Bibliothek — der Weg dafür steht im Bibliothek-Tab der Einstellungen.',
        },
        filters: {
          title: 'Filter',
          body: 'Genre, Sprache, Jahr, Jahrzehnt, Duett-Songs und virale Hits — filtere die Bibliothek nach Lust und Laune.',
          details: 'Alle Filter lassen sich kombinieren — z. B. „Genre: Rock + Sprache: Deutsch + Ära: 80er" zeigt genau die deutschen Rock-Songs der 80er.\n\nBesondere Filter:\n• Duett: zeigt nur Songs mit zwei Stimmen-Spuren.\n• Viral-Hits: Songs, die aktuell in den Viral-Charts stehen (Daten aus den Einstellungen → Viral Charts).\n• Eigene Genres & Sprachen: Im Tab „Genres & Sprachen" der Einstellungen legst du eigene Kategorien an — sie erscheinen sofort hier in den Filtern.\n\n„Filter zurücksetzen" (✕) leert alles auf einen Schlag.',
        },
        songCard: {
          title: 'Songs',
          body: 'Ein Klick auf eine Song-Karte öffnet den Start-Dialog: Modus, Spieler, Mikrofone und Schwierigkeit.',
          details: 'Auf jeder Song-Karte siehst du:\n• Cover und Titel/Künstler\n• Schwierigkeit (easy/medium/hard/expert) und Sterne-Bewertung\n• Die wichtigsten Metadaten wie Genre und Sprache — direkt aus dem Song oder per KI harmonisiert (Editor → Metadata Studio).\n\nDas Vorspiel-Symbol startet eine Kurzvorschau, ohne den Start-Dialog zu öffnen.',
        },
        startModal: {
          title: 'Der Start-Dialog',
          body: 'Hier stellst du alles ein: Modus (Single/Duell/Duett), wer mitsingt, welches Mikro jeder bekommt und die Schwierigkeit.\n\nDann: „Start" — und ab geht die Luzi!',
          details: 'Die wichtigsten Optionen:\n• Modus: Single, Duell (2 Spieler, gleiche Spur) oder Duett (2 Stimmen) — im Duett-Modus wählen beide Spieler ihre Stimme (P1/P2).\n• Mikrofone: Jedem Spieler lässt sich ein eigenes Eingabegerät zuweisen — oder ein Smartphone als Mikro (Companion-App).\n• Schwierigkeit: Beeinflusst die Wertung — härtere Schwierigkeiten verzeihen weniger und belohnen Präzision (höhere Score-Potenziale, mehr XP).\n• „In Warteschlange" statt „Start": reiht den Song hinten in die Queue ein statt sofort zu starten — ideal, wenn mehrere Leute singen wollen.',
        },
        partyCard: {
          title: 'Party-Modi',
          body: '9 Spiele für 2–24 Spieler: Battle Royal, Pass-the-Mic, Medley-Wettbewerb, Turnier, Fehlende Wörter, Blind-Karaoke und mehr — inklusive Handy-Anbindung als Mikro.',
          details: 'Die 9 Modi im Überblick:\n• Battle Royal: Alle singen, pro Runde scheidet der Schwächste aus — Last Man Standing.\n• Pass-the-Mic: Das Mikro wandert im Takt von Spieler zu Spieler — jeder singt seinen Part.\n• Medley-Wettbewerb: Teams singen sich durch kurze Song-Ausschnitte mit Spezial-Regeln.\n• Turnier: K.-o.-Baum mit Duellen — der Sieger steigt jede Runde auf.\n• Fehlende Wörter: Textstellen werden ausgeblitzt — wer das fehlende Wort singt, punktet.\n• Blind-Karaoke: Keine Noten-Anzeige, nur Gehör!\n• Rate meinen Song & Companion-Singalong und mehr — schau in die Modus-Karten, jede erklärt sich selbst.\n\nFast alle Modi unterstützen die Companion-App als Mikro und Steuerung.',
        },
        partyModes: {
          title: 'Die Modi-Auswahl',
          body: 'Hier wählt ihr den Party-Modus: Battle Royal (Last Man Standing), Pass-the-Mic (Mikro-Weitergabe), Turnier (K.-o.-Baum), Medley und mehr.\n\nJede Karte zeigt, was dich erwartet — ein Klick startet die Spielerauswahl.',
          details: 'Nach dem Klick auf eine Modus-Karte folgt die Spielerauswahl: Ihr wählt Profile aus (oder verbindet Companion-Geräte), legt ggf. Team-Größen, Rundenanzahl oder Zeitlimits fest — je nach Modus.\n\nMotto-Party-Tipp: Wenn in den Einstellungen ein Motto aktiv ist (z. B. „80er Jahre Party"), greift jede Song-Auswahl im Party-Modus automatisch nur noch auf passende Songs zu — so bleibt die Party im Thema.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke ohne Wettkampf: Playlists bauen, Songs einreihen, Vorlieben teilen. Ideal als Hintergrund-Entertainer.',
          details: 'Die Jukebox ist der entspannte Modus:\n• Wähle Playlists oder einzelne Songs als Pool.\n• Optional mit Video-Pausen dazwischen, damit die Stimmung nie abreißt.\n• Kein Scoring, keine Mikrofone nötig — die Songs laufen einfach mit Lyrics durch.\n\nPerfekt für Feiern als Dauerbeschallung oder zum Warmwerden vor der ersten Runde.',
        },
        jukeboxView: {
          title: 'Im Jukebox-Menü',
          body: 'Über „Playlists ansehen" greifst du direkt auf alle gespeicherten Playlists zu — auch die, die du in der Bibliothek erstellt hast. Ein Klick reiht sie komplett in die Warteschlange ein.',
          details: 'In den Playlist-Einstellungen der Jukebox stellst du ein:\n• Ob Videos angezeigt werden (falls die Songs welche haben)\n• Der Video-Break-Modus: Pausen-Videos zwischen Songs, z. B. für Ansagen\n• Ob der Pool gemischt wird oder in fester Reihenfolge läuft\n\nGestartet wird im Vollbild — beenden mit Escape oder dem Stopp-Button oben.',
        },
        highscoreCard: {
          title: 'Bestenlisten',
          body: 'Highscores pro Song und Schwierigkeit — schlage deine Freunde (oder dich selbst).',
          details: 'Die Bestenlisten merken sich pro Song und Schwierigkeit:\n• Punkte, Genauigkeit, goldene Noten und Datum\n• Welcher Spieler den Eintrag erzielt hat (Profil-Avatar)\n• Ob der Eintrag über die Companion-App (Handy-Symbol) oder am Desktop entstanden ist\n\nMit aktiviertem Online-Modus (Profil-Screen) siehst du zusätzlich globale Bestenlisten und trittst gegen Spieler anderer Installationen an.',
        },
        highscoreView: {
          title: 'Die Bestenlisten',
          body: 'Gefiltert nach Song und Schwierigkeit — inklusive Filterleiste oben. Die Handy-Symbole zeigen die Companion-App-Nutzung an.',
          details: 'Die Filterleiste oben erlaubt:\n• Suche nach Song oder Spieler\n• Filter nach Schwierigkeit\n• Umschaltung lokal/global (wenn Online aktiviert ist)\n\nAnti-Cheat: Jeder Highscore-Eintrag trägt einen Song-Fingerprint — manipulierte Ergebnisse werden erkannt und markiert.',
        },
        settingsCard: {
          title: 'Einstellungen',
          body: 'Mikrofone, Sprache, Gameplay-Feintuning, Darstellung und Grafik — alles Feinjustieren passiert hier.',
          details: 'Die 12 Tabs der Einstellungen im Schnelldurchlauf:\n• Allgemein: Sprache, Standard-Schwierigkeit, Online\n• Gameplay: Scoring, Partikel, Autoplay der Queue\n• Darstellung: Themes, Lyrics-Stil, Hintergrund\n• Grafik & Sound: Ausgabegerät, Lautstärke, YouTube-Qualität\n• Mikrofon: Geräte, Empfindlichkeit, Noise-Gate, Presets\n• Mobile: Companion-Geräte verbinden & verwalten\n• Webcam: Webcam als Hintergrund\n• Bibliothek: Songs-Ordner, Import, Reset\n• Genres & Sprachen: eigene Kategorien\n• Motto-Party: Motto aktivieren & konfigurieren\n• Sync & Backup: Sicherungen\n\nFür alle Tabs gibt es eine eigene, ausführliche Settings-Tour im ?-Hilfemenü.',
        },
        settingsView: {
          title: 'Die Einstellungs-Reiter',
          body: 'Oben wählt du den Bereich: Allgemein (Sprache), Gameplay, Darstellung, Grafik & Sound, Mikrofon, Mobil (Handy-Anbindung) und mehr.',
          details: 'Seit R28 erklärt ein kurzer Einleitungstext oben in jedem Tab, wozu er dient — du brauchst also nie raten, wo eine Option wohin gehört.\n\nDie wichtigste Tour dazu: „Einstellungen" im ?-Hilfemenü führt Tab für Tab durch alles.',
        },
        finish: {
          title: 'Geschafft! 🎉',
          body: 'Du kennst jetzt die Grundlagen.\n\nTipp: Das ?-Symbol in der Menüleiste bringt dich jederzeit zurück — auch zu einzelnen Themen-Kapiteln, zur Editor-Tour oder zur Settings-Tour.',
          details: 'Was nun? Ein paar Vorschläge für die ersten Minuten:\n1. Profil anlegen (Profile in der Menüleiste) — sonst vergisst die App deinen Fortschritt nicht, aber du sammelst kein XP.\n2. Songs importieren (Einstellungen → Bibliothek).\n3. Ein paar Runden Daily-Challenge für den XP-Boost.\n4. Wenn Freunde da sind: Party-Modus ausprobieren — die Companion-App macht jedes Handy zum Mikro (dazu gibt es die eigene Companion-Tour).',
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
          details: 'Der Editor arbeitet mit dem UltraStar-Format: Jede Note hat eine Startzeit, eine Dauer, eine Tonhöhe und einen Text (Silbe). Aus vielen Noten entsteht die Note-Highway genannte Singbahn, die du im Spiel siehst.\n\nQuellen für neue Songs:\n• Text-Import (UltraStar/TXT) im Editor\n• MIDI-Import (Noten automatisch aus MIDI)\n• KI-Harmonize: Lyrics + Audio → Notenvorschlag\n\nAlles ist nicht-destruktiv: Solange du nicht speicherst, bleibt der Original-Song unangetastet.',
        },
        songList: {
          title: 'Song-Auswahl',
          body: 'Suche einen Song, um ihn zu öffnen. Filter zeigen Songs mit fehlenden Metadaten — die harmonisiert der Editor später.',
          details: 'Die Filter-Chips über der Liste zeigenSongs ohne Genre/Sprache/Jahr. Das ist der schnellste Weg zu Songs, die das Metadata Studio noch nicht bearbeitet hat.\n\nDie Suche durchsucht Titel und Künstler — Groß-/Kleinschreibung egal.',
        },
        noSongs: {
          title: 'Keine Songs vorhanden',
          body: 'Der Editor braucht Songs in der Bibliothek. Importiere zuerst Songs (Bibliothek → Import bzw. Ordner-Scan) und komm dann wieder.',
          details: 'So kommst du an Songs:\n• Einstellungen → Bibliothek → Songs-Ordner festlegen: Jeder Unterordner wird als ein Song eingelesen (Audio/Video + UltraStar-Text).\n• Alternativ einzelne Dateien per Import-Dialog.\n• Oder im Editor einen neuen Song anlegen („Neuer Song") und Lyrics + Audio selbst zusammenbringen.',
        },
        openSong: {
          title: 'Song öffnen',
          body: 'Klicke jetzt auf einen Song in der Liste, um ihn im Editor zu öffnen.',
          details: 'Nach dem Öffnen siehst du oben die Werkzeugleiste (Sub-Header) und die Timeline mit Waveform, Noten-Bahnen und Lyrics.\n\nDer Song bleibt geöffnet, bis du ihn über „Zurück" schließt — ungespeicherte Änderungen fragen vorher nach.',
        },
        leftPanel: {
          title: 'Werkzeugleiste',
          body: 'Alles für Noten: Hinzufügen, Duplizieren, Löschen, Teilen, Verschmelzen — dazu Notentypen, Stimmen und der Tap-Modus (kommt gleich).',
          details: 'Die Werkzeuge der Reihe nach:\n• ➕ Note hinzufügen: platziert am Abspielzeiger\n• ⧉ Duplizieren: kopiert die markierte Note direkt dahinter\n• 🗑 Löschen: entfernt die Markierung\n• ✂ Teilen: eine Note → zwei (an der Mitte)\n• ⇄ Verschmelzen: zwei markierte → eine\n\nMarkieren tust du per Klick; mit Shift-Klick mehrere. Danach gelten die Tastaturaktionen: ⌫ löschen, ↑/↓ transponieren, ←/→ verschieben.',
        },
        lyricsPanel: {
          title: 'Lyrics-Panel',
          body: 'Links stehen die Lyrics-Zeilen. Doppelklick auf eine Zeile springt mit der Wiedergabe genau dorthin — Text und Timing lassen sich hier bearbeiten.',
          details: 'Das Lyrics-Panel ist Text UND Timing in einem:\n• Klick auf eine Silbe markiert die zugehörige Note in der Timeline.\n• Doppelklick springt zur Stelle (Wiedergabe springt mit).\n• Rechtsklick (oder Stift-Symbol) öffnet die Zeilen-Bearbeitung: Text ändern, Silben per Wortgrenze trennen, Timing der ganzen Zeile verschieben.\n\nDie Wortgrenzen-Trennung (R-für die Silben) nutzt Spracherkennung, um Silben sinnvoll auf Wörter zu verteilen — musst du also nicht mehr per Hand.',
        },
        subHeaderTools: {
          title: 'Noten bearbeiten',
          body: 'Noten sind die Blöcke auf den Tonhöhen-Bahnen: Hinzufügen, Duplizieren, Löschen, Teilen (eine Note → zwei) und Verschmelzen (zwei → eine).\n\nMarkierte Noten bearbeitest du im Takt: ⌫ löscht, ↑/↓ transponiert.',
          details: 'Präzisions-Tipps:\n• Zoomen: Strg+Mausrad über der Timeline — für feines Timing heranzoomen.\n• Vorspulen: Leertaste startet/pausiert die Wiedergabe, Shift+Leertaste spielt nur die Auswahl.\n• Mehrere Noten transponieren: alle markieren, ↑/↓ bewegt das ganze Bündel.\n\nFür das Timing gilt: Der Notenanfang muss auf den Silbenanfang im Gesang passen — die Waveform hilft beim Finden der Onsets.',
        },
        noteTypes: {
          title: 'Notentypen',
          body: '5 Typen für neue Noten:\n: Normal (Tonhöhe zählt)\n* Gold (Extrapunkte)\nF Freestyle (jeder Ton zählt)\nR Rap (nur Timing)\nG Rap-Gold',
          details: 'Was jeder Typ im Spiel bedeutet:\n• Normal (:): klassische Singnote — Tonhöhe und Timing zählen.\n• Golden (*): golden dargestellt, doppelte Punkte bei Treffern. Perfekt für Song-Highlights.\n• Freestyle (F): Tonhöhe egal, nur der Text/das Timing zählt — gut für gesprochene Passagen.\n• Rap (R): bewertet Timing und Rhythmus statt Melodie.\n• Rap-Gold (G): wie Rap, aber mit Extrapunkten.\n\nDer Typ lässt sich nachträglich ändern: Note markieren und den Typ in der Werkzeugleiste neu wählen.',
        },
        voices: {
          title: 'Stimmen',
          body: 'P1 = Spieler 1, P2 = Spieler 2 (Duett!), P4/P8 = dritte/vierte Stimme. Jede Note gehört zu einer Stimme — so entstehen Duett-Songs mit getrennten Parts.',
          details: 'Stimmen-Zuordnung:\n• Über das Stimmen-Dropdown wählst du, auf welche Spur neue Noten kommen.\n• Bereits platzierte Noten lassen sich umziehen: markieren und Stimme wechseln.\n• Im Duett-Modus im Spiel wählt jeder Spieler seine Spur — die Library filtert automatisch Songs mit mindestens 2 Stimmen.\n\nMit P4/P8 lassen sich sogar Quartett-Setupps bauen; die Haupt-Spielmodi nutzen P1/P2.',
        },
        tapMode: {
          title: 'Tap-Modus — der Turbo 🥁',
          body: 'Halte die Taste gedrückt und klopfe im Rhythmus: Jeder Klick platziert eine Note an der aktuellen Abspielposition, Textzeile für Textzeile. So erstellst du Noten in Echtzeit.',
          details: 'So läuft das Tap-Recording ab:\n1. Tap-Modus in der Werkzeugleiste aktivieren.\n2. Wiedergabe starten — der Song läuft jetzt mit hörbarem Ton.\n3. Im Rhythmus der Silben klicken/leertasten — jede Interaktion setzt eine Note an der Playhead-Position mit der zuletzt gewählten Tonhöhe.\n4. Danach Feinschliff: Tonhöhen korrigieren (↑/↓ auf markierte Noten) und Daueren justieren.\n\nDer Tap-Modus ist 5–10× schneller als Noten per Hand setzen — für ganze Songs in Minuten statt Stunden.',
        },
        panels: {
          title: 'Kopfzeilen-Panels',
          body: 'Drei Panels oben rechts: Metadaten (Genre/Sprache/Jahr), Audio-Analyse und der KI-Assistent.',
          details: 'Was die drei Panels können:\n• Metadaten: Genre, Sprache und Jahr des geöffneten Songs direkt bearbeiten — fließen in Filter und Motto-Party ein.\n• Audio-Analyse: analysiert die Tondatei (Loudness, Tonart, BPM) und schlägt Werte vor.\n• KI-Assistent: Lyrics-Vervollständigung, Song-Erkennung und Noten-Harmonisierung per KI — benötigt einen konfigurierten KI-Provider (Einstellungen → KI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Der Harmonize-Turbo: KI- und Regel-Vorschläge für Genre, Sprache und Jahr — mit Vorhören vor dem Zuweisen, manueller Feinbearbeitung und Review-Queue für unsichere Treffer.',
          details: 'Der Arbeitsablauf im Studio:\n1. „Alle Songs analysieren" — Regel-Engine (Dateipfade, Tags) und optional KI schlagen Genre/Sprache/Jahr vor.\n2. Vorschläge mit Konfidenz: grün = sicher, gelb = prüfen.\n3. Vorhören: Klick auf den Song spielt einen Ausschnitt — so verifizierst du Vorschläge am schnellen Weg.\n4. Zuweisen einzeln oder „Alle grünen übernehmen".\n\nDie Review-Queue sammelt unsichere Treffer für später — du verlierst nichts.',
        },
        shortcuts: {
          title: 'Shortcuts',
          body: 'Alle Tastenkürzel auf einen Blick — der Editor ist ein Tastatur-Instrument. Klick dich durch!',
          details: 'Die wichtigsten Shortcuts auf einen Blick:\n• Strg+Z / Strg+Y: Undo / Redo\n• Leertaste: Play/Pause\n• ⌫: markierte Noten löschen\n• ↑/↓: transponieren · ←/→: zeitlich verschieben\n• S: Note teilen · M: verschmelzen\n• 1–5: Notentyp wählen\n\nIm Shortcuts-Panel selbst kannst du Tastenbelegungen ansehen und anpassen.',
        },
        finish: {
          title: 'Bereit zum Bauen! 🛠️',
          body: 'Du kennst jetzt den Editor-Baukasten.\n\nDenk dran: Strg+Z rettet alles, und das ?-Symbol in der Menüleiste bringt dich jederzeit zu diesen Kapiteln zurück.',
          details: 'Empfohlene Reihenfolge für einen neuen Song:\n1. Audio/Video einbinden (Song-Info-Tab)\n2. Lyrics importieren oder tippen (Lyrics-Tab)\n3. Noten tappen (Tap-Modus) oder KI-Harmonize\n4. Metadaten pflegen (Genre/Sprache/Jahr — wichtig für Filter!)\n5. Speichern — ab sofort erscheint der Song in der Bibliothek.',
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
          details: 'Die Tabs in der Reihenfolge der Tour: Allgemein, Gameplay, Darstellung, Grafik & Sound, Mikrofon, Mobile (Companion), Webcam, Bibliothek, Genres & Sprachen, Motto-Party, Viral Charts, Sync & Backup und Über.\n\nJeder Tab hat oben eine kurze Einleitung — die Tour vertieft sie Schritt für Schritt.',
        },
        tabBar: {
          title: 'Die Tab-Leiste',
          body: 'Alle Einstellungen sind in Tabs gegliedert: Allgemein, Gameplay, Darstellung, Audio, Mikrofon, Mobile, Webcam, Bibliothek, Genres & Sprachen, Motto-Party, Sync & Backup und Über.\n\nSeit R28 erklärt ein kurzer Einleitungstext oben in jedem Tab, wozu er dient.',
          details: 'Orientierungshilfe: Wenn du etwas suchst, frag dich…\n• „Wie VERHÄLT sich das Spiel?" → Gameplay\n• „Wie SIEHT es aus?" → Darstellung\n• „Wie KLINGT es?" → Grafik & Sound / Mikrofon\n• „Geräte anschließen?" → Mobile (Companion) / Mikrofon\n• „Meine Songs?" → Bibliothek\n• „Daten sichern?" → Sync & Backup\n\nDie Tabs scrollen bei schmalen Fenstern horizontal — einfach nach rechts wischen.',
        },
        general: {
          title: 'Allgemein',
          body: 'Sprache der Oberfläche, Standard-Schwierigkeit, Online-Aktivitäten und die komplette Tastaturkürzel-Übersicht.',
          details: 'Sprache: 16 Sprachen stehen bereit (Deutsch, Englisch, Spanisch …). Die Umschaltung wirkt sofort und live auf die gesamte Oberfläche.\n\nStandard-Schwierigkeit: gilt für neue Runden, solange im Start-Dialog nichts anderes gewählt wird.\n\nOnline-Aktivitäten steuern, ob Highscores global hochgeladen und Daily-Challenges online generiert werden.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Scoring an/aus, Partikel-Effekte, Autoplay der Queue und weitere Verhaltens-Schalter für Runden und Ergebnisse.',
          details: 'Die wichtigsten Schalter:\n• Scoring: für reines „Spaß-Singen" ohne Punkteanzeige.\n• Autoplay der Queue: springt nach Songende automatisch zum nächsten Eintrag der Warteschlange — ideal für Party-Abende ohne Moderation.\n• Partikel & Effekte: auf schwächeren Rechnern abschaltbar.\n\nZusätzlich: Verhalten nach Runden (Ergebnis-Screen, Sofort-Neustart) und Kombo-Anzeigen.',
        },
        appearance: {
          title: 'Darstellung',
          body: 'Themes, animierter Hintergrund oder eigenes Hintergrundvideo, Lyrics-Stil und -Größe, Noten-Anzeige und der Performance-Modus für schwächere Rechner.',
          details: 'Lyrics-Stil: „Karaoke" (Füllwort-Färbung), „UltraStar" (Silbenblöcke) oder „Minimal".\n\nHintergrund: neben den Themes geht auch ein eigenes Video — im Spiel läuft es dann hinter den Noten, gedimmt.\n\nPerformance-Modus reduziert Animationen und Hintergründe drastisch — lohnt sich ab ~2015er-Hardware.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Ausgabegerät (inkl. ASIO), Master- und Preview-Lautstärke, Mikrofon-Empfindlichkeit, Loudness-Normalisierung und YouTube-Videoqualität.',
          details: 'ASIO: nur relevant für Windows + ASIO-fähige Soundkarten — reduziert Latenz beim Mikrofon-Monitoring.\n\nLoudness-Normalisierung gleicht die Lautstärke unterschiedlicher Songs an — die Standardwerte sind gut gewählt.\n\nYouTube-Qualität: betrifft Songs mit YouTube-Videoquelle; höhere Qualität = mehr Bandbreite.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Geräteauswahl, Empfindlichkeit, Noise-Gate und Live-Pegel — plus Presets. Smartphones bindest du über den Mobile-Tab ein.',
          details: 'Presets: typische Setups („Dynamisches Gesangsmikro", „Headset", „Handy") setzen Empfindlichkeit + Noise-Gate in sinnvollen Kombinationen.\n\nNoise-Gate: filtert Atmer und Raumgeräusche — der Live-Pegel zeigt in Echtzeit, was durchkommt.\n\nWichtig für Mehrspieler: JEDER Spieler kann sein EIGENES Gerät bekommen — die Zuweisung passiert im Start-Dialog pro Runde.',
        },
        libraryTab: {
          title: 'Bibliothek',
          body: 'Songs-Ordner festlegen (jeder Unterordner = ein Song) und einlesen, Bibliothek zurücksetzen oder alle Daten löschen — plus der Import aus anderen Karaoke-Systemen.',
          details: 'Ordner-Format: Pro Song ein Unterordner mit Audio/Video + TXT (UltraStar-Format). Der Scanner erkennt gängige Kombis (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport aus anderen Systemen: SingStar-Archiv? UltraStar-Sammlung? Der Import-Konverter übernimmt Metadaten und Lyrics automatisch.\n\nAchtung bei „Alle Daten löschen": Der_DOUBLE-Schutz fragt zweimal nach — trotzdem vorher ein Backup machen (Sync & Backup-Tab).',
        },
        taxonomy: {
          title: 'Genres & Sprachen',
          body: 'Eigene Genre- und Sprach-Einträge anlegen — sie erscheinen in allen Auswahllisten und fließen in die KI-Harmonisierung ein.',
          details: 'Warum eigene Einträge? Standard-Listen decken nicht alles ab („Schlager", „K-Pop", „Mundart" …). Eigene Einträge:\n• erscheinen sofort in den Bibliotheks-Filtern\n• stehen im Editor und Metadata Studio zur Auswahl\n• harmonisieren mit (die KI schlägt sie bei passenden Songs vor)\n\nLöschen geht auch — Songs behalten den Eintrag, bis er neu zugewiesen wird.',
        },
        motto: {
          title: 'Motto-Party',
          body: 'Stelle das ganze Spiel auf ein Motto ein (z. B. „80er Jahre Party"): Bei aktivem Motto ersetzt es alle Suchfelder und Filter — jede Song-Auswahl greift nur noch auf passende Songs zu.',
          details: 'Der Motto-Filter kennt mehrere Felder, beliebig kombinierbar (UND-Verknüpfung):\n• Genre (z. B. Rock)\n• Sprache (z. B. Deutsch)\n• Ära/Jahr (z. B. 1980–1989)\n\nWirkung: Bibliothek, Party-Song-Auswahl UND Companion-App zeigen nur noch den Motto-Pool — die Gäste können also gar nichts Falsches auswählen.\n\nBei inaktiven Motto kehrt alles sofort zur normalen Ansicht zurück; gespielte Songs/Highscores bleiben unberührt.',
        },
        mobile: {
          title: 'Mobile & Companion',
          body: 'Smartphones per QR-Code verbinden — als Mikrofon, Fernbedienung oder Mitsing-Gerät. Du siehst alle verbundenen Geräte und ihre Verbindungscodes.',
          details: 'Verbindung: QR-Code scannen (gleiche WLAN!) oder URL eintippen — Details erklärt die eigene Companion-Tour im ?-Hilfemenü.\n\nDieser Tab zeigt außerdem:\n• Alle verbundenen Geräte mit Status (aktiv, Rolle, letzte Aktivität)\n• Zuweisung von Profilen an Geräte\n• Trennen einzelner Geräte\n\nDie QR-Codes pro Profil (zum Claiming) findest du im Profil-Screen im Einstellungen-Karteifeld.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Webcam als animierten Song-Hintergrund nutzen: Auflösung, Spiegelung, Sättigung, Blur und weitere Effekte — mit Live-Vorschau.',
          details: 'Der Webcam-Hintergrund läuft während des Songs hinter den Noten — ihr seht euch selbst singen!\n\nEffekte: Spiegelung (wie im Selfie), Sättigung, Weichzeichner, Sepia — in der Live-Vorschau sofort sichtbar.\n\nDatenschutz: Die Kamera läuft nur lokal, nichts wird gespeichert oder gesendet.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Sicherungen erstellen und wiederherstellen, Daten zwischen Geräten synchronisieren. Im Desktop-Build werden Spielerdaten zusätzlich dauerhaft im AppData-Ordner gespiegelt.',
          details: 'Backup enthält: Profile (mit XP/Fortschritt), Highscores, Einstellungen und Playlist-Definitionen — als eine Datei zum Archivieren oder Umziehen.\n\nDer AppData-Spiegel (Desktop-Build) schützt vor Browser-Datenverlust: Selbst wenn der Browser-Speicher geleert wird, stellt der Desktop-Build alles wieder her.\n\nWiederherstellen überschreibt aktuelle Daten — wieder gilt: vorher sichern.',
        },
        about: {
          title: 'Über',
          body: 'Version, Plattform, Lizenzen und mitwirkende Projekte — das digitale Impressum von Karaoke ZERO.',
          details: 'Hier siehst du auch den Build-Kanal (Web/Desktop) und kannst nach Updates suchen. Die Lizenzen liste die verwendeten Open-Source-Projekte — danke an alle Beteiligten!',
        },
        finish: {
          title: 'Fertig konfiguriert! ⚙️',
          body: 'Du kennst jetzt alle Einstellungen.\n\nDas ?-Symbol in der Menüleiste bringt dich jederzeit zu dieser Tour zurück — auch kapitelweise.',
          details: 'Empfehlung für den ersten Einrichtungs-Abend:\n1. Bibliothek-Tab: Songs-Ordner scannen\n2. Mikrofon-Tab: Preset wählen + Live-Pegel prüfen\n3. Mobile-Tab: Handys verbinden (Companion-Tour!)\n4. Motto-Tab: wennParty-Motto überlegen\n5. Sync & Backup: erstes Backup ziehen\n\nDamit steht der Karaoke-Abend.',
        },
      },
    },

    // ═══ Profil-Tour (R29) ═══
    profile: {
      title: 'Profile & Charaktere',
      desc: 'Spieler anlegen, XP & Fortschritt tracken, Online-Sync und Companion-Claiming.',
      chapters: {
        overview: 'Überblick',
        characters: 'Charaktere & Fortschritt',
        online: 'Online & Companion',
      },
      steps: {
        welcome: {
          title: 'Deine Spieler-Profile 👤',
          body: 'Profile sind die Identitäten im Spiel: XP, Level, Statistiken und Erfolge hängen am Profil — und Highscores tragen euren Namen.\n\nDiese Tour zeigt, wie du Profile anlegst und verwaltest.',
          details: 'Warum Profile?\n• XP & Level: Gesungene Songs, Challenges und Erfolge sammeln Erfahrungspunkte — das Level steigt, der Rang-Titel mit (Anfänger → Karaoke-Legende).\n• Bestenlisten: Highscore-Einträge zeigen euren Avatars.\n• Party-Modi: Alle Spielerauswahl kommt aus dieser Liste.\n• Companion-Geräte können ein Profil „claimen" und singen dann mit dessen Identität.\n\nProfile leben im Browser-Speicher (lokal) oder im Online-Konto (sync) — das wählst du beim Anlegen.',
        },
        topBar: {
          title: 'Die Aktionsleiste',
          body: 'Oben schaltest du Online-Bestenlisten ein, wählst lokal/global und öffnest das Anlege-Formular für neue Profile.',
          details: 'Die Elemente der Leiste:\n• Online-Schalter: aktiviert/deaktiviert Online-Funktionen global (Bestenlisten, Account-Registrierung)\n• Lokal/Global: welche Bestenliste die Highscore-Ansicht zeigt\n• „Profil laden": meldet euch mit Sync-Code an und holt euer Online-Profil auf dieses Gerät\n• „Neues Profil": öffnet das Anlege-Formular (nächster Schritt)',
        },
        createButton: {
          title: 'Profil anlegen',
          body: '„Neues Profil" öffnet das Formular: Name, Avatar-Bild, Land und Speicher-Modus (lokal oder mit Online-Konto).',
          details: 'Die Formular-Felder:\n• Name: erscheint in Bestenlisten und Partys\n• Avatar: eigenes Bild hochladen oder Initialen-Farbton\n• Land: Flagge für globale Bestenlisten\n• Speicher-Modus: „Lokal" speichert nur auf diesem Gerät; „Online" registriert optional einen Account (E-Mail + Passwort) und erlaubt Sync über Geräte hinweg.\n\nOnline-Accounts gibt es nur bei aktiviertem Online-Modus — die Registrierung läuft im Hintergrund, das Profil ist sofort nutzbar.',
        },
        empty: {
          title: 'Noch keine Profile',
          body: 'Hier entstehen deine Spieler. Klicke auf „Neues Profil" und lege den ersten Charakter an — ohne Profil läuft zwar alles, aber XP und Erfolge sammeln sich nicht.',
        },
        cards: {
          title: 'Die Charakterkarten',
          body: 'Jede Karte zeigt Avatar, Level, Rang und Speicher-Modus. Klick wählt das Profil aus und zeigt die Details darunter.\n\nDer Punkt oben rechts: grün = aktiv, rot = deaktiviert.',
          details: 'Karten-Symbole:\n• ✓-Blase: das aktuell aktive Profil (Start-Dialog merkt es sich)\n• Rang-Icon + „Lv. X": Fortschritt des Profils\n• 💾/🌐-Badge: lokal oder online gespeichert\n• 📱-Badge: dieses Profil ist von einem Companion-Gerät belegt\n• Flagge: gewähltes Land\n\nKarte anklicken = auswählen. Deaktivieren (rot) kannst du Profile in der Fortschritts-Karte — deaktivierte erscheinen nicht mehr in Spielerauswahlen, behalten aber alle Daten.',
        },
        progression: {
          title: 'Fortschritts-Karte',
          body: 'XP-Balken bis zum nächsten Level, dazu die Kern-Statistiken: gesungene Songs, goldene Noten, beste Combo und Gesamtpunkte.\n\nDer Aktiv-Schalter rechts deaktiviert das Profil temporär.',
          details: 'Die Statistiken verstehen:\n• Songs gespielt: jede beendete Runde zählt\n• Goldene Noten: je Song gesammelt — zeigt, wie präzise du Highlights triffst\n• Beste Combo: längste fehlerfreie Serie aller Zeiten\n• Gesamtpunkte: Summe aller Scores\n\nDer Aktiv-Schalter: deaktivierte Profile verschwinden aus Spielerauswahl und Queue (Duell/Duett-Songs fragen dann nach Neu-Auswahl), verlieren aber NICHTS — reaktivieren genügt.',
        },
        settingsCard: {
          title: 'Profil-Einstellungen',
          body: 'Name & Avatar bearbeiten, Land wechseln, Privatsphäre-Optionen — und der Profil-QR-Code, mit dem ein Handy dieses Profil claimed.',
          details: 'Privatsphäre: steuert, welche Statistiken auf globalen Bestenlisten sichtbar sind.\n\nQR-Code anzeigen: erzeugt einen Code, der DIREKT auf dieses Profil zeigt — das Handy, das ihn scannt, verbindet sich als dieses Profil (ideal: jedem Sänger sein Handy mit seinem Profil).\n\nLöschen entfernt das Profil endgültig — Highscores bleiben als anonyme Einträge bestehen. Bei Online-Profilen fragt die App vor dem Löschen zusätzlich nach.',
        },
        onlineToggle: {
          title: 'Online-Bestenlisten',
          body: 'Der Schalter aktiviert Online-Funktionen: globale Highscores, Account-Registrierung und Profil-Sync zwischen Geräten.',
          details: 'Aus = komplett offline: alles bleibt lokal, keine Netzwerk-Anfragen für Bestenlisten.\n\nAn = du siehst in den Bestenlisten den Tab „Global" und kannst Online-Profile anlegen/laden.\n\nDie Umschaltung wirkt sofort — bereits gesammelte lokale Highscores bleiben jederzeit erhalten.',
        },
        loginButton: {
          title: 'Profil laden',
          body: 'Bereits registriert? „Profil laden" holt dein Online-Profil per E-Mail/Sync-Code auf dieses Gerät — Fortschritt und Highscores kommen mit.',
          details: 'Der Login-Dialog kennt zwei Wege:\n• E-Mail + Passwort (wie bei der Registrierung)\n• Sync-Code: der kurze Code aus deinem Profil — einfacher am fremden Rechner\n\nNach dem Login verschmilzt das geladene Profil mit dem lokalen (höherer Fortschritt gewinnt). Abgleiche laufen danach automatisch im Hintergrund.',
        },
        companionClaim: {
          title: 'Companion-Claiming 📱',
          body: 'Verbindet sich ein Handy mit einem Profil, zeigt die Karte ein 📱. Das Handy singt und wählt dann unter diesem Profil — Namen, XP und Erfolge laufen dort mit.',
          details: 'Claiming einrichten (3 Wege):\n1. QR-Code in den Profil-Einstellungen scannen — verbindet DIREKT mit diesem Profil\n2. Auf dem Handy nach dem Verbinden ein Profil aus der Liste wählen\n3. Hier im Mobile-Tab der Einstellungen: Gerät → Profil zuweisen\n\nEin Profil kann nur von EINEM Gerät gleichzeitig geclaimt sein. Trennen: im Mobile-Tab oder indem das Handy selbst trennt.',
        },
        finish: {
          title: 'Team komplett! 🎭',
          body: 'Du weißt jetzt, wie Profile funktionieren — von XP über Online-Sync bis zum Handy-Claiming.\n\nWeiter geht\'s mit den Erfolgen: Die „Erfolge & Fortschritt"-Tour zeigt, was dein Profil alles sammeln kann.',
        },
      },
    },

    // ═══ Warteschlangen-Tour (R29) ═══
    queue: {
      title: 'Warteschlange',
      desc: 'Songs einreihen, sortieren, Regeln & Companion-Wünsche.',
      chapters: {
        overview: 'Überblick',
        manage: 'Verwalten',
        companion: 'Companion & Autoplay',
      },
      steps: {
        welcome: {
          title: 'Die Warteschlange 🎶',
          body: 'Die Queue organisiert euren Karaoke-Abend: Songs reihen sich ein, jeder kommt dran — ohne dass jemand am Rechner spielt.\n\nDiese Tour zeigt Einreihen, Sortieren und die Regeln.',
          details: 'Drei Wege, Songs einzureihen:\n1. Bibliothek → Song anklicken → im Start-Dialog „In Warteschlange" statt „Start"\n2. Nach einem Song: „Nächsten Song spielen" im Ergebnis-Screen reiht nahtlos weiter\n3. Über die Companion-App: Gäste reihen von ihren Handys aus ein (dafür gibt es 📱-Badges)\n\nDie Navigationsleiste zeigt die Queue-Länge als Zähler-Button — so seht ihr den Abend kommen.',
        },
        navButton: {
          title: 'Der Queue-Button',
          body: 'In der Menüleiste führt „Warteschlange" hierher — die Zahl am Button zeigt, wie viele Songs gerade anstehen.',
        },
        title: {
          title: 'Die Song-Warteschlange',
          body: 'Die Liste zeigt alle anstehenden Songs mit Position, Modus (Solo/Duell/Duett) und Spielern — sortiert nach Einreihzeit.',
        },
        empty: {
          title: 'Noch leer',
          body: 'Noch keine Songs in der Warteschlange. Füge welche aus der Bibliothek hinzu (Start-Dialog → „In Warteschlange") — oder lass Gäste über die Companion-App einreihen.',
        },
        list: {
          title: 'Die Queue-Liste',
          body: 'Jede Karte: Position, Song, Modus-Badge und die Spieler. Ein Klick auf die Karte startet den Song sofort — auch außer der Reihe.',
          details: 'Die Badges:\n• 🎤 Solo / ⚔️ Duell / 🎭 Duett — der Modus, mit dem der Song eingereiht wurde\n• 📱 — über die Companion-App hinzugefügt\n\nKarte anklicken = sofort spielen. Die ✕-Taste rechts entfernt den Eintrag, ▶ startet direkt.\n\nTastatur: Enter spielt, Entfernen löscht, ↑/↓ bewegt dich durch die Liste.',
        },
        reorder: {
          title: 'Reihenfolge ändern',
          body: 'Ziehe Karten per Drag & Drop an ihre neue Position — nur lokale Einträge lassen sich verschieben, Companion-Wünsche behalten ihre Reihenfolge.',
          details: 'Drag & Drop: Karte anfassen und bei gedrückter Maustaste nach oben/unten ziehen. Die Liste zeigt die Ablageposition live.\n\nWarum Companion-Einträge fix sind: Die Gäste-App sortiert nach Einreichzeit — würde der Host umpolen, wirken die Wünsche manipuliert. Entfernen könnt ihr sie trotzdem.',
        },
        playNext: {
          title: 'Nächsten Song spielen',
          body: 'Der Button startet den obersten Eintrag — das Standard-Vorgehen zwischen zwei Runden. Alternativ klickst du jede Karte direkt an.',
          details: 'Der Ergebnis-Screen nach jedem Song bietet denselben Button („Nächsten Song spielen") — so bleibt der Fluss ohne Umweg über die Queue-Ansicht.\n\nMit aktiviertem Autoplay (Einstellungen → Gameplay) übernimmt die App das Weiterwechseln ganz automatisch.',
        },
        clearAll: {
          title: 'Alles löschen',
          body: '„Alle löschen" leert die komplette Warteschlange — auch die Companion-Einträge. Es gibt keinen Rückweg, also mit Bedacht.',
        },
        rules: {
          title: 'Die Regeln',
          body: 'Unten steht das offizielle Regelwerk: max. 3 Songs pro Spieler, FIFO-Reihenfolge, eigene Songs entfernen, Charakter vorher wählen …',
          details: 'Die Regeln im Detail:\n• Max. 3 Songs pro Spieler gleichzeitig — niemand kann die Queue blockieren. Wer dran war, darf wieder einreihen.\n• FIFO: zuerst eingereiht = zuerst dran. Drag & Drop sortiert lokal um.\n• Eigene Songs jederzeit entfernbar; fremde nur per „Alle löschen" oder als Host.\n• Charakter vorher wählen: Die Queue braucht aktive Profile für Duell/Duett, sonst fragt sie beim Start nach Neu-Auswahl.\n• Companion-Wünsche erscheinen mit 📱-Badge und werden wie eigene behandelt.',
        },
        companionAdd: {
          title: 'Wünsche vom Handy 📱',
          body: 'Gäste reihen über die Companion-App Songs ein — sie erscheinen mit 📱-Badge in der Liste und zählen für deren 3-Song-Limit.',
          details: 'So sieht es für Gäste aus: In der App Song aussuchen, Modus wählen, abschicken — der Wunsch landet in dieser Liste.\n\nIhr als Host seht sofort: wer gewünscht hat (Spieler-Avatar) und dass es ein Handy-Wunsch ist (📱). Das 3er-Limit gilt pro Profil — auch übers Handy.\n\nMehr dazu in der Companion-Tour.',
        },
        autoplay: {
          title: 'Autoplay & Tastenkürzel',
          body: 'Aktiviere Autoplay (Einstellungen → Gameplay), damit nach jedem Song automatisch der nächste startet. Und: Strg+Q startet jederzeit den obersten Queue-Eintrag.',
          details: 'Autoplay-Kette: Song endet → Ergebnis wird kurz gezeigt → nächster Queue-Eintrag startet. Läuft die Queue leer, stoppt die Kette sauber.\n\nStrg+Q funktioniert von überall — der Klassiker, wenn die nächste Runde sofort weitergehen soll.',
        },
        finish: {
          title: 'Die Queue wartet! 🎧',
          body: 'Du kennst jetzt Einreihen, Sortieren und die Regeln.\n\nTipp: Kombiniere Autoplay + Companion-Wünsche für einen komplett selbstlaufenden Karaoke-Abend.',
        },
      },
    },

    // ═══ Chat-Tour (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Panel öffnen, Nachrichten senden, „Senden als"-Auswahl & Song-Herausforderungen.',
      chapters: {
        basics: 'Chat öffnen',
        usage: 'Nachrichten senden',
        challenges: 'Herausforderungen',
      },
      steps: {
        welcome: {
          title: 'Der Party-Chat 💬',
          body: 'Der Chat verbindet Desktop und Companion-Apps: Ihr könnt euch austauschen, ohne das Singen zu unterbrechen — und euch sogar zu Song-Duellen herausfordern.\n\nIch öffne das Panel gleich für dich.',
          details: 'Was der Chat kann:\n• Textnachrichten zwischen Desktop (Host) und allen verbundenen Handys\n• Absender-Auswahl: der Host schreibt optional im Namen eines Spielers\n• Song-Herausforderungen: Gäste fordern zu Duellen heraus — am Desktop annehmen und los\n\nVoraussetzung: Damit Handys mitschreiben, müssen Companion-Geräte verbunden sein (Mobile-Tab der Einstellungen — dazu gibt\'s die Companion-Tour).',
        },
        navButton: {
          title: 'Chat öffnen',
          body: 'Der Chat-Button in der Menüleiste öffnet das Panel — es legt sich als Seitenleiste über den Bildschirm und schließt mit ✕ oder Klick daneben.',
        },
        panel: {
          title: 'Das Chat-Panel',
          body: 'Links läuft der Verlauf, unten schreibst du. Das Panel bleibt offen, bis du es schließt — auch beim Screenwechsel.',
        },
        messages: {
          title: 'Der Verlauf',
          body: 'Deine Nachrichten erscheinen rechts in Cyan (als Host), Beiträge von Handys links in Lila. Uhrzeiten zeigt jede Nachricht mit.',
          details: 'Hintergrund-Update: Das Panel lädt alle 3 Sekunden neue Nachrichten — ihr verpasst also nichts, auch wenn es im Hintergrund läuft.\n\nDie Desktop-Chat-Benachrichtigung (Glocke) zeigt ungelesene Nachrichten auch bei geschlossenem Panel.',
        },
        sendAs: {
          title: '„Senden als"',
          body: 'Du bist der Host — aber du darfst auch im Namen eines Spielers schreiben: Das Dropdown wählt die Identität. 🖥️ = Host, 📱 = Mitspieler.',
          details: 'Wofür das gut ist:\n• Der Host tippt für jemanden, der kein Handy hat („Anna sagt: nochmal Refrain!")\n• Für Bühnen-Ansagen im Namen des Moderatoren-Profils\n\nDer Farb-Punkt neben dem Dropdown zeigt die Spielerfarbe — so bleibt im Verlauf klar, wer „gesprochen" hat.',
        },
        input: {
          title: 'Nachricht schreiben',
          body: 'Ins Feld tippen (max. 200 Zeichen) und Enter drücken — oder den Senden-Button nutzen.',
        },
        send: {
          title: 'Senden',
          body: 'Abschicken geht mit Enter oder dem Button — die Nachricht erscheint sofort im Verlauf und auf allen verbundenen Handys.',
        },
        songChallenges: {
          title: 'Song-Herausforderungen ⚔️',
          body: 'Gäste können aus der App heraus zu einem Song herausfordern: Im Chat erscheint eine Challenge-Karte — „Herausforderung annehmen" startet das Duell.',
          details: 'So läuft die Herausforderung:\n1. Gast wählt in der App einen Song und tippt auf „Herausfordern"\n2. Im Chat erscheint die Karte mit Song, Herausforderer und Annehmen-Button\n3. Am Desktop annnehmen — es öffnet sich der Start-Dialog mit vorausgewähltem Duell-Modus\n4. Singen! Der Gewinner bekommt den Ruhm (und die Punkte)\n\nHinweis: „Senden als" muss dafür auf einem Spieler stehen — der Gegner muss ja klar sein.',
        },
        companionSide: {
          title: 'Auf den Handys',
          body: 'Die Companion-App hat einen eigenen Chat-Tab — dort tippen die Gäste mit. Was ihr hier seht, sehen die in Echtzeit und umgekehrt.',
        },
        finish: {
          title: 'Angeschrieben! 💌',
          body: 'Du kennst jetzt den Chat — vom Panel bis zur Song-Herausforderung.\n\nKombiniert mit der Companion-Tour wird klar, wie Handys und Desktop zusammenarbeiten.',
        },
      },
    },

    // ═══ Companion-Tour (R29) ═══
    companion: {
      title: 'Companion-App',
      desc: 'Smartphones verbinden: Mikro, Fernbedienung, Song-Wünsche & Mitsingen.',
      chapters: {
        connect: 'Verbinden',
        features: 'Was die App kann',
        manage: 'Geräte verwalten',
      },
      steps: {
        welcome: {
          title: 'Handys als Zubehör 📱',
          body: 'Die Companion-App macht aus jedem Smartphone ein Karaoke-Zubehör: Mikrofon, Fernbedienung, Song-Auswahl und Chat — ohne Installation, direkt im Browser.\n\nDiese Tour zeigt den Desktop-Seite des Flows.',
          details: 'Das Prinzip: Der Desktop ist der Host (Musik, Noten, Scores) — die Handys verbinden sich übers WLAN und werden je nach Bedarf zu:\n• 🎤 Mikrofonen (mit Tonhöhen-Erkennung auf dem Handy!)\n• 🎮 Fernbedienungen (Screens steuern)\n• 🎵 Song-Browsern mit Queue-Wünschen\n• 💬 Chat-Teilnehmern\n• 🪞 Live-Mirrors des Desktop-Bildschirms\n\nKein App-Store, kein Konto — QR scannen, fertig.',
        },
        mobileTab: {
          title: 'Mobile-Tab öffnen',
          body: 'Die Verbindung startet in den Einstellungen → Mobile. Ich habe den Tab gerade für dich geöffnet.',
        },
        qrCode: {
          title: 'QR-Code scannen',
          body: 'Der große Code links ist der direkte Weg: Handy-Kamera öffnen, scannen, die App lädt im Browser. Wichtig: Handy und Rechner im selben WLAN.',
          details: 'Der QR-Code enthält die LAN-Adresse des Desktops (z. B. http://192.168.1.42:3000/mobile) — deshalb müssen beide Geräte im selben Netz sein.\n\nWenn der Code nicht will: Die URL darunter lässt sich auch eintippen oder kopieren (Button). Im öffentlichen WLAN ohne Geräte-Sichtbarkeit funktioniert die Verbindung leider nicht — dann eigenen Hotspot nutzen.',
        },
        connectionInfo: {
          title: 'URL & Copy-Button',
          body: 'Rechts steht die Adresse als Text — mit Copy-Button zum Verschicken (z. B. per Messenger an die Gäste). Die grüne Zeile bestätigt die erkannte Netzwerk-IP.',
          details: 'Tipp fürs-Vorab-Verschicken: Schick die URL den Gästen schon vor der Party — sobald der Desktop läuft, verbinden sich alle sofort.\n\nDie gelbe Warnung erscheint, wenn keine LAN-IP erkannt wurde (z. B. reiner localhost-Betrieb) — dann ist nur der gleiche Rechner erreichbar.',
        },
        roles: {
          title: 'Die Rollen der App',
          body: 'Nach dem Verbinden bietet die App je nach Kontext:\n\n🎤 Mikro-Ansicht mit Tonhöhen-Anzeige\n🎮 Fernbedienung für den Desktop\n🎵 Song-Browser + Queue-Wünsche\n💬 Chat\n🪞 Live-Mirror des Bildschirms',
          details: 'Die Rollen im Detail:\n• Mikrofon: Das Handy misst die Tonhöhe und überträgt sie live — der Desktop zeigt die Noten wie von einem „echten" Mikro. Funktioniert für alle Modi (auch Duell: zwei Handys!).\n• Fernbedienung: Screens, Buttons und Bestätigungen vom Handy aus — gut für Party-Hosts, die durch den Raum laufen.\n• Song-Browser: Die komplette Bibliothek auf dem Handy — inklusive Vorschau und Warteschlangen-Wunsch mit 📱-Badge auf dem Desktop.\n• Chat: Nachrichten an den Desktop und andere Gäste.\n• Mirror: Der Bildschirm des Desktops (Spiel, Ergebnisse) wird auf dem Handy gespiegelt — die Gäste sehen alles von ihren Plätzen.',
        },
        chatRole: {
          title: 'Chat am Desktop',
          body: 'Was die Gäste im App-Chat tippen, landet im Desktop-Chat (Chat-Button in der Menüleiste) — und umgekehrt. Dazu gibt\'s die eigene Chat-Tour.',
        },
        queueRole: {
          title: 'Wünsche in der Queue',
          body: 'Gäste reihen Songs von ihren Handys ein — sie erscheinen auf dem Desktop in der Warteschlange mit 📱-Badge. Auch dazu gibt es eine eigene Tour.',
        },
        singAlong: {
          title: 'Mitsing-Modi 🎶',
          body: 'In den Party-Modi Companion-Singalong und Pass-the-Mic singen die Gäste direkt über ihre Handys — Tonhöhen-Erkennung läuft auf dem Gerät, der Desktop orchestriert.',
          details: 'Companion-Singalong: Jeder Gast bekommt auf seinem Handy Lyrics + Tonhöhen-Anzeige — der Desktop zeigt die gemeinsame Note-Bahn.\n\nPass-the-Mic: Das Mikro wandert — auch zwischen Handy und physischem Mikro gemischt möglich.\n\nFür beide gilt: Je besser die WLAN-Qualität, desto flüssiger die Tonhöhe. Bei Zuckungen hilft ein Rechner näher am Router.',
        },
        deviceList: {
          title: 'Geräte-Liste',
          body: 'Zurück im Mobile-Tab: Hier siehst du alle verbundenen Geräte mit Verbindungsdauer, Rolle, zugewiesenem Profil und letzter Aktivität — inklusive Trennen-Button.',
          details: 'Die Gerät-Karte zeigt:\n• Verbindungsdauer („seit 12 Min")\n• Was das Gerät gerade macht (Mikro aktiv, Fernbedienung …)\n• Das geclaimte Profil — hier lässt sich per Dropdown ein anderes zuweisen\n• Kick: trennt das Gerät (es kann sich sofort neu verbinden)\n\nTipp: Vergeben sprechende Profilnamen, dann bleibt die Liste auch bei vielen Gästen übersichtlich.',
        },
        profileClaim: {
          title: 'Profil-Claiming',
          body: 'Jedes Gerät kann ein Profil beanspruchen: Dann singt der Gast unter eigenem Namen mit eigenen XP — der Profil-Screen zeigt den Claim mit 📱-Badge.',
          details: 'Claiming-Wege:\n1. Profil-QR in den Profil-Einstellungen scannen (direktester Weg)\n2. In der App nach dem Verbinden aus der Liste wählen\n3. Hier in der Gerät-Liste per Dropdown zuweisen\n\nDetails dazu auch in der Profil-Tour.',
        },
        microphoneFallback: {
          title: 'Handy statt Mikro-Setup',
          body: 'Wenn alle per Handy singen, brauchst du den Mikrofon-Tab gar nicht — die Empfindlichkeit regelt die App selbst. Physische Mikrofone konfigurierst du wie gesehen im Mikrofon-Tab.',
        },
        finish: {
          title: 'Verbunden! 🔗',
          body: 'Du weißt jetzt, wie Handys andocken und was sie können.\n\nNächster Schritt: Öffne auf deinem eigenen Handy die URL und mach den ersten Test — der Mikro-Modus ist der beeindruckendste.',
        },
      },
    },

    // ═══ Erfolge-Tour (R29) ═══
    achievements: {
      title: 'Erfolge & Fortschritt',
      desc: 'Achievements, XP-Level, Raritäten und Daily-Challenges.',
      chapters: {
        overview: 'Überblick',
        unlock: 'Erfolge freischalten',
        daily: 'Daily Challenges',
      },
      steps: {
        welcome: {
          title: 'Erfolge & Fortschritt 🏆',
          body: 'Alles, was ihr sammelt: Achievements mit Raritäten, XP-Level mit Rang-Titeln und die Daily-Challenges als XP-Motor.\n\nDiese Tour führt durch den Erfolge-Screen und die Challenges.',
          details: 'Die drei Systeme im Zusammenspiel:\n• XP: der „Kraftstoff" — aus Songs, Challenges und Achievements\n• Level & Ränge: steigen mit XP (Anfänger → Legende), zeigen Fortschritt auf einen Blick\n• Achievements: Meilensteine mit Belohnungen — manche geheim, bis ihr sie freischaltet\n\nAlles hängt am Profil — wer singt, sammelt (siehe Profil-Tour).',
        },
        navButton: {
          title: 'Der Erfolge-Button',
          body: 'In der Menüleiste führt der Pokal zu den Achievements — die zweite Pokal-Spalte daneben zeigt die Bestenlisten.',
        },
        playerSelector: {
          title: 'Spieler-Auswahl',
          body: 'Oben wählt ihr, wessen Erfolge ihr seht — praktisch, um Freunden die Sammlung zu zeigen. Die Zahl am Profil zeigt dessen freigeschaltete Erfolge.',
        },
        stats: {
          title: 'Die Statistik-Karten',
          body: 'Vier Karten auf einen Blick: freigeschaltete Erfolge, gesammelte XP daraus, Completeness in Prozent und das aktuelle Level mit Rang-Titel.',
          details: 'Die Prozent-Karte rechnet: freigeschaltete ÷ alle Erfolge. 100 % ist die Sammler-Hürde — dafür gibt es meist einen eigenen Secret-Achievement.\n\nDie Level-Karte zeigt zusätzlich den Rang-Titel („Rising Star", „Karaoke-Legende" …) — die Titel stammen aus dem Progression-System des Profils.',
        },
        filters: {
          title: 'Filter',
          body: 'Links die Status-Filter (alle / freigeschaltet / verschlossen), rechts die Kategorien: Performance, Progression, Social und Speziell.',
          details: 'Die Kategorien bedeuten:\n• Performance: Sing-Leistungen (Combos, goldene Noten, Perfekt-Runden)\n• Progression: Sammel-Meilensteine (Songs gespielt, XP-Mengen, Level)\n• Social: Party- und Multiplayer-Aktionen (Duelle, Companion-Runden)\n• Speziell: Geheimnisse und Kuriositäten — Beschreibung enthüllt sich erst mit dem Freischalten\n\nKombinierbar: „Verschlossen + Speziell" zeigt, was noch auf euch wartet.',
        },
        grid: {
          title: 'Die Erfolgs-Karten',
          body: 'Jede Karte: Icon, Name, Beschreibung, Rarität und XP-Belohnung. Freigeschaltete leuchten golden mit Datum — verschlossene bleiben grau.',
          details: 'Die Raritäten (farblich markiert):\n• Common — kommt beim normalen Spielen von allein\n• Rare — erfordert gezieltes Handeln\n• Epic — harte Arbeit oder Glücksfälle\n• Legendary — für die Wenigsten\n\nDas Freischalten passiert automatisch, sobald die Bedingung erfüllt ist — Toast-Meldung inklusive. Die XP landen sofort im Profil.',
        },
        xpSystem: {
          title: 'Wie XP fließen',
          body: 'XP kommt aus drei Quellen: gesungene Songs (nach Schwierigkeit), Challenges (Daily/Weekly) und eben Erfolgen. Level schalten Ränge frei — und manche Features wie Profile-Badges.',
          details: 'XP-Quellen im Überblick:\n• Song beendet: Basis-XP nach Schwierigkeit (easy → expert steigend)\n• Daily-Slot: 100–400 XP + Boni\n• Weekly-Slot: 500–2000 XP\n• Achievement: einmalig je Erfolg (25–1000 XP nach Rarität)\n\nDer Level-Balken im Profil-Screen zeigt den Weg zum nächsten Level; Ränge wechseln alle paar Level.',
        },
        navDaily: {
          title: 'Zu den Challenges',
          body: 'Die Daily-Challenges haben einen eigenen Screen — der Stern-Button in der Menüleiste führt dich hin. Ich navigiere jetzt dort hin.',
        },
        playerSelection: {
          title: 'Schritt 1: Spieler wählen',
          body: 'Geführter Flow: Zuerst wählt ihr, wer spielt — erst dann erscheinen die Aufgaben. Mehrere Spieler möglich, die Statistik gehört dem ersten.',
          details: 'Warum die Auswahl zuerst? Die Slots und Statistiken sind pro Profil — ohne gewählten Spieler gäbe es nichts zu berechnen.\n\nDie Karte zeigt alle aktiven Profile; Auswahl per Klick. Danach klappen Schritt 2 (Aufgaben) und Schritt 3 (Spielen) auf.',
        },
        slots: {
          title: 'Schritt 2: Die 5 Slots',
          body: 'Fünf Aufgaben-Slots pro Tag, die sich nacheinander freischalten. Jeder Slot zeigt die Aufgabe, spielbare Schwierigkeiten und den XP-Wert — höhere Schwierigkeiten multiplizieren.',
          details: 'Slot-Mechanik:\n• Slots 2–5 öffnen sich erst, wenn der vorherige abgeschlossen oder übersprungen ist — die Kette zwingt zur Abwechslung.\n• Jede Aufgabe ist eine Bedingung an den nächsten Song („Genre Rock", „Mindestens 80 % Genauigkeit" …) — die Bibliothek filtert automatisch passende Songs.\n• Schwierigkeitswahl pro Slot: bis zu 3× XP-Multiplikator bei expert.\n\nUm Mitternacht gibt es fünf neue Aufgaben — dann startet die Kette von vorn.',
        },
        badges: {
          title: 'Badges & Weekly',
          body: 'Wer mehrere Slots schafft, sammelt Tages-Badges (Bronze/Silber/Gold) mit Extra-XP. Das Wochen-Pendant läuft 7 Tage mit fetten Belohnungen — gleiche Mechanik, größerer Pott.',
          details: 'Badge-Stufen pro Tag:\n• Bronze: 2 Slots\n• Silber: 3–4 Slots\n• Gold: alle 5 Slots — plus Tages-Bonus-XP\n\nWeekly: 5 Slots über 7 Tage, 500–2000 XP pro Slot, Reset montags. Wer Daily UND Weekly spielt, levelt deutlich schneller als nur mit Songs.',
        },
        challengeModes: {
          title: 'Challenge-Modi',
          body: 'Neben den Slots gibt\'s freie Challenge-Modi mit Modifikatoren (z. B. „2× Tempo", „Keine Noten") — für eigene Regeln und Extra-XP abseits der Tagesaufgaben.',
          details: 'Die Modi lassen sich frei konfigurieren: Modus wählen, Modifikatoren kombinieren, XP-Pott wächst mit der Schwierigkeit.\n\nVervollständigungen schalten neue Modifikatoren frei — die Sammel-Karte im Challenge-Bereich zeigt, was ihr schon habt.',
        },
        finish: {
          title: 'Sammeln aus! 🏅',
          body: 'Du kennst jetzt Erfolge, XP und Challenges — die drei Motoren des Fortschritts.\n\nTipp für den Start: Heute noch 2 Daily-Slots spielen — der Rest kommt von allein.',
        },
      },
    },
  },
};
