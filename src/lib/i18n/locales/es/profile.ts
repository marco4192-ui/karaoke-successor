// ES translations — profile

export const profileTranslations = {
  profile: {
    title: 'Perfiles',
    createCharacter: 'Crear Perfil',
    name: 'Nombre',
    namePlaceholder: 'Nombre de perfil...',
    country: 'País',
    countryOptional: 'Seleccionar País (opcional)',
    avatar: 'Avatar',
    uploadPhoto: 'Subir Foto',
    create: 'Crear',
    edit: 'Editar',
    delete: 'Eliminar',
    signOutButton: 'Cerrar sesión en este dispositivo',
    signOutTitle: '¿Cerrar sesión en este dispositivo?',
    signOutText: 'Tu perfil online se conserva — solo se eliminan los datos de este dispositivo: perfil, avatar, récords locales, progreso de retos diarios y misiones, y cargas pendientes.',
    signOutHintAccount: 'Puedes volver a iniciar sesión en cualquier momento con tu correo y contraseña.',
    signOutConfirm: 'Cerrar sesión y eliminar',
    signOutSuccess: 'Perfil eliminado de este dispositivo — tus datos online se conservan.',
    signOutUploading: 'Subiendo cargas pendientes…',
    signOutUploadsFailed: 'No se pudieron transferir {n} cargas de puntuación pendientes (servidor inaccesible). Se descartarán si continúas.',
    signOutForce: 'Cerrar sesión de todos modos',
    pendingUploadsInfo: '{n} cargas de puntuación pendientes se enviarán al servidor antes de eliminar.',
    deleteLocalTitle: '¿Eliminar el perfil definitivamente?',
    deleteLocalText: 'El perfil se eliminará con todos los datos locales: récords, progreso de retos diarios y misiones, y avatar. No hay copia online — no se puede deshacer.',
    deleteLocalConfirm: 'Eliminar definitivamente',
    active: 'Activo',
    selectAsActive: 'Seleccionar como Activo',
    noCharacters: 'Aún no hay perfiles',
    noCharactersDesc: '¡Crea un personaje para seguir tus puntuaciones y progreso!',
    showOnLeaderboard: 'Mostrar en tabla de clasificación',
    showPhoto: 'Mostrar foto',
    photoUploaded: 'Foto subida',
    noPhoto: 'Sin foto',
    privacyHint: 'Tus puntuaciones se subirán a la tabla de clasificación global.',
    privacyHintDesc: 'Puedes desactivarlo en cualquier momento en los Ajustes de Perfil.',
    storageMode: {
      title: 'Almacenamiento del perfil',
      local: 'Solo local',
      localDesc: 'Todos los datos permanecen en este dispositivo — sin tabla de clasificación en línea, sin sincronización.',
      online: 'Perfil en línea',
      onlineDesc: 'Únete a la tabla de clasificación en línea, sincroniza entre dispositivos y comparte resultados diarios.',
      localShort: 'Local',
      onlineShort: 'En línea',
      settingsDesc: 'Decide si este perfil se une a la tabla de clasificación en línea o permanece solo local. Se puede cambiar en cualquier momento.',
    },
    countrySearch: 'Buscar país…',
    noCountryFound: 'No se encontró ningún país',
    popularCountries: 'Populares',
    allCountries: 'Todos los países',
  },
  profileAuth: {
    accountTitle: 'Cuenta online (opcional)',
    accountDesc: 'Guarda un correo electrónico y una contraseña para poder cargar este perfil en otro dispositivo. El inicio de sesión solo es posible dentro de la app de karaoke — no hay inicio de sesión web.',
    email: 'Correo electrónico',
    emailPlaceholder: 'tu@email.com',
    emailInvalid: 'Introduce una dirección de correo electrónico válida',
    emailTaken: 'Este correo electrónico ya está registrado',
    password: 'Contraseña',
    passwordPlaceholder: 'Al menos 8 caracteres',
    passwordRepeat: 'Repetir contraseña',
    passwordsDontMatch: 'Las contraseñas no coinciden',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
    registerFailed: 'No se pudo crear la cuenta online',
    loginTitle: 'Cargar perfil online',
    loginDesc: 'Introduce el correo electrónico y la contraseña de tu perfil online para cargarlo en este dispositivo.',
    loginButton: 'Iniciar sesión y cargar perfil',
    loginFailed: 'Error al iniciar sesión — comprueba el correo electrónico y la contraseña',
    loginSuccess: '¡Perfil "{n}" cargado con éxito!',
    noSnapshot: 'Aún no hay datos de perfil sincronizados en el servidor',
    emailNote: 'Se usa solo para iniciar sesión — nunca se muestra públicamente',
    changePassword: 'Cambiar contraseña',
    currentPassword: 'Contraseña actual',
    newPassword: 'Nueva contraseña',
    passwordChanged: 'Contraseña cambiada con éxito',
    passwordChangeFailed: 'No se pudo cambiar la contraseña',
    hasAccount: 'Cuenta online ✓',
    registrationPending: 'Creando la cuenta online…',
    registrationSuccess: 'Cuenta online creada — ya puedes iniciar sesión en cualquier dispositivo',
    registrationSuccessTitle: '🔐 Cuenta online',
    loginSuccessTitle: '✅ {n}',
    forgotPassword: '¿Has olvidado la contraseña?',
    newEmail: 'Nueva dirección de correo electrónico',
    recoverButton: 'Restablecer contraseña',
    recoverDesc: 'Introduce tu correo electrónico, el código de recuperación de un solo uso y una nueva contraseña. Si se restablece correctamente, el servidor emite un NUEVO código de recuperación — guárdalo en un lugar seguro, solo se muestra una vez.',
    recoverFailed: 'No se pudo restablecer — comprueba tu correo electrónico y el código de recuperación',
    recoverRelinkHint: '¿No tienes código de recuperación? En un dispositivo con tu perfil puedes vincular de nuevo la cuenta con tu código de sincronización.',
    recoverTitle: 'Restablecer contraseña',
    recoveryCode: 'Código de recuperación',
    recoveryCodePlaceholder: 'XXXX-XXXX-XXXX-XXXX',
    recoveryCopied: '¡Copiado!',
    recoveryCopy: 'Copiar código',
    recoveryDesc: 'Apunta este código y guárdalo en un lugar seguro (gestor de contraseñas o papel). NUNCA volverá a mostrarse — con tu correo electrónico + este código puedes restablecer tú mismo una contraseña olvidada.',
    recoverySaveHint: 'Sin este código y sin tu contraseña actual, la contraseña solo se puede restablecer volviendo a vincular la cuenta con tu código de sincronización.',
    recoveryTitle: 'Código de recuperación',
    relinkButton: 'Vincular de nuevo la cuenta',
    relinkFailed: 'No se pudo volver a vincular la cuenta',
    relinkHint: 'Sustituye a la cuenta vinculada (el correo electrónico y la contraseña antiguos dejan de valer). Solo necesitas tu código de sincronización — después recibirás un nuevo código de recuperación.',
    relinkSuccess: 'Cuenta online vinculada de nuevo — recuerda tu correo electrónico y tu contraseña',
    relinkTitle: 'Vincular de nuevo la cuenta online',
    saveCodeFile: 'Guardar como archivo de texto',
  },
  characterScreen: {
    title: 'Perfiles',
    description: 'Crea y gestiona tus perfiles de cantante',
    onlineLeaderboard: 'Tabla de Clasificación Online',
    createProfile: 'Crear Nuevo Perfil',
    yourProfiles: 'Tus Perfiles ({n})',
    noProfiles: 'Aún no hay perfiles. Haz clic en "Crear Nuevo Perfil" para empezar.',
    settingsTitle: 'Ajustes de Perfil',
    nameAndAvatar: 'Nombre y Avatar',
    rankDisplay: 'Mostrar Rango',
    showRankInName: 'Mostrar rango en el nombre',
    rankPrefix: 'Prefijo',
    rankSuffix: 'Sufijo',
    rankFull: 'Completo',
    countryAndPrivacy: 'País y Privacidad',
    selectCountry: 'Seleccionar País',
    visible: 'Visible',
    hidden: 'Oculto',
    shown: 'Mostrado',
    companionAppLink: 'Enlace de App Compañera',
    companionAppLinkDesc: 'Escanea este código QR para conectarte directamente con este perfil en la app compañera.',
    hideQrCode: 'Ocultar Código QR',
    showQrCode: 'Mostrar Código QR',
    leaderboardParticipation: 'Participación en la Tabla de Clasificación',
    leaderboardParticipationDesc: 'Participa en la tabla de clasificación en línea y comparte tus puntuaciones con otros jugadores',
    loadProfile: 'Cargar Perfil Online',
  },
  characterCard: {
    connected: 'Conectado',
    connectedWith: 'Conectado: {n}',
  },
  profileSync: {
    title: 'Sincronización de Perfil',
    uploadSuccess: '¡Perfil subido! Código de sincronización: {n}',
    uploadFailed: 'Error al subir',
    downloadFailed: 'Error al subir perfil',
    invalidCode: 'Introduce un código de sincronización válido (8 o 12 caracteres)',
    syncSuccess: '¡Perfil sincronizado correctamente!',
    notFound: 'Perfil no encontrado',
    profileNotFound: 'Perfil no encontrado',
    downloadFailedMsg: 'Error al descargar el perfil. Verifica el código de sincronización.',
    syncCode: 'Código de Sincronización:',
    upload: 'Subir',
    syncCodePlaceholder: 'Código de sincronización',
    deleteOnline: 'Borrar datos online',
    deleteOnlineHint: 'Elimina tu perfil online, todas las puntuaciones, los resultados diarios y las copias de seguridad del servidor. Tu perfil local se conserva.',
    deleteOnlineConfirmTitle: '¿Borrar los datos online para siempre?',
    deleteOnlineConfirmText: 'Esto elimina tu perfil online del servidor de la tabla de clasificación, incluidas todas las puntuaciones, los resultados diarios, las copias de seguridad del perfil y una cuenta online vinculada. Tu perfil local se conserva. Este paso no se puede deshacer.',
    deleteOnlineConfirm: 'Borrar definitivamente',
    deleteOnlineSuccess: 'Datos online borrados. Tu perfil ahora es solo local.',
    deleteOnlineFailed: 'Error al borrar los datos online',
    syncCodeWarning: '¡Apunta este código! Sin él (o sin una cuenta online con contraseña) tu perfil online no se puede recuperar.',
    saveCodeFile: 'Guardar el código como archivo de texto',
  },
  playerProgression: {
    active: 'Activo',
    inactive: 'Inactivo',
    progressToNext: 'Progreso al Siguiente Nivel',
    xpNeeded: 'XP necesario',
    songsPlayed: 'Canciones Jugadas',
    goldenNotes: 'Notas Doradas',
    bestCombo: 'Mejor Combo',
    totalScore: 'Puntuación Total',
    achievementsTitle: 'Logros',
    more: '+{n} más',
    beginner: 'Principiante',
    xp: 'XP',
    lv: 'Nv. {n}',
  },
  achievements: {
    title: 'Logros',
    unlocked: 'Desbloqueado',
    locked: 'Bloqueado',
    progress: 'Progreso',
    noAchievements: 'Aún no hay logros',
    playToUnlock: '¡Juega canciones para desbloquear logros!',
    rarity: 'Rareza',
    common: 'Común',
    uncommon: 'Poco Común',
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Legendario',
    first_note: {
      name: 'Primera Nota',
      description: 'Acierta tu primera nota',
    },
    perfect_ten: {
      name: 'Diez Perfectos',
      description: 'Consigue 10 aciertos Perfectos en una sola canción',
    },
    combo_master: {
      name: 'Master del Combo',
      description: 'Logra un combo de 50 notas',
    },
    combo_king: {
      name: 'Rey del Combo',
      description: 'Logra un combo de 100 notas',
    },
    combo_legend: {
      name: 'Leyenda del Combo',
      description: 'Logra un combo de 200 notas',
    },
    perfect_song: {
      name: 'Canción Perfecta',
      description: 'Consigue 99.5%+ de precisión en una canción',
    },
    accuracy_90: {
      name: 'Tono Perfecto',
      description: 'Consigue más del 90% de precisión',
    },
    score_8k: {
      name: 'Estrella Naciente',
      description: 'Consigue más de 8.000 puntos',
    },
    score_9k: {
      name: 'Master de Puntuación',
      description: 'Consigue más de 9.000 puntos',
    },
    score_9500: {
      name: 'Impecable',
      description: 'Consigue más de 9.500 puntos',
    },
    golden_collector: {
      name: 'Coleccionista Dorado',
      description: 'Acierta 10 notas doradas',
    },
    golden_master: {
      name: 'Master Dorado',
      description: 'Acierta 50 notas doradas',
    },
    first_song: {
      name: 'Primeros Pasos',
      description: 'Completa tu primera canción',
    },
    ten_songs: {
      name: 'Entusiasta del Karaoke',
      description: 'Completa 10 canciones',
    },
    fifty_songs: {
      name: 'Asiduo del Karaoke',
      description: 'Completa 50 canciones',
    },
    hundred_songs: {
      name: 'Leyenda del Karaoke',
      description: 'Completa 100 canciones',
    },
    five_games: {
      name: 'Empezando',
      description: 'Juega 5 partidas',
    },
    twenty_games: {
      name: 'Cantante Dedicado',
      description: 'Juega 20 partidas',
    },
    party_time: {
      name: '¡Hora de Fiesta!',
      description: 'Juega un modo de juego de fiesta',
    },
    duel_winner: {
      name: 'Campeón del Duelo',
      description: 'Gana un duelo',
    },
    pass_the_mic: {
      name: '¡Pasa el Mic!',
      description: 'Juega al modo Pasa el Mic',
    },
    shower_singer: {
      name: 'Cantante de Ducha',
      description: 'Consigue menos del 20% en una canción',
    },
    comeback_king: {
      name: 'Rey de la Remontada',
      description: 'Logra un combo de 50+ después de fallar 10 notas',
    },
    speed_demon: {
      name: 'Demonio de Velocidad',
      description: 'Completa una canción a velocidad 1.5x',
    },
    blind_master: {
      name: 'Master a Ciegas',
      description: 'Completa una canción en modo Karaoke a Ciegas',
    },
    daily_starter: {
      name: 'Novato Diario',
      description: 'Completa tu primer reto diario',
    },
    daily_regular: {
      name: 'Habitual Diario',
      description: 'Completa 10 retos diarios',
    },
    daily_devoted: {
      name: 'Devoto Diario',
      description: 'Completa 50 retos diarios',
    },
    streak_week: {
      name: 'En Llamas',
      description: 'Mantén una racha diaria de 7 días',
    },
    streak_month: {
      name: 'Imparable',
      description: 'Mantén una racha diaria de 30 días',
    },
    weekly_warrior: {
      name: 'Guerrero Semanal',
      description: 'Completa 5 retos semanales',
    },
    accuracy_95: {
      name: 'Cantante de Precisión',
      description: 'Consigue más del 95% de precisión',
    },
    golden_rush: {
      name: 'Fiebre del Oro',
      description: 'Acierta 20 notas doradas en una sola canción',
    },
    golden_hundred: {
      name: 'Centurión Dorado',
      description: 'Acierta 100 notas doradas en total',
    },
    perfect_fifty: {
      name: 'Cincuenta Perfectas',
      description: 'Acierta 50 notas perfectas en una sola canción',
    },
    lightning_lips: {
      name: 'Labios Relámpago',
      description: 'Completa una canción a velocidad 2x',
    },
    duet_harmony: {
      name: 'Armonía Perfecta',
      description: 'Canta 10 dúos',
    },
    genre_explorer: {
      name: 'Explorador de Géneros',
      description: 'Canta canciones de 5 géneros diferentes',
    },
    disney_fan: {
      name: 'Fan de Disney',
      description: 'Canta 10 canciones de Disney',
    },
    night_owl: {
      name: 'Búho Nocturno',
      description: 'Termina una canción entre medianoche y las 4 de la madrugada',
    },
    early_bird: {
      name: 'Madrugador',
      description: 'Termina una canción antes de las 8 de la mañana',
    },
    marathon_singer: {
      name: 'Cantante Maratoniano',
      description: 'Juega 5 partidas en un solo día',
    },
    score_9800: {
      name: 'Estrella Ultra',
      description: 'Consigue más de 9.800 puntos',
    },
    score_9900: {
      name: 'Más Allá de la Perfección',
      description: 'Consigue más de 9.900 puntos',
    },
    combo_300: {
      name: 'Titán del Combo',
      description: 'Logra un combo de 300 notas',
    },
    combo_500: {
      name: 'Combo Inmortal',
      description: 'Logra un combo de 500 notas',
    },
    accuracy_92: {
      name: 'Afinación Fina',
      description: 'Consigue más del 92% de precisión',
    },
    accuracy_94: {
      name: 'Calidad de Estudio',
      description: 'Consigue más del 94% de precisión',
    },
    accuracy_96: {
      name: 'Tirador Certero',
      description: 'Consigue más del 96% de precisión',
    },
    accuracy_97: {
      name: 'Precisión Láser',
      description: 'Consigue más del 97% de precisión',
    },
    accuracy_98: {
      name: 'Virtuoso',
      description: 'Consigue más del 98% de precisión',
    },
    perfect_75: {
      name: 'Setenta y Cinco Perfectas',
      description: 'Acierta 75 notas perfectas en una sola canción',
    },
    perfect_100: {
      name: 'Centuria Perfecta',
      description: 'Acierta 100 notas perfectas en una sola canción',
    },
    perfect_150: {
      name: 'Tormenta Perfecta',
      description: 'Acierta 150 notas perfectas en una sola canción',
    },
    golden_30: {
      name: 'Marea Dorada',
      description: 'Acierta 30 notas doradas en una sola canción',
    },
    golden_40: {
      name: 'Sinfonía Dorada',
      description: 'Acierta 40 notas doradas en una sola canción',
    },
    perfect_500: {
      name: 'Máquina Perfecta',
      description: 'Acierta 500 notas perfectas en total',
    },
    perfect_1000: {
      name: 'Potencia de Precisión',
      description: 'Acierta 1.000 notas perfectas en total',
    },
    perfect_5000: {
      name: 'Avalancha Perfecta',
      description: 'Acierta 5.000 notas perfectas en total',
    },
    perfect_10000: {
      name: 'Diez Mil Perfectas',
      description: 'Acierta 10.000 notas perfectas en total',
    },
    golden_250: {
      name: 'Cosecha Dorada',
      description: 'Acierta 250 notas doradas en total',
    },
    golden_1000: {
      name: 'Diluvio Dorado',
      description: 'Acierta 1.000 notas doradas en total',
    },
    golden_5000: {
      name: 'Voz de Midas',
      description: 'Acierta 5.000 notas doradas en total',
    },
    songs_250: {
      name: 'Veterano del Cancionero',
      description: 'Completa 250 canciones',
    },
    songs_500: {
      name: 'Club del Medio Millar',
      description: 'Completa 500 canciones',
    },
    songs_1000: {
      name: 'Leyenda de las Mil Canciones',
      description: 'Completa 1.000 canciones',
    },
    games_50: {
      name: 'Cantante Frecuente',
      description: 'Juega 50 partidas',
    },
    games_100: {
      name: 'Club de la Centena',
      description: 'Juega 100 partidas',
    },
    games_250: {
      name: 'Asiduo del Arcade',
      description: 'Juega 250 partidas',
    },
    games_500: {
      name: 'Maníaco del Maratón',
      description: 'Juega 500 partidas',
    },
    level_25: {
      name: 'Cantante Veterano',
      description: 'Alcanza el nivel 25',
    },
    level_50: {
      name: 'Vocalista de Élite',
      description: 'Alcanza el nivel 50',
    },
    level_100: {
      name: 'Leyenda del Nivel 100',
      description: 'Alcanza el nivel 100',
    },
    daily_100: {
      name: 'Centurión Diario',
      description: 'Completa 100 retos diarios',
    },
    daily_250: {
      name: 'Incondicional Diario',
      description: 'Completa 250 retos diarios',
    },
    daily_500: {
      name: 'Inmortal Diario',
      description: 'Completa 500 retos diarios',
    },
    streak_60: {
      name: 'Voluntad de Hierro',
      description: 'Mantén una racha diaria de 60 días',
    },
    streak_100: {
      name: 'Héroe de los Cien Días',
      description: 'Mantén una racha diaria de 100 días',
    },
    streak_180: {
      name: 'Devoción de Medio Año',
      description: 'Mantén una racha diaria de 180 días',
    },
    streak_365: {
      name: 'Leyenda Anual',
      description: 'Mantén una racha diaria de 365 días',
    },
    weekly_15: {
      name: 'Incondicional Semanal',
      description: 'Completa 15 retos semanales',
    },
    weekly_30: {
      name: 'Pilar Semanal',
      description: 'Completa 30 retos semanales',
    },
    weekly_52: {
      name: 'Un Año de Semanas',
      description: 'Completa 52 retos semanales',
    },
    encore_10: {
      name: '¡Bis!',
      description: 'Juega 10 partidas en un solo día',
    },
    duets_25: {
      name: 'Devoto del Dúo',
      description: 'Canta 25 dúos',
    },
    duets_50: {
      name: 'Dúo Dinámico',
      description: 'Canta 50 dúos',
    },
    duets_100: {
      name: 'Centuria de Dúos',
      description: 'Canta 100 dúos',
    },
    duels_5: {
      name: 'Duelista',
      description: 'Gana 5 duelos',
    },
    duels_10: {
      name: 'Maestro del Duelo',
      description: 'Gana 10 duelos',
    },
    duels_25: {
      name: 'Señor del Duelo',
      description: 'Gana 25 duelos',
    },
    party_10: {
      name: 'Animal de Fiesta',
      description: 'Juega 10 partidas de fiesta',
    },
    party_25: {
      name: 'El Alma de la Fiesta',
      description: 'Juega 25 partidas de fiesta',
    },
    party_50: {
      name: 'Leyenda de la Fiesta',
      description: 'Juega 50 partidas de fiesta',
    },
    disney_25: {
      name: 'Entusiasta de Disney',
      description: 'Canta 25 canciones de Disney',
    },
    disney_50: {
      name: 'Érase una Vez una Canción',
      description: 'Canta 50 canciones de Disney',
    },
    genres_8: {
      name: 'Errante de Géneros',
      description: 'Canta canciones de 8 géneros diferentes',
    },
    genres_10: {
      name: 'Aficionado a los Géneros',
      description: 'Canta canciones de 10 géneros diferentes',
    },
    clean_sheet: {
      name: 'Portería a Cero',
      description: 'Termina una canción con 50+ notas y cero fallos',
    },
    weekend_singer: {
      name: 'Cantante de Fin de Semana',
      description: 'Termina una canción en sábado o domingo',
    },
    lunch_break: {
      name: 'Descanso para Comer',
      description: 'Termina una canción entre las 12 y las 14',
    },
  },
  achievementsScreen: {
    title: '🏆 Logros',
    description: '¡Desbloquea logros jugando!',
    unlocked: 'Desbloqueado',
    xpEarned: 'XP Obtenido',
    completion: 'Completado',
    all: 'Todos',
    categories: {
      performance: 'rendimiento',
      progression: 'progresión',
      social: 'social',
      special: 'especial',
    },
    plusXp: '+{n} XP',
    locked: 'Bloqueado',
    viewPlayer: 'Logros de',
    viewingOther: 'Estás viendo los logros de {n}. Cada jugador desbloquea sus propios logros.',
    noMatches: 'Ningún logro coincide con estos filtros',
  },
  badgeNames: {
    'first-challenge': 'Primeros Pasos',
    'week-warrior': 'Guerrero Semanal',
    'fortnight-fighter': 'Luchador Quincenal',
    'monthly-master': 'Maestro Mensual',
    'top-3': 'Lugar de Podio',
    champion: 'Campeón Diario',
    dedicated: 'Cantante Dedicado',
    legendary: 'Estado Legendario',
    'century-champion': 'Campeón del Siglo',
    'yearly-legend': 'Leyenda Anual',
    explorer: 'Explorador de Retos',
    songbird: 'Pájaro Cantor',
    'weekly-warrior-q': 'Guerrero Semanal',
  },
  badgeDescriptions: {
    'first-challenge': 'Completa tu primer reto diario',
    'week-warrior': 'Mantén una racha de 7 días',
    'fortnight-fighter': 'Mantén una racha de 14 días',
    'monthly-master': 'Mantén una racha de 30 días',
    'top-3': 'Termina en el top 3 de un reto diario',
    champion: 'Gana un reto diario',
    dedicated: 'Completa 30 retos diarios',
    legendary: 'Alcanza 10.000 XP en total',
    'century-champion': 'Mantén una racha de 100 días',
    'yearly-legend': 'Mantén una racha de 365 días',
    explorer: 'Juega 5 modos de reto diferentes',
    songbird: 'Completa 10 canciones en total',
    'weekly-warrior-q': 'Completa 3 retos semanales',
  },
  mobileAchievements: {
    first_song: {
      title: 'Primeros Pasos',
      description: 'Canta tu primera canción',
    },
    ten_songs: {
      title: 'Estrella Naciente',
      description: 'Canta 10 canciones',
    },
    fifty_songs: {
      title: 'Veterano',
      description: 'Canta 50 canciones',
    },
    perfect_score: {
      title: 'Perfeccionista',
      description: 'Consigue una puntuación perfecta (95%+)',
    },
    five_perfect: {
      title: 'Impecable',
      description: 'Consigue 5 puntuaciones perfectas',
    },
    high_score: {
      title: 'Master de Puntuación',
      description: 'Alcanza 10.000 puntos en total',
    },
    queue_5: {
      title: 'Constructor de Playlist',
      description: 'Añade 5 canciones a la Queue',
    },
    genre_3: {
      title: 'Explorador de Géneros',
      description: 'Canta canciones de 3 géneros distintos',
    },
  },
  challenges: {
    requirements: {
      minLevel: 'Requiere nivel {required} (tú eres nivel {current})',
      minSongs: 'Requiere {required} canciones completadas (tú tienes {current})',
      achievement: 'Requiere logro: {name}',
      rankNoXP: 'No se puede verificar el requisito de rango (no hay datos de XP disponibles)',
      unknownRank: 'Rango desconocido "{name}"',
      rankRequired: 'Requiere rango "{required}" (tú eres "{current}")',
      challengeCompleted: 'Completa primero "{name}"',
    },
    balladBarometer: {
      description: 'Termina una canción con un 80%+ de precisión',
      name: 'Barómetro de Baladas',
    },
    bandBattle: {
      description: 'Canta una canción de una banda o dúo — 72%+ de precisión',
      name: 'Batalla de Bandas',
    },
    blindfoldBard: {
      description: 'Sin letra Y 20% de palabras ocultas',
      name: 'Bardo Vendado',
    },
    cleanCut: {
      description: 'Falla como máximo 20 notas en una sola canción',
      name: 'Corte Limpio',
    },
    comboCadet: {
      description: 'Logra un combo de 30+ notas en una sola canción',
      name: 'Cadete de Combo',
    },
    comboCaptain: {
      description: 'Logra un combo de 60+ notas en una sola canción',
      name: 'Capitán de Combo',
    },
    comboColossus: {
      description: 'Logra un combo de 175+ notas en una sola canción',
      name: 'Coloso de Combos',
    },
    comboCommander: {
      description: 'Logra un combo de 100+ notas en una sola canción',
      name: 'Comandante de Combo',
    },
    countryCrooner: {
      description: 'Canta una canción Country con un 70%+ de precisión',
      name: 'Crooner Country',
    },
    deutschlandDreams: {
      description: 'Canta una canción en alemán con un 72%+ de precisión',
      name: 'Sueños Alemanes',
    },
    discoDazzler: {
      description: 'Canta una canción de los años 70 con un 70%+ de precisión',
      name: 'Fiebre Disco',
    },
    disneyDream: {
      description: 'Canta una canción de Disney con un 75%+ de precisión',
      name: 'Sueño Disney',
    },
    duoDynamo: {
      description: 'Canta una canción con artista invitado — 70%+ de precisión',
      name: 'Dúo Dinámico',
    },
    flawlessMirror: {
      description: 'No falles NINGUNA nota en una sola canción',
      name: 'Espejo Impecable',
    },
    freshFinders: {
      description: 'Canta una canción que NUNCA hayas cantado antes — 68%+ de precisión',
      name: 'Cazadores de Inéditos',
    },
    goldBaron: {
      description: 'Acierta 12+ notas doradas en una sola canción',
      name: 'Barón Dorado',
    },
    goldMiner: {
      description: 'Acierta 6+ notas doradas en una sola canción',
      name: 'Minero Dorado',
    },
    goldPanner: {
      description: 'Acierta 3+ notas doradas en una sola canción',
      name: 'Buscador de Oro',
    },
    goldenGauntlet: {
      description: 'Solo cuentan las notas doradas — y necesitas un 80%+ de precisión',
      name: 'Guante Dorado',
    },
    harmonyHunter: {
      description: 'Termina una canción con un 93%+ de precisión',
      name: 'Cazador de Armonía',
    },
    kpopConnoisseur: {
      description: 'Canta una canción K-Pop con un 78%+ de precisión',
      name: 'Experto del K-Pop',
    },
    latinFlare: {
      description: 'Canta una canción latina con un 70%+ de precisión',
      name: 'Fuego Latino',
    },
    lightningLungs: {
      description: 'Velocidad 2x — ¡sin aliento!',
      name: 'Pulmones de Rayo',
    },
    loveGuru: {
      description: 'Canta una canción con "amor" en el título — 72%+ de precisión',
      name: 'Gurú del Amor',
    },
    marathoner: {
      description: 'Canta una canción de 5+ minutos con un 75%+ de precisión',
      name: 'Maratonista',
    },
    metalMarauder: {
      description: 'Canta una canción de Metal con un 75%+ de precisión',
      name: 'Saqueador del Metal',
    },
    mindPalace: {
      description: 'El 50% de las palabras están ocultas — ¡pura memoria!',
      name: 'Palacio Mental',
    },
    musicalMaestro: {
      description: 'Canta una canción de un musical con un 75%+ de precisión',
      name: 'Maestro del Musical',
    },
    noteAdept: {
      description: 'Acierta 200+ notas correctas en una sola canción',
      name: 'Experto en Notas',
    },
    noteApprentice: {
      description: 'Acierta 100+ notas correctas en una sola canción',
      name: 'Aprendiz de Notas',
    },
    noteLegend: {
      description: 'Acierta 500+ notas correctas en una sola canción',
      name: 'Leyenda de las Notas',
    },
    noteNovice: {
      description: 'Acierta 50+ notas correctas en una sola canción',
      name: 'Novato de las Notas',
    },
    noteVirtuoso: {
      description: 'Acierta 350+ notas correctas en una sola canción',
      name: 'Virtuoso de las Notas',
    },
    octaveOdyssey: {
      description: 'Canción transpuesta +7 semitonos — ¡una octava entera de sufrimiento!',
      name: 'Odisea de Octava',
    },
    oneWordWonder: {
      description: 'Canta una canción con título de una sola palabra con un 72%+ de precisión',
      name: 'Maravilla de Una Palabra',
    },
    perfectPath: {
      description: 'Acierta 25+ notas perfectas en una sola canción',
      name: 'Camino Perfecto',
    },
    perfectPilgrim: {
      description: 'Acierta 50+ notas perfectas en una sola canción',
      name: 'Peregrino Perfecto',
    },
    perfectProphet: {
      description: 'Acierta 100+ notas perfectas en una sola canción',
      name: 'Profeta Perfecto',
    },
    perfectionistPrime: {
      description: 'Solo cuentan las notas perfectas — ¡acierta 100+!',
      name: 'Perfeccionista Prime',
    },
    phantomKaraoke: {
      description: 'Totalmente a ciegas Y a velocidad 1.25x — ¡el fantasma te saluda!',
      name: 'Fantasma del Karaoke',
    },
    pitchClimber: {
      description: 'Canción transpuesta +5 semitonos — ¡escala esa melodía!',
      name: 'Escalador de Tono',
    },
    pitchDiver: {
      description: 'Canción transpuesta -4 semitonos — ¡sumérgete de cabeza!',
      name: 'Buzo de Tono',
    },
    pitchPerfectParagon: {
      description: 'Termina una canción con un 97%+ de precisión',
      name: 'Parangón de Afinación',
    },
    polyglotPractice: {
      description: 'Canta una canción que NO esté en inglés con un 70%+ de precisión',
      name: 'Práctica Políglota',
    },
    pulseRacer: {
      description: 'Canta una canción de 140+ BPM con un 70%+ de precisión',
      name: 'Corazón Acelerado',
    },
    questionQuest: {
      description: 'Canta una canción con "?" en el título — 70%+ de precisión',
      name: 'Misión Interrogante',
    },
    rockRenaissance: {
      description: 'Canta una canción de Rock con un 72%+ de precisión',
      name: 'Renacimiento del Rock',
    },
    scoreScholar: {
      description: 'Consigue 7,500+ puntos en una sola canción',
      name: 'Erudito de la Puntuación',
    },
    scoreScout: {
      description: 'Consigue 5,000+ puntos en una sola canción',
      name: 'Explorador de Puntuación',
    },
    scoreSensei: {
      description: 'Consigue 9,500+ puntos en una sola canción',
      name: 'Sensei de la Puntuación',
    },
    scoreTitan: {
      description: 'Consigue 11,500+ puntos en una sola canción',
      name: 'Titán de la Puntuación',
    },
    slothSerenade: {
      description: 'Velocidad 0.6x Y sin guía de tono — relajado pero a ciegas',
      name: 'Serenata Perezosa',
    },
    slowGroove: {
      description: 'Canta una canción de ≤90 BPM con un 75%+ de precisión',
      name: 'Ritmo Slow',
    },
    speedDemonPlus: {
      description: 'Velocidad 1.75x — ¡para pulmones de rayo!',
      name: 'Demonio de Velocidad+',
    },
    spotless: {
      description: 'Falla como máximo 8 notas en una sola canción',
      name: 'Sin Mancha',
    },
    sprintSinger: {
      description: 'Canta una canción de menos de 3 minutos con un 80%+ de precisión',
      name: 'Cantante Veloz',
    },
    surgical: {
      description: 'Falla como máximo 3 notas en una sola canción',
      name: 'Precisión Quirúrgica',
    },
    synthwaveSailor: {
      description: 'Canta una canción de los años 80 con un 78%+ de precisión',
      name: 'Navegante Synthwave',
    },
    toneTuner: {
      description: 'Termina una canción con un 88%+ de precisión',
      name: 'Afinador de Tono',
    },
    turboMemory: {
      description: 'Velocidad 1.25x Y 35% de palabras ocultas',
      name: 'Memoria Turbo',
    },
    turtleTempo: {
      description: 'Velocidad 0.5x — saborea cada nota',
      name: 'Tempo Tortuga',
    },
  },
  onlineStats: {
    title: 'Estadísticas online',
    loading: 'Cargando datos online…',
    unavailable: 'Los datos online no están disponibles ahora mismo',
    crowns: 'Coronas por canción (#1)',
    topPercent: 'Top {p}%',
    rankOf: 'Puesto #{rank} de {total}',
    notRanked: 'Sin clasificar',
    points: 'Puntos online',
    crownExample: 'p. ej.',
    recentPlays: 'Últimas rondas online',
    noPlays: 'Aún no hay rondas online.',
    unknownSong: 'Canción desconocida',
  },
};
