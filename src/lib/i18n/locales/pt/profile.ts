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
    signOutButton: 'Sair neste dispositivo',
    signOutTitle: 'Sair neste dispositivo?',
    signOutText: 'O teu perfil online fica — apenas os dados deste dispositivo são removidos: perfil, avatar, recordes locais, progresso de desafios diários e missões, e envios pendentes.',
    signOutHintAccount: 'Podes voltar a iniciar sessão a qualquer momento com o e-mail e a palavra-passe.',
    signOutConfirm: 'Sair e remover',
    signOutSuccess: 'Perfil removido deste dispositivo — os teus dados online ficam intactos.',
    signOutUploading: 'A enviar envios pendentes…',
    signOutUploadsFailed: 'Não foi possível transferir {n} envios de pontuações pendentes (servidor inacessível). Serão descartados se continuares.',
    signOutForce: 'Sair mesmo assim',
    pendingUploadsInfo: '{n} envios de pontuações pendentes serão enviados para o servidor antes da remoção.',
    deleteLocalTitle: 'Eliminar o perfil definitivamente?',
    deleteLocalText: 'O perfil será removido com todos os dados locais: recordes, progresso de desafios diários e missões, e avatar. Não há cópia online — não é possível desfazer.',
    deleteLocalConfirm: 'Eliminar definitivamente',
    active: 'Ativo',
    selectAsActive: 'Selecionar como Ativo',
    noCharacters: 'Nenhum perfil ainda',
    noCharactersDesc: 'Crie um perfil para acompanhar suas pontuações e progresso!',
    showOnLeaderboard: 'Mostrar no ranking',
    showPhoto: 'Mostrar foto',
    photoUploaded: 'Foto enviada',
    noPhoto: 'Sem foto',
    privacyHint: 'Suas pontuações serão enviadas para o ranking global.',
    privacyHintDesc: 'Você pode desativar a qualquer momento nas Configurações de Perfil.',
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
    forgotPassword: 'Esqueceste-te da palavra-passe?',
    newEmail: 'Novo endereço de e-mail',
    recoverButton: 'Repor palavra-passe',
    recoverDesc: 'Introduz o teu e-mail, o código de recuperação de utilização única e uma nova palavra-passe. Se a reposição for bem-sucedida, o servidor emite um NOVO código de recuperação — guarda-o em segurança, é mostrado apenas uma vez.',
    recoverFailed: 'Falha na reposição — verifica o teu e-mail e o código de recuperação',
    recoverRelinkHint: 'Não tens um código de recuperação? Num dispositivo com o teu perfil podes, em vez disso, vincular novamente a conta com o teu código de sincronização.',
    recoverTitle: 'Repor palavra-passe',
    recoveryCode: 'Código de recuperação',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    recoveryCopied: 'Copiado!',
    recoveryCopy: 'Copiar código',
    recoveryDesc: 'Escreve este código e guarda-o em segurança (num gestor de palavras-passe ou em papel). Ele nunca voltará a ser mostrado — com o teu e-mail + este código podes repor tu mesmo uma palavra-passe esquecida.',
    recoverySaveHint: 'Sem este código e sem a tua palavra-passe atual, a palavra-passe só pode ser reposta vinculando novamente a conta com o teu código de sincronização.',
    recoveryTitle: 'Código de recuperação',
    relinkButton: 'Vincular novamente a conta',
    relinkFailed: 'Não foi possível vincular novamente a conta',
    relinkHint: 'Substitui a conta vinculada (o antigo e-mail e a antiga palavra-passe ficam inválidos). Só precisas do teu código de sincronização — depois receberás um novo código de recuperação.',
    relinkSuccess: 'Conta online vinculada novamente — lembra-te do teu e-mail e da tua palavra-passe',
    relinkTitle: 'Vincular novamente a conta online',
    saveCodeFile: 'Guardar como ficheiro de texto',
  },
  characterScreen: {
    title: 'Perfis',
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
    leaderboardParticipation: 'Participação no Ranking',
    leaderboardParticipationDesc: 'Participe do ranking online e compartilhe suas pontuações com outros jogadores',
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
    invalidCode: 'Insira um código de sincronização válido (8 ou 12 caracteres)',
    syncSuccess: 'Perfil sincronizado com sucesso!',
    notFound: 'Perfil não encontrado',
    profileNotFound: 'Perfil não encontrado',
    downloadFailedMsg: 'Falha ao baixar o perfil. Verifique o código de sincronização.',
    syncCode: 'Código de Sincronização:',
    upload: 'Enviar',
    syncCodePlaceholder: 'Código de sincronização',
    deleteOnline: 'Excluir dados online',
    deleteOnlineHint: 'Remove o seu perfil online, todas as pontuações, os resultados diários e os backups do servidor. O seu perfil local permanece.',
    deleteOnlineConfirmTitle: 'Excluir os dados online permanentemente?',
    deleteOnlineConfirmText: 'Isto exclui o seu perfil online no servidor do ranking, incluindo todas as pontuações, os resultados diários, os backups de perfil e uma conta online vinculada. O seu perfil local permanece. Esta ação não pode ser desfeita.',
    deleteOnlineConfirm: 'Excluir permanentemente',
    deleteOnlineSuccess: 'Dados online excluídos. O seu perfil agora é apenas local.',
    deleteOnlineFailed: 'Falha ao excluir os dados online',
    syncCodeWarning: 'Escreva este código! Sem ele (ou sem uma conta online com palavra-passe) o seu perfil online não pode ser recuperado.',
    saveCodeFile: 'Guardar o código como ficheiro de texto',
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
      challengeCompleted: 'Conclua primeiro "{name}"',
    },
    balladBarometer: {
      description: 'Termine uma música com 80%+ de precisão',
      name: 'Barômetro da Balada',
    },
    bandBattle: {
      description: 'Cante uma música de uma banda ou dupla — 72%+ de precisão',
      name: 'Batalha de Bandas',
    },
    blindfoldBard: {
      description: 'Sem letra E 20% de palavras faltantes',
      name: 'Bardo Vendado',
    },
    cleanCut: {
      description: 'Erre no máximo 20 notas numa única música',
      name: 'Corte Limpo',
    },
    comboCadet: {
      description: 'Alcance um combo de 30+ notas numa única música',
      name: 'Cadete do Combo',
    },
    comboCaptain: {
      description: 'Alcance um combo de 60+ notas numa única música',
      name: 'Capitão do Combo',
    },
    comboColossus: {
      description: 'Alcance um combo de 175+ notas numa única música',
      name: 'Colosso do Combo',
    },
    comboCommander: {
      description: 'Alcance um combo de 100+ notas numa única música',
      name: 'Comandante do Combo',
    },
    countryCrooner: {
      description: 'Cante uma música Country com 70%+ de precisão',
      name: 'Crooner Country',
    },
    deutschlandDreams: {
      description: 'Cante uma música em alemão com 72%+ de precisão',
      name: 'Sonhos Alemães',
    },
    discoDazzler: {
      description: 'Cante uma música dos anos 70 com 70%+ de precisão',
      name: 'Brilho Disco',
    },
    disneyDream: {
      description: 'Cante uma música Disney com 75%+ de precisão',
      name: 'Sonho Disney',
    },
    duoDynamo: {
      description: 'Cante uma música com participação especial — 70%+ de precisão',
      name: 'Dinamo da Dupla',
    },
    flawlessMirror: {
      description: 'Erre ZERO notas numa única música',
      name: 'Espelho Impecável',
    },
    freshFinders: {
      description: 'Cante uma música que você NUNCA cantou antes — 68%+ de precisão',
      name: 'Novas Descobertas',
    },
    goldBaron: {
      description: 'Acerte 12+ notas douradas numa única música',
      name: 'Barão do Ouro',
    },
    goldMiner: {
      description: 'Acerte 6+ notas douradas numa única música',
      name: 'Mineiro do Ouro',
    },
    goldPanner: {
      description: 'Acerte 3+ notas douradas numa única música',
      name: 'Garimpeiro do Ouro',
    },
    goldenGauntlet: {
      description: 'Só as notas douradas contam — e você precisa de 80%+ de precisão',
      name: 'Manopla Dourada',
    },
    harmonyHunter: {
      description: 'Termine uma música com 93%+ de precisão',
      name: 'Caçador de Harmonia',
    },
    kpopConnoisseur: {
      description: 'Cante uma música K-Pop com 78%+ de precisão',
      name: 'Conhecedor de K-Pop',
    },
    latinFlare: {
      description: 'Cante uma música latina com 70%+ de precisão',
      name: 'Brilho Latino',
    },
    lightningLungs: {
      description: 'Velocidade 2x — completamente sem fôlego!',
      name: 'Pulmões Relâmpago',
    },
    loveGuru: {
      description: 'Cante uma música com "love" no título — 72%+ de precisão',
      name: 'Guru do Amor',
    },
    marathoner: {
      description: 'Cante uma música de 5+ minutos com 75%+ de precisão',
      name: 'Maratonista',
    },
    metalMarauder: {
      description: 'Cante uma música de Metal com 75%+ de precisão',
      name: 'Predador do Metal',
    },
    mindPalace: {
      description: '50% das palavras estão ocultas — pura memória!',
      name: 'Palácio da Mente',
    },
    musicalMaestro: {
      description: 'Cante uma música de musical com 75%+ de precisão',
      name: 'Maestro do Musical',
    },
    noteAdept: {
      description: 'Acerte 200+ notas corretas numa única música',
      name: 'Perito das Notas',
    },
    noteApprentice: {
      description: 'Acerte 100+ notas corretas numa única música',
      name: 'Aprendiz das Notas',
    },
    noteLegend: {
      description: 'Acerte 500+ notas corretas numa única música',
      name: 'Lenda das Notas',
    },
    noteNovice: {
      description: 'Acerte 50+ notas corretas numa única música',
      name: 'Novato das Notas',
    },
    noteVirtuoso: {
      description: 'Acerte 350+ notas corretas numa única música',
      name: 'Virtuose das Notas',
    },
    octaveOdyssey: {
      description: 'Música transposta +7 semitons — uma oitava inteira de sofrimento!',
      name: 'Odisseia da Oitava',
    },
    oneWordWonder: {
      description: 'Cante uma música com título de uma palavra só com 72%+ de precisão',
      name: 'Maravilha de Uma Palavra',
    },
    perfectPath: {
      description: 'Acerte 25+ notas perfeitas numa única música',
      name: 'Caminho Perfeito',
    },
    perfectPilgrim: {
      description: 'Acerte 50+ notas perfeitas numa única música',
      name: 'Peregrino Perfeito',
    },
    perfectProphet: {
      description: 'Acerte 100+ notas perfeitas numa única música',
      name: 'Profeta do Perfeito',
    },
    perfectionistPrime: {
      description: 'Só as notas perfeitas contam — acerte 100+ delas!',
      name: 'Perfeccionismo Puro',
    },
    phantomKaraoke: {
      description: 'Totalmente às cegas E velocidade 1.25x — o fantasma te saúda!',
      name: 'Fantasma do Karaokê',
    },
    pitchClimber: {
      description: 'Música transposta +5 semitons — escale essa melodia!',
      name: 'Alpinista do Tom',
    },
    pitchDiver: {
      description: 'Música transposta -4 semitons — mergulhe fundo!',
      name: 'Mergulhador do Tom',
    },
    pitchPerfectParagon: {
      description: 'Termine uma música com 97%+ de precisão',
      name: 'Paradigma da Afinação Perfeita',
    },
    polyglotPractice: {
      description: 'Cante uma música que NÃO esteja em inglês com 70%+ de precisão',
      name: 'Treino Poliglota',
    },
    pulseRacer: {
      description: 'Cante uma música de 140+ BPM com 70%+ de precisão',
      name: 'Coração a Mil',
    },
    questionQuest: {
      description: 'Cante uma música com "?" no título — 70%+ de precisão',
      name: 'Caça à Pergunta',
    },
    rockRenaissance: {
      description: 'Cante uma música de Rock com 72%+ de precisão',
      name: 'Renascimento Rock',
    },
    scoreScholar: {
      description: 'Faça 7.500+ pontos numa única música',
      name: 'Estudioso dos Pontos',
    },
    scoreScout: {
      description: 'Faça 5.000+ pontos numa única música',
      name: 'Escoteiro dos Pontos',
    },
    scoreSensei: {
      description: 'Faça 9.500+ pontos numa única música',
      name: 'Sensei dos Pontos',
    },
    scoreTitan: {
      description: 'Faça 11.500+ pontos numa única música',
      name: 'Titã dos Pontos',
    },
    slothSerenade: {
      description: 'Velocidade 0.6x E sem guia de tom — relaxado, mas às cegas',
      name: 'Serenata da Preguiça',
    },
    slowGroove: {
      description: 'Cante uma música de ≤90 BPM com 75%+ de precisão',
      name: 'Groove Lento',
    },
    speedDemonPlus: {
      description: 'Velocidade 1.75x — para pulmões relâmpago!',
      name: 'Demônio da Velocidade+',
    },
    spotless: {
      description: 'Erre no máximo 8 notas numa única música',
      name: 'Impecável',
    },
    sprintSinger: {
      description: 'Cante uma música de menos de 3 minutos com 80%+ de precisão',
      name: 'Cantor Sprint',
    },
    surgical: {
      description: 'Erre no máximo 3 notas numa única música',
      name: 'Precisão Cirúrgica',
    },
    synthwaveSailor: {
      description: 'Cante uma música dos anos 80 com 78%+ de precisão',
      name: 'Navegador Synthwave',
    },
    toneTuner: {
      description: 'Termine uma música com 88%+ de precisão',
      name: 'Afinador de Tom',
    },
    turboMemory: {
      description: 'Velocidade 1.25x E 35% de palavras faltantes!',
      name: 'Memória Turbo',
    },
    turtleTempo: {
      description: 'Velocidade 0.5x — saboreie cada nota',
      name: 'Tempo de Tartaruga',
    },
  },
  onlineStats: {
    title: 'Estatísticas online',
    loading: 'A carregar dados online…',
    unavailable: 'Dados online indisponíveis de momento',
    crowns: 'Coroas por música (#1)',
    topPercent: 'Top {p}%',
    rankOf: 'Posição #{rank} de {total}',
    notRanked: 'Não classificado',
    points: 'Pontos online',
    crownExample: 'p. ex.',
    recentPlays: 'Rodadas online recentes',
    noPlays: 'Ainda não há rodadas online.',
    unknownSong: 'Música desconhecida',
  },
};
