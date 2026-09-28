// FI translations — tutorial
// Based on the EN source file (same keys, same order): help menu, tour overlay,
// first-launch offer + 8 tours — every step may carry an optional `details`
// deep-dive text (shown via the "More info" button).
export const tutorialTranslations = {
  tutorial: {
    // ? help menu
    helpButtonTitle: 'Ohjeet ja kierrokset',
    helpDialogTitle: 'Ohjeet ja kierrokset',
    helpDialogDesc: 'Katso kokonaiset kierrokset uudelleen — tai hyppää suoraan aiheeseen ja saat vain sen osan selitettyä.',
    helpFooter: 'Kierroksen näppäimistö: → seuraava · ← takaisin · Esc lopeta',
    startFullTour: 'Koko kierros',
    stepsCount: '{n} vaihetta',
    completedBadge: 'Suoritettu',
    // Tour groups in the help menu (R29: 8 tours need structure)
    groupGettingStarted: 'Ensiaskeleet',
    groupAreas: 'Alueet ja toiminnot',
    groupAdvanced: 'Edistyneille',
    // Overlay controls
    ariaLabel: 'Opastettu kierros',
    skipTour: 'Lopeta kierros',
    back: 'Takaisin',
    next: 'Seuraava',
    finish: 'Valmis',
    clickHint: 'Klikkaa sitä nyt',
    // "More info" expansion (R29)
    moreDetails: 'Lisätietoja',
    lessDetails: 'Näytä vähemmän',
    // First-launch offer
    offerTitle: 'Tervetuloa Karaoke ZERO:een!',
    offerBody: 'Haluatko nopean kierroksen perusteisiin? Kahdessa minuutissa tunnet päivittäishaasteet, laulutilat, kirjaston ja juhlapelit.',
    offerStart: 'Aloita kierros',
    offerLater: 'Ehkä myöhemmin',
    offerHint: 'Saatavilla milloin tahansa ?-kuvakkeesta valikkopalkissa.',

    // ═══ Basic tour ═══
    basic: {
      title: 'Perusteet',
      desc: 'Koko kierros: haasteet, laulutilat, kirjasto, juhlat & muuta.',
      chapters: {
        welcome: 'Tervetuloa',
        challenges: 'Päivittäiset & viikoittaiset',
        singing: 'Aloita laulaminen',
        party: 'Juhlatilat',
        more: 'Muita alueita',
      },
      steps: {
        welcome: {
          title: 'Tervetuloa! 👋',
          body: 'Tämä on opastettu kierros: korostan tärkeät kohdat ja selitän ne.\n\nOhjaus: "Seuraava" (tai näppäin →), "Takaisin" (←) ja "Lopeta kierros" (Esc). Mennään!',
          details: 'Voit keskeyttää kierroksen milloin tahansa ja jatkaa myöhemmin: ?-kuvake valikkopalkissa avaa ohjevalikon, jossa kaikki kierrokset ovat — ne voi käydä läpi myös luku kerrallaan.\n\nMonissa vaiheissa on "Lisätietoja"-painike alla: se avaa lisätietoja, eikä lyhyt teksti katoa mihinkään.',
        },
        heroButtons: {
          title: 'Pika-aloitus',
          body: '"Aloita laulaminen" vie sinut suoraan kirjastoon. "Juhlatila" avaa 9 juhlapeliä ryhmille.',
          details: 'Pika-aloituskortit ovat oikoteitä yleisimpiin polkuihin:\n• "Aloita laulaminen" = avaa kirjasto, valitse kappale ja mennään (yksin, kaksinkamppailu tai duetto).\n• "Juhlatila" = pelikokoelma 2–24 pelaajalle, puhelimet voivat liittyä mikrofoneiksi.\n\nKaikki täällä näkyvä löytyy myös valikkopalkista — kortit säästävät vain klikkauksia.',
        },
        dailyCard: {
          title: 'Päivittäishaaste',
          body: '5 paikkaa päivässä vaihtuvine tehtävine — mitä useamman paikan suoritat, sitä isompi XP-bonus. Uudet tehtävät ilmestyvät keskiyöllä.',
          details: 'Näin järjestelmä toimii:\n• Jokainen viidestä paikasta sisältää eri tehtävätyypin (esim. "laula 80-luvun kappale", "kerää 8000 pistettä").\n• Paikat aukeavat järjestyksessä — paikka 2 vasta, kun paikka 1 on suoritettu (tai ohitettu).\n• Jokaisen paikan voi pelata useilla vaikeustasoilla; korkeammat antavat enemmän XP:tä (jopa 3× kerroin).\n• Bonus kasvaa suoritettujen paikkojen määrän mukaan: 5/5 tuo täyden päivittäisen bonuksen.\n\nTehtävät valitaan omasta kirjastostasi — valikoima mukautuu aina kappaleisiisi.',
        },
        weeklyCard: {
          title: 'Viikkohaaste',
          body: 'Viikoittainen vastine: 5 paikkaa viikon mittaan suuremmilla XP-palkinnoilla. Täydellinen pitkän tähtäimen tavoitteisiin.',
          details: 'Viikkohaasteet toimivat kuten päivittäiset, mutta:\n• 5 paikkaa ovat voimassa 7 päivää — ei päivittäistä nollausta, kerää omaan tahtiisi.\n• XP-palkinnot per paikka ovat paljon suurempia (esim. 500–2000 XP 100–400 XP:n sijaan).\n• Nollaus tapahtuu maanantaiaamuna.\n\nVinkki: päivittäinen ja viikoittainen kulkevat rinnakkain — pelaamalla molempia nousit tasolla nopeimmin.',
        },
        modeLauncher: {
          title: 'Laulu: yksin, kaksinkamppailu & duetto',
          body: '🎤 Yksinpeli: yksi pelaaja, yksi mikrofoni.\n⚔️ Kaksinkamppailu: kaksi pelaajaa SAMALLA kappaleella — enemmän pisteitä kerännyt voittaa.\n🎭 Duetto: kaksi ääntä kahdella raidalla — kirjasto näyttää automaattisesti vain sopivat duettokappaleet.',
          details: 'Kolme tilaa tarkemmin:\n• Yksinpeli: klassinen karaoke — laulat kaikki nuotit, tuloksesi nousee tulostauluille.\n• Kaksinkamppailu: molemmat pelaajat laulavat samaa nuottiraitaa yhtä aikaa. Pisteet kasvavat erikseen — lopun vertailu näyttää, kuka oli parempi. Täydellinen uusintaotteluihin.\n• Duetto: kappaleessa on kaksi erillistä ääntä (P1/P2) — jokainen laulaa "omat" osansa, yhteiset fraasit tuovat joukkuebonuksen. Duettokappaleet löytyvät kirjaston 🎭-suodattimella.\n\nMikrofonit: voit yhdistää niin monta mikrofonia tai älypuhelinta kuin haluat (katso Asetukset → Mikrofoni).',
        },
        libraryNav: {
          title: 'Kirjasto',
          body: 'Kaikki kappaleesi ovat täällä. Hae nimellä tai artistilla — sumea haku antaa anteeksi kirjoitusvirheetkin.',
          details: 'Hakuvinkkejä:\n• Sumea haku löytää "Dancing Qun" → "Dancing Queen". Se ei välitä isoista ja pienistä kirjaimista eikä yksittäisistä kirjoitusvirheistä.\n• Se hakee nimeä, artistia JA genreä yhtä aikaa — "Rock" löytää myös genren Rock kappaleet.\n\nJärjestäminen pudotusvalikosta (nimi A–Ö, artisti, viimeksi lisätty). Kappaleet päätyvät kirjastoon tuonnin, kansioskannauksen tai soittolistojen kautta — polku löytyy asetusten Kirjasto-välilehdeltä.',
        },
        filters: {
          title: 'Suodattimet',
          body: 'Genre, kieli, vuosi, vuosikymmen, duetot ja viraalihitit — rajaa kirjasto juuri niin kuin haluat.',
          details: 'Kaikki suodattimet yhdistyvät — esim. "Genre: Rock + Kieli: englanti + Aikakausi: 80-luku" näyttää täsmälleen 80-luvun englanninkieliset rockkappaleet.\n\nErikoissuodattimet:\n• Duetto: vain kappaleet, joissa kaksi ääniraitaa.\n• Viraalihitit: kappaleet, jotka ovat paraikaa viraalilistoilla (tiedot kohdasta Asetukset → Viraalilistat).\n• Omat genret ja kielet: luo omia kategorioita kohdassa Asetukset → Genret & kielet — ne ilmestyvät näihin suodattimiin heti.\n\n"Tyhjennä suodattimet" (✕) nollaa kaiken kerralla.',
        },
        songCard: {
          title: 'Kappaleet',
          body: 'Kappalekortin klikkaaminen avaa aloitusikkunan: tila, pelaajat, mikrofonit ja vaikeustaso.',
          details: 'Jokainen kappalekortti näyttää:\n• Kannen sekä nimen/artistin\n• Vaikeustason (helppo/normaali/vaikea/ekspertti) ja tähtiarvosanan\n• Keskeiset metatiedot kuten genren ja kielen — suoraan kappaleesta tai AI:n yhtenäistämänä (Editori → Metadata Studio).\n\nEsikatselukuvake käynnistää lyhyen maistiaisen avaamatta aloitusikkunaa.',
        },
        startModal: {
          title: 'Aloitusikkuna',
          body: 'Aseta kaikki täällä: tila (yksin/kaksinkamppailu/duetto), kuka laulaa, kenen mikrofoni kullekin ja vaikeustaso.\n\nPaina sitten "Aloita" — ja mennään!',
          details: 'Tärkeimmät valinnat:\n• Tila: yksinpeli, kaksinkamppailu (2 pelaajaa, sama raita) tai duetto (2 ääntä) — duetossa molemmat pelaajat valitsevat äänensä (P1/P2).\n• Mikrofonit: jokainen pelaaja voi saada oman sisääntulolaitteensa — tai älypuhelimen mikrofoniksi (companion-sovellus).\n• Vaikeustaso: vaikuttaa pisteytykseen — vaikeammat tasot antavat vähemmän armoa ja palkitsevat tarkkuutta (korkeampi pistepotentiaali, enemmän XP:tä).\n• "Lisää jonoon" "Aloita"-napin sijaan: kappale menee jonoon käynnistymisen sijaan — ihanteellista, kun useampi haluaa laulaa.',
        },
        partyCard: {
          title: 'Juhlatilat',
          body: '9 peliä 2–24 pelaajalle: Battle Royale, Mikrofonin vaihto, Medley-kisa, turnaus, Puuttuvat sanat, Sokea karaoke ja muita — puhelimet voivat liittyä mikrofoneiksi.',
          details: 'Yhdeksän tilaa silmäyksellä:\n• Battle Royale: kaikki laulavat, heikoin putoaa joka kierroksella — viimeinen laulaja voittaa.\n• Mikrofonin vaihto: mikrofoni kiertää pelaajalta toiselle — jokainen laulaa oman osansa.\n• Medley-kisa: joukkueet laulavat lyhyitä kappalepätkiä erikoissäännöillä.\n• Turnaus: eliminaatioturnauspuu kaksinkamppailuineen — voittaja kiipeää joka kierroksella.\n• Puuttuvat sanat: sanoituksista katoaa sanoja — laula puuttuva sana pisteisiin.\n• Sokea karaoke: ei nuottonäyttöä, vain korvat!\n• Arvioi kappaleeni & Companion-mukalaulu ja muita — jokainen tilakortti selittää itsensä.\n\nLähes kaikki tilat tukevat companion-sovellusta mikrofonina ja kaukosäätimenä.',
        },
        partyModes: {
          title: 'Tilavalitsin',
          body: 'Täältä valitset juhlatilan: Battle Royale (viimeinen laulaja voittaa), Mikrofonin vaihto, turnaus (turnauspuu), Medley-kisa ja muita.\n\nJokainen kortti kertoo, mitä on luvassa — yksi klikkaus avaa pelaajavalinnan.',
          details: 'Tilakortin klikkaamisen jälkeen tulee pelaajavalinta: valitse profiilit (tai yhdistä companion-laitteet) ja aseta sitten joukkuekoot, kierrosmäärät tai aikarajat tilasta riippuen.\n\nTeemajuhlavinkki: kun teema on aktiivisena asetuksissa (esim. "80-luvun juhlat"), jokainen kappalevalinta juhlatilassa nostaa automaattisesti vain sopivia kappaleita — juhla pysyy aiheessaan.',
        },
        jukeboxCard: {
          title: 'Jukeboksi',
          body: 'Karaoke ilman kilpailua: rakenna soittolistoja, lisää kappaleita jonoon, jaa suosikkeja. Täydellinen taustaviihde.',
          details: 'Jukeboksi on rento tila:\n• Valitse soittolistat tai yksittäiset kappaleet pohjaksi.\n• Valinnaiset videotauot välissä, jotta tunnelma ei katkea koskaan.\n• Ei pisteytystä, ei mikrofoneja — kappaleet vain soivat sanoituksineen.\n\nTäydellinen koko illan viihteeksi tai lämmittelyksi ennen ensimmäistä kierrosta.',
        },
        jukeboxView: {
          title: 'Jukeboksin valikossa',
          body: '"Selaa soittolistoja" avaa kaikki tallennetut soittolistot suoraan — myös ne, jotka olet luonut kirjastossa. Yksi klikkaus lisää koko soittolistan jonoon.',
          details: 'Jukeboksin soittolista-asetukset tarjoavat:\n• Näytetäänkö videot (jos kappaleissa on sellaisia)\n• Videotaukot: välivideot kappaleiden välissä, esim. kuulutuksia varten\n• Sekoitetanko pohja vai toistetaanko kiinteässä järjestyksessä\n\nKäynnistyy koko näytölle — poistu Escillä tai ylälaidan pysäytyspainikkeesta.',
        },
        highscoreCard: {
          title: 'Huipputulokset',
          body: 'Huipputulokset per kappale ja vaikeustaso — voita ystäväsi (tai itsesi).',
          details: 'Taulut muistivat per kappale ja vaikeustaso:\n• Pisteet, tarkkuus, kultaiset nuotit ja päivämäärä\n• Kuka pelaaja tuloksen teki (profiilikuva)\n• Tuliko tulos companion-sovelluksen kautta (puhelinkuvake) vai työpöydältä\n\nKun verkkotila on päällä (profiilinäkymä), näet lisäksi globaalit taulut ja kilpailet muiden asennusten pelaajien kanssa.',
        },
        highscoreView: {
          title: 'Huipputuloslistat',
          body: 'Suodatettu kappaleen ja vaikeustason mukaan — yläreunan suodatuspalkilla. Puhelinkuvakkeet näyttävät companion-sovelluksen käytön.',
          details: 'Yläreunan suodatuspalkki mahdollistaa:\n• Haun kappaleen tai pelaajan mukaan\n• Suodatuksen vaikeustason mukaan\n• Vaihdon paikallinen/globaali (kun verkkotila on päällä)\n\nHuijauksen esto: jokainen tulos sisältää kappaleen sormenjäljen — manipuloidut tulokset havaitaan ja merkataan.',
        },
        settingsCard: {
          title: 'Asetukset',
          body: 'Mikrofonit, kieli, peliasetusten hienosäätö, ulkonäkö ja grafiikka — kaikki säätimet ovat täällä.',
          details: 'Asetusten 12 välilehteä pikaisesti:\n• Yleiset: kieli, oletusvaikeustaso, verkkotoiminnot\n• Pelikokemus: pisteytys, partikkelit, jonon automaattitoisto\n• Ulkonäkö: teemat, sanoitustyyli, tausta\n• Grafiikka / Ääni: ulostulolaite, äänenvoimakkuus, YouTube-laatu\n• Mikrofoni: laitteet, herkkyys, kohinaraja, esiasetukset\n• Mobiili: companion-laitteiden yhdistäminen & hallinta\n• Web-kamera: kamera taustaksi\n• Kirjasto: kappalekansio, tuonti, nollaus\n• Genret & kielet: omat kategoriat\n• Teemajuhlat: teeman aktivointi & asetukset\n• Synkronointi & varmuuskopio: turvaverkot\n\nKaikille välilehdille on oma syvällinen asetuskierros ?-ohjevalikossa.',
        },
        settingsView: {
          title: 'Asetusten välilehdet',
          body: 'Valitse osio ylhäältä: Yleiset (kieli), Pelikokemus, Ulkonäkö, Grafiikka / Ääni, Mikrofoni, Mobiili (puhelinyhteys) ja muuta.',
          details: 'R28:sta lähtien jokaisen välilehden yläreunassa on lyhyt johdanto, joka kertoo sen tehtävän — sinun ei koskaan tarvitse arvailla, mihin asetus kuuluu.\n\nVastaava kierros: "Asetukset" ?-ohjevalikossa vie sinut läpi jokaisen välilehden.',
        },
        finish: {
          title: 'Valmista tuli! 🎉',
          body: 'Nyt tunnet perusteet.\n\nVinkki: ?-kuvake valikkopalkissa tuo sinut takaisin milloin tahansa — myös yksittäisten aiheiden luvuille, editori-kierrokselle ja asetuskierrokselle.',
          details: 'Mitä seuraavaksi? Muutama ehdotus ensiminuuteillesi:\n1. Luo profiili (Profiilit valikkopalkissa) — ilman sitä pelaat, mutta et kerää XP:tä.\n2. Tuo kappaleita (Asetukset → Kirjasto).\n3. Muutama päivittäishaastekierros XP-boostia varten.\n4. Ystäviä tulossa? Kokeile juhlatilaa — companion-sovellus muuttaa jokaisen puhelimen mikrofoniksi (sille on oma kierros).',
        },
      },
    },

    // ═══ Editor tour ═══
    editor: {
      title: 'Editori-kierros',
      desc: 'Nuotit, sanoitukset, äänet & harmonisointi — kappaleen työkalupakki.',
      chapters: {
        entry: 'Pääsy editoriin',
        layout: 'Asettelu',
        notes: 'Nuottien muokkaus',
        extras: 'Ekstrat & harmonisointi',
      },
      steps: {
        welcome: {
          title: 'Editori ✏️',
          body: 'Tästä kappaleista tulee laulettavia karaoke-raitoja: aseta nuotteja, ajoita sanoituksia, jaa ääniä.\n\nHiekkalaatikkovinkki: harjoittele testikappaleella — muutokset saa kumottua Ctrl+Z:llä.',
          details: 'Editori toimii UltraStar-muodossa: jokaisella nuotilla on alkuaika, kesto, sävelkorkeus ja teksti (tavu). Monta nuottia muodostaa pelissä näkemäsi nuottiraidan.\n\nUusien kappaleiden lähteet:\n• Tekstituonti (UltraStar/TXT) editorissa\n• MIDI-tuonti (nuotit luodaan MIDI:stä)\n• AI-harmonisointi: sanoitukset + ääni → nuottiehdotukset\n\nKaikki tapahtuu ei-tuhoavasti: kunnes tallennat, alkuperäinen kappale pysyy koskemattomana.',
        },
        songList: {
          title: 'Kappaleen valinta',
          body: 'Hae kappaletta avataksesi sen. Suodattimet paljastavat kappaleet, joilta puuttuu metatietoja — editori yhtenäistää ne myöhemmin.',
          details: 'Suodatinpiirteet listan yläpuolella näyttävät kappaleet ilman genreä/kieltä/vuotta — nopein tie kappaleisiin, joita Metadata Studio ei ole vielä käsitellyt.\n\nHaku kattaa nimen ja artistin — kirjainkoolla ei väliä.',
        },
        noSongs: {
          title: 'Ei vielä kappaleita',
          body: 'Editori tarvitsee kappaleita kirjastoon. Tuo ensin kappaleita (kirjasto → tuonti / kansioskannaus) ja palaa sitten.',
          details: 'Miten saat kappaleita:\n• Asetukset → Kirjasto → aseta kappalekansio: jokainen alikansio luetaan yhtenä kappaleena (ääni/video + UltraStar-teksti).\n• Vaihtoehtoisesti yksittäisiä tiedostoja tuontiikkunan kautta.\n• Tai luo uusi kappale editorissa ("Uusi kappale") ja kokoa sanoitukset + ääni itse.',
        },
        openSong: {
          title: 'Avaa kappale',
          body: 'Klikkaa nyt kappaletta listasta avataksesi sen editorissa.',
          details: 'Kun kappale on auki, näet ylhäällä työkalurivin (aliotsikon) sekä aikajanan aaltomuodolla, nuottiraidoilla ja sanoituksilla.\n\nKappale pysyy auki, kunnes suljet sen "Takaisin"-painikkeesta — tallentamattomat muutokset kysyvät ensin vahvistusta.',
        },
        leftPanel: {
          title: 'Työkalurivi',
          body: 'Kaikki nuoteille: lisää, monista, poista, jaa, yhdistä — plus nuottityypit, äänet ja naputustila (siitä kohta lisää).',
          details: 'Työkalut järjestyksessä:\n• ➕ Lisää nuotti: laskeutuu toistokohtaan\n• ⧉ Monista: kopioi valitun nuotin heti sen perään\n• 🗑 Poista: poistaa valinnan\n• ✂ Jaa: yksi nuotti → kaksi (puolivälistä)\n• ⇄ Yhdistä: kaksi valittua → yksi\n\nValitse klikkaamalla; shift-klikkaus valitsee useita. Sitten näppäimistö jatkaa: ⌫ poistaa, ↑/↓ siirtää sävelkorkeutta, ←/→ siirtää ajassa.',
        },
        lyricsPanel: {
          title: 'Sanoituspaneeli',
          body: 'Sanoitusrivit ovat vasemmalla. Kaksoisnapsauta riviä, niin toisto hyppää suoraan siihen — teksti ja ajoitus ovat muokattavissa täällä.',
          details: 'Sanoituspaneeli on sekä teksti ETTÄ ajoitus:\n• Tavun klikkaus valitsee vastaavan nuotin aikajanalta.\n• Kaksoisnapsautus hyppää kohtaan (toisto seuraa).\n• Oikea napsautus (tai kynäkuvake) avaa rivin muokkauksen: vaihda teksti, jaa tavut sanarajoista, siirrä koko rivin ajoitusta.\n\nSanarajojen jakaminen käyttää kielen tunnistusta ja jakaa tavut sanoille järkevästi — ei enää käsin pilkkomista.',
        },
        subHeaderTools: {
          title: 'Nuottien muokkaus',
          body: 'Nuotit ovat palikoita nuottikaistoilla: lisää, monista, poista, jaa (yksi nuotti → kaksi) ja yhdistä (kaksi → yksi).\n\nMuokkaa valittuja nuotteja vauhdikkaasti: ⌫ poistaa, ↑/↓ siirtää sävelkorkeutta.',
          details: 'Tarkkuusvinkit:\n• Zoomaus: Ctrl+hiiren rulla aikajanan päällä — zoomaa sisään hienoon ajoitukseen.\n• Toisto: välilyönti käynnistää/pysäyttää, Shift+välilyönti toistaa vain valinnan.\n• Useiden nuottien siirtäminen: valitse kaikki, ↑/↓ siirtää koko nippua.\n\nAjoitukseen: nuotin alun pitää osua tavun alkukohtaan laulussa — aaltomuoto auttaa löytämään kohdat.',
        },
        noteTypes: {
          title: 'Nuottityypit',
          body: '5 tyyppiä uusille nuoteille:\n: Normaali (sävelkorkeus ratkaisee)\n* Kultainen (lisäpisteitä)\nF Freestyle (mikä tahansa nuotti kelpaa)\nR Rap (vain ajoitus)\nG Rap-kultainen',
          details: 'Mitä kukin tyyppi tarkoittaa pelissä:\n• Normaali (:): klassinen laulunuotti — sävelkorkeus ja ajoitus ratkaisevat.\n• Kultainen (*): näkyy kultaisena, tuplapisteet osumista. Täydellinen kappaleen kohokohtiin.\n• Freestyle (F): sävelkorkeudella ei väliä, vain teksti/ajoitus ratkaisee — hyvä puhutuille kohdille.\n• Rap (R): arvioi ajoituksen ja rytmin melodian sijaan.\n• Rap-kultainen (G): kuten rap, mutta lisäpisteitä.\n\nTyyppiä voi vaihtaa myöhemmin: valitse nuotti ja poimi uusi tyyppi työkalurivistä.',
        },
        voices: {
          title: 'Äänet',
          body: 'P1 = pelaaja 1, P2 = pelaaja 2 (duetto!), P4/P8 = kolmas/neljäs ääni. Jokainen nuotti kuuluu jollekin äänelle — näin syntyy erillisillä osilla varustetut duettokappaleet.',
          details: 'Äänien jako:\n• Ääni-pudotusvalikko valitsee radan, jolle uudet nuotit laskeutuvat.\n• Asetettuja nuotteja voi siirtää: valitse ja vaihda ääntä.\n• Pelin duettotilassa jokainen pelaaja valitsee oman raidan — kirjasto suodattaa automaattisesti kappaleet, joissa vähintään 2 ääntä.\n\nP4/P8 mahdollistavat jopa kvartetit; pääpelitilat käyttävät P1/P2.',
        },
        tapMode: {
          title: 'Naputustila — turbo 🥁',
          body: 'Pidä näppäintä pohjassa ja naputa mukana: jokainen klikkaus pudottaa nuotin nykyiseen toistokohtaan, rivi riviltä. Luo nuotteja reaaliajassa.',
          details: 'Näin naputustallennus etenee:\n1. Aktivoi naputustila työkalurivistä.\n2. Käynnistä toisto — kappale soi kuuluvasti.\n3. Klikkaa tavujen rytmissä — jokainen osoitus pudottaa nuotin toistokohtaan viimeksi valitulla sävelkorkeudella.\n4. Viimeistele sitten: korjaa sävelkorkeudet (↑/↓ valituilla nuoteilla) ja säädä kestot.\n\nNaputustila on 5–10× nopeampi kuin nuottien asettelu käsin — kokonaisia kappaleita minuuteissa tunteiden sijaan.',
        },
        panels: {
          title: 'Yläreunan paneelit',
          body: 'Kolme paneelia oikeassa yläkulmassa: metatiedot (genre/kieli/vuosi), äänianalyysi ja AI-assistentti.',
          details: 'Mitä kolme paneelia tekevät:\n• Metatiedot: muokkaa avoimen kappaleen genreä, kieltä ja vuotta suoraan — ruokkii suodattimia ja teemajuhlia.\n• Äänianalyysi: analysoi äänitiedoston (äänenvoimakkuus, sävellaji, BPM) ja ehdottaa arvoja.\n• AI-assistentti: sanoitusten täydennys, kappaleen tunnistus ja nuottien harmonisointi AI:lla — vaatii määritetyn AI-palveluntarjoajan (Asetukset → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Harmonisointiturbo: AI- ja sääntöehdotukset genrelle, kielelle ja vuodelle — kuuntelu ennen vahvistusta, manuaalinen hienosäätö ja epävarmojen kohtien tarkistusjono.',
          details: 'Studion työnkulku:\n1. "Analysoi kaikki kappaleet" — sääntömoottori (tiedostopolut, tagit) ja valinnaisesti AI ehdottavat genren/kielen/vuoden.\n2. Ehdotuksilla on varmuusaste: vihreä = varma, keltainen = tarkista.\n3. Kuuntele: kappaleen klikkaus soittaa pätkän — varmista ehdotukset nopeasti.\n4. Vahvista yksitellen tai "käytä kaikkia vihreitä".\n\nTarkistusjono kerää epävarmat kohdat myöhemmäksi — mikään ei katoa.',
        },
        shortcuts: {
          title: 'Pikanäppäimet',
          body: 'Kaikki näppäimistön pikavalinnat silmäyksellä — editori on kosketinsoitin. Klikkaa itsesi läpi!',
          details: 'Tärkeimmät pikavalinnat:\n• Ctrl+Z / Ctrl+Y: kumoa / tee uudelleen\n• Välilyönti: toista/keskeytä\n• ⌫: poista valitut nuotit\n• ↑/↓: siirrä sävelkorkeutta · ←/→: siirrä ajassa\n• S: jaa nuotti · M: yhdistä\n• 1–5: valitse nuottityyppi\n\nPikavalintapaneelissa voit katsella ja muokata näppäimiä.',
        },
        finish: {
          title: 'Rakentamaan! 🛠️',
          body: 'Tunnet nyt editorin työkalupakin.\n\nMuista: Ctrl+Z pelastaa kaiken, ja ?-kuvake valikkopalkissa tuo sinut takaisin näihin lukuihin milloin tahansa.',
          details: 'Suositeltu järjestys uudelle kappaleelle:\n1. Liitä ääni/video (kappaleen tiedot -välilehti)\n2. Tuo tai kirjoita sanoitukset (sanoitukset-välilehti)\n3. Naputa nuotit (naputustila) tai AI-harmonisointi\n4. Ylläpidä metatietoja (genre/kieli/vuosi — tärkeää suodattimille!)\n5. Tallenna — tästä lähtien kappale näkyy kirjastossa.',
        },
      },
    },

    // ═══ Settings tour (R28) ═══
    settings: {
      title: 'Asetukset',
      desc: 'Kaikki asetukset silmäyksellä: välilehdet, yleisasetukset, ääni, kirjasto, companion-laitteet ja varmuuskopiot.',
      chapters: {
        overview: 'Yleiskuva',
        basics: 'Perusasetukset',
        sound: 'Ääni & Mikrofoni',
        library: 'Kirjasto & Teema',
        devices: 'Laitteet & Companion',
        data: 'Synkronointi, Varmuuskopio & Info',
      },
      steps: {
        welcome: {
          title: 'Asetukset 👋',
          body: 'Tämä kierros kulkee vain asetusten parissa — välilehti kerrallaan.\n\nVaihdan automaattisesti jokaiseen välilehteen ja selitän, mitä sieltä löytyy.',
          details: 'Välilehdet kierrosjärjestyksessä: Yleiset, Pelikokemus, Ulkonäkö, Grafiikka / Ääni, Mikrofoni, Mobiili (companion), Web-kamera, Kirjasto, Genret & kielet, Teemajuhlat, Viraalilistat, Synkronointi & varmuuskopio sekä Tietoja.\n\nJokaisen välilehden yläreunassa on lyhyt johdanto — tämä kierros syventyy siihen vaihe vaiheelta.',
        },
        tabBar: {
          title: 'Välilehtipalkki',
          body: 'Kaikki asetukset on järjestetty välilehdille: Yleiset, Pelikokemus, Ulkonäkö, Ääni, Mikrofoni, Mobiili, Web-kamera, Kirjasto, Genret & kielet, Teemajuhlat, Synkronointi & varmuuskopio ja Tietoja.\n\nR28:sta lähtien jokaisen välilehden yläreunassa oleva lyhyt johdanto kertoo, mitä se tekee.',
          details: 'Suunnistusapu — kysy itseltäsi etsiessäsi…\n• "Miten peli TOIMII?" → Pelikokemus\n• "Miltä se NÄYTTÄÄ?" → Ulkonäkö\n• "Miltä se KUULOSTAA?" → Grafiikka / Ääni / Mikrofoni\n• "Yhdistä laitteita?" → Mobiili (companion) / Mikrofoni\n• "Kappaleeni?" → Kirjasto\n• "Varmuuskopioi tiedot?" → Synkronointi & varmuuskopio\n\nVälilehdet vierivät vaakasuunnassa kapeissa ikkunoissa — pyyhkäise oikealle.',
        },
        general: {
          title: 'Yleiset',
          body: 'Käyttöliittymän kieli, oletusvaikeustaso, verkkotoiminnot ja täydellinen luettelo pikavalinnoista.',
          details: 'Kieli: käytettävissä on 16 kieltä. Vaihto vaikuttaa heti koko käyttöliittymään.\n\nOletusvaikeustaso: koskee uusia kierroksia, ellei aloitusikkuna valitse toista.\n\nVerkkotoiminnot määrittävät, lähetetäänkö huipputulokset globaalisti ja luodaanko päivittäishaasteet verkossa.',
        },
        gameplay: {
          title: 'Pelikokemus',
          body: 'Pisteytys päälle/pois, partikkelitehosteet, jonon automaattitoisto ja muita toimintavalintoja kierroksiin ja tuloksiin.',
          details: 'Tärkeimmät kytkimet:\n• Pisteytys: puhtaalle laulamiselle ilman pistenäyttöä.\n• Jonon automaattitoisto: kappaleen päätyttyä seuraava jonoalkio käynnistyy automaattisesti — ihanteellinen juhlailloille ilman juontajaa.\n• Partikkelit & tehosteet: poista käytöstä heikommilla koneilla.\n\nLisäksi: toiminta kierrosten jälkeen (tulossivu, välitön uusinta) ja combo-näytöt.',
        },
        appearance: {
          title: 'Ulkonäkö',
          body: 'Teemat, animoitu tausta tai oma taustavideosi, sanoitustyyli ja -koko, nuottonäyttö sekä suorituskykytila heikommille koneille.',
          details: 'Sanoitustyyli: "Karaoke" (sanan täyttöväritys), "UltraStar" (tavupalikat) tai "Minimaalinen".\n\nTausta: teemojen lisäksi käy oma videokin — pelissä se pyörii nuottien takana himmennettynä.\n\nSuorituskykytila karsii animaatioita ja taustoja rajusti — kannattaa noin vuoden 2015 laitteista alkaen.',
        },
        graphicsound: {
          title: 'Ääni',
          body: 'Ulostulolaite (ml. ASIO), pää- ja esikuunteluäänenvoimakkuus, mikrofonin herkkyys, äänenvoimakkuuden normalisointi ja YouTube-videon laatu.',
          details: 'ASIO: merkityksellinen vain Windowsissa ja ASIO-kykyisillä äänikorteilla — pienentää viivettä mikrofonin kuuntelussa.\n\nÄänenvoimakkuuden normalisointi tasaa kappaleiden äänenvoimakkuuserot — oletusarvot ovat hyvin valitut.\n\nYouTube-laatu: vaikuttaa kappaleisiin, joiden videolähde on YouTubessa; parempi laatu = enemmän kaistanleveyttä.',
        },
        microphone: {
          title: 'Mikrofoni',
          body: 'Laitevalinta, herkkyys, kohinaraja ja reaaliaikainen taso — sekä esiasetukset. Älypuhelimet yhdistetään Mobiili-välilehdeltä.',
          details: 'Esiasetukset: tyypilliset kokoonpanot ("dynaaminen laulumikki", "headset", "puhelin") asettavat herkkyyden ja kohinarajan järkevästi yhdistettynä.\n\nKohinaraja: suodattaa hengitykset ja huoneäänet — reaaliaikainen taso näyttää heti, mikä pääsee läpi.\n\nTärkeää moninpelissä: JOKAINEN pelaaja voi saada OMAN laitteen — jako tehdään aloitusikkunassa joka kierroksella.',
        },
        libraryTab: {
          title: 'Kirjasto',
          body: 'Aseta kappalekansio (jokainen alikansio = yksi kappale) ja skannaa se, nollaa kirjasto tai poista kaikki tiedot — sekä tuonti muista karaokesovelluksista.',
          details: 'Kansiomuoto: yksi alikansio per kappale, jossa ääni/video + TXT (UltraStar-muoto). Skanneri tunnistaa tavalliset yhdistelmät (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nTuonti muista sovelluksista: SingStar-arkisto? UltraStar-kokoelma? Tuontimuunnin ottaa metatiedot ja sanoitukset haltuunsa automaattisesti.\n\nVarovasti "poista kaikki tiedot" -toiminnon kanssa: kaksinkertainen vahvistus kysyy kahdesti — ota silti ensin varmuuskopio (Synkronointi & varmuuskopio -välilehti).',
        },
        taxonomy: {
          title: 'Genret & kielet',
          body: 'Luo omia genre- ja kielimerkintöjä — ne näkyvät kaikissa pudotusvalikoissa ja ruokkivat AI-harmonisointia.',
          details: 'Miksi omia merkintöjä? Vakiolistat eivät kata kaikkea ("Schlager", "K-Pop", "Murre" …). Omat merkinnät:\n• ilmestyvät heti kirjaston suodattimiin\n• ovat valittavissa editorissa ja Metadata Studiossa\n• osallistuvat harmonisointiin (AI ehdottaa niitä sopiville kappaleille)\n\nPoistaminenkin toimii — kappaleet säilyttävät merkinnän, kunnes se vaihdetaan.',
        },
        motto: {
          title: 'Teemajuhlat',
          body: 'Aseta koko peli yhteen teemaan (esim. 80-luvun juhlat): aktiivisena ollessaan teema korvaa kaikki hakukentät ja suodattimet — jokainen kappalevalinta nostaa vain sopivia kappaleita.',
          details: 'Teemasuodatin tuntee useita kenttiä, vapaasti yhdisteltävissä (AND-logiikka):\n• Genre (esim. rock)\n• Kieli (esim. englanti)\n• Aikakausi/vuosi (esim. 1980–1989)\n\nVaikutus: kirjasto, juhlapelien kappalevalinta JA companion-sovellus näyttävät vain teemavarannon — vieraat eivät voi valita aiheen ulkopuolista.\n\nTeeman deaktivointi palauttaa normaalin näkymän heti; pelatut kappaleet ja huipputulokset pysyvät ennallaan.',
        },
        mobile: {
          title: 'Mobiili & Companion',
          body: 'Yhdistä älypuhelimia QR-koodilla — mikrofoniksi, kaukosäätimeksi tai mukalaululaitteeksi. Näet kaikki yhdistetyt laitteet ja niiden yhteyskoodit.',
          details: 'Yhteys: skannaa QR-koodi (sama WiFi!) tai kirjoita osoite — oma companion-kierros selittää yksityiskohdat ?-ohjevalikossa.\n\nTämä välilehti näyttää myös:\n• Kaikki yhdistetyt laitteet ja niiden tilan (aktiivinen, rooli, viimeisin toiminta)\n• Profiilien määrittämisen laitteille\n• Yksittäisten laitteiden yhteyden katkaisemisen\n\nProfiilikohtaiset QR-koodit (haltuunottoa varten) ovat profiilinäkymän asetuskortissa.',
        },
        webcam: {
          title: 'Web-kamera',
          body: 'Käytä kameraa animoituna kappaleen taustana: resoluutio, peilaus, värikylläisyys, sumennus ja muita tehosteita — live-esikatselun kera.',
          details: 'Kameratausta pyörii nuottien takana kappaleen aikana — katsotte itseänne laulamassa!\n\nTehosteet: peilaus (kuten selfiekuvassa), värikylläisyys, pehmeä sumennus, seepia — näkyvät heti live-esikatselussa.\n\nYksityisyys: kamera toimii vain paikallisesti, mitään ei tallenneta tai lähetetä.',
        },
        sync: {
          title: 'Synkronointi & varmuuskopio',
          body: 'Luo ja palauta varmuuskopioita, synkronoi tietoja laitteiden välillä. Desktop-versiossa pelaajien tiedot peilataan myös pysyvästi AppData-kansioon.',
          details: 'Varmuuskopio sisältää: profiilit (XP/edistyminen mukaan lukien), huipputulokset, asetukset ja soittolistojen määritykset — yhtenä tiedostona arkistoitavaksi tai siirrettäväksi.\n\nAppData-peili (desktop-versio) suojaa selaimen tietojen menetykseltä: vaikka selaimen tallennustila tyhjennettäisiin, desktop-versio palauttaa kaiken.\n\nPalautus ylikirjoittaa nykyiset tiedot — taas: ota varmuuskopio ensin.',
        },
        about: {
          title: 'Tietoja',
          body: 'Versio, alusta, lisenssit ja osallistuvat projektit — Karaoke ZEROn digitaalinen impressum.',
          details: 'Näet myös julkaisukanavan (web/desktop) ja voit tarkistaa päivitykset. Lisenssit listaavat käytetyt avoimen lähdekoodin projektit — kiitos kaikille mukana olleille!',
        },
        finish: {
          title: 'Asetukset kunnossa! ⚙️',
          body: 'Tunnet nyt kaikki asetukset.\n\n?-kuvake valikkopalkissa tuo sinut takaisin tähän kierrokseen milloin tahansa — halutessasi luku kerrallaan.',
          details: 'Suositus ensimmäiselle asetusillalle:\n1. Kirjasto-välilehti: skannaa kappalekansio\n2. Mikrofoni-välilehti: valitse esiasetus + tarkista reaaliaikainen taso\n3. Mobiili-välilehti: yhdistä puhelimia (companion-kierros!)\n4. Teema-välilehti: mieti juhlateemaa\n5. Synkronointi & varmuuskopio: ota ensimmäinen varmuuskopio\n\nNäin karaokeilta on raiteillaan.',
        },
      },
    },

    // ═══ Profile tour (R29) ═══
    profile: {
      title: 'Profiilit & hahmot',
      desc: 'Luo pelaajia, seuraa XP:tä & edistymistä, verkkosynkronointi ja companion-haltuunotto.',
      chapters: {
        overview: 'Yleiskuva',
        characters: 'Hahmot & edistyminen',
        online: 'Verkko & companion',
      },
      steps: {
        welcome: {
          title: 'Pelaajaprofiilisi 👤',
          body: 'Profiilit ovat pelin identiteettejä: XP, taso, tilastot ja saavutukset elävät profiilissa — ja huipputulokset kantavat nimeäsi.\n\nTämä kierros näyttää, miten profiileja luodaan ja hallitaan.',
          details: 'Miksi profiilit?\n• XP & taso: lauletut kappaleet, haasteet ja saavutukset keräävät kokemusta — taso nousee arvonimen myötä (aloittelija → karaokelegenda).\n• Tulostaulut: huipputulosmerkinnät näyttävät kuvasi.\n• Juhlatilat: jokainen pelaajavalinta nostetaan tästä listasta.\n• Companion-laitteet voivat "ottaa profiilin haltuunsa" ja laulaa sen identiteetillä.\n\nProfiilit elävät selaimen tallennustilassa (paikallisesti) tai verkkotilissä (synkronoituna) — valitset sen luonnin yhteydessä.',
        },
        topBar: {
          title: 'Toimintopalkki',
          body: 'Ylhäältä kytket verkon tulostaulut, vaihdat paikallisen/globaalin ja avaat uusien profiilien luomislomakkeen.',
          details: 'Palkin osat:\n• Verkkokytkin: ottaa verkkotoiminnot käyttöön tai pois käytöstä globaalisti (tulostaulut, tilin rekisteröinti)\n• Paikallinen/Globaali: kumpi taulu huipputulosnäkymässä näkyy\n• "Lataa profiili": kirjaa sinut sisään synkronointikoodilla ja hakee verkkoprofiilisi tälle laitteelle\n• "Uusi profiili": avaa luomislomakkeen (seuraava vaihe)',
        },
        createButton: {
          title: 'Profiilin luominen',
          body: '"Uusi profiili" avaa lomakkeen: nimi, profiilikuva, maa ja tallennustapa (paikallinen tai verkkotilillä).',
          details: 'Lomakkeen kentät:\n• Nimi: näkyy tulostauluissa ja juhlissa\n• Kuva: lataa oma kuvasi tai alkukirjain värillä\n• Maa: lippu globaaleille tulostauluille\n• Tallennustapa: "Paikallinen" tallentaa vain tälle laitteelle; "Verkko" rekisteröi valinnaisesti tilin (sähköposti + salasana) ja mahdollistaa synkronoinnin laitteiden välillä.\n\nVerkkotilejä on olemassa vain, kun verkkotila on päällä — rekisteröinti kulkee taustalla, ja profiili on heti käytettävissä.',
        },
        empty: {
          title: 'Ei vielä profiileja',
          body: 'Täällä pelaajasi muotoutuvat. Klikkaa "Uusi profiili" ja luo ensimmäinen hahmo — kaikki toimii ilman sitäkin, mutta XP ja saavutukset kerääntyvät vain profiileille.',
        },
        cards: {
          title: 'Hahmokortit',
          body: 'Jokainen kortti näyttää kuvan, tason, rankingin ja tallennustavan. Klikkaus valitsee profiilin ja näyttää sen tiedot alla.\n\nPiste oikeassa yläkulmassa: vihreä = aktiivinen, punainen = poissa käytöstä.',
          details: 'Korttien symbolit:\n• ✓-kupla: parhaillaan aktiivinen profiili (aloitusikkuna muistaa sen)\n• Ranking-kuvake + "Taso X": profiilin edistyminen\n• 💾/🌐-merkki: tallennettu paikallisesti tai verkkoon\n• 📱-merkki: companion-laite on ottanut tämän profiilin haltuunsa\n• Lippu: valittu maa\n\nKortin klikkaus = valitse se. Käytöstä poistaminen (punainen) tapahtuu edistymiskortista — poissa käytöstä olevat profiilit katoavat pelaajavalinnoista mutta säilyttävät kaikki tietonsa.',
        },
        progression: {
          title: 'Edistymiskortti',
          body: 'XP-palkki seuraavaan tasoon sekä perustilastot: lauletut kappaleet, kultaiset nuotit, paras combo ja kokonaispisteet.\n\nOikeanpuoleinen Aktiivinen-kytkin poistaa profiilin väliaikaisesti käytöstä.',
          details: 'Tilastot selitettynä:\n• Pelatut kappaleet: jokainen suoritettu kierros lasketaan\n• Kultaiset nuotit: kerätään kappaleittain — kertoo, miten tarkkaan osut kohokohtiin\n• Paras combo: kaikkien aikojen pisin virheetön putki\n• Kokonaispisteet: kaikkien pisteiden summa\n\nAktiivinen-kytkin: poissa käytöstä olevat profiilit katoavat pelaajavalinnasta ja jonosta (duetto-/kaksinkamppailukappaleet pyytävät silloin uutta valintaa) mutta eivät menetä MITÄÄN — aktivoiminen riittää.',
        },
        settingsCard: {
          title: 'Profiilin asetukset',
          body: 'Muokkaa nimeä & kuvaa, vaihda maa, yksityisyysvalinnat — sekä profiilin QR-koodi, jolla puhelin voi ottaa tämän profiilin haltuunsa.',
          details: 'Yksityisyys: määrittää, mitkä tilastot näkyvät globaaleissa tulostauluissa.\n\nNäytä QR-koodi: luo koodin, joka osoittaa SUORAAN tähän profiiliin — koodin skannannut puhelin yhdistyy tällä profiililla (ideaali: jokainen laulaja saa puhelimeensa oman profiilinsa).\n\nPoistaminen hävittää profiilin pysyvästi — huipputulokset jäävät anonyymeinä merkintöinä. Verkkoprofiileista sovellus kysyy vielä kerran ennen poistamista.',
        },
        onlineToggle: {
          title: 'Verkon tulostaulut',
          body: 'Kytkin ottaa verkkotoiminnot käyttöön: globaalit huipputulokset, tilin rekisteröinnin ja profiilien synkronoinnin laitteiden välillä.',
          details: 'Pois = täysin offline: kaikki pysyy paikallisena, ei verkkopyyntöjä tulostauluille.\n\nPäällä = saat tulostauluihin "Globaali"-välilehden ja voit luoda tai ladata verkkoprofiileja.\n\nKytkeminen vaikuttaa heti — jo kerätyt paikalliset huipputulokset pysyvät aina.',
        },
        loginButton: {
          title: 'Profiilin lataaminen',
          body: 'Oletko jo rekisteröitynyt? "Lataa profiili" hakee verkkoprofiilisi sähköpostilla/synkronointikoodilla tälle laitteelle — edistys ja huipputulokset tulevat mukaan.',
          details: 'Kirjautumisikkunassa on kaksi tapaa:\n• Sähköposti + salasana (kuten rekisteröinnissä)\n• Synkronointikoodi: lyhyt koodi profiilistasi — helpompi vieraalla koneella\n\nKirjautumisen jälkeen ladattu profiili yhdistyy paikalliseen (korkeampi edistyminen voittaa). Synkronointi kulkee sen jälkeen automaattisesti taustalla.',
        },
        companionClaim: {
          title: 'Profiilin haltuunotto 📱',
          body: 'Kun puhelin yhdistyy profiililla, kortissa näkyy 📱. Puhelin laulaa ja valitsee kyseisellä profiililla — nimi, XP ja saavutukset kertyvät sille.',
          details: 'Haltuunoton voi tehdä kolmella tavalla:\n1. Skannaa QR-koodi profiilin asetuksista — yhdistyy SUORAAN kyseisellä profiililla\n2. Puhelimessa yhdistämisen jälkeen: valitse profiili listasta\n3. Täällä asetusten Mobiili-välilehdeltä: laite → määritä profiili\n\nYhden profiilin voi ottaa haltuun vain YKSI laite kerrallaan. Yhteyden katkaisu: Mobiili-välilehdeltä tai puhelimesta itse.',
        },
        finish: {
          title: 'Tiimi valmis! 🎭',
          body: 'Tiedät nyt, miten profiilit toimivat — XP:stä verkkosynkronointiin ja puhelimen haltuunottoon.\n\nJatka saavutuksilla: kierros "Saavutukset & edistyminen" näyttää, mitä profiilisi voi kerätä.',
        },
      },
    },

    // ═══ Queue tour (R29) ═══
    queue: {
      title: 'Jono',
      desc: 'Lisää kappaleita jonoon, järjestele, säännöt & companion-pyynnöt.',
      chapters: {
        overview: 'Yleiskuva',
        manage: 'Hallinta',
        companion: 'Companion & automaattitoisto',
      },
      steps: {
        welcome: {
          title: 'Jono 🎶',
          body: 'Jono järjestää karaokeillan: kappaleet asettuvat jonoon, kaikki saavat vuoron — kenenkään ei tarvitse vahtia konetta.\n\nTämä kierros kattaa jonoon lisäämisen, järjestelyn ja säännöt.',
          details: 'Kolme tapaa lisätä jonoon:\n1. Kirjasto → klikkaa kappaletta → valitse aloitusikkunassa "Lisää jonoon" "Aloita"-napin sijaan\n2. Kappaleen jälkeen: "Toista seuraava kappale" tulossivulla pitää vauhdin yllä\n3. Companion-sovelluksella: vieraat lisäävät kappaleita puhelimistaan (📱-merkinnöillä varustettuina)\n\nValikkopalkki näyttää jonon pituuden laskuripainikkeessa — näet illan tulevan.',
        },
        navButton: {
          title: 'Jono-painike',
          body: 'Valikkopalkin "Jono" vie tänne — painikkeen numero kertoo, montako kappaletta odottaa.',
        },
        title: {
          title: 'Kappalejono',
          body: 'Lista näyttää kaikki odottavat kappaleet sijainnin, tilan (yksin/kaksinkamppailu/duetto) ja pelaajien kera — järjestyksessä lisäysaikojen mukaan.',
        },
        empty: {
          title: 'Vielä tyhjä',
          body: 'Jonossa ei vielä ole kappaleita. Lisää niitä kirjastosta (aloitusikkuna → "Lisää jonoon") — tai anna vieraiden lisätä companion-sovelluksella.',
        },
        list: {
          title: 'Jonolista',
          body: 'Jokainen kortti: sijainti, kappale, tilamerkintä ja pelaajat. Kortin klikkaaminen käynnistää kappaleen heti — vaikka järjestyksen ulkopuolelta.',
          details: 'Merkinnät:\n• 🎤 Yksin / ⚔️ Kaksinkamppailu / 🎭 Duetto — tila, jolla kappale lisättiin jonoon\n• 📱 — lisätty companion-sovelluksella\n\nKortin klikkaus = toista nyt. Oikean laidan ✕-painike poistaa alkion, ▶ käynnistää sen.\n\nNäppäimistö: Enter toistaa, Delete poistaa, ↑/↓ liikkuvat listassa.',
        },
        reorder: {
          title: 'Järjestyksen muuttaminen',
          body: 'Raahaa kortit uuteen paikkaan — vain paikallisia alkioita voi siirtää, companion-pyynnöt säilyttävät järjestyksensä.',
          details: 'Raahaus ja pudotus: tartu korttiin ja vedä ylös tai alas pitäen nappia pohjassa. Lista näyttää pudotuspaikan reaaliajassa.\n\nMiksi companion-alkiot pysyvät paikoillaan: vierassovellus järjestää lähetysajan mukaan — jos isäntä voisi sekoittaa järjestystä, pyynnöt tuntuisivat manipuloiduilta. Voit silti poistaa niitä.',
        },
        playNext: {
          title: 'Toista seuraava kappale',
          body: 'Painike käynnistää ylimmän alkion — vakiosiirto kierrosten välillä. Vaihtoehtoisesti klikkaa mitä tahansa korttia suoraan.',
          details: 'Tulossivu jokaisen kappaleen jälkeen tarjoaa saman painikkeen ("Toista seuraava kappale") — vauhti jatkuu ilman poikkeamista jononäkymään.\n\nKun automaattitoisto on päällä (Asetukset → Pelikokemus), sovellus etenee itsestään.',
        },
        clearAll: {
          title: 'Tyhjennä kaikki',
          body: '"Tyhjennä kaikki" tyhjentää koko jonon — companion-alkiot mukaan lukien. Paluutietä ei ole, joten käytä harkiten.',
        },
        rules: {
          title: 'Säännöt',
          body: 'Virallinen sääntökirja on alareunassa: enintään 3 kappaletta per pelaaja, FIFO-järjestys, omien kappaleiden poisto, valitse hahmo ensin …',
          details: 'Säännöt tarkemmin:\n• Enintään 3 kappaletta per pelaaja kerrallaan — kukaan ei voi tukkia jonoa. Laulettuaan voi lisätä uudelleen.\n• FIFO: ensin sisään = ensin vuoroon. Raahaus järjestää paikallisesti.\n• Omia kappaleita voi poistaa milloin tahansa; muiden vain "Tyhjennä kaikki" -napilla tai isäntänä.\n• Hahmo ensin: jono tarvitsee aktiivisia profiileja duetoihin ja kaksinkamppailuihin, muuten se pyytää uutta valintaa käynnistyessään.\n• Companion-pyynnöt näyttävät 📱-merkin ja lasketaan kuten omat.',
        },
        companionAdd: {
          title: 'Pyyntöjä puhelimista 📱',
          body: 'Vieraat lisäävät kappaleita jonoon companion-sovelluksella — ne näkyvät listassa 📱-merkillä ja lasketaan mukaan heidän 3 kappaleen rajaansa.',
          details: 'Vieraiden näkökulmasta: valitse sovelluksessa kappale, valitse tila, lähetä — pyyntö laskeutuu tähän listaan.\n\nSinä isäntänä näet heti: kuka pyysi (pelaajan kuva) ja että kyseessä on puhelinpyyntö (📱). 3 alkion raja koskee profiilia kohden — myös puhelimen kautta.\n\nLisää companion-kierroksessa.',
        },
        autoplay: {
          title: 'Automaattitoisto & pikakomento',
          body: 'Ota automaattitoisto käyttöön (Asetukset → Pelikokemus), jolloin seuraava kappale käynnistyy automaattisesti joka kierroksen jälkeen. Ja: Ctrl+Q käynnistää ylimmän jonoalkion mistä tahansa.',
          details: 'Automaattitoistoketju: kappale loppuu → tulossivu näkyy hetken → seuraava jonoalkio käynnistyy. Kun jono tyhjenee, ketju pysähtyy siististi.\n\nCtrl+Q toimii kaikkialta — klassikko silloin, kun seuraava kierros pitää saada rullaamaan heti.',
        },
        finish: {
          title: 'Jono odottaa! 🎧',
          body: 'Tunnet nyt jonoon lisäämisen, järjestelyn ja säännöt.\n\nVinkki: yhdistä automaattitoisto + companion-pyynnöt, niin saat täysin itsestään pyörivän karaokeillan.',
        },
      },
    },

    // ═══ Chat tour (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Avaa paneeli, lähetä viestejä, "lähetä tunnuksella" -valinta & kappalehaasteet.',
      chapters: {
        basics: 'Chatin avaaminen',
        usage: 'Viestien lähetys',
        challenges: 'Haasteet',
      },
      steps: {
        welcome: {
          title: 'Juhlachatti 💬',
          body: 'Chat yhdistää työpöydän ja companion-sovellukset: juttele keskeyttämättä laulamista — ja haastakaa toisenne jopa kappalekaksinkamppailuun.\n\nAvaan paneelin sinulle hetken päästä.',
          details: 'Mitä chat osaa:\n• Tekstiviestejä työpöydän (isännän) ja kaikkien yhdistettyjen puhelimien välillä\n• Lähettäjän valinta: isäntä voi kirjoittaa pelaajan puolesta\n• Kappalehaasteet: vieraat haastavat kaksinkamppailuun — hyväksy työpöydällä ja mennään\n\nEdellytys: jotta puhelimet pääsevät keskusteluun, companion-laitteiden on oltava yhdistettyinä (asetusten Mobiili-välilehti — katso companion-kierros).',
        },
        navButton: {
          title: 'Chatin avaaminen',
          body: 'Valikkopalkin chat-painike avaa paneelin — se liukuu sisään sivupaneelina ruudun päälle, ja sen sulkee ✕:lla tai klikkaamalla sen vierestä.',
        },
        panel: {
          title: 'Chat-paneeli',
          body: 'Historia virtaa vasemmalla, kirjoitat alhaalla. Paneeli pysyy auki, kunnes suljet sen — myös näyttöä vaihdettaessa.',
        },
        messages: {
          title: 'Historia',
          body: 'Viestisi näkyvät oikealla sinisenä (isäntänä), puhelimien viestit vasemmalla violetilla. Jokainen viesti kantaa aikaleimansa.',
          details: 'Taustapäivitys: paneeli hakee uusia viestejä 3 sekunnin välein — et jää paitsi mistään, vaikka se pyörisi taustalla.\n\nTyöpöydän chat-ilmoitus (kello) näyttää lukemattomat viestit myös suljetulla paneelilla.',
        },
        sendAs: {
          title: '"Lähetä tunnuksella"',
          body: 'Sinä olet isäntä — mutta saat kirjoittaa pelaajan puolesta: pudotusvalikko valitsee identiteetin. 🖥️ = isäntä, 📱 = pelaaja.',
          details: 'Mihin sitä tarvitaan:\n• Isäntä näppäilee pelaajan puolesta, jolla ei ole puhelinta ("Anna sanoo: kertosäe uudelleen!")\n• Lavakuulutukset juontajaprofiilin nimissä\n\nPudotusvalikon vieressä oleva väripiste näyttää pelaajan värin — historiasta näkee selkeästi, kuka "puhui".',
        },
        input: {
          title: 'Viestin kirjoittaminen',
          body: 'Kirjoita kenttään (enintään 200 merkkiä) ja paina Enteriä — tai käytä lähetyspainiketta.',
        },
        send: {
          title: 'Lähetys',
          body: 'Lähetä Enterillä tai painikkeella — viesti ilmestyy heti historiaan ja jokaiseen yhdistettyyn puhelimeen.',
        },
        songChallenges: {
          title: 'Kappalehaasteet ⚔️',
          body: 'Vieraat voivat haastaa sinut kappalekaksinkamppailuun suoraan sovelluksesta: chattiin ilmestyy haastekortti — "Hyväksy haaste" käynnistää kaksinkamppailun.',
          details: 'Näin haaste etenee:\n1. Vieras valitsee sovelluksessa kappaleen ja napauttaa "Haasta"\n2. Kortti ilmestyy chattiin kappaleen, haastajan ja hyväksymispainikkeen kera\n3. Hyväksy työpöydällä — aloitusikkuna aukeaa kaksinkamppailutila esivalittuna\n4. Laulakaa! Voittaja nappaa kunnian (ja pisteet)\n\nHuomaa: "Lähetä tunnuksella" on asetettava pelaajalle — vastustajan on oltava tunnistettavissa.',
        },
        companionSide: {
          title: 'Puhelimissa',
          body: 'Companion-sovelluksessa on oma chat-välilehtensä — siellä vieraat kirjoittavat. Mitä näet täällä, he näkevät reaaliajassa — ja päinvastoin.',
        },
        finish: {
          title: 'Viesti toimitettu! 💌',
          body: 'Tunnet nyt chatin — paneelista kappalehaasteisiin.\n\nYhdessä companion-kierroksen kanssa selviää, miten puhelimet ja työpöytä tekevät yhteistyötä.',
        },
      },
    },

    // ═══ Companion tour (R29) ═══
    companion: {
      title: 'Companion-sovellus',
      desc: 'Yhdistä älypuhelimia: mikrofoni, kaukosäädin, kappalepyynnöt & mukalaulu.',
      chapters: {
        connect: 'Yhdistäminen',
        features: 'Mitä sovellus osaa',
        manage: 'Laitteiden hallinta',
      },
      steps: {
        welcome: {
          title: 'Puhelimet oheislaitteiksi 📱',
          body: 'Companion-sovellus muuttaa jokaisen älypuhelimen karaoke-oheislaitteeksi: mikrofoniksi, kaukosäätimeksi, kappalevalinnaksi ja chatiksi — ei asennusta, suoraan selaimessa.\n\nTämä kierros kattaa vaiheen työpöytäpuolen.',
          details: 'Periaate: työpöytä on isäntä (musiikki, nuotit, pisteet) — puhelimet yhdistyvät WiFi:n kautta ja toimivat tarpeen mukaan:\n• 🎤 Mikrofoneina (sävelkorkeuden tunnistus puhelimessa!)\n• 🎮 Kaukosäätiminä (ruutujen ohjaus)\n• 🎵 Kappaleselaimina jono-pyynnöillä\n• 💬 Chat-osallistujina\n• 🪞 Live-peilinä työpöydän ruudusta\n\nEi sovelluskauppaa, ei tiliä — skannaa QR, niin kaikki on valmista.',
        },
        mobileTab: {
          title: 'Mobiili-välilehden avaaminen',
          body: 'Yhteys alkaa kohdasta Asetukset → Mobiili. Avasin juuri välilehden puolestasi.',
        },
        qrCode: {
          title: 'QR-koodin skannaaminen',
          body: 'Vasemmanpuoleinen iso koodi on suora reitti: avaa puhelimen kamera, skannaa, ja sovellus latautuu selaimeen. Tärkeää: puhelin ja tietokone samassa WiFi:ssä.',
          details: 'QR-koodi sisältää työpöydän LAN-osoitteen (esim. http://192.168.1.42:3000/mobile) — siksi molempien laitteiden on oltava samassa verkossa.\n\nJos koodi ei taivu: alla olevan osoitteen voi kirjoittaa tai kopioida (painike). Julkisessa WiFi:ssä ilman laitteiden näkyvyyttä yhteys valitettavasti epäonnistuu — käytä sen sijaan omaa hotspotia.',
        },
        connectionInfo: {
          title: 'Osoite & kopiointipainike',
          body: 'Oikealla osoite tekstinä — ja kopiointipainike jakamiseen (esim. viestisovelluksella vieraille). Vihreä rivi vahvistaa tunnistetun verkon IP-osoitteen.',
          details: 'Ennakkojako-vinkki: lähetä osoite vieraille jo ennen juhlia — heti kun työpöytä on käynnissä, kaikki yhdistyvät saman tien.\n\nKeltainen varoitus näkyy, kun LAN-osoitetta ei tunnistettu (esim. pelkkä localhost-käyttö) — silloin vain sama kone pääsee käsiksi siihen.',
        },
        roles: {
          title: 'Sovelluksen roolit',
          body: 'Yhdistämisen jälkeen sovellus tarjoaa tilanteen mukaan:\n\n🎤 Mikrofoninäkymän sävelkorkeusnäytöllä\n🎮 Kaukosäätimen työpöydälle\n🎵 Kappaleselaimen + jono-pyynnöt\n💬 Chatin\n🪞 Ruudun live-peilauksen',
          details: 'Roolit tarkemmin:\n• Mikrofoni: puhelin mittaa sävelkorkeuden ja lähettää sen livenä — työpöytä näyttää nuotit kuin "oikealta" mikrofonilta. Toimii kaikissa tiloissa (myös kaksinkamppailussa: kaksi puhelinta!).\n• Kaukosäädin: ruudut, painikkeet ja vahvistukset puhelimesta — loistava isännälle, joka liikkuu huoneessa.\n• Kappaleselain: koko kirjasto puhelimessa — myös esikuuntelu ja jono-pyynnöt 📱-merkeillä työpöydällä.\n• Chat: viestejä työpöydälle ja muille vieraille.\n• Peilaus: työpöydän ruutu (peli, tulokset) peilautuu puhelimeen — vieraat näkevät kaiken omilta paikoiltaan.',
        },
        chatRole: {
          title: 'Chat työpöydällä',
          body: 'Vieraiden sovelluksen chattiin kirjoittama päätyy työpöydän chattiin (chat-painike valikkopalkissa) — ja takaisin. Sitä varten on oma chat-kierros.',
        },
        queueRole: {
          title: 'Pyynnöt jonossa',
          body: 'Vieraat lisäävät kappaleita jonoon puhelimistaan — ne näkyvät työpöydällä jonossa 📱-merkillä. Myös siihen on oma kierros.',
        },
        singAlong: {
          title: 'Mukalaulutilat 🎶',
          body: 'Juhlatiloissa Companion-mukalaulu ja Mikrofonin vaihto: vieraat laulavat suoraan puhelimiinsa — sävelkorkeuden tunnistus toimii laitteessa, työpöytä johtaa orkesteria.',
          details: 'Companion-mukalaulu: jokainen vieras saa sanoitukset ja sävelkorkeusnäytön puhelimeensa — työpöytä näyttää yhteisen nuottiraidan.\n\nMikrofonin vaihto: mikrofoni kiertää — jopa sekaisin puhelimen ja fyysisen mikrofonin kesken.\n\nMolemmissa: mitä parempi WiFi, sitä sulavampi sävelkorkeus. Jos tökkii, auttaa kone, joka on lähempänä reititintä.',
        },
        deviceList: {
          title: 'Laitelista',
          body: 'Takaisin Mobiili-välilehdelle: näet kaikkien yhdistettyjen laitteiden yhteyden keston, roolin, määritetyn profiilin ja viimeisimmän toiminnan — mukana myös potkaisupainike.',
          details: 'Laitekortti näyttää:\n• Yhteyden keston ("12 min")\n• Mitä laite tekee (mikrofoni aktiivisena, kaukosäädin …)\n• Haltuunotetun profiilin — pudotusvalikko määrittää toisen\n• Potkaisu: katkaisee laitteen yhteyden (se voi yhdistää uudelleen heti)\n\nVinkki: anna profiileille puhuvat nimet — lista pysyy selkeänä, vaikka vieraita on paljon.',
        },
        profileClaim: {
          title: 'Profiilin haltuunotto',
          body: 'Jokainen laite voi ottaa profiilin haltuunsa: vieras laulaa sitten omalla nimellään ja omalla XP:llään — profiilinäkymä näyttää haltuunoton 📱-merkillä.',
          details: 'Tavat ottaa haltuun:\n1. Skannaa profiilin QR-koodi profiilin asetuksista (suorin tapa)\n2. Sovelluksessa yhdistämisen jälkeen: valitse listasta\n3. Täältä laitelistasta pudotusvalikosta\n\nYksityiskohdat myös profiili-kierroksessa.',
        },
        microphoneFallback: {
          title: 'Puhelin mikrofoniasennuksen sijaan',
          body: 'Kun kaikki laulavat puhelimella, voit ohittaa mikrofoni-välilehden kokonaan — sovellus säätää herkkyyden itse. Fyysiset mikrofonit määritetään mikrofoni-välilehdellä kuten näytetty.',
        },
        finish: {
          title: 'Yhdistetty! 🔗',
          body: 'Tiedät nyt, miten puhelimet kytketään ja mitä ne osaavat.\n\nSeuraava askel: avaa osoite omassa puhelimessasi ja tee ensimmäinen koe — mikrofonitila tekee suurimman vaikutuksen.',
        },
      },
    },

    // ═══ Achievements tour (R29) ═══
    achievements: {
      title: 'Saavutukset & edistyminen',
      desc: 'Saavutukset, XP-tasot, harvinaisuudet ja päivittäishaasteet.',
      chapters: {
        overview: 'Yleiskuva',
        unlock: 'Saavutusten avaaminen',
        daily: 'Päivittäishaasteet',
      },
      steps: {
        welcome: {
          title: 'Saavutukset & edistyminen 🏆',
          body: 'Kaikki keräämäsi: saavutukset harvinaisuuksineen, XP-tasot arvonimineen ja päivittäishaasteet XP-moottorina.\n\nTämä kierros kulkee saavutusruudun ja haasteiden läpi.',
          details: 'Kolme järjestelmää yhdessä:\n• XP: "polttoaine" — kappaleista, haasteista ja saavutuksista\n• Tasot & rankingit: nousevat XP:n myötä (aloittelija → legenda) ja näyttävät edistymisen silmäyksellä\n• Saavutukset: virstanpylväitä palkinnoineen — osa salaisia, kunnes avaat ne\n\nKaikki ripustuu profiiliin — kuka laulaa, se kerää (katso profiili-kierros).',
        },
        navButton: {
          title: 'Saavutuspainike',
          body: 'Valikkopalkissa pokaali vie saavutuksiin — sen vieressä oleva toinen pokaalipylväs näyttää tulostaulut.',
        },
        playerSelector: {
          title: 'Pelaajan valinta',
          body: 'Ylhäältä valitset, kenen saavutuksia katsot — kätevää kokoelman kerskailuun. Profiilin numero näyttää avattujen määrän.',
        },
        stats: {
          title: 'Tilastokortit',
          body: 'Neljä korttia silmäyksellä: avatut saavutukset, niistä ansaittu XP, täydellisyys prosentteina ja nykyinen taso arvonimineen.',
          details: 'Prosenttikortti laskee: avatut ÷ kaikki saavutukset. 100 % on keräilijän kynnys — siitä saa yleensä oman salaisen saavutuksen.\n\nTasokortti näyttää lisäksi arvonimen ("Nouseva tähti", "Karaokelegenda" …) — nimet tulevat profiilin etenemisjärjestelmästä.',
        },
        filters: {
          title: 'Suodattimet',
          body: 'Vasemmalla tilasuodattimet (kaikki / avatut / lukitut). Oikealla kategoriat: suoritus, edistyminen, sosiaalinen ja erityinen.',
          details: 'Kategorioiden merkitys:\n• Suoritus: laulusaavutukset (combot, kultaiset nuotit, täydelliset kierrokset)\n• Edistyminen: kokoamisen virstanpylväät (pelatut kappaleet, XP-määrät, tasot)\n• Sosiaalinen: juhla- ja moninpelitoimet (kaksinkamppailut, companion-kierrokset)\n• Erityinen: salaisuudet ja kuriositeetit — kuvaus paljastuu vasta avaamisen yhteydessä\n\nYhdisteltävissä: "Lukittu + Erityinen" näyttää, mitä sinua vielä odottaa.',
        },
        grid: {
          title: 'Saavutuskortit',
          body: 'Jokaisessa kortissa: kuvake, nimi, kuvaus, harvinaisuus ja XP-palkinto. Avoimet hohtavat kultaisina päivämäärän kera — lukitut pysyvät harmaina.',
          details: 'Harvinaisuudet (värikoodattuina):\n• Yleinen — tulee luonnostaan säännöllisellä pelaamisella\n• Harvinainen — vaatii tietoista toimintaa\n• Eeppinen — ahkeruutta tai onnen sattumia\n• Legendaarinen — harvoille\n\nAvaaminen tapahtuu automaattisesti, kun ehto täyttyy — ilmoitus tulee samalla. XP laskeutuu profiiliin heti.',
        },
        xpSystem: {
          title: 'Miten XP virtaa',
          body: 'XP tulee kolmesta lähteestä: lauletut kappaleet (vaikeustason mukaan), haasteet (päivittäiset/viikoittaiset) ja saavutukset. Tasot avaavat rankingit — ja joitakin ominaisuuksia, kuten profiilimerkit.',
          details: 'XP-lähteet silmäyksellä:\n• Suoritettu kappale: perus-XP vaikeustason mukaan (helppo → ekspertti, nousevasti)\n• Päivittäispaikka: 100–400 XP + bonukset\n• Viikkopaikka: 500–2000 XP\n• Saavutus: kertaluontoinen per saavutus (25–1000 XP harvinaisuuden mukaan)\n\nProfiilinäkymän tasopalkki näyttää tien seuraavalle tasolle; ranking vaihtuu muutaman tason välein.',
        },
        navDaily: {
          title: 'Haasteisiin',
          body: 'Päivittäishaasteilla on oma ruutunsa — valikkopalkin tähtipainike vie sinne. Navigoin nyt sinne.',
        },
        playerSelection: {
          title: 'Vaihe 1: valitse pelaajat',
          body: 'Ohjattu kulku: valitse ensin, ketkä pelaavat — vasta sen jälkeen tehtävät ilmestyvät. Useampi pelaaja on mahdollinen; tilastot kuuluvat ensimmäiselle.',
          details: 'Miksi valinta ensin? Paikat ja tilastot ovat profiilikohtaisia — ilman valittua pelaajaa ei olisi mitään laskettavaa.\n\nKortti näyttää kaikki aktiiviset profiilit; valinta tapahtuu klikkaamalla. Sen jälkeen aukeavat vaihe 2 (tehtävät) ja vaihe 3 (pelaaminen).',
        },
        slots: {
          title: 'Vaihe 2: 5 paikkaa',
          body: 'Viisi tehtäväpaikkaa päivässä, aukeavat järjestyksessä. Jokainen paikka näyttää tehtävän, pelattavat vaikeustasot ja XP-arvon — vaikeammat tasot moninkertaistavat.',
          details: 'Paikkamekaniikka:\n• Paikat 2–5 aukeavat vasta, kun edellinen on suoritettu tai ohitettu — ketju pakottaa vaihteluun.\n• Jokainen tehtävä on ehto seuraavalle kappaleelle ("genre rock", "vähintään 80 % tarkkuus" …) — kirjasto suodattaa sopivat kappaleet automaattisesti.\n• Vaikeustason valinta per paikka: jopa 3× XP-kerroin eksperttitasolla.\n\nKeskiyöllä putoaa viisi tuoretta tehtävää — ketju alkaa alusta.',
        },
        badges: {
          title: 'Merkit & viikko',
          body: 'Useamman paikan suorittaminen tuo päivittäisiä merkkejä (pronssi/hopea/kulta) lisä-XP:llä. Viikoittainen vastine kulkee 7 päivää suurilla palkinnoilla — sama mekaniikka, isompi potti.',
          details: 'Merkkitasot per päivä:\n• Pronssi: 2 paikkaa\n• Hopea: 3–4 paikkaa\n• Kulta: kaikki 5 paikkaa — plus päivittäinen bonus-XP\n\nViikoittain: 5 paikkaa 7 päivän aikana, 500–2000 XP per paikka, nollaus maanantaisin. Päivittäisen JA viikoittaisen pelaaminen nostaa tasoa selvästi nopeammin kuin pelkät kappaleet.',
        },
        challengeModes: {
          title: 'Haastetilat',
          body: 'Paikkojen lisäksi on vapaita haastetiloja muokkaimineen (esim. "2× tempo", "ei nuotteja") — omiin sääntöihin ja lisä-XP:hen päivittäistehtävien ulkopuolella.',
          details: 'Tilat ovat vapaasti säädettävissä: valitse tila, yhdistä muokkaimia, XP-potti kasvaa vaikeuden myötä.\n\nSuoritukset avaavat uusia muokkaimia — haastealueen kokoelmakortti näyttää, mitä sinulla on.',
        },
        finish: {
          title: 'Keräilyaika! 🏅',
          body: 'Tunnet nyt saavutukset, XP:n ja haasteet — edistymisen kolme moottoria.\n\nAloitusvinkki: pelaa tänään 2 päivittäispaikkaa — loput tulevat itsestään.',
        },
      },
    },
  },
};
