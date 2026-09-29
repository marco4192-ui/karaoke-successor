// NL translations — tutorial
// Tutorial / live-rondleiding teksten (basis + editor + instellingen + R29:
// profiel, wachtrij, chat, companion, prestaties) — gebaseerd op het EN-bestand.
// Elke stap kan een optionele `details`-tekst meekrijgen — de knop "Meer info"
// in de tooltip klapt de diepere uitleg uit (korte body eerst, details op verzoek).
export const tutorialTranslations = {
  tutorial: {
    // ?-hulpmenu
    helpButtonTitle: 'Hulp & rondleidingen',
    helpDialogTitle: 'Hulp & rondleidingen',
    helpDialogDesc: 'Bekijk de volledige rondleidingen opnieuw — of spring direct naar een onderwerp en laat juist dat deel uitleggen.',
    helpFooter: 'Toetsenbord in de rondleiding: → verder · ← terug · Esc afsluiten',
    startFullTour: 'Volledige rondleiding',
    stepsCount: '{n} stappen',
    completedBadge: 'Voltooid',
    // Rondleidinggroepen in het hulpmenu (R29: 8 rondleidingen vragen om structuur)
    groupGettingStarted: 'Aan de slag',
    groupAreas: 'Onderdelen & functies',
    groupAdvanced: 'Voor gevorderden',
    // Overlay-bediening
    ariaLabel: 'Rondleiding',
    skipTour: 'Rondleiding stoppen',
    back: 'Terug',
    next: 'Volgende',
    finish: 'Klaar',
    clickHint: 'Klik er nu op',
    // "Meer info"-uitklapgedeelte (R29)
    moreDetails: 'Meer info',
    lessDetails: 'Minder tonen',
    // Eerste-start-aanbod
    offerTitle: 'Welkom bij Karaoke ZERO!',
    offerBody: 'Zin in een korte rondleiding langs de basis? In 2 minuten ken je dagelijkse uitdagingen, zangmodi, de bibliotheek en partygames.',
    offerStart: 'Rondleiding starten',
    offerLater: 'Misschien later',
    offerHint: 'Altijd beschikbaar via het ?-icoon in de menubalk.',

    // ═══ Basisrondleiding ═══
    basic: {
      title: 'Basis',
      desc: 'De complete rondreis: uitdagingen, zangmodi, bibliotheek, party & meer.',
      chapters: {
        welcome: 'Welkom',
        challenges: 'Dagelijks & wekelijks',
        singing: 'Begin met zingen',
        party: 'Partymodi',
        more: 'Meer onderdelen',
      },
      steps: {
        welcome: {
          title: 'Welkom! 👋',
          body: 'Dit is een live rondleiding: ik markeer de belangrijke plekken en leg ze uit.\n\nBediening: "Volgende" (of toets →), "Terug" (←) en "Rondleiding stoppen" (Esc). We gaan!',
          details: 'Je kunt de rondleiding altijd pauzeren en later hervatten: het ?-icoon in de menubalk opent het hulpmenu met alle rondleidingen — ook per hoofdstuk af te spelen.\n\nVeel stappen hebben onderaan een knop "Meer info": die klapt extra details uit zonder de korte tekst te verliezen.',
        },
        heroButtons: {
          title: 'Snel starten',
          body: '"Begin met zingen" brengt je direct naar de bibliotheek. "Party Modus" opent de 9 partygames voor groepen.',
          details: 'De snelstartkaarten zijn shortcuts voor de meest gebruikte routes:\n• "Begin met zingen" = bibliotheek openen, nummer kiezen, zingen (solo, duel of duet).\n• "Party Modus" = de spelcollectie voor tot 32 spelers, telefoons kunnen als microfoon meedoen.\n\nAlles wat je hier ziet, is ook via de menubalk te bereiken — de kaarten besparen je alleen klikwerk.',
        },
        dailyCard: {
          title: 'Dagelijkse uitdaging',
          body: '5 vakken per dag met wisselende taken — hoe meer vakken je wist, hoe groter je XP-bonus. Verse taken verschijnen om middernacht.',
          details: 'Zo werkt het systeem:\n• Elk van de 5 vakken bevat een ander type taak (bijv. "zing een nummer uit de jaren 80", "score 8000 punten").\n• Vakken ontgrendelen na elkaar — vak 2 pas als vak 1 voltooid is.\n• Elk vak is speelbaar in meerdere moeilijkheidsgraden; hogere geven meer XP (tot 3× multiplier).\n• De bonus groeit met het aantal gewiste vakken: 5/5 levert de volledige dagbonus op.\n\nTaken komen uit JOUW bibliotheek — de selectie past zich altijd aan je nummers aan.',
        },
        weeklyCard: {
          title: 'Wekelijkse uitdaging',
          body: 'De wekelijkse tegenhanger: 5 vakken verspreid over de week met grotere XP-beloningen. Perfect voor langetermijndoelen.',
          details: 'Wekelijkse uitdagingen werken als de dagelijkse, maar:\n• De 5 vakken lopen 7 dagen — geen dagelijkse reset, verzamel in je eigen tempo.\n• De XP-beloningen per vak zijn groter: 250–500 XP basis in plaats van 100–200 dagelijks — en de moeilijkheidsmultiplier (tot 3×) komt daar bovenop.\n• De reset valt op maandagochtend.\n\nTip: dagelijks en wekelijks lopen parallel — beide spelen is de snelste weg omhoog.',
        },
        modeLauncher: {
          title: 'Zingen: Solo, Duel & Duet',
          body: '🎤 Solo: één speler, één microfoon.\n⚔️ Duel: twee spelers op HETZELFDE nummer — de meeste punten winnen.\n🎭 Duet: twee stemmen op twee sporen — de bibliotheek toont automatisch alleen geschikte duetnummers.',
          details: 'De drie modi in detail:\n• Solo: klassieke karaoke — je zingt alle noten, je score landt in de highscores.\n• Duel: beide spelers zingen tegelijk hetzelfde notenspoor. De punten lopen apart — de vergelijking achteraf toont wie beter was. Perfect voor revanches.\n• Duet: het nummer heeft twee aparte stemmen (P1/P2) — iedereen zingt "zijn" delen, gedeelde zinnen leveren teambonus op. Duetnummers vind je in de bibliotheek met het 🎭-filter.\n\nMicrofoons: tot 4 fysieke microfoons plus smartphones als extra invoer (zie Instellingen → Microfoon).',
        },
        libraryNav: {
          title: 'De bibliotheek',
          body: 'Al je nummers staan hier. Zoek op titel of artiest — de fuzzy zoekfunctie vergeeft zelfs typefouten.',
          details: 'Zoektips:\n• De fuzzy zoekfunctie vindt "Dancing Qun" → "Dancing Queen". Hoofdletters en één typefout zijn geen probleem.\n• Er wordt tegelijk in titel, artiest ÉN genre gezocht — "Rock" vindt ook nummers met genre Rock.\n\nSorteren via het dropdownmenu (titel A–Z, artiest, recent toegevoegd). Nummers komen de bibliotheek binnen via import, mapscan of afspeellijsten — dat regel je in het tabblad Bibliotheek van de instellingen.',
        },
        filters: {
          title: 'Filters',
          body: 'Genre, taal, jaar, decennium, duetnummers en virale hits — snijd de bibliotheek naar eigen hand.',
          details: 'Alle filters combineer je — bijv. "Genre: Rock + Taal: Engels + Tijdperk: jaren 80" toont precies de Engelse rocksongs uit de jaren tachtig.\n\nSpeciale filters:\n• Duet: alleen nummers met twee stemsporen.\n• Virale hits: nummers die momenteel in de virale charts staan (geconfigureerd in Instellingen → Bibliotheek).\n• Eigen genres & talen: maak je eigen categorieën aan bij Instellingen → Genres & Talen — ze verschijnen direct in deze filters.\n\n"Filters resetten" (✕) ruimt alles in één keer op.',
        },
        songCard: {
          title: 'Nummers',
          body: 'Op een nummerkaart klikken opent het startvenster: modus, spelers, microfoons en moeilijkheid.',
          details: 'Elke nummerkaart toont:\n• Hoes plus titel/artiest\n• Moeilijkheid (makkelijk/gemiddeld/moeilijk/expert) en sterrenwaardering\n• Belangrijkste metadata zoals genre en taal — rechtstreeks uit het nummer of geharmoniseerd via AI (Editor → Metadata Studio)\n\nHet voorbeeld-icoon start een korte teaser zonder het startvenster te openen.',
        },
        startModal: {
          title: 'Het startvenster',
          body: 'Hier stel je alles in: modus (solo/duel/duet), wie zingt, welke microfoon iedereen krijgt en de moeilijkheid.\n\nKlik daarna op "Start" — en ervoor gaan!',
          details: 'De belangrijkste opties:\n• Modus: solo, duel (2 spelers, zelfde spoor) of duet (2 stemmen) — in de duetmodus kiezen beide spelers hun stem (P1/P2).\n• Microfoons: elke speler kan een eigen invoerapparaat krijgen — of een smartphone als microfoon (companion-app).\n• Moeilijkheid: beïnvloedt de scoring — zwaardere moeilijkheidsgraden vergeven minder en belonen precisie (hoger scorepotentieel, meer XP).\n• "Toevoegen aan wachtrij" in plaats van "Start": zet het nummer in de wachtrij in plaats van direct te starten — ideaal wanneer meerdere mensen willen zingen.',
        },
        partyCard: {
          title: 'Partymodi',
          body: '9 spellen voor tot 32 spelers: Battle Royale, Geef de Mic, Medley Contest, toernooi, Missing Words, Blind Karaoke en meer — telefoons doen mee als microfoon.',
          details: 'De 9 modi in één oogopslag:\n• Battle Royale: iedereen zingt, de zwakste valt elke ronde af — de laatste overeind wint.\n• Geef de Mic: de microfoon gaat van speler naar speler — iedereen zingt zijn deel.\n• Medley Contest: teams zingen korte nummerfragmenten met speciale regels.\n• Toernooi: knockoutschema met duellen — de winnaar klimt elke ronde op.\n• Missing Words: woorden uit de songtekst verdwijnen — zing het ontbrekende woord voor de punten.\n• Blind Karaoke: de notenweergave verdwijnt in passages — alleen op het gehoor!\n• Rate my Song & Companion Sing-A-Long en meer — elke moduskaart legt zichzelf uit.\n\nBijna alle modi ondersteunen de companion-app als microfoon en afstandsbediening.',
        },
        partyModes: {
          title: 'De moduskiezer',
          body: 'Hier kies je de partymodus: Battle Royale (laatste overeind), Geef de Mic, toernooi (schema), medley en meer.\n\nElke kaart toont wat je kunt verwachten — één klik opent de spelersselectie.',
          details: 'Na het klikken op een moduskaart volgt de spelersselectie: kies profielen (of verbind companion-apparaten) en stel daarna teamgroottes, rondeaantallen of tijdslimieten in, afhankelijk van de modus.\n\nThemaparty-tip: wanneer er een thema actief staat in de instellingen (bijv. "Feest van de jaren 80"), trekt elke nummerselectie in de partymodus automatisch alleen uit passende nummers — het feest blijft in het thema.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke zonder competitie: bouw afspeellijsten, zet nummers klaar, deel favorieten. De perfecte achtergrondamuseur.',
          details: 'De jukebox is de ontspannen modus:\n• Kies afspeellijsten of losse nummers als poel.\n• Optioneel videopauzes ertussen, zodat de sfeer nooit breekt.\n• Geen scoring, geen microfoons nodig — nummers draaien gewoon met songtekst.\n\nPerfect als avondvullende verstrooiing of om in te zingen voor de eerste ronde.',
        },
        jukeboxView: {
          title: 'In het jukeboxmenu',
          body: '"Afspeellijsten bekijken" geeft directe toegang tot elke opgeslagen afspeellijst — ook degene die je in de bibliotheek maakte. Eén klik zet de hele afspeellijst in de wachtrij.',
          details: 'De afspeellijstinstellingen van de jukebox bieden:\n• Of video\'s worden getoond (als de nummers die hebben)\n• Videopauzemodus: intermissievideo\'s tussen nummers, bijv. voor aankondigingen\n• Of de poel wordt geschud of in vaste volgorde draait\n\nStart fullscreen — afsluiten met Escape of de stopknop bovenin.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores per nummer en moeilijkheid — versla je vrienden (of jezelf).',
          details: 'De borden onthouden per nummer en moeilijkheid:\n• Score, nauwkeurigheid, gouden noten en datum\n• Welke speler de score behaalde (profielavatar)\n• Of de score via de companion-app (telefoonicoon) of de desktop binnenkwam\n\nMet de online-modus ingeschakeld (profielscherm) zie je daarnaast globale borden en wed je met spelers van andere installaties.',
        },
        highscoreView: {
          title: 'De highscoreborden',
          body: 'Gefilterd op nummer en moeilijkheid — met de filterbalk bovenaan. De telefooniconen tonen companion-app-gebruik.',
          details: 'De filterbalk bovenaan maakt mogelijk:\n• Zoeken op nummer of speler\n• Filteren op moeilijkheid\n• Wisselen tussen lokaal/globaal (wanneer online is ingeschakeld)\n\nAnti-cheat: elke score draagt een nummer-vingerafdruk — gemanipuleerde resultaten worden herkend en gemarkeerd.',
        },
        settingsCard: {
          title: 'Instellingen',
          body: 'Microfoons, taal, gameplay-fijnafstelling, weergave en graphics — alle regelaars vind je hier.',
          details: 'De 12 instellingstabbladen in een flits:\n• Algemeen: taal, standaardmoeilijkheid, online\n• Gameplay: scoreweergave, deeltjes, combo, opname van herhalingen\n• Weergave: thema\'s, songtekststijl, achtergrond\n• Audio: uitgangsapparaat, volume, loudness, YouTube-kwaliteit\n• Microfoon: apparaten, gevoeligheid, noise gate, presets\n• Mobiel: companion-apparaten verbinden & beheren\n• Webcam: webcam als achtergrond\n• Bibliotheek: nummermap, import, virale charts, reset\n• Genres & Talen: eigen categorieën\n• Themaparty: thema activeren & instellen\n• Sync & Back-up: zekerheden\n• Over: versie, platform, licenties\n\nEr is een eigen, diepgaande instellingenrondleiding voor alle tabbladen in het ?-hulpmenu.',
        },
        settingsView: {
          title: 'De instellingstabbladen',
          body: 'Kies bovenaan een sectie: Algemeen (taal), Gameplay, Weergave, Audio, Microfoon, Mobiel (telefoonverbinding) en meer.',
          details: 'Een korte introductietekst bovenaan elk tabblad legt uit wat het doet — je hoeft nooit meer te gokken waar een optie thuishoort.\n\nDe bijbehorende rondleiding: "Instellingen" in het ?-hulpmenu loopt met je langs elk tabblad.',
        },
        finish: {
          title: 'Klaar! 🎉',
          body: 'Je kent nu de basis.\n\nTip: het ?-icoon in de menubalk brengt je altijd terug — inclusief losse onderdeelhoofdstukken, de editorrondleiding en de instellingenrondleiding.',
          details: 'En nu? Een paar suggesties voor je eerste minuten:\n1. Maak een profiel aan (Profielen in de menubalk) — zonder profiel speel je wel, maar verzamel je geen XP.\n2. Importeer nummers (Instellingen → Bibliotheek).\n3. Een paar rondes dagelijkse uitdaging voor de XP-boost.\n4. Komen er vrienden langs? Probeer de partymodus — de companion-app maakt van elke telefoon een microfoon (er is een eigen companion-rondleiding).',
        },
      },
    },

    // ═══ Editorrondleiding ═══
    editor: {
      title: 'Editorrondleiding',
      desc: 'Noten, songteksten, stemmen & harmoniseren — de toolbox voor je nummers.',
      chapters: {
        entry: 'Binnenkomen',
        layout: 'Opbouw',
        notes: 'Noten bewerken',
        extras: 'Extra\'s & harmoniseren',
      },
      steps: {
        welcome: {
          title: 'De editor ✏️',
          body: 'Hier worden nummers speelbare karaoketracks: noten plaatsen, songteksten timen, stemmen toewijzen.\n\nSandbox-tip: oefen op een testnummer — wijzigingen maak je ongedaan met Ctrl+Z.',
          details: 'De editor werkt met het UltraStar-formaat: elke noot heeft een begintijd, een duur, een toonhoogte en een tekst (lettergreep). Veel noten samen vormen de notenbaan die je in het spel ziet.\n\nBronnen voor nieuwe nummers:\n• Tekstimport (UltraStar/TXT) in de editor\n• MIDI-import (noten gegenereerd uit MIDI)\n• AI-harmonisatie: songtekst + audio → nootsuggesties\n\nAlles is niet-destructief: tot je opslaat blijft het originele nummer onaangeroerd.',
        },
        songList: {
          title: 'Nummerselectie',
          body: 'Zoek een nummer om het te openen. Filters tonen nummers met ontbrekende metadata — die harmoniseert de editor later.',
          details: 'De filterchips boven de lijst tonen nummers zonder genre/taal/jaar — de snelste route naar nummers die de Metadata Studio nog niet verwerkt heeft.\n\nDe zoekfunctie dekt titel en artiest — hoofdletters maken niet uit.',
        },
        noSongs: {
          title: 'Nog geen nummers',
          body: 'De editor heeft nummers in de bibliotheek nodig. Importeer eerst nummers (bibliotheek → import / mapscan) en kom terug.',
          details: 'Zo kom je aan nummers:\n• Instellingen → Bibliotheek → stel de nummermap in: elke submap wordt als één nummer gelezen (audio/video + UltraStar-tekst).\n• Of losse bestanden via het importvenster.\n• Of maak een nieuw nummer in de editor ("Nieuw nummer") en breng songtekst + audio zelf bij elkaar.',
        },
        openSong: {
          title: 'Nummer openen',
          body: 'Klik nu op een nummer in de lijst om het in de editor te openen.',
          details: 'Eenmaal open zie je bovenaan de werkbalk (subkop) en de tijdlijn met waveform, notenbanen en songtekst.\n\nHet nummer blijft open tot je het via "Terug" sluit — niet-opgeslagen wijzigingen vragen eerst om bevestiging.',
        },
        leftPanel: {
          title: 'Werkbalk',
          body: 'Alles voor noten: toevoegen, dupliceren, verwijderen, splitsen, samenvoegen — plus noottypes, stemmen en tapmodus (komt zo).',
          details: 'De tools op een rij:\n• ➕ Noot toevoegen: valt op de afspeelkop\n• ⧉ Dupliceren: kopieert de geselecteerde noot direct erachter\n• 🗑 Verwijderen: haalt de selectie weg\n• ✂ Splitsen: één noot → twee (in het midden)\n• ⇄ Samenvoegen: voegt de geselecteerde noot samen met de volgende\n\nSelecteren via klikken; shift-klik voor meerdere. Daarna neemt het toetsenbord het over: ⌫ wist, ↑/↓ transponeert, ←/→ schuift.',
        },
        lyricsPanel: {
          title: 'Songtekstpaneel',
          body: 'De tekstregels staan links. Dubbelklik op een regel om het afspelen daarheen te laten springen — tekst en timing zijn hier bewerkbaar.',
          details: 'Het songtekstpaneel is tekst ÉN timing in één:\n• Klik op een lettergreep selecteert de bijbehorende noot in de tijdlijn.\n• Dubbelklikken springt naar de plek (afspelen volgt).\n• Rechtermuisknop (of penicoon) opent regeleditie: tekst wijzigen, lettergrepen op woordgrenzen splitsen, de timing van de hele regel verschuiven.\n\nHet splitsen op woordgrenzen gebruikt taaldetectie om lettergrepen verstandig over woorden te verdelen — niet meer handmatig snijden.',
        },
        subHeaderTools: {
          title: 'Noten bewerken',
          body: 'Noten zijn de blokken op de toonbanen: toevoegen, dupliceren, verwijderen, splitsen (één noot → twee) en samenvoegen (met de volgende noot).\n\nBewerk geselecteerde noten in rap tempo: ⌫ wist, ↑/↓ transponeert.',
          details: 'Precisietips:\n• Zoomen: Ctrl+muiswiel over de tijdlijn — zoom in voor fijn timingwerk.\n• Afspelen: Spatie wisselt tussen afspelen/pauze, Shift+Spati speelt alleen de selectie.\n• Meerdere noten transponeren: selecteer ze allemaal, ↑/↓ beweegt het hele stel.\n\nVoor de timing: de nootstart moet op de lettergreep-inzet in de zang vallen — de waveform helpt bij het vinden van de inzetten.',
        },
        noteTypes: {
          title: 'Noottypes',
          body: '5 types voor nieuwe noten:\n: Normaal (toon telt mee)\n* Gouden (extra punten)\nF Freestyle (elke noot telt mee)\nR Rap (alleen timing)\nG Rap-goud',
          details: 'Wat elk type in het spel betekent:\n• Normaal (:): klassieke zangnoot — toon en timing tellen mee.\n• Gouden (*): goud weergegeven, dubbele punten bij treffers. Perfect voor hoogtepunten in een nummer.\n• Freestyle (F): toon irrelevant, alleen tekst/timing telt — goed voor spreekpartijen.\n• Rap (R): beoordeelt timing en ritme in plaats van melodie.\n• Rap-goud (G): als rap, maar met extra punten.\n\nHet type is later te wijzigen: selecteer de noot en kies een nieuw type in de werkbalk.',
        },
        voices: {
          title: 'Stemmen',
          body: 'P1 = speler 1, P2 = speler 2 (duet!), P4/P8 = derde/vierde stem. Elke noot hoort bij een stem — zo ontstaan duetnummers met aparte delen.',
          details: 'Stemtoewijzing:\n• De stem-dropdown bepaalt op welk spoor nieuwe noten vallen.\n• Geplaatste noten kunnen verhuizen: selecteren en stem wisselen.\n• In de duetmodus in het spel kiest elke speler zijn eigen spoor — de bibliotheek filtert automatisch nummers met minstens 2 stemmen.\n\nP4/P8 maken zelfs kwartetopstellingen mogelijk; de hoofdmodi gebruiken P1/P2.',
        },
        tapMode: {
          title: 'Tapmodus — de turbo 🥁',
          body: 'Houd de modus vast en tik mee: elke klik laat een noot vallen op de huidige afspeelpositie, regel voor regel. Maak noten in realtime.',
          details: 'Zo verloopt een tapopname:\n1. Activeer de tapmodus in de werkbalk.\n2. Start het afspelen — het nummer draait met hoorbaar geluid.\n3. Klik in het ritme van de lettergrepen — elke klik laat een noot vallen op de afspeelkop met de laatst gekozen toonhoogte.\n4. Daarna verfijnen: toonhoogtes corrigeren (↑/↓ op geselecteerde noten) en duurtijden bijstellen.\n\nDe tapmodus is 5–10× sneller dan noten met de hand plaatsen — hele nummers in minuten in plaats van uren.',
        },
        panels: {
          title: 'Koppanelen',
          body: 'Drie panelen rechtsboven: metadata (genre/taal/jaar), audioanalyse en de AI-assistent.',
          details: 'Wat de drie panelen doen:\n• Metadata: bewerk genre, taal en jaar van het open nummer direct — voedt de filters en de themaparty.\n• Audioanalyse: analyseert het audiobestand (luidheid, toonsoort, BPM) en stelt waarden voor.\n• AI-assistent: songtekstaanvulling, nummeridentificatie en noot-harmonisatie via AI — vereist een geconfigureerde AI-provider (Instellingen → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'De harmonisatieturbo: AI- en regelsuggesties voor genre, taal en jaar — met eerst beluisteren dan toewijzen, handmatige fijnafstelling en een revisiewachtrij voor twijfelgevallen.',
          details: 'De studio-workflow:\n1. "Alle nummers analyseren" — de regelengine (bestandspaden, tags) en optioneel AI stellen genre/taal/jaar voor.\n2. Suggesties dragen zekerheid: groen = zeker, geel = herzien.\n3. Beluisteren: op een nummer klikken speelt een fragment — suggesties snel verifiëren.\n4. Individueel toewijzen of "alle groenen toepassen".\n\nDe revisiewachtrij verzamelt twijfelgevallen voor later — er raakt niets kwijt.',
        },
        shortcuts: {
          title: 'Sneltoetsen',
          body: 'Alle sneltoetsen in één overzicht — de editor is een toetsenbordinstrument. Klik er doorheen!',
          details: 'De belangrijkste sneltoetsen:\n• Ctrl+Z / Ctrl+Y: ongedaan maken / opnieuw\n• Spatie: afspelen/pauze\n• ⌫: geselecteerde noten verwijderen\n• ↑/↓: transponeren (Shift = hele octaaf) · ←/→: in de tijd schuiven (Shift = grof)\n• M: samenvoegen met de volgende noot\n• Ctrl+S: opslaan · Ctrl+C/V: noten kopiëren/plakken\n\nHet sneltoetsenpaneel in de linkerbalk toont alle toetsen in één oogopslag.',
        },
        finish: {
          title: 'Klaar om te bouwen! 🛠️',
          body: 'Je kent nu de editor-toolbox.\n\nOnthoud: Ctrl+Z redt alles, en het ?-icoon in de menubalk brengt je altijd terug naar deze hoofdstukken.',
          details: 'Aanbevolen volgorde voor een nieuw nummer:\n1. Audio/video koppelen (songinfo-tabblad)\n2. Songtekst importeren of typen (songteksttabblad)\n3. Noten tappen (tapmodus) of AI-harmonisatie\n4. Metadata bijhouden (genre/taal/jaar — belangrijk voor de filters!)\n5. Opslaan — vanaf nu verschijnt het nummer in de bibliotheek.',
        },
      },
    },

    // ═══ Instellingenrondleiding (R28) ═══
    settings: {
      title: 'Instellingen',
      desc: 'Alle instellingen in één overzicht: tabbladen, algemene instellingen, audio, bibliotheek, companion-apparaten en back-up.',
      chapters: {
        overview: 'Overzicht',
        basics: 'Basisinstellingen',
        sound: 'Audio & Microfoon',
        library: 'Bibliotheek & Thema',
        devices: 'Apparaten & Companion',
        data: 'Sync, Back-up & Info',
      },
      steps: {
        welcome: {
          title: 'De instellingen 👋',
          body: 'Deze rondleiding loopt uitsluitend langs de instellingen — tabblad voor tabblad.\n\nIk schakel automatisch naar elk tabblad en leg uit wat je er vindt.',
          details: 'De tabbladen in de volgorde van de rondleiding: Algemeen, Gameplay, Weergave, Audio, Microfoon, Mobiel (companion), Webcam, Bibliotheek, Genres & Talen, Themaparty, Sync & Back-up en Over.\n\nElk tabblad heeft bovenaan een korte intro — deze rondleiding verdiept hem stap voor stap.',
        },
        tabBar: {
          title: 'De tabbalk',
          body: 'Alle instellingen zijn georganiseerd in tabbladen: Algemeen, Gameplay, Weergave, Audio, Microfoon, Mobiel, Webcam, Bibliotheek, Genres & Talen, Themaparty, Sync & Back-up en Over.\n\nEen korte introductietekst bovenaan elk tabblad legt uit wat het doet.',
          details: 'Hulp bij het zoeken — stel jezelf de vraag…\n• "Hoe gedraagt het spel ZICH?" → Gameplay\n• "Hoe ZIET het eruit?" → Weergave\n• "Hoe KLINKT het?" → Audio / Microfoon\n• "Apparaten verbinden?" → Mobiel (companion) / Microfoon\n• "Mijn nummers?" → Bibliotheek\n• "Gegevens back-uppen?" → Sync & Back-up\n\nDe tabbladen scrollen horizontaal in smalle vensters — veeg gewoon naar rechts.',
        },
        general: {
          title: 'Algemeen',
          body: 'Interfacetaal, standaardmoeilijkheid, online-activiteiten en het volledige sneltoetsenoverzicht.',
          details: 'Taal: er zijn 16 talen beschikbaar. Wisselen geldt direct voor de hele interface.\n\nStandaardmoeilijkheid: geldt voor nieuwe rondes, tenzij het startvenster een andere kiest.\n\nOnline-activiteiten bepalen of highscores globaal worden geüpload en dagelijkse uitdagingen online worden gegenereerd.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Scoreweergave, deeltjeseffecten, comboweergave, opname van herhalingen, automatisch volledig scherm en meer gedragsschakelaars voor rondes en resultaten.',
          details: 'De belangrijkste schakelaars:\n• Scoreweergave: voor puur plezier zingen zonder score op het scherm.\n• Deeltjes & effecten: op zwakkere machines uitschakelen.\n• Herhaling: neemt audio en webcam op tijdens het zingen — de herhaling draait op het resultaatenscherm.\n• Automatisch volledig scherm: schakelt automatisch naar volledig scherm wanneer een nummer start.\n• Waarschuwingssignalen: korte piepjes vóór blindgedeelten en passages met verborgen woorden.\n\nDaarnaast: comboweergave en meer.',
        },
        appearance: {
          title: 'Weergave',
          body: 'Thema\'s, geanimeerde achtergrond of je eigen achtergrondvideo, songtekststijl en -grootte, notenweergave en de prestatiemodus voor zwakkere machines.',
          details: 'Songtekststijl: 10 visuele thema\'s — "Klassiek", "Concert", "Retro", "Neon", "Minimaal" en meer.\n\nAchtergrond: naast thema\'s werkt ook een eigen video — in het spel draait hij gedimd achter de noten.\n\nDe prestatiemodus schrapt animaties en achtergronden drastisch — de moeite waard vanaf hardware van ± 2015.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Uitgangsapparaat (incl. ASIO), hoofd- en voorbeeldvolume, microfoongevoeligheid, loudness-normalisatie en YouTube-videokwaliteit.',
          details: 'ASIO: alleen relevant voor Windows + ASIO-capabele geluidskaarten — verlaagt de latentie voor microfoonmonitoring.\n\nLoudness-normalisatie vlakt volumerverschillen tussen nummers af — de standaardwaarden zijn goed gekozen.\n\nYouTube-kwaliteit: geldt voor nummers met een YouTube-videobron; hogere kwaliteit = meer bandbreedte.',
        },
        microphone: {
          title: 'Microfoon',
          body: 'Apparaatkeuze, gevoeligheid, noise gate en live niveau — plus presets. Smartphones verbind je via het tabblad Mobiel.',
          details: 'Presets: typische opstellingen ("Optimaal", "Lage latentie", "Hoge nauwkeurigheid", "Rommige omgeving", "Bas", "Sopraan") zetten gevoeligheid + noise gate in verstandige combinaties.\n\nNoise gate: filtert ademhaling en ruimtegeluid — het live niveau toont in realtime wat erdoorheen komt.\n\nBelangrijk voor multiplayer: ELKE speler kan een EIGEN apparaat krijgen — de toewijzing gebeurt per ronde in het startvenster.',
        },
        libraryTab: {
          title: 'Bibliotheek',
          body: 'Stel de nummermap in (elke submap = één nummer) en scan hem, reset de bibliotheek of verwijder alle gegevens — plus de import vanuit andere karaokesystemen.',
          details: 'Mapformaat: één submap per nummer met audio/video + TXT (UltraStar-formaat). De scanner herkent gangbare combinaties (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport uit andere systemen: een SingStar-archief? Een UltraStar-collectie? De importconverter neemt metadata en songteksten automatisch over.\n\nVoorzichtig met "alle gegevens verwijderen": de dubbele bevestiging vraagt twee keer — maak desondanks eerst een back-up (tabblad Sync & Back-up).',
        },
        taxonomy: {
          title: 'Genres & Talen',
          body: 'Maak je eigen genre- en taal-items — ze verschijnen in alle dropdowns en voeden de AI-harmonisatie.',
          details: 'Waarom eigen items? Standaardlijsten dekken niet alles ("Levenslied", "K-Pop", "Dialect" …). Eigen items:\n• verschijnen direct in de bibliotheekfilters\n• zijn kiesbaar in de editor en Metadata Studio\n• harmoniseren mee (de AI stelt ze voor bij passende nummers)\n\nVerwijderen kan ook — nummers houden het item tot hertoewijzing.',
        },
        motto: {
          title: 'Themaparty',
          body: 'Zet de hele game in het teken van een thema (bijv. een jaren-80-feest): wanneer actief, vervangt het thema alle zoekvelden en filters — elke nummerselectie trekt alleen nog uit passende nummers.',
          details: 'Het themafilter kent meerdere velden, vrij combineerbaar (EN-logica):\n• Genre (bijv. rock)\n• Taal (bijv. Engels)\n• Tijdperk/jaar (bijv. 1980–1989)\n\nEffect: bibliotheek, nummerselectie in de partymodus ÉN companion-app tonen alleen de themapoel — gasten kunnen niets buiten het thema kiezen.\n\nDeactiveren zet alles direct terug naar de normale weergave; gespeelde nummers en highscores blijven onaangeroerd.',
        },
        mobile: {
          title: 'Mobiel & Companion',
          body: 'Verbind smartphones via de QR-code — als microfoon, afstandsbediening of meezingapparaat. Je ziet alle verbonden apparaten en hun verbindingscodes.',
          details: 'Verbinding: scan de QR-code (zelfde WiFi!) of typ de URL — de aparte companion-rondleiding legt de details uit in het ?-hulpmenu.\n\nDit tabblad toont ook:\n• Alle verbonden apparaten met status (actief, rol, laatste activiteit)\n• Profielen aan apparaten toewijzen\n• Individuele apparaten disconnecten\n\nDe per-profiel QR-codes (voor claiming) staan in de instellingenkaart van het profielscherm.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Gebruik de webcam als geanimeerde nummerachtergrond: resolutie, spiegeling, verzadiging, blur en meer effecten — met live voorbeeld.',
          details: 'De webcamachtergrond draait tijdens het nummer achter de noten — jullie zien jezelf zingen!\n\nEffecten: spiegelen (als een selfie), verzadiging, zachte blur, sepia — direct zichtbaar in het live voorbeeld.\n\nPrivacy: de camera draait alleen lokaal, er wordt niets opgeslagen of verstuurd.',
        },
        sync: {
          title: 'Sync & Back-up',
          body: 'Maak en herstel back-ups, synchroniseer gegevens tussen apparaten. In de desktopbuild worden spelergegevens bovendien permanent gespiegeld naar de AppData-map.',
          details: 'Een back-up bevat: profielen (met XP/voortgang), highscores, instellingen en afspeellijstdefinities — als één bestand om te archiveren of te verhuizen.\n\nDe AppData-spiegel (desktopbuild) beschermt tegen gegevensverlies in de browser: zelfs als de browseropslag wordt gewist, herstelt de desktopbuild alles.\n\nHerstellen overschrijft huidige gegevens — nogmaals: maak eerst een back-up.',
        },
        about: {
          title: 'Over',
          body: 'Versie, platform, licenties en bijdragende projecten — het digitale colofon van Karaoke ZERO.',
          details: 'Je ziet ook het buildkanaal (web/desktop) en kunt op updates controleren. De licenties vermelden de gebruikte open-sourceprojecten — dank aan iedereen die eraan bijdroeg!',
        },
        finish: {
          title: 'Volledig geconfigureerd! ⚙️',
          body: 'Je kent nu alle instellingen.\n\nHet ?-icoon in de menubalk brengt je altijd terug naar deze rondleiding — desgewenst hoofdstuk voor hoofdstuk.',
          details: 'Aanbeveling voor je eerste instellingenavond:\n1. Tabblad Bibliotheek: de nummermap scannen\n2. Tabblad Microfoon: preset kiezen + live niveau checken\n3. Tabblad Mobiel: telefoons verbinden (companion-rondleiding!)\n4. Thematabblad: over een partijthema nadenken\n5. Sync & Back-up: de eerste back-up trekken\n\nDaarmee staat de karaoke-avond op rails.',
        },
      },
    },

    // ═══ Profielrondleiding (R29) ═══
    profile: {
      title: 'Profielen & Karakters',
      desc: 'Maak spelers aan, volg XP & voortgang, online sync en companion-claiming.',
      chapters: {
        overview: 'Overzicht',
        characters: 'Karakters & Voortgang',
        online: 'Online & Companion',
      },
      steps: {
        welcome: {
          title: 'Je spelerprofielen 👤',
          body: 'Profielen zijn de identiteiten in het spel: XP, niveau, statistieken en prestaties leven op het profiel — en highscores dragen je naam.\n\nDeze rondleiding toont hoe je profielen aanmaakt en beheert.',
          details: 'Waarom profielen?\n• XP & niveau: gezongen nummers, uitdagingen en prestaties verzamelen ervaring — het niveau stijgt samen met de rangnaam (Beginner → Goddelijk).\n• Leaderboards: highscore-items tonen je avatar.\n• Partymodi: elke spelersselectie trekt uit deze lijst.\n• Companion-apparaten kunnen een profiel "claimen" en onder die identiteit zingen.\n\nProfielen leven in de browseropslag (lokaal) of in een online account (sync) — dat kies je bij het aanmaken.',
        },
        topBar: {
          title: 'De actiebalk',
          body: 'Hierboven schakel je online leaderboards in en uit, wissel je tussen lokaal/globaal en open je het aanmaakformulier voor nieuwe profielen.',
          details: 'De elementen van de balk:\n• Onlineschakelaar: zet onlinefuncties globaal aan/uit (leaderboards, accountregistratie)\n• Lokaal/Globaal: welk bord de highscoreweergave toont\n• "Profiel laden": meldt je aan met een sync-code en haalt je onlineprofiel naar dit apparaat\n• "Nieuw profiel": opent het aanmaakformulier (volgende stap)',
        },
        createButton: {
          title: 'Profiel aanmaken',
          body: '"Nieuw profiel" opent het formulier: naam, avatarafbeelding, land en opslagmodus (lokaal of met online account).',
          details: 'De formuliervelden:\n• Naam: verschijnt op leaderboards en in party\'s\n• Avatar: upload je eigen plaatje of een initiaal op een kleur\n• Land: vlag voor de globale leaderboards\n• Opslagmodus: "Lokaal" slaat alleen op dit apparaat op; "Online" registreert optioneel een account (e-mail + wachtwoord) en maakt syncing tussen apparaten mogelijk.\n\nOnline accounts bestaan alleen met de online-modus ingeschakeld — de registratie loopt op de achtergrond, het profiel is direct bruikbaar.',
        },
        empty: {
          title: 'Nog geen profielen',
          body: 'Hier nemen je spelers gestalte aan. Klik op "Nieuw profiel" en maak het eerste karakter aan — alles werkt zonder, maar XP en prestaties verzamelen alleen op profielen.',
        },
        cards: {
          title: 'De karakterkaarten',
          body: 'Elke kaart toont avatar, niveau, rang en opslagmodus. Klikken selecteert het profiel en toont de details eronder.\n\nDe stip rechtsboven: groen = actief, rood = gedeactiveerd.',
          details: 'Kaartsymbolen:\n• ✓ bel: het momenteel actieve profiel (het startvenster onthoudt het)\n• Rangicoon + "Niv. X": de voortgang van het profiel\n• 💾/🌐-badge: lokaal of online opgeslagen\n• 📱-badge: dit profiel is geclaimd door een companion-apparaat\n• Vlag: het gekozen land\n\nOp een kaart klikken = selecteren. Deactiveren (rood) werkt via de voortgangskaart — gedeactiveerde profielen verdwijnen uit spelersselecties maar behouden al hun gegevens.',
        },
        progression: {
          title: 'De voortgangskaart',
          body: 'XP-balk naar het volgende niveau plus de kernstatistieken: gezongen nummers, gouden noten, beste combo en totaalscore.\n\nDe actiefschakelaar rechts deactiveert het profiel tijdelijk.',
          details: 'De statistieken begrijpen:\n• Gespeelde nummers: elke afgeronde ronde telt\n• Gouden noten: per nummer verzameld — toont hoe precies je de hoogtepunten raakt\n• Beste combo: de langste foutloze reeks aller tijden\n• Totaalscore: de som van alle scores\n\nDe actiefschakelaar: gedeactiveerde profielen verdwijnen uit spelersselectie en wachtrij (duel/duet-nummers vragen dan om herselectie) maar verliezen NIETS — heractiveren volstaat.',
        },
        settingsCard: {
          title: 'Profielinstellingen',
          body: 'Bewerk naam & avatar, wijzig land, privacyopties — en de profiel-QR-code waarmee een telefoon dit profiel kan claimen.',
          details: 'Privacy: bepaalt welke statistieken zichtbaar zijn op de globale leaderboards.\n\nQR-code tonen: genereert een code die DIRECT naar dit profiel verwijst — de telefoon die hem scant, verbindt als dit profiel (ideaal: elke zanger krijgt zijn eigen telefoon met zijn eigen profiel).\n\nVerwijderen haalt het profiel definitief weg — highscores blijven als anonieme items bestaan. Bij onlineprofielen vraagt de app nogmaals bevestiging voordat hij verwijdert.',
        },
        onlineToggle: {
          title: 'Online leaderboards',
          body: 'De schakelaar zet onlinefuncties aan: globale highscores, accountregistratie en profielsync tussen apparaten.',
          details: 'Uit = volledig offline: alles blijft lokaal, geen netwerkverzoeken voor leaderboards.\n\nAan = je krijgt het tabblad "Globaal" in de leaderboards en kunt onlineprofielen aanmaken/laden.\n\nOmschakelen geldt direct — reeds verzamelde lokale highscores blijven altijd bestaan.',
        },
        loginButton: {
          title: 'Profiel laden',
          body: 'Al geregistreerd? "Profiel laden" haalt je onlineprofiel via e-mail/sync-code naar dit apparaat — voortgang en highscores reizen mee.',
          details: 'Het aanmeldvenster kent twee wegen:\n• E-mail + wachtwoord (zoals bij de registratie)\n• Sync-code: de korte code uit je profiel — makkelijker op een vreemde machine\n\nNa het aanmelden fuseert het geladen profiel met het lokale (de hoogste voortgang wint). Syncs draaien daarna automatisch op de achtergrond.',
        },
        companionClaim: {
          title: 'Companion-claiming 📱',
          body: 'Wanneer een telefoon verbinding maakt met een profiel, toont de kaart een 📱. De telefoon zingt en selecteert onder dat profiel — naam, XP en prestaties vloeien daarheen.',
          details: 'Claiming instellen (3 wegen):\n1. Scan de QR-code in de profielinstellingen — verbindt DIRECT met dat profiel\n2. Kies op de telefoon na het verbinden een profiel uit de lijst\n3. Hier in het tabblad Mobiel van de instellingen: apparaat → profiel toewijzen\n\nEen profiel kan door maar ÉÉN apparaat tegelijk geclaimd worden. Verbreken: in het tabblad Mobiel of door de telefoon zelf.',
        },
        finish: {
          title: 'Team compleet! 🎭',
          body: 'Je weet nu hoe profielen werken — van XP tot online sync tot telefoon-claiming.\n\nGa verder met de prestaties: de rondleiding "Prestaties & Voortgang" toont wat je profiel allemaal kan verzamelen.',
        },
      },
    },

    // ═══ Wachtrijrondleiding (R29) ═══
    queue: {
      title: 'Wachtrij',
      desc: 'Nummers in de wachtrij zetten, herschikken, regels & companion-verzoeken.',
      chapters: {
        overview: 'Overzicht',
        manage: 'Beheren',
        companion: 'Companion & Sneltoetsen',
      },
      steps: {
        welcome: {
          title: 'De wachtrij 🎶',
          body: 'De wachtrij organiseert je karaoke-avond: nummers schuiven aan, iedereen komt aan de beurt — niemand hoeft de pc te bewaken.\n\nDeze rondleiding behandelt in de wachtrij zetten, sorteren en de regels.',
          details: 'Drie wegen om in de wachtrij te zetten:\n1. Bibliotheek → klik op een nummer → kies in het startvenster "Toevoegen aan wachtrij" in plaats van "Start"\n2. Na een nummer: "Volgend nummer afspelen" op het resultscherm houdt de flow gaande\n3. Via de companion-app: gasten zetten vanuit hun telefoon nummers in de wachtrij (gemarkeerd met 📱-badges)\n\nDe menubalk toont de wachtrijlengte als teller op een knop — je ziet de avond aankomen.',
        },
        navButton: {
          title: 'De wachtrijknop',
          body: 'In de menubalk leidt "Wachtrij" hierheen — het getal op de knop toont hoeveel nummers er wachten.',
        },
        title: {
          title: 'De nummerwachtrij',
          body: 'De lijst toont alle wachtende nummers met positie, modus (solo/duel/duet) en spelers — gesorteerd op het moment van toevoegen.',
        },
        empty: {
          title: 'Nog leeg',
          body: 'Nog geen nummers in de wachtrij. Voeg er enkele toe vanuit de bibliotheek (startvenster → "Toevoegen aan wachtrij") — of laat gasten via de companion-app nummers in de wachtrij zetten.',
        },
        list: {
          title: 'De wachtrijlijst',
          body: 'Elke kaart: positie, nummer, modusbadge en de spelers. Op een kaart klikken start het nummer direct — ook buiten de volgorde om.',
          details: 'De badges:\n• 🎤 Solo / ⚔️ Duel / 🎭 Duet — de modus waarmee het nummer werd toegevoegd\n• 📱 — toegevoegd via de companion-app\n\nOp een kaart klikken = nu afspelen. De ✕-knop rechts verwijdert de invoer, ▶ start hem.\n\nToetsenbord: Enter speelt, Delete verwijdert, ↑/↓ loopt door de lijst.',
        },
        reorder: {
          title: 'Volgorde wijzigen',
          body: 'Sleep kaarten naar hun nieuwe positie — alleen lokale invoeren zijn verplaatsbaar, companion-verzoeken behouden hun volgorde.',
          details: 'Slepen & neerzetten: pak een kaart en trek hem met ingedrukte knop omhoog of omlaag. De lijst toont de neerzetpositie live.\n\nWaarom companion-invoeren op hun plek blijven: de gasten-app sorteert op indientijd — als de host kon herschikken, zouden verzoeken gemanipuleerd voelen. Verwijderen kan wel.',
        },
        playNext: {
          title: 'Volgend nummer afspelen',
          body: 'De knop start de bovenste invoer — de standaardzet tussen rondes door. Klik anders direct op een willekeurige kaart.',
          details: 'Het resultscherm na elk nummer biedt dezelfde knop ("Volgend nummer afspelen") — de flow loopt door zonder omweg naar de wachtrijweergave.\n\nDe knop "Volgend nummer afspelen" in de wachtrijweergave doet hetzelfde — de bovenste invoer start met één klik.',
        },
        clearAll: {
          title: 'Alles wissen',
          body: '"Alles wissen" leegt de hele wachtrij — companion-invoeren inbegrepen. Er is geen weg terug, dus gebruik het met beleid.',
        },
        rules: {
          title: 'De regels',
          body: 'Het officiële reglement staat onderaan: max. 3 nummers per speler, FIFO-volgorde, je eigen nummers verwijderen, eerst een karakter kiezen …',
          details: 'De regels in detail:\n• Max. 3 nummers per speler tegelijk — niemand kan de wachtrij blokkeren. Wie gezongen heeft, mag opnieuw instaan.\n• FIFO: wie eerst komt, gaat eerst. Slepen & neerzetten herschikt lokaal.\n• Eigen nummers altijd verwijderbaar; die van anderen alleen via "Alles wissen" of als host.\n• Karakter eerst: de wachtrij heeft actieve profielen nodig voor duel/duet, anders vraagt hij bij de start om herselectie.\n• Companion-verzoeken dragen de 📱-badge en tellen mee als je eigen.',
        },
        companionAdd: {
          title: 'Verzoeken vanaf telefoons 📱',
          body: 'Gasten zetten nummers in de wachtrij via de companion-app — ze verschijnen met een 📱-badge in de lijst en tellen mee voor hun limiet van 3 nummers.',
          details: 'Hoe het er voor gasten uitziet: in de app een nummer kiezen, de modus kiezen, indienen — het verzoek landt in deze lijst.\n\nJij als host ziet direct: wie het vroeg (speleravatar) en dat het een telefoonverzoek is (📱). De limiet van 3 geldt per profiel — ook via de telefoon.\n\nMeer in de companion-rondleiding.',
        },
        autoplay: {
          title: 'Sneltoets & flow',
          body: 'Ctrl+Q start overal de bovenste wachtrijinvoer — de klassieker wanneer de volgende ronde direct moet rollen.',
          details: 'De flow tussen rondes: nummer eindigt → resultscherm → knop "Volgend nummer afspelen" (of Ctrl+Q) houdt de avond gaande.\n\nCtrl+Q werkt vanuit elke plek — geen omweg naar de wachtrijweergave nodig.',
        },
        finish: {
          title: 'De wachtrij wacht! 🎧',
          body: 'Je kent nu het instellen, sorteren en de regels.\n\nTip: combineer de Ctrl+Q-sneltoets + companion-verzoeken voor een karaoke-avond die vanzelf doorloopt.',
        },
      },
    },

    // ═══ Chatrondleiding (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Het paneel openen, berichten sturen, de "verzenden als"-kiezer & nummeruitdagingen.',
      chapters: {
        basics: 'De chat openen',
        usage: 'Berichten sturen',
        challenges: 'Uitdagingen',
      },
      steps: {
        welcome: {
          title: 'De partychat 💬',
          body: 'De chat verbindt desktop en companion-apps: praten zonder het zingen te onderbreken — en elkaar zelfs uitdagen tot nummerduellen.\n\nIk open het paneel zo meteen voor je.',
          details: 'Wat de chat kan:\n• Tekstberichten tussen desktop (host) en alle verbonden telefoons\n• Afzender kiezen: de host kan namens een speler schrijven\n• Nummeruitdagingen: gasten roepen duellen uit — accepteer op de desktop en ga\n\nVoorwaarde: om telefoons mee te laten praten, moeten companion-apparaten verbonden zijn (tabblad Mobiel van de instellingen — zie de companion-rondleiding).',
        },
        navButton: {
          title: 'De chat openen',
          body: 'De chatknop in de menubalk opent het paneel — het schuift als zijpaneel over het scherm en sluit met ✕ of een klik ernaast.',
        },
        panel: {
          title: 'Het chatpaneel',
          body: 'De geschiedenis staat links, je schrijft onderaan. Het paneel blijft open tot je het sluit — ook bij het wisselen van schermen.',
        },
        messages: {
          title: 'De geschiedenis',
          body: 'Jouw berichten verschijnen rechts in cyaan (als host), bijdragen van telefoons links in paars. Elk bericht draagt zijn tijdstempel.',
          details: 'Achtergrondupdates: het paneel haalt elke 3 seconden nieuwe berichten op — je mist niets, ook als het op de achtergrond draait.\n\nDe chatknop in de menubalk blijft op zijn plek — nieuwe berichten staan er direct wanneer je het paneel heropent.',
        },
        sendAs: {
          title: '"Verzenden als"',
          body: 'Jij bent de host — maar je mag namens een speler schrijven: de dropdown kiest de identiteit. 🖥️ = host, 📱 = speler.',
          details: 'Waar dit goed voor is:\n• De host typt voor iemand zonder telefoon ("Anna zegt: nog een keer het refrein!")\n• Aankondigingen op het podium namens het presentatorprofiel\n\nDe kleurstip naast de dropdown toont de spelerkleur — de geschiedenis houdt duidelijk wie er "sprak".',
        },
        input: {
          title: 'Bericht schrijven',
          body: 'Typ in het veld (max. 200 tekens) en druk op Enter — of gebruik de verzendknop.',
        },
        send: {
          title: 'Verzenden',
          body: 'Indienen met Enter of de knop — het bericht verschijnt direct in de geschiedenis én op elke verbonden telefoon.',
        },
        songChallenges: {
          title: 'Nummeruitdagingen ⚔️',
          body: 'Gasten kunnen je vanuit de app direct voor een nummer uitdagen: een uitdagingskaart verschijnt in de chat — "Uitdaging aannemen" start het duel.',
          details: 'Hoe de uitdaging verloopt:\n1. Een gast kiest een nummer in de app en tikt op "Uitdagen"\n2. De kaart verschijnt in de chat met nummer, uitdager en de accepteerknop\n3. Accepteer op de desktop — het startvenster opent met de duelmodus vooraf gekozen\n4. Zingen! De winnaar krijgt de eer (en de punten)\n\nLet op: "Verzenden als" moet op een speler staan — de tegenstander moet identificeerbaar zijn.',
        },
        companionSide: {
          title: 'Op de telefoons',
          body: 'De companion-app heeft een eigen chattabblad — daar typen gasten. Wat jij hier ziet, zien zij in realtime en omgekeerd.',
        },
        finish: {
          title: 'Bericht bezorgd! 💌',
          body: 'Je kent nu de chat — van het paneel tot de nummeruitdagingen.\n\nGecombineerd met de companion-rondleiding wordt duidelijk hoe telefoons en desktop samenwerken.',
        },
      },
    },

    // ═══ Companion-rondleiding (R29) ═══
    companion: {
      title: 'Companion App',
      desc: 'Verbind smartphones: microfoon, afstandsbediening, nummerverzoeken & meezingen.',
      chapters: {
        connect: 'Verbinden',
        features: 'Wat de app kan',
        manage: 'Apparaten beheren',
      },
      steps: {
        welcome: {
          title: 'Telefoons als accessoire 📱',
          body: 'De companion-app maakt van elke smartphone een karaoke-accessoire: microfoon, afstandsbediening, nummerkeuze en chat — geen installatie, gewoon in de browser.\n\nDeze rondleiding behandelt de desktopkant van het verhaal.',
          details: 'Het principe: de desktop is de host (muziek, noten, scores) — telefoons verbinden via het WiFi-netwerk en worden naar behoefte:\n• 🎤 Microfoons (met toonherkenning op de telefoon!)\n• 🎮 Afstandsbedieningen (schermen sturen)\n• 🎵 Nummerbrowsers met wachtrijverzoeken\n• 💬 Chatdeelnemers\n• 🪞 Live spiegels van het desktopscherm\n\nGeen app store, geen account — QR scannen, klaar.',
        },
        mobileTab: {
          title: 'Het tabblad Mobiel openen',
          body: 'De verbinding start bij Instellingen → Mobiel. Ik heb het tabblad net voor je geopend.',
        },
        qrCode: {
          title: 'De QR-code scannen',
          body: 'De grote code links is de directe route: open de camera op de telefoon, scan, en de app laadt in de browser. Belangrijk: telefoon en pc in hetzelfde WiFi-netwerk.',
          details: 'De QR-code bevat het LAN-adres van de desktop (bijv. http://192.168.1.42:3000/mobile) — daarom moeten beide apparaten in hetzelfde netwerk zitten.\n\nWerkt de code niet: de URL eronder kun je overtypen of kopiëren (knop). In openbaar WiFi zonder apparaatzichtbaarheid mislukt de verbinding helaas — gebruik dan een persoonlijke hotspot.',
        },
        connectionInfo: {
          title: 'URL & kopieerknop',
          body: 'Rechts staat het adres als tekst — met een kopieerknop om het te delen (bijv. via een messenger naar je gasten). De groene regel bevestigt het gedetecteerde netwerk-IP.',
          details: 'Tip vooraf: stuur de URL vóór het feest naar je gasten — zodra de desktop draait, verbindt iedereen direct.\n\nDe gele waarschuwing verschijnt wanneer er geen LAN-IP is gedetecteerd (bijv. zuiver localhost-gebruik) — dan kan alleen dezelfde machine erbij.',
        },
        roles: {
          title: 'De rollen van de app',
          body: 'Na het verbinden biedt de app, afhankelijk van de context:\n\n🎤 Microfoonweergave met toonweergave\n🎮 Afstandsbediening voor de desktop\n🎵 Nummerbrowser + wachtrijverzoeken\n💬 Chat\n🪞 Live spiegel van het scherm',
          details: 'De rollen in detail:\n• Microfoon: de telefoon meet de toonhoogte en zendt die live door — de desktop toont de noten alsof er een "echte" microfoon aanhangt. Werkt voor alle modi (duel ook: twee telefoons!).\n• Afstandsbediening: schermen, knoppen en bevestigingen vanaf de telefoon — ideaal voor hosts die door de ruimte lopen.\n• Nummerbrowser: de hele bibliotheek op de telefoon — inclusief voorbeeld en wachtrijverzoeken met de 📱-badge op de desktop.\n• Chat: berichten naar de desktop en andere gasten.\n• Spiegel: het desktopscherm (spel, resultaten) wordt gespiegeld op de telefoon — gasten zien alles vanuit hun stoel.',
        },
        chatRole: {
          title: 'Chat op de desktop',
          body: 'Wat gasten in de app-chat typen, landt in de desktopchat (chatknop in de menubalk) — en terug. Daarvoor bestaat een eigen chatrondleiding.',
        },
        queueRole: {
          title: 'Verzoeken in de wachtrij',
          body: 'Gasten zetten nummers in de wachtrij vanaf hun telefoon — ze verschijnen op de desktop in de wachtrij met de 📱-badge. Ook daarover bestaat een eigen rondleiding.',
        },
        singAlong: {
          title: 'Meezingmodi 🎶',
          body: 'In de partymodi Companion Sing-A-Long en Geef de Mic zingen gasten direct via hun telefoons — de toonherkenning draait op het apparaat, de desktop dirigeert.',
          details: 'Companion Sing-A-Long: elke gast krijgt songtekst + toonweergave op de telefoon — de desktop toont de gedeelde notenbaan.\n\nGeef de Mic: de microfoon gaat rond — zelfs afgewisseld tussen telefoon en fysieke microfoon.\n\nVoor beide geldt: hoe beter het WiFi, hoe vloeiender de toon. Bij haperingen helpt een apparaat dichter bij de router.',
        },
        deviceList: {
          title: 'De apparaatlijst',
          body: 'Terug in het tabblad Mobiel: alle verbonden apparaten tonen verbindingstijd, rol, toegewezen profiel en laatste activiteit — inclusief kickknop.',
          details: 'De apparaatkaart toont:\n• Verbindingsduur ("al 12 min")\n• Wat het apparaat doet (microfoon actief, afstandsbediening …)\n• Het geclaimde profiel — een dropdown wijst een ander toe\n• Kick: verbreekt het apparaat (het kan direct opnieuw verbinden)\n\nTip: geef profielen sprekende namen — de lijst blijft overzichtelijk, ook met veel gasten.',
        },
        profileClaim: {
          title: 'Profiel claimen',
          body: 'Elk apparaat kan een profiel claimen: de gast zingt daarna onder eigen naam met eigen XP — het profielscherm toont de claim met een 📱-badge.',
          details: 'Wegen om te claimen:\n1. Scan de profiel-QR in de profielinstellingen (meest direct)\n2. Kies in de app na het verbinden uit de lijst\n3. Hier in de apparaatlijst via de dropdown\n\nMeer details ook in de profielrondleiding.',
        },
        microphoneFallback: {
          title: 'Telefoon in plaats van microfoonopstelling',
          body: 'Wanneer iedereen via de telefoon zingt, kun je het microfoontabblad volledig overslaan — de app regelt de gevoeligheid zelf. Fysieke microfoons configureer je zoals getoond in het microfoontabblad.',
        },
        finish: {
          title: 'Verbonden! 🔗',
          body: 'Je weet nu hoe telefoons aanhaken en wat ze kunnen.\n\nVolgende stap: open de URL op je eigen telefoon en doe een eerste test — de microfoonmodus maakt de meeste indruk.',
        },
      },
    },

    // ═══ Prestatierondleiding (R29) ═══
    achievements: {
      title: 'Prestaties & Voortgang',
      desc: 'Prestaties, XP-niveaus, zeldzaamheden en dagelijkse uitdagingen.',
      chapters: {
        overview: 'Overzicht',
        unlock: 'Prestaties ontgrendelen',
        daily: 'Dagelijkse uitdagingen',
      },
      steps: {
        welcome: {
          title: 'Prestaties & voortgang 🏆',
          body: 'Alles wat je verzamelt: prestaties met zeldzaamheden, XP-niveaus met rangtitels en de dagelijkse uitdagingen als XP-motor.\n\nDeze rondleiding loopt langs het prestatiescherm en de uitdagingen.',
          details: 'De drie systemen samen:\n• XP: de "brandstof" — uit nummers, uitdagingen en prestaties\n• Niveaus & rangen: stijgen met XP (Beginner → Goddelijk), tonen de voortgang in één oogopslag\n• Prestaties: mijlpalen met beloningen — sommige geheim tot je ze ontgrendelt\n\nAlles hangt aan het profiel — wie zingt, verzamelt (zie de profielrondleiding).',
        },
        navButton: {
          title: 'De prestatieknop',
          body: 'In de menubalk leidt de eerste trofee naar de leaderboards (highscores) — de tweede trofee ernaast opent de prestaties.',
        },
        playerSelector: {
          title: 'Spelerselectie',
          body: 'Hierboven kies je van wie je de prestaties bekijkt — handig om met je collectie te pronken. Het getal op het profiel toont het aantal ontgrendelde.',
        },
        stats: {
          title: 'De statistiekkaarten',
          body: 'Vier kaarten in één oogopslag: ontgrendelde prestaties, de daaruit verzamelde XP, compleetheid in procent en het huidige niveau met rangnaam.',
          details: 'De procentkaart berekent: ontgrendeld ÷ alle prestaties. 100 % is de verzamelaarsdrempel — meestal beloond met een eigen geheime prestatie.\n\nDe niveaukaart toont daarnaast de rangnaam ("Leerling", "Legende", "Goddelijk" …) — de namen komen uit het voortgangssysteem van het profiel.',
        },
        filters: {
          title: 'Filters',
          body: 'Links: de statusfilters (alle / ontgrendeld / op slot). Rechts: de categorieën: prestatie, voortgang, sociaal en speciaal.',
          details: 'De categorieën betekenen:\n• Prestatie: zangprestaties (combo\'s, gouden noten, perfecte rondes)\n• Voortgang: verzamelmijlpalen (gespeelde nummers, XP-hoeveelheden, niveaus)\n• Sociaal: party- en multiplayeracties (duellen, companion-rondes)\n• Speciaal: geheimen en curiosa — de beschrijving onthult zich pas bij het ontgrendelen\n\nCombineerbaar: "Op slot + Speciaal" toont wat je nog te wachten staat.',
        },
        grid: {
          title: 'De prestatiekaarten',
          body: 'Elke kaart: icoon, naam, beschrijving, zeldzaamheid en XP-beloning. Ontgrendelde gloeien goud met een datum — vergrendelde blijven grijs.',
          details: 'De zeldzaamheden (kleurgecodeerd):\n• Gewoon — komt vanzelf met regelmatig spelen\n• Zeldzaam — vereist gerichte actie\n• Episch — zwoegen of gelukkige toevallen\n• Legendarisch — voor de weinigen\n\nOntgrendelen gebeurt automatisch zodra aan de voorwaarde is voldaan — toastmelding inbegrepen. De XP landt direct op het profiel.',
        },
        xpSystem: {
          title: 'Hoe XP stroomt',
          body: 'XP komt uit drie bronnen: gezongen nummers (per moeilijkheid), uitdagingen (dagelijks/wekelijks) en prestaties. Niveaus ontgrendelen rangen — en sommige functies zoals profielbadges.',
          details: 'XP-bronnen in één overzicht:\n• Afgerond nummer: basis-XP per moeilijkheidsgraad (makkelijk → expert, stijgend)\n• Dagelijks vak: 100–200 XP basis, ×0,5–3 per moeilijkheidsgraad, plus bonussen\n• Wekelijks vak: 250–500 XP basis, ×0,5–3 per moeilijkheidsgraad\n• Prestatie: eenmalig per prestatie (5–7500 XP naargelang de prestatie)\n\nDe niveaubalk in het profielscherm toont de weg naar het volgende niveau; de rang klimt mee met XP (Beginner → Goddelijk).',
        },
        navDaily: {
          title: 'Naar de uitdagingen',
          body: 'De dagelijkse uitdagingen hebben een eigen scherm — de sterrenknop in de menubalk leidt erheen. We navigeren er nu heen.',
        },
        playerSelection: {
          title: 'Stap 1: spelers kiezen',
          body: 'Begeleide flow: kies eerst wie speelt — pas daarna verschijnen de taken. Meerdere spelers mogelijk; de statistieken zijn van de eerste speler.',
          details: 'Waarom eerst de selectie? Vakken en statistieken zijn per profiel — zonder gekozen speler valt er niets te berekenen.\n\nDe kaart toont alle actieve profielen; selecteren door te klikken. Daarna ontvouwen stap 2 (taken) en stap 3 (spelen).',
        },
        slots: {
          title: 'Stap 2: de 5 vakken',
          body: 'Vijf taakvakken per dag, die na elkaar ontgrendelen. Elk vak toont de taak, speelbare moeilijkheidsgraden en de XP-waarde — hogere moeilijkheidsgraden vermenigvuldigen.',
          details: 'Vakmechanica:\n• Vakken 2–5 openen pas als de vorige is voltooid — de keten dwingt afwisseling af.\n• Elke taak is een voorwaarde op het volgende nummer ("genre rock", "minstens 80 % nauwkeurigheid" …) — de bibliotheek filtert automatisch passende nummers.\n• Moeilijkheidskeuze per vak: tot 3× XP-multiplier op "Gestoord".\n\nOm middernacht vallen er vijf verse taken — de keten herstart.',
        },
        badges: {
          title: 'Badges & wekelijks',
          body: 'Meerdere vakken wissen levert dagelijkse badges op (brons/zilver/goud) met extra XP. De wekelijkse tegenhanger loopt 7 dagen met vette beloningen — zelfde mechanica, grotere pot.',
          details: 'Badgeniveaus per dag:\n• Brons: 1 vak\n• Zilver: 3 vakken\n• Goud: alle 5 vakken — plus de dagelijkse bonus-XP\n\nWekelijks: 5 vakken over 7 dagen, 250–500 XP basis per vak (× moeilijkheidsmultiplier), reset op maandag. Dagelijks ÉN wekelijks spelen is aanzienlijk sneller dan nummers alleen.',
        },
        challengeModes: {
          title: 'Uitdagingsmodi',
          body: 'Naast de vakken zijn er vrije uitdagingsmodi met modifiers (bijv. "1,5× tempo", "songtekst verborgen") — voor eigen regels en extra XP buiten de dagelijkse taken om.',
          details: 'De modi zijn vrij te kiezen: kies een modus, de modifiers gelden automatisch, de XP-beloning groeit met de moeilijkheid.\n\nVoltooide modi ontgrendelen geketende vervolguitdagingen — hoe langer je speelt, hoe meer er opent.',
        },
        finish: {
          title: 'Tijd om te verzamelen! 🏅',
          body: 'Je kent nu prestaties, XP en uitdagingen — de drie motoren van voortgang.\n\nTip om te starten: speel vandaag 2 dagelijkse vakken — de rest komt vanzelf.',
        },
      },
    },
  },
};
