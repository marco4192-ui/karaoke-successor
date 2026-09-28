// DA translations — tutorial
// Based on the EN source file (same keys, same order): help menu, tour overlay,
// first-launch offer + 8 tours — every step may carry an optional `details`
// deep-dive text (shown via the "More info" button).
export const tutorialTranslations = {
  tutorial: {
    // ? help menu
    helpButtonTitle: 'Hjælp & rundturer',
    helpDialogTitle: 'Hjælp & rundturer',
    helpDialogDesc: 'Se de komplette rundturer igen — eller hop direkte til et emne og få netop dén del forklaret.',
    helpFooter: 'Tastatur i rundturen: → næste · ← tilbage · Esc afslut',
    startFullTour: 'Komplet rundtur',
    stepsCount: '{n} trin',
    completedBadge: 'Gennemført',
    // Tour groups in the help menu (R29: 8 tours need structure)
    groupGettingStarted: 'Kom godt i gang',
    groupAreas: 'Områder & funktioner',
    groupAdvanced: 'Til øvede',
    // Overlay controls
    ariaLabel: 'Guidet rundtur',
    skipTour: 'Afslut rundtur',
    back: 'Tilbage',
    next: 'Næste',
    finish: 'Færdig',
    clickHint: 'Klik på den nu',
    // "More info" expansion (R29)
    moreDetails: 'Mere info',
    lessDetails: 'Vis mindre',
    // First-launch offer
    offerTitle: 'Velkommen til Karaoke ZERO!',
    offerBody: 'Vil du have en hurtig gennemgang af det grundlæggende? På 2 minutter kender du daglige udfordringer, sangtilstande, biblioteket og selskabslegene.',
    offerStart: 'Start rundtur',
    offerLater: 'Måske senere',
    offerHint: 'Altid tilgængelig via ?-ikonet i menulinjen.',

    // ═══ Basic tour ═══
    basic: {
      title: 'Grundlæggende',
      desc: 'Den store rundtur: udfordringer, sangtilstande, bibliotek, fest & mere.',
      chapters: {
        welcome: 'Velkommen',
        challenges: 'Dagligt & ugentligt',
        singing: 'Start med at synge',
        party: 'Festtilstande',
        more: 'Flere områder',
      },
      steps: {
        welcome: {
          title: 'Velkommen! 👋',
          body: 'Dette er en live-rundtur: Jeg fremhæver de vigtige steder og forklarer dem.\n\nStyring: "Næste" (eller tasten →), "Tilbage" (←) og "Afslut rundtur" (Esc). Lad os køre!',
          details: 'Du kan sætte rundturen på pause når som helst og fortsætte senere: ?-ikonet i menulinjen åbner hjælpemenuen med alle rundturer — de kan også tages kapitel for kapitel.\n\nMange trin har en "Mere info"-knap herunder: den udfolder ekstra detaljer, mens den korte tekst forbliver der.',
        },
        heroButtons: {
          title: 'Hurtig start',
          body: '"Start med at synge" fører dig direkte til biblioteket. "Festtilstand" åbner de 9 selskabslege til grupper.',
          details: 'Hurtigstart-kortene er genveje til de mest almindelige veje:\n• "Start med at synge" = åbn biblioteket, vælg en sang, kør (solo, duel eller duet).\n• "Festtilstand" = spilsamlingen til 2–24 spillere, telefoner kan deltage som mikrofoner.\n\nAlt hvad du ser her, kan også nås via menulinjen — kortene sparer dig blot for klik.',
        },
        dailyCard: {
          title: 'Daglig udfordring',
          body: '5 brikker om dagen med skiftende opgaver — jo flere brikker du klarer, desto større XP-bonus. Nye opgaver kommer ved midnat.',
          details: 'Sådan fungerer systemet:\n• Hver af de 5 brikker rummer en anden opgavetype (f.eks. "syng en sang fra 80\'erne", "score 8000 point").\n• Brikkerne låses op i rækkefølge — brik 2 først, når brik 1 er gennemført (eller sprunget over).\n• Hver brik kan spilles i flere sværhedsgrader; de højere giver mere XP (op til 3× multiplikator).\n• Bonussen vokser med antallet af klarerede brikker: 5/5 giver den fulde daglige bonus.\n\nOpgaverne trækkes fra dit eget bibliotek — udvalget tilpasser sig altid dine sange.',
        },
        weeklyCard: {
          title: 'Ugentlig udfordring',
          body: 'Den ugentlige modstykke: 5 brikker hen over ugen med større XP-belønninger. Perfekt til langsigtede mål.',
          details: 'Ugentlige udfordringer fungerer som de daglige, men:\n• De 5 brikker løber i 7 dage — ingen daglig nulstilling, saml i dit eget tempo.\n• XP-belønningerne pr. brik er langt større (f.eks. 500–2000 XP i stedet for 100–400).\n• Nulstilling sker mandag morgen.\n\nTip: daglig og ugentlig kører parallelt — spil begge dele, så stiger du hurtigst i niveau.',
        },
        modeLauncher: {
          title: 'Syng: Solo, Duel & Duet',
          body: '🎤 Solo: én spiller, én mikrofon.\n⚔️ Duel: to spillere på SAMME sang — flest point vinder.\n🎭 Duet: to stemmer på to spor — biblioteket viser automatisk kun matchende duet-sange.',
          details: 'De tre tilstande i detaljer:\n• Solo: klassisk karaoke — du synger alle noderne, din score ryger på ranglisterne.\n• Duel: begge spillere synger samme nodespor samtidig. Pointene tæller separat — sammenligningen til sidst viser, hvem der var bedst. Perfekt til revanche.\n• Duet: sangen har to separate stemmer (P1/P2) — alle synger "deres" partier, fælles fraser giver holdbonus. Duet-sange er markeret med 🎭-filteret i biblioteket.\n\nMikrofoner: du kan tildele lige så mange mikrofoner eller smartphones, du vil (se Indstillinger → Mikrofon).',
        },
        libraryNav: {
          title: 'Biblioteket',
          body: 'Alle dine sange bor her. Søg på titel eller kunstner — fuzzy-søgningen tilgiver endda tastefejl.',
          details: 'Søgetips:\n• Fuzzy-søgningen finder "Dancing Qun" → "Dancing Queen". Den ignorerer store og små bogstaver samt enkelte tastefejl.\n• Den søger på titel, kunstner OG genre på én gang — "Rock" finder også sange med genren rock.\n\nSortering via rullemenuen (titel A–Å, kunstner, senest tilføjet). Sange kommer ind i biblioteket via import, mappescanning eller spillelister — stien dertil findes under Bibliotek-fanen i indstillingerne.',
        },
        filters: {
          title: 'Filtre',
          body: 'Genre, sprog, år, årti, duet-sange og virale hits — skær biblioteket til, lige som du vil.',
          details: 'Alle filtre kan kombineres — "Genre: Rock + Sprog: Engelsk + Æra: 80\'erne" viser præcis de engelske rocksange fra firserne.\n\nSærlige filtre:\n• Duet: kun sange med to stemmespor.\n• Virale hits: sange, der aktuelt er på de virale hitlister (data fra Indstillinger → Viral Charts).\n• Egne genrer & sprog: opret dine egne kategorier under Indstillinger → Genrer & Sprog — de dukker straks op i disse filtre.\n\n"Ryd filtre" (✕) rydder det hele på én gang.',
        },
        songCard: {
          title: 'Sange',
          body: 'Et klik på et sangkort åbner startdialogen: tilstand, spillere, mikrofoner og sværhedsgrad.',
          details: 'Hvert sangkort viser:\n• Cover samt titel/kunstner\n• Sværhedsgrad (nem/normal/svær/ekspert) og stjernerating\n• Vigtige metadata som genre og sprog — direkte fra sangen eller harmoniseret via AI (Editor → Metadata Studio).\n\nForhåndsvisnings-ikonet starter en kort teaser, uden at startdialogen åbnes.',
        },
        startModal: {
          title: 'Startdialogen',
          body: 'Sæt alt her: tilstand (solo/duel/duet), hvem der synger, hvilken mikrofon hver får, og sværhedsgraden.\n\nTryk så på "Start" — og så er du i gang!',
          details: 'De vigtigste valgmuligheder:\n• Tilstand: solo, duel (2 spillere, samme spor) eller duet (2 stemmer) — i duet-tilstand vælger begge spillere deres stemme (P1/P2).\n• Mikrofoner: hver spiller kan få sin egen inputenhed — eller en smartphone som mikrofon (companion-app).\n• Sværhedsgrad: påvirker scoringen — sværere grader tilgiver mindre og belønner præcision (højere scorepotentiale, mere XP).\n• "Tilføj til kø" i stedet for "Start": sangen sættes i kø i stedet for at starte med det samme — ideelt når flere skal synge.',
        },
        partyCard: {
          title: 'Festtilstande',
          body: '9 spil til 2–24 spillere: Battle Royale, Pass the Mic, Medley Contest, Tournament Mode, Missing Words, Blind Karaoke og mere — telefoner kan være med som mikrofoner.',
          details: 'De 9 tilstande med ét blik:\n• Battle Royale: alle synger, den svageste elimineres hver runde — sidste sanger står tilbage.\n• Pass the Mic: mikrofonen går videre fra spiller til spiller — alle synger deres del.\n• Medley Contest: hold synger korte sanguddrag med særlige regler.\n• Tournament Mode: elimineringsbracket med dueller — vinderen klatrer op for hver runde.\n• Missing Words: ord i sangteksten forsvinder — syng det manglende ord for at score.\n• Blind Karaoke: ingen nodevisning, kun ørerne!\n• Rate my Song & Companion Sing-A-Long m.m. — hvert tilstandskort forklarer sig selv.\n\nNæsten alle tilstande understøtter companion-appen som mikrofon og fjernbetjening.',
        },
        partyModes: {
          title: 'Tilstandsvælgeren',
          body: 'Her vælger du festtilstanden: Battle Royale (sidste sanger står tilbage), Pass the Mic, Tournament Mode (bracket), Medley Contest og mere.\n\nHvert kort viser, hvad der venter — ét klik åbner spillervalget.',
          details: 'Efter klik på et tilstandskort følger spillervalget: vælg profiler (eller forbind companion-enheder), og sæt derefter holdstørrelser, antal runder eller tidsgrænser alt efter tilstanden.\n\nTemafest-tip: når et tema er aktivt i indstillingerne (f.eks. "80\'er-fest"), trækker hvert sangvalg i festtilstanden automatisk kun fra matchende sange — festen holder sig på emnet.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke uden konkurrence: byg spillelister, stil sange i kø, del favoritter. Den perfekte underholder i baggrunden.',
          details: 'Jukeboxen er den afslappede tilstand:\n• Vælg spillelister eller enkelte sange som pulje.\n• Valgfri videopauser imellem, så stemningen aldrig brydes.\n• Ingen scoring, ingen mikrofoner nødvendige — sangene kører bare med sangtekst.\n\nPerfekt som underholdning hele aftenen eller som opvarmning før den første runde.',
        },
        jukeboxView: {
          title: 'Inde i jukebox-menuen',
          body: '"Gennemse spillelister" giver dig direkte adgang til alle gemte spillelister — også dem, du har oprettet i biblioteket. ét klik sætter hele spillelisten i kø.',
          details: 'Jukeboxens spillelisteindstillinger tilbyder:\n• Om videoer vises (hvis sangene har nogen)\n• Videopauser: pausevideoer mellem sange, f.eks. til meddelelser\n• Om puljen blandes eller afspilles i fast rækkefølge\n\nStarten sker i fuldskærm — afslut med Escape eller stop-knappen øverst.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores pr. sang og sværhedsgrad — slå dine venner (eller dig selv).',
          details: 'Ranglisterne husker pr. sang og sværhedsgrad:\n• Score, præcision, gyldne noder og dato\n• Hvilken spiller der står for posten (profilavatar)\n• Om posten kom via companion-appen (telefonikon) eller skrivebordet\n\nMed online-tilstand slået til (profilsiden) ser du desuden globale ranglister og konkurrerer med spillere fra andre installationer.',
        },
        highscoreView: {
          title: 'Highscore-tavlerne',
          body: 'Filtreret pr. sang og sværhedsgrad — med filterbjælken øverst. Telefonikonerne viser brug af companion-appen.',
          details: 'Filterbjælken øverst giver:\n• Søgning efter sang eller spiller\n• Filtrering efter sværhedsgrad\n• Skift mellem lokalt/globalt (når online er slået til)\n\nAnti-cheat: hver post bærer et sang-fingeraftryk — manipulerede resultater opdages og markeres.',
        },
        settingsCard: {
          title: 'Indstillinger',
          body: 'Mikrofoner, sprog, finjustering af gameplay, udseende og grafik — alle knapperne bor her.',
          details: 'De 12 indstillingsfaner hurtigt:\n• Generelt: sprog, standard sværhedsgrad, online\n• Gameplay: scoring, partikler, autoplay af køen\n• Udseende: temaer, sangtekststil, baggrund\n• Grafik / Lyd: outputenhed, lydstyrke, YouTube-kvalitet\n• Mikrofon: enheder, følsomhed, støjgrænse, presets\n• Mobil: forbind & administrér companion-enheder\n• Webcam: webcam som baggrund\n• Bibliotek: sangmappe, import, nulstilling\n• Genrer & Sprog: egne kategorier\n• Temafest: aktivér & konfigurér temaet\n• Synkronisering & Backup: sikkerhedskopier\n\nDer findes en selvstændig, grundig indstillings-rundtur til alle fanerne i ?-hjælpemenuen.',
        },
        settingsView: {
          title: 'Indstillingsfanerne',
          body: 'Vælg en sektion i toppen: Generelt (sprog), Gameplay, Udseende, Grafik / Lyd, Mikrofon, Mobil (telefonforbindelse) og mere.',
          details: 'Siden R28 forklarer en kort intro-tekst øverst i hver fane, hvad den gør — du behøver aldrig gætte, hvor en indstilling hører hjemme.\n\nDen matchende rundtur: "Indstillinger" i ?-hjælpemenuen går gennem alle fanerne.',
        },
        finish: {
          title: 'Færdig! 🎉',
          body: 'Nu kender du det grundlæggende.\n\nTip: ?-ikonet i menulinjen bringer dig tilbage når som helst — også til enkelte emnekapitler, editor-rundturen og indstillings-rundturen.',
          details: 'Hvad nu? Et par forslag til dine første minutter:\n1. Opret en profil (Profiler i menulinjen) — uden en spiller du, men samler ingen XP.\n2. Importér sange (Indstillinger → Bibliotek).\n3. Et par runder daglig udfordring for XP-boostet.\n4. Venner på vej? Prøv festtilstanden — companion-appen gør enhver telefon til en mikrofon (der findes en selvstændig companion-rundtur).',
        },
      },
    },

    // ═══ Editor tour ═══
    editor: {
      title: 'Editor-rundtur',
      desc: 'Noder, sangtekster, stemmer & harmonisering — sangens værktøjskasse.',
      chapters: {
        entry: 'Adgang',
        layout: 'Layout',
        notes: 'Noderedigering',
        extras: 'Ekstra & harmonisering',
      },
      steps: {
        welcome: {
          title: 'Editoren ✏️',
          body: 'Her bliver sange til spilbare karaoke-spor: placér noder, tilpas sangtekst-timing, tildel stemmer.\n\nSandbox-tip: øv dig på en testsang — ændringer kan fortrydes med Ctrl+Z.',
          details: 'Editoren arbejder med UltraStar-formatet: hver node har en starttid, en varighed, en tonehøjde og en tekst (stavelse). Mange noder danner den note-highway, du ser i spillet.\n\nKilder til nye sange:\n• Tekstimport (UltraStar/TXT) i editoren\n• MIDI-import (noder genereres fra MIDI)\n• AI-harmonisering: sangtekst + lyd → nodeforslag\n\nAlt er ikke-destruktivt: indtil du gemmer, forbliver originalsangen urørt.',
        },
        songList: {
          title: 'Sangvalg',
          body: 'Søg en sang for at åbne den. Filtre afslører sange med manglende metadata — dem harmoniserer editoren senere.',
          details: 'Filterchipsene over listen viser sange uden genre/sprog/år — den hurtigste vej til sange, som Metadata Studio endnu ikke har behandlet.\n\nSøgningen dækker titel og kunstner — store og små bogstaver spiller ingen rolle.',
        },
        noSongs: {
          title: 'Endnu ingen sange',
          body: 'Editoren kræver sange i biblioteket. Importér først sange (bibliotek → import / mappescanning) og kom tilbage.',
          details: 'Sådan kommer du til sange:\n• Indstillinger → Bibliotek → vælg sangmappen: hver undermappe læses som én sang (lyd/video + UltraStar-tekst).\n• Alternativt enkelte filer via importdialogen.\n• Eller opret en ny sang i editoren ("Ny sang") og sæt sangtekst + lyd sammen selv.',
        },
        openSong: {
          title: 'Åbn en sang',
          body: 'Klik på en sang i listen nu for at åbne den i editoren.',
          details: 'Når sangen er åben, ser du værktøjslinjen (underheaderen) øverst og tidslinjen med bølgeform, nodespor og sangtekst.\n\nSangen forbliver åben, indtil du lukker den via "Tilbage" — ugemte ændringer beder først om bekræftelse.',
        },
        leftPanel: {
          title: 'Værktøjslinje',
          body: 'Alt til noderne: tilføj, duplikér, slet, opdel, flet — plus nodetyper, stemmer og tap-tilstand (det kommer om lidt).',
          details: 'Værktøjerne i rækkefølge:\n• ➕ Tilføj node: lander ved afspilningshovedet\n• ⧉ Duplikér: kopierer den valgte node lige bag den\n• 🗑 Slet: fjerner markeringen\n• ✂ Opdel: én node → to (på midten)\n• ⇄ Flet: to valgte → én\n\nMarkér ved at klikke; shift-klik markerer flere. Så tager tastaturet over: ⌫ sletter, ↑/↓ transponerer, ←/→ forskubber.',
        },
        lyricsPanel: {
          title: 'Sangtekstpanelet',
          body: 'Sangtekstlinjerne ligger til venstre. Dobbeltklik på en linje for at springe afspilningen dertil — tekst og timing kan redigeres her.',
          details: 'Sangtekstpanelet er både tekst OG timing:\n• Klik på en stavelse markerer den tilhørende node i tidslinjen.\n• Dobbeltklik springer til stedet (afspilningen følger med).\n• Højreklik (eller pen-ikonet) åbner linjeredigering: ændr tekst, opdel stavelser ved ordgrænser, forskub hele linjens timing.\n\nOpdelingen ved ordgrænser genkender sproget og fordeler stavelserne fornuftigt på ordene — ikke mere manuelt snit.',
        },
        subHeaderTools: {
          title: 'Noderedigering',
          body: 'Noder er blokkene på nodesporerne: tilføj, duplikér, slet, opdel (én node → to) og flet (to → én).\n\nRedigér valgte noder i tempo: ⌫ sletter, ↑/↓ transponerer.',
          details: 'Præcisionstips:\n• Zoom: Ctrl+musehjul over tidslinjen — zoom ind for fin timing.\n• Afspilning: mellemrumstasten skifter afspil/pause, Shift+mellemrum afspiller kun markeringen.\n• Transponér flere noder: markér dem alle, ↑/↓ flytter hele bundtet.\n\nTil timingen: nodens start skal ramme stavelsens ansats i vokalen — bølgeformen hjælper med at finde ansatserne.',
        },
        noteTypes: {
          title: 'Nodetyper',
          body: '5 typer til nye noder:\n: Normal (tonehøjde tæller)\n* Gylden (ekstra point)\nF Freestyle (enhver tone tæller)\nR Rap (kun timing)\nG Rap-gylden',
          details: 'Hvad hver type betyder i spillet:\n• Normal (:): den klassiske senode — tonehøjde og timing tæller.\n• Gylden (*): vises gyldent, dobbelte point ved træffere. Perfekt til sangens højdepunkter.\n• Freestyle (F): tonehøjden er ligegyldig, kun tekst/timing tæller — godt til talte partier.\n• Rap (R): dømmer timing og rytme i stedet for melodi.\n• Rap-gylden (G): som rap, men med ekstra point.\n\nTypen kan ændres senere: markér noden og vælg en ny type i værktøjslinjen.',
        },
        voices: {
          title: 'Stemmer',
          body: 'P1 = spiller 1, P2 = spiller 2 (duet!), P4/P8 = tredje/fjerde stemme. Hver node tilhører en stemme — sådan laves duet-sange med separate partier.',
          details: 'Stemmetildeling:\n• Stemme-rullemenuen vælger sporet, som nye noder lander på.\n• Placerede noder kan flyttes: markér og skift stemme.\n• I duet-tilstand i spillet vælger hver spiller sit spor — biblioteket filtrerer automatisk sange med mindst 2 stemmer.\n\nP4/P8 tillader endda kvartet-opsætninger; hovedspiltilstandene bruger P1/P2.',
        },
        tapMode: {
          title: 'Tap-tilstand — turboen 🥁',
          body: 'Hold tasten nede og tap med: hvert klik placerer en node ved den aktuelle afspilningsposition, sanglinje for sanglinje. Skab noder i realtid.',
          details: 'Sådan forløber en tap-optagelse:\n1. Aktivér tap-tilstand i værktøjslinjen.\n2. Start afspilningen — sangen kører med hørlig lyd.\n3. Klik i stavelsernes rytme — hver interaktion placerer en node ved afspilningshovedet med den senest valgte tonehøjde.\n4. Puds derefter efter: ret tonehøjder (↑/↓ på valgte noder) og justér varigheder.\n\nTap-tilstand er 5–10× hurtigere end at placere noder i hånden — hele sange på minutter i stedet for timer.',
        },
        panels: {
          title: 'Paneler i headeren',
          body: 'Tre paneler øverst til højre: metadata (genre/sprog/år), lydanalyse og AI-assistenten.',
          details: 'Hvad de tre paneler gør:\n• Metadata: redigér genre, sprog og år på den åbne sang direkte — fodrer filtre og temafest.\n• Lydanalyse: analyserer lydfilen (lydstyrke, toneart, BPM) og foreslår værdier.\n• AI-assistent: sangtekstfuldførelse, sanggenkendelse og node-harmonisering via AI — kræver en konfigureret AI-udbyder (Indstillinger → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Harmoniserings-turboen: AI- og regel-forslag til genre, sprog og år — med lyt-før-tildeling, manuel finredigering og en revisionskø til usikre matches.',
          details: 'Studiets arbejdsgang:\n1. "Analysér alle sange" — regelmotoren (filstier, tags) og eventuelt AI foreslår genre/sprog/år.\n2. Forslagene har konfidens: grøn = sikker, gul = gennemgå.\n3. Lyt: klik på en sang afspiller et uddrag — verificér forslagene på den hurtige måde.\n4. Tildel enkeltvis eller "anvend alle grønne".\n\nRevisionskøen samler usikre matches til senere — intet går tabt.',
        },
        shortcuts: {
          title: 'Genveje',
          body: 'Alle tastaturgenveje med ét blik — editoren er et tastaturinstrument. Klik dig igennem!',
          details: 'De vigtigste genveje:\n• Ctrl+Z / Ctrl+Y: fortryd / gendan\n• Mellemrum: afspil/pause\n• ⌫: slet valgte noder\n• ↑/↓: transponér · ←/→: forskub i tid\n• S: opdel node · M: flet\n• 1–5: vælg nodetype\n\nInde i genvejspanelet kan du se og ændre tastetildelinger.',
        },
        finish: {
          title: 'Klar til at bygge! 🛠️',
          body: 'Nu kender du editorens værktøjskasse.\n\nHusk: Ctrl+Z redder det hele, og ?-ikonet i menulinjen bringer dig tilbage til disse kapitler når som helst.',
          details: 'Anbefalet rækkefølge til en ny sang:\n1. Tilføj lyd/video (sanginfo-fanen)\n2. Importér eller skriv sangtekst (sangtekst-fanen)\n3. Tap noder (tap-tilstand) eller AI-harmonisering\n4. Vedligehold metadata (genre/sprog/år — vigtigt for filtre!)\n5. Gem — fra nu af vises sangen i biblioteket.',
        },
      },
    },

    // ═══ Settings tour (R28) ═══
    settings: {
      title: 'Indstillinger',
      desc: 'Alle indstillinger med ét blik: faner, generelle indstillinger, lyd, bibliotek, companion-enheder og backup.',
      chapters: {
        overview: 'Overblik',
        basics: 'Basale indstillinger',
        sound: 'Lyd & Mikrofon',
        library: 'Bibliotek & Tema',
        devices: 'Enheder & Companion',
        data: 'Synk, Backup & Info',
      },
      steps: {
        welcome: {
          title: 'Indstillingerne 👋',
          body: 'Denne rundtur går udelukkende gennem indstillingerne — fane for fane.\n\nJeg skifter automatisk til hver fane og forklarer, hvad du finder der.',
          details: 'Fanerne i rundtur-rækkefølge: Generelt, Gameplay, Udseende, Grafik / Lyd, Mikrofon, Mobil (companion), Webcam, Bibliotek, Genrer & Sprog, Temafest, Viral Charts, Synk & Backup samt Om.\n\nHver fane har en kort intro øverst — denne rundtur uddyber den trin for trin.',
        },
        tabBar: {
          title: 'Fanebjælken',
          body: 'Alle indstillinger er organiseret i faner: Generelt, Gameplay, Udseende, Lyd, Mikrofon, Mobil, Webcam, Bibliotek, Genrer & Sprog, Temafest, Synk & Backup og Om.\n\nSiden R28 forklarer en kort intro-tekst øverst i hver fane, hvad den gør.',
          details: 'Hjælp til orientering — spørg dig selv, når du leder…\n• "Hvordan OPFØRER spillet sig?" → Gameplay\n• "Hvordan SER det ud?" → Udseende\n• "Hvordan LYDER det?" → Grafik / Lyd / Mikrofon\n• "Forbinde enheder?" → Mobil (companion) / Mikrofon\n• "Mine sange?" → Bibliotek\n• "Sikkerhedskopiere data?" → Synk & Backup\n\nFanerne ruller vandret i smalle vinduer — bare swipe til højre.',
        },
        general: {
          title: 'Generelt',
          body: 'Grænsefladesprog, standard sværhedsgrad, online-aktiviteter og den komplette oversigt over tastaturgenveje.',
          details: 'Sprog: 16 sprog er tilgængelige. Skiftet slår igennem live i hele grænsefladen.\n\nStandard sværhedsgrad: gælder for nye runder, medmindre startdialogen vælger en anden.\n\nOnline-aktiviteter styrer, om highscores uploades globalt, og om daglige udfordringer genereres online.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Scoring til/fra, partikeleffekter, autoplay af køen og flere adfærdsvalg for runder og resultater.',
          details: 'De vigtigste til/fra-valg:\n• Scoring: til ren sjov-sang uden scorevisning.\n• Autoplay af køen: efter en sang starter det næste punkt i køen automatisk — ideelt til festaftener uden moderator.\n• Partikler & effekter: deaktivér på svagere maskiner.\n\nDesuden: adfærd efter runder (resultatskærm, genstart med det samme) og combo-visninger.',
        },
        appearance: {
          title: 'Udseende',
          body: 'Temaer, animeret baggrund eller din egen baggrundsvideo, sangtekststil og -størrelse, nodevisning og ydelsestilstanden til svagere maskiner.',
          details: 'Sangtekststil: "Karaoke" (farvelægning efter udfyldning), "UltraStar" (stavelsesblokke) eller "Minimal".\n\nBaggrund: ud over temaer kan en egen video bruges — i spillet kører den bag noderne, nedtonet.\n\nYdelsestilstanden skærer kraftigt ned på animationer og baggrunde — det kan betale sig fra ca. 2015-hardware.',
        },
        graphicsound: {
          title: 'Lyd',
          body: 'Outputenhed (inkl. ASIO), hoved- og forhåndslydstyrke, mikrofonfølsomhed, lydstyrke-normalisering og YouTube-videokvalitet.',
          details: 'ASIO: kun relevant for Windows + ASIO-kapable lydkort — reducerer latenstiden ved mikrofonovervågning.\n\nLydstyrke-normalisering udjævner lydstyrkeforskelle mellem sange — standardværdierne er godt valgt.\n\nYouTube-kvalitet: påvirker sange med YouTube-videokilde; højere kvalitet = mere båndbredde.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Valg af enhed, følsomhed, støjgrænse og live-niveau — plus presets. Smartphones forbindes via Mobil-fanen.',
          details: 'Presets: typiske opsætninger ("dynamisk vokalmikrofon", "headset", "telefon") sætter følsomhed + støjgrænse i fornuftige kombinationer.\n\nStøjgrænse: filtrerer åndedræt og rumstøj — live-niveauet viser i realtid, hvad der slipper igennem.\n\nVigtigt til multiplayer: HVER spiller kan få sin EGEN enhed — tildelingen sker i startdialogen pr. runde.',
        },
        libraryTab: {
          title: 'Bibliotek',
          body: 'Vælg sangmappen (hver undermappe = én sang) og skan den, nulstil biblioteket eller slet alle data — plus importen fra andre karaoke-systemer.',
          details: 'Mappeformat: én undermappe pr. sang med lyd/video + TXT (UltraStar-format). Scanneren genkender almindelige kombinationer (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport fra andre systemer: et SingStar-arkiv? En UltraStar-samling? Import-konverteren overtager automatisk metadata og sangtekster.\n\nPas på med "slet alle data": den dobbelte bekræftelse spørger to gange — tag stadig en backup først (fanen Synk & Backup).',
        },
        taxonomy: {
          title: 'Genrer & Sprog',
          body: 'Opret dine egne genre- og sprogposter — de vises i alle rullemenuer og indgår i AI-harmoniseringen.',
          details: 'Hvorfor egne poster? Standardlisterne dækker ikke alt ("Schlager", "K-Pop", "Dialekt" …). Egne poster:\n• dukker straks op i biblioteksfiltrene\n• kan vælges i editoren og Metadata Studio\n• harmoniseres med (AI\'en foreslår dem til matchende sange)\n\nSletning virker også — sange beholder posten, indtil den tildeles på ny.',
        },
        motto: {
          title: 'Temafest',
          body: 'Stil hele spillet på et tema (f.eks. en 80\'er-fest): når temaet er aktivt, erstatter det alle søgefelter og filtre — hvert sangvalg trækker kun fra matchende sange.',
          details: 'Temafiltret kender flere felter, frit kombinerbare (AND-logik):\n• Genre (f.eks. rock)\n• Sprog (f.eks. engelsk)\n• Æra/år (f.eks. 1980–1989)\n\nEffekt: bibliotek, sangvalg i festtilstand OG companion-appen viser kun temapuljen — gæsterne kan ikke vælge noget uden for emnet.\n\nDeaktivering af temaet genskaber straks den normale visning; spillede sange/highscores forbliver urørte.',
        },
        mobile: {
          title: 'Mobil & Companion',
          body: 'Forbind smartphones via QR-kode — som mikrofon, fjernbetjening eller syng-med-enhed. Du ser alle tilsluttede enheder og deres forbindelseskoder.',
          details: 'Forbindelse: scan QR-koden (samme WiFi!) eller skriv URL\'en — den selvstændige companion-rundtur forklarer detaljerne i ?-hjælpemenuen.\n\nDenne fane viser også:\n• Alle tilsluttede enheder med status (aktiv, rolle, seneste aktivitet)\n• Tildeling af profiler til enheder\n• Frakobling af enkelte enheder\n\nDe profilspecifikke QR-koder (til tilknytning) ligger i profilsidens indstillingskort.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Brug webcammet som animeret sangbaggrund: opløsning, spejling, mætning, sløring og flere effekter — med live forhåndsvisning.',
          details: 'Webcam-baggrunden kører bag noderne under sangen — I kan se jer selv synge!\n\nEffekter: spejling (som et selfie), mætning, blød sløring, sepia — straks synlige i live-forhåndsvisningen.\n\nPrivatliv: kameraet kører udelukkende lokalt, intet gemmes eller sendes.',
        },
        sync: {
          title: 'Synk & Backup',
          body: 'Opret og gendan backups, synkronisér data mellem enheder. I desktop-builden spejles spillernes data desuden permanent til AppData-mappen.',
          details: 'En backup indeholder: profiler (med XP/fremskridt), highscores, indstillinger og spillelister — som én fil til arkivering eller flytning.\n\nAppData-spejlet (desktop-build) beskytter mod datatab i browseren: selv hvis browserlageret ryddes, gendanner desktop-builden alt.\n\nGendannelse overskriver aktuelle data — igen: tag backup først.',
        },
        about: {
          title: 'Om',
          body: 'Version, platform, licenser og medvirkende projekter — Karaoke ZEROs digitale kolofon.',
          details: 'Du ser også byggekanalen (web/desktop) og kan søge efter opdateringer. Licenserne oplister de anvendte open source-projekter — tak til alle involverede!',
        },
        finish: {
          title: 'Fuldt konfigureret! ⚙️',
          body: 'Nu kender du alle indstillingerne.\n\n?-ikonet i menulinjen bringer dig tilbage til denne rundtur når som helst — gerne kapitel for kapitel.',
          details: 'Anbefaling til din første opsætningsaften:\n1. Bibliotek-fanen: skan sangmappen\n2. Mikrofon-fanen: vælg en preset + tjek live-niveauet\n3. Mobil-fanen: forbind telefoner (companion-rundturen!)\n4. Tema-fanen: overvej et festtema\n5. Synk & Backup: tag den første backup\n\nMed det er karaokeaftenen på skinner.',
        },
      },
    },

    // ═══ Profile tour (R29) ═══
    profile: {
      title: 'Profiler & Karakterer',
      desc: 'Opret spillere, følg XP & fremskridt, online-synkronisering og companion-tilknytning.',
      chapters: {
        overview: 'Overblik',
        characters: 'Karakterer & Fremskridt',
        online: 'Online & Companion',
      },
      steps: {
        welcome: {
          title: 'Dine spillerprofiler 👤',
          body: 'Profiler er identiteterne i spillet: XP, niveau, statistik og præstationer lever på profilen — og highscores bærer dit navn.\n\nDenne rundtur viser, hvordan profiler oprettes og administreres.',
          details: 'Hvorfor profiler?\n• XP & niveau: sungne sange, udfordringer og præstationer samler erfaring — niveauet stiger sammen med rangtitlen (nybegynder → karaoke-legende).\n• Ranglister: highscore-poster viser din avatar.\n• Festtilstande: hvert spillervalg trækker fra denne liste.\n• Companion-enheder kan "tilknytte" en profil og synge under dens identitet.\n\nProfiler lever i browserlagring (lokalt) eller i en onlinekonto (synkroniseret) — det vælger du ved oprettelsen.',
        },
        topBar: {
          title: 'Handlingsbjælken',
          body: 'Heroppe slår du online-ranglister til/fra, skifter mellem lokalt/globalt og åbner oprettelsesformularen til nye profiler.',
          details: 'Bjælkens elementer:\n• Online-kontakt: aktiverer/deaktiverer online-funktioner globalt (ranglister, kontoregistrering)\n• Lokalt/Globalt: hvilken tabel highscorevisningen viser\n• "Indlæs profil": logger dig ind med en synkroniseringskode og henter din onlineprofil til denne enhed\n• "Ny profil": åbner oprettelsesformularen (næste trin)',
        },
        createButton: {
          title: 'Oprettelse af profil',
          body: '"Ny profil" åbner formularen: navn, avatarbillede, land og lagringstilstand (lokalt eller med onlinekonto).',
          details: 'Formularfelterne:\n• Navn: vises på ranglister og til fester\n• Avatar: upload dit eget billede — eller et initialbogstav på en farve\n• Land: flag til globale ranglister\n• Lagringstilstand: "Lokalt" gemmer kun på denne enhed; "Online" registrerer valgfrit en konto (e-mail + adgangskode) og tillader synkronisering på tværs af enheder.\n\nOnlinekontoer findes kun med online-tilstand slået til — registreringen kører i baggrunden, og profilen kan bruges med det samme.',
        },
        empty: {
          title: 'Endnu ingen profiler',
          body: 'Her tager dine spillere form. Klik på "Ny profil" og opret den første karakter — alt virker uden en, men XP og præstationer samles kun på profiler.',
        },
        cards: {
          title: 'Karakterkortene',
          body: 'Hvert kort viser avatar, niveau, rang og lagringstilstand. Klik markerer profilen og viser dens detaljer nedenunder.\n\nPrikken øverst til højre: grøn = aktiv, rød = deaktiveret.',
          details: 'Kort-symbolerne:\n• ✓-boble: den aktuelt aktive profil (startdialogen husker den)\n• Rang-ikon + "Lv. X": profilens fremskridt\n• 💾/🌐-badge: gemt lokalt eller online\n• 📱-badge: denne profil er tilknyttet en companion-enhed\n• Flag: det valgte land\n\nKlik på et kort = vælg det. Deaktivering (rød) sker i fremskridtskortet — deaktiverede profiler forsvinder fra spillervalg, men beholder alle deres data.',
        },
        progression: {
          title: 'Fremskridtskortet',
          body: 'XP-linje til næste niveau plus kerne-statistikken: sungne sange, gyldne noder, bedste combo og samlet score.\n\nAktiv-kontakten til højre deaktiverer profilen midlertidigt.',
          details: 'Statistikken forklaret:\n• Spillede sange: hver afsluttet runde tæller\n• Gyldne noder: samles pr. sang — viser, hvor præcist du rammer højdepunkterne\n• Bedste combo: den længste fejlfri stime nogensinde\n• Samlet score: summen af alle scores\n\nAktiv-kontakten: deaktiverede profiler forsvinder fra spillervalg og kø (duet-/duel-sange beder så om nyt valg), men mister INTET — det er nok at genaktivere.',
        },
        settingsCard: {
          title: 'Profilindstillinger',
          body: 'Redigér navn & avatar, skift land, privatlivsvalg — og profil-QR-koden, der lader en telefon tilknytte denne profil.',
          details: 'Privatliv: styrer, hvilke statistikker der er synlige på globale ranglister.\n\nVis QR-kode: genererer en kode, der peger DIREKTE på denne profil — telefonen, der scanner den, forbinder som denne profil (ideelt: hver sanger får sin telefon med sin profil).\n\nSletning fjerner profilen permanent — highscores forbliver som anonyme poster. Ved onlineprofiler spørger appen igen før sletningen.',
        },
        onlineToggle: {
          title: 'Online-ranglister',
          body: 'Kontakten aktiverer online-funktioner: globale highscores, kontoregistrering og profilsynkronisering mellem enheder.',
          details: 'Fra = helt offline: alt forbliver lokalt, ingen netværkskald til ranglister.\n\nTil = du får fanen "Global" i ranglisterne og kan oprette/indlæse onlineprofiler.\n\nSkiftet slår igennem med det samme — allerede indsamlede lokale highscores forsvinder aldrig.',
        },
        loginButton: {
          title: 'Indlæsning af profil',
          body: 'Allerede registreret? "Indlæs profil" henter din onlineprofil via e-mail/synkroniseringskode til denne enhed — fremskridt og highscores kommer med.',
          details: 'Logindialogen kender to veje:\n• E-mail + adgangskode (som ved registrering)\n• Synkroniseringskode: den korte kode fra din profil — nemmere på en fremmed maskine\n\nEfter login flettes den indlæste profil sammen med den lokale (den højeste fremdrift vinder). Synkronisering kører derefter automatisk i baggrunden.',
        },
        companionClaim: {
          title: 'Companion-tilknytning 📱',
          body: 'Når en telefon forbinder med en profil, viser kortet et 📱. Telefonen synger og vælger under den profil — navn, XP og præstationer samles der.',
          details: 'Sådan sættes tilknytning op (3 veje):\n1. Scan QR-koden i profilindstillingerne — forbinder DIREKTE med den profil\n2. På telefonen efter tilslutning: vælg en profil fra listen\n3. Her i indstillingsfanen Mobil: enhed → tildel profil\n\nEn profil kan kun tilknyttes ÉN enhed ad gangen. Frakobling: i Mobil-fanen eller fra telefonen selv.',
        },
        finish: {
          title: 'Holdet er komplet! 🎭',
          body: 'Nu ved du, hvordan profiler virker — fra XP til online-synk til telefon-tilknytning.\n\nFortsæt med præstationer: rundturen "Præstationer & Fremskridt" viser, hvad din profil kan samle.',
        },
      },
    },

    // ═══ Queue tour (R29) ═══
    queue: {
      title: 'Kø',
      desc: 'Stil sange i kø, sortér, regler & companion-ønsker.',
      chapters: {
        overview: 'Overblik',
        manage: 'Administration',
        companion: 'Companion & Autoplay',
      },
      steps: {
        welcome: {
          title: 'Køen 🎶',
          body: 'Køen organiserer din karaokeaften: sangene stiller op, alle får en tur — ingen skal passe computeren.\n\nDenne rundtur dækker kø-stilling, sortering og reglerne.',
          details: 'Tre veje til køen:\n1. Bibliotek → klik på en sang → vælg "Tilføj til kø" i stedet for "Start" i startdialogen\n2. Efter en sang: "Afspil næste sang" på resultatskærmen holder flowet gående\n3. Via companion-appen: gæster stiller sange i kø fra deres telefoner (markeret med 📱-badges)\n\nMenulinjen viser køens længde som tællerknap — du kan se aftenen komme.',
        },
        navButton: {
          title: 'Kø-knappen',
          body: 'I menulinjen fører "Kø" hertil — tallet på knappen viser, hvor mange sange der venter.',
        },
        title: {
          title: 'Sangkøen',
          body: 'Listen viser alle ventende sange med position, tilstand (solo/duel/duet) og spillere — sorteret efter kø-tidspunkt.',
        },
        empty: {
          title: 'Stadig tom',
          body: 'Endnu ingen sange i køen. Tilføj nogle fra biblioteket (startdialog → "Tilføj til kø") — eller lad gæsterne stille i kø via companion-appen.',
        },
        list: {
          title: 'Kø-listen',
          body: 'Hvert kort: position, sang, tilstands-badge og spillerne. Klik på et kort starter sangen med det samme — også ude af rækkefølge.',
          details: 'Badges:\n• 🎤 Solo / ⚔️ Duel / 🎭 Duet — tilstanden sangen blev stillet i kø med\n• 📱 — tilføjet via companion-appen\n\nKlik på et kort = afspil nu. ✕-knappen til højre fjerner posten, ▶ starter den.\n\nTastatur: Enter afspiller, Delete fjerner, ↑/↓ bevæger sig gennem listen.',
        },
        reorder: {
          title: 'Ændring af rækkefølgen',
          body: 'Træk kortene til deres nye position — kun lokale poster kan flyttes, companion-ønsker beholder deres rækkefølge.',
          details: 'Træk & slip: tag fat i et kort og træk op eller ned med knappen holdt nede. Listen viser slippepositionen live.\n\nHvorfor companion-poster står fast: gæsteappen sorterer efter indsendelsestid — hvis værten kunne omrokere, ville ønskerne føles manipulerede. Du kan stadig fjerne dem.',
        },
        playNext: {
          title: 'Afspil næste sang',
          body: 'Knappen starter den øverste post — standardtrækket mellem runder. Alternativt: klik direkte på et hvilket som helst kort.',
          details: 'Resultatskærmen efter hver sang tilbyder den samme knap ("Afspil næste sang") — flowet fortsætter uden omvejen til kø-visningen.\n\nMed autoplay slået til (Indstillinger → Gameplay) fortsætter appen automatisk.',
        },
        clearAll: {
          title: 'Ryd alt',
          body: '"Ryd alt" tømmer hele køen — også companion-poster. Der er ingen vej tilbage, så brug den med omtanke.',
        },
        rules: {
          title: 'Reglerne',
          body: 'Den officielle regelbog ligger i bunden: maks. 3 sange pr. spiller, FIFO-rækkefølge, fjern dine egne sange, vælg en karakter først …',
          details: 'Reglerne i detaljer:\n• Maks. 3 sange pr. spiller ad gangen — ingen kan blokere køen. Hvem der har sunget, må stille i kø igen.\n• FIFO: først ind = først fremme. Træk & slip sorterer lokalt.\n• Egne sange kan fjernes når som helst; andres kun via "Ryd alt" eller som vært.\n• Karakter først: køen kræver aktive profiler til duel/duet, ellers bedes der om nyt valg ved start.\n• Companion-ønsker viser 📱-badges og tæller som egne.',
        },
        companionAdd: {
          title: 'Ønsker fra telefoner 📱',
          body: 'Gæster stiller sange i kø via companion-appen — de vises med et 📱-badge på listen og tæller med i deres grænse på 3 sange.',
          details: 'Sådan ser det ud for gæsterne: vælg en sang i appen, vælg tilstand, send — ønsket lander i denne liste.\n\nDu som vært ser straks: hvem der har ønsket (spiller-avatar), og at det er et telefonønske (📱). Grænsen på 3 gælder pr. profil — også via telefon.\n\nMere i companion-rundturen.',
        },
        autoplay: {
          title: 'Autoplay & genvej',
          body: 'Slå autoplay til (Indstillinger → Gameplay), så den næste sang starter automatisk efter hver runde. Og: Ctrl+Q starter den øverste kø-post fra hvor som helst.',
          details: 'Autoplay-kæden: sangen slutter → resultatet vises kort → den næste kø-post starter. Når køen løber tom, stopper kæden rent.\n\nCtrl+Q virker fra alle steder — klassikeren, når den næste runde skal rulle med det samme.',
        },
        finish: {
          title: 'Køen venter! 🎧',
          body: 'Nu kender du kø-stilling, sortering og reglerne.\n\nTip: kombiner autoplay + companion-ønsker til en helt selvkørende karaokeaften.',
        },
      },
    },

    // ═══ Chat tour (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Åbn panelet, send beskeder, "send som"-vælgeren & sangudfordringer.',
      chapters: {
        basics: 'Åbning af chatten',
        usage: 'Beskeder',
        challenges: 'Udfordringer',
      },
      steps: {
        welcome: {
          title: 'Fest-chatten 💬',
          body: 'Chatten forbinder skrivebord og companion-apps: snak uden at afbryde sangen — og udfordr endda hinanden til sang-dueller.\n\nJeg åbner panelet for dig om et øjeblik.',
          details: 'Hvad chatten kan:\n• Tekstbeskeder mellem skrivebord (vært) og alle tilsluttede telefoner\n• Afsendervalg: værten kan skrive på vegne af en spiller\n• Sangudfordringer: gæster udfordrer til dueller — acceptér på skrivebordet og kør\n\nForudsætning: for at telefoner kan deltage i samtalen, skal companion-enheder være forbundet (Mobil-fanen i indstillingerne — se companion-rundturen).',
        },
        navButton: {
          title: 'Åbning af chatten',
          body: 'Chat-knappen i menulinjen åbner panelet — det glider ind som et sidepanel over skærmen og lukkes med ✕ eller et klik ved siden af.',
        },
        panel: {
          title: 'Chat-panelet',
          body: 'Historikken løber til venstre, du skriver i bunden. Panelet forbliver åbent, indtil du lukker det — også ved skærmskift.',
        },
        messages: {
          title: 'Historikken',
          body: 'Dine beskeder vises til højre i cyan (som vært), bidrag fra telefoner til venstre i lilla. Hver besked bærer sit tidsstempel.',
          details: 'Baggrundsopdatering: panelet henter nye beskeder hvert 3. sekund — du går ikke glip af noget, selv når det kører i baggrunden.\n\nSkrivebordets chat-notifikation (klokken) viser ulæste beskeder, også med panelet lukket.',
        },
        sendAs: {
          title: '"Send som"',
          body: 'Du er værten — men du må skrive på vegne af en spiller: rullemenuen vælger identiteten. 🖥️ = vært, 📱 = spiller.',
          details: 'Hvad det er godt til:\n• Værten taster for en spiller uden telefon ("Anna siger: omkvædet igen!")\n• Sceneannonceringer i moderator-profilens navn\n\nFarveprikken ved rullemenuen viser spillerfarven — historikken gør det tydeligt, hvem der "sagde det".',
        },
        input: {
          title: 'Skrivning af besked',
          body: 'Skriv i feltet (maks. 200 tegn) og tryk Enter — eller brug send-knappen.',
        },
        send: {
          title: 'Afsendelse',
          body: 'Indsend med Enter eller knappen — beskeden vises straks i historikken og på alle tilsluttede telefoner.',
        },
        songChallenges: {
          title: 'Sangudfordringer ⚔️',
          body: 'Gæster kan udfordre dig til en sang direkte fra appen: et udfordringskort vises i chatten — "Acceptér udfordring" starter duellen.',
          details: 'Sådan forløber udfordringen:\n1. En gæst vælger en sang i appen og trykker "Udfordr"\n2. Kortet vises i chatten med sang, udfordrer og accept-knap\n3. Acceptér på skrivebordet — startdialogen åbner med duel-tilstand valgt\n4. Syng! Vinderen tager æren (og pointene)\n\nBemærk: "Send som" skal være sat til en spiller her — modstanderen skal kunne identificeres.',
        },
        companionSide: {
          title: 'På telefonerne',
          body: 'Companion-appen har sit eget chat-faneblad — dér skriver gæsterne. Hvad du ser her, ser de i realtid — og omvendt.',
        },
        finish: {
          title: 'Beskeden leveret! 💌',
          body: 'Nu kender du chatten — fra panelet til sangudfordringer.\n\nKombineret med companion-rundturen bliver det tydeligt, hvordan telefoner og skrivebord spiller sammen.',
        },
      },
    },

    // ═══ Companion tour (R29) ═══
    companion: {
      title: 'Companion-app',
      desc: 'Forbind smartphones: mikrofon, fjernbetjening, sangønsker & syng-med.',
      chapters: {
        connect: 'Tilslutning',
        features: 'Appens muligheder',
        manage: 'Enhedsadministration',
      },
      steps: {
        welcome: {
          title: 'Telefoner som tilbehør 📱',
          body: 'Companion-appen gør enhver smartphone til et karaoke-tilbehør: mikrofon, fjernbetjening, sangvalg og chat — ingen installation, direkte i browseren.\n\nDenne rundtur dækker skrivebordssiden af forløbet.',
          details: 'Princippet: skrivebordet er værten (musik, noder, point) — telefoner forbinder over WiFi\'et og bliver efter behov:\n• 🎤 Mikrofoner (med tonegenkendelse på telefonen!)\n• 🎮 Fjernbetjeninger (styring af skærme)\n• 🎵 Sangbrowsere med kø-ønsker\n• 💬 Chat-deltagere\n• 🪞 Live-spejlinger af skrivebordsskærmen\n\nIngen app store, ingen konto — scan QR-koden, så er du i gang.',
        },
        mobileTab: {
          title: 'Åbning af Mobil-fanen',
          body: 'Forbindelsen starter i Indstillinger → Mobil. Jeg åbnede lige fanen til dig.',
        },
        qrCode: {
          title: 'Skanning af QR-koden',
          body: 'Den store kode til venstre er den direkte rute: åbn telefonkameraet, scan, og appen indlæses i browseren. Vigtigt: telefon og computer i samme WiFi.',
          details: 'QR-koden indeholder skrivebordets LAN-adresse (f.eks. http://192.168.1.42:3000/mobile) — derfor skal begge enheder dele et netværk.\n\nHvis koden nægter: URL\'en herunder kan skrives eller kopieres (knap). I offentligt WiFi uden enhedssynlighed mislykkes forbindelsen desværre — brug et personligt hotspot i stedet.',
        },
        connectionInfo: {
          title: 'URL & kopieringsknap',
          body: 'Til højre adressen som tekst — med en kopieringsknap til deling (f.eks. via messenger til dine gæster). Den grønne linje bekræfter den registrerede netværks-IP.',
          details: 'Tip til forhåndsdeling: send URL\'en til gæsterne før festen — så snart skrivebordet kører, forbinder alle med det samme.\n\nDen gule advarsel vises, når ingen LAN-IP blev registreret (f.eks. ren localhost-drift) — så kan kun den samme maskine nå den.',
        },
        roles: {
          title: 'Appens roller',
          body: 'Efter tilslutning tilbyder appen, afhængigt af kontekst:\n\n🎤 Mikrofonvisning med tonevisning\n🎮 Fjernbetjening af skrivebordet\n🎵 Sangbrowser + kø-ønsker\n💬 Chat\n🪞 Live-spejling af skærmen',
          details: 'Rollerne i detaljer:\n• Mikrofon: telefonen måler tonehøjden og sender den live — skrivebordet viser noderne som fra en "rigtig" mikrofon. Virker i alle tilstande (også duel: to telefoner!).\n• Fjernbetjening: skærme, knapper og bekræftelser fra telefonen — smart for værter, der bevæger sig rundt i lokalet.\n• Sangbrowser: hele biblioteket på telefonen — inklusive forhåndsvisning og kø-ønsker med 📱-badges på skrivebordet.\n• Chat: beskeder til skrivebordet og de andre gæster.\n• Spejling: skrivebordsskærmen (spil, resultater) spejles på telefonen — gæsterne ser alt fra deres pladser.',
        },
        chatRole: {
          title: 'Chat på skrivebordet',
          body: 'Hvad gæster skriver i app-chatten, lander i skrivebords-chatten (chat-knappen i menulinjen) — og tilbage. Der findes en selvstændig chat-rundtur til det.',
        },
        queueRole: {
          title: 'Ønsker i køen',
          body: 'Gæster stiller sange i kø fra deres telefoner — de vises på skrivebordet i køen med 📱-badges. En anden rundtur dækker også det.',
        },
        singAlong: {
          title: 'Syng-med-tilstande 🎶',
          body: 'I festtilstandene Companion Sing-A-Long og Pass the Mic synger gæsterne direkte via deres telefoner — tonegenkendelsen kører på enheden, skrivebordet dirigerer.',
          details: 'Companion Sing-A-Long: hver gæst får sangtekst + tonevisning på telefonen — skrivebordet viser den fælles note-highway.\n\nPass the Mic: mikrofonen roterer — endda blandet mellem telefon og fysisk mikrofon.\n\nFor begge gælder: jo bedre WiFi, jo glattere tonehøjde. Hvis det hakker, hjælper en maskine tættere på routeren.',
        },
        deviceList: {
          title: 'Enhedslisten',
          body: 'Tilbage i Mobil-fanen: alle tilsluttede enheder viser forbindelsestid, rolle, tildelt profil og seneste aktivitet — inklusive en smid-knap.',
          details: 'Enhedskortet viser:\n• Forbindelsesvarighed ("i 12 min.")\n• Hvad enheden laver (mikrofon aktiv, fjernbetjening …)\n• Den tilknyttede profil — en rullemenu tildeler en anden\n• Smid: kobler enheden fra (den kan genforbinde med det samme)\n\nTip: giv profiler sigende navne — listen forbliver overskuelig, selv med mange gæster.',
        },
        profileClaim: {
          title: 'Profil-tilknytning',
          body: 'Hver enhed kan tilknytte en profil: gæsten synger derefter under eget navn med egen XP — profilsiden viser tilknytningen med et 📱-badge.',
          details: 'Veje til tilknytning:\n1. Scan profil-QR-koden i profilindstillingerne (mest direkte)\n2. I appen efter tilslutning: vælg fra listen\n3. Her i enhedslisten via rullemenuen\n\nDetaljer også i profil-rundturen.',
        },
        microphoneFallback: {
          title: 'Telefon i stedet for mikrofon-opsætning',
          body: 'Når alle synger via telefon, kan du helt springe mikrofon-fanen over — appen regulerer selv følsomheden. Fysiske mikrofoner konfigureres i mikrofon-fanen som vist.',
        },
        finish: {
          title: 'Forbundet! 🔗',
          body: 'Nu ved du, hvordan telefoner kobler til, og hvad de kan.\n\nNæste skridt: åbn URL\'en på din egen telefon og kør en første test — mikrofon-tilstanden er den mest imponerende.',
        },
      },
    },

    // ═══ Achievements tour (R29) ═══
    achievements: {
      title: 'Præstationer & Fremskridt',
      desc: 'Præstationer, XP-niveauer, sjældenheder og daglige udfordringer.',
      chapters: {
        overview: 'Overblik',
        unlock: 'Lås præstationer op',
        daily: 'Daglige Udfordringer',
      },
      steps: {
        welcome: {
          title: 'Præstationer & fremskridt 🏆',
          body: 'Alt hvad du samler: præstationer med sjældenheder, XP-niveauer med rangtitler og de daglige udfordringer som XP-motor.\n\nDenne rundtur går gennem præstationsskærmen og udfordringerne.',
          details: 'De tre systemer sammen:\n• XP: "brændstoffet" — fra sange, udfordringer og præstationer\n• Niveauer & rang: stiger med XP (nybegynder → legende), viser fremskridt med ét blik\n• Præstationer: milepæle med belønninger — nogle hemmelige, indtil du låser dem op\n\nAlt hænger på profilen — hvem der synger, samler (se profil-rundturen).',
        },
        navButton: {
          title: 'Præstations-knappen',
          body: 'I menulinjen fører trofæet til præstationerne — den anden trofæ-kolonne ved siden af viser ranglisterne.',
        },
        playerSelector: {
          title: 'Spillervalg',
          body: 'Heroppe vælger du, hvis præstationer du ser — praktisk til at prale af samlingen. Tallet på profilen viser antal oplåste.',
        },
        stats: {
          title: 'Statistik-kortene',
          body: 'Fire kort med ét blik: oplåste præstationer, XP samlet fra dem, fuldstændighed i procent og det aktuelle niveau med rangtitel.',
          details: 'Procent-kortet regner: oplåste ÷ alle præstationer. 100 % er samlerens tærskel — belønnes som regel med en egen hemmelig præstation.\n\nNiveau-kortet viser desuden rangtitlen ("Rising Star", "Karaoke-legende" …) — titlerne kommer fra profilens rangsystem.',
        },
        filters: {
          title: 'Filtre',
          body: 'Venstre: status-filtrene (alle / låst op / låst). Højre: kategorierne: præstation, fremskridt, social og speciel.',
          details: 'Kategorierne betyder:\n• Præstation: sang-bedrifter (combos, gyldne noder, perfekte runder)\n• Fremskridt: samler-milepæle (spillede sange, XP-mængder, niveauer)\n• Social: fest- og multiplayer-handlinger (dueller, companion-runder)\n• Speciel: hemmeligheder og kuriositeter — beskrivelsen afsløres først ved oplåsning\n\nKombinerbart: "Låst + Speciel" viser, hvad der venter på dig.',
        },
        grid: {
          title: 'Præstations-kortene',
          body: 'Hvert kort: ikon, navn, beskrivelse, sjældenhed og XP-belønning. Oplåste skinner gyldent med en dato — låste forbliver grå.',
          details: 'Sjældenhederne (farvekodede):\n• Almindelig — kommer naturligt ved almindeligt spil\n• Sjælden — kræver målrettet handling\n• Epic — hårdt arbejde eller heldige tilfælde\n• Legendarisk — til de få\n\nOplåsning sker automatisk, når betingelsen er opfyldt — toast-notifikation inkluderet. XP\'en lander straks på profilen.',
        },
        xpSystem: {
          title: 'Sådan flyder XP',
          body: 'XP kommer fra tre kilder: sungne sange (efter sværhedsgrad), udfordringer (daglig/ugentlig) og præstationer. Niveauer låser op for rang — og enkelte funktioner som profil-badges.',
          details: 'XP-kilder med ét blik:\n• Færdigsunget sang: basis-XP efter sværhedsgrad (nem → ekspert, stigende)\n• Daglig brik: 100–400 XP + bonusser\n• Ugentlig brik: 500–2000 XP\n• Præstation: én gang pr. præstation (25–1000 XP efter sjældenhed)\n\nNiveau-linjen på profilsiden viser vejen til næste niveau; rangen skifter hvert par niveauer.',
        },
        navDaily: {
          title: 'Videre til udfordringerne',
          body: 'De daglige udfordringer har deres egen skærm — stjerne-knappen i menulinjen fører dertil. Navigerer derhen nu.',
        },
        playerSelection: {
          title: 'Trin 1: vælg spillere',
          body: 'Guidet forløb: vælg først, hvem der spiller — først derefter vises opgaverne. Flere spillere er mulige; statistikken tilhører den første.',
          details: 'Hvorfor valget først? Brikker og statistik er pr. profil — uden en valgt spiller ville der ikke være noget at beregne.\n\nKortet viser alle aktive profiler; valg sker ved klik. Derefter udfolder trin 2 (opgaver) og trin 3 (spil) sig.',
        },
        slots: {
          title: 'Trin 2: de 5 brikker',
          body: 'Fem opgavebrikker om dagen, som låses op i rækkefølge. Hver brik viser opgaven, spilbare sværhedsgrader og XP-værdien — højere grader multiplicerer.',
          details: 'Brik-mekanik:\n• Brik 2–5 åbner først, når den foregående er gennemført eller sprunget over — kæden tvinger variation.\n• Hver opgave er en betingelse på den næste sang ("genren rock", "mindst 80 % præcision" …) — biblioteket filtrerer automatisk matchende sange.\n• Valg af sværhedsgrad pr. brik: op til 3× XP-multiplikator på ekspert.\n\nVed midnat kommer fem friske opgaver — kæden starter forfra.',
        },
        badges: {
          title: 'Badges & ugentligt',
          body: 'At klare flere brikker giver daglige badges (bronze/sølv/guld) med ekstra XP. Det ugentlige modstykke løber 7 dage med store belønninger — samme mekanik, større pulje.',
          details: 'Badge-niveauer pr. dag:\n• Bronze: 2 brikker\n• Sølv: 3–4 brikker\n• Guld: alle 5 brikker — plus den daglige bonus-XP\n\nUgentligt: 5 brikker over 7 dage, 500–2000 XP pr. brik, nulstilling hver mandag. At spille dagligt OG ugentligt får dig markant hurtigere op i niveau end sange alene.',
        },
        challengeModes: {
          title: 'Udfordringstilstande',
          body: 'Ud over brikkerne findes frie udfordringstilstande med modifikatorer (f.eks. "2× tempo", "ingen noder") — til egne regler og ekstra XP ud over dagens opgaver.',
          details: 'Tilstandene er frit konfigurerbare: vælg en tilstand, kombinér modifikatorer, XP-puljen vokser med sværhedsgraden.\n\nGennemføringer låser op for nye modifikatorer — samler-kortet i udfordringsområdet viser, hvad du har.',
        },
        finish: {
          title: 'Samletid! 🏅',
          body: 'Nu kender du præstationer, XP og udfordringer — fremskridtets tre motorer.\n\nTip til at starte: spil 2 daglige brikker i dag — resten kommer af sig selv.',
        },
      },
    },
  },
};
