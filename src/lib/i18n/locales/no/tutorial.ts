// NO translations — tutorial
// Guider/rundturer: ?-hjelpemenyen, overlay-styringen, førstegangstilbudet og
// 8 rundturer (grunnleggende, redigerer, innstillinger, profiler, kø, chat,
// companion, prestasjoner). Basert på EN-filen (en/tutorial.ts) — identisk
// nøkkelstruktur.
export const tutorialTranslations = {
  tutorial: {
    // ?-hjelpemenyen
    helpButtonTitle: 'Hjelp & guider',
    helpDialogTitle: 'Hjelp & guider',
    helpDialogDesc: 'Se rundturene på nytt — eller hopp rett til et tema og få akkurat den delen forklart.',
    helpFooter: 'Taster i rundturen: → neste · ← tilbake · Esc avslutt',
    startFullTour: 'Hele rundturen',
    stepsCount: '{n} trinn',
    completedBadge: 'Fullført',
    // Rundturgrupper i hjelpemenyen (R29: 8 rundturer trenger struktur)
    groupGettingStarted: 'Kom i gang',
    groupAreas: 'Områder & funksjoner',
    groupAdvanced: 'For proffs',
    // Styring av overlayet
    ariaLabel: 'Guidet rundtur',
    skipTour: 'Avslutt rundturen',
    back: 'Tilbake',
    next: 'Neste',
    finish: 'Ferdig',
    clickHint: 'Klikk på den nå',
    // Utviding «Mer info» (R29)
    moreDetails: 'Mer info',
    lessDetails: 'Vis mindre',
    // Tilbud ved første oppstart
    offerTitle: 'Velkommen til Karaoke ZERO!',
    offerBody: 'Vil du ha en rask gjennomgang av det grunnleggende? I løpet av 2 minutter kjenner du til daglige utfordringer, syngemodus, biblioteket og festlekene.',
    offerStart: 'Start rundturen',
    offerLater: 'Kanskje senere',
    offerHint: 'Alltid tilgjengelig via ?-ikonet i menylinjen.',

    // ═══ Grunnrundturen ═══
    basic: {
      title: 'Grunnleggende',
      desc: 'Rundturen: utfordringer, syngemodus, bibliotek, fest & mer.',
      chapters: {
        welcome: 'Velkommen',
        challenges: 'Daglig & ukentlig',
        singing: 'Begynn å synge',
        party: 'Festmoduser',
        more: 'Flere områder',
      },
      steps: {
        welcome: {
          title: 'Velkommen! 👋',
          body: 'Dette er en live-rundtur: jeg fremhever de viktige stedene og forklarer dem.\n\nStyring: «Neste» (eller tast →), «Tilbake» (←) og «Avslutt rundturen» (Esc). Vi kjører!',
          details: 'Du kan sette rundturen på pause når som helst og fortsette senere: ?-ikonet i menylinjen åpner hjelpemenyen med alle rundturene — de kan spilles kapittel for kapittel også.\n\nMange trinn har en «Mer info»-knapp nederst: den utfolder ekstra detaljer uten at du mister den korte teksten.',
        },
        heroButtons: {
          title: 'Rask start',
          body: '«Start å synge» tar deg rett til biblioteket. «Festmodus» åpner de 9 festlekene for grupper.',
          details: 'Hurtigstartskortene er snarveier til de vanligste veiene:\n• «Start å synge» = åpne biblioteket, velg en sang, kjør (solo, duell eller duett).\n• «Festmodus» = spillkolleksjonen for 2–24 spillere — telefoner kan kobles til som mikrofoner.\n\nAlt du ser her, kan også nås via menylinjen — kortene sparer bare klikk.',
        },
        dailyCard: {
          title: 'Daglig utfordring',
          body: '5 luger per dag med roterende oppgaver — jo flere luger du klarer, desto større XP-bonus. Ferske oppgaver kommer ved midnatt.',
          details: 'Slik fungerer systemet:\n• Hver av de 5 lugene inneholder en egen oppgavetype (f.eks. «syng en sang fra 80-tallet», «få 8000 poeng»).\n• Lugene låses opp i rekkefølge — luke 2 åpnes først når luke 1 er fullført (eller hoppet over).\n• Hver luke kan spilles i flere vanskelighetsgrader; de høyere gir mer XP (opptil 3× multiplikator).\n• Bonusen vokser med antallet fullførte luger: 5/5 gir hele dagbonussen.\n\nOppgavene trekkes fra DITT bibliotek — utvalget tilpasser seg alltid sangene dine.',
        },
        weeklyCard: {
          title: 'Ukentlig utfordring',
          body: 'Ukens motstykke: 5 luger gjennom uken med større XP-belønninger. Perfekt for langsiktige mål.',
          details: 'Ukentlige utfordringer fungerer som de daglige, men:\n• De 5 lugene gjelder i 7 dager — ingen daglig nullstilling, saml i ditt eget tempo.\n• XP-belønningene per luke er mye større (f.eks. 500–2000 XP i stedet for 100–400).\n• Nullstillingen skjer mandag morgen.\n\nTips: daglig og ukentlig kjører parallelt — spill begge, så nivåer du raskest.',
        },
        modeLauncher: {
          title: 'Syng: Solo, Duell & Duett',
          body: '🎤 Solo: én spiller, én mikrofon.\n⚔️ Duell: to spillere på SAMME sang — flest poeng vinner.\n🎭 Duett: to stemmer på to spor — biblioteket viser automatisk bare samsvarende duettsanger.',
          details: 'De tre modusene i detalj:\n• Solo: klassisk karaoke — du synger alle notene, og poengsummen din havner på ledertavlene.\n• Duell: begge spillerne synger samme notispor samtidig. Poengene telles hver for seg — sammenligningen etterpå viser hvem som var best. Perfekt for omkamp.\n• Duett: sangen har to separate stemmer (P1/P2) — alle synger «sine» deler, felles fraser gir lagbonus. Duetsanger merkes med 🎭-filteret i biblioteket.\n\nMikrofoner: du kan koble til så mange mikrofoner eller smarttelefoner du vil (se Innstillinger → Mikrofon).',
        },
        libraryNav: {
          title: 'Biblioteket',
          body: 'Alle sangene dine bor her. Søk på tittel eller artist — søket tilgir til og med skrivefeil.',
          details: 'Søketips:\n• Søket finner «Dancing Qun» → «Dancing Queen». Det bryr seg ikke om store/små bokstaver og tilgir enkelte skrivefeil.\n• Det søker på tittel, artist OG sjanger samtidig — «Rock» finner også sanger med sjangeren Rock.\n\nSortering via rullegardinmenyen (tittel A–Å, artist, nylig lagt til). Sanger kommer inn i biblioteket via import, mappesøk eller spillelister — veien dit finner du i bibliotekfanen i innstillingene.',
        },
        filters: {
          title: 'Filter',
          body: 'Sjanger, språk, år, tiår, duetsanger og viral-hits — kutt biblioteket akkurat slik du vil.',
          details: 'Alle filtrene kan kombineres — f.eks. viser «Sjanger: Rock + Språk: Engelsk + Æra: 80-tallet» nøyaktig de engelske rocksangene fra åttitallet.\n\nSpesialfilter:\n• Duett: bare sanger med to stemmespor.\n• Viral-hits: sanger som akkurat nå er på de virale listene (data fra Innstillinger → Viral-lister).\n• Egne sjangere & språk: lag egne kategorier under Innstillinger → Sjangere & Språk — de dukker opp direkte i disse filtrene.\n\n«Nullstill filter» (✕) tømmer alt på én gang.',
        },
        songCard: {
          title: 'Sanger',
          body: 'Et klikk på et sangkort åpner startdialogen: modus, spillere, mikrofoner og vanskelighetsgrad.',
          details: 'Hvert sangkort viser:\n• Omslag pluss tittel/artist\n• Vanskelighetsgrad (lett/middels/vanskelig/ekspert) og stjernerating\n• Nøkkelmetadata som sjanger og språk — rett fra sangen eller harmonisert via AI (Redigereren → Metadata-studioen).\n\nForhåndsvisningsikonet starter en kort teaser uten å åpne startdialogen.',
        },
        startModal: {
          title: 'Startdialogen',
          body: 'Sett alt her: modus (solo/duell/duett), hvem som synger, hvilken mikrofon alle får — og vanskelighetsgraden.\n\nTrykk så «Start» — og så kjører det!',
          details: 'De viktigste valgene:\n• Modus: solo, duell (2 spillere, samme spor) eller duett (2 stemmer) — i duettmodus velger begge spillerne stemmen sin (P1/P2).\n• Mikrofoner: hver spiller kan få sin egen inngangsenhet — eller en smarttelefon som mikrofon (companion-appen).\n• Vanskelighetsgrad: påvirker poengsettingen — vanskeligere grader tilgir mindre og belønner presisjon (høyere poengpotensial, mer XP).\n• «Legg til i kø» i stedet for «Start»: sangen stilles i køen i stedet for å starte med en gang — ideelt når flere vil synge.',
        },
        partyCard: {
          title: 'Festmoduser',
          body: '9 leker for 2–24 spillere: Battle Royale, Gi mikrofonen, medleykonkurranse, turnering, manglende ord, blind karaoke og mer — telefoner kan kobles til som mikrofoner.',
          details: 'De 9 modusene i korte trekk:\n• Battle Royale: alle synger, den svakeste elimineres hver runde — sist stående vinner.\n• Gi mikrofonen: mikrofonen går på rundgang fra spiller til spiller — alle synger sin del.\n• Medleykonkurranse: lag synger seg gjennom korte sangutdrag med spesialregler.\n• Turnering: utslagstre med dueller — vinneren klatrer hver runde.\n• Manglende ord: ord i teksten gjøres tomme — syng riktig ord for å få poeng.\n• Blind karaoke: ingen visning av noter, kun hørselen!\n• Vurder sangen min & Companion Singalong og mer — hvert moduskort forklarer seg selv.\n\nNesten alle modusene støtter companion-appen som mikrofon og fjernkontroll.',
        },
        partyModes: {
          title: 'Modusvelgeren',
          body: 'Her velger du festmodus: Battle Royale (sist stående vinner), Gi mikrofonen, turnering (utslagstre), medley og mer.\n\nHvert kort viser hva du kan vente deg — ett klikk åpner spillervalget.',
          details: 'Etter klikk på et moduskort følger spillervalget: velg profiler (eller koble til companion-enheter), og sett deretter lagstørrelser, antall runder eller tidsbegrensninger avhengig av modus.\n\nTemafest-tips: når et tema er aktivt i innstillingene (f.eks. «80-tallsfest»), trekker hvert sangvalg i festmodus automatisk bare fra samsvarende sanger — festen holder seg på temaet.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke uten konkurranse: bygg spillelister, legg sanger i kø, del favoritter. Den perfekte bakgrunnsunderholderen.',
          details: 'Jukeboxen er den avslappede modusen:\n• Velg spillelister eller enkelt sanger som base.\n• Valgfrie videopauser imellom, så stemningen aldri brytes.\n• Ingen poengsetting, ingen mikrofoner nødvendige — sangene bare spilles med tekst.\n\nPerfekt som underholdning hele kvelden eller som oppvarming før første runde.',
        },
        jukeboxView: {
          title: 'Inne i jukeboxmenyen',
          body: '«Bla i spillelister» gir deg direkte tilgang til alle lagrede spillelister — også de du har laget i biblioteket. Ett klikk legger hele spillelisten i kø.',
          details: 'Jukeboxens spillelisteinnstillinger tilbyr:\n• Om videoer vises (hvis sangene har noen)\n• Videopauser: pauset videoer mellom sangene, f.eks. til beskjeder\n• Om basen stokkes eller kjører i fast rekkefølge\n\nStarter i fullskjerm — avslutt med Escape eller stoppknappen øverst.',
        },
        highscoreCard: {
          title: 'Rekorder',
          body: 'Rekorder per sang og vanskelighetsgrad — slå vennene dine (eller deg selv).',
          details: 'Listene husker per sang og vanskelighetsgrad:\n• Poeng, presisjon, gullnoter og dato\n• Hvilken spiller som står bak oppføringen (profilavatar)\n• Om oppføringen kom via companion-appen (telefonikon) eller skrivebordet\n\nMed på nett-modus aktivert (profilsiden) ser du i tillegg globale lister og konkurrerer mot spillere fra andre installasjoner.',
        },
        highscoreView: {
          title: 'Ledertavlene',
          body: 'Filtrert per sang og vanskelighetsgrad — med filterlinjen øverst. Telefonikonene viser bruk fra companion-appen.',
          details: 'Filterlinjen øverst muliggjør:\n• Søk på sang eller spiller\n• Filtrering på vanskelighetsgrad\n• Bytte lokalt/globalt (når på nett er aktivert)\n\nAntijuks: hver oppføring bærer et sang-fingeravtrykk — manipulerte resultater oppdages og flagges.',
        },
        settingsCard: {
          title: 'Innstillinger',
          body: 'Mikrofoner, språk, finjustering av spillingen, utseende og grafikk — alle bryterne bor her.',
          details: 'De 12 innstillingsfanene i korte trekk:\n• Generelt: språk, standardvanskelighetsgrad, på nett\n• Spilling: poengsetting, partikler, autospilling av køen\n• Utseende: temaer, tekststil, bakgrunn\n• Grafikk / Lyd: utgangsenhet, volum, YouTube-kvalitet\n• Mikrofon: enheter, følsomhet, brusport, forhåndsinnstillinger\n• Mobil: koble til & håndter companion-enheter\n• Webkamera: webkamera som bakgrunn\n• Bibliotek: sangmappe, import, nullstilling\n• Sjangere & Språk: egne kategorier\n• Temafest: aktiver & konfigurer tema\n• Synk & Backup: sikkerhetskopier\n\nDet finnes en egen, grundig innstillingsrundtur for alle fanene i ?-hjelpemenyen.',
        },
        settingsView: {
          title: 'Innstillingsfanene',
          body: 'Velg en seksjon øverst: Generelt (språk), Spilling, Utseende, Grafikk / Lyd, Mikrofon, Mobil (telefontilkobling) og mer.',
          details: 'Siden R28 forklarer en kort introtekst øverst i hver fane hva den gjør — du trenger aldri å gjette hvor et valg hører hjemme.\n\nPassende rundtur: «Innstillinger» i ?-hjelpemenyen går gjennom hver eneste fane.',
        },
        finish: {
          title: 'Ferdig! 🎉',
          body: 'Nå kan du det grunnleggende.\n\nTips: ?-ikonet i menylinjen tar deg tilbake når som helst — også til enkelttemakapitler, redigerer-rundturen og innstillingsrundturen.',
          details: 'Hva nå? Noen forslag til de første minuttene:\n1. Opprett en profil (Profiler i menylinjen) — uten en spiller du, men samler ingen XP.\n2. Importer sanger (Innstillinger → Bibliotek).\n3. Noen runder daglig utfordring for XP-boosten.\n4. Venner på vei? Prøv festmodus — companion-appen gjør hver telefon om til en mikrofon (det finnes en egen companion-rundtur).',
        },
      },
    },

    // ═══ Redigerer-rundturen ═══
    editor: {
      title: 'Redigerer-rundturen',
      desc: 'Noter, tekster, stemmer & harmonisering — sangverktøyet.',
      chapters: {
        entry: 'Veien inn',
        layout: 'Layout',
        notes: 'Redigere noter',
        extras: 'Ekstra & harmonisering',
      },
      steps: {
        welcome: {
          title: 'Redigereren ✏️',
          body: 'Her forvandles sanger til spillbare karaoke-spor: plasser noter, tidsinnstill tekster, tildel stemmer.\n\nSandkassetips: øv på en testsang — endringer kan angres med Ctrl+Z.',
          details: 'Redigereren jobber med UltraStar-formatet: hver note har en starttid, en varighet, en tonehøyde og en tekst (stavelse). Mange noter danner notebanen du ser i spillet.\n\nKilder til nye sanger:\n• Tekstimport (UltraStar/TXT) i redigereren\n• MIDI-import (noter generert fra MIDI)\n• AI-harmonisering: tekst + lyd → noteforslag\n\nAlt er ikke-destruktivt: frem til du lagrer, forblir original sang urørt.',
        },
        songList: {
          title: 'Sangvalg',
          body: 'Søk opp en sang for å åpne den. Filterne avslører sanger med manglende metadata — redigereren harmoniserer dem senere.',
          details: 'Filterchipene over listen viser sanger uten sjanger/språk/år — raskeste vei til sanger Metadata-studioen ikke har behandlet ennå.\n\nSøket dekker tittel og artist — store/små bokstaver spiller ingen rolle.',
        },
        noSongs: {
          title: 'Ingen sanger ennå',
          body: 'Redigereren trenger sanger i biblioteket. Importer sanger først (bibliotek → import / mappesøk) og kom tilbake.',
          details: 'Slik får du sanger:\n• Innstillinger → Bibliotek → sett sangmappen: hver undermappe leses som én sang (lyd/video + UltraStar-tekst).\n• Alternativt enkeltfiler via importdialogen.\n• Eller opprett en ny sang i redigereren («Ny sang») og sett sammen tekst + lyd selv.',
        },
        openSong: {
          title: 'Åpne en sang',
          body: 'Klikk på en sang i listen nå for å åpne den i redigereren.',
          details: 'Når den er åpen ser du verktøylinjen (underoverskriften) øverst og tidslinjen med bølgeform, notebaner og tekster.\n\nSangen forblir åpen til du lukker den via «Tilbake» — ulagrede endringer ber om bekreftelse først.',
        },
        leftPanel: {
          title: 'Verktøylinjen',
          body: 'Alt for notene: legg til, dupliser, slett, del, slå sammen — i tillegg notetyper, stemmer og trykkmodus (kommer straks).',
          details: 'Verktøyene i rekkefølge:\n• ➕ Legg til note: plasseres ved avspillingshodet\n• ⧉ Dupliser: kopierer den valgte noten rett bak seg\n• 🗑 Slett: fjerner utvalget\n• ✂ Del: én note → to (på midten)\n• ⇄ Slå sammen: to valgte → én\n\nMarkering med klikk; shift-klikk for flere. Så tar tastaturet over: ⌫ sletter, ↑/↓ transponerer, ←/→ flytter i tid.',
        },
        lyricsPanel: {
          title: 'Tekstpanelet',
          body: 'Tekstlinjene ligger til venstre. Dobbeltklikk på en linje for å hoppe dit i avspillingen — tekst og timing redigeres her.',
          details: 'Tekstpanelet er tekst OG timing i ett:\n• Klikk på en stavelse markerer den tilsvarende noten i tidslinjen.\n• Dobbeltklikk hopper til stedet (avspillingen følger med).\n• Høyreklikk (eller pennikonet) åpner linjeredigeringen: endre tekst, del stavelser ved ordgrenser, forskjøv hele linjens timing.\n\nDelingen ved ordgrenser bruker språkgjenkjenning for å fordele stavelser på ord på en fornuftig måte — ikke mer manuell skjæring.',
        },
        subHeaderTools: {
          title: 'Redigere noter',
          body: 'Notene er blokkene på tonehøydebanene: legg til, dupliser, slett, del (én note → to) og slå sammen (to → én).\n\nRediger valgte noter i fart: ⌫ sletter, ↑/↓ transponerer.',
          details: 'Presisjonstips:\n• Zoom: Ctrl+musehjul over tidslinjen — zoom inn for fin timing.\n• Avspilling: mellomrom veksler spill/pause, Shift+mellomrom spiller bare utvalget.\n• Transponere flere noter: marker alle, ↑/↓ flytter hele bunten.\n\nFor timingen: notens start må treffe stavelsens anslag i vokalen — bølgeformen hjelper deg å finne anslagene.',
        },
        noteTypes: {
          title: 'Notetyper',
          body: '5 typer for nye noter:\n: Normal (tonehøyden teller)\n* Gull (ekstra poeng)\nF Freestyle (enhver note teller)\nR Rap (kun timing)\nG Rap-gull',
          details: 'Hva hver type betyr i spillet:\n• Normal (:): klassisk syngenote — tonehøyde og timing teller.\n• Gull (*): vises gyllen, doble poeng ved treff. Perfekt for sangens høydepunkter.\n• Freestyle (F): tonehøyden er likegyldig, bare tekst/timing teller — bra for talte partier.\n• Rap (R): bedømmer timing og rytme i stedet for melodi.\n• Rap-gull (G): som rap, men med ekstra poeng.\n\nTypen kan endres senere: marker noten og velg en ny type i verktøylinjen.',
        },
        voices: {
          title: 'Stemmer',
          body: 'P1 = spiller 1, P2 = spiller 2 (duett!), P4/P8 = tredje/fjerde stemme. Hver note tilhører en stemme — slik lages duetsanger med separate deler.',
          details: 'Stemmetildeling:\n• Rullegardinmenyen velger sporet nye noter lander på.\n• Plasserte noter kan flyttes: marker og bytt stemme.\n• I duettmodus i spillet velger hver spiller sitt spor — biblioteket filtrerer automatisk frem sanger med minst 2 stemmer.\n\nP4/P8 tillater til og med kvartettoppsett; hovedmodusene bruker P1/P2.',
        },
        tapMode: {
          title: 'Trykkmodus — turboen 🥁',
          body: 'Hold inne og trykk i takt: hvert klikk slipper en note ved gjeldende avspillingsposisjon, tekstlinje for tekstlinje. Lag noter i sanntid.',
          details: 'Slik går trykkinnspillingen for seg:\n1. Aktiver trykkmodus i verktøylinjen.\n2. Start avspillingen — sangen spilles med hørbart lyd.\n3. Klikk i stavelsenes takt — hvert trykk slipper en note ved avspillingshodet med sist valgte tonehøyde.\n4. Finpuss så: korriger tonehøyder (↑/↓ på markerte noter) og juster varigheter.\n\nTrykkmodus er 5–10× raskere enn å plassere noter for hånd — hele sanger på minutter i stedet for timer.',
        },
        panels: {
          title: 'Hodepaneler',
          body: 'Tre paneler øverst til høyre: metadata (sjanger/språk/år), lydanalyse og AI-assistenten.',
          details: 'Hva de tre panelene gjør:\n• Metadata: rediger sjanger, språk og år direkte for den åpne sangen — mater filterne og temafesten.\n• Lydanalyse: analyserer lydfilen (lydstyrke, toneart, BPM) og foreslår verdier.\n• AI-assistenten: tekstfullføring, sangidentifikasjon og note-harmonisering via AI — krever en konfigurert AI-leverandør (Innstillinger → AI).',
        },
        metadataStudio: {
          title: 'Metadata-studioen',
          body: 'Harmoniseringsturboen: AI- og regelbaserte forslag til sjanger, språk og år — med lytt-før-tildeling, manuell finjustering og en gjennomgangskø for usikre treff.',
          details: 'Studiens arbeidsflyt:\n1. «Analyser alle sanger» — regelmotoren (filstier, tagger) og valgfritt AI foreslår sjanger/språk/år.\n2. Forslagene bærer trygghet: grønn = sikker, gul = gjennomgang.\n3. Lytt: et klikk på en sang spiller et utdrag — verifiser forslag på raskeste måte.\n4. Tildel enkeltvis eller «bruk alle grønne».\n\nGjennomgangskøen samler usikre treff til senere — ingenting går tapt.',
        },
        shortcuts: {
          title: 'Hurtigtaster',
          body: 'Alle tastatursnarveier samlet — redigereren er et tastaturinstrument. Klikk deg gjennom!',
          details: 'De viktigste snarveiene:\n• Ctrl+Z / Ctrl+Y: angre / gjør om\n• Mellomrom: spill/pause\n• ⌫: slett markerte noter\n• ↑/↓: transponer · ←/→: flytt i tid\n• S: del note · M: slå sammen\n• 1–5: velg notetype\n\nI snarveipanelet kan du se og endre taster.',
        },
        finish: {
          title: 'Klar til å bygge! 🛠️',
          body: 'Nå kjenner du redigererens verktøykasse.\n\nHusk: Ctrl+Z redder alt, og ?-ikonet i menylinjen tar deg tilbake til disse kapitlene når som helst.',
          details: 'Anbefalt rekkefølge for en ny sang:\n1. Koble til lyd/video (sanginfofanen)\n2. Importer eller skriv inn tekst (tekstfanen)\n3. Trykk inn noter (trykkmodus) eller AI-harmoniser\n4. Stell med metadata (sjanger/språk/år — viktig for filterne!)\n5. Lagre — fra nå av vises sangen i biblioteket.',
        },
      },
    },

    // ═══ Innstillingsrundturen (R28) ═══
    settings: {
      title: 'Innstillinger',
      desc: 'Alle innstillingene i oversikt: faner, grunninnstillinger, lyd, bibliotek, companion-enheter og backup.',
      chapters: {
        overview: 'Oversikt',
        basics: 'Grunninnstillinger',
        sound: 'Lyd & Mikrofon',
        library: 'Bibliotek & Tema',
        devices: 'Enheter & Companion',
        data: 'Synk, Backup & Info',
      },
      steps: {
        welcome: {
          title: 'Innstillingene 👋',
          body: 'Denne rundturen går utelukkende gjennom innstillingene — fane for fane.\n\nJeg bytter automatisk til hver fane og forklarer hva du finner der.',
          details: 'Fanene i rundtursrekkefølge: Generelt, Spilling, Utseende, Grafikk / Lyd, Mikrofon, Mobil (companion), Webkamera, Bibliotek, Sjangere & Språk, Temafest, Viral-lister, Synk & Backup og Om.\n\nHver fane har en kort intro øverst — rundturen utdyper den trinn for trinn.',
        },
        tabBar: {
          title: 'Faneraden',
          body: 'Alle innstillingene er organisert i faner: Generelt, Spilling, Utseende, Lyd, Mikrofon, Mobil, Webkamera, Bibliotek, Sjangere & Språk, Temafest, Synk & Backup og Om.\n\nSiden R28 forklarer en kort introtekst øverst i hver fane hva den gjør.',
          details: 'Orienteringshjelp — når du leter, spør deg selv…\n• «Hvordan OPPFØRER spillet seg?» → Spilling\n• «Hvordan SER det ut?» → Utseende\n• «Hvordan LÅTER det?» → Grafikk / Lyd / Mikrofon\n• «Koble til enheter?» → Mobil (companion) / Mikrofon\n• «Sangene mine?» → Bibliotek\n• «Sikkerhetskopiere data?» → Synk & Backup\n\nFanene ruller horisontalt i smale vinduer — bare sveip mot høyre.',
        },
        general: {
          title: 'Generelt',
          body: 'Grensesnittsspråk, standardvanskelighetsgrad, på nett-aktiviteter og den fullstendige oversikten over hurtigtaster.',
          details: 'Språk: 16 språk er tilgjengelige. Bytting trer i kraft live i hele grensesnittet.\n\nStandardvanskelighetsgrad: gjelder nye runder hvis ikke startdialogen velger en annen.\n\nPå nett-aktivitetene styrer om rekorder lastes opp globalt og om daglige utfordringer genereres på nett.',
        },
        gameplay: {
          title: 'Spilling',
          body: 'Poengsetting på/av, partikkeleffekter, autospilling av køen og flere atferdsbrytere for runder og resultater.',
          details: 'De viktigste bryterne:\n• Poengsetting: for ren gledessang uten poengvisning.\n• Autospilling av køen: når en sang slutter, starter neste køoppføring automatisk — ideelt for festkvelder uten programleder.\n• Partikler & effekter: slå av på svakere maskiner.\n\nI tillegg: atferd etter runder (resultatskjerm, umiddelbar omstart) og kombovisninger.',
        },
        appearance: {
          title: 'Utseende',
          body: 'Temaer, animert bakgrunn eller egen bakgrunnsvideo, tekststil og størrelse, notevisning og ytelsesmodusen for svakere maskiner.',
          details: 'Tekststil: «Karaoke» (fargelegging av ordet), «UltraStar» (stavelsesblokker) eller «Minimal».\n\nBakgrunn: i tillegg til temaene fungerer en egen video — i spillet kjører den bak notene, nedtonet.\n\nYtelsesmodusen kutter kraftig ned på animasjoner og bakgrunner — lønner seg fra ~2015-maskinvare.',
        },
        graphicsound: {
          title: 'Lyd',
          body: 'Utgangsenhet (inkl. ASIO), master- og forhåndslyttevolum, mikrofonfølsomhet, lydnivånormalisering og YouTube-videokvalitet.',
          details: 'ASIO: bare relevant for Windows + ASIO-kapable lydkort — reduserer latens ved mikrofonovervåking.\n\nLydnivånormaliseringen jevner ut volumforskjeller mellom sanger — standardverdiene er godt valgt.\n\nYouTube-kvalitet: gjelder sanger med YouTube-video som kilde; høyere kvalitet = mer båndbredde.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Enhetsvalg, følsomhet, brusport og live-nivå — i tillegg forhåndsinnstillinger. Smarttelefoner kobles til via Mobil-fanen.',
          details: 'Forhåndsinnstillinger: typiske oppsett («dynamisk vokalmikrofon», «headset», «telefon») setter følsomhet + brusport i fornuftige kombinasjoner.\n\nBrusport: filtrerer pust og romstøy — live-nivået viser i sanntid hva som slipper gjennom.\n\nViktig for flere spillere: HVER spiller kan få sin EGEN enhet — tildelingen skjer i startdialogen per runde.',
        },
        libraryTab: {
          title: 'Bibliotek',
          body: 'Sett sangmappen (hver undermappe = én sang) og skann den, nullstill biblioteket eller slett alle data — i tillegg importen fra andre karaokesystemer.',
          details: 'Mappformat: én undermappe per sang med lyd/video + TXT (UltraStar-format). Skanneren gjenkjenner vanlige kombinasjoner (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport fra andre systemer: et SingStar-arkiv? En UltraStar-samling? Importkonverteren overfører metadata og tekster automatisk.\n\nVær forsiktig med «slett alle data»: dobbeltbekreftelsen spør to ganger — ta likevel en backup først (fanen Synk & Backup).',
        },
        taxonomy: {
          title: 'Sjangere & Språk',
          body: 'Lag egne sjanger- og språkoppføringer — de dukker opp i alle rullegardinmenyene og mater AI-harmoniseringen.',
          details: 'Hvorfor egne oppføringer? Standardlistene dekker ikke alt («Schlager», «K-Pop», «Dialekt» …). Egne oppføringer:\n• vises umiddelbart i bibliotekfilterne\n• kan velges i redigereren og Metadata-studioen\n• harmoniseres med (AI-en foreslår dem for samsvarende sanger)\n\nSletting fungerer også — sangene beholder oppføringen til de tildeles på nytt.',
        },
        motto: {
          title: 'Temafest',
          body: 'Sett hele spillet på et tema (f.eks. en 80-tallsfest): når temaet er aktivt, erstatter det alle søkefelt og filter — hvert sangvalg trekker bare fra samsvarende sanger.',
          details: 'Temafilteret kjenner flere felt, fritt kombinerbare (OG-logikk):\n• Sjanger (f.eks. rock)\n• Språk (f.eks. engelsk)\n• Æra/år (f.eks. 1980–1989)\n\nVirkning: biblioteket, festens sangvalg OG companion-appen viser bare temabasen — gjestene kan ikke velge noe utenfor temaet.\n\nDeaktiveres temaet, går alt umiddelbart tilbake til normalvisning; spilte sanger/rekorder forblir urørte.',
        },
        mobile: {
          title: 'Mobil & Companion',
          body: 'Koble til smarttelefoner via QR-kode — som mikrofon, fjernkontroll eller syng-med-enhet. Du ser alle tilkoblede enheter og tilkoblingskodene deres.',
          details: 'Tilkobling: skann QR-koden (samme WiFi!) eller skriv inn URL-en — companion-rundturen forklarer detaljene i ?-hjelpemenyen.\n\nDenne fanen viser også:\n• Alle tilkoblede enheter med status (aktiv, rolle, siste aktivitet)\n• Tildeling av profiler til enheter\n• Utkasting av enkeltenheter\n\nQR-kodene per profil (for tilkobling) finner du i profilskjermens innstillingskort.',
        },
        webcam: {
          title: 'Webkamera',
          body: 'Bruk webkameraet som animert sangbakgrunn: oppløsning, speiling, metning, uskarphet og flere effekter — med live-forhåndsvisning.',
          details: 'Webkamera-bakgrunnen kjører bak notene under sangen — dere ser dere selv synge!\n\nEffekter: speiling (som i en selfie), metning, myk uskarphet, sepia — umiddelbart synlige i live-forhåndsvisningen.\n\nPersonvern: kameraet kjører kun lokalt, ingenting lagres eller sendes.',
        },
        sync: {
          title: 'Synk & Backup',
          body: 'Lag og gjenopprett sikkerhetskopier, synkroniser data mellom enheter. I skrivebordsversjonen speiles spillerdata i tillegg permanent til AppData-mappen.',
          details: 'En backup inneholder: profiler (med XP/fremgang), rekorder, innstillinger og spillelistedefinisjoner — som én fil å arkivere eller flytte.\n\nAppData-speilet (skrivebordsversjonen) beskytter mot tap av nettleserdata: selv om nettleserlagringen tømmes, gjenoppretter skrivebordsversjonen alt.\n\nGjenoppretting overskriver nåværende data — nok en gang: ta backup først.',
        },
        about: {
          title: 'Om',
          body: 'Versjon, plattform, lisenser og bidragende prosjekter — Karaoke ZEROs digitale kolofon.',
          details: 'Du ser også byggkanalen (nett/skrivebord) og kan se etter oppdateringer. Lisensene lister opp open source-prosjektene som brukes — takk til alle involverte!',
        },
        finish: {
          title: 'Fullt konfigurert! ⚙️',
          body: 'Nå kjenner du alle innstillingene.\n\n?-ikonet i menylinjen tar deg tilbake til denne rundturen når som helst — kapittel for kapittel hvis du vil.',
          details: 'Anbefaling for din første oppsettskveld:\n1. Bibliotekfanen: skann sangmappen\n2. Mikrofonfanen: velg forhåndsinnstilling + sjekk live-nivået\n3. Mobilfanen: koble til telefoner (companion-rundturen!)\n4. Temafanen: tenk over et festtema\n5. Synk & Backup: ta den første backupen\n\nDa står karaokekvelden på skinner.',
        },
      },
    },

    // ═══ Profilrundturen (R29) ═══
    profile: {
      title: 'Profiler & Karakterer',
      desc: 'Opprett spillere, følg XP & fremgang, synk på nett og companion-tilkobling.',
      chapters: {
        overview: 'Oversikt',
        characters: 'Karakterer & Fremgang',
        online: 'På nett & Companion',
      },
      steps: {
        welcome: {
          title: 'Spillerprofilene dine 👤',
          body: 'Profilene er identitetene i spillet: XP, nivå, statistikk og prestasjoner lever på profilen — og rekordene bærer navnet ditt.\n\nRundturen viser hvordan du oppretter og håndterer profiler.',
          details: 'Hvorfor profiler?\n• XP & nivå: sungne sanger, utfordringer og prestasjoner samler erfaring — nivået stiger sammen med rangtittelen (nybegynner → karaoke-legende).\n• Ledertavler: rekordoppføringer viser avataren din.\n• Festmoduser: hvert spillervalg trekkes fra denne listen.\n• Companion-enheter kan «koble» en profil og synge under dens identitet.\n\nProfiler lever i nettleserlagringen (lokalt) eller i en konto på nett (synk) — du velger når du oppretter dem.',
        },
        topBar: {
          title: 'Handlingslinjen',
          body: 'Her oppe veksler du ledertavler på nett, bytter lokalt/globalt og åpner opprettingsskjemaet for nye profiler.',
          details: 'Linjens elementer:\n• På nett-bryteren: slår på/av funksjoner på nett globalt (ledertavler, kontoregistrering)\n• Lokalt/Globalt: hvilken tavle rekordvisningen viser\n• «Last inn profil»: logger deg inn med en synkkode og henter profil på nett til denne enheten\n• «Ny profil»: åpner opprettingsskjemaet (neste steg)',
        },
        createButton: {
          title: 'Opprette en profil',
          body: '«Ny profil» åpner skjemaet: navn, avatarbilde, land og lagringsmodus (lokalt eller med konto på nett).',
          details: 'Skjemafeltene:\n• Navn: vises på ledertavler og i festmoduser\n• Avatar: last opp et eget bilde eller en initial på en farge\n• Land: flagg for globale ledertavler\n• Lagringsmodus: «Lokalt» lagrer kun på denne enheten; «På nett» registrerer valgfritt en konto (e-post + passord) og muliggjør synkronisering mellom enheter.\n\nKontoer på nett finnes bare med på nett-modus aktivert — registreringen kjører i bakgrunnen, og profilen er brukbar med en gang.',
        },
        empty: {
          title: 'Ingen profiler ennå',
          body: 'Her tar spillerne dine form. Klikk «Ny profil» og opprett den første karakteren — alt fungerer uten en, men XP og prestasjoner samles kun på profiler.',
        },
        cards: {
          title: 'Karakterkortene',
          body: 'Hvert kort viser avatar, nivå, rang og lagringsmodus. Et klikk velger profilen og viser detaljene dens nedenfor.\n\nPrikk øverst til høyre: grønn = aktiv, rød = deaktivert.',
          details: 'Kortsymboler:\n• ✓-boblen: den nå aktive profilen (startdialogen husker den)\n• Rangikonet + «Nivå X»: profilens fremgang\n• 💾/🌐-merket: lagret lokalt eller på nett\n• 📱-merket: denne profilen er koblet til en companion-enhet\n• Flagget: det valgte landet\n\nKlikk på et kort = velg det. Deaktivering (rødt) skjer i fremgangskortet — deaktiverte profiler forsvinner fra spillervalgene men beholder alle dataene sine.',
        },
        progression: {
          title: 'Fremgangskortet',
          body: 'XP-måleren til neste nivå pluss kjernestatistikken: sanger spilt, gullnoter, beste kombo og total poengsum.\n\nAktivbryteren til høyre deaktiverer profilen midlertidig.',
          details: 'Slik leser du statistikken:\n• Sanger spilt: hver fullførte runde teller\n• Gullnoter: samlet per sang — viser hvor presist du treffer høydepunktene\n• Beste kombo: lengste feilfrie rekke gjennom tidene\n• Total poengsum: summen av alle poeng\n\nAktivbryteren: deaktiverte profiler forsvinner fra spillervalg og kø (duell-/duettsanger ber da om nyvalg) men taper INGENTING — det er nok å aktivere igjen.',
        },
        settingsCard: {
          title: 'Profilinnstillinger',
          body: 'Rediger navn & avatar, bytt land, personvernvalg — og profilens QR-kode som lar en telefon koble til akkurat denne profilen.',
          details: 'Personvern: styrer hvilken statistikk som er synlig på globale ledertavler.\n\nVis QR-kode: genererer en kode som peker DIREKTE på denne profilen — telefonen som skanner den, kobles til som nettopp denne profilen (ideelt: hver sanger får telefonen sin med profilen sin).\n\nSletting fjerner profilen permanent — rekordene forblir som anonyme oppføringer. For profiler på nett spør appen en gang til før sletting.',
        },
        onlineToggle: {
          title: 'Ledertavler på nett',
          body: 'Bryteren aktiverer funksjoner på nett: globale rekorder, kontoregistrering og profilsynk mellom enheter.',
          details: 'Av = helt offline: alt blir lokalt, ingen nettverksforespørsler for ledertavler.\n\nPå = du får fanen «Global» på ledertavlene og kan opprette/laste inn profiler på nett.\n\nBytting trer i kraft umiddelbart — allerede samlede lokale rekorder består alltid.',
        },
        loginButton: {
          title: 'Laste inn en profil',
          body: 'Allerede registrert? «Last inn profil» henter profilen på nett via e-post/synkkode til denne enheten — fremgang og rekorder følger med.',
          details: 'Innloggingsdialogen kan to veier:\n• E-post + passord (som ved registreringen)\n• Synkkode: den korte koden fra profilen din — enklere på en fremmed maskin\n\nEtter innlogging slås den innlastede profilen sammen med den lokale (den høyeste fremgangen vinner). Synk kjører deretter automatisk i bakgrunnen.',
        },
        companionClaim: {
          title: 'Profiltilkobling 📱',
          body: 'Når en telefon kobles til med en profil, viser kortet en 📱. Telefonen synger og velger under den profilen — navn, XP og prestasjoner samles der.',
          details: 'Slik kobler du til (3 måter):\n1. Skann QR-koden i profilinnstillingene — kobles til DIREKTE med den profilen\n2. Velg en profil fra listen i appen etter tilkobling\n3. Her i Mobil-fanen i innstillingene: enhet → tildel profil\n\nÉn profil kan bare kobles til av ÉN enhet om gangen. Frakobling: i Mobil-fanen eller av telefonen selv.',
        },
        finish: {
          title: 'Laget er komplett! 🎭',
          body: 'Nå vet du hvordan profiler fungerer — fra XP til synk på nett og telefontilkobling.\n\nFortsett med prestasjonene: rundturen «Prestasjoner & Fremgang» viser hva profilen din kan samle.',
        },
      },
    },

    // ═══ Kø-rundturen (R29) ═══
    queue: {
      title: 'Køen',
      desc: 'Legg sanger i kø, endre rekkefølge, regler & companion-ønsker.',
      chapters: {
        overview: 'Oversikt',
        manage: 'Håndtering',
        companion: 'Companion & Autospilling',
      },
      steps: {
        welcome: {
          title: 'Køen 🎶',
          body: 'Køen organiserer karaokekvelden: sangene stiller seg på rad, alle får sin tur — ingen må passe PC-en.\n\nRundturen dekker kølegging, sortering og reglene.',
          details: 'Tre måter å legge i kø på:\n1. Biblioteket → klikk på en sang → velg «Legg til i kø» i stedet for «Start» i startdialogen\n2. Etter en sang: «Spill neste sang» på resultatskjermen holder flyten gående\n3. Via companion-appen: gjestene legger i kø fra telefonene sine (merket med 📱-merker)\n\nMenylinjen viser køens lengde som en tellerknapp — du ser kvelden komme.',
        },
        navButton: {
          title: 'Køknappen',
          body: 'I menylinjen leder «Kø» hit — tallet på knappen viser hvor mange sanger som venter.',
        },
        title: {
          title: 'Sangkøen',
          body: 'Listen viser alle ventende sanger med posisjon, modus (solo/duell/duett) og spillere — sortert etter køtid.',
        },
        empty: {
          title: 'Fortsatt tom',
          body: 'Ingen sanger i køen ennå. Legg til noen fra biblioteket (startdialogen → «Legg til i kø») — eller la gjestene legge i kø via companion-appen.',
        },
        list: {
          title: 'Kølisten',
          body: 'Hvert kort: posisjon, sang, modusmerke og spillerne. Et klikk på et kort starter sangen umiddelbart — også ut av rekkefølgen.',
          details: 'Merke:\n• 🎤 Solo / ⚔️ Duell / 🎭 Duett — modusen sangen ble lagt i kø med\n• 📱 — lagt til via companion-appen\n\nKlikk på et kort = spill nå. ✕-knappen til høyre fjerner oppføringen, ▶ starter den.\n\nTaster: Enter spiller, Delete fjerner, ↑/↓ blar i listen.',
        },
        reorder: {
          title: 'Endre rekkefølgen',
          body: 'Dra kortene til deres nye posisjon — bare lokale oppføringer kan flyttes, companion-ønsker beholder rekkefølgen sin.',
          details: 'Dra & slipp: ta tak i et kort og trekk opp eller ned med knappen inne. Listen viser slipp-posisjonen live.\n\nHvorfor companion-oppføringer står stille: gjesteappen sorterer etter innsendelsestid — hvis verten kunne stokket om, ville ønskenes føles manipulert. Du kan fortsatt fjerne dem.',
        },
        playNext: {
          title: 'Spill neste sang',
          body: 'Knappen starter den øverste oppføringen — standardtrekket mellom rundene. Alternativt: klikk direkte på et hvilket som helst kort.',
          details: 'Resultatskjermen etter hver sang tilbyr samme knapp («Spill neste sang») — flyten fortsetter uten omvei til køvisningen.\n\nMed autospilling aktivert (Innstillinger → Spilling) går appen videre automatisk.',
        },
        clearAll: {
          title: 'Tøm alt',
          body: '«Tøm alt» tømmer hele køen — companion-oppføringer inkludert. Det finnes ingen vei tilbake, så vær forsiktig.',
        },
        rules: {
          title: 'Reglene',
          body: 'Den offisielle regelboken ligger nederst: maks 3 sanger per spiller, FIFO-rekkefølge, fjern egne sanger, velg karakter først …',
          details: 'Reglene i detalj:\n• Maks 3 sanger per spiller om gangen — ingen kan blokkere køen. Den som har sunget, kan legge i kø igjen.\n• FIFO: først inn = først fram. Dra & slipp sorterer lokalt.\n• Egne sanger kan fjernes når som helst; andres bare via «Tøm alt» eller som vert.\n• Karakter først: køen trenger aktive profiler for duell/duett, ellers ber den om nyvalg ved start.\n• Companion-ønsker viser 📱-merket og teller som egne.',
        },
        companionAdd: {
          title: 'Ønsker fra telefoner 📱',
          body: 'Gjestene legger sanger i kø via companion-appen — de dukker opp med et 📱-merke i listen og teller mot grensen deres på 3 sanger.',
          details: 'Slik ser det ut for gjestene: velg en sang i appen, velg modus, send inn — ønsket lander i denne listen.\n\nDu som vert ser umiddelbart: hvem som ønsket (spilleravatar) og at det er en telefonforespørsel (📱). Grensen på 3 gjelder per profil — også via telefon.\n\nMer i companion-rundturen.',
        },
        autoplay: {
          title: 'Autospilling & snarvei',
          body: 'Aktiver autospilling (Innstillinger → Spilling) så starter neste sang automatisk etter hver runde. Og: Ctrl+Q starter den øverste køoppføringen fra hvor som helst.',
          details: 'Autospillingskjeden: sangen slutter → resultatet vises kort → neste køoppføring starter. Når køen renner tom, stopper kjeden rent.\n\nCtrl+Q fungerer fra alle steder — klassikeren når neste runde skal rulle med en gang.',
        },
        finish: {
          title: 'Køen venter! 🎧',
          body: 'Nå kan du kølegging, sortering og reglene.\n\nTips: kombiner autospilling + companion-ønsker for en helt selvkjørende karaokekveld.',
        },
      },
    },

    // ═══ Chat-rundturen (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Åpne panelet, send meldinger, «Send som»-velgeren & sangutfordringer.',
      chapters: {
        basics: 'Åpne chatten',
        usage: 'Sende meldinger',
        challenges: 'Utfordringer',
      },
      steps: {
        welcome: {
          title: 'Festchatten 💬',
          body: 'Chatten kobler sammen skrivebord og companion-apper: snakk uten å avbryte syngingen — og utfordre hverandre til sangdueller.\n\nJeg åpner panelet for deg om et øyeblikk.',
          details: 'Hva chatten kan:\n• Tekstmeldinger mellom skrivebordet (verten) og alle tilkoblede telefoner\n• Avsendervalg: verten kan skrive på vegne av en spiller\n• Sangutfordringer: gjester kan utfordre til dueller — aksepter på skrivebordet og kjør\n\nForutsetning: for at telefonene skal delta i samtalen, må companion-enheter være tilkoblet (Mobil-fanen i innstillingene — se companion-rundturen).',
        },
        navButton: {
          title: 'Åpne chatten',
          body: 'Chat-knappen i menylinjen åpner panelet — det glir inn som et sidepanel over skjermen og lukkes med ✕ eller et klikk ved siden av.',
        },
        panel: {
          title: 'Chatpanelet',
          body: 'Historikken ruller til venstre, du skriver nederst. Panelet forblir åpent til du lukker det — også ved skift av skjerm.',
        },
        messages: {
          title: 'Historikken',
          body: 'Meldingene dine vises til høyre i cyan (som vert), bidrag fra telefonene til venstre i lilla. Hver melding bærer tidsstempelet sitt.',
          details: 'Bakgrunnsoppdatering: panelet henter nye meldinger hvert tredje sekund — du går ikke glipp av noe selv når det kjører i bakgrunnen.\n\nChat-varslingen på skrivebordet (bjellen) viser uleste meldinger selv med panelet lukket.',
        },
        sendAs: {
          title: '«Send som»',
          body: 'Du er verten — men du får skrive på vegne av en spiller: rullegardinmenyen velger identiteten. 🖥️ = vert, 📱 = spiller.',
          details: 'Hva det er godt for:\n• Verten skriver for noen uten telefon («Anna sier: refreng en gang til!»)\n• Scenekunngjøringer i programlederprofilens navn\n\nFargedotten ved siden av rullegardinmenyen viser spillerfargen — historikken holder orden på hvem som «snakket».',
        },
        input: {
          title: 'Skrive en melding',
          body: 'Skriv i feltet (maks 200 tegn) og trykk Enter — eller bruk send-knappen.',
        },
        send: {
          title: 'Sende',
          body: 'Send med Enter eller knappen — meldingen dukker opp i historikken med en gang og på hver tilkoblede telefon.',
        },
        songChallenges: {
          title: 'Sangutfordringer ⚔️',
          body: 'Gjester kan utfordre deg til en sang rett fra appen: et utfordringskort dukker opp i chatten — «Godta utfordringen» starter duellen.',
          details: 'Slik går utfordringen for seg:\n1. En gjest velger en sang i appen og trykker «Utfordre»\n2. Kortet dukker opp i chatten med sang, utfordrer og godta-knappen\n3. Godta på skrivebordet — startdialogen åpnes med duellmodus forhåndsvalgt\n4. Syng! Vinneren tar æren (og poengene)\n\nMerk: «Send som» må være satt til en spiller for dette — motstanderen må være identifiserbar.',
        },
        companionSide: {
          title: 'På telefonene',
          body: 'Companion-appen har sin egen chatfane — der skriver gjestene. Det du ser her, ser de i sanntid — og omvendt.',
        },
        finish: {
          title: 'Meldingen levert! 💌',
          body: 'Nå kan du chatten — fra panelet til sangutfordringene.\n\nSammen med companion-rundturen blir det tydelig hvordan telefoner og skrivebord samarbeider.',
        },
      },
    },

    // ═══ Companion-rundturen (R29) ═══
    companion: {
      title: 'Companion-appen',
      desc: 'Koble til smarttelefoner: mikrofon, fjernkontroll, sangønsker & syng-med.',
      chapters: {
        connect: 'Tilkobling',
        features: 'Hva appen kan',
        manage: 'Håndtere enheter',
      },
      steps: {
        welcome: {
          title: 'Telefoner som tilbehør 📱',
          body: 'Companion-appen forvandler hver smarttelefon til et karaoke-tilbehør: mikrofon, fjernkontroll, sangvalg og chat — ingen installasjon, rett i nettleseren.\n\nRundturen dekker skrivebordssiden av flyten.',
          details: 'Prinsippet: skrivebordet er verten (musikk, noter, poeng) — telefonene kobler seg til via WiFi og blir, etter behov:\n• 🎤 Mikrofoner (med tonehøydemåling i telefonen!)\n• 🎮 Fjernkontroller (styrer skjermer)\n• 🎵 Sanglesere med køønsker\n• 💬 Chat-deltakere\n• 🪞 Live-speil av skrivebordsskjermen\n\nIngen appbutikk, ingen konto — skann QR-koden, ferdig.',
        },
        mobileTab: {
          title: 'Åpne Mobil-fanen',
          body: 'Tilkoblingen starter i Innstillinger → Mobil. Jeg åpnet nettopp fanen for deg.',
        },
        qrCode: {
          title: 'Skann QR-koden',
          body: 'Den store koden til venstre er den direkte ruten: åpne telefonkameraet, skann, og appen lastes i nettleseren. Viktig: telefon og PC i samme WiFi.',
          details: 'QR-koden inneholder skrivebordets LAN-adresse (f.eks. http://192.168.1.42:3000/mobile) — derfor må begge enhetene dele nettverk.\n\nHvis koden nekter: URL-en nedenfor kan skrives inn eller kopieres (knapp). I offentlig WiFi uten enhetssynlighet mislykkes tilkoblingen dessverre — bruk en personlig hotspot i stedet.',
        },
        connectionInfo: {
          title: 'URL & kopieringsknapp',
          body: 'Til høyre adressen som tekst — med en kopieringsknapp for deling (f.eks. via meldingsapp til gjestene dine). Den grønne linjen bekrefter den oppdagede nettverks-IP-en.',
          details: 'Forhåndsdelingstips: send URL-en til gjestene før festen — så snart skrivebordet kjører, kobler alle til med en gang.\n\nDen gule advarselen vises når ingen LAN-IP ble oppdaget (f.eks. ren localhost-drift) — da kan bare samme maskin nå den.',
        },
        roles: {
          title: 'Appens roller',
          body: 'Etter tilkobling tilbyr appen, avhengig av situasjonen:\n\n🎤 Mikrofonvisning med tonehøydevisning\n🎮 Fjernkontroll for skrivebordet\n🎵 Sanglesing + køønsker\n💬 Chat\n🪞 Live-speil av skjermen',
          details: 'Rollene i detalj:\n• Mikrofon: telefonen måler tonehøyde og sender den live — skrivebordet viser notene som fra en «ekte» mikrofon. Fungerer i alle moduser (duell også: to telefoner!).\n• Fjernkontroll: skjermer, knapper og bekreftelser fra telefonen — nyttig for verten som beveger seg i rommet.\n• Sanglesing: hele biblioteket i telefonen — inkludert forhåndsvisning og køønsker med 📱-merket på skrivebordet.\n• Chat: meldinger til skrivebordet og andre gjester.\n• Speil: skrivebordsskjermen (spill, resultater) speiles i telefonen — gjestene ser alt fra plassene sine.',
        },
        chatRole: {
          title: 'Chat på skrivebordet',
          body: 'Det gjestene skriver i app-chatten lander i chatten på skrivebordet (Chat-knappen i menylinjen) — og tilbake. Det finnes en egen chat-rundtur for det.',
        },
        queueRole: {
          title: 'Ønsker i køen',
          body: 'Gjestene legger sanger i kø fra telefonene sine — de dukker opp på skrivebordet i køen med 📱-merket. Også det dekker en egen rundtur.',
        },
        singAlong: {
          title: 'Syng-med-moduser 🎶',
          body: 'I festmodusene Companion Singalong og Gi mikrofonen synger gjestene rett via telefonene sine — tonehøydemålingen kjører i enheten, skrivebordet dirigerer.',
          details: 'Companion Singalong: hver gjest får tekst + tonehøydevisning på telefonen — skrivebordet viser den felles notebanen.\n\nGi mikrofonen: mikrofonen går på rundgang — til og med blandet mellom telefon og fysisk mikrofon.\n\nFor begge: jo bedre WiFi, desto jevnere tonehøyde. Hvis det hakker, hjelper det å komme nærmere ruteren.',
        },
        deviceList: {
          title: 'Enhetslisten',
          body: 'Tilbake i Mobil-fanen: alle tilkoblede enheter viser tilkoblingstid, rolle, tildelt profil og siste aktivitet — inkludert en spark-ut-knapp.',
          details: 'Enhetskortet viser:\n• Tilkoblingsvarighet («i 12 min»)\n• Hva enheten gjør (mikrofon aktiv, fjernkontroll …)\n• Den tilkoblede profilen — en rullegardinmeny tildeler en annen\n• Spark ut: kobler fra enheten (den kan koble til igjen med en gang)\n\nTips: gi profilene talende navn — listen holder seg oversiktlig selv med mange gjester.',
        },
        profileClaim: {
          title: 'Profiltilkobling',
          body: 'Hver enhet kan koble til en profil: gjesten synger deretter under sitt eget navn med sin egen XP — profilsiden viser tilkoblingen med et 📱-merke.',
          details: 'Måter å koble til på:\n1. Skann profil-QR-koden i profilinnstillingene (mest direkte)\n2. Velg fra listen i appen etter tilkobling\n3. Her i enhetslisten via rullegardinmenyen\n\nDetaljer finnes også i profil-rundturen.',
        },
        microphoneFallback: {
          title: 'Telefon i stedet for mikrofon',
          body: 'Når alle synger via telefon, kan du hoppe helt over mikrofonfanen — appen regulerer følsomheten selv. Fysiske mikrofoner konfigureres i mikrofonfanen som vist.',
        },
        finish: {
          title: 'Tilkoblet! 🔗',
          body: 'Nå vet du hvordan telefoner kobler seg til og hva de kan.\n\nNeste steg: åpne URL-en i din egen telefon og kjør en første test — mikrofonmodus er mest imponerende.',
        },
      },
    },

    // ═══ Prestasjonsrundturen (R29) ═══
    achievements: {
      title: 'Prestasjoner & Fremgang',
      desc: 'Prestasjoner, XP-nivåer, sjeldenheter og daglige utfordringer.',
      chapters: {
        overview: 'Oversikt',
        unlock: 'Låse opp prestasjoner',
        daily: 'Daglige utfordringer',
      },
      steps: {
        welcome: {
          title: 'Prestasjoner & fremgang 🏆',
          body: 'Alt du samler: prestasjoner med sjeldenheter, XP-nivåer med rangtitler og de daglige utfordringene som XP-motor.\n\nRundturen går gjennom prestasjonsskjermen og utfordringene.',
          details: 'De tre systemene sammen:\n• XP: «drivstoffet» — fra sanger, utfordringer og prestasjoner\n• Nivåer & rang: stiger med XP (nybegynner → legende) og viser fremgangen med ett blikk\n• Prestasjoner: milepæler med belønninger — noen hemmelige til du låser dem opp\n\nAlt henger på profilen — den som synger, samler (se profil-rundturen).',
        },
        navButton: {
          title: 'Prestasjonsknappen',
          body: 'I menylinjen leder pokalen til prestasjonene — den andre pokalkolonnen ved siden av viser ledertavlene.',
        },
        playerSelector: {
          title: 'Spillervalg',
          body: 'Her oppe velger du hvem sin prestasjoner du ser på — praktisk for å vise frem samlingen. Tallet på profilen viser antall låst opp.',
        },
        stats: {
          title: 'Statistikk-kortene',
          body: 'Fire kort i én oversikt: låste opp prestasjoner, XP samlet fra dem, fullføring i prosent og nåværende nivå med rangtittel.',
          details: 'Prosentkortet regner ut: låst opp ÷ alle prestasjoner. 100 % er samlernes terskel — belønnes som regel med en egen hemmelig prestasjon.\n\nNivåkortet viser i tillegg rangtittelen («Rising Star», «Karaoke-legende» …) — titlene kommer fra profilens fremgangssystem.',
        },
        filters: {
          title: 'Filter',
          body: 'Venstre: statusfilterne (alle / låst opp / låst). Høyre: kategoriene: prestasjon, fremgang, sosialt og spesiell.',
          details: 'Kategoriene betyr:\n• Prestasjon: sangbragder (komboer, gullnoter, perfekte runder)\n• Fremgang: samlingsmilepæler (sanger spilt, XP-mengder, nivåer)\n• Sosialt: fest- og flerspillerhandlinger (dueller, companion-runder)\n• Spesiell: hemmeligheter og kuriositeter — beskrivelsen avsløres først ved opplåsning\n\nKan kombineres: «Låst + Spesiell» viser hva som fortsatt venter på deg.',
        },
        grid: {
          title: 'Prestasjonskortene',
          body: 'Hvert kort: ikon, navn, beskrivelse, sjeldenhet og XP-belønning. Låste opp skinner gyllent med dato — låste forblir grå.',
          details: 'Sjeldenhetene (fargekodede):\n• Vanlig — kommer naturlig ved vanlig spill\n• Sjelden — krever bevisste handlinger\n• Episk — hardt arbeid eller heldige tilfeldigheter\n• Legendarisk — for de få\n\nOpplåsning skjer automatisk så snart betingelsen er oppfylt — toast-varsling inkludert. XP-en lander umiddelbart på profilen.',
        },
        xpSystem: {
          title: 'Så flyter XP',
          body: 'XP kommer fra tre kilder: sungne sanger (etter vanskelighetsgrad), utfordringer (daglig/ukentlig) og prestasjoner. Nivåer låser opp rang — og noen funksjoner som profilmerker.',
          details: 'XP-kildene i korte trekk:\n• Fullført sang: grunn-XP etter vanskelighetsgrad (lett → ekspert, stigende)\n• Daglig luke: 100–400 XP + bonuser\n• Ukentlig luke: 500–2000 XP\n• Prestasjon: engangsbelønning per prestasjon (25–1000 XP etter sjeldenhet)\n\nNivåmåleren på profilsiden viser veien til neste nivå; rangene skifter med noen nivåers mellomrom.',
        },
        navDaily: {
          title: 'Til utfordringene',
          body: 'De daglige utfordringene har sin egen skjerm — stjerneknappen i menylinjen leder dit. Navigerer nå.',
        },
        playerSelection: {
          title: 'Steg 1: velg spillere',
          body: 'Veiledet flyt: velg først hvem som spiller — først deretter dukker oppgavene opp. Flere spillere er mulig; statistikken tilhører den første.',
          details: 'Hvorfor valget først? Luger og statistikk er per profil — uten en valgt spiller ville det ikke være noe å beregne.\n\nKortet viser alle aktive profiler; valg skjer ved klikk. Deretter folder steg 2 (oppgaver) og steg 3 (spilling) seg ut.',
        },
        slots: {
          title: 'Steg 2: de 5 lugene',
          body: 'Fem oppgaveluger per dag som låses opp etter tur. Hver luke viser oppgaven, spillbare vanskelighetsgrader og XP-verdien — høyere vanskelighetsgrader multipliserer.',
          details: 'Luke-mekanikken:\n• Lugene 2–5 åpnes først når den foregående er fullført eller hoppet over — kjeden tvinger frem variasjon.\n• Hver oppgave er en betingelse for neste sang («sjanger rock», «minst 80 % presisjon» …) — biblioteket filtrerer automatisk frem samsvarende sanger.\n• Vanskelighetsvalg per luke: opptil 3× XP-multiplikator på ekspert.\n\nVed midnatt kommer fem ferske oppgaver — kjeden starter på nytt.',
        },
        badges: {
          title: 'Merker & ukentlig',
          body: 'Å cleare flere luger gir daglige merker (bronse/sølv/gull) med ekstra XP. Det ukentlige motstykket kjører 7 dager med feit belønning — samme mekanikk, større pott.',
          details: 'Merkenivåer per dag:\n• Bronse: 2 luger\n• Sølv: 3–4 luger\n• Gull: alle 5 lugene — pluss daglig bonus-XP\n\nUkentlig: 5 luger over 7 dager, 500–2000 XP per luke, nullstilling på mandager. Å spille daglig OG ukentlig nivåer deg betydelig raskere enn sanger alene.',
        },
        challengeModes: {
          title: 'Utfordringsmoduser',
          body: 'I tillegg til lugene finnes frie utfordringsmoduser med modifikatorer (f.eks. «2× tempo», «ingen noter») — for egne regler og ekstra XP utover de daglige oppgavene.',
          details: 'Modusene er fritt konfigurerbare: velg en modus, kombiner modifikatorer, XP-potten vokser med vanskeligheten.\n\nFullføringer låser opp nye modifikatorer — samlingskortet i utfordringsområdet viser hva du har.',
        },
        finish: {
          title: 'Samletid! 🏅',
          body: 'Nå kan du prestasjoner, XP og utfordringer — de tre fremgangsmotorene.\n\nTips til å begynne med: spill 2 daglige luger i dag — resten kommer av seg selv.',
        },
      },
    },
  },
};
