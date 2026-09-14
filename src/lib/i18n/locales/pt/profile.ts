// PT translations — profile

export const profileTranslations = {
profile: {
  title: 'Perfis',
  createCharacter: 'Criar Perfil',
  name: 'Nome',
  namePlaceholder: 'Nome do perfil...',
  country: 'País',
  countryOptional: 'Selecione o País (opcional)',
  avatar: 'Avatar',
  uploadPhoto: 'Enviar Foto',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
  active: 'Ativo',
  selectAsActive: 'Selecionar como Ativo',
  noCharacters: 'Nenhum perfil ainda',
  noCharactersDesc: 'Crie um perfil para acompanhar suas pontuações e progresso!',
  showOnLeaderboard: 'Mostrar no ranking',
  showPhoto: 'Mostrar foto',
  photoUploaded: 'Foto enviada',
  noPhoto: 'Sem foto',
  privacyHint: 'Your scores will be uploaded to the global leaderboard.',
  privacyHintDesc: 'You can opt out at any time in Profile Settings.',
  storageMode: {
    title: 'Armazenamento do perfil',
    local: 'Apenas local',
    localDesc: 'Todos os dados ficam neste dispositivo — sem classificação online, sem sincronização.',
    online: 'Perfil online',
    onlineDesc: 'Junta-te à classificação online, sincroniza entre dispositivos e partilha os resultados diários.',
    localShort: 'Local',
    onlineShort: 'Online',
    settingsDesc: 'Decide se este perfil se junta à classificação online ou fica apenas local. Podes mudar quando quiseres.',
  },
  countrySearch: 'Procurar país…',
  noCountryFound: 'Nenhum país encontrado',
  popularCountries: 'Populares',
  allCountries: 'Todos os países',
},
profileAuth: {
  accountTitle: 'Conta online (opcional)',
  accountDesc: 'Guarda um e-mail e uma palavra-passe para poderes carregar este perfil noutro dispositivo. O início de sessão só é possível dentro da app de karaoke — não existe login na web.',
  email: 'E-mail',
  emailPlaceholder: 'oteu@email.com',
  emailInvalid: 'Introduz um endereço de e-mail válido',
  emailTaken: 'Este e-mail já está registado',
  password: 'Palavra-passe',
  passwordPlaceholder: 'Pelo menos 8 caracteres',
  passwordRepeat: 'Repetir palavra-passe',
  passwordsDontMatch: 'As palavras-passe não coincidem',
  passwordTooShort: 'A palavra-passe tem de ter pelo menos 8 caracteres',
  registerFailed: 'Não foi possível criar a conta online',
  loginTitle: 'Carregar perfil online',
  loginDesc: 'Introduz o e-mail e a palavra-passe do teu perfil online para o carregares neste dispositivo.',
  loginButton: 'Entrar e carregar perfil',
  loginFailed: 'Falha no início de sessão — verifica o e-mail e a palavra-passe',
  loginSuccess: 'Perfil "{n}" carregado com sucesso!',
  noSnapshot: 'Ainda não foram encontrados dados de perfil sincronizados no servidor',
  emailNote: 'Usado apenas para iniciar sessão — nunca é mostrado publicamente',
  changePassword: 'Alterar palavra-passe',
  currentPassword: 'Palavra-passe atual',
  newPassword: 'Nova palavra-passe',
  passwordChanged: 'Palavra-passe alterada com sucesso',
  passwordChangeFailed: 'Não foi possível alterar a palavra-passe',
  hasAccount: 'Conta online ✓',
  registrationPending: 'A criar a conta online…',
  registrationSuccess: 'Conta online criada — agora podes iniciar sessão em qualquer dispositivo',
  registrationSuccessTitle: '🔐 Conta online',
  loginSuccessTitle: '✅ {n}',
},
characterScreen: {
  title: 'Perfil',
  description: 'Crie e gerencie seus perfis de cantor',
  onlineLeaderboard: 'Leaderboard Online',
  createProfile: 'Criar Novo Perfil',
  yourProfiles: 'Seus Perfis ({n})',
  noProfiles: 'Nenhum perfil ainda. Clique em "Criar Novo Perfil" para começar!',
  settingsTitle: 'Configurações de Perfil',
  nameAndAvatar: 'Nome & Avatar',
  rankDisplay: 'Exibição de Rank',
  showRankInName: 'Mostrar rank no nome',
  rankPrefix: 'Prefixo',
  rankSuffix: 'Sufixo',
  rankFull: 'Completo',
  countryAndPrivacy: 'País & Privacidade',
  selectCountry: 'Selecionar País',
  visible: 'Visível',
  hidden: 'Oculto',
  shown: 'Mostrado',
  companionAppLink: 'Link do Companion App',
  companionAppLinkDesc: 'Escaneie este código QR para conectar diretamente com este perfil no companion app.',
  hideQrCode: 'Ocultar Código QR',
  showQrCode: 'Mostrar Código QR',
  leaderboardParticipation: 'Leaderboard Participation',
  leaderboardParticipationDesc: 'Participate in the online leaderboard and share your scores with other players',
  loadProfile: 'Carregar Perfil Online',
},
characterCard: {
  connected: 'Conectado',
  connectedWith: 'Conectado: {n}',
},
profileSync: {
  title: 'Sincronização de Perfil',
  uploadSuccess: 'Perfil enviado! Código de sincronização: {n}',
  uploadFailed: 'Falha no envio',
  downloadFailed: 'Falha ao enviar o perfil',
  invalidCode: 'Por favor, insira um código de sincronização válido de 8 caracteres',
  syncSuccess: 'Perfil sincronizado com sucesso!',
  notFound: 'Perfil não encontrado',
  profileNotFound: 'Perfil não encontrado',
  downloadFailedMsg: 'Falha ao baixar o perfil. Verifique o código de sincronização.',
  syncCode: 'Código de Sincronização:',
  upload: 'Enviar',
  syncCodePlaceholder: 'Código de sincronização',
},
playerProgression: {
  active: 'Ativo',
  inactive: 'Inativo',
  progressToNext: 'Progresso para o Próximo Nível',
  xpNeeded: 'XP necessário',
  songsPlayed: 'Músicas Tocadas',
  goldenNotes: 'Notas Douradas',
  bestCombo: 'Melhor Combo',
  totalScore: 'Pontuação Total',
  achievementsTitle: 'Conquistas',
  more: '+{n} mais',
  beginner: 'Iniciante',
  xp: 'XP',
  lv: 'Nv. {n}',
},
achievements: {
  title: 'Conquistas',
  unlocked: 'Desbloqueado',
  locked: 'Bloqueado',
  progress: 'Progresso',
  noAchievements: 'Nenhuma conquista ainda',
  playToUnlock: 'Jogue músicas para desbloquear conquistas!',
  rarity: 'Raridade',
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Épico',
  legendary: 'Lendário',
  first_note: {
    name: 'Primeira Nota',
    description: 'Acerte sua primeira nota',
  },
  perfect_ten: {
    name: 'Dez Perfeitas',
    description: 'Consiga 10 acertos Perfeitos em uma única música',
  },
  combo_master: {
    name: 'Mestre do Combo',
    description: 'Alcance um combo de 50 notas',
  },
  combo_king: {
    name: 'Rei do Combo',
    description: 'Alcance um combo de 100 notas',
  },
  combo_legend: {
    name: 'Lenda do Combo',
    description: 'Alcance um combo de 200 notas',
  },
  perfect_song: {
    name: 'Música Perfeita',
    description: 'Consiga 99,5%+ de precisão em uma música',
  },
  accuracy_90: {
    name: 'Pitch Perfeito',
    description: 'Consiga mais de 90% de precisão',
  },
  score_8k: {
    name: 'Estrela em Ascensão',
    description: 'Pontue mais de 8.000 pontos',
  },
  score_9k: {
    name: 'Mestre da Pontuação',
    description: 'Pontue mais de 9.000 pontos',
  },
  score_9500: {
    name: 'Impecável',
    description: 'Pontue mais de 9.500 pontos',
  },
  golden_collector: {
    name: 'Colecionador Dourado',
    description: 'Acerte 10 notas douradas',
  },
  golden_master: {
    name: 'Mestre Dourado',
    description: 'Acerte 50 notas douradas',
  },
  first_song: {
    name: 'Primeiros Passos',
    description: 'Complete sua primeira música',
  },
  ten_songs: {
    name: 'Entusiasta do Karaokê',
    description: 'Complete 10 músicas',
  },
  fifty_songs: {
    name: 'Frequentador do Karaokê',
    description: 'Complete 50 músicas',
  },
  hundred_songs: {
    name: 'Lenda do Karaokê',
    description: 'Complete 100 músicas',
  },
  five_games: {
    name: 'Começando',
    description: 'Jogue 5 partidas',
  },
  twenty_games: {
    name: 'Cantor Dedicado',
    description: 'Jogue 20 partidas',
  },
  party_time: {
    name: 'Hora da Festa!',
    description: 'Jogue um modo de festa',
  },
  duel_winner: {
    name: 'Campeão do Duelo',
    description: 'Vença um duelo',
  },
  pass_the_mic: {
    name: 'Passa o Mic!',
    description: 'Jogue o modo Passa o Mic',
  },
  shower_singer: {
    name: 'Cantor de Banho',
    description: 'Pontue menos de 20% em uma música',
  },
  comeback_king: {
    name: 'Rei da Virada',
    description: 'Faça um combo de 50+ após errar 10 notas',
  },
  speed_demon: {
    name: 'Demônio da Velocidade',
    description: 'Complete uma música a 1,5x de velocidade',
  },
  blind_master: {
    name: 'Mestre às Cegas',
    description: 'Complete uma música no modo Karaoke às Cegas',
  },
  daily_starter: {
    name: 'Estreante Diário',
    description: 'Completa o teu primeiro desafio diário',
  },
  daily_regular: {
    name: 'Habitual Diário',
    description: 'Completa 10 desafios diários',
  },
  daily_devoted: {
    name: 'Dedicado Diário',
    description: 'Completa 50 desafios diários',
  },
  streak_week: {
    name: 'Em Chamas',
    description: 'Mantém uma sequência diária de 7 dias',
  },
  streak_month: {
    name: 'Imparável',
    description: 'Mantém uma sequência diária de 30 dias',
  },
  weekly_warrior: {
    name: 'Guerreiro Semanal',
    description: 'Completa 5 desafios semanais',
  },
  accuracy_95: {
    name: 'Cantor de Precisão',
    description: 'Obtém mais de 95% de precisão',
  },
  golden_rush: {
    name: 'Corrida ao Ouro',
    description: 'Acerta 20 notas douradas numa única música',
  },
  golden_hundred: {
    name: 'Centurião Dourado',
    description: 'Acerta 100 notas douradas no total',
  },
  perfect_fifty: {
    name: 'Cinquenta Perfeitas',
    description: 'Acerta 50 notas perfeitas numa única música',
  },
  lightning_lips: {
    name: 'Lábios Relâmpago',
    description: 'Completa uma música a 2x de velocidade',
  },
  duet_harmony: {
    name: 'Harmonia Perfeita',
    description: 'Canta 10 duetos',
  },
  genre_explorer: {
    name: 'Explorador de Géneros',
    description: 'Canta músicas de 5 géneros diferentes',
  },
  disney_fan: {
    name: 'Fã de Disney',
    description: 'Canta 10 músicas Disney',
  },
  night_owl: {
    name: 'Coruja Noturna',
    description: 'Termina uma música entre a meia-noite e as 4 da manhã',
  },
  early_bird: {
    name: 'Madrugador',
    description: 'Termina uma música antes das 8 da manhã',
  },
  marathon_singer: {
    name: 'Cantor Maratonista',
    description: 'Joga 5 partidas num só dia',
  },

  // ── Expansão para 100 conquistas ──
  score_9800: {
    name: 'Estrela Ultra',
    description: 'Pontua mais de 9.800 pontos',
  },
  score_9900: {
    name: 'Além da Perfeição',
    description: 'Pontua mais de 9.900 pontos',
  },
  combo_300: {
    name: 'Titã do Combo',
    description: 'Alcança um combo de 300 notas',
  },
  combo_500: {
    name: 'Imortal do Combo',
    description: 'Alcança um combo de 500 notas',
  },
  accuracy_92: {
    name: 'Afinamento Fino',
    description: 'Obtém mais de 92% de precisão',
  },
  accuracy_94: {
    name: 'Qualidade de Estúdio',
    description: 'Obtém mais de 94% de precisão',
  },
  accuracy_96: {
    name: 'Tiro Certeiro',
    description: 'Obtém mais de 96% de precisão',
  },
  accuracy_97: {
    name: 'Precisão Laser',
    description: 'Obtém mais de 97% de precisão',
  },
  accuracy_98: {
    name: 'Virtuoso',
    description: 'Obtém mais de 98% de precisão',
  },
  perfect_75: {
    name: 'Setenta e Cinco Perfeitas',
    description: 'Acerta 75 notas perfeitas numa única música',
  },
  perfect_100: {
    name: 'Centena Perfeita',
    description: 'Acerta 100 notas perfeitas numa única música',
  },
  perfect_150: {
    name: 'Tempestade Perfeita',
    description: 'Acerta 150 notas perfeitas numa única música',
  },
  golden_30: {
    name: 'Maré Dourada',
    description: 'Acerta 30 notas douradas numa única música',
  },
  golden_40: {
    name: 'Sinfonia Dourada',
    description: 'Acerta 40 notas douradas numa única música',
  },
  perfect_500: {
    name: 'Máquina Perfeita',
    description: 'Acerta 500 notas perfeitas no total',
  },
  perfect_1000: {
    name: 'Potência de Precisão',
    description: 'Acerta 1.000 notas perfeitas no total',
  },
  perfect_5000: {
    name: 'Avalanche Perfeita',
    description: 'Acerta 5.000 notas perfeitas no total',
  },
  perfect_10000: {
    name: 'Dez Mil Perfeitas',
    description: 'Acerta 10.000 notas perfeitas no total',
  },
  golden_250: {
    name: 'Colheita Dourada',
    description: 'Acerta 250 notas douradas no total',
  },
  golden_1000: {
    name: 'Aguaceiro Dourado',
    description: 'Acerta 1.000 notas douradas no total',
  },
  golden_5000: {
    name: 'Voz de Midas',
    description: 'Acerta 5.000 notas douradas no total',
  },
  songs_250: {
    name: 'Veterano do Cancioneiro',
    description: 'Completa 250 músicas',
  },
  songs_500: {
    name: 'Clube do Meio Milhar',
    description: 'Completa 500 músicas',
  },
  songs_1000: {
    name: 'Lenda das Mil Músicas',
    description: 'Completa 1.000 músicas',
  },
  games_50: {
    name: 'Cantor Frequente',
    description: 'Joga 50 partidas',
  },
  games_100: {
    name: 'Clube da Centena',
    description: 'Joga 100 partidas',
  },
  games_250: {
    name: 'Habitual da Arcada',
    description: 'Joga 250 partidas',
  },
  games_500: {
    name: 'Maníaco da Maratona',
    description: 'Joga 500 partidas',
  },
  level_25: {
    name: 'Cantor Experiente',
    description: 'Alcança o nível 25',
  },
  level_50: {
    name: 'Vocalista de Elite',
    description: 'Alcança o nível 50',
  },
  level_100: {
    name: 'Lenda do Nível 100',
    description: 'Alcança o nível 100',
  },
  daily_100: {
    name: 'Centurião Diário',
    description: 'Completa 100 desafios diários',
  },
  daily_250: {
    name: 'Fanático Diário',
    description: 'Completa 250 desafios diários',
  },
  daily_500: {
    name: 'Imortal Diário',
    description: 'Completa 500 desafios diários',
  },
  streak_60: {
    name: 'Vontade de Ferro',
    description: 'Mantém uma sequência diária de 60 dias',
  },
  streak_100: {
    name: 'Herói dos Cem Dias',
    description: 'Mantém uma sequência diária de 100 dias',
  },
  streak_180: {
    name: 'Devoção de Meio Ano',
    description: 'Mantém uma sequência diária de 180 dias',
  },
  streak_365: {
    name: 'Lenda Anual',
    description: 'Mantém uma sequência diária de 365 dias',
  },
  weekly_15: {
    name: 'Inabalável Semanal',
    description: 'Completa 15 desafios semanais',
  },
  weekly_30: {
    name: 'Pilar Semanal',
    description: 'Completa 30 desafios semanais',
  },
  weekly_52: {
    name: 'Um Ano de Semanas',
    description: 'Completa 52 desafios semanais',
  },
  encore_10: {
    name: 'Bis!',
    description: 'Joga 10 partidas num só dia',
  },
  duets_25: {
    name: 'Devoto dos Duetos',
    description: 'Canta 25 duetos',
  },
  duets_50: {
    name: 'Duo Dinâmico',
    description: 'Canta 50 duetos',
  },
  duets_100: {
    name: 'Centena de Duetos',
    description: 'Canta 100 duetos',
  },
  duels_5: {
    name: 'Duelista',
    description: 'Vence 5 duelos',
  },
  duels_10: {
    name: 'Mestre dos Duelos',
    description: 'Vence 10 duelos',
  },
  duels_25: {
    name: 'Senhor dos Duelos',
    description: 'Vence 25 duelos',
  },
  party_10: {
    name: 'Animal de Festa',
    description: 'Joga 10 jogos de festa',
  },
  party_25: {
    name: 'Alma da Festa',
    description: 'Joga 25 jogos de festa',
  },
  party_50: {
    name: 'Lenda da Festa',
    description: 'Joga 50 jogos de festa',
  },
  disney_25: {
    name: 'Entusiasta da Disney',
    description: 'Canta 25 músicas Disney',
  },
  disney_50: {
    name: 'Era Uma Vez uma Canção',
    description: 'Canta 50 músicas Disney',
  },
  genres_8: {
    name: 'Andarilho de Géneros',
    description: 'Canta músicas de 8 géneros diferentes',
  },
  genres_10: {
    name: 'Conhecedor de Géneros',
    description: 'Canta músicas de 10 géneros diferentes',
  },
  clean_sheet: {
    name: 'Registo Limpo',
    description: 'Termina uma música com mais de 50 notas e zero erros',
  },
  weekend_singer: {
    name: 'Cantor de Fim de Semana',
    description: 'Termina uma música ao sábado ou domingo',
  },
  lunch_break: {
    name: 'Pausa para o Almoço',
    description: 'Termina uma música entre as 12 e as 14 horas',
  },
},
achievementsScreen: {
  title: '🏆 Conquistas',
  description: 'Desbloqueie conquistas jogando!',
  unlocked: 'Desbloqueado',
  xpEarned: 'XP Ganho',
  completion: 'Conclusão',
  all: 'Todas',
  categories: {
    performance: 'desempenho',
    progression: 'progressão',
    social: 'social',
    special: 'especial',
  },
  plusXp: '+{n} XP',
  locked: 'Bloqueado',
  viewPlayer: 'Conquistas de',
  viewingOther: 'Estás a ver as conquistas de {n}. Cada jogador desbloqueia as suas próprias conquistas.',
  noMatches: 'Nenhuma conquista corresponde a estes filtros',
},
badgeNames: {
  'first-challenge': 'Primeiros Passos',
  'week-warrior': 'Guerreiro Semanal',
  'fortnight-fighter': 'Combatente Quinzenal',
  'monthly-master': 'Mestre Mensal',
  'top-3': 'Lugar de Pódio',
  champion: 'Campeão Diário',
  dedicated: 'Cantor Dedicado',
  legendary: 'Status Lendário',
  'century-champion': 'Campeão do Século',
  'yearly-legend': 'Lenda Anual',
  explorer: 'Explorador de Desafios',
  songbird: 'Pássaro Cantor',
  'weekly-warrior-q': 'Guerreiro Semanal',
},
badgeDescriptions: {
  'first-challenge': 'Completa o teu primeiro desafio diário',
  'week-warrior': 'Mantém uma sequência de 7 dias',
  'fortnight-fighter': 'Mantém uma sequência de 14 dias',
  'monthly-master': 'Mantém uma sequência de 30 dias',
  'top-3': 'Termina no top 3 de um desafio diário',
  champion: 'Ganha um desafio diário',
  dedicated: 'Completa 30 desafios diários',
  legendary: 'Alcança 10.000 XP no total',
  'century-champion': 'Mantém uma sequência de 100 dias',
  'yearly-legend': 'Mantém uma sequência de 365 dias',
  explorer: 'Joga 5 modos de desafio diferentes',
  songbird: 'Completa 10 músicas no total',
  'weekly-warrior-q': 'Completa 3 desafios semanais',
},
mobileAchievements: {
  first_song: {
    title: 'Primeiros Passos',
    description: 'Cante sua primeira música',
  },
  ten_songs: {
    title: 'Estrela em Ascensão',
    description: 'Cante 10 músicas',
  },
  fifty_songs: {
    title: 'Veterano',
    description: 'Cante 50 músicas',
  },
  perfect_score: {
    title: 'Perfeccionista',
    description: 'Consiga uma pontuação perfeita (95%+)',
  },
  five_perfect: {
    title: 'Impecável',
    description: 'Consiga 5 pontuações perfeitas',
  },
  high_score: {
    title: 'Mestre da Pontuação',
    description: 'Alcance 10.000 pontos no total',
  },
  queue_5: {
    title: 'Montador de Playlist',
    description: 'Adicione 5 músicas na queue',
  },
  genre_3: {
    title: 'Explorador de Gêneros',
    description: 'Cante músicas de 3 gêneros diferentes',
  },
},
challenges: {
  requirements: {
    minLevel: 'Requer nível {required} (você é nível {current})',
    minSongs: 'Requer {required} músicas completadas (você tem {current})',
    achievement: 'Requer conquista: {name}',
    rankNoXP: 'Não é possível verificar o requisito de rank (sem dados de XP disponíveis)',
    unknownRank: 'Rank desconhecido "{name}"',
    rankRequired: 'Requer rank "{required}" (você é "{current}")',
  },
},
};
