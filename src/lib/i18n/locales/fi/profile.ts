// FI translations — profile

export const profileTranslations = {
profile: {
  title: 'Profiilit',
  createCharacter: 'Luo profiili',
  name: 'Nimi',
  namePlaceholder: 'Profiilin nimi...',
  country: 'Maa',
  countryOptional: 'Valitse maa (valinnainen)',
  avatar: 'Profiilikuva',
  uploadPhoto: 'Lataa kuva',
  create: 'Luo',
  edit: 'Muokkaa',
  delete: 'Poista',
  active: 'Aktiivinen',
  selectAsActive: 'Valitse aktiiviseksi',
  noCharacters: 'Ei profiileja vielä',
  noCharactersDesc: 'Luo profiili seurataksesi tuloksiasi ja edistymistäsi!',
  showOnLeaderboard: 'Näytä tulostaulukossa',
  showPhoto: 'Näytä kuva',
  photoUploaded: 'Kuva ladattu',
  noPhoto: 'Ei kuvaa',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Profiilin tallennus',
    local: 'Vain paikallisesti',
    localDesc: 'Kaikki tiedot pysyvät tällä laitteella — ei verkon tulostaulukkoa, ei synkronointia.',
    online: 'Verkkoprofiili',
    onlineDesc: 'Liity verkon tulostaulukkoon, synkronoi laitteiden välillä ja jaa päivittäisiä tuloksia.',
    localShort: 'Paikallinen',
    onlineShort: 'Verkko',
    settingsDesc: 'Päätä, liittyykö tämä profiili verkon tulostaulukkoon vai pysyykö vain paikallisena. Voit vaihtaa milloin tahansa.',
  },
  countrySearch: 'Hae maata…',
  noCountryFound: 'Maata ei löytynyt',
  popularCountries: 'Suosituimmat',
  allCountries: 'Kaikki maat',
},
profileAuth: {
  accountTitle: 'Verkkotili (valinnainen)',
  accountDesc: 'Tallenna sähköposti ja salasana, jotta voit ladata tämän profiilin toiselle laitteelle. Kirjautuminen on mahdollista vain karaoke-sovelluksessa — verkkokirjautumista ei ole.',
  email: 'Sähköposti',
  emailPlaceholder: 'sähköpostisi@esimerkki.fi',
  emailInvalid: 'Syötä kelvollinen sähköpostiosoite',
  emailTaken: 'Tämä sähköposti on jo rekisteröity',
  password: 'Salasana',
  passwordPlaceholder: 'Vähintään 8 merkkiä',
  passwordRepeat: 'Toista salasana',
  passwordsDontMatch: 'Salasanat eivät täsmää',
  passwordTooShort: 'Salasanan on oltava vähintään 8 merkkiä pitkä',
  registerFailed: 'Verkkotiliä ei voitu luoda',
  loginTitle: 'Lataa verkkoprofiili',
  loginDesc: 'Syötä verkkoprofiilisi sähköposti ja salasana ladataksesi sen tälle laitteelle.',
  loginButton: 'Kirjaudu sisään ja lataa profiili',
  loginFailed: 'Kirjautuminen epäonnistui — tarkista sähköposti ja salasana',
  loginSuccess: 'Profiili "{n}" ladattu onnistuneesti!',
  noSnapshot: 'Palvelimelta ei löytynyt vielä synkronoituja profiilitietoja',
  emailNote: 'Käytetään vain kirjautumiseen — ei näytetä julkisesti',
  changePassword: 'Vaihda salasana',
  currentPassword: 'Nykyinen salasana',
  newPassword: 'Uusi salasana',
  passwordChanged: 'Salasana vaihdettu onnistuneesti',
  passwordChangeFailed: 'Salasanan vaihtaminen epäonnistui',
  hasAccount: 'Verkkotili ✓',
  registrationPending: 'Luodaan verkkotiliä…',
  registrationSuccess: 'Verkkotili luotu — voit nyt kirjautua sisään millä tahansa laitteella',
  registrationSuccessTitle: '🔐 Verkkotili',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profiili',
  description: 'Luo ja hallitse lauluprofiilejasi',
  onlineLeaderboard: 'Online-tulostaulukko',
  createProfile: 'Luo uusi profiili',
  yourProfiles: 'Profiilisi ({n})',
  noProfiles: 'Ei profiileja vielä. Napsauta "Luo uusi profiili" aloittaaksesi!',
  settingsTitle: 'Profiiliasetukset',
  nameAndAvatar: 'Nimi & avatar',
  rankDisplay: 'Ranking-näyttö',
  showRankInName: 'Näytä ranking nimessä',
  rankPrefix: 'Etuliite',
  rankSuffix: 'Takaliite',
  rankFull: 'Täysi',
  countryAndPrivacy: 'Maa & yksityisyys',
  selectCountry: 'Valitse maa',
  visible: 'Näkyvissä',
  hidden: 'Piilotettu',
  shown: 'Näytetty',
  companionAppLink: 'Companion-sovelluksen linkki',
  companionAppLinkDesc: 'Skannaa tämä QR-koodi yhdistääksesi suoraan tähän profiiliin companion-sovelluksessa.',
  hideQrCode: 'Piilota QR-koodi',
  showQrCode: 'Näytä QR-koodi',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Lataa verkkoprofiili',
},
characterCard: {
  connected: 'Yhdistetty',
  connectedWith: 'Yhdistetty: {n}',
},
profileSync: {
  title: 'Profiilin synkronointi',
  uploadSuccess: 'Profiili ladattu! Synkkoodi: {n}',
  uploadFailed: 'Lataus epäonnistui',
  downloadFailed: 'Profiilin lataaminen epäonnistui',
  invalidCode: 'Syötä kelvollinen 8-merkin synkkoodi',
  syncSuccess: 'Profiili synkronoitu!',
  notFound: 'Profiilia ei löytynyt',
  profileNotFound: 'Profiilia ei löytynyt',
  downloadFailedMsg: 'Profiilin lataus epäonnistui. Tarkista synkkoodi.',
  syncCode: 'Synkkoodi:',
  upload: 'Lataa',
  syncCodePlaceholder: 'Synkkoodi',
},
playerProgression: {
  active: 'Aktiivinen',
  inactive: 'Inaktiivinen',
  progressToNext: 'Edistyminen seuraavalle tasolle',
  xpNeeded: 'XP:ää tarvitaan',
  songsPlayed: 'Pelatut kappaleet',
  goldenNotes: 'Kultaiset nuotit',
  bestCombo: 'Paras combo',
  totalScore: 'Kokonaispisteet',
  achievementsTitle: 'Saavutukset',
  more: '+{n} lisää',
  beginner: 'Aloittelija',
  xp: 'XP',
  lv: 'Taso {n}',
},
achievements: {
  title: 'Saavutukset',
  unlocked: 'Avattu',
  locked: 'Lukittu',
  progress: 'Edistyminen',
  noAchievements: 'Ei saavutuksia vielä',
  playToUnlock: 'Pelaa kappaleita avataksesi saavutuksia!',
  rarity: 'Harvinaisuus',
  common: 'Yleinen',
  uncommon: 'Harvinaisempi',
  rare: 'Harvinainen',
  epic: 'Eeppinen',
  legendary: 'Legendaarinen',
  first_note: {
    name: 'Ensimmäinen nuotti',
    description: 'Osu ensimmäiseen nuottiin',
  },
  perfect_ten: {
    name: 'Täydellinen kymmenikko',
    description: 'Saa 10 täydellistä osumaa yhdessä kappaleessa',
  },
  combo_master: {
    name: 'Kombomestari',
    description: 'Saa 50 nuotin kombo',
  },
  combo_king: {
    name: 'Kombokuningas',
    description: 'Saa 100 nuotin kombo',
  },
  combo_legend: {
    name: 'Kombolegenda',
    description: 'Saa 200 nuotin kombo',
  },
  perfect_song: {
    name: 'Täydellinen kappale',
    description: 'Saa 99.5%+ tarkkuuden kappaleessa',
  },
  accuracy_90: {
    name: 'Täydellinen sävel',
    description: 'Saa yli 90% tarkkuuden',
  },
  score_8k: {
    name: 'Nouseva tähti',
    description: 'Saa yli 8 000 pistettä',
  },
  score_9k: {
    name: 'Pistemestari',
    description: 'Saa yli 9 000 pistettä',
  },
  score_9500: {
    name: 'Virheetön',
    description: 'Saa yli 9 500 pistettä',
  },
  golden_collector: {
    name: 'Kultakerääjä',
    description: 'Osu 10 kultaiseen nuottiin',
  },
  golden_master: {
    name: 'Kultamestari',
    description: 'Osu 50 kultaiseen nuottiin',
  },
  first_song: {
    name: 'Ensiaskeleet',
    description: 'Suorita ensimmäinen kappaleesi',
  },
  ten_songs: {
    name: 'Karaokeharrastaja',
    description: 'Suorita 10 kappaletta',
  },
  fifty_songs: {
    name: 'Karaokevakio',
    description: 'Suorita 50 kappaletta',
  },
  hundred_songs: {
    name: 'Karaokelegenda',
    description: 'Suorita 100 kappaletta',
  },
  five_games: {
    name: 'Aloittelija',
    description: 'Pelaa 5 peliä',
  },
  twenty_games: {
    name: 'Omittautunut laulaja',
    description: 'Pelaa 20 peliä',
  },
  party_time: {
    name: 'Juhla-aika!',
    description: 'Pelaa jokin juhlatila',
  },
  duel_winner: {
    name: 'Kaksinkampailumestari',
    description: 'Voita kaksinkampailu',
  },
  pass_the_mic: {
    name: 'Mikrofonin vaihto!',
    description: 'Pelaa mikrofonin vaihto -tilaa',
  },
  shower_singer: {
    name: 'Suihkulaulaja',
    description: 'Saa alle 20% tarkkuuden kappaleessa',
  },
  comeback_king: {
    name: 'Paluukuningas',
    description: 'Saa 50+ kombon hutittuasi 10 nuottia',
  },
  speed_demon: {
    name: 'Vauhidemoni',
    description: 'Suorita kappale 1.5x nopeudella',
  },
  blind_master: {
    name: 'Sokea mestari',
    description: 'Suorita kappale sokeassa karaoke -tilassa',
  },
  daily_starter: {
    name: 'Dailyn aloittelija',
    description: 'Suorita ensimmäinen päivittäinen haasteesi',
  },
  daily_regular: {
    name: 'Dailyn vakiokävijä',
    description: 'Suorita 10 päivittäistä haastetta',
  },
  daily_devoted: {
    name: 'Dailyn omistautuja',
    description: 'Suorita 50 päivittäistä haastetta',
  },
  streak_week: {
    name: 'Liekeissä',
    description: 'Pidä yllä 7 päivän päivittäisputki',
  },
  streak_month: {
    name: 'Pysäyttämätön',
    description: 'Pidä yllä 30 päivän päivittäisputki',
  },
  weekly_warrior: {
    name: 'Viikkosoturi',
    description: 'Suorita 5 viikoittaista haastetta',
  },
  accuracy_95: {
    name: 'Tarkkuuslaulaja',
    description: 'Saa yli 95% tarkkuuden',
  },
  golden_rush: {
    name: 'Kultaryntäys',
    description: 'Osu 20 kultaiseen nuottiin yhdessä kappaleessa',
  },
  golden_hundred: {
    name: 'Kultainen centurio',
    description: 'Osu yhteensä 100 kultaiseen nuottiin',
  },
  perfect_fifty: {
    name: 'Täydelliset viisikymmentä',
    description: 'Osu 50 täydelliseen nuottiin yhdessä kappaleessa',
  },
  lightning_lips: {
    name: 'Salamahuulet',
    description: 'Suorita kappale 2x nopeudella',
  },
  duet_harmony: {
    name: 'Täydellinen harmonia',
    description: 'Laula 10 duettoa',
  },
  genre_explorer: {
    name: 'Genretutkija',
    description: 'Laula kappaleita viidestä eri genrestä',
  },
  disney_fan: {
    name: 'Disney-fani',
    description: 'Laula 10 Disney-kappaletta',
  },
  night_owl: {
    name: 'Iltapöllö',
    description: 'Suorita kappale keskiyön ja kello 4:n välillä',
  },
  early_bird: {
    name: 'Aamuvirkku',
    description: 'Suorita kappale ennen kello 8:aa',
  },
  marathon_singer: {
    name: 'Maratonlaulaja',
    description: 'Pelaa 5 peliä yhden päivän aikana',
  },

  // ── Laajennus 100 saavutukseen ──
  score_9800: {
    name: 'Ultratähti',
    description: 'Saa yli 9 800 pistettä',
  },
  score_9900: {
    name: 'Täydellisyyden tuolla puolen',
    description: 'Saa yli 9 900 pistettä',
  },
  combo_300: {
    name: 'Kombotitaani',
    description: 'Saa 300 nuotin kombo',
  },
  combo_500: {
    name: 'Kuolematon kombo',
    description: 'Saa 500 nuotin kombo',
  },
  accuracy_92: {
    name: 'Hienosäätö',
    description: 'Saa yli 92% tarkkuuden',
  },
  accuracy_94: {
    name: 'Studiolaatu',
    description: 'Saa yli 94% tarkkuuden',
  },
  accuracy_96: {
    name: 'Tarkka-ampuja',
    description: 'Saa yli 96% tarkkuuden',
  },
  accuracy_97: {
    name: 'Lasertarkkuus',
    description: 'Saa yli 97% tarkkuuden',
  },
  accuracy_98: {
    name: 'Virtuoosi',
    description: 'Saa yli 98% tarkkuuden',
  },
  perfect_75: {
    name: 'Täydelliset seitsemänkymmentäviisi',
    description: 'Osu 75 täydelliseen nuottiin yhdessä kappaleessa',
  },
  perfect_100: {
    name: 'Täydellinen sata',
    description: 'Osu 100 täydelliseen nuottiin yhdessä kappaleessa',
  },
  perfect_150: {
    name: 'Täydellinen myrsky',
    description: 'Osu 150 täydelliseen nuottiin yhdessä kappaleessa',
  },
  golden_30: {
    name: 'Kultainen vuorovesi',
    description: 'Osu 30 kultaiseen nuottiin yhdessä kappaleessa',
  },
  golden_40: {
    name: 'Kultainen sinfonia',
    description: 'Osu 40 kultaiseen nuottiin yhdessä kappaleessa',
  },
  perfect_500: {
    name: 'Täydellinen kone',
    description: 'Osu yhteensä 500 täydelliseen nuottiin',
  },
  perfect_1000: {
    name: 'Tarkkuusvoimala',
    description: 'Osu yhteensä 1 000 täydelliseen nuottiin',
  },
  perfect_5000: {
    name: 'Täydellinen lumivyöry',
    description: 'Osu yhteensä 5 000 täydelliseen nuottiin',
  },
  perfect_10000: {
    name: 'Täydelliset kymmenen tuhatta',
    description: 'Osu yhteensä 10 000 täydelliseen nuottiin',
  },
  golden_250: {
    name: 'Kultainen sato',
    description: 'Osu yhteensä 250 kultaiseen nuottiin',
  },
  golden_1000: {
    name: 'Kultainen kaatosade',
    description: 'Osu yhteensä 1 000 kultaiseen nuottiin',
  },
  golden_5000: {
    name: 'Midas-ääni',
    description: 'Osu yhteensä 5 000 kultaiseen nuottiin',
  },
  songs_250: {
    name: 'Laulukirjan konkari',
    description: 'Suorita 250 kappaletta',
  },
  songs_500: {
    name: 'Puolentuhannen klubi',
    description: 'Suorita 500 kappaletta',
  },
  songs_1000: {
    name: 'Tuhannen kappaleen legenda',
    description: 'Suorita 1 000 kappaletta',
  },
  games_50: {
    name: 'Säännöllinen laulaja',
    description: 'Pelaa 50 peliä',
  },
  games_100: {
    name: 'Sataklubi',
    description: 'Pelaa 100 peliä',
  },
  games_250: {
    name: 'Pelihallin vakio',
    description: 'Pelaa 250 peliä',
  },
  games_500: {
    name: 'Maratonmaniakki',
    description: 'Pelaa 500 peliä',
  },
  level_25: {
    name: 'Kokenut laulaja',
    description: 'Saavuta taso 25',
  },
  level_50: {
    name: 'Eliittilaulaja',
    description: 'Saavuta taso 50',
  },
  level_100: {
    name: 'Tason 100 legenda',
    description: 'Saavuta taso 100',
  },
  daily_100: {
    name: 'Dailyn centurio',
    description: 'Suorita 100 päivittäistä haastetta',
  },
  daily_250: {
    name: 'Dailyn sisukas',
    description: 'Suorita 250 päivittäistä haastetta',
  },
  daily_500: {
    name: 'Dailyn kuolematon',
    description: 'Suorita 500 päivittäistä haastetta',
  },
  streak_60: {
    name: 'Rautatahto',
    description: 'Pidä yllä 60 päivän päivittäisputki',
  },
  streak_100: {
    name: 'Sadan päivän sankari',
    description: 'Pidä yllä 100 päivän päivittäisputki',
  },
  streak_180: {
    name: 'Puolen vuoden omistautuminen',
    description: 'Pidä yllä 180 päivän päivittäisputki',
  },
  streak_365: {
    name: 'Vuoden legenda',
    description: 'Pidä yllä 365 päivän päivittäisputki',
  },
  weekly_15: {
    name: 'Viikkovakio',
    description: 'Suorita 15 viikoittaista haastetta',
  },
  weekly_30: {
    name: 'Viikon pylväs',
    description: 'Suorita 30 viikoittaista haastetta',
  },
  weekly_52: {
    name: 'Vuoden viikot',
    description: 'Suorita 52 viikoittaista haastetta',
  },
  encore_10: {
    name: 'Encore!',
    description: 'Pelaa 10 peliä yhden päivän aikana',
  },
  duets_25: {
    name: 'Dueton omistautuja',
    description: 'Laula 25 duettoa',
  },
  duets_50: {
    name: 'Dynaaminen duo',
    description: 'Laula 50 duettoa',
  },
  duets_100: {
    name: 'Sata duettoa',
    description: 'Laula 100 duettoa',
  },
  duels_5: {
    name: 'Kaksintaistelija',
    description: 'Voita 5 kaksintaistelua',
  },
  duels_10: {
    name: 'Kaksintaistelun mestari',
    description: 'Voita 10 kaksintaistelua',
  },
  duels_25: {
    name: 'Kaksintaistelun valtias',
    description: 'Voita 25 kaksintaistelua',
  },
  party_10: {
    name: 'Bile-eläin',
    description: 'Pelaa 10 juhlapeliä',
  },
  party_25: {
    name: 'Bileiden sielu',
    description: 'Pelaa 25 juhlapeliä',
  },
  party_50: {
    name: 'Bilelegenda',
    description: 'Pelaa 50 juhlapeliä',
  },
  disney_25: {
    name: 'Disney-entusiasti',
    description: 'Laula 25 Disney-kappaletta',
  },
  disney_50: {
    name: 'Olipa kerran laulu',
    description: 'Laula 50 Disney-kappaletta',
  },
  genres_8: {
    name: 'Genrevaeltaja',
    description: 'Laula kappaleita 8:sta eri genrestä',
  },
  genres_10: {
    name: 'Genreasiantuntija',
    description: 'Laula kappaleita 10:stä eri genrestä',
  },
  clean_sheet: {
    name: 'Nollapeli',
    description: 'Suorita kappale, jossa on 50+ nuottia eikä yhtään hutia',
  },
  weekend_singer: {
    name: 'Viikonloppulaulaja',
    description: 'Suorita kappale lauantaina tai sunnuntaina',
  },
  lunch_break: {
    name: 'Lounastauko',
    description: 'Suorita kappale kello 12:n ja 14:n välisenä aikana',
  },
},
achievementsScreen: {
  title: '🏆 Saavutukset',
  description: 'Avaa saavutuksia pelaamalla!',
  unlocked: 'Avattu',
  xpEarned: 'XP:ää ansaittu',
  completion: 'Suoritusaste',
  all: 'Kaikki',
  categories: {
    performance: 'suoritus',
    progression: 'edistyminen',
    social: 'sosiaalinen',
    special: 'erityinen',
  },
  plusXp: '+{n} XP',
  locked: 'Lukittu',
  viewPlayer: 'Pelaajan saavutukset',
  viewingOther: 'Katsot pelaajan {n} saavutuksia. Jokainen pelaaja avaa omat saavutuksensa.',
  noMatches: 'Mikään saavutus ei vastaa näitä suodattimia',
},
badgeNames: {
  'first-challenge': 'Ensimmäiset askeleet',
  'week-warrior': 'Viikkosoturi',
  'fortnight-fighter': 'Kaksiviikkotappaja',
  'monthly-master': 'Kuukausimestari',
  'top-3': 'Palkintokoroke',
  champion: 'Päivämestari',
  dedicated: 'Omistautunut laulaja',
  legendary: 'Legendaarinen status',
  'century-champion': 'Sadan päivän mestari',
  'yearly-legend': 'Vuosilegenda',
  explorer: 'Haasteiden tutkija',
  songbird: 'Laululintu',
  'weekly-warrior-q': 'Viikkosoturi',
},
badgeDescriptions: {
  'first-challenge': 'Suorita ensimmäinen päivittäinen haasteesi',
  'week-warrior': 'Ylläpidä 7 päivän putkea',
  'fortnight-fighter': 'Ylläpidä 14 päivän putkea',
  'monthly-master': 'Ylläpidä 30 päivän putkea',
  'top-3': 'Sijoitu kolmen parhaan joukkoon päivittäisessä haasteessa',
  champion: 'Voita päivittäinen haaste',
  dedicated: 'Suorita 30 päivittäistä haastetta',
  legendary: 'Saavuta 10 000 kokonais-XP:tä',
  'century-champion': 'Ylläpidä 100 päivän putkea',
  'yearly-legend': 'Ylläpidä 365 päivän putkea',
  explorer: 'Pelaa 5 eri haastetilaa',
  songbird: 'Suorita yhteensä 10 kappaletta',
  'weekly-warrior-q': 'Suorita 3 viikoittaista haastetta',
},
mobileAchievements: {
  first_song: {
    title: 'Ensiaskeleet',
    description: 'Laula ensimmäinen kappaleesi',
  },
  ten_songs: {
    title: 'Nouseva tähti',
    description: 'Laula 10 kappaletta',
  },
  fifty_songs: {
    title: 'Veteraani',
    description: 'Laula 50 kappaletta',
  },
  perfect_score: {
    title: 'Perfektionisti',
    description: 'Saa täydellinen tulos (95%+)',
  },
  five_perfect: {
    title: 'Virheetön',
    description: 'Saa 5 täydellistä tulosta',
  },
  high_score: {
    title: 'Pistemestari',
    description: 'Saavuta 10 000 pistettä yhteensä',
  },
  queue_5: {
    title: 'Soittolistarakentaja',
    description: 'Lisää 5 kappaletta jonoon',
  },
  genre_3: {
    title: 'Tyylilajitutkija',
    description: 'Laula kappaleita 3 eri tyylilajista',
  },
},
challenges: {
  requirements: {
    minLevel: 'Vaatii tason {required} (olet tasolla {current})',
    minSongs: 'Vaatii {required} suoritettua kappaletta (sinulla on {current})',
    achievement: 'Vaatii saavutuksen: {name}',
    rankNoXP: 'Rankkivaatimusta ei voi tarkistaa (ei XP-dataa)',
    unknownRank: 'Tuntematon rankki "{name}"',
    rankRequired: 'Vaatii rankin "{required}" (olet "{current}")',
  },
},
};
