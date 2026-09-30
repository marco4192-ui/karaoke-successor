// IT translations — tutorial
// Basato sul file inglese (src/lib/i18n/locales/en/tutorial.ts): testi dei tour
// guidati (basics + editor + impostazioni + R29: profili, coda, chat, companion,
// obiettivi). Ogni passo può avere un testo `details` opzionale — il pulsante
// "Scopri di più" nel tooltip espande l'approfondimento (prima il corpo breve,
// i dettagli a richiesta).
export const tutorialTranslations = {
  tutorial: {
    // ? menu di aiuto
    helpButtonTitle: 'Aiuto e tour',
    helpDialogTitle: 'Aiuto e tour',
    helpDialogDesc: 'Rivedi i tour completi — oppure salta direttamente a un argomento e fatti spiegare solo quella parte.',
    helpFooter: 'Tasti del tour: → avanti · ← indietro · Esc esci',
    startFullTour: 'Tour completo',
    stepsCount: '{n} passi',
    completedBadge: 'Completato',
    // Gruppi di tour nel menu di aiuto (R29: 8 tour vogliono ordine)
    groupGettingStarted: 'Primi passi',
    groupAreas: 'Aree e funzioni',
    groupAdvanced: 'Per esperti',
    // Controlli dell'overlay
    ariaLabel: 'Tour guidato',
    skipTour: 'Termina tour',
    back: 'Indietro',
    next: 'Avanti',
    finish: 'Fatto',
    clickHint: 'Cliccalo ora',
    // Espansione "Scopri di più" (R29)
    moreDetails: 'Scopri di più',
    lessDetails: 'Mostra meno',
    // Offerta al primo avvio
    offerTitle: 'Benvenuto in Karaoke ZERO!',
    offerBody: 'Vuoi una rapida panoramica delle basi? In 2 minuti conoscerai le sfide giornaliere, le modalità di canto, la libreria e i giochi di festa.',
    offerStart: 'Avvia il tour',
    offerLater: 'Forse più tardi',
    offerHint: 'Disponibile in ogni momento tramite l\'icona ? nella barra dei menu.',

    // ═══ Tour basi ═══
    basic: {
      title: 'Le basi',
      desc: 'Il giro completo: sfide, modalità di canto, libreria, festa e altro.',
      chapters: {
        welcome: 'Benvenuto',
        challenges: 'Giornaliere e settimanali',
        singing: 'Inizia a cantare',
        party: 'Modalità festa',
        more: 'Altre aree',
      },
      steps: {
        welcome: {
          title: 'Benvenuto! 👋',
          body: 'Questo è un tour dal vivo: evidenzio i punti importanti e te li spiego.\n\nComandi: "Avanti" (o tasto →), "Indietro" (←) e "Termina tour" (Esc). Si parte!',
          details: 'Puoi interrompere il tour in qualsiasi momento e riprenderlo più tardi: l\'icona ? nella barra dei menu apre il menu di aiuto con tutti i tour — riproducibili anche capitolo per capitolo.\n\nMolti passi hanno un pulsante "Scopri di più" qui sotto: espande i dettagli extra senza perdere il testo breve.',
        },
        heroButtons: {
          title: 'Avvio rapido',
          body: '"Inizia a Cantare" ti porta dritto alla libreria. "Modalità Festa" apre i 9 giochi di festa per i gruppi.',
          details: 'Le schede di avvio rapido sono scorciatoie per i percorsi più comuni:\n• "Inizia a Cantare" = apri la libreria, scegli una canzone e via (da soli, in duello o in duetto).\n• "Modalità Festa" = la raccolta di giochi per un massimo di 32 giocatori, con i telefoni che possono entrare come microfoni.\n\nTutto ciò che vedi qui è raggiungibile anche dalla barra dei menu — le schede servono solo a risparmiare clic.',
        },
        dailyCard: {
          title: 'Sfida giornaliera',
          body: '5 slot al giorno con compiti che ruotano — più slot completi, più cresce il tuo bonus XP. Compiti nuovi a mezzanotte.',
          details: 'Come funziona il sistema:\n• Ognuno dei 5 slot contiene un tipo di compito diverso (es. "canta una canzone degli anni 80", "raggiungi 8000 punti").\n• Gli slot si sbloccano in sequenza — lo slot 2 solo dopo aver completato lo slot 1.\n• Ogni slot si gioca a diverse difficoltà; quelle più alte danno più XP (fino a un moltiplicatore 3×).\n• Il bonus cresce col numero di slot completati: 5/5 vale il bonus giornaliero pieno.\n\nI compiti attingono dalla TUA libreria — la selezione si adatta sempre alle tue canzoni.',
        },
        weeklyCard: {
          title: 'Sfida settimanale',
          body: 'La controparte settimanale: 5 slot distribuiti su tutta la settimana con ricompense XP più ricche. Perfetta per gli obiettivi a lungo termine.',
          details: 'Le sfide settimanali funzionano come quelle giornaliere, ma:\n• I 5 slot durano 7 giorni — nessun reset giornaliero, procedi con i tuoi tempi.\n• Le ricompense XP per slot sono più ricche: 250–500 XP base invece di 100–200 delle giornaliere — e il moltiplicatore di difficoltà (fino a 3×) si applica sopra.\n• Il reset arriva il lunedì mattina.\n\nConsiglio: giornaliere e settimanali vanno in parallelo — giocare entrambe è il modo più rapido di salire di livello.',
        },
        modeLauncher: {
          title: 'Cantare: Singolo, Duello e Duetto',
          body: '🎤 Singolo: un giocatore, un microfono.\n⚔️ Duello: due giocatori sulla STESSA canzone — vince chi fa più punti.\n🎭 Duetto: due voci su due tracce — la libreria mostra automaticamente solo le canzoni adatte al duetto.',
          details: 'Le tre modalità nel dettaglio:\n• Singolo: karaoke classico — canti tutte le note e il tuo punteggio entra in classifica.\n• Duello: entrambi i giocatori cantano la stessa traccia di note contemporaneamente. I punti corrono separati — il confronto finale svela chi è stato migliore. Perfetto per le rivincite.\n• Duetto: la canzone ha due voci separate (P1/P2) — ognuno canta "le sue" parti, le frasi condivise valgono un bonus di squadra. Le canzoni per duetti si riconoscono dal filtro 🎭 nella libreria.\n\nMicrofoni: fino a 4 microfoni fisici più gli smartphone come ingressi aggiuntivi (vedi Impostazioni → Microfono).',
        },
        libraryNav: {
          title: 'La libreria',
          body: 'Tutte le tue canzoni stanno qui. Cerca per titolo o artista — la ricerca fuzzy perdona anche gli errori di battitura.',
          details: 'Consigli per la ricerca:\n• La ricerca fuzzy trova "Dancing Qun" → "Dancing Queen". Ignora maiuscole/minuscole e i refusi singoli.\n• Cerca titolo, artista E genere in un colpo solo — "Rock" trova anche le canzoni di genere Rock.\n\nL\'ordinamento si imposta dal menu a tendina (titolo A–Z, artista, aggiunte di recente). Le canzoni entrano in libreria tramite importazione, scansione cartelle o playlist — tutto si gestisce nella scheda Libreria delle impostazioni.',
        },
        filters: {
          title: 'Filtri',
          body: 'Genere, lingua, anno, decennio, duetti e hit virali — taglia la libreria come preferisci.',
          details: 'Tutti i filtri si combinano — es. "Genere: Rock + Lingua: Inglese + Epoca: anni 80" mostra esattamente i rock inglesi degli ottanta.\n\nFiltri speciali:\n• Duetto: solo canzoni con due tracce vocali.\n• Hit virali: le canzoni presenti nelle classifiche virali del momento (configurate in Impostazioni → Libreria).\n• Generi e lingue personalizzati: crea le tue categorie in Impostazioni → Generi & Lingue — compaiono subito in questi filtri.\n\n"Cancella filtri" (✕) azzera tutto in un colpo solo.',
        },
        songCard: {
          title: 'Le canzoni',
          body: 'Un clic su una scheda canzone apre la finestra di avvio: modalità, giocatori, microfoni e difficoltà.',
          details: 'Ogni scheda canzone mostra:\n• Copertina con titolo e artista\n• Difficoltà (facile/medio/difficile/esperto) e stelle\n• I metadati chiave come genere e lingua — presi dalla canzone o armonizzati via AI (Editor → Metadata Studio).\n\nL\'icona di anteprima avvia un breve assaggio senza aprire la finestra di avvio.',
        },
        startModal: {
          title: 'La finestra di avvio',
          body: 'Imposta tutto qui: modalità (singolo/duello/duetto), chi canta, che microfono riceve ciascuno e la difficoltà.\n\nPoi premi "Inizia" — e si parte!',
          details: 'Le opzioni chiave:\n• Modalità: singolo, duello (2 giocatori, stessa traccia) o duetto (2 voci) — nel duetto entrambi i giocatori scelgono la propria voce (P1/P2).\n• Microfoni: ogni giocatore può avere il proprio dispositivo di ingresso — oppure uno smartphone come microfono (app companion).\n• Difficoltà: influisce sul punteggio — le difficoltà alte perdonano meno e premiano la precisione (più punti potenziali, più XP).\n• "Aggiungi alla Coda" invece di "Inizia": mette la canzone in coda invece di avviarla subito — l\'ideale quando in tanti vogliono cantare.',
        },
        partyCard: {
          title: 'Modalità festa',
          body: '9 giochi per un massimo di 32 giocatori: Battle Royale, Passa il Microfono, Concorso Medley, torneo, Parole Mancanti, Karaoke Cieco e altro — i telefoni possono entrare come microfoni.',
          details: 'Le 9 modalità in sintesi:\n• Battle Royale: cantano tutti, il più debole viene eliminato a ogni round — vince l\'ultimo in piedi.\n• Passa il Microfono: il microfono passa di mano in mano — ognuno canta la sua parte.\n• Concorso Medley: le squadre si esibiscono su brevi frammenti di canzoni con regole speciali.\n• Torneo: tabellone a eliminazione con duelli — il vincitore sale a ogni round.\n• Parole Mancanti: il testo viene oscurato — canta la parola mancante per fare punti.\n• Karaoke Cieco: la pista di note si oscura a tratti — solo orecchio!\n• Valuta la mia Canzone e Companion Sing-A-Long, e altre ancora — ogni scheda modalità si spiega da sola.\n\nQuasi tutte le modalità supportano l\'app companion come microfono e controller.',
        },
        partyModes: {
          title: 'La scelta della modalità',
          body: 'È qui che si sceglie la modalità festa: Battle Royale (l\'ultimo in piedi vince), Passa il Microfono, torneo (tabellone), medley e altro.\n\nOgni scheda dice cosa aspettarsi — un clic apre la selezione dei giocatori.',
          details: 'Dopo il clic su una scheda segue la selezione dei giocatori: scegli i profili (o collega i dispositivi companion), poi imposta la dimensione delle squadre, il numero di round o i limiti di tempo in base alla modalità.\n\nConsiglio per le feste a tema: con un tema attivo nelle impostazioni (es. "Festa Anni 80"), ogni selezione di canzoni nella modalità festa attinge automaticamente solo dai brani coerenti — la festa resta in tema.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke senza competizione: crea playlist, metti canzoni in coda, condividi i preferiti. L\'intrattenitore perfetto per la serata.',
          details: 'Il jukebox è la modalità rilassata:\n• Scegli playlist o singole canzoni come serbatoio.\n• Intermezzi video opzionali, così l\'atmosfera non si spezza mai.\n• Nessun punteggio, nessun microfono richiesto — le canzoni scorrono semplicemente col testo.\n\nPerfetto come intrattenimento per tutta la notte o per scaldarsi prima del primo round.',
        },
        jukeboxView: {
          title: 'Dentro il jukebox',
          body: '"Sfoglia playlist" dà accesso diretto a tutte le playlist salvate — incluse quelle create in libreria. Un clic mette in coda l\'intera playlist.',
          details: 'Le impostazioni playlist del jukebox offrono:\n• Se mostrare i video (se le canzoni ne hanno)\n• Intermezzi video: video di pausa tra le canzoni, es. per gli annunci\n• Se mescolare il serbatoio o seguirne l\'ordine fisso\n\nParte a schermo intero — esci con Esc o col pulsante di stop in alto.',
        },
        highscoreCard: {
          title: 'Punteggi',
          body: 'Punteggi per canzone e difficoltà — batti gli amici (o te stesso).',
          details: 'Le classifiche ricordano, per canzone e difficoltà:\n• Punteggio, precisione, note dorate e data\n• Chi ha ottenuto il risultato (avatar del profilo)\n• Se la voce arriva dall\'app companion (icona telefono) o dal desktop\n\nCon la modalità online attiva (schermata profili) vedi anche le classifiche globali e gareggi con i giocatori di altre installazioni.',
        },
        highscoreView: {
          title: 'Le classifiche',
          body: 'Filtrate per canzone e difficoltà — con la barra dei filtri in alto. Le icone telefono segnalano l\'uso dell\'app companion.',
          details: 'La barra dei filtri in alto permette:\n• Di cercare per canzone o giocatore\n• Di filtrare per difficoltà\n• Di passare da locale a globale (con l\'online attivo)\n\nAnti-cheat: ogni voce porta un\'impronta della canzone — i risultati manipolati vengono riconosciuti e segnalati.',
        },
        settingsCard: {
          title: 'Impostazioni',
          body: 'Microfoni, lingua, messa a punto del gioco, aspetto e grafica — tutti i comandi stanno qui.',
          details: 'Le 12 schede delle impostazioni in un lampo:\n• Generale: lingua, difficoltà predefinita, online\n• Gioco: punteggio, particelle, combo, registrazione dei replay\n• Aspetto: temi, stile del testo, sfondo\n• Audio: dispositivo di uscita, volume, loudness, qualità YouTube\n• Microfono: dispositivi, sensibilità, noise gate, preset\n• Mobile: collega e gestisci i dispositivi companion\n• Webcam: la webcam come sfondo\n• Libreria: cartella canzoni, importazione, classifiche virali, ripristino\n• Generi & Lingue: categorie personalizzate\n• Festa a Tema: attiva e configura il tema\n• Sync & Backup: le tue sicurezze\n• Informazioni: versione, piattaforma, licenze\n\nNel menu di aiuto ? c\'è un tour dedicato e approfondito che attraversa tutte le schede.',
        },
        settingsView: {
          title: 'Le schede delle impostazioni',
          body: 'Scegli una sezione in alto: Generale (lingua), Gioco, Aspetto, Audio, Microfono, Mobile (connessione telefoni) e altro.',
          details: 'In cima a ogni scheda c\'è una breve introduzione che spiega cosa fa — non dovrai mai indovinare a cosa serve un\'opzione.\n\nIl tour giusto: "Impostazioni" nel menu di aiuto ? ti accompagna attraverso tutte le schede.',
        },
        finish: {
          title: 'Fatto! 🎉',
          body: 'Ora conosci le basi.\n\nConsiglio: l\'icona ? nella barra dei menu ti riporta qui quando vuoi — inclusi i singoli capitoli per argomento, il tour dell\'editor e quello delle impostazioni.',
          details: 'E adesso? Qualche idea per i primi minuti:\n1. Crea un profilo (Profili nella barra dei menu) — senza giochi lo stesso, ma XP e obiettivi si raccolgono solo sui profili.\n2. Importa canzoni (Impostazioni → Libreria).\n3. Un paio di round di sfide giornaliere per il boost di XP.\n4. Arrivano amici? Prova la modalità festa — l\'app companion trasforma ogni telefono in un microfono (c\'è un tour dedicato al companion).',
        },
      },
    },

    // ═══ Tour editor ═══
    editor: {
      title: 'Tour dell\'editor',
      desc: 'Note, testi, voci e armonizzazione — la cassetta degli attrezzi per le canzoni.',
      chapters: {
        entry: 'Per entrare',
        layout: 'Layout',
        notes: 'Modificare le note',
        extras: 'Extra e armonizzazione',
      },
      steps: {
        welcome: {
          title: 'L\'editor ✏️',
          body: 'È qui che le canzoni diventano tracce karaoke giocabili: piazza le note, temporizza i testi, assegna le voci.\n\nConsiglio da sandbox: esercitati su una canzone di prova — le modifiche si annullano con Ctrl+Z.',
          details: 'L\'editor lavora col formato UltraStar: ogni nota ha un istante di inizio, una durata, un tono e un testo (la sillaba). Molte note insieme formano la pista di note che vedi nel gioco.\n\nLe fonti per nuove canzoni:\n• Importazione da testo (UltraStar/TXT) nell\'editor\n• Importazione MIDI (note generate dal MIDI)\n• Armonizzazione AI: testo + audio → suggerimenti di note\n\nTutto è non distruttivo: finché non salvi, la canzone originale resta intatta.',
        },
        songList: {
          title: 'Scegliere la canzone',
          body: 'Cerca una canzone per aprirla. I filtri rivelano le canzoni con metadati mancanti — quelle che l\'editor armonizza più avanti.',
          details: 'Le chip di filtro sopra l\'elenco mostrano le canzoni senza genere/lingua/anno — la via più rapida alle canzoni non ancora passate dal Metadata Studio.\n\nLa ricerca copre titolo e artista — le maiuscole non contano.',
        },
        noSongs: {
          title: 'Ancora nessuna canzone',
          body: 'L\'editor ha bisogno di canzoni in libreria. Importa prima qualche canzone dalla cartella canzoni (Impostazioni → Libreria) e poi torna qui.',
          details: 'Come procurarti le canzoni:\n• Impostazioni → Libreria → imposta la cartella canzoni: ogni sottocartella viene letta come una canzone (audio/video + testo UltraStar).\n• Oppure crea una canzone nuova nell\'editor ("Nuova Canzone") e unisci da solo testo e audio.',
        },
        openSong: {
          title: 'Aprire una canzone',
          body: 'Clicca ora una canzone nell\'elenco per aprirla nell\'editor.',
          details: 'Una volta aperta, in alto trovi la barra degli strumenti (sotto l\'intestazione) e la timeline con forma d\'onda, corsie delle note e testo.\n\nLa canzone resta aperta finché non la chiudi con "Indietro" — le modifiche non salvate chiedono prima conferma.',
        },
        leftPanel: {
          title: 'Barra degli strumenti',
          body: 'Tutto per le note: aggiungere, duplicare, eliminare, dividere, unire — più tipi di nota, voci e modalità tap (tra poco).',
          details: 'Gli strumenti in ordine:\n• ➕ Aggiungi nota: cade in corrispondenza della testina di riproduzione\n• ⧉ Duplica: copia la nota selezionata subito dopo\n• 🗑 Elimina: rimuove la selezione\n• ✂ Dividi: una nota → due (a metà)\n• ⇄ Unisci: unisce la nota selezionata con la successiva\n\nSelezione con un clic; maiusc+clic per più note. Poi prende il comando la tastiera: ⌫ elimina, ↑/↓ trasporta, ←/→ sposta nel tempo.',
        },
        lyricsPanel: {
          title: 'Pannello del testo',
          body: 'Le righe del testo stanno a sinistra. Un doppio clic su una riga porta la riproduzione esattamente lì — testo e tempi si modificano qui.',
          details: 'Il pannello del testo è testo E tempi in uno:\n• Un clic su una sillaba seleziona la nota corrispondente nella timeline.\n• Il doppio clic salta al punto (la riproduzione segue).\n• Il clic destro (o l\'icona della penna) apre la modifica della riga: cambia il testo, dividi le sillabe ai confini di parola, sposta i tempi dell\'intera riga.\n\nLa divisione ai confini di parola usa il riconoscimento della lingua per distribuire le sillabe sulle parole in modo sensato — basta con i tagli manuali.',
        },
        subHeaderTools: {
          title: 'Modificare le note',
          body: 'Le note sono i blocchi sulle corsie del tono: aggiungere, duplicare, eliminare, dividere (una nota → due) e unire (con la nota successiva).\n\nModifica le note selezionate in fretta: ⌫ elimina, ↑/↓ trasporta.',
          details: 'Consigli di precisione:\n• Zoom: Ctrl+rotella del mouse sulla timeline — ingrandisci per i dettagli fini.\n• Riproduzione: Spazio attiva/disattiva play/pausa, Shift+Spazio riproduce solo la selezione.\n• Trasportare più note: selezionale tutte, ↑/↓ muove l\'intero gruppo.\n\nPer i tempi: l\'inizio della nota deve coincidere con l\'attacco della sillaba nella voce — la forma d\'onda aiuta a trovare gli attacchi.',
        },
        noteTypes: {
          title: 'Tipi di nota',
          body: '5 tipi per le nuove note:\n: Normale (il tono conta)\n* Dorata (punti extra)\nF Freestyle (vale qualsiasi nota)\nR Rap (solo il ritmo)\nG Rap dorata',
          details: 'Cosa significa ogni tipo nel gioco:\n• Normale (:): la classica nota cantata — contano tono e tempo.\n• Dorata (*): resa in oro, punti doppi quando la centri. Perfetta per i momenti forti della canzone.\n• Freestyle (F): il tono non conta, valgono solo testo e tempo — adatta alle parti parlate.\n• Rap (R): giudica ritmo e timing invece della melodia.\n• Rap dorata (G): come il rap, ma con punti extra.\n\nIl tipo si può cambiare in seguito: seleziona la nota e scegli un nuovo tipo nella barra degli strumenti.',
        },
        voices: {
          title: 'Voci',
          body: 'P1 = giocatore 1, P2 = giocatore 2 (duetto!), P4/P8 = terza/quarta voce. Ogni nota appartiene a una voce — è così che nascono le canzoni per duetti con parti separate.',
          details: 'Assegnazione delle voci:\n• Il menu a tendina delle voci decide la traccia su cui cadono le nuove note.\n• Le note già piazzate si spostano: selezionale e cambia voce.\n• In modalità duetto nel gioco, ogni giocatore sceglie la propria traccia — la libreria filtra automaticamente le canzoni con almeno 2 voci.\n\nCon P4/P8 si possono creare perfino quartetti; le modalità di gioco principali usano P1/P2.',
        },
        tapMode: {
          title: 'Modalità tap — il turbo 🥁',
          body: 'Attivala e segui il ritmo: ogni clic piazza una nota nella posizione attuale di riproduzione, riga di testo dopo riga di testo. Crea note in tempo reale.',
          details: 'Come funziona la registrazione a tap:\n1. Attiva la modalità tap nella barra degli strumenti.\n2. Avvia la riproduzione — la canzone scorre con l\'audio ben udibile.\n3. Clicca a ritmo delle sillabe — ogni clic piazza una nota sulla testina con l\'ultimo tono scelto.\n4. Poi rifinisci: correggi i toni (↑/↓ sulle note selezionate) e aggiusta le durate.\n\nLa modalità tap è 5–10 volte più veloce che piazzare le note a mano — canzoni intere in minuti invece che in ore.',
        },
        panels: {
          title: 'Pannelli in alto',
          body: 'Tre pannelli in alto a destra: metadati (genere/lingua/anno), analisi audio e assistente AI.',
          details: 'Cosa fanno i tre pannelli:\n• Metadati: modifica genere, lingua e anno della canzone aperta — alimenta filtri e festa a tema.\n• Analisi audio: analizza il file audio (loudness, tonalità, BPM) e suggerisce i valori.\n• Assistente AI: completamento dei testi, riconoscimento delle canzoni e armonizzazione delle note via AI — richiede un provider AI configurato (Impostazioni → AI).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'Il turbo dell\'armonizzazione: suggerimenti da AI e regole per genere, lingua e anno — con ascolto prima dell\'assegnazione, ritocco manuale e coda di revisione per i casi dubbi.',
          details: 'Il flusso dello studio:\n1. "Analizza tutte le canzoni" — il motore di regole (percorsi dei file, tag) ed eventualmente l\'AI suggeriscono genere/lingua/anno.\n2. I suggerimenti arrivano con un livello di fiducia: verde = sicuro, giallo = da rivedere.\n3. Ascolto: un clic sulla canzone riproduce un frammento — verifichi i suggerimenti al volo.\n4. Assegna singolarmente oppure "applica tutti i verdi".\n\nLa coda di revisione raccoglie i casi dubbi per dopo — non si perde nulla.',
        },
        shortcuts: {
          title: 'Scorciatoie',
          body: 'Tutte le scorciatoie da tastiera a colpo d\'occhio — l\'editor è uno strumento su tastiera. Dagli un\'occhiata!',
          details: 'Le scorciatoie più importanti:\n• Ctrl+Z / Ctrl+Y: annulla / ripeti\n• Spazio: play/pausa\n• ⌫: elimina le note selezionate\n• ↑/↓: trasporta (Shift = ottava intera) · ←/→: sposta nel tempo (Shift = passo più ampio)\n• M: unisci con la nota successiva\n• Ctrl+S: salva · Ctrl+C/V: copia/incolla le note\n\nIl pannello delle scorciatoie nella barra a sinistra mostra tutti i tasti a colpo d\'occhio.',
        },
        finish: {
          title: 'Pronto a costruire! 🛠️',
          body: 'Ora conosci la cassetta degli attrezzi dell\'editor.\n\nRicorda: Ctrl+Z sistema tutto, e l\'icona ? nella barra dei menu ti riporta a questi capitoli quando vuoi.',
          details: 'L\'ordine consigliato per una canzone nuova:\n1. Allega audio/video (scheda info canzone)\n2. Importa o digita il testo (scheda testo)\n3. Piazza le note a tap (modalità tap) o armonizza con l\'AI\n4. Completa i metadati (genere/lingua/anno — importanti per i filtri!)\n5. Salva — da questo momento la canzone compare in libreria.',
        },
      },
    },

    // ═══ Tour impostazioni (R28) ═══
    settings: {
      title: 'Impostazioni',
      desc: 'Tutte le impostazioni a colpo d\'occhio: schede, opzioni generali, audio, libreria, dispositivi companion e backup.',
      chapters: {
        overview: 'Panoramica',
        basics: 'Impostazioni di base',
        sound: 'Audio e Microfono',
        library: 'Libreria e Tema',
        devices: 'Dispositivi e Companion',
        data: 'Sync, Backup e Info',
      },
      steps: {
        welcome: {
          title: 'Le impostazioni 👋',
          body: 'Questo tour ti accompagna esclusivamente tra le impostazioni — scheda per scheda.\n\nPasso automaticamente a ogni scheda e ti spiego cosa ci trovi.',
          details: 'Le schede nell\'ordine del tour: Generale, Gioco, Aspetto, Audio, Microfono, Mobile (companion), Webcam, Libreria, Generi & Lingue, Festa a Tema, Sync & Backup e Informazioni.\n\nOgni scheda apre con una breve introduzione — questo tour la approfondisce passo per passo.',
        },
        tabBar: {
          title: 'La barra delle schede',
          body: 'Tutte le impostazioni sono organizzate in schede: Generale, Gioco, Aspetto, Audio, Microfono, Mobile, Webcam, Libreria, Generi & Lingue, Festa a Tema, Sync & Backup e Informazioni.\n\nIn cima a ogni scheda una breve introduzione spiega cosa fa.',
          details: 'Per orientarti — quando cerchi qualcosa, chiediti…\n• "Come si COMPORTA il gioco?" → Gioco\n• "Come APPARE?" → Aspetto\n• "Come SUONA?" → Audio / Microfono\n• "Collegare dispositivi?" → Mobile (companion) / Microfono\n• "Le mie canzoni?" → Libreria\n• "Salvare i dati?" → Sync & Backup\n\nSu finestre strette le schede scorrono in orizzontale — basta trascinare verso destra.',
        },
        general: {
          title: 'Generale',
          body: 'Lingua dell\'interfaccia, difficoltà predefinita, attività online e la panoramica completa delle scorciatoie da tastiera.',
          details: 'Lingua: disponibili 16 lingue. Il cambio si applica in diretta a tutta l\'interfaccia.\n\nDifficoltà predefinita: vale per i nuovi round, salvo diversa scelta nella finestra di avvio.\n\nLe attività online decidono se i punteggi vengono caricati in globale e se le sfide giornaliere si generano online.',
        },
        gameplay: {
          title: 'Gioco',
          body: 'Punteggio, effetti particellari, visualizzazione combo, registrazione dei replay, schermo intero automatico e altre opzioni di comportamento per round e risultati.',
          details: 'Gli interruttori chiave:\n• Punteggio: per cantare in puro divertimento, senza display del punteggio.\n• Particelle ed effetti: disattivali sulle macchine meno potenti.\n• Replay: registra audio e webcam mentre canti — il replay parte nella schermata dei risultati.\n• Schermo intero automatico: entra a schermo intero da solo quando inizia una canzone.\n• Segnali d\'avviso: brevi beep prima dei passaggi alla cieca e delle parole mancanti.\n\nIn più: visualizzazione combo e altro.',
        },
        appearance: {
          title: 'Aspetto',
          body: 'Temi, sfondo animato o un tuo video di sfondo, stile e dimensione del testo, visualizzazione delle note e la modalità prestazioni per le macchine meno potenti.',
          details: 'Stile del testo: 10 temi visivi — "Classico", "Concerto", "Retro", "Neon", "Minimalista" e altri.\n\nSfondo: oltre ai temi va bene anche un video personalizzato — nel gioco scorre dietro le note, oscurato.\n\nLa modalità prestazioni taglia animazioni e sfondi in modo drastico — ne vale la pena su hardware fino a circa il 2015.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Dispositivo di uscita (ASIO incluso), volume generale e di anteprima, sensibilità del microfono, normalizzazione del volume e qualità dei video YouTube.',
          details: 'ASIO: rilevante solo per Windows + schede audio che lo supportano — riduce la latenza per l\'ascolto del microfono.\n\nLa normalizzazione del volume livella le differenze tra le canzoni — i valori predefiniti sono già ben calibrati.\n\nQualità YouTube: riguarda le canzoni con sorgente video su YouTube; più qualità = più banda.',
        },
        microphone: {
          title: 'Microfono',
          body: 'Scelta del dispositivo, sensibilità, noise gate e livello in diretta — più i preset. Gli smartphone si collegano dalla scheda Mobile.',
          details: 'Preset: le configurazioni tipiche ("Ottimale", "Bassa Latenza", "Alta Precisione", "Ambiente Rumoroso", "Basso", "Soprano") impostano sensibilità e noise gate in combinazioni sensate.\n\nNoise gate: filtra respiri e rumori di stanza — il livello in diretta mostra in tempo reale cosa passa.\n\nImportante per il multigiocatore: OGNI giocatore può avere il PROPRIO dispositivo — l\'assegnazione si fa nella finestra di avvio, round per round.',
        },
        libraryTab: {
          title: 'Libreria',
          body: 'Imposta la cartella canzoni (ogni sottocartella = una canzone) e avvia la scansione, ripristina la libreria o elimina tutti i dati.',
          details: 'Formato delle cartelle: una sottocartella per canzone con audio/video + TXT (formato UltraStar). Lo scanner riconosce le combinazioni più diffuse (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nI formati di importazione di altri provider di karaoke non sono supportati per ora.\n\nAttenzione a "elimina tutti i dati": la doppia conferma chiede due volte — ma fai comunque prima un backup (scheda Sync & Backup).',
        },
        taxonomy: {
          title: 'Generi & Lingue',
          body: 'Crea le tue voci di genere e lingua — compaiono in tutti i menu a tendina e alimentano l\'armonizzazione AI.',
          details: 'Perché le voci personalizzate? Gli elenchi standard non coprono tutto ("Schlager", "K-Pop", "Dialetto"…). Le voci personalizzate:\n• compaiono subito nei filtri della libreria\n• si selezionano nell\'editor e nel Metadata Studio\n• partecipano all\'armonizzazione (l\'AI le suggerisce per le canzoni corrispondenti)\n\nAnche l\'eliminazione funziona — le canzoni conservano la voce finché non viene riassegnata.',
        },
        motto: {
          title: 'Festa a Tema',
          body: 'Metti tutto il gioco a tema (es. una festa anni 80): quando il tema è attivo sostituisce campi di ricerca e filtri — ogni selezione di canzoni attinge solo dai brani in tema.',
          details: 'Il filtro a tema conosce diversi campi, liberamente combinabili (logica AND):\n• Genere (es. rock)\n• Lingua (es. inglese)\n• Epoca/anno (es. 1980–1989)\n\nEffetto: libreria, selezione canzoni della festa E app companion mostrano solo il serbatoio a tema — gli ospiti non possono scegliere nulla fuori tema.\n\nDisattivando il tema tutto torna istantaneamente alla vista normale; canzoni suonate e punteggi restano intatti.',
        },
        mobile: {
          title: 'Mobile e Companion',
          body: 'Collega gli smartphone via QR code — come microfono, telecomando o dispositivo per cantare insieme. Vedi tutti i dispositivi connessi e i loro codici di connessione.',
          details: 'Connessione: scansiona il QR code (stesso Wi-Fi!) oppure digita l\'URL — il tour dedicato al companion spiega i dettagli nel menu di aiuto ?.\n\nQuesta scheda mostra anche:\n• Tutti i dispositivi connessi con lo stato (attivo, ruolo, ultima attività)\n• L\'assegnazione dei profili ai dispositivi\n• L\'espulsione dei singoli dispositivi\n\nI QR code per profilo (per far reclamare il profilo a un telefono) stanno nella scheda impostazioni della schermata profili.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Usa la webcam come sfondo animato della canzone: risoluzione, specchiatura, saturazione, sfocatura e altri effetti — con anteprima in diretta.',
          details: 'Lo sfondo webcam scorre dietro le note durante la canzone — vi guardate cantare!\n\nEffetti: specchiatura (come un selfie), saturazione, sfocatura morbida, seppia — tutto subito visibile nell\'anteprima in diretta.\n\nPrivacy: la fotocamera gira solo in locale, nulla viene salvato o inviato.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Crea e ripristina backup, sincronizza i dati tra i dispositivi. Nella versione desktop i dati dei giocatori vengono anche salvati in modo permanente nella cartella AppData.',
          details: 'Un backup contiene: profili (con XP e progressi), punteggi, impostazioni e definizioni delle playlist — in un unico file da archiviare o spostare.\n\nLa copia in AppData (versione desktop) protegge dalla perdita dei dati del browser: anche se la memoria del browser viene svuotata, la versione desktop ripristina tutto.\n\nIl ripristino sovrascrive i dati attuali — di nuovo: prima fai un backup.',
        },
        about: {
          title: 'Informazioni',
          body: 'Versione, piattaforma, licenze e progetti che contribuiscono — la carta d\'identità digitale di Karaoke ZERO.',
          details: 'Vedi anche il canale della build (web/desktop) e puoi cercare aggiornamenti. Le licenze elencano i progetti open source utilizzati — grazie a tutti i collaboratori!',
        },
        finish: {
          title: 'Tutto configurato! ⚙️',
          body: 'Ora conosci tutte le impostazioni.\n\nL\'icona ? nella barra dei menu ti riporta a questo tour quando vuoi — capitolo per capitolo, se preferisci.',
          details: 'Consigli per la prima serata di configurazione:\n1. Scheda Libreria: scansiona la cartella canzoni\n2. Scheda Microfono: scegli un preset e controlla il livello in diretta\n3. Scheda Mobile: collega i telefoni (c\'è il tour del companion!)\n4. Scheda Tema: pensa a un tema per la festa\n5. Sync & Backup: fai il primo backup\n\nCon questo, la serata karaoke va sui binari.',
        },
      },
    },

    // ═══ Tour profili (R29) ═══
    profile: {
      title: 'Profili e Personaggi',
      desc: 'Crea giocatori, monitora XP e progressi, sync online e reclamo del profilo dal telefono.',
      chapters: {
        overview: 'Panoramica',
        characters: 'Personaggi e progressi',
        online: 'Online e Companion',
      },
      steps: {
        welcome: {
          title: 'I tuoi profili giocatore 👤',
          body: 'I profili sono le identità del gioco: XP, livello, statistiche e obiettivi vivono sul profilo — e i punteggi portano il tuo nome.\n\nQuesto tour mostra come creare e gestire i profili.',
          details: 'Perché i profili?\n• XP e livello: canzoni cantate, sfide e obiettivi accumulano esperienza — il livello sale insieme al nome di rango (Principiante → Divino).\n• Classifiche: le voci di punteggio mostrano il tuo avatar.\n• Modalità festa: ogni selezione dei giocatori parte da questo elenco.\n• I dispositivi companion possono "reclamare" un profilo e cantare con la sua identità.\n\nI profili vivono nella memoria del browser (locali) o in un account online (con sync) — decidi tu alla creazione.',
        },
        topBar: {
          title: 'La barra delle azioni',
          body: 'Qui in alto attivi o disattivi le classifiche online, passi da locale a globale e apri il modulo per creare nuovi profili.',
          details: 'Gli elementi della barra:\n• Interruttore online: attiva/disattiva in globale le funzioni online (classifiche, registrazione account)\n• Locale/Globale: quale classifica mostra la vista punteggi\n• "Carica profilo": ti fa entrare con un codice di sync e scarica il tuo profilo online su questo dispositivo\n• "Nuovo profilo": apre il modulo di creazione (prossimo passo)',
        },
        createButton: {
          title: 'Creare un profilo',
          body: '"Nuovo profilo" apre il modulo: nome, immagine avatar, paese e modalità di salvataggio (locale o con account online).',
          details: 'I campi del modulo:\n• Nome: compare nelle classifiche e nelle feste\n• Avatar: carica una tua immagine oppure un\'iniziale su colore\n• Paese: la bandiera per le classifiche globali\n• Modalità di salvataggio: "Locale" salva solo su questo dispositivo; "Online" registra opzionalmente un account (email + password) e permette la sincronizzazione tra dispositivi.\n\nGli account online esistono solo con la modalità online attiva — la registrazione avviene in background e il profilo è subito utilizzabile.',
        },
        empty: {
          title: 'Ancora nessun profilo',
          body: 'È qui che i tuoi giocatori prendono forma. Clicca "Nuovo profilo" e crea il primo personaggio — tutto funziona anche senza, ma XP e obiettivi si raccolgono solo sui profili.',
        },
        cards: {
          title: 'Le schede personaggio',
          body: 'Ogni scheda mostra avatar, livello, rango e modalità di salvataggio. Un clic seleziona il profilo e ne mostra i dettagli qui sotto.\n\nIl puntino in alto a destra: verde = attivo, rosso = disattivato.',
          details: 'I simboli delle schede:\n• ✓ fumetto: il profilo attualmente attivo (la finestra di avvio se lo ricorda)\n• Icona di rango + "Lv. X": i progressi del profilo\n• Badge 💾/🌐: salvato in locale o online\n• Badge 📱: questo profilo è reclamato da un dispositivo companion\n• Bandiera: il paese scelto\n\nClic su una scheda = selezione. La disattivazione (rosso) si fa nella scheda progressi — i profili disattivati spariscono dalle selezioni ma conservano tutti i dati.',
        },
        progression: {
          title: 'La scheda dei progressi',
          body: 'Barra XP verso il livello successivo più le statistiche chiave: canzoni cantate, note dorate, miglior combo e punteggio totale.\n\nL\'interruttore a destra disattiva temporaneamente il profilo.',
          details: 'Come leggere le statistiche:\n• Canzoni suonate: conta ogni round terminato\n• Note dorate: raccolte per canzone — mostrano con quanta precisione centri i momenti forti\n• Miglior combo: la serie senza errori più lunga di sempre\n• Punteggio totale: la somma di tutti i punteggi\n\nL\'interruttore attivo: i profili disattivati spariscono dalla selezione giocatori e dalla coda (le canzoni duello/duetto chiedono allora una ri-selezione) ma non perdono NULLA — basta riattivarli.',
        },
        settingsCard: {
          title: 'Impostazioni del profilo',
          body: 'Modifica nome e avatar, cambia paese, opzioni sulla privacy — e il QR code del profilo, con cui un telefono può reclamarlo.',
          details: 'Privacy: decide quali statistiche sono visibili nelle classifiche globali.\n\nMostra QR code: genera un codice che punta DIRETTAMENTE a questo profilo — il telefono che lo scansiona si connette con questo profilo (l\'ideale: ogni cantante ha il proprio telefono col proprio profilo).\n\nL\'eliminazione rimuove il profilo per sempre — i punteggi restano come voci anonime. Per i profili online l\'app chiede una conferma ulteriore prima di eliminare.',
        },
        onlineToggle: {
          title: 'Classifiche online',
          body: 'L\'interruttore attiva le funzioni online: punteggi globali, registrazione di account e sync dei profili tra dispositivi.',
          details: 'Off = completamente offline: tutto resta in locale, nessuna richiesta di rete per le classifiche.\n\nOn = ottieni la scheda "Globale" nelle classifiche e puoi creare/caricare profili online.\n\nIl cambio ha effetto immediato — i punteggi locali già raccolti restano sempre.',
        },
        loginButton: {
          title: 'Caricare un profilo',
          body: 'Già registrato? "Carica profilo" porta il tuo profilo online su questo dispositivo via email o codice di sync — progressi e punteggi arrivano con lui.',
          details: 'La finestra di accesso prevede due vie:\n• Email + password (come alla registrazione)\n• Codice di sync: il codice breve del tuo profilo — più comodo su un computer non tuo\n\nDopo l\'accesso il profilo caricato si unisce a quello locale (vince il progresso più alto). Da lì in poi il sync gira automaticamente in background.',
        },
        companionClaim: {
          title: 'Reclamare un profilo 📱',
          body: 'Quando un telefono si connette con un profilo, la scheda mostra un 📱. Il telefono canta e sceglie con quel profilo — nome, XP e obiettivi si accumulano lì.',
          details: 'Come si "reclama" un profilo (3 vie):\n1. Scansiona il QR code nelle impostazioni del profilo — connessione DIRETTA con quel profilo\n2. Sul telefono, dopo la connessione, scegli un profilo dall\'elenco\n3. Qui nella scheda Mobile delle impostazioni: dispositivo → assegna profilo\n\nUn profilo può essere reclamato da UN solo dispositivo alla volta. Per disconnettere: scheda Mobile o direttamente dal telefono.',
        },
        finish: {
          title: 'Squadra al completo! 🎭',
          body: 'Ora sai come funzionano i profili — dall\'XP al sync online fino al reclamo da telefono.\n\nContinua con gli obiettivi: il tour "Obiettivi e Progressi" mostra tutto ciò che il tuo profilo può collezionare.',
        },
      },
    },

    // ═══ Tour coda (R29) ═══
    queue: {
      title: 'Coda',
      desc: 'Mettere canzoni in coda, riordinare, regole e richieste dal companion.',
      chapters: {
        overview: 'Panoramica',
        manage: 'Gestione',
        companion: 'Companion e scorciatoie',
      },
      steps: {
        welcome: {
          title: 'La coda 🎶',
          body: 'La coda organizza la serata karaoke: le canzoni si mettono in fila, tocca a tutti — e nessuno deve fare da babysitter al PC.\n\nQuesto tour copre messa in coda, ordinamento e regole.',
          details: 'Tre modi per mettere in coda:\n1. Libreria → clic su una canzone → nella finestra di avvio scegli "Aggiungi alla Coda" invece di "Inizia"\n2. Dopo una canzone: "Riproduci Prossima Canzone" nella schermata risultati mantiene il ritmo\n3. Dall\'app companion: gli ospiti mettono in coda dai loro telefoni (contrassegnate con il badge 📱)\n\nLa barra dei menu mostra la lunghezza della coda in un pulsante contatore — vedi arrivare tutta la serata.',
        },
        navButton: {
          title: 'Il pulsante della coda',
          body: 'Nella barra dei menu, "Coda" porta qui — il numero sul pulsante dice quante canzoni aspettano.',
        },
        title: {
          title: 'La coda delle canzoni',
          body: 'L\'elenco mostra tutte le canzoni in attesa con posizione, modalità (singolo/duello/duetto) e giocatori — in ordine di inserimento.',
        },
        empty: {
          title: 'Ancora vuota',
          body: 'Nessuna canzone in coda. Aggiungine qualcuna dalla libreria (finestra di avvio → "Aggiungi alla Coda") — o lascia che siano gli ospiti a metterle in coda dall\'app companion.',
        },
        list: {
          title: 'L\'elenco della coda',
          body: 'Ogni scheda: posizione, canzone, badge della modalità e giocatori. Un clic sulla scheda avvia subito la canzone — anche fuori turno.',
          details: 'I badge:\n• 🎤 Singolo / ⚔️ Duello / 🎭 Duetto — la modalità con cui la canzone è stata messa in coda\n• 📱 — aggiunta dall\'app companion\n\nClic su una scheda = riproduci ora. Il pulsante ✕ a destra rimuove la voce, ▶ la avvia.\n\nTastiera: Invio riproduce, Canc rimuove, ↑/↓ scorre l\'elenco.',
        },
        reorder: {
          title: 'Cambiare l\'ordine',
          body: 'Trascina le schede nella nuova posizione — si spostano solo le voci locali, le richieste companion mantengono il loro ordine.',
          details: 'Drag & drop: afferra una scheda e tirala su o giù tenendo premuto. L\'elenco mostra in diretta la posizione di destinazione.\n\nPerché le voci companion restano ferme: l\'app degli ospiti ordina per orario di invio — se l\'host potesse rimescolare, le richieste sembrerebbero manipolate. Rimuoverle resta comunque possibile.',
        },
        playNext: {
          title: 'Riproduci prossima canzone',
          body: 'Il pulsante avvia la prima voce in coda — la mossa standard tra un round e l\'altro. In alternativa, clicca direttamente una scheda qualsiasi.',
          details: 'La schermata risultati dopo ogni canzone offre lo stesso pulsante ("Riproduci Prossima Canzone") — il flusso continua senza passare dalla vista coda.\n\nIl pulsante "Riproduci Prossima Canzone" della vista coda fa lo stesso — la prima voce parte con un clic.',
        },
        clearAll: {
          title: 'Svuotare tutto',
          body: '"Cancella Tutto" svuota l\'intera coda — richieste companion incluse. Non c\'è modo di tornare indietro: usalo con cautela.',
        },
        rules: {
          title: 'Le regole',
          body: 'Il regolamento ufficiale sta in basso: massimo 3 canzoni per giocatore, ordine FIFO, le tue canzoni si rimuovono, prima scegli un personaggio…',
          details: 'Le regole nel dettaglio:\n• Massimo 3 canzoni per giocatore alla volta — nessuno può bloccare la coda. Chi ha cantato può rimettere in coda.\n• FIFO: primo arrivato, primo servito. Il drag & drop riordina in locale.\n• Le proprie canzoni si rimuovono sempre; le altre solo con "Cancella Tutto" o da host.\n• Prima il personaggio: per duello e duetto la coda richiede profili attivi, altrimenti chiede una ri-selezione all\'avvio.\n• Le richieste companion mostrano il badge 📱 e contano come le proprie.',
        },
        companionAdd: {
          title: 'Richieste dai telefoni 📱',
          body: 'Gli ospiti mettono in coda le canzoni dall\'app companion — compaiono con il badge 📱 nell\'elenco e contano per il loro limite di 3 canzoni.',
          details: 'Come funziona per gli ospiti: nell\'app scelgono una canzone, selezionano la modalità, inviano — la richiesta atterra in questo elenco.\n\nTu come host vedi subito: chi ha richiesto (l\'avatar del giocatore) e che si tratta di una richiesta da telefono (📱). Il limite di 3 vale per profilo — telefono incluso.\n\nApprofondimenti nel tour del companion.',
        },
        autoplay: {
          title: 'Scorciatoia & flusso',
          body: 'Ctrl+Q avvia la prima voce della coda da qualsiasi punto dell\'app — il classico quando il prossimo round deve partire subito.',
          details: 'Il flusso tra i round: canzone finita → schermata risultati → il pulsante "Riproduci Prossima Canzone" (o Ctrl+Q) mantiene la serata in movimento.\n\nCtrl+Q funziona da ovunque — senza passare dalla vista coda.',
        },
        finish: {
          title: 'La coda aspetta! 🎧',
          body: 'Ora conosci messa in coda, ordinamento e regole.\n\nConsiglio: unisci la scorciatoia Ctrl+Q e le richieste companion per una serata karaoke che gira da sola.',
        },
      },
    },

    // ═══ Tour chat (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Aprire il pannello, inviare messaggi, il selettore "Invia come" e le sfide a canzone.',
      chapters: {
        basics: 'Aprire la chat',
        usage: 'Inviare messaggi',
        challenges: 'Sfide',
      },
      steps: {
        welcome: {
          title: 'La chat di festa 💬',
          body: 'La chat collega desktop e app companion: si chiacchiera senza interrompere chi canta — e ci si può perfino sfidare a duelli di canto.\n\nTra un attimo ti apro il pannello.',
          details: 'Cosa sa fare la chat:\n• Messaggi di testo tra desktop (host) e tutti i telefoni connessi\n• Scelta del mittente: l\'host può scrivere a nome di un giocatore\n• Sfide a canzone: gli ospiti lanciano duelli — accetti sul desktop e si parte\n\nRequisito: perché i telefoni entrino nella conversazione servono dispositivi companion connessi (scheda Mobile delle impostazioni — vedi il tour del companion).',
        },
        navButton: {
          title: 'Aprire la chat',
          body: 'Il pulsante della chat nella barra dei menu apre il pannello — entra scorrendo come pannello laterale sopra lo schermo e si chiude con ✕ o con un clic fuori.',
        },
        panel: {
          title: 'Il pannello della chat',
          body: 'La cronologia scorre a sinistra, tu scrivi in basso. Il pannello resta aperto finché non lo chiudi — anche cambiando schermata.',
        },
        messages: {
          title: 'La cronologia',
          body: 'I tuoi messaggi compaiono a destra in ciano (come host), quelli dei telefoni a sinistra in viola. Ogni messaggio porta la propria ora.',
          details: 'Aggiornamento in background: il pannello recupera i nuovi messaggi ogni 3 secondi — non ti sfugge nulla nemmeno quando lavora in background.\n\nIl pulsante della chat nella barra dei menu resta al suo posto — i nuovi messaggi sono lì appena riapri il pannello.',
        },
        sendAs: {
          title: '"Invia come"',
          body: 'Tu sei l\'host — ma puoi scrivere a nome di un giocatore: il menu a tendina sceglie l\'identità. 🖥️ = host, 📱 = giocatore.',
          details: 'A che serve:\n• L\'host scrive per chi non ha il telefono ("Anna dice: ancora il ritornello!")\n• Annunci dal palco a nome del profilo moderatore\n\nIl puntino colorato accanto al menu mostra il colore del giocatore — la cronologia resta chiara su chi ha "parlato".',
        },
        input: {
          title: 'Scrivere un messaggio',
          body: 'Digita nel campo (massimo 200 caratteri) e premi Invio — oppure usa il pulsante di invio.',
        },
        send: {
          title: 'Inviare',
          body: 'Invia con Invio o col pulsante — il messaggio compare all\'istante nella cronologia e su ogni telefono connesso.',
        },
        songChallenges: {
          title: 'Sfide a canzone ⚔️',
          body: 'Gli ospiti possono lanciarti una sfida direttamente dall\'app: in chat compare una scheda di sfida — "Accetta sfida" fa partire il duello.',
          details: 'Come va la sfida:\n1. Un ospite sceglie una canzone nell\'app e tocca "Sfida"\n2. La scheda compare in chat con canzone, sfidante e pulsante di accettazione\n3. Accetti sul desktop — la finestra di avvio si apre col duello già preselezionato\n4. Si canta! Il vincitore si prende la gloria (e i punti)\n\nNota: "Invia come" deve puntare su un giocatore — l\'avversario dev\'essere riconoscibile.',
        },
        companionSide: {
          title: 'Sui telefoni',
          body: 'L\'app companion ha una sua scheda chat — è lì che scrivono gli ospiti. Ciò che vedi qui, loro lo vedono in tempo reale, e viceversa.',
        },
        finish: {
          title: 'Messaggio consegnato! 💌',
          body: 'Ora conosci la chat — dal pannello alle sfide a canzone.\n\nInsieme al tour del companion si capisce bene come telefoni e desktop lavorano insieme.',
        },
      },
    },

    // ═══ Tour companion (R29) ═══
    companion: {
      title: 'App Companion',
      desc: 'Collega gli smartphone: microfono, telecomando, richieste di canzoni e canto insieme.',
      chapters: {
        connect: 'Connessione',
        features: 'Cosa sa fare l\'app',
        control: 'Controllo remoto: Take Control',
        solo: 'Senza controllo',
        help: 'Aiuto del Companion',
        manage: 'Gestione dei dispositivi',
      },
      steps: {
        welcome: {
          title: 'I telefoni come accessori 📱',
          body: 'L\'app companion trasforma ogni smartphone in un accessorio karaoke: microfono, telecomando, selezione delle canzoni e chat — niente installazione, direttamente nel browser.\n\nQuesto tour copre il lato desktop del flusso.',
          details: 'Il principio: il desktop è l\'host (musica, note, punteggi) — i telefoni si connettono via Wi-Fi e diventano, a seconda delle necessità:\n• 🎤 Microfoni (col rilevamento del tono sul telefono!)\n• 🎮 Telecomandi (per guidare le schermate)\n• 🎵 Sfoglia canzoni con richieste in coda\n• 💬 Partecipanti alla chat\n• 🪞 Specchi in diretta dello schermo desktop\n\nNiente app store, niente account — scansioni il QR e sei dentro.',
        },
        mobileTab: {
          title: 'Aprire la scheda Mobile',
          body: 'La connessione parte da Impostazioni → Mobile. Ti ho appena aperto la scheda.',
        },
        qrCode: {
          title: 'Scansionare il QR code',
          body: 'Il grande codice a sinistra è la via diretta: apri la fotocamera del telefono, scansioni, l\'app si carica nel browser. Importante: telefono e PC sulla stessa rete Wi-Fi.',
          details: 'Il QR code contiene l\'indirizzo LAN del desktop (es. http://192.168.1.42:3000/mobile) — per questo i due dispositivi devono condividere la stessa rete.\n\nSe il codice non ne vuole sapere: l\'URL qui sotto si può digitare o copiare (pulsante). Nel Wi-Fi pubblico senza visibilità tra dispositivi la connessione purtroppo non riesce — usa un hotspot personale.',
        },
        connectionInfo: {
          title: 'URL e pulsante di copia',
          body: 'A destra trovi l\'indirizzo in formato testo — col pulsante di copia per condividerlo (es. via messenger ai tuoi ospiti). La riga verde conferma l\'IP di rete rilevato.',
          details: 'Consiglio pre-festa: manda l\'URL agli ospiti in anticipo — appena il desktop è acceso, tutti si collegano all\'istante.\n\nL\'avviso giallo compare quando non viene rilevato alcun IP LAN (es. solo localhost) — in quel caso può raggiungerti solo chi usa la stessa macchina.',
        },
        roles: {
          title: 'I ruoli dell\'app',
          body: 'Dopo la connessione l\'app offre, a seconda del contesto:\n\n🎤 Vista microfono col display del tono\n🎮 Telecomando del desktop\n🎵 Sfoglia canzoni + richieste in coda\n💬 Chat\n🪞 Specchio in diretta dello schermo',
          details: 'I ruoli nel dettaglio:\n• Microfono: il telefono misura il tono e lo trasmette in diretta — il desktop mostra le note come da un microfono "vero". Funziona in quasi tutte le modalità (anche duello: due telefoni!) — eccezione ad es. Passa il Microfono: lì tutti condividono lo stesso micro del desktop.\n• Telecomando: schermate, pulsanti e conferme dal telefono — ottimo per l\'host che gira per la stanza.\n• Sfoglia canzoni: tutta la libreria sul telefono — con anteprima e richieste in coda col badge 📱 sul desktop.\n• Chat: messaggi al desktop e agli altri ospiti.\n• Specchio: lo schermo desktop (gioco, risultati) viene riportato sul telefono — gli ospiti vedono tutto dai loro posti.',
        },
        chatRole: {
          title: 'La chat sul desktop',
          body: 'Ciò che gli ospiti scrivono nella chat dell\'app arriva nella chat del desktop (pulsante chat nella barra dei menu) — e ritorna. Su questo c\'è un tour dedicato.',
        },
        queueRole: {
          title: 'Le richieste in coda',
          body: 'Gli ospiti mettono in coda le canzoni dai telefoni — sul desktop compaiono nella coda col badge 📱. Anche per questo c\'è un tour.',
        },
        singAlong: {
          title: 'Modalità di canto insieme 🎶',
          body: 'Nella modalità festa Companion Sing-A-Long gli ospiti cantano direttamente dal telefono — il rilevamento del tono gira sul dispositivo, il desktop dirige.',
          details: 'Companion Sing-A-Long: ogni ospite ha sul telefono testo e display del tono — il desktop mostra la pista di note condivisa.\n\nPassa il Microfono: tutti cantano a turno nello stesso microfono sul desktop — viene semplicemente passato di mano. I telefoni qui fanno solo da telecomando e specchio in diretta, mai da microfono.\n\nPer cantare dal telefono: meglio è il Wi-Fi, più fluido è il tono.',
        },
        takeControl: {
          title: 'Take Control 🎮',
          body: 'Un telefono ora guida il desktop solo su comando: il pulsante "Prendi il controllo" sul Companion si prende il telecomando — prima e dopo, il telefono tocca solo per sé.',
          details: 'Il meccanismo dietro "Prendi il controllo":\n• Il controllo è riservato in esclusiva a un solo dispositivo (blocco remoto).\n• Desktop e telefono che controlla restano sincronizzati: ogni lato vede subito cosa fa l\'altro.\n• Tutti gli altri telefoni mostrano lo stato "Controllato da …" e aspettano.\n\nIl controllo termina con "Rilascia" — o automaticamente se il telefono perde la connessione.',
        },
        controlSync: {
          title: 'Desktop e telefono in sincrono',
          body: 'Torniamo nella scheda Mobile: qui da host vedi tutti i dispositivi. Quando un telefono prende il controllo, rispecchia lo schermo del desktop e comanda schermate, pulsanti e conferme — mouse e tastiera sul desktop restano pienamente utilizzabili.',
          details: 'Poiché entrambi i lati girano in sincrono, nessuno può "toccare e scappare": clicchi sul desktop e il telefono che controlla segue — tocchi sul telefono e il desktop cambia schermata.\n\nNella lista dei dispositivi riconosci il dispositivo che controlla dal badge del telecomando.',
        },
        controlHandover: {
          title: 'Un solo telecomando alla volta',
          body: 'Il controllo è esclusivo: mentre un telefono guida, nessun secondo può subentrare — il suo pulsante mostra invece chi sta controllando. Rilasciare o disconnettersi libera subito il controllo.',
          details: 'Buono a sapersi:\n• L\'host può continuare a cliccare quando vuole — il telefono che controlla segue (e mantiene il controllo).\n• Se il telefono che controlla perde la connessione (batteria, WiFi), il controllo torna automaticamente al desktop.\n• Anche un kick dalla lista dei dispositivi termina il controllo.',
        },
        soloOverview: {
          title: 'Ospiti senza controllo 🙋',
          body: 'La maggior parte degli ospiti non ha mai bisogno del telecomando: i telefoni connessi senza Take Control sono compagni autonomi — richiedono canzoni, chattano, cantano e consultano i propri risultati senza toccare il desktop.',
          details: 'Cosa possono fare i telefoni senza controllo:\n• 🎵 Mettere in coda le proprie canzoni (con il badge 📱)\n• 💬 Entrare nella chat della festa\n• 🎤 Cantare nelle modalità festa (ad es. Companion Sing-A-Long)\n• 🗳️ Votare nei sondaggi (torneo, Battle Royale)\n• 🏆 Vedere i propri punteggi e risultati',
        },
        soloQueue: {
          title: 'Richieste senza controllo',
          body: 'Anche senza telecomando ogni ospite mette in coda le proprie canzoni: scegli una canzone sul telefono, mettila in coda — fatto. La richiesta arriva qui con il badge 📱 e conta per il limite di 3 canzoni del profilo.',
        },
        soloParty: {
          title: 'Cantare e votare',
          body: 'La partecipazione alla festa passa sempre dai telefoni: in Companion Sing-A-Long gli ospiti cantano direttamente dal dispositivo, al torneo e in Battle Royale votano con un tocco — tutto senza Take Control. Attenzione a Passa il Microfono: lì si passa solo il micro del desktop; i telefoni si limitano a controllare.',
        },
        soloStats: {
          title: 'Risultati e punteggi propri',
          body: 'Ogni ospite ha il proprio album: sul telefono può consultare i propri punteggi e risultati — senza Take Control. Ciò che il profilo conquista, l\'ospite lo verifica anche dal divano.',
        },
        soloLimits: {
          title: 'Cosa resta bloccato',
          body: 'Senza controllo, impostazioni, profili, configurazione della festa, sfide giornaliere e Jukebox restano fuori — restano riservati al desktop (o a un Companion con Take Control).',
          details: 'Perché il lucchetto? Queste aree cambiano lo stato di gioco o la configurazione per tutti: impostazioni, gestione dei profili, configurazione della festa, sfide giornaliere e Jukebox. Per questo esiste il controllo esplicito — "Prendi il controllo" li sblocca per esattamente un telefono.\n\nL\'host del desktop ha sempre tutto in mano.',
        },
        helpButton: {
          title: 'Aiuto su ogni telefono ❓',
          body: 'Conosci il menu ? qui nella barra dei menu — ogni telefono connesso riceve il proprio pulsante "?". Un tocco apre l\'aiuto del Companion direttamente sul dispositivo.',
        },
        helpLocal: {
          title: 'Solo leggere, mai controllare',
          body: 'L\'aiuto del Companion è una pura vista di lettura: non invia comandi al desktop e non avvia mai un tour del desktop. Gli ospiti possono aprirlo in qualsiasi momento — anche mentre qualcuno canta o controlla.',
          details: 'Così l\'aiuto resta volutamente separato dal sistema di controllo: un ospite che vuole solo controllare una cosa ("Come metto in coda una canzone?") non influenza affatto la serata in corso — e i tour qui sul desktop restano affare dell\'host.\n\nSi apre con il pulsante "?" nell\'app Companion; si chiude semplicemente chiudendo la vista.',
        },
        deviceList: {
          title: 'L\'elenco dei dispositivi',
          body: 'Tornando alla scheda Mobile: tutti i dispositivi connessi mostrano durata della connessione, ruolo, profilo assegnato e ultima attività — più il pulsante di espulsione.',
          details: 'La scheda del dispositivo mostra:\n• Da quanto è connesso ("da 12 min")\n• Cosa sta facendo (microfono attivo, telecomando…)\n• Il profilo reclamato — un menu a tendina ne assegna un altro\n• Espelli: disconnette il dispositivo (può riconnettersi subito)\n\nConsiglio: dai ai profili nomi riconoscibili — l\'elenco resta leggibile anche con molti ospiti.',
        },
        profileClaim: {
          title: 'Reclamare il profilo',
          body: 'Ogni dispositivo può reclamare un profilo: l\'ospite canta così col proprio nome e i propri XP — la schermata profili mostra il reclamo col badge 📱.',
          details: 'Le vie per reclamare:\n1. Scansiona il QR del profilo nelle sue impostazioni (la più diretta)\n2. Nell\'app, dopo la connessione, scegli dall\'elenco\n3. Qui nell\'elenco dispositivi, col menu a tendina\n\nDettagli anche nel tour dei profili.',
        },
        microphoneFallback: {
          title: 'Il telefono al posto dei microfoni',
          body: 'Se cantano tutti dal telefono puoi saltare del tutto la scheda Microfono — l\'app regola da sola la sensibilità. I microfoni fisici si configurano nella scheda Microfono come mostrato.',
        },
        finish: {
          title: 'Connesso! 🔗',
          body: 'Ora sai come i telefoni si agganciano e di cosa sono capaci.\n\nProssimo passo: apri l\'URL sul tuo telefono e fai una prima prova — la modalità microfono è la più scenografica.',
        },
      },
    },

    // ═══ Tour obiettivi (R29) ═══
    achievements: {
      title: 'Obiettivi e Progressi',
      desc: 'Obiettivi, livelli XP, rarità e sfide giornaliere.',
      chapters: {
        overview: 'Panoramica',
        unlock: 'Sbloccare gli obiettivi',
        daily: 'Sfide giornaliere',
      },
      steps: {
        welcome: {
          title: 'Obiettivi e progressi 🏆',
          body: 'Tutto ciò che collezioni: obiettivi con rarità, livelli XP con titoli di rango e le sfide giornaliere come motore degli XP.\n\nQuesto tour percorre la schermata obiettivi e le sfide.',
          details: 'I tre sistemi insieme:\n• XP: il "carburante" — da canzoni, sfide e obiettivi\n• Livelli e ranghi: salgono con gli XP (Principiante → Divino) e mostrano i progressi a colpo d\'occhio\n• Obiettivi: traguardi con ricompense — alcuni restano segreti finché non li sblocchi\n\nTutto è agganciato al profilo — chi canta, raccoglie (vedi il tour dei profili).',
        },
        navButton: {
          title: 'Il pulsante degli obiettivi',
          body: 'Nella barra dei menu il primo trofeo porta alle classifiche (punteggi) — il secondo trofeo lì accanto apre gli obiettivi.',
        },
        playerSelector: {
          title: 'Selezione del giocatore',
          body: 'Qui in alto scegli di chi vedere gli obiettivi — comodo per sfoggiare la collezione. Il numero sul profilo indica quanti ne ha sbloccati.',
        },
        stats: {
          title: 'Le schede statistiche',
          body: 'Quattro schede a colpo d\'occhio: obiettivi sbloccati, XP raccolti da questi, completezza in percentuale e livello attuale col nome di rango.',
          details: 'La scheda percentuale calcola: sbloccati ÷ obiettivi totali. Il 100% è la soglia del collezionista — di solito premiata con un obiettivo segreto tutto suo.\n\nLa scheda livello mostra inoltre il nome di rango ("Novizio", "Leggenda", "Divino"…) — i nomi vengono dal sistema di progressione del profilo.',
        },
        filters: {
          title: 'Filtri',
          body: 'A sinistra i filtri di stato (tutti / sbloccati / bloccati). A destra le categorie: performance, progressione, social e speciali.',
          details: 'Cosa significano le categorie:\n• Performance: imprese canore (combo, note dorate, round perfetti)\n• Progressione: traguardi di collezione (canzoni suonate, quantità di XP, livelli)\n• Social: azioni di festa e multigiocatore (duelli, round via companion)\n• Speciali: segreti e curiosità — la descrizione si rivela solo allo sblocco\n\nCombinabili: "Bloccati + Speciali" mostra ciò che ti aspetta ancora.',
        },
        grid: {
          title: 'Le schede degli obiettivi',
          body: 'Ogni scheda: icona, nome, descrizione, rarità e ricompensa XP. Quelle sbloccate brillano d\'oro con la data — quelle bloccate restano grigie.',
          details: 'Le rarità (distinte dal colore):\n• Comune — arriva da sola giocando con regolarità\n• Rara — richiede azioni mirate\n• Epica — tanto impegno o colpi di fortuna\n• Leggendaria — roba per pochi\n\nLo sblocco avviene in automatico appena la condizione è soddisfatta — notifica toast inclusa. Gli XP atterrano subito sul profilo.',
        },
        xpSystem: {
          title: 'Come scorrono gli XP',
          body: 'Gli XP arrivano da tre fonti: canzoni cantate (in base alla difficoltà), sfide (giornaliere/settimanali) e obiettivi. I livelli sbloccano i ranghi — e alcune funzioni come i badge del profilo.',
          details: 'Le fonti di XP in sintesi:\n• Canzone terminata: XP base in base alla difficoltà (da facile a esperto, in crescita)\n• Slot giornaliero: 100–200 XP base, ×0,5–3 secondo la difficoltà, più bonus\n• Slot settimanale: 250–500 XP base, ×0,5–3 secondo la difficoltà\n• Obiettivo: una tantum per obiettivo (5–7500 XP a seconda dell\'obiettivo)\n\nLa barra livello nella schermata profili mostra la strada al livello successivo; il rango sale con gli XP (Principiante → Divino).',
        },
        navDaily: {
          title: 'Verso le sfide',
          body: 'Le sfide giornaliere hanno una schermata tutta loro — il pulsante a stella nella barra dei menu porta lì. Ci sto andando.',
        },
        playerSelection: {
          title: 'Passo 1: scegli i giocatori',
          body: 'Percorso guidato: prima scegli chi gioca — solo dopo compaiono i compiti. Sono possibili più giocatori; le statistiche vanno al primo.',
          details: 'Perché prima la selezione? Slot e statistiche sono per profilo — senza un giocatore scelto non ci sarebbe nulla da calcolare.\n\nLa scheda mostra tutti i profili attivi; la selezione avviene con un clic. Poi si aprono il passo 2 (i compiti) e il passo 3 (il gioco).',
        },
        slots: {
          title: 'Passo 2: i 5 slot',
          body: 'Cinque slot di compiti al giorno, che si sbloccano in sequenza. Ogni slot mostra il compito, le difficoltà giocabili e il valore in XP — le difficoltà più alte moltiplicano.',
          details: 'La meccanica degli slot:\n• Gli slot 2–5 si aprono solo dopo che il precedente è completato — la catena forza la varietà.\n• Ogni compito è una condizione sulla prossima canzone ("genere rock", "almeno 80% di precisione"…) — la libreria filtra automaticamente le canzoni adatte.\n• Scelta della difficoltà per slot: fino a un moltiplicatore 3× di XP su Folle.\n\nA mezzanotte cadono cinque compiti freschi — la catena riparte.',
        },
        badges: {
          title: 'Badge e settimanale',
          body: 'Completare gli slot vale badge giornalieri (bronzo/argento/oro) con XP extra. La controparte settimanale corre per 7 giorni con ricompense ricche — stessa meccanica, bottino più grosso.',
          details: 'I livelli dei badge giornalieri:\n• Bronzo: 1 slot\n• Argento: 3 slot\n• Oro: tutti e 5 gli slot — più il bonus XP giornaliero\n\nSettimanale: 5 slot su 7 giorni, 250–500 XP base a slot (× moltiplicatore di difficoltà), reset il lunedì. Giocare giornaliere E settimanali fa salire di livello molto più in fretta delle sole canzoni.',
        },
        challengeModes: {
          title: 'Modalità sfida',
          body: 'Oltre agli slot esistono modalità sfida libere con modificatori (es. "velocità 1,5×", "testo nascosto") — per regole su misura e XP extra oltre i compiti giornalieri.',
          details: 'Le modalità si scelgono liberamente: scegli una modalità, i suoi modificatori si applicano automaticamente, la ricompensa XP cresce con la difficoltà.\n\nI completamenti sbloccano sfide successive a catena — più giochi, più si apre.',
        },
        finish: {
          title: 'Ora di collezionare! 🏅',
          body: 'Ora conosci obiettivi, XP e sfide — i tre motori del progresso.\n\nConsiglio per partire: gioca oggi 2 slot giornalieri — il resto viene da sé.',
        },
      },
    },
  },
};
