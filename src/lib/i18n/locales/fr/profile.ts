// FR translations — profile

export const profileTranslations = {
profile: {
  title: 'Profils',
  createCharacter: 'Créer un Profil',
  name: 'Nom',
  namePlaceholder: 'Nom du profil...',
  country: 'Pays',
  countryOptional: 'Sélectionner le pays (facultatif)',
  avatar: 'Avatar',
  uploadPhoto: 'Télécharger une Photo',
  create: 'Créer',
  edit: 'Modifier',
  delete: 'Supprimer',
  active: 'Actif',
  selectAsActive: 'Sélectionner comme Actif',
  noCharacters: 'Pas encore de profils',
  noCharactersDesc: 'Créez un profil pour suivre vos scores et votre progression!',
  showOnLeaderboard: 'Afficher sur le classement',
  showPhoto: 'Afficher la photo',
  photoUploaded: 'Photo téléchargée',
  noPhoto: 'Pas de photo',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Stockage du profil',
    local: 'Local uniquement',
    localDesc: 'Toutes les données restent sur cet appareil — pas de classement en ligne, pas de synchronisation.',
    online: 'Profil en ligne',
    onlineDesc: 'Rejoins le classement en ligne, synchronise tes appareils et partage tes résultats quotidiens.',
    localShort: 'Local',
    onlineShort: 'En ligne',
    settingsDesc: 'Décide si ce profil rejoint le classement en ligne ou reste uniquement local. Modifiable à tout moment.',
  },
  countrySearch: 'Rechercher un pays…',
  noCountryFound: 'Aucun pays trouvé',
  popularCountries: 'Populaires',
  allCountries: 'Tous les pays',
},
profileAuth: {
  accountTitle: 'Compte en ligne (facultatif)',
  accountDesc: 'Enregistre un e-mail et un mot de passe pour pouvoir charger ce profil sur un autre appareil. La connexion n\'est possible que dans l\'app de karaoké — il n\'y a pas de connexion web.',
  email: 'E-mail',
  emailPlaceholder: 'votre@email.com',
  emailInvalid: 'Saisis une adresse e-mail valide',
  emailTaken: 'Cette adresse e-mail est déjà enregistrée',
  password: 'Mot de passe',
  passwordPlaceholder: 'Au moins 8 caractères',
  passwordRepeat: 'Répéter le mot de passe',
  passwordsDontMatch: 'Les mots de passe ne correspondent pas',
  passwordTooShort: 'Le mot de passe doit contenir au moins 8 caractères',
  registerFailed: 'Impossible de créer le compte en ligne',
  loginTitle: 'Charger le profil en ligne',
  loginDesc: 'Saisis l\'e-mail et le mot de passe de ton profil en ligne pour le charger sur cet appareil.',
  loginButton: 'Se connecter et charger le profil',
  loginFailed: 'Connexion échouée — vérifie l\'e-mail et le mot de passe',
  loginSuccess: 'Profil "{n}" chargé avec succès !',
  noSnapshot: 'Aucune donnée de profil synchronisée trouvée sur le serveur pour le moment',
  emailNote: 'Utilisé uniquement pour la connexion — jamais affiché publiquement',
  changePassword: 'Changer le mot de passe',
  currentPassword: 'Mot de passe actuel',
  newPassword: 'Nouveau mot de passe',
  passwordChanged: 'Mot de passe modifié avec succès',
  passwordChangeFailed: 'Impossible de changer le mot de passe',
  hasAccount: 'Compte en ligne ✓',
  registrationPending: 'Création du compte en ligne…',
  registrationSuccess: 'Compte en ligne créé — tu peux maintenant te connecter sur n\'importe quel appareil',
  registrationSuccessTitle: '🔐 Compte en ligne',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Profil',
  description: 'Créez et gérez vos profils de chanteur',
  onlineLeaderboard: 'Classement en Ligne',
  createProfile: 'Créer un Nouveau Profil',
  yourProfiles: 'Vos Profils ({n})',
  noProfiles: 'Pas encore de profils. Cliquez sur "Créer un Nouveau Profil" pour commencer !',
  settingsTitle: 'Paramètres du Profil',
  nameAndAvatar: 'Nom et Avatar',
  rankDisplay: 'Affichage du Rang',
  showRankInName: 'Afficher le rang dans le nom',
  rankPrefix: 'Préfixe',
  rankSuffix: 'Suffixe',
  rankFull: 'Complet',
  countryAndPrivacy: 'Pays et Confidentialité',
  selectCountry: 'Sélectionner le Pays',
  visible: 'Visible',
  hidden: 'Masqué',
  shown: 'Affiché',
  companionAppLink: 'Lien de l\'App Compagnon',
  companionAppLinkDesc: 'Scannez ce QR code pour vous connecter directement avec ce profil dans l\'app compagnon.',
  hideQrCode: 'Masquer le QR Code',
  showQrCode: 'Afficher le QR Code',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Charger le Profil en Ligne',
},
characterCard: {
  connected: 'Connecté',
  connectedWith: 'Connecté : {n}',
},
profileSync: {
  title: 'Synchronisation du Profil',
  uploadSuccess: 'Profil téléchargé ! Code de sync : {n}',
  uploadFailed: 'Échec de l\'envoi',
  downloadFailed: 'Échec du téléchargement du profil',
  invalidCode: 'Veuillez entrer un code de sync valide de 8 caractères',
  syncSuccess: 'Profil synchronisé avec succès !',
  notFound: 'Profil non trouvé',
  profileNotFound: 'Profil introuvable',
  downloadFailedMsg: 'Échec du téléchargement du profil. Vérifiez le code de sync.',
  syncCode: 'Code de Synchronisation :',
  upload: 'Envoyer',
  syncCodePlaceholder: 'Code de sync',
},
playerProgression: {
  active: 'Actif',
  inactive: 'Inactif',
  progressToNext: 'Progrès vers le Niveau Suivant',
  xpNeeded: 'XP nécessaire',
  songsPlayed: 'Chansons Jouées',
  goldenNotes: 'Notes Dorées',
  bestCombo: 'Meilleur Combo',
  totalScore: 'Score Total',
  achievementsTitle: 'Succès',
  more: '+{n} autres',
  beginner: 'Débutant',
  xp: 'XP',
  lv: 'Niv. {n}',
},
achievements: {
  title: 'Succès',
  unlocked: 'Débloqué',
  locked: 'Verrouillé',
  progress: 'Progression',
  noAchievements: 'Pas encore de succès',
  playToUnlock: 'Jouez des chansons pour débloquer des succès!',
  rarity: 'Rareté',
  common: 'Commun',
  uncommon: 'Peu Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
  first_note: {
    name: 'Première Note',
    description: 'Touche ta première note',
  },
  perfect_ten: {
    name: 'Dix Parfaits',
    description: 'Obtiens 10 Parfaits dans une seule chanson',
  },
  combo_master: {
    name: 'Master du Combo',
    description: 'Atteins un combo de 50 notes',
  },
  combo_king: {
    name: 'Roi du Combo',
    description: 'Atteins un combo de 100 notes',
  },
  combo_legend: {
    name: 'Légende du Combo',
    description: 'Atteins un combo de 200 notes',
  },
  perfect_song: {
    name: 'Chanson Parfaite',
    description: 'Obtiens 99.5%+ de précision sur une chanson',
  },
  accuracy_90: {
    name: 'Justesse Parfaite',
    description: 'Dépasse les 90% de précision',
  },
  score_8k: {
    name: 'Étoile Montante',
    description: 'Dépasse les 8 000 points',
  },
  score_9k: {
    name: 'Maître du Score',
    description: 'Dépasse les 9 000 points',
  },
  score_9500: {
    name: 'Sans Faute',
    description: 'Dépasse les 9 500 points',
  },
  golden_collector: {
    name: 'Collectionneur Doré',
    description: 'Touche 10 notes dorées',
  },
  golden_master: {
    name: 'Maître Doré',
    description: 'Touche 50 notes dorées',
  },
  first_song: {
    name: 'Premiers Pas',
    description: 'Termine ta première chanson',
  },
  ten_songs: {
    name: 'Passionné de Karaoké',
    description: 'Termine 10 chansons',
  },
  fifty_songs: {
    name: 'Régulier du Karaoké',
    description: 'Termine 50 chansons',
  },
  hundred_songs: {
    name: 'Légende du Karaoké',
    description: 'Termine 100 chansons',
  },
  five_games: {
    name: 'Premiers Pas',
    description: 'Joue 5 parties',
  },
  twenty_games: {
    name: 'Chanteur Dévoué',
    description: 'Joue 20 parties',
  },
  party_time: {
    name: 'C\'est la Fête !',
    description: 'Joue à un mode party',
  },
  duel_winner: {
    name: 'Champion du Duel',
    description: 'Gagne un duel',
  },
  pass_the_mic: {
    name: 'Pass the Mic !',
    description: 'Joue au mode Pass the Mic',
  },
  shower_singer: {
    name: 'Chanteur de Douche',
    description: 'Obtiens moins de 20% sur une chanson',
  },
  comeback_king: {
    name: 'Roi du Comeback',
    description: 'Enchaîne un combo de 50+ après avoir raté 10 notes',
  },
  speed_demon: {
    name: 'Démon de Vitesse',
    description: 'Termine une chanson à 1.5x la vitesse',
  },
  blind_master: {
    name: 'Master du Blind',
    description: 'Termine une chanson en mode Blind Karaoke',
  },
  daily_starter: {
    name: 'Débutant du Quotidien',
    description: 'Termine ton premier défi quotidien',
  },
  daily_regular: {
    name: 'Habitué du Quotidien',
    description: 'Termine 10 défis quotidiens',
  },
  daily_devoted: {
    name: 'Fidèle du Quotidien',
    description: 'Termine 50 défis quotidiens',
  },
  streak_week: {
    name: 'En Feu',
    description: 'Garde une série quotidienne de 7 jours',
  },
  streak_month: {
    name: 'Imparable',
    description: 'Garde une série quotidienne de 30 jours',
  },
  weekly_warrior: {
    name: 'Guerrier Hebdo',
    description: 'Termine 5 défis hebdomadaires',
  },
  accuracy_95: {
    name: 'Chanteur de Précision',
    description: 'Dépasse les 95% de précision',
  },
  golden_rush: {
    name: 'Ruée vers l\'Or',
    description: 'Touche 20 notes dorées en une seule chanson',
  },
  golden_hundred: {
    name: 'Centurion Doré',
    description: 'Touche 100 notes dorées au total',
  },
  perfect_fifty: {
    name: 'Cinquante Parfaites',
    description: 'Touche 50 notes parfaites en une seule chanson',
  },
  lightning_lips: {
    name: 'Lèvres de l\'Éclair',
    description: 'Termine une chanson à une vitesse 2x',
  },
  duet_harmony: {
    name: 'Harmonie Parfaite',
    description: 'Chante 10 duos',
  },
  genre_explorer: {
    name: 'Explorateur de Genres',
    description: 'Chante des chansons de 5 genres différents',
  },
  disney_fan: {
    name: 'Fan de Disney',
    description: 'Chante 10 chansons Disney',
  },
  night_owl: {
    name: 'Chouette Nocturne',
    description: 'Termine une chanson entre minuit et 4 heures du matin',
  },
  early_bird: {
    name: 'Lève-tôt',
    description: 'Termine une chanson avant 8 heures du matin',
  },
  marathon_singer: {
    name: 'Chanteur Marathonien',
    description: 'Joue 5 parties en une seule journée',
  },

  // ── Extension à 100 succès ──
  score_9800: {
    name: 'Étoile Ultra',
    description: 'Dépasse les 9 800 points',
  },
  score_9900: {
    name: 'Au-Delà de la Perfection',
    description: 'Dépasse les 9 900 points',
  },
  combo_300: {
    name: 'Titan du Combo',
    description: 'Atteins un combo de 300 notes',
  },
  combo_500: {
    name: 'Combo Immortel',
    description: 'Atteins un combo de 500 notes',
  },
  accuracy_92: {
    name: 'Réglage Fin',
    description: 'Dépasse les 92% de précision',
  },
  accuracy_94: {
    name: 'Qualité Studio',
    description: 'Dépasse les 94% de précision',
  },
  accuracy_96: {
    name: 'Tireur d\'Élite',
    description: 'Dépasse les 96% de précision',
  },
  accuracy_97: {
    name: 'Précision Laser',
    description: 'Dépasse les 97% de précision',
  },
  accuracy_98: {
    name: 'Virtuose',
    description: 'Dépasse les 98% de précision',
  },
  perfect_75: {
    name: 'Soixante-Quinze Parfaites',
    description: 'Obtiens 75 notes parfaites en une seule chanson',
  },
  perfect_100: {
    name: 'Cent Parfaites',
    description: 'Obtiens 100 notes parfaites en une seule chanson',
  },
  perfect_150: {
    name: 'Tempête Parfaite',
    description: 'Obtiens 150 notes parfaites en une seule chanson',
  },
  golden_30: {
    name: 'Marée Dorée',
    description: 'Touche 30 notes dorées en une seule chanson',
  },
  golden_40: {
    name: 'Symphonie Dorée',
    description: 'Touche 40 notes dorées en une seule chanson',
  },
  perfect_500: {
    name: 'Machine Parfaite',
    description: 'Touche 500 notes parfaites au total',
  },
  perfect_1000: {
    name: 'Canon de Précision',
    description: 'Touche 1 000 notes parfaites au total',
  },
  perfect_5000: {
    name: 'Avalanche Parfaite',
    description: 'Touche 5 000 notes parfaites au total',
  },
  perfect_10000: {
    name: 'Dix Mille Parfaites',
    description: 'Touche 10 000 notes parfaites au total',
  },
  golden_250: {
    name: 'Récolte Dorée',
    description: 'Touche 250 notes dorées au total',
  },
  golden_1000: {
    name: 'Averse Dorée',
    description: 'Touche 1 000 notes dorées au total',
  },
  golden_5000: {
    name: 'Voix de Midas',
    description: 'Touche 5 000 notes dorées au total',
  },
  songs_250: {
    name: 'Vétéran du Répertoire',
    description: 'Termine 250 chansons',
  },
  songs_500: {
    name: 'Club des Cinq Cents',
    description: 'Termine 500 chansons',
  },
  songs_1000: {
    name: 'Légende des Mille Chansons',
    description: 'Termine 1 000 chansons',
  },
  games_50: {
    name: 'Chanteur Assidu',
    description: 'Joue 50 parties',
  },
  games_100: {
    name: 'Club des Cent',
    description: 'Joue 100 parties',
  },
  games_250: {
    name: 'Habitué de la Salle d\'Arcade',
    description: 'Joue 250 parties',
  },
  games_500: {
    name: 'Maniaque du Marathon',
    description: 'Joue 500 parties',
  },
  level_25: {
    name: 'Chanteur Averti',
    description: 'Atteins le niveau 25',
  },
  level_50: {
    name: 'Vocaliste d\'Élite',
    description: 'Atteins le niveau 50',
  },
  level_100: {
    name: 'Légende Niveau 100',
    description: 'Atteins le niveau 100',
  },
  daily_100: {
    name: 'Centurion du Quotidien',
    description: 'Termine 100 défis quotidiens',
  },
  daily_250: {
    name: 'Acharné du Quotidien',
    description: 'Termine 250 défis quotidiens',
  },
  daily_500: {
    name: 'Immortel du Quotidien',
    description: 'Termine 500 défis quotidiens',
  },
  streak_60: {
    name: 'Volonté de Fer',
    description: 'Garde une série quotidienne de 60 jours',
  },
  streak_100: {
    name: 'Héros des Cent Jours',
    description: 'Garde une série quotidienne de 100 jours',
  },
  streak_180: {
    name: 'Dévotion Semi-Annuelle',
    description: 'Garde une série quotidienne de 180 jours',
  },
  streak_365: {
    name: 'Légende Annuelle',
    description: 'Garde une série quotidienne de 365 jours',
  },
  weekly_15: {
    name: 'Valeur Sûre Hebdo',
    description: 'Termine 15 défis hebdomadaires',
  },
  weekly_30: {
    name: 'Pilier Hebdo',
    description: 'Termine 30 défis hebdomadaires',
  },
  weekly_52: {
    name: 'Une Année de Semaines',
    description: 'Termine 52 défis hebdomadaires',
  },
  encore_10: {
    name: 'Rappel !',
    description: 'Joue 10 parties en une seule journée',
  },
  duets_25: {
    name: 'Dévoué aux Duos',
    description: 'Chante 25 duos',
  },
  duets_50: {
    name: 'Duo Dynamique',
    description: 'Chante 50 duos',
  },
  duets_100: {
    name: 'Centurion des Duos',
    description: 'Chante 100 duos',
  },
  duels_5: {
    name: 'Duelliste',
    description: 'Gagne 5 duels',
  },
  duels_10: {
    name: 'Maître du Duel',
    description: 'Gagne 10 duels',
  },
  duels_25: {
    name: 'Seigneur du Duel',
    description: 'Gagne 25 duels',
  },
  party_10: {
    name: 'Bête de Fête',
    description: 'Joue à 10 parties en mode fête',
  },
  party_25: {
    name: 'Âme de la Fête',
    description: 'Joue à 25 parties en mode fête',
  },
  party_50: {
    name: 'Légende de la Fête',
    description: 'Joue à 50 parties en mode fête',
  },
  disney_25: {
    name: 'Passionné de Disney',
    description: 'Chante 25 chansons Disney',
  },
  disney_50: {
    name: 'Il Était une Chanson',
    description: 'Chante 50 chansons Disney',
  },
  genres_8: {
    name: 'Vagabond des Genres',
    description: 'Chante des chansons de 8 genres différents',
  },
  genres_10: {
    name: 'Fin Connaisseur des Genres',
    description: 'Chante des chansons de 10 genres différents',
  },
  clean_sheet: {
    name: 'Zéro Faute',
    description: 'Termine une chanson avec 50+ notes et zéro erreur',
  },
  weekend_singer: {
    name: 'Chanteur du Week-End',
    description: 'Termine une chanson un samedi ou un dimanche',
  },
  lunch_break: {
    name: 'Pause Déjeuner',
    description: 'Termine une chanson entre 12h et 14h',
  },
},
achievementsScreen: {
  title: '🏆 Succès',
  description: 'Débloquez des succès en jouant !',
  unlocked: 'Débloqué',
  xpEarned: 'XP Gagnés',
  completion: 'Complétion',
  all: 'Tous',
  categories: {
    performance: 'Performance',
    progression: 'Progression',
    social: 'Social',
    special: 'Spécial',
  },
  plusXp: '+{n} XP',
  locked: 'Verrouillé',
  viewPlayer: 'Succès de',
  viewingOther: 'Tu regardes les succès de {n}. Chaque joueur débloque ses propres succès.',
  noMatches: 'Aucun succès ne correspond à ces filtres',
},
badgeNames: {
  'first-challenge': 'Premiers Pas',
  'week-warrior': 'Guerrier de la Semaine',
  'fortnight-fighter': 'Combattant Fortnight',
  'monthly-master': 'Maître du Mois',
  'top-3': 'Place de Podium',
  champion: 'Champion du Jour',
  dedicated: 'Chanteur Dévoué',
  legendary: 'Statut Légendaire',
  'century-champion': 'Champion du Siècle',
  'yearly-legend': 'Légende Annuelle',
  explorer: 'Explorateur de Défis',
  songbird: 'Rossignol',
  'weekly-warrior-q': 'Guerrier Hebdomadaire',
},
badgeDescriptions: {
  'first-challenge': 'Complète ton premier défi quotidien',
  'week-warrior': 'Maintiens une série de 7 jours',
  'fortnight-fighter': 'Maintiens une série de 14 jours',
  'monthly-master': 'Maintiens une série de 30 jours',
  'top-3': 'Termine dans le top 3 d\'un défi quotidien',
  champion: 'Gagne un défi quotidien',
  dedicated: 'Complète 30 défis quotidiens',
  legendary: 'Atteins 10 000 XP au total',
  'century-champion': 'Maintiens une série de 100 jours',
  'yearly-legend': 'Maintiens une série de 365 jours',
  explorer: 'Joue 5 modes de défi différents',
  songbird: 'Complète 10 chansons au total',
  'weekly-warrior-q': 'Complète 3 défis hebdomadaires',
},
mobileAchievements: {
  first_song: {
    title: 'Premiers Pas',
    description: 'Chante ta première chanson',
  },
  ten_songs: {
    title: 'Étoile Montante',
    description: 'Chante 10 chansons',
  },
  fifty_songs: {
    title: 'Vétéran',
    description: 'Chante 50 chansons',
  },
  perfect_score: {
    title: 'Perfectionniste',
    description: 'Obtiens un score parfait (95%+)',
  },
  five_perfect: {
    title: 'Sans Faute',
    description: 'Obtiens 5 scores parfaits',
  },
  high_score: {
    title: 'Maître du Score',
    description: 'Atteins 10 000 points au total',
  },
  queue_5: {
    title: 'Constructeur de Playlist',
    description: 'Ajoute 5 chansons à la queue',
  },
  genre_3: {
    title: 'Explorateur de Genres',
    description: 'Chante des chansons de 3 genres différents',
  },
},
challenges: {
  requirements: {
    minLevel: 'Niveau {required} requis (tu es niveau {current})',
    minSongs: '{required} chansons terminées requises (tu en as {current})',
    achievement: 'Succès requis : {name}',
    rankNoXP: 'Le rang requis ne peut pas être vérifié (pas de données XP)',
    unknownRank: 'Rang inconnu "{name}"',
    rankRequired: 'Rang "{required}" requis (tu es "{current}")',
  },
},
};
