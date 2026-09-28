// SV translations — tutorial
// Guider/rundturer: ?-hjälpmenyn, överlägget, förststartserbjudandet och
// 8 rundturer (grund, editor, inställningar, profiler, kö, chatt, companion,
// prestationer). Baserad på EN-filen (en/tutorial.ts) — identisk nyckelstruktur.
export const tutorialTranslations = {
  tutorial: {
    // ?-hjälpmeny
    helpButtonTitle: 'Hjälp & guider',
    helpDialogTitle: 'Hjälp & guider',
    helpDialogDesc: 'Se rundturerna igen — eller hoppa direkt in på ett ämne och få just den delen förklarad.',
    helpFooter: 'Tangenter i rundturen: → nästa · ← tillbaka · Esc avsluta',
    startFullTour: 'Hela rundturen',
    stepsCount: '{n} steg',
    completedBadge: 'Slutförd',
    // Rundtursgrupper i hjälpmenyn (R29: 8 rundturer behöver struktur)
    groupGettingStarted: 'Kom igång',
    groupAreas: 'Områden & funktioner',
    groupAdvanced: 'För proffs',
    // Överläggets styrning
    ariaLabel: 'Guidad rundtur',
    skipTour: 'Avsluta rundturen',
    back: 'Tillbaka',
    next: 'Nästa',
    finish: 'Klar',
    clickHint: 'Klicka på den nu',
    // Utfällning "Mer info" (R29)
    moreDetails: 'Mer info',
    lessDetails: 'Visa mindre',
    // Erbjudande vid första start
    offerTitle: 'Välkommen till Karaoke ZERO!',
    offerBody: 'Vill du ha en snabb genomgång av grunderna? Om 2 minuter känner du till dagliga utmaningar, sjunglägen, biblioteket och festspelen.',
    offerStart: 'Starta rundturen',
    offerLater: 'Kanske senare',
    offerHint: 'Finns alltid tillgängligt via ?-ikonen i menyraden.',

    // ═══ Grundrundturen ═══
    basic: {
      title: 'Grunderna',
      desc: 'Rundturen: utmaningar, sjunglägen, bibliotek, fest & mer.',
      chapters: {
        welcome: 'Välkommen',
        challenges: 'Dagligen & veckovis',
        singing: 'Börja sjunga',
        party: 'Festlägen',
        more: 'Fler områden',
      },
      steps: {
        welcome: {
          title: 'Välkommen! 👋',
          body: 'Det här är en live-rundtur: jag lyfter fram de viktiga ställena och förklarar dem.\n\nKontroller: "Nästa" (eller tangent →), "Tillbaka" (←) och "Avsluta rundturen" (Esc). Nu kör vi!',
          details: 'Du kan pausa rundturen när som helst och fortsätta senare: ?-ikonen i menyraden öppnar hjälpmenyn med alla rundturer — de går att spela kapitel för kapitel också.\n\nMånga steg har en "Mer info"-knapp nedtill: den fäller ut extra detaljer utan att du tappar den korta texten.',
        },
        heroButtons: {
          title: 'Snabbstart',
          body: '"Börja Sjunga" tar dig direkt till biblioteket. "Festläge" öppnar de 9 festspelen för grupper.',
          details: 'Snabbstartskorten är genvägar till de vanligaste vägarna:\n• "Börja Sjunga" = öppna biblioteket, välj en låt, kör (solo, duell eller duett).\n• "Festläge" = spelsamlingen för 2–24 spelare, telefoner kan ansluta som mikrofoner.\n\nAllt du ser här går också att nå via menyraden — korten sparar bara klick.',
        },
        dailyCard: {
          title: 'Daglig utmaning',
          body: '5 luckor per dag med roterande uppgifter — ju fler luckor du rensar, desto större XP-bonus. Färska uppgifter droppar vid midnatt.',
          details: 'Så fungerar systemet:\n• Var och en av de 5 luckorna innehåller en egen uppgiftstyp (t.ex. "sjung en 80-talslåt", "få 8000 poäng").\n• Luckorna låses upp i tur och ordning — lucka 2 öppnas först när lucka 1 är klar (eller överhoppad).\n• Varje lucka går att spela i flera svårighetsgrader; de högre ger mer XP (upp till 3× multiplikator).\n• Bonusen växer med antalet rensade luckor: 5/5 ger hela den dagliga bonusen.\n\nUppgifterna dras från DITT bibliotek — urvalet anpassar sig alltid efter dina låtar.',
        },
        weeklyCard: {
          title: 'Veckoutmaning',
          body: 'Veckans motstycke: 5 luckor under veckan med större XP-belöningar. Perfekt för långsiktiga mål.',
          details: 'Veckoutmaningarna fungerar som de dagliga, men:\n• De 5 luckorna gäller i 7 dagar — ingen daglig nollställning, samla i din egen takt.\n• XP-belöningarna per lucka är betydligt större (t.ex. 500–2000 XP istället för 100–400).\n• Nollställningen sker måndag morgon.\n\nTips: daglig och veckoutmaning körs parallellt — spela båda så stiger du i nivå snabbast.',
        },
        modeLauncher: {
          title: 'Sjung: Solo, Duell & Duett',
          body: '🎤 Solo: en spelare, en mikrofon.\n⚔️ Duell: två spelare på SAMMA låt — flest poäng vinner.\n🎭 Duett: två röster på två spår — biblioteket visar automatiskt bara matchande duettlåtar.',
          details: 'De tre lägena i detalj:\n• Solo: klassisk karaoke — du sjunger alla noter och din poäng hamnar på topplistorna.\n• Duell: båda spelarna sjunger samma notspår samtidigt. Poängen räknas var för sig — jämförelsen efteråt visar vem som var bäst. Perfekt för revansch.\n• Duett: låten har två separata röster (P1/P2) — var och en sjunger "sina" delar, gemensamma fraser ger lagbonus. Duettlåtar markeras med 🎭-filtret i biblioteket.\n\nMikrofoner: du kan koppla in hur många mikrofoner eller smarttelefoner du vill (se Inställningar → Mikrofon).',
        },
        libraryNav: {
          title: 'Biblioteket',
          body: 'Alla dina låtar finns här. Sök på titel eller artist — den fuzziga sökningen förlåter till och med stavfel.',
          details: 'Söktips:\n• Den fuzziga sökningen hittar "Dancing Qun" → "Dancing Queen". Den struntar i versaler och enstaka stavfel.\n• Den söker på titel, artist OCH genre samtidigt — "Rock" hittar även låtar med genren Rock.\n\nSortering via rullgardinsmenyn (titel A–Ö, artist, nyligen tillagda). Låtar tar sig in i biblioteket via import, mappskanning eller spellistor — vägen dit finns i biblioteksfliken i inställningarna.',
        },
        filters: {
          title: 'Filter',
          body: 'Genre, språk, år, decennium, duettlåtar och viral-hits — skär biblioteket precis hur du vill.',
          details: 'Alla filter kan kombineras — t.ex. visar "Genre: Rock + Språk: Engelska + Era: 80-tal" exakt de engelska rocklåtarna från åttiotalet.\n\nSpecialfilter:\n• Duett: bara låtar med två röstspår.\n• Viral-hits: låtar som just nu finns i de virala listorna (data från Inställningar → Viral Charts).\n• Egna genrer & språk: skapa egna kategorier under Inställningar → Genrer & Språk — de dyker upp direkt i filtren.\n\n"Rensa filter" (✕) nollställer allt på en gång.',
        },
        songCard: {
          title: 'Låtar',
          body: 'Ett klick på ett låtkort öppnar startdialogen: läge, spelare, mikrofoner och svårighetsgrad.',
          details: 'Varje låtkort visar:\n• Omslag plus titel/artist\n• Svårighetsgrad (lätt/medel/svårt/expert) och stjärnbetyg\n• Nyckelmetadata som genre och språk — direkt från låten eller harmoniserad via AI (Editorn → Metadata-studion).\n\nFörhandsvisningsikonen startar en kort teaser utan att öppna startdialogen.',
        },
        startModal: {
          title: 'Startdialogen',
          body: 'Ställ in allt här: läge (solo/duell/duett), vem som sjunger, vilken mikrofon var och en får — och svårighetsgraden.\n\nTryck sedan på "Starta" — och så kör det!',
          details: 'De viktigaste valen:\n• Läge: solo, duell (2 spelare, samma spår) eller duett (2 röster) — i duettläget väljer båda spelarna sin röst (P1/P2).\n• Mikrofoner: varje spelare kan få en egen inenhet — eller en smartphone som mikrofon (companion-appen).\n• Svårighetsgrad: påverkar poängsättningen — svårare grader förlåter mindre och belönar precision (högre poängpotential, mer XP).\n• "Lägg till i Kö" i stället för "Starta": låten ställs i kön i stället för att starta direkt — perfekt när flera vill sjunga.',
        },
        partyCard: {
          title: 'Festlägen',
          body: '9 spel för 2–24 spelare: Battle Royale, Ge över Micen, Medleytävling, turnering, Saknade Ord, Blind Karaoke och mer — telefoner kan ansluta som mikrofoner.',
          details: 'De 9 lägena i korthet:\n• Battle Royale: alla sjunger, den svagaste åker ut varje omgång — sist kvar vinner.\n• Ge över Micen: miken vandrar från spelare till spelare — alla sjunger sin del.\n• Medleytävling: lag sjunger sig genom korta låtsnuttar med specialregler.\n• Turnering: utslagsträd med dueller — vinnaren klättrar varje omgång.\n• Saknade Ord: ord i texten blankas ut — sjung rätt ord för att få poäng.\n• Blind Karaoke: inga noter syns, bara öronen gäller!\n• Betygsätt min låt & Companion Singalong med mera — varje lägeskort förklarar sig självt.\n\nNästan alla lägen stödjer companion-appen som mikrofon och fjärrkontroll.',
        },
        partyModes: {
          title: 'Lägeväljaren',
          body: 'Här väljer du festläge: Battle Royale (sist kvar vinner), Ge över Micen, turnering (utslagsträd), medley och mer.\n\nVarje kort visar vad som väntar — ett klick öppnar spelarvalet.',
          details: 'Efter klick på ett lägeskort följer spelarvalet: välj profiler (eller anslut companion-enheter) och ställ sedan in lagstorlekar, antal omgångar eller tidsgränser beroende på läge.\n\nTemafest-tips: när ett tema är aktivt i inställningarna (t.ex. "80-talsfest") drar varje låtval i festläget automatiskt bara från matchande låtar — festen håller sig på temat.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke utan tävling: bygg spellistor, köa låtar, dela favoriter. Den perfekta bakgrundsunderhållaren.',
          details: 'Jukeboxen är det avslappnade läget:\n• Välj spellistor eller enstaka låtar som pool.\n• Valbara videopauser emellan så att stämningen aldrig bryts.\n• Ingen poängsättning, inga mikrofoner behövs — låtarna spelas bara med text.\n\nPerfekt som underhållning hela kvällen eller som uppvärmning innan första omgången.',
        },
        jukeboxView: {
          title: 'Inuti jukeboxmenyn',
          body: '"Bläddra i spellistor" ger dig direkt åtkomst till alla sparade spellistor — även de du skapat i biblioteket. Ett klick köar hela spellistan.',
          details: 'Jukeboxens spellisteinställningar erbjuder:\n• Om videor visas (om låtarna har någon)\n• Videopauser: pausvideor mellan låtarna, t.ex. för att göra utrop\n• Om poolen blandas eller spelas i fast ordning\n\nStartar i helskärm — avsluta med Escape eller stoppknappen upptill.',
        },
        highscoreCard: {
          title: 'Highscores',
          body: 'Highscores per låt och svårighetsgrad — slå dina vänner (eller dig själv).',
          details: 'Listorna minns per låt och svårighetsgrad:\n• Poäng, träffsäkerhet, guldnoter och datum\n• Vilken spelare som ligger bakom posten (profilavatar)\n• Om posten kom via companion-appen (telefonikon) eller skrivbordet\n\nMed onlineläget aktiverat (profilsidan) ser du dessutom globala listor och tävlar mot spelare från andra installationer.',
        },
        highscoreView: {
          title: 'Poänglistorna',
          body: 'Filtrerade per låt och svårighetsgrad — med filterraden upptill. Telefonikonerna visar användning från companion-appen.',
          details: 'Filterraden upptill möjliggör:\n• Sökning på låt eller spelare\n• Filtrering på svårighetsgrad\n• Växling lokalt/globalt (när onlineläget är aktiverat)\n\nAnti-fusk: varje post bär ett låt-fingeravtryck — manipulerade resultat upptäcks och flaggas.',
        },
        settingsCard: {
          title: 'Inställningar',
          body: 'Mikrofoner, språk, finjustering av gameplay, utseende och grafik — alla reglage bor här.',
          details: 'De 12 inställningsflixarna i korthet:\n• Allmänt: språk, standardsvårighetsgrad, online\n• Gameplay: poängsättning, partiklar, autospel av kön\n• Utseende: teman, textstil, bakgrund\n• Grafik / Ljud: utgångsenhet, volym, YouTube-kvalitet\n• Mikrofon: enheter, känslighet, brusport, förinställningar\n• Mobil: anslut & hantera companion-enheter\n• Webbkamera: webbkamera som bakgrund\n• Bibliotek: låtmapp, import, återställning\n• Genrer & Språk: egna kategorier\n• Temafest: aktivera & konfigurera tema\n• Synk & Backup: säkerhetskopior\n\nDet finns en egen, fördjupad inställningsrundtur för alla flikar i ?-hjälpmenyn.',
        },
        settingsView: {
          title: 'Inställningsflixarna',
          body: 'Välj ett avsnitt upptill: Allmänt (språk), Gameplay, Utseende, Grafik / Ljud, Mikrofon, Mobil (telefonanslutning) och mer.',
          details: 'Sedan R28 förklarar en kort introtext överst i varje flik vad den gör — du behöver aldrig gissa var en inställning hör hemma.\n\nMatchande rundtur: "Inställningar" i ?-hjälpmenyn går igenom varje flik.',
        },
        finish: {
          title: 'Klart! 🎉',
          body: 'Nu kan du grunderna.\n\nTips: ?-ikonen i menyraden tar dig tillbaka när som helst — även till enskilda ämneskapitel, editor-rundturen och inställningsrundturen.',
          details: 'Vad nu? Några förslag för dina första minuter:\n1. Skapa en profil (Profiler i menyraden) — utan profil spelar du, men samlar inget XP.\n2. Importera låtar (Inställningar → Bibliotek).\n3. Några rundor daglig utmaning för XP-boosten.\n4. Vänner på väg? Testa festläget — companion-appen förvandlar varje telefon till en mikrofon (det finns en egen companion-rundtur).',
        },
      },
    },

    // ═══ Editor-rundturen ═══
    editor: {
      title: 'Editor-rundturen',
      desc: 'Noter, texter, röster & harmonisering — låtverktyget.',
      chapters: {
        entry: 'Vägen in',
        layout: 'Layout',
        notes: 'Redigera noter',
        extras: 'Extras & harmonisering',
      },
      steps: {
        welcome: {
          title: 'Editorn ✏️',
          body: 'Här förvandlas låtar till spelbara karaoke-spår: placera noter, tajma texter, tilldela röster.\n\nSandlåde-tipset: öva på en testlåt — ändringar går att ångra med Ctrl+Z.',
          details: 'Editorn arbetar med UltraStar-formatet: varje not har en starttid, en längd, en tonhöjd och en text (stavelse). Många noter bildar notbanan du ser i spelet.\n\nKällor för nya låtar:\n• Textimport (UltraStar/TXT) i editorn\n• MIDI-import (noter genereras från MIDI)\n• AI-harmonisering: text + ljud → notförslag\n\nAllt är icke-förstörande: tills du sparar lämnas originallåten orörd.',
        },
        songList: {
          title: 'Låtval',
          body: 'Sök fram en låt för att öppna den. Filtren avslöjar låtar med saknad metadata — editorn harmoniserar dem senare.',
          details: 'Filterchipsen ovanför listan visar låtar utan genre/språk/år — den snabbaste vägen till låtar som Metadata-studion ännu inte behandlat.\n\nSökningen omfattar titel och artist — versaler spelar ingen roll.',
        },
        noSongs: {
          title: 'Inga låtar ännu',
          body: 'Editorn behöver låtar i biblioteket. Importera låtar först (bibliotek → import / mappskanning) och kom tillbaka.',
          details: 'Så får du låtar:\n• Inställningar → Bibliotek → ställ in låtmappen: varje undermapp läses som en låt (ljud/video + UltraStar-text).\n• Alternativt enstaka filer via importdialogen.\n• Eller skapa en ny låt i editorn ("Ny låt") och sätt ihop text + ljud själv.',
        },
        openSong: {
          title: 'Öppna en låt',
          body: 'Klicka på en låt i listan nu för att öppna den i editorn.',
          details: 'När den är öppen ser du verktygsraden (underhuvudet) upptill och tidslinjen med vågform, notbanor och texter.\n\nLåten förblir öppen tills du stänger den via "Tillbaka" — osparade ändringar begär bekräftelse först.',
        },
        leftPanel: {
          title: 'Verktygsraden',
          body: 'Allt för noterna: lägg till, duplicera, ta bort, dela, slå ihop — plus nottyper, röster och tryckläge (kommer strax).',
          details: 'Verktygen i ordning:\n• ➕ Lägg till not: droppar vid uppspelningshuvudet\n• ⧉ Duplicera: kopierar den markerade noten direkt bakom sig\n• 🗑 Ta bort: raderar markeringen\n• ✂ Dela: en not → två (på mitten)\n• ⇄ Slå ihop: två markerade → en\n\nMarkera med klick; shift-klick för flera. Sedan tar tangentbordet över: ⌫ raderar, ↑/↓ transponerar, ←/→ knuffar i tiden.',
        },
        lyricsPanel: {
          title: 'Textrutan',
          body: 'Textraderna sitter till vänster. Dubbelklicka på en rad för att hoppa dit i uppspelningen — text och timing redigeras här.',
          details: 'Textpanelen är text OCH timing i en:\n• Klick på en stavelse markerar motsvarande not i tidslinjen.\n• Dubbelklick hoppar till stället (uppspelningen följer efter).\n• Högerklick (eller pennikonen) öppnar radredigeringen: ändra text, dela stavelser vid ordgränser, förskjut hela radens timing.\n\nDelningen vid ordgränser använder språkigenkänning för att fördela stavelser på ord på ett förnuftigt sätt — inget manuellt snittande längre.',
        },
        subHeaderTools: {
          title: 'Redigera noter',
          body: 'Noterna är blocken på tonhöjdsbanorna: lägg till, duplicera, ta bort, dela (en not → två) och slå ihop (två → en).\n\nRedigera markerade noter i tempo: ⌫ raderar, ↑/↓ transponerar.',
          details: 'Precisionstips:\n• Zoom: Ctrl+mushjul över tidslinjen — zooma in för fin timing.\n• Uppspelning: mellanslag växlar spela/pausa, Shift+mellanslag spelar bara markeringen.\n• Transponera flera noter: markera alla, ↑/↓ flyttar hela bunten.\n\nFör timingen: notens start måste träffa stavelsens ansats i sången — vågformen hjälper dig hitta ansatserna.',
        },
        noteTypes: {
          title: 'Nottyper',
          body: '5 typer för nya noter:\n: Normal (tonhöjden räknas)\n* Guld (extra poäng)\nF Freestyle (alla toner räknas)\nR Rap (endast timing)\nG Rap-guld',
          details: 'Vad varje typ betyder i spelet:\n• Normal (:): klassisk sjungnot — tonhöjd och timing räknas.\n• Guld (*): renderas gyllene, dubbla poäng vid träff. Perfekt för låtens höjdpunkter.\n• Freestyle (F): tonhöjden spelar ingen roll, bara text/timing räknas — bra för talade partier.\n• Rap (R): bedömer timing och rytm i stället för melodi.\n• Rap-guld (G): som rap, men med extra poäng.\n\nTypen går att ändra senare: markera noten och välj en ny typ i verktygsraden.',
        },
        voices: {
          title: 'Röster',
          body: 'P1 = spelare 1, P2 = spelare 2 (duett!), P4/P8 = tredje/fjärde rösten. Varje not tillhör en röst — så skapas duettlåtar med separata delar.',
          details: 'Rösttilldelning:\n• Rullgardinsmenyn väljer spåret som nya noter hamnar på.\n• Placerade noter kan flyttas: markera och byt röst.\n• I spelets duettläge väljer varje spelare sitt spår — biblioteket filtrerar automatiskt fram låtar med minst 2 röster.\n\nP4/P8 möjliggör till och med kvartettsättningar; huvudlägena använder P1/P2.',
        },
        tapMode: {
          title: 'Tryckläget — turbon 🥁',
          body: 'Håll nere och tryck i takt: varje klick droppar en not vid aktuell uppspelningsposition, textrad för textrad. Skapa noter i realtid.',
          details: 'Så går tryckinspelningen till:\n1. Aktivera tryckläget i verktygsraden.\n2. Starta uppspelningen — låten spelas med hörbart ljud.\n3. Klicka i stavelsernas takt — varje tryck droppar en not vid uppspelningshuvudet med senast valda tonhöjd.\n4. Finputsa sedan: korrigera tonhöjder (↑/↓ på markerade noter) och justera längder.\n\nTryckläget är 5–10× snabbare än att placera noter för hand — hela låtar på minuter i stället för timmar.',
        },
        panels: {
          title: 'Huvudpaneler',
          body: 'Tre paneler uppe till höger: metadata (genre/språk/år), ljudanalys och AI-assistenten.',
          details: 'Vad de tre panelerna gör:\n• Metadata: redigera genre, språk och år direkt för den öppna låten — matar filtren och temafesten.\n• Ljudanalys: analyserar ljudfilen (ljudstyrka, tonart, BPM) och föreslår värden.\n• AI-assistenten: textkomplettering, låtidentifiering och notharmonisering via AI — kräver en konfigurerad AI-leverantör (Inställningar → AI).',
        },
        metadataStudio: {
          title: 'Metadata-studion',
          body: 'Harmoniseringsturbon: AI- och regelbaserade förslag på genre, språk och år — med lyssna-före-tilldelning, manuell finjustering och en granskningskö för osäkra träffar.',
          details: 'Studiens arbetsflöde:\n1. "Analysera alla låtar" — regelverket (filsökvägar, taggar) och valfritt AI föreslår genre/språk/år.\n2. Förslagen bär konfidens: grön = säker, gul = granska.\n3. Lyssna: ett klick på en låt spelar ett utdrag — verifiera förslag på snabbaste sätt.\n4. Tilldela en och en eller "applicera alla gröna".\n\nGranskningskön samlar osäkra träffar till senare — inget går förlorat.',
        },
        shortcuts: {
          title: 'Kortkommandon',
          body: 'Alla tangentkommandon samlat — editorn är ett tangentbordsinstrument. Klicka dig igenom!',
          details: 'De viktigaste kortkommandona:\n• Ctrl+Z / Ctrl+Y: ångra / gör om\n• Mellanslag: spela/pausa\n• ⌫: radera markerade noter\n• ↑/↓: transponera · ←/→: knuffa i tiden\n• S: dela not · M: slå ihop\n• 1–5: välj nottyp\n\nI kortkommandopanelen kan du se och ändra tangenter.',
        },
        finish: {
          title: 'Redo att bygga! 🛠️',
          body: 'Nu kan du editorns verktygslåda.\n\nKom ihåg: Ctrl+Z räddar allt, och ?-ikonen i menyraden tar dig tillbaka till de här kapitlen när som helst.',
          details: 'Rekommenderad ordning för en ny låt:\n1. Koppla ljud/video (låtinfofliken)\n2. Importera eller skriv in text (textfliken)\n3. Tryck in noter (tryckläget) eller AI-harmonisera\n4. Sköt metadata (genre/språk/år — viktigt för filtren!)\n5. Spara — från och med nu syns låten i biblioteket.',
        },
      },
    },

    // ═══ Inställningsrundturen (R28) ═══
    settings: {
      title: 'Inställningar',
      desc: 'Alla inställningar i överblick: flikar, grundinställningar, ljud, bibliotek, companion-enheter och backup.',
      chapters: {
        overview: 'Överblick',
        basics: 'Grundinställningar',
        sound: 'Ljud & Mikrofon',
        library: 'Bibliotek & Tema',
        devices: 'Enheter & Companion',
        data: 'Synk, Backup & Info',
      },
      steps: {
        welcome: {
          title: 'Inställningarna 👋',
          body: 'Den här rundturen går uteslutande igenom inställningarna — flik för flik.\n\nJag växlar automatiskt till varje flik och förklarar vad du hittar där.',
          details: 'Flikarna i rundtursordning: Allmänt, Gameplay, Utseende, Grafik / Ljud, Mikrofon, Mobil (companion), Webbkamera, Bibliotek, Genrer & Språk, Temafest, Viral Charts, Synk & Backup och Om.\n\nVarje flik har en kort intro överst — rundturen fördjupar den steg för steg.',
        },
        tabBar: {
          title: 'Flikraden',
          body: 'Alla inställningar är ordnade i flikar: Allmänt, Gameplay, Utseende, Ljud, Mikrofon, Mobil, Webbkamera, Bibliotek, Genrer & Språk, Temafest, Synk & Backup och Om.\n\nSedan R28 förklarar en kort introtext överst i varje flik vad den gör.',
          details: 'Orienteringshjälp — när du söker, fråga dig…\n• "Hur BETEER sig spelet?" → Gameplay\n• "Hur SER det ut?" → Utseende\n• "Hur LÅTER det?" → Grafik / Ljud / Mikrofon\n• "Koppla enheter?" → Mobil (companion) / Mikrofon\n• "Mina låtar?" → Bibliotek\n• "Säkerhetskopiera data?" → Synk & Backup\n\nFlikarna scrollar horisontellt i smala fönster — svep bara åt höger.',
        },
        general: {
          title: 'Allmänt',
          body: 'Gränssnittsspråk, standardsvårighetsgrad, onlineaktiviteter och den fullständiga översikten över kortkommandon.',
          details: 'Språk: 16 språk finns. Byte slår igenom live i hela gränssnittet.\n\nStandardsvårighetsgrad: gäller nya rundor om inte startdialogen väljer en annan.\n\nOnlineaktiviteterna styr om highscores laddas upp globalt och om dagliga utmaningar skapas online.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Poängsättning på/av, partikeleffekter, autospel av kön och fler beteendeomkopplare för rundor och resultat.',
          details: 'De viktigaste omkopplarna:\n• Poängsättning: för ren nöjesång utan poängvisning.\n• Autospel av kön: när en låt tar slut startar nästa köpost automatiskt — perfekt för festkvällar utan programledare.\n• Partiklar & effekter: stäng av på svagare maskiner.\n\nDärtill: beteende efter rundor (resultatskärm, omedelbar omstart) och kombovisningar.',
        },
        appearance: {
          title: 'Utseende',
          body: 'Teman, animerad bakgrund eller egen bakgrundsvideo, textstil och storlek, notvisning och prestandaläget för svagare maskiner.',
          details: 'Textstil: "Karaoke" (färgläggning av ordet), "UltraStar" (stavelserutor) eller "Minimal".\n\nBakgrund: förutom teman fungerar en egen video — i spelet körs den bakom noterna, nedtonad.\n\nPrestandaläget skär kraftigt ner på animationer och bakgrunder — lönt från ~2015-hårdvara.',
        },
        graphicsound: {
          title: 'Ljud',
          body: 'Utgångsenhet (inkl. ASIO), master- och förhandslyssningsvolym, mikrofonkänslighet, ljudnivånormalisering och YouTube-videokvalitet.',
          details: 'ASIO: bara relevant för Windows + ASIO-kapabla ljudkort — minskar latensen vid mikrofonövervakning.\n\nLjudnivånormaliseringen jämnar ut volymskillnader mellan låtar — standardvärdena är väl valda.\n\nYouTube-kvalitet: påverkar låtar med YouTube-video som källa; högre kvalitet = mer bandbredd.',
        },
        microphone: {
          title: 'Mikrofon',
          body: 'Enhetsval, känslighet, brusport och live-nivå — plus förinställningar. Smartphones ansluts via fliken Mobil.',
          details: 'Förinställningar: typiska uppsättningar ("dynamisk sångmikrofon", "headset", "telefon") ställer in känslighet + brusport i förnuftiga kombinationer.\n\nBrusport: filtrerar andetag och rumsbrus — live-nivån visar i realtid vad som släpps igenom.\n\nViktigt för flera spelare: VARJE spelare kan få en EGEN enhet — tilldelningen sker i startdialogen per runda.',
        },
        libraryTab: {
          title: 'Bibliotek',
          body: 'Ställ in låtmappen (varje undermapp = en låt) och skanna den, återställ biblioteket eller radera all data — plus importen från andra karaokesystem.',
          details: 'Mappformat: en undermapp per låt med ljud/video + TXT (UltraStar-format). Skannern känner igen vanliga kombinationer (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport från andra system: ett SingStar-arkiv? En UltraStar-samling? Importkonvertorn tar över metadata och texter automatiskt.\n\nVar försiktig med "radera all data": dubbelbekräftelsen frågar två gånger — gör ändå en backup först (fliken Synk & Backup).',
        },
        taxonomy: {
          title: 'Genrer & Språk',
          body: 'Skapa egna genre- och språkposter — de dyker upp i alla rullgardinsmenyer och matar AI-harmoniseringen.',
          details: 'Varför egna poster? Standardlistorna täcker inte allt ("Schlager", "K-Pop", "Dialekt" …). Egna poster:\n• syns direkt i biblioteksfiltren\n• går att välja i editorn och Metadata-studion\n• harmoniseras med (AI:n föreslår dem för matchande låtar)\n\nBorttagning fungerar också — låtarna behåller posten tills de omtilldelas.',
        },
        motto: {
          title: 'Temafest',
          body: 'Ställ in hela spelet på ett tema (t.ex. en 80-talsfest): när temat är aktivt ersätter det alla sökfält och filter — varje låtval drar bara från matchande låtar.',
          details: 'Temafiltret känner flera fält, fritt kombinerbara (OCH-logik):\n• Genre (t.ex. rock)\n• Språk (t.ex. engelska)\n• Era/år (t.ex. 1980–1989)\n\nEffekt: biblioteket, festens låtval OCH companion-appen visar bara temapoolen — gästerna kan inte välja något utanför temat.\n\nAvaktiveras temat återgår allt direkt till normalvyn; spelade låtar/highscores lämnas orörda.',
        },
        mobile: {
          title: 'Mobil & Companion',
          body: 'Koppla in smartphones via QR-kod — som mikrofon, fjärrkontroll eller sjungalongenhet. Du ser alla anslutna enheter och deras anslutningskoder.',
          details: 'Anslutning: skanna QR-koden (samma WiFi!) eller skriv in URL:en — companion-rundturen förklarar detaljerna i ?-hjälpmenyn.\n\nFliken visar också:\n• Alla anslutna enheter med status (aktiv, roll, senaste aktivitet)\n• Tilldelning av profiler till enheter\n• Utsparkning av enskilda enheter\n\nQR-koderna per profil (för profilkoppling) finns i profilsidans inställningskort.',
        },
        webcam: {
          title: 'Webbkamera',
          body: 'Använd webbkameran som animerad låtbakgrund: upplösning, spegling, mättnad, oskärpa och fler effekter — med live-förhandsvisning.',
          details: 'Webbkamerabakgrunden körs bakom noterna under låten — ni ser er själva sjunga!\n\nEffekter: spegling (som i en selfie), mättnad, mjuk oskärpa, sepia — direkt synliga i live-förhandsvisningen.\n\nIntegritet: kameran körs bara lokalt, inget sparas eller skickas.',
        },
        sync: {
          title: 'Synk & Backup',
          body: 'Skapa och återställ säkerhetskopior, synka data mellan enheter. I skrivbordsversionen speglas spelardata dessutom permanent till AppData-mappen.',
          details: 'En backup innehåller: profiler (med XP/framsteg), highscores, inställningar och spellistdefinitioner — som en fil att arkivera eller flytta.\n\nAppData-speglingen (skrivbordsversionen) skyddar mot dataförlust i webbläsaren: även om webbläsarlagringen raderas återställer skrivbordsversionen allt.\n\nÅterställning skriver över nuvarande data — än en gång: ta backup först.',
        },
        about: {
          title: 'Om',
          body: 'Version, plattform, licenser och medverkande projekt — Karaoke ZERO:s digitala kolofon.',
          details: 'Du ser även byggkanalen (webb/skrivbord) och kan söka efter uppdateringar. Licenserna listar open source-projekten som används — tack till alla inblandade!',
        },
        finish: {
          title: 'Fullt konfigurerat! ⚙️',
          body: 'Nu kan du alla inställningarna.\n\n?-ikonen i menyraden tar dig tillbaka till den här rundturen när som helst — kapitel för kapitel om du vill.',
          details: 'Rekommendation för din första installationskväll:\n1. Biblioteksfliken: skanna låtmappen\n2. Mikrofonfliken: välj förinställning + kolla live-nivån\n3. Mobilfliken: koppla in telefoner (companion-rundturen!)\n4. Temafliken: fundera på ett festtema\n5. Synk & Backup: ta den första backupen\n\nDå står karaokekvällen på skenor.',
        },
      },
    },

    // ═══ Profilrundturen (R29) ═══
    profile: {
      title: 'Profiler & Karaktärer',
      desc: 'Skapa spelare, följ XP & framsteg, onlinesynk och companion-koppling.',
      chapters: {
        overview: 'Överblick',
        characters: 'Karaktärer & Framsteg',
        online: 'Online & Companion',
      },
      steps: {
        welcome: {
          title: 'Dina spelarprofiler 👤',
          body: 'Profilerna är identiteterna i spelet: XP, nivå, statistik och prestationer lever på profilen — och highscores bär ditt namn.\n\nRundturen visar hur du skapar och hanterar profiler.',
          details: 'Varför profiler?\n• XP & nivå: sjungna låtar, utmaningar och prestationer samlar erfarenhet — nivån stiger tillsammans med rangtiteln (nybörjare → karaoke-legend).\n• Topplistor: highscoreposter visar din avatar.\n• Festlägen: varje spelarval drar från den här listan.\n• Companion-enheter kan "koppla" en profil och sjunga under dess identitet.\n\nProfiler lever i webbläsarlagringen (lokalt) eller i ett onlinekonto (synk) — du väljer när du skapar dem.',
        },
        topBar: {
          title: 'Åtgärdsraden',
          body: 'Här uppe växlar du onlinetopplistor, byter lokalt/globalt och öppnar skapelseformuläret för nya profiler.',
          details: 'Radens delar:\n• Online-omkopplaren: slår på/av onlinefunktioner globalt (topplistor, kontoregistrering)\n• Lokalt/Globalt: vilken lista poängvyn visar\n• "Ladda profil": loggar in dig med en synkkod och hämtar din onlineprofil till den här enheten\n• "Ny profil": öppnar skapelseformuläret (nästa steg)',
        },
        createButton: {
          title: 'Skapa en profil',
          body: '"Ny profil" öppnar formuläret: namn, avatarbild, land och lagringsläge (lokalt eller med onlinekonto).',
          details: 'Formulärfälten:\n• Namn: syns på topplistor och i festlägen\n• Avatar: ladda upp en egen bild eller en initial på en färg\n• Land: flagga för globala topplistor\n• Lagringsläge: "Lokalt" sparar bara på den här enheten; "Online" registrerar valfritt ett konto (e-post + lösenord) och möjliggör synkning mellan enheter.\n\nOnlinekonton finns bara med onlineläget aktiverat — registreringen körs i bakgrunden och profilen är användbar direkt.',
        },
        empty: {
          title: 'Inga profiler ännu',
          body: 'Här tar dina spelare form. Klicka på "Ny profil" och skapa den första karaktären — allt fungerar utan en, men XP och prestationer samlas bara på profiler.',
        },
        cards: {
          title: 'Karaktärskorten',
          body: 'Varje kort visar avatar, nivå, rang och lagringsläge. Ett klick väljer profilen och visar dess detaljer nedanför.\n\nPricken uppe till höger: grön = aktiv, röd = avaktiverad.',
          details: 'Kortsymboler:\n• ✓-bubblan: den just nu aktiva profilen (startdialogen minns den)\n• Rangikonen + "Nivå X": profilens framsteg\n• 💾/🌐-märket: sparat lokalt eller online\n• 📱-märket: profilen är kopplad till en companion-enhet\n• Flaggan: det valda landet\n\nKlick på ett kort = välj det. Avaktivering (rött) sker i framstegskortet — avaktiverade profiler försvinner ur spelarvalen men behåller all sin data.',
        },
        progression: {
          title: 'Framstegskortet',
          body: 'XP-mätaren till nästa nivå plus kärnstatistiken: spelade låtar, guldnoter, bästa kombo och totalpoäng.\n\nAktivitetsomkopplaren till höger avaktiverar profilen tillfälligt.',
          details: 'Så läser du statistiken:\n• Spelade låtar: varje avslutad runda räknas\n• Guldnoter: samlade per låt — visar hur träffsäkert du sjunger höjdpunkterna\n• Bästa kombo: den längsta felfria sviten genom tiderna\n• Totalpoäng: summan av alla poäng\n\nAktivitetsomkopplaren: avaktiverade profiler försvinner ur spelarval och kö (duell-/duettlåtar ber då om nyval) men förlorar INGET — det räcker att aktivera igen.',
        },
        settingsCard: {
          title: 'Profilinställningar',
          body: 'Redigera namn & avatar, byt land, integritetsval — och profilens QR-kod som låter en telefon koppla just den här profilen.',
          details: 'Integritet: styr vilken statistik som syns på globala topplistor.\n\nVisa QR-kod: skapar en kod som pekar DIREKT på den här profilen — telefonen som skannar den ansluter som just den profilen (smart: varje sångare får sin telefon med sin profil).\n\nBorttagning raderar profilen permanent — highscores kvarstår som anonyma poster. För onlineprofiler frågar appen en extra gång innan radering.',
        },
        onlineToggle: {
          title: 'Onlinetopplistor',
          body: 'Omkopplaren aktiverar onlinefunktioner: globala highscores, kontoregistrering och profilsynk mellan enheter.',
          details: 'Av = helt offline: allt stannar lokalt, inga nätverksanrop för topplistor.\n\nPå = du får fliken "Global" i topplistorna och kan skapa/ladda onlineprofiler.\n\nBytet slår igenom direkt — redan insamlade lokala highscores behålls alltid.',
        },
        loginButton: {
          title: 'Ladda en profil',
          body: 'Redan registrerad? "Ladda profil" hämtar din onlineprofil via e-post/synkkod till den här enheten — framsteg och highscores följer med.',
          details: 'Inloggningsdialogen kan två sätt:\n• E-post + lösenord (som vid registreringen)\n• Synkkod: den korta koden från din profil — enklare på en främmande maskin\n\nEfter inloggning slås den hämtade profilen ihop med den lokala (det högre framsteget vinner). Synkar körs sedan automatiskt i bakgrunden.',
        },
        companionClaim: {
          title: 'Profilkoppling 📱',
          body: 'När en telefon ansluter med en profil visas en 📱 på kortet. Telefonen sjunger och väljer under den profilen — namn, XP och prestationer samlas där.',
          details: 'Så kopplar du en telefon till en profil (3 sätt):\n1. Skanna QR-koden i profilinställningarna — ansluter DIREKT med den profilen\n2. Välj en profil i listan i appen efter anslutning\n3. Här i fliken Mobil i inställningarna: enhet → tilldela profil\n\nEn profil kan bara kopplas till EN enhet åt gången. Koppla ifrån: i fliken Mobil eller av telefonen själv.',
        },
        finish: {
          title: 'Laget är komplett! 🎭',
          body: 'Nu vet du hur profiler fungerar — från XP till onlinesynk och telefonkoppling.\n\nFortsätt med prestationerna: rundturen "Prestationer & Framsteg" visar vad din profil kan samla.',
        },
      },
    },

    // ═══ Kö-rundturen (R29) ═══
    queue: {
      title: 'Kön',
      desc: 'Köa låtar, ändra ordning, regler & companion-önskemål.',
      chapters: {
        overview: 'Överblick',
        manage: 'Hantering',
        companion: 'Companion & Autospel',
      },
      steps: {
        welcome: {
          title: 'Kön 🎶',
          body: 'Kön organiserar karaokekvällen: låtarna ställer sig på rad, alla får sin tur — ingen behöver vaka vid datorn.\n\nRundturen täcker köläggning, sortering och reglerna.',
          details: 'Tre sätt att köa:\n1. Biblioteket → klicka på en låt → välj "Lägg till i Kö" i stället för "Starta" i startdialogen\n2. Efter en låt: "Spela Nästa Låt" på resultatskärmen håller flytet igång\n3. Via companion-appen: gästerna köar från sina telefoner (markerade med 📱-märken)\n\nMenyraden visar köns längd som en räknarknapp — du ser kvällen komma.',
        },
        navButton: {
          title: 'Köknappen',
          body: 'I menyraden leder "Kö" hit — siffran på knappen visar hur många låtar som väntar.',
        },
        title: {
          title: 'Låtkön',
          body: 'Listan visar alla väntande låtar med position, läge (solo/duell/duett) och spelare — sorterat efter kötid.',
        },
        empty: {
          title: 'Fortfarande tom',
          body: 'Inga låtar i kön ännu. Lägg till några från biblioteket (startdialogen → "Lägg till i Kö") — eller låt gästerna köa via companion-appen.',
        },
        list: {
          title: 'Kölistan',
          body: 'Varje kort: position, låt, lägesmärke och spelarna. Ett klick på ett kort startar låten direkt — även i annan ordning.',
          details: 'Märkena:\n• 🎤 Solo / ⚔️ Duell / 🎭 Duett — läget låten lades i kön med\n• 📱 — tillagd via companion-appen\n\nKlick på ett kort = spela nu. ✕-knappen till höger tar bort posten, ▶ startar den.\n\nTangenter: Enter spelar, Delete tar bort, ↑/↓ bläddrar i listan.',
        },
        reorder: {
          title: 'Ändra ordningen',
          body: 'Dra korten till deras nya position — bara lokala poster kan flyttas, companion-önskemål behåller sin ordning.',
          details: 'Dra & släpp: ta tag i ett kort och dra upp eller ner med knappen nedtryckt. Listan visar släppositionen live.\n\nVarför companion-poster står still: gästappen sorterar efter inlämningstid — om värden kunde blanda om skulle önskemålen kännas manipulerade. Du kan fortfarande ta bort dem.',
        },
        playNext: {
          title: 'Spela nästa låt',
          body: 'Knappen startar den översta posten — standarddraget mellan rundorna. Alternativt: klicka direkt på valfritt kort.',
          details: 'Resultatskärmen efter varje låt erbjuder samma knapp ("Spela Nästa Låt") — flytet fortsätter utan omväg till kövyn.\n\nMed autospel aktiverat (Inställningar → Gameplay) går appen vidare automatiskt.',
        },
        clearAll: {
          title: 'Rensa allt',
          body: '"Rensa Alla" tömmer hela kön — companion-poster inkluderade. Det finns ingen väg tillbaka, så var försiktig.',
        },
        rules: {
          title: 'Reglerna',
          body: 'Den officiella regelboken sitter längst ner: max 3 låtar per spelare, FIFO-ordning, ta bort egna låtar, välj karaktär först …',
          details: 'Reglerna i detalj:\n• Max 3 låtar per spelare åt gången — ingen kan blockera kön. Den som har sjungit får köa igen.\n• FIFO: först in = först fram. Dra & släpp sorterar om lokalt.\n• Egna låtar kan tas bort när som helst; andras bara via "Rensa Alla" eller som värd.\n• Karaktär först: kön behöver aktiva profiler för duell/duett, annars begärs nyval vid start.\n• Companion-önskemål visar 📱-märket och räknas som egna.',
        },
        companionAdd: {
          title: 'Önskemål från telefoner 📱',
          body: 'Gästerna köar låtar via companion-appen — de dyker upp med ett 📱-märke i listan och räknas mot deras gräns på 3 låtar.',
          details: 'Så ser det ut för gästerna: välj en låt i appen, välj läge, skicka in — önskemålet landar i den här listan.\n\nDu som värd ser direkt: vem som önskade (spelaravatar) och att det är en telefonförfrågan (📱). Gränsen på 3 gäller per profil — även via telefon.\n\nMer i companion-rundturen.',
        },
        autoplay: {
          title: 'Autospel & genväg',
          body: 'Aktivera autospel (Inställningar → Gameplay) så startar nästa låt automatiskt efter varje runda. Och: Ctrl+Q startar den översta köposten var som helst ifrån.',
          details: 'Autospelskedjan: låten tar slut → resultatet visas kort → nästa köpost startar. När kön tar slut stannar kedjan rent.\n\nCtrl+Q funkar överallt — en klassiker när nästa runda ska rulla direkt.',
        },
        finish: {
          title: 'Kön väntar! 🎧',
          body: 'Nu kan du köläggning, sortering och reglerna.\n\nTips: kombinera autospel + companion-önskemål för en helt självkörande karaokekväll.',
        },
      },
    },

    // ═══ Chatt-rundturen (R29) ═══
    chat: {
      title: 'Chatt',
      desc: 'Öppna panelen, skicka meddelanden, valet av "Skicka som" & låtutmaningar.',
      chapters: {
        basics: 'Öppna chatten',
        usage: 'Skicka meddelanden',
        challenges: 'Utmaningar',
      },
      steps: {
        welcome: {
          title: 'Festchatten 💬',
          body: 'Chatten förbinder skrivbord och companion-appar: prata utan att avbryta sången — och utmana varandra på låtdueller.\n\nJag öppnar panelen åt dig om en stund.',
          details: 'Vad chatten kan:\n• Textmeddelanden mellan skrivbordet (värden) och alla anslutna telefoner\n• Val av avsändare: värden kan skriva i en spelares namn\n• Låtutmaningar: gäster kan utmana till dueller — acceptera på skrivbordet och kör\n\nFörutsättning: för att telefoner ska delta i samtalet måste companion-enheter vara anslutna (fliken Mobil i inställningarna — se companion-rundturen).',
        },
        navButton: {
          title: 'Öppna chatten',
          body: 'Chattknappen i menyraden öppnar panelen — den glider in som en sidopanel över skärmen och stängs med ✕ eller ett klick bredvid.',
        },
        panel: {
          title: 'Chattpanelen',
          body: 'Historiken rullar till vänster, du skriver längst ner. Panelen står öppen tills du stänger den — även vid skärmbyte.',
        },
        messages: {
          title: 'Historiken',
          body: 'Dina meddelanden syns till höger i cyan (som värd), bidrag från telefoner till vänster i lila. Varje meddelande bär sin tidsstämpel.',
          details: 'Bakgrundsuppdatering: panelen hämtar nya meddelanden var tredje sekund — du missar inget även när den körs i bakgrunden.\n\nSkrivbordschattens avisering (klockan) visar olästa meddelanden även med panelen stängd.',
        },
        sendAs: {
          title: '"Skicka som"',
          body: 'Du är värden — men du får skriva i en spelares namn: rullgardinsmenyn väljer identiteten. 🖥️ = värd, 📱 = spelare.',
          details: 'Vad det är bra för:\n• Värden skriver åt någon utan telefon ("Anna säger: refrängen en gång till!")\n• Scenutrop i programledarprofilens namn\n\nPricken bredvid rullgardinsmenyn visar spelarfärgen — historiken håller reda på vem som "talade".',
        },
        input: {
          title: 'Skriva ett meddelande',
          body: 'Skriv i fältet (max 200 tecken) och tryck på Enter — eller använd skickaknappen.',
        },
        send: {
          title: 'Skicka',
          body: 'Skicka med Enter eller knappen — meddelandet dyker upp i historiken direkt och på varje ansluten telefon.',
        },
        songChallenges: {
          title: 'Låtutmaningar ⚔️',
          body: 'Gäster kan utmana dig på en låt direkt från appen: ett utmaningskort dyker upp i chatten — "Acceptera utmaningen" startar duellen.',
          details: 'Så går utmaningen till:\n1. En gäst väljer en låt i appen och trycker på "Utmana"\n2. Kortet dyker upp i chatten med låt, utmanare och acceptera-knappen\n3. Acceptera på skrivbordet — startdialogen öppnas med duelläge förvalt\n4. Sjung! Vinnaren tar äran (och poängen)\n\nObs: "Skicka som" måste vara satt till en spelare för det här — motståndaren måste vara identifierbar.',
        },
        companionSide: {
          title: 'På telefonerna',
          body: 'Companion-appen har en egen chattflik — där skriver gästerna. Det du ser här ser de i realtid, och tvärtom.',
        },
        finish: {
          title: 'Meddelandet levererat! 💌',
          body: 'Nu kan du chatten — från panelen till låtutmaningarna.\n\nTillsammans med companion-rundturen blir det tydligt hur telefoner och skrivbord samarbetar.',
        },
      },
    },

    // ═══ Companion-rundturen (R29) ═══
    companion: {
      title: 'Companion-appen',
      desc: 'Koppla in smartphones: mikrofon, fjärrkontroll, låtönskemål & sjungalong.',
      chapters: {
        connect: 'Anslutning',
        features: 'Vad appen kan',
        manage: 'Hantera enheter',
      },
      steps: {
        welcome: {
          title: 'Telefoner som tillbehör 📱',
          body: 'Companion-appen förvandlar varje smartphone till ett karaoke-tillbehör: mikrofon, fjärrkontroll, låtval och chatt — ingen installation, direkt i webbläsaren.\n\nRundturen täcker skrivbordssidan av flödet.',
          details: 'Principen: skrivbordet är värden (musik, noter, poäng) — telefonerna ansluter via WiFi och blir, efter behov:\n• 🎤 Mikrofoner (med tonhöjdsavkänning i telefonen!)\n• 🎮 Fjärrkontroller (styr skärmar)\n• 🎵 Låtbläddrare med köönskemål\n• 💬 Chattdeltagare\n• 🪞 Live-speglingar av skrivbordsskärmen\n\nIngen appbutik, inget konto — skanna QR-koden, klart.',
        },
        mobileTab: {
          title: 'Öppna fliken Mobil',
          body: 'Anslutningen börjar i Inställningar → Mobil. Jag öppnade just fliken åt dig.',
        },
        qrCode: {
          title: 'Skanna QR-koden',
          body: 'Den stora koden till vänster är den direkta vägen: öppna telefonkameran, skanna, appen laddas i webbläsaren. Viktigt: telefon och dator i samma WiFi.',
          details: 'QR-koden innehåller skrivbordets LAN-adress (t.ex. http://192.168.1.42:3000/mobile) — därför måste båda enheterna dela nätverk.\n\nOm koden vägrar: URL:en nedan går att skriva in eller kopiera (knapp). I publikt WiFi utan enhetssynlighet misslyckas anslutningen tyvärr — använd en egen hotspot i stället.',
        },
        connectionInfo: {
          title: 'URL & kopieringsknapp',
          body: 'Till höger adressen som text — med en kopieringsknapp för delning (t.ex. via messenger till dina gäster). Den gröna raden bekräftar den upptäckta nätverks-IP:n.',
          details: 'Tips förhandsdelning: skicka URL:en till gästerna innan festen — så fort skrivbordet körs ansluter alla direkt.\n\nDen gula varningen visas när ingen LAN-IP upptäcktes (t.ex. ren localhost-drift) — då kan bara samma maskin nå den.',
        },
        roles: {
          title: 'Appens roller',
          body: 'Efter anslutning erbjuder appen, beroende på sammanhang:\n\n🎤 Mikrovyn med tonhöjdsvisning\n🎮 Fjärrkontroll för skrivbordet\n🎵 Låtbläddring + köönskemål\n💬 Chatt\n🪞 Live-spegling av skärmen',
          details: 'Rollerna i detalj:\n• Mikrofon: telefonen mäter tonhöjd och sänder den live — skrivbordet visar noterna som från en "riktig" mikrofon. Fungerar i alla lägen (duell också: två telefoner!).\n• Fjärrkontroll: skärmar, knappar och bekräftelser från telefonen — perfekt för värden som rör sig i rummet.\n• Låtbläddring: hela biblioteket i telefonen — inklusive förhandsvisning och köönskemål med 📱-märket på skrivbordet.\n• Chatt: meddelanden till skrivbordet och andra gäster.\n• Spegling: skrivbordsskärmen (spel, resultat) speglas i telefonen — gästerna ser allt från sina platser.',
        },
        chatRole: {
          title: 'Chatt på skrivbordet',
          body: 'Det gästerna skriver i appchatten landar i skrivbordschatten (chattknappen i menyraden) — och tillbaka. Det finns en egen chatt-rundtur för det.',
        },
        queueRole: {
          title: 'Önskemål i kön',
          body: 'Gästerna köar låtar från sina telefoner — de dyker upp på skrivbordet i kön med 📱-märket. Även det finns en egen rundtur för.',
        },
        singAlong: {
          title: 'Sjungalong-lägen 🎶',
          body: 'I festlägena Companion Singalong och Ge över Micen sjunger gästerna direkt via sina telefoner — tonhöjdsavkänningen körs i enheten, skrivbordet dirigerar.',
          details: 'Companion Singalong: varje gäst får text + tonhöjdsvisning i telefonen — skrivbordet visar den gemensamma notbanan.\n\nGe över Micen: miken roterar — till och med blandat mellan telefon och fysisk mikrofon.\n\nFör båda: ju bättre WiFi, desto jämnare tonhöjd. Hackar det hjälper det att flytta närmare routern.',
        },
        deviceList: {
          title: 'Enhetslistan',
          body: 'Tillbaka i fliken Mobil: alla anslutna enheter visar anslutningstid, roll, tilldelad profil och senaste aktivitet — inklusive en sparka-ut-knapp.',
          details: 'Enhetskortet visar:\n• Anslutningslängd ("i 12 min")\n• Vad enheten gör (mikrofon aktiv, fjärrkontroll …)\n• Den kopplade profilen — en rullgardinsmeny tilldelar en annan\n• Sparka ut: kopplar ifrån enheten (den kan återansluta direkt)\n\nTips: ge profilerna talande namn — listan håller sig tydlig även med många gäster.',
        },
        profileClaim: {
          title: 'Profilkoppling',
          body: 'Varje enhet kan koppla en profil: gästen sjunger sedan under sitt eget namn med sin egen XP — profilsidan visar kopplingen med ett 📱-märke.',
          details: 'Sätt att koppla:\n1. Skanna profil-QR-koden i profilinställningarna (mest direkt)\n2. Välj i listan i appen efter anslutning\n3. Här i enhetslistan via rullgardinsmenyn\n\nDetaljer finns också i profil-rundturen.',
        },
        microphoneFallback: {
          title: 'Telefon i stället för mikrofon',
          body: 'När alla sjunger via telefon kan du hoppa över mikrofonfliken helt — appen reglerar känsligheten själv. Fysiska mikrofoner konfigureras i mikrofonfliken som visat.',
        },
        finish: {
          title: 'Ansluten! 🔗',
          body: 'Nu vet du hur telefoner kopplar till och vad de kan.\n\nNästa steg: öppna URL:en i din egen telefon och gör ett första test — mikroläget är mest imponerande.',
        },
      },
    },

    // ═══ Prestationsrundturen (R29) ═══
    achievements: {
      title: 'Prestationer & Framsteg',
      desc: 'Prestationer, XP-nivåer, sällsyntheter och dagliga utmaningar.',
      chapters: {
        overview: 'Överblick',
        unlock: 'Låsa upp prestationer',
        daily: 'Dagliga Utmaningar',
      },
      steps: {
        welcome: {
          title: 'Prestationer & framsteg 🏆',
          body: 'Allt du samlar: prestationer med sällsyntheter, XP-nivåer med rangtitlar och de dagliga utmaningarna som XP-maskin.\n\nRundturen går igenom prestations-skärmen och utmaningarna.',
          details: 'De tre systemen tillsammans:\n• XP: "bränslet" — från låtar, utmaningar och prestationer\n• Nivåer & rang: stiger med XP (nybörjare → legend) och visar framsteget med en blick\n• Prestationer: milstolpar med belöningar — vissa hemliga tills du låser upp dem\n\nAllt hänger på profilen — den som sjunger samlar (se profil-rundturen).',
        },
        navButton: {
          title: 'Prestationsknappen',
          body: 'I menyraden leder pokalen till prestationerna — den andra pokalkolumnen bredvid visar topplistorna.',
        },
        playerSelector: {
          title: 'Spelarval',
          body: 'Här uppe väljer du vems prestationer du tittar på — praktiskt för att visa upp samlingen. Siffran på profilen visar antalet upplåsta.',
        },
        stats: {
          title: 'Statistikkorten',
          body: 'Fyra kort på en gång: upplåsta prestationer, XP insamlade från dem, fullföljande i procent och aktuell nivå med rangtitel.',
          details: 'Procentkortet räknar: upplåsta ÷ alla prestationer. 100 % är samlarstrecket — belönas oftast med en egen hemlig prestation.\n\nNivåkortet visar dessutom rangtiteln ("Rising Star", "Karaoke-legend" …) — titlarna kommer från profilens framstegssystem.',
        },
        filters: {
          title: 'Filter',
          body: 'Vänster: statusfiltren (alla / upplåsta / låsta). Höger: kategorierna: prestation, framsteg, socialt och speciell.',
          details: 'Kategorierna betyder:\n• Prestation: sångbragder (kombo, guldnoter, perfekta rundor)\n• Framsteg: samlarmilstolpar (spelade låtar, XP-mängder, nivåer)\n• Socialt: fest- och flerspelarhandlingar (dueller, companion-rundor)\n• Speciell: hemligheter och kuriosa — beskrivningen avslöjas först vid upplåsning\n\nKan kombineras: "Låst + Speciell" visar vad som fortfarande väntar.',
        },
        grid: {
          title: 'Prestationskorten',
          body: 'Varje kort: ikon, namn, beskrivning, sällsynthet och XP-belöning. Upplåsta lyser gyllene med ett datum — låsta förblir grå.',
          details: 'Sällsyntheterna (färgkodade):\n• Vanlig — kommer naturligt vid vanligt spelande\n• Sällsynt — kräver medvetna handlingar\n• Episk — hårt arbete eller lyckosamma tillfälligheter\n• Legendär — för de få\n\nUpplåsning sker automatiskt så snart villkoret uppfylls — toasteravisering ingår. XP:n landar direkt på profilen.',
        },
        xpSystem: {
          title: 'Så flödar XP',
          body: 'XP kommer från tre källor: sjungna låtar (efter svårighetsgrad), utmaningar (dagliga/veckovisa) och prestationer. Nivåer låser upp rang — och vissa funktioner som profilmärken.',
          details: 'XP-källorna i korthet:\n• Avslutad låt: grund-XP efter svårighetsgrad (lätt → expert, stigande)\n• Daglig lucka: 100–400 XP + bonusar\n• Veckolucka: 500–2000 XP\n• Prestation: engångsbelöning per prestation (25–1000 XP efter sällsynthet)\n\nNivåmätaren på profilsidan visar vägen till nästa nivå; rangerna byts med några nivåers mellanrum.',
        },
        navDaily: {
          title: 'Till utmaningarna',
          body: 'De dagliga utmaningarna har en egen skärm — stjärnknappen i menyraden leder dit. Navigerar nu.',
        },
        playerSelection: {
          title: 'Steg 1: välj spelare',
          body: 'Guidat flöde: välj först vem som spelar — först sedan dyker uppgifterna upp. Flera spelare möjliga; statistiken tillhör den första.',
          details: 'Varför valet först? Luckor och statistik är per profil — utan vald spelare finns inget att beräkna.\n\nKortet visar alla aktiva profiler; val sker med klick. Därefter vecklas steg 2 (uppgifter) och steg 3 (spelande) ut.',
        },
        slots: {
          title: 'Steg 2: de 5 luckorna',
          body: 'Fem uppgiftsluckor per dag som låses upp i ordning. Varje lucka visar uppgiften, spelbara svårighetsgrader och XP-värdet — högre svårighetsgrader multiplicerar.',
          details: 'Luckmekaniken:\n• Luckorna 2–5 öppnas först när den föregående är klar eller överhoppad — kedjan tvingar fram variation.\n• Varje uppgift är ett villkor på nästa låt ("genren rock", "minst 80 % träffsäkerhet" …) — biblioteket filtrerar automatiskt fram matchande låtar.\n• Svårighetsval per lucka: upp till 3× XP-multiplikator på expert.\n\nVid midnatt droppar fem färska uppgifter — kedjan startar om.',
        },
        badges: {
          title: 'Märken & veckan',
          body: 'Att rensa flera luckor ger dagliga märken (brons/silver/guld) med extra XP. Veckomotstycket körs 7 dagar med feta belöningar — samma mekanik, större pott.',
          details: 'Märkesnivåer per dag:\n• Brons: 2 luckor\n• Silver: 3–4 luckor\n• Guld: alla 5 luckor — plus den dagliga bonus-XP:n\n\nVeckovis: 5 luckor över 7 dagar, 500–2000 XP per lucka, nollställning på måndagar. Att spela dagligen OCH veckovis ger dig nivåer betydligt snabbare än enbart låtar.',
        },
        challengeModes: {
          title: 'Utmaningslägen',
          body: 'Förutom luckorna finns fria utmaningslägen med modifierare (t.ex. "2× tempo", "inga noter") — för egna regler och extra XP utöver de dagliga uppgifterna.',
          details: 'Lägena är fritt konfigurerbara: välj ett läge, kombinera modifierare, XP-potten växer med svårigheten.\n\nGenomföranden låser upp nya modifierare — samlarkortet i utmaningsområdet visar vad du har.',
        },
        finish: {
          title: 'Dags att samla! 🏅',
          body: 'Nu kan du prestationer, XP och utmaningar — de tre framstegsmotorerna.\n\nTips att börja med: spela 2 dagliga luckor idag — resten kommer av sig självt.',
        },
      },
    },
  },
};
