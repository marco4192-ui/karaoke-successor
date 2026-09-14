// IT translations — profile

export const profileTranslations = {
profile: {
  title: 'Profili',
  createCharacter: 'Crea Profilo',
  name: 'Nome',
  namePlaceholder: 'Nome profilo...',
  country: 'Paese',
  countryOptional: 'Seleziona Paese (opzionale)',
  avatar: 'Avatar',
  uploadPhoto: 'Carica Foto',
  create: 'Crea',
  edit: 'Modifica',
  delete: 'Elimina',
  active: 'Attivo',
  selectAsActive: 'Seleziona come Attivo',
  noCharacters: 'Nessun profilo ancora',
  noCharactersDesc: 'Crea un profilo per tracciare i tuoi punteggi e progressi!',
  showOnLeaderboard: 'Mostra in classifica',
  showPhoto: 'Mostra foto',
  photoUploaded: 'Foto caricata',
  noPhoto: 'Nessuna foto',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Archiviazione del profilo',
    local: 'Solo locale',
    localDesc: 'Tutti i dati restano su questo dispositivo — nessuna classifica online, nessuna sincronizzazione.',
    online: 'Profilo online',
    onlineDesc: 'Unisciti alla classifica online, sincronizza tra dispositivi e condividi i risultati giornalieri.',
    localShort: 'Locale',
    onlineShort: 'Online',
    settingsDesc: 'Decidi se questo profilo si unisce alla classifica online o resta solo locale. Modificabile in qualsiasi momento.',
  },
  countrySearch: 'Cerca paese…',
  noCountryFound: 'Nessun paese trovato',
  popularCountries: 'Popolari',
  allCountries: 'Tutti i paesi',
},
profileAuth: {
  accountTitle: 'Account online (facoltativo)',
  accountDesc: 'Salva un\'e-mail e una password per poter caricare questo profilo su un altro dispositivo. L\'accesso è possibile solo all\'interno dell\'app di karaoke — non esiste un login web.',
  email: 'E-mail',
  emailPlaceholder: 'tua@email.com',
  emailInvalid: 'Inserisci un indirizzo e-mail valido',
  emailTaken: 'Questa e-mail è già registrata',
  password: 'Password',
  passwordPlaceholder: 'Almeno 8 caratteri',
  passwordRepeat: 'Ripeti password',
  passwordsDontMatch: 'Le password non coincidono',
  passwordTooShort: 'La password deve contenere almeno 8 caratteri',
  registerFailed: 'Impossibile creare l\'account online',
  loginTitle: 'Carica profilo online',
  loginDesc: 'Inserisci l\'e-mail e la password del tuo profilo online per caricarlo su questo dispositivo.',
  loginButton: 'Accedi e carica profilo',
  loginFailed: 'Accesso non riuscito — controlla e-mail e password',
  loginSuccess: 'Profilo "{n}" caricato con successo!',
  noSnapshot: 'Nessun dato profilo sincronizzato trovato sul server',
  emailNote: 'Usata solo per l\'accesso — mai mostrata pubblicamente',
  changePassword: 'Cambia password',
  currentPassword: 'Password attuale',
  newPassword: 'Nuova password',
  passwordChanged: 'Password modificata con successo',
  passwordChangeFailed: 'Impossibile cambiare la password',
  hasAccount: 'Account online ✓',
  registrationPending: 'Creazione dell\'account online…',
  registrationSuccess: 'Account online creato — ora puoi accedere da qualsiasi dispositivo',
  registrationSuccessTitle: '🔐 Account online',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profilo',
  description: 'Crea e gestisci i tuoi profili di cantante',
  onlineLeaderboard: 'Classifica Online',
  createProfile: 'Crea Nuovo Profilo',
  yourProfiles: 'I tuoi Profili ({n})',
  noProfiles: 'Nessun profilo ancora. Clicca "Crea Nuovo Profilo" per iniziare!',
  settingsTitle: 'Impostazioni Profilo',
  nameAndAvatar: 'Nome e Avatar',
  rankDisplay: 'Visualizzazione Rango',
  showRankInName: 'Mostra rango nel nome',
  rankPrefix: 'Prefisso',
  rankSuffix: 'Suffisso',
  rankFull: 'Completo',
  countryAndPrivacy: 'Paese e Privacy',
  selectCountry: 'Seleziona Paese',
  visible: 'Visibile',
  hidden: 'Nascosto',
  shown: 'Mostrato',
  companionAppLink: 'Link App Compagna',
  companionAppLinkDesc: 'Scansiona questo QR code per connetterti direttamente con questo profilo nell\'app compagna.',
  hideQrCode: 'Nascondi QR Code',
  showQrCode: 'Mostra QR Code',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Carica Profilo Online',
},
characterCard: {
  connected: 'Connesso',
  connectedWith: 'Connesso: {n}',
},
profileSync: {
  title: 'Sincronizzazione Profilo',
  uploadSuccess: 'Profilo caricato! Codice di sinc: {n}',
  uploadFailed: 'Caricamento fallito',
  downloadFailed: 'Impossibile scaricare il profilo',
  invalidCode: 'Inserisci un codice di sincronizzazione valido di 8 caratteri',
  syncSuccess: 'Profilo sincronizzato con successo!',
  notFound: 'Profilo non trovato',
  profileNotFound: 'Profilo non trovato',
  downloadFailedMsg: 'Impossibile scaricare il profilo. Verifica il codice di sincronizzazione.',
  syncCode: 'Codice di Sincronizzazione:',
  upload: 'Carica',
  syncCodePlaceholder: 'Codice di sinc',
},
playerProgression: {
  active: 'Attivo',
  inactive: 'Inattivo',
  progressToNext: 'Progresso al Livello Successivo',
  xpNeeded: 'XP necessari',
  songsPlayed: 'Canzoni Giocate',
  goldenNotes: 'Note Dorate',
  bestCombo: 'Miglior Combo',
  totalScore: 'Punteggio Totale',
  achievementsTitle: 'Obiettivi',
  more: '+{n} altri',
  beginner: 'Principiante',
  xp: 'XP',
  lv: 'Liv. {n}',
},
achievements: {
  title: 'Obiettivi',
  unlocked: 'Sbloccato',
  locked: 'Bloccato',
  progress: 'Progresso',
  noAchievements: 'Nessun obiettivo ancora',
  playToUnlock: 'Gioca canzoni per sbloccare obiettivi!',
  rarity: 'Rarità',
  common: 'Comune',
  uncommon: 'Non Comune',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Leggendario',
  first_note: {
    name: 'Prima nota',
    description: 'Colpisci la tua prima nota',
  },
  perfect_ten: {
    name: 'Dieci perfette',
    description: 'Ottieni 10 colpi Perfetti in una sola canzone',
  },
  combo_master: {
    name: 'Master della Combo',
    description: 'Raggiungi una combo di 50 note',
  },
  combo_king: {
    name: 'Re della Combo',
    description: 'Raggiungi una combo di 100 note',
  },
  combo_legend: {
    name: 'Leggenda della Combo',
    description: 'Raggiungi una combo di 200 note',
  },
  perfect_song: {
    name: 'Canzone perfetta',
    description: 'Ottieni più del 99,5% di precisione su una canzone',
  },
  accuracy_90: {
    name: 'Pitch Perfect',
    description: 'Ottieni più del 90% di precisione',
  },
  score_8k: {
    name: 'Stella nascente',
    description: 'Ottieni più di 8.000 punti',
  },
  score_9k: {
    name: 'Master del punteggio',
    description: 'Ottieni più di 9.000 punti',
  },
  score_9500: {
    name: 'Ineccepibile',
    description: 'Ottieni più di 9.500 punti',
  },
  golden_collector: {
    name: 'Collettore d\'oro',
    description: 'Colpisci 10 note d\'oro',
  },
  golden_master: {
    name: 'Master d\'oro',
    description: 'Colpisci 50 note d\'oro',
  },
  first_song: {
    name: 'Primi passi',
    description: 'Completa la tua prima canzone',
  },
  ten_songs: {
    name: 'Appassionato di karaoke',
    description: 'Completa 10 canzoni',
  },
  fifty_songs: {
    name: 'Assiduo del karaoke',
    description: 'Completa 50 canzoni',
  },
  hundred_songs: {
    name: 'Leggenda del karaoke',
    description: 'Completa 100 canzoni',
  },
  five_games: {
    name: 'Primi risultati',
    description: 'Gioca 5 partite',
  },
  twenty_games: {
    name: 'Cantante dedicato',
    description: 'Gioca 20 partite',
  },
  party_time: {
    name: 'È ora di festa!',
    description: 'Gioca a una modalità party',
  },
  duel_winner: {
    name: 'Campione del duello',
    description: 'Vinci un duello',
  },
  pass_the_mic: {
    name: 'Passa il microfono!',
    description: 'Gioca alla modalità Passa il microfono',
  },
  shower_singer: {
    name: 'Cantante da doccia',
    description: 'Ottieni meno del 20% di precisione su una canzone',
  },
  comeback_king: {
    name: 'Re del ritorno',
    description: 'Raggiungi una combo di 50+ dopo aver sbagliato 10 note',
  },
  speed_demon: {
    name: 'Diavolo della velocità',
    description: 'Completa una canzone a velocità 1.5x',
  },
  blind_master: {
    name: 'Master alla cieca',
    description: 'Completa una canzone in modalità Karaoke alla cieca',
  },
  daily_starter: {
    name: 'Esordiente Quotidiano',
    description: 'Completa la tua prima sfida quotidiana',
  },
  daily_regular: {
    name: 'Frequentatore Quotidiano',
    description: 'Completa 10 sfide quotidiane',
  },
  daily_devoted: {
    name: 'Devoto Quotidiano',
    description: 'Completa 50 sfide quotidiane',
  },
  streak_week: {
    name: 'In Fiamme',
    description: 'Mantieni una serie quotidiana di 7 giorni',
  },
  streak_month: {
    name: 'Inarrestabile',
    description: 'Mantieni una serie quotidiana di 30 giorni',
  },
  weekly_warrior: {
    name: 'Guerriero Settimanale',
    description: 'Completa 5 sfide settimanali',
  },
  accuracy_95: {
    name: 'Cantante di Precisione',
    description: 'Ottieni oltre il 95% di precisione',
  },
  golden_rush: {
    name: 'Febbre dell\'Oro',
    description: 'Colpisci 20 note dorate in una sola canzone',
  },
  golden_hundred: {
    name: 'Centurione Dorato',
    description: 'Colpisci 100 note dorate in totale',
  },
  perfect_fifty: {
    name: 'Cinquanta Perfette',
    description: 'Colpisci 50 note perfette in una sola canzone',
  },
  lightning_lips: {
    name: 'Labbra Fulminee',
    description: 'Completa una canzone a velocità 2x',
  },
  duet_harmony: {
    name: 'Armonia Perfetta',
    description: 'Canta 10 duetti',
  },
  genre_explorer: {
    name: 'Esploratore di Generi',
    description: 'Canta canzoni di 5 generi diversi',
  },
  disney_fan: {
    name: 'Fan di Disney',
    description: 'Canta 10 canzoni Disney',
  },
  night_owl: {
    name: 'Gufo Notturno',
    description: 'Termina una canzone tra mezzanotte e le 4 del mattino',
  },
  early_bird: {
    name: 'Mattiniero',
    description: 'Termina una canzone prima delle 8 del mattino',
  },
  marathon_singer: {
    name: 'Cantante Maratoneta',
    description: 'Gioca 5 partite in un solo giorno',
  },

  // ── Espansione a 100 obiettivi ──
  score_9800: {
    name: 'Stella Ultra',
    description: 'Ottieni più di 9.800 punti',
  },
  score_9900: {
    name: 'Oltre la Perfezione',
    description: 'Ottieni più di 9.900 punti',
  },
  combo_300: {
    name: 'Titano della Combo',
    description: 'Raggiungi una combo di 300 note',
  },
  combo_500: {
    name: 'Combo Immortale',
    description: 'Raggiungi una combo di 500 note',
  },
  accuracy_92: {
    name: 'Messa a Punto',
    description: 'Ottieni più del 92% di precisione',
  },
  accuracy_94: {
    name: 'Qualità da Studio',
    description: 'Ottieni più del 94% di precisione',
  },
  accuracy_96: {
    name: 'Tiratore Scelto',
    description: 'Ottieni più del 96% di precisione',
  },
  accuracy_97: {
    name: 'Precisione Laser',
    description: 'Ottieni più del 97% di precisione',
  },
  accuracy_98: {
    name: 'Virtuoso',
    description: 'Ottieni più del 98% di precisione',
  },
  perfect_75: {
    name: 'Settantacinque Perfette',
    description: 'Colpisci 75 note perfette in una sola canzone',
  },
  perfect_100: {
    name: 'Centuria Perfetta',
    description: 'Colpisci 100 note perfette in una sola canzone',
  },
  perfect_150: {
    name: 'Tempesta Perfetta',
    description: 'Colpisci 150 note perfette in una sola canzone',
  },
  golden_30: {
    name: 'Marea Dorata',
    description: 'Colpisci 30 note dorate in una sola canzone',
  },
  golden_40: {
    name: 'Sinfonia Dorata',
    description: 'Colpisci 40 note dorate in una sola canzone',
  },
  perfect_500: {
    name: 'Macchina Perfetta',
    description: 'Colpisci 500 note perfette in totale',
  },
  perfect_1000: {
    name: 'Cannone di Precisione',
    description: 'Colpisci 1.000 note perfette in totale',
  },
  perfect_5000: {
    name: 'Valanga Perfetta',
    description: 'Colpisci 5.000 note perfette in totale',
  },
  perfect_10000: {
    name: 'Diecimila Perfette',
    description: 'Colpisci 10.000 note perfette in totale',
  },
  golden_250: {
    name: 'Raccolto Dorato',
    description: 'Colpisci 250 note dorate in totale',
  },
  golden_1000: {
    name: 'Diluvio Dorato',
    description: 'Colpisci 1.000 note dorate in totale',
  },
  golden_5000: {
    name: 'Voce di Mida',
    description: 'Colpisci 5.000 note dorate in totale',
  },
  songs_250: {
    name: 'Veterano del Repertorio',
    description: 'Completa 250 canzoni',
  },
  songs_500: {
    name: 'Club dei Cinquecento',
    description: 'Completa 500 canzoni',
  },
  songs_1000: {
    name: 'Leggenda delle Mille Canzoni',
    description: 'Completa 1.000 canzoni',
  },
  games_50: {
    name: 'Cantante Frequente',
    description: 'Gioca 50 partite',
  },
  games_100: {
    name: 'Club del Centinaio',
    description: 'Gioca 100 partite',
  },
  games_250: {
    name: 'Habitué della Sala Giochi',
    description: 'Gioca 250 partite',
  },
  games_500: {
    name: 'Maniaco della Maratona',
    description: 'Gioca 500 partite',
  },
  level_25: {
    name: 'Cantante Esperto',
    description: 'Raggiungi il livello 25',
  },
  level_50: {
    name: 'Cantante d\'Élite',
    description: 'Raggiungi il livello 50',
  },
  level_100: {
    name: 'Leggenda di Livello 100',
    description: 'Raggiungi il livello 100',
  },
  daily_100: {
    name: 'Centurione Quotidiano',
    description: 'Completa 100 sfide quotidiane',
  },
  daily_250: {
    name: 'Fanatico Quotidiano',
    description: 'Completa 250 sfide quotidiane',
  },
  daily_500: {
    name: 'Immortale Quotidiano',
    description: 'Completa 500 sfide quotidiane',
  },
  streak_60: {
    name: 'Volontà di Ferro',
    description: 'Mantieni una serie quotidiana di 60 giorni',
  },
  streak_100: {
    name: 'Eroe dei Cento Giorni',
    description: 'Mantieni una serie quotidiana di 100 giorni',
  },
  streak_180: {
    name: 'Devozione di Mezzo Anno',
    description: 'Mantieni una serie quotidiana di 180 giorni',
  },
  streak_365: {
    name: 'Leggenda Annuale',
    description: 'Mantieni una serie quotidiana di 365 giorni',
  },
  weekly_15: {
    name: 'Incondizionato Settimanale',
    description: 'Completa 15 sfide settimanali',
  },
  weekly_30: {
    name: 'Pilastro Settimanale',
    description: 'Completa 30 sfide settimanali',
  },
  weekly_52: {
    name: 'Un Anno di Settimane',
    description: 'Completa 52 sfide settimanali',
  },
  encore_10: {
    name: 'Bis!',
    description: 'Gioca 10 partite in un solo giorno',
  },
  duets_25: {
    name: 'Devoto dei Duetti',
    description: 'Canta 25 duetti',
  },
  duets_50: {
    name: 'Duo Dinamico',
    description: 'Canta 50 duetti',
  },
  duets_100: {
    name: 'Centuria di Duetti',
    description: 'Canta 100 duetti',
  },
  duels_5: {
    name: 'Duellante',
    description: 'Vinci 5 duelli',
  },
  duels_10: {
    name: 'Maestro del Duello',
    description: 'Vinci 10 duelli',
  },
  duels_25: {
    name: 'Signore del Duello',
    description: 'Vinci 25 duelli',
  },
  party_10: {
    name: 'Animale da Festa',
    description: 'Gioca a 10 partite in modalità festa',
  },
  party_25: {
    name: 'Anima della Festa',
    description: 'Gioca a 25 partite in modalità festa',
  },
  party_50: {
    name: 'Leggenda della Festa',
    description: 'Gioca a 50 partite in modalità festa',
  },
  disney_25: {
    name: 'Appassionato di Disney',
    description: 'Canta 25 canzoni Disney',
  },
  disney_50: {
    name: 'C\'era una Volta una Canzone',
    description: 'Canta 50 canzoni Disney',
  },
  genres_8: {
    name: 'Vagabondo dei Generi',
    description: 'Canta canzoni di 8 generi diversi',
  },
  genres_10: {
    name: 'Esperto di Generi',
    description: 'Canta canzoni di 10 generi diversi',
  },
  clean_sheet: {
    name: 'Porta Inviolata',
    description: 'Termina una canzone con 50+ note e zero errori',
  },
  weekend_singer: {
    name: 'Cantante del Weekend',
    description: 'Termina una canzone di sabato o domenica',
  },
  lunch_break: {
    name: 'Pausa Pranzo',
    description: 'Termina una canzone tra le 12 e le 14',
  },
},
achievementsScreen: {
  title: '🏆 Obiettivi',
  description: 'Sblocca obiettivi giocando!',
  unlocked: 'Sbloccato',
  xpEarned: 'XP Ottenuti',
  completion: 'Completamento',
  all: 'Tutti',
  categories: {
    performance: 'performance',
    progression: 'progressione',
    social: 'sociale',
    special: 'speciale',
  },
  plusXp: '+{n} XP',
  locked: 'Bloccato',
  viewPlayer: 'Obiettivi di',
  viewingOther: 'Stai visualizzando gli obiettivi di {n}. Ogni giocatore sblocca i propri obiettivi.',
  noMatches: 'Nessun obiettivo corrisponde a questi filtri',
},
badgeNames: {
  'first-challenge': 'Primi Passi',
  'week-warrior': 'Guerriero Settimanale',
  'fortnight-fighter': 'Combattente Quindicinale',
  'monthly-master': 'Maestro Mensile',
  'top-3': 'Finale sul Podio',
  champion: 'Campione Giornaliero',
  dedicated: 'Cantante Dedicato',
  legendary: 'Stato Leggendario',
  'century-champion': 'Campione del Secolo',
  'yearly-legend': 'Leggenda Annuale',
  explorer: 'Esploratore di Sfide',
  songbird: 'Uccellino Cantore',
  'weekly-warrior-q': 'Guerriero Settimanale',
},
badgeDescriptions: {
  'first-challenge': 'Completa la tua prima sfida giornaliera',
  'week-warrior': 'Mantieni una serie di 7 giorni',
  'fortnight-fighter': 'Mantieni una serie di 14 giorni',
  'monthly-master': 'Mantieni una serie di 30 giorni',
  'top-3': 'Finisci nei primi 3 di una sfida giornaliera',
  champion: 'Vinci una sfida giornaliera',
  dedicated: 'Completa 30 sfide giornaliere',
  legendary: 'Raggiungi 10.000 XP totali',
  'century-champion': 'Mantieni una serie di 100 giorni',
  'yearly-legend': 'Mantieni una serie di 365 giorni',
  explorer: 'Gioca 5 modalità di sfida diverse',
  songbird: 'Completa 10 canzoni in totale',
  'weekly-warrior-q': 'Completa 3 sfide settimanali',
},
mobileAchievements: {
  first_song: {
    title: 'Primi passi',
    description: 'Canta la tua prima canzone',
  },
  ten_songs: {
    title: 'Stella nascente',
    description: 'Canta 10 canzoni',
  },
  fifty_songs: {
    title: 'Veterano',
    description: 'Canta 50 canzoni',
  },
  perfect_score: {
    title: 'Perfezionista',
    description: 'Ottieni un punteggio perfetto (95%+)',
  },
  five_perfect: {
    title: 'Ineccepibile',
    description: 'Ottieni 5 punteggi perfetti',
  },
  high_score: {
    title: 'Master del punteggio',
    description: 'Raggiungi 10.000 punti totali',
  },
  queue_5: {
    title: 'Costruttore di playlist',
    description: 'Metti in coda 5 canzoni',
  },
  genre_3: {
    title: 'Esploratore di generi',
    description: 'Canta canzoni di 3 generi diversi',
  },
},
challenges: {
  requirements: {
    minLevel: 'Richiede livello {required} (sei al livello {current})',
    minSongs: 'Richiede {required} canzoni completate (ne hai {current})',
    achievement: 'Richiede l\'achievement: {name}',
    rankNoXP: 'Impossibile verificare il requisito di rango (nessun dato XP disponibile)',
    unknownRank: 'Rango sconosciuto "{name}"',
    rankRequired: 'Richiede il rango "{required}" (sei "{current}")',
  },
},
};
