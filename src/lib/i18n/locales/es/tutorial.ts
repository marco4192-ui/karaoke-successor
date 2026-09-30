// ES translations — tutorial
// Basado en el archivo EN (src/lib/i18n/locales/en/tutorial.ts) — misma
// estructura de claves, solo valores traducidos.
export const tutorialTranslations = {
  tutorial: {
    // ? menú de ayuda
    helpButtonTitle: 'Ayuda y tutoriales',
    helpDialogTitle: 'Ayuda y tutoriales',
    helpDialogDesc: 'Vuelve a ver los tours completos — o salta directo a un tema y deja que te expliquen solo esa parte.',
    helpFooter: 'Teclado del tour: → siguiente · ← atrás · Esc salir',
    startFullTour: 'Tour completo',
    stepsCount: '{n} pasos',
    completedBadge: 'Completado',
    // Grupos de tours en el menú de ayuda (R29: 8 tours necesitan estructura)
    groupGettingStarted: 'Primeros pasos',
    groupAreas: 'Áreas y funciones',
    groupAdvanced: 'Para expertos',
    // Controles del overlay
    ariaLabel: 'Tour guiado',
    skipTour: 'Terminar tour',
    back: 'Atrás',
    next: 'Siguiente',
    finish: 'Listo',
    clickHint: 'Haz clic ahora',
    // Despliegue "Más información" (R29)
    moreDetails: 'Más información',
    lessDetails: 'Mostrar menos',
    // Oferta del primer arranque
    offerTitle: '¡Bienvenido a Karaoke ZERO!',
    offerBody: '¿Quieres un recorrido rápido por lo básico? En 2 minutos conocerás los desafíos diarios, los modos de canto, la biblioteca y los juegos de fiesta.',
    offerStart: 'Iniciar tour',
    offerLater: 'Quizás más tarde',
    offerHint: 'Disponible en cualquier momento con el icono ? de la barra de menú.',

    // ═══ Tour básico ═══
    basic: {
      title: 'Conceptos básicos',
      desc: 'La vuelta completa: desafíos, modos de canto, biblioteca, fiesta y más.',
      chapters: {
        welcome: 'Bienvenida',
        challenges: 'Diarios y semanales',
        singing: 'Empezar a cantar',
        party: 'Modos de fiesta',
        more: 'Más áreas',
      },
      steps: {
        welcome: {
          title: '¡Bienvenido! 👋',
          body: 'Esto es un tour en vivo: resalto los puntos importantes y te los explico.\n\nControles: "Siguiente" (o tecla →), "Atrás" (←) y "Terminar tour" (Esc). ¡Vamos!',
          details: 'Puedes pausar el tour cuando quieras y retomarlo más tarde: el icono ? de la barra de menú abre el menú de ayuda con todos los tours — también puedes reproducirlos capítulo por capítulo.\n\nMuchos pasos tienen abajo un botón "Más información": despliega detalles extra sin perder el texto corto.',
        },
        heroButtons: {
          title: 'Inicio rápido',
          body: '"Empezar a Cantar" te lleva directo a la biblioteca. "Modo Fiesta" abre los 9 juegos de fiesta para grupos.',
          details: 'Las tarjetas de inicio rápido son atajos para los caminos más comunes:\n• "Empezar a Cantar" = abrir la biblioteca, elegir canción y a cantar (solo, duelo o dúo).\n• "Modo Fiesta" = la colección de juegos para hasta 32 jugadores; los móviles pueden unirse como micrófonos.\n\nTodo lo que ves aquí también está en la barra de menú — las tarjetas solo te ahorran clics.',
        },
        dailyCard: {
          title: 'Desafío diario',
          body: '5 huecos al día con tareas rotativas — cuantos más completes, mayor tu bono de XP. Tareas nuevas a medianoche.',
          details: 'Cómo funciona el sistema:\n• Cada uno de los 5 huecos contiene un tipo de tarea distinto (p. ej. "canta una canción de los 80", "consigue 8000 puntos").\n• Los huecos se desbloquean en secuencia — el hueco 2 solo tras completar el hueco 1.\n• Cada hueco se puede jugar en varias dificultades; las más altas dan más XP (hasta multiplicador ×3).\n• El bono crece con el número de huecos completados: 5/5 da el bono diario completo.\n\nLas tareas salen de TU biblioteca — la selección siempre se adapta a tus canciones.',
        },
        weeklyCard: {
          title: 'Desafío semanal',
          body: 'La contraparte semanal: 5 huecos a lo largo de la semana con recompensas de XP mayores. Perfecto para metas a largo plazo.',
          details: 'Los desafíos semanales funcionan como los diarios, pero:\n• Los 5 huecos duran 7 días — sin reinicio diario, completa a tu ritmo.\n• Las recompensas de XP por hueco son mayores: 250–500 XP de base en vez de las 100–200 diarias — y el multiplicador de dificultad (hasta 3×) se aplica además.\n• El reinicio llega el lunes por la mañana.\n\nConsejo: diario y semanal van en paralelo — jugar con ambos subes de nivel mucho más rápido.',
        },
        modeLauncher: {
          title: 'Cantar: individual, duelo y dúo',
          body: '🎤 Individual: un jugador, un micrófono.\n⚔️ Duelo: dos jugadores en la MISMA canción — gana quien tenga más puntos.\n🎭 Dúo: dos voces en dos pistas — la biblioteca muestra automáticamente solo las canciones de dúo que encajan.',
          details: 'Los tres modos en detalle:\n• Individual: karaoke clásico — cantas todas las notas y tu puntuación entra en las tablas.\n• Duelo: ambos jugadores cantan a la vez la misma pista de notas. Los puntos corren por separado — la comparación final muestra quién fue mejor. Perfecto para revanchas.\n• Dúo: la canción tiene dos voces separadas (P1/P2) — cada quien canta "sus" partes; las frases compartidas dan bono de equipo. Las canciones de dúo se marcan con el filtro 🎭 en la biblioteca.\n\nMicrófonos: hasta 4 micrófonos físicos más smartphones como entradas adicionales (ver Ajustes → Micrófono).',
        },
        libraryNav: {
          title: 'La biblioteca',
          body: 'Aquí viven todas tus canciones. Busca por título o artista — la búsqueda difusa incluso perdona los errores tipográficos.',
          details: 'Consejos de búsqueda:\n• La búsqueda difusa encuentra "Dancing Qun" → "Dancing Queen". Ignora mayúsculas y errores sueltos.\n• Busca título, artista Y género a la vez — "Rock" también encuentra canciones del género Rock.\n\nOrdena con el menú desplegable (título A–Z, artista, añadidas recientemente). Las canciones llegan a la biblioteca por importación, escaneo de carpetas o listas — el camino está en la pestaña Biblioteca de los ajustes.',
        },
        filters: {
          title: 'Filtros',
          body: 'Género, idioma, año, década, canciones de dúo y éxitos virales — trocea la biblioteca como quieras.',
          details: 'Todos los filtros se combinan — p. ej. "Género: Rock + Idioma: Inglés + Época: 80s" muestra exactamente las canciones de rock en inglés de los ochenta.\n\nFiltros especiales:\n• Dúo: solo canciones con dos pistas de voz.\n• Éxitos virales: canciones que están ahora mismo en las listas virales (se configura en Ajustes → Biblioteca).\n• Géneros e idiomas propios: crea tus propias categorías en Ajustes → Géneros e Idiomas — aparecen al instante en estos filtros.\n\n"Restablecer filtros" (✕) lo limpia todo de una vez.',
        },
        songCard: {
          title: 'Canciones',
          body: 'Al hacer clic en una tarjeta de canción se abre el diálogo de inicio: modo, jugadores, micrófonos y dificultad.',
          details: 'Cada tarjeta de canción muestra:\n• Portada más título/artista\n• Dificultad (fácil/media/difícil/experto) y valoración en estrellas\n• Metadatos clave como género e idioma — directamente de la canción o armonizados por IA (Editor → Estudio de Metadatos)\n\nEl icono de vista previa reproduce un breve avance sin abrir el diálogo de inicio.',
        },
        startModal: {
          title: 'El diálogo de inicio',
          body: 'Configura todo aquí: modo (individual/duelo/dúo), quién canta, qué micrófono recibe cada quien y la dificultad.\n\nLuego pulsa "Inicio" — ¡y a cantar!',
          details: 'Las opciones clave:\n• Modo: individual, duelo (2 jugadores, misma pista) o dúo (2 voces) — en modo dúo ambos jugadores eligen su voz (P1/P2).\n• Micrófonos: cada jugador puede tener su propio dispositivo de entrada — o un smartphone como micrófono (app compañera).\n• Dificultad: afecta a la puntuación — las dificultades más altas perdonan menos y premian la precisión (más potencial de puntos, más XP).\n• "Añadir a la cola" en vez de "Inicio": encola la canción en lugar de empezar de inmediato — ideal cuando varias personas quieren cantar.',
        },
        partyCard: {
          title: 'Modos de fiesta',
          body: '9 juegos para hasta 32 jugadores: Battle Royale, Pasa el Micrófono, Concurso de Medley, torneo, palabras faltantes, karaoke a ciegas y más — los móviles pueden unirse como micrófonos.',
          details: 'Los 9 modos de un vistazo:\n• Battle Royale: cantan todos, el más flojo queda eliminado cada ronda — gana el último en pie.\n• Pasa el Micrófono: el micro va rotando de jugador en jugador — cada quien canta su parte.\n• Concurso de Medley: los equipos cantan fragmentos cortos de canciones con reglas especiales.\n• Torneo: bracket de eliminación con duelos — el ganador asciende cada ronda.\n• Palabras Faltantes: la letra se va tapando — canta la palabra que falta para puntuar.\n• Karaoke a Ciegas: la pista de notas se oscurece en ciertos pasajes — ¡solo de oído!\n• Valora mi Canción, Companion Sing-A-Long y más — cada tarjeta de modo se explica sola.\n\nCasi todos los modos admiten la app compañera como micrófono y mando.',
        },
        partyModes: {
          title: 'El selector de modos',
          body: 'Aquí eliges el modo de fiesta: Battle Royale (el último en pie), Pasa el Micrófono, torneo (bracket), medley y más.\n\nCada tarjeta muestra qué esperar — un clic abre la selección de jugadores.',
          details: 'Tras pulsar una tarjeta de modo llega la selección de jugadores: elige perfiles (o conecta dispositivos compañeros) y luego ajusta tamaños de equipo, número de rondas o límites de tiempo según el modo.\n\nConsejo para fiestas temáticas: con un tema activo en los ajustes (p. ej. "Fiesta 80s"), cada selección de canciones en el modo fiesta saca solo automáticamente canciones que encajan — la fiesta no se sale del tema.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoke sin competición: crea listas, encola canciones, comparte tus favoritas. El perfecto animador de fondo.',
          details: 'El jukebox es el modo relajado:\n• Elige listas o canciones sueltas como repertorio.\n• Pausas de vídeo opcionales entre canciones para que el ambiente nunca se rompa.\n• Sin puntuación, sin necesidad de micrófonos — las canciones pasan con su letra.\n\nPerfecto como entretenimiento para toda la noche o para calentar ambiente antes de la primera ronda.',
        },
        jukeboxView: {
          title: 'Dentro del menú del jukebox',
          body: '"Explorar listas" te da acceso directo a todas las listas guardadas — incluidas las que creaste en la biblioteca. Un clic encola la lista completa.',
          details: 'Los ajustes de listas del jukebox ofrecen:\n• Si se muestran los vídeos (si las canciones los tienen)\n• Modo de pausa de vídeo: vídeos de intermedio entre canciones, p. ej. para anuncios\n• Si el repertorio se mezcla o sigue un orden fijo\n\nArranca a pantalla completa — sal con Escape o el botón de parada de arriba.',
        },
        highscoreCard: {
          title: 'Puntuaciones',
          body: 'Mejores puntuaciones por canción y dificultad — vence a tus amigos (o a ti mismo).',
          details: 'Las tablas recuerdan, por canción y dificultad:\n• Puntuación, precisión, notas doradas y fecha\n• Qué jugador logró la entrada (avatar del perfil)\n• Si la entrada llegó vía app compañera (icono de teléfono) o desde el escritorio\n\nCon el modo online activado (pantalla de perfiles) además verás tablas globales y competirás con jugadores de otras instalaciones.',
        },
        highscoreView: {
          title: 'Las tablas de puntuaciones',
          body: 'Filtradas por canción y dificultad — con la barra de filtros de arriba. Los iconos de teléfono muestran el uso de la app compañera.',
          details: 'La barra de filtros superior permite:\n• Buscar por canción o jugador\n• Filtrar por dificultad\n• Cambiar entre local y global (con el modo online activado)\n\nAnti-trampas: cada entrada lleva una huella de canción — los resultados manipulados se detectan y se marcan.',
        },
        settingsCard: {
          title: 'Ajustes',
          body: 'Micrófonos, idioma, ajuste fino del juego, apariencia y gráficos — todos los controles viven aquí.',
          details: 'Las 12 pestañas de ajustes en un flash:\n• General: idioma, dificultad por defecto, online\n• Juego: puntuación, partículas, combo, grabación de repeticiones\n• Apariencia: temas, estilo de letra, fondo\n• Audio: dispositivo de salida, volumen, sonoridad, calidad de YouTube\n• Micrófono: dispositivos, sensibilidad, puerta de ruido, presets\n• Móvil: conectar y gestionar dispositivos compañeros\n• Cámara Web: cámara web como fondo\n• Biblioteca: carpeta de canciones, importación, charts virales, reinicio\n• Géneros e Idiomas: categorías propias\n• Fiesta Temática: activar y configurar el tema\n• Sincronización y Copia: redes de seguridad\n• Acerca de: versión, plataforma, licencias\n\nHay un tour de ajustes dedicado y en profundidad para todas las pestañas en el menú de ayuda ?.',
        },
        settingsView: {
          title: 'Las pestañas de ajustes',
          body: 'Elige una sección arriba: General (idioma), Juego, Apariencia, Audio, Micrófono, Móvil (conexión del teléfono) y más.',
          details: 'Un breve texto introductorio arriba de cada pestaña explica para qué sirve — nunca tendrás que adivinar a dónde pertenece una opción.\n\nEl tour que encaja: "Ajustes" en el menú de ayuda ? te guía por cada pestaña.',
        },
        finish: {
          title: '¡Listo! 🎉',
          body: 'Ya conoces lo básico.\n\nConsejo: el icono ? de la barra de menú te trae de vuelta en cualquier momento — incluidos capítulos sueltos por tema, el tour del editor y el tour de ajustes.',
          details: '¿Y ahora qué? Algunas sugerencias para tus primeros minutos:\n1. Crea un perfil (Perfiles en la barra de menú) — sin uno juegas, pero no recoges XP.\n2. Importa canciones (Ajustes → Biblioteca).\n3. Unas rondas de desafío diario para el empujón de XP.\n4. ¿Vienen amigos? Prueba el modo fiesta — la app compañera convierte cualquier teléfono en micrófono (hay un tour dedicado a ello).',
        },
      },
    },

    // ═══ Tour del editor ═══
    editor: {
      title: 'Tour del editor',
      desc: 'Notas, letras, voces y armonización — la caja de herramientas de canciones.',
      chapters: {
        entry: 'Entrar',
        layout: 'Distribución',
        notes: 'Editar notas',
        extras: 'Extras y armonizar',
      },
      steps: {
        welcome: {
          title: 'El editor ✏️',
          body: 'Aquí las canciones se convierten en pistas de karaoke jugables: coloca notas, sincroniza letras, asigna voces.\n\nConsejo de prueba: practica con una canción de prueba — los cambios se deshacen con Ctrl+Z.',
          details: 'El editor trabaja con el formato UltraStar: cada nota tiene un tiempo de inicio, una duración, un tono y un texto (sílaba). Muchas notas forman la pista de notas que ves en el juego.\n\nFuentes de canciones nuevas:\n• Importación de texto (UltraStar/TXT) en el editor\n• Importación MIDI (notas generadas a partir de un MIDI)\n• Armonización IA: letra + audio → sugerencias de notas\n\nTodo es no destructivo: hasta que guardes, la canción original queda intacta.',
        },
        songList: {
          title: 'Selección de canción',
          body: 'Busca una canción para abrirla. Los filtros revelan canciones con metadatos faltantes — el editor las armoniza después.',
          details: 'Los chips de filtro sobre la lista muestran canciones sin género/idioma/año — la vía más rápida a las que el Estudio de Metadatos aún no ha procesado.\n\nLa búsqueda cubre título y artista — las mayúsculas no importan.',
        },
        noSongs: {
          title: 'Aún no hay canciones',
          body: 'El editor necesita canciones en la biblioteca. Importa primero canciones (biblioteca → importar / escaneo de carpeta) y vuelve.',
          details: 'Cómo conseguir canciones:\n• Ajustes → Biblioteca → define la carpeta de canciones: cada subcarpeta se lee como una canción (audio/vídeo + texto UltraStar).\n• Alternativamente, archivos sueltos con el diálogo de importación.\n• O crea una canción nueva en el editor ("Nueva Canción") y junta tú mismo letra + audio.',
        },
        openSong: {
          title: 'Abrir una canción',
          body: 'Haz clic ahora en una canción de la lista para abrirla en el editor.',
          details: 'Una vez abierta verás arriba la barra de herramientas (subencabezado) y la línea de tiempo con forma de onda, carriles de notas y letras.\n\nLa canción permanece abierta hasta que la cierres con "Atrás" — los cambios sin guardar piden antes confirmación.',
        },
        leftPanel: {
          title: 'Barra de herramientas',
          body: 'Todo para las notas: añadir, duplicar, borrar, dividir, fusionar — más tipos de nota, voces y modo tap (a continuación).',
          details: 'Las herramientas en orden:\n• ➕ Añadir nota: cae en el cabezal de reproducción\n• ⧉ Duplicar: copia la nota seleccionada justo detrás\n• 🗑 Borrar: elimina la selección\n• ✂ Dividir: una nota → dos (por la mitad)\n• ⇄ Fusionar: une la nota seleccionada con la siguiente\n\nSelección con clic; Mayús+clic para varias. Después manda el teclado: ⌫ borra, ↑/↓ transpone, ←/→ desplaza.',
        },
        lyricsPanel: {
          title: 'Panel de letras',
          body: 'Las líneas de letra están a la izquierda. Doble clic en una línea para saltar la reproducción justo ahí — texto y tiempos se editan aquí.',
          details: 'El panel de letras es texto Y tiempo a la vez:\n• Al hacer clic en una sílaba se selecciona la nota correspondiente en la línea de tiempo.\n• El doble clic salta al punto (la reproducción lo sigue).\n• El clic derecho (o el icono de lápiz) abre la edición de línea: cambia el texto, divide sílabas por límites de palabra, desplaza el tiempo de toda la línea.\n\nLa división por límites de palabra usa detección de idioma para repartir las sílabas entre las palabras con sentido — se acabó el corte manual.',
        },
        subHeaderTools: {
          title: 'Editar notas',
          body: 'Las notas son los bloques en los carriles de tono: añadir, duplicar, borrar, dividir (una nota → dos) y fusionar (con la siguiente nota).\n\nEdita las notas seleccionadas a toda velocidad: ⌫ borra, ↑/↓ transpone.',
          details: 'Consejos de precisión:\n• Zoom: Ctrl+rueda del ratón sobre la línea de tiempo — acércate para afinar los tiempos.\n• Reproducción: Espacio alterna reproducir/pausar, Mayús+Espacio reproduce solo la selección.\n• Transponer varias notas: selecciónalas todas, ↑/↓ mueve todo el paquete.\n\nPara el timing: el inicio de la nota debe caer en el ataque de la sílaba en la voz — la forma de onda ayuda a encontrar los ataques.',
        },
        noteTypes: {
          title: 'Tipos de nota',
          body: '5 tipos para notas nuevas:\n: Normal (cuenta el tono)\n* Dorada (puntos extra)\nF Libre (cualquier nota cuenta)\nR Rap (solo el tiempo)\nG Rap dorada',
          details: 'Lo que significa cada tipo en el juego:\n• Normal (:): la nota de canto clásica — cuentan tono y tiempo.\n• Dorada (*): se pinta dorada, puntos dobles al acertar. Perfecta para los momentos estrella de la canción.\n• Libre (F): el tono da igual, solo cuentan texto/tiempo — bien para partes habladas.\n• Rap (R): valora tiempo y ritmo en vez de melodía.\n• Rap dorada (G): como el rap, pero con puntos extra.\n\nEl tipo se puede cambiar después: selecciona la nota y elige otro tipo en la barra de herramientas.',
        },
        voices: {
          title: 'Voces',
          body: 'P1 = jugador 1, P2 = jugador 2 (¡dúo!), P4/P8 = tercera/cuarta voz. Cada nota pertenece a una voz — así se crean las canciones de dúo con partes separadas.',
          details: 'Asignación de voces:\n• El desplegable de voz elige la pista donde caen las notas nuevas.\n• Las notas colocadas pueden moverse: selecciónalas y cambia la voz.\n• En el modo dúo del juego, cada jugador elige su pista — la biblioteca filtra automáticamente las canciones con al menos 2 voces.\n\nP4/P8 hasta permiten formaciones de cuarteto; los modos principales del juego usan P1/P2.',
        },
        tapMode: {
          title: 'Modo tap — el turbo 🥁',
          body: 'Mantén pulsada la tecla y marca el ritmo: cada clic deja caer una nota en la posición de reproducción actual, línea de letra por línea de letra. Crea notas en tiempo real.',
          details: 'Cómo corre la grabación tap:\n1. Activa el modo tap en la barra de herramientas.\n2. Inicia la reproducción — la canción suena con audio audible.\n3. Haz clic al ritmo de las sílabas — cada interacción deja una nota en el cabezal con el último tono elegido.\n4. Después pule: corrige tonos (↑/↓ con las notas seleccionadas) y ajusta duraciones.\n\nEl modo tap es 5–10× más rápido que colocar notas a mano — canciones enteras en minutos en vez de horas.',
        },
        panels: {
          title: 'Paneles superiores',
          body: 'Tres paneles arriba a la derecha: metadatos (género/idioma/año), análisis de audio y el asistente IA.',
          details: 'Lo que hacen los tres paneles:\n• Metadatos: edita directamente género, idioma y año de la canción abierta — alimenta filtros y fiesta temática.\n• Análisis de audio: analiza el archivo de audio (sonoridad, tonalidad, BPM) y sugiere valores.\n• Asistente IA: completado de letras, identificación de canciones y armonización de notas por IA — requiere un proveedor de IA configurado (Ajustes → IA).',
        },
        metadataStudio: {
          title: 'Estudio de Metadatos',
          body: 'El turbo de la armonización: sugerencias de IA y por reglas para género, idioma y año — con escucha antes de asignar, edición fina manual y cola de revisión para coincidencias dudosas.',
          details: 'El flujo del estudio:\n1. "Analizar todas las canciones" — el motor de reglas (rutas de archivo, etiquetas) y opcionalmente la IA sugieren género/idioma/año.\n2. Las sugerencias traen nivel de confianza: verde = seguro, amarillo = revisar.\n3. Escucha: al hacer clic en una canción suena un fragmento — verifica las sugerencias por la vía rápida.\n4. Asigna individualmente o "aplicar todos los verdes".\n\nLa cola de revisión reúne las coincidencias dudosas para más tarde — no se pierde nada.',
        },
        shortcuts: {
          title: 'Atajos',
          body: 'Todos los atajos de teclado de un vistazo — el editor es un instrumento de teclado. ¡Pasa por ellos!',
          details: 'Los atajos más importantes:\n• Ctrl+Z / Ctrl+Y: deshacer / rehacer\n• Espacio: reproducir/pausar\n• ⌫: borrar las notas seleccionadas\n• ↑/↓: transponer (Mayús = octava completa) · ←/→: desplazar en el tiempo (Mayús = paso grueso)\n• M: fusionar con la siguiente nota\n• Ctrl+S: guardar · Ctrl+C/V: copiar/pegar notas\n\nEl panel de atajos de la barra izquierda muestra todas las teclas de un vistazo.',
        },
        finish: {
          title: '¡Listo para construir! 🛠️',
          body: 'Ya conoces la caja de herramientas del editor.\n\nRecuerda: Ctrl+Z lo salva todo, y el icono ? de la barra de menú te devuelve a estos capítulos cuando quieras.',
          details: 'Orden recomendado para una canción nueva:\n1. Adjuntar audio/vídeo (pestaña de información de la canción)\n2. Importar o escribir la letra (pestaña de letras)\n3. Marcar las notas (modo tap) o armonización IA\n4. Cuidar los metadatos (género/idioma/año — ¡importantes para los filtros!)\n5. Guardar — desde ahora la canción aparece en la biblioteca.',
        },
      },
    },

    // ═══ Tour de ajustes (R28) ═══
    settings: {
      title: 'Ajustes',
      desc: 'Todos los ajustes de un vistazo: pestañas, ajustes generales, audio, biblioteca, dispositivos compañeros y copia de seguridad.',
      chapters: {
        overview: 'Vista general',
        basics: 'Ajustes básicos',
        sound: 'Audio y micrófono',
        library: 'Biblioteca y tema',
        devices: 'Dispositivos y Companion',
        data: 'Sincronización, copia e info',
      },
      steps: {
        welcome: {
          title: 'Los ajustes 👋',
          body: 'Este tour recorre exclusivamente los ajustes — pestaña por pestaña.\n\nCambio automáticamente a cada pestaña y te explico lo que encontrarás allí.',
          details: 'Las pestañas en el orden del tour: General, Juego, Apariencia, Audio, Micrófono, Móvil (companion), Cámara Web, Biblioteca, Géneros e Idiomas, Fiesta Temática, Sincronización y Copia y Acerca de.\n\nCada pestaña tiene una breve intro arriba — este tour la profundiza paso a paso.',
        },
        tabBar: {
          title: 'La barra de pestañas',
          body: 'Todos los ajustes se organizan en pestañas: General, Juego, Apariencia, Audio, Micrófono, Móvil, Cámara Web, Biblioteca, Géneros e Idiomas, Fiesta Temática, Sincronización y Copia y Acerca de.\n\nUn breve texto introductorio arriba de cada pestaña explica para qué sirve.',
          details: 'Ayuda de orientación — al buscar, pregúntate…\n• "¿Cómo se COMPORTA el juego?" → Juego\n• "¿Cómo SE VE?" → Apariencia\n• "¿Cómo SUENA?" → Audio / Micrófono\n• "¿Conectar dispositivos?" → Móvil (companion) / Micrófono\n• "¿Mis canciones?" → Biblioteca\n• "¿Hacer copia de seguridad?" → Sincronización y Copia\n\nLas pestañas se desplazan en horizontal en ventanas estrechas — solo desliza hacia la derecha.',
        },
        general: {
          title: 'General',
          body: 'Idioma de la interfaz, dificultad por defecto, actividades online y la descripción completa de los atajos de teclado.',
          details: 'Idioma: hay 16 idiomas disponibles. El cambio se aplica en vivo a toda la interfaz.\n\nDificultad por defecto: se aplica a las rondas nuevas salvo que el diálogo de inicio elija otra.\n\nLas actividades online controlan si las puntuaciones se suben globalmente y si los desafíos diarios se generan online.',
        },
        gameplay: {
          title: 'Juego',
          body: 'Visualización de la puntuación, efectos de partículas, visualización del combo, grabación de repeticiones, pantalla completa automática y más interruptores de comportamiento para rondas y resultados.',
          details: 'Los interruptores clave:\n• Visualización de la puntuación: para cantar por puro divertimento, sin marcador.\n• Partículas y efectos: desactívalos en máquinas más flojas.\n• Repetición: graba audio y cámara web mientras cantas — la repetición se reproduce en la pantalla de resultados.\n• Pantalla completa automática: entra en pantalla completa automáticamente al empezar una canción.\n• Señales de aviso sonoras: pitidos breves antes de las secciones a ciegas y palabras ocultas.\n\nAdemás: visualización del combo y más.',
        },
        appearance: {
          title: 'Apariencia',
          body: 'Temas, fondo animado o tu propio vídeo de fondo, estilo y tamaño de letra, visualización de notas y el modo rendimiento para máquinas más flojas.',
          details: 'Estilo de letra: 10 temas visuales — "Clásico", "Concierto", "Retro", "Neón", "Mínimo" y más.\n\nFondo: además de los temas, también vale un vídeo propio — en el juego corre detrás de las notas, atenuado.\n\nEl modo rendimiento recorta animaciones y fondos drásticamente — merece la pena desde hardware de ~2015.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Dispositivo de salida (incl. ASIO), volumen general y de vista previa, sensibilidad del micrófono, normalización de sonoridad y calidad de vídeo de YouTube.',
          details: 'ASIO: solo relevante para Windows + tarjetas de sonido compatibles con ASIO — reduce la latencia del monitoreo del micro.\n\nLa normalización de sonoridad iguala las diferencias de volumen entre canciones — los valores por defecto están bien elegidos.\n\nCalidad de YouTube: afecta a las canciones con fuente de vídeo de YouTube; más calidad = más ancho de banda.',
        },
        microphone: {
          title: 'Micrófono',
          body: 'Selección de dispositivo, sensibilidad, puerta de ruido y nivel en vivo — además de presets. Los smartphones se conectan por la pestaña Móvil.',
          details: 'Presets: configuraciones típicas ("Óptimo", "Baja Latencia", "Alta Precisión", "Entorno Ruidoso", "Voces Graves (Bajo)", "Voces Agudas (Soprano)") ajustan sensibilidad + puerta de ruido en combinaciones sensatas.\n\nPuerta de ruido: filtra respiraciones y ruido de sala — el nivel en vivo muestra en tiempo real qué pasa.\n\nImportante para multijugador: CADA jugador puede tener SU PROPIO dispositivo — la asignación se hace en el diálogo de inicio por ronda.',
        },
        libraryTab: {
          title: 'Biblioteca',
          body: 'Define la carpeta de canciones (cada subcarpeta = una canción) y escanéala, reinicia la biblioteca o borra todos los datos — más la importación desde otros sistemas de karaoke.',
          details: 'Formato de carpeta: una subcarpeta por canción con audio/vídeo + TXT (formato UltraStar). El escáner reconoce las combinaciones habituales (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImportar de otros sistemas: ¿un archivo SingStar? ¿una colección UltraStar? El conversor de importación toma metadatos y letras automáticamente.\n\nCuidado con "borrar todos los datos": la doble confirmación pregunta dos veces — aun así, haz antes una copia (pestaña Sincronización y Copia).',
        },
        taxonomy: {
          title: 'Géneros e Idiomas',
          body: 'Crea tus propias entradas de género e idioma — aparecen en todos los desplegables y alimentan la armonización por IA.',
          details: '¿Para qué entradas propias? Las listas estándar no lo cubren todo ("Schlager", "K-Pop", "Dialecto"…). Las entradas propias:\n• aparecen al instante en los filtros de la biblioteca\n• se pueden elegir en el editor y en el Estudio de Metadatos\n• se armonizan con el resto (la IA las sugiere para canciones que encajan)\n\nBorrar también funciona — las canciones conservan la entrada hasta que se reasigne.',
        },
        motto: {
          title: 'Fiesta Temática',
          body: 'Pon todo el juego en un tema (p. ej. una fiesta 80s): al activarlo, el tema sustituye todos los campos de búsqueda y filtros — cada selección de canciones solo saca canciones que encajan.',
          details: 'El filtro temático conoce varios campos, combinables libremente (lógica Y):\n• Género (p. ej. rock)\n• Idioma (p. ej. inglés)\n• Época/año (p. ej. 1980–1989)\n\nEfecto: biblioteca, selección de canciones del modo fiesta Y app compañera muestran solo el repertorio del tema — los invitados no pueden elegir nada fuera de tema.\n\nAl desactivar el tema todo vuelve al instante a la vista normal; las canciones cantadas y las puntuaciones quedan intactas.',
        },
        mobile: {
          title: 'Móvil y Companion',
          body: 'Conecta smartphones por código QR — como micrófono, mando a distancia o dispositivo para cantar. Ves todos los dispositivos conectados y sus códigos de conexión.',
          details: 'Conexión: escanea el código QR (¡misma WiFi!) o escribe la URL — el tour dedicado del companion explica los detalles en el menú de ayuda ?.\n\nEsta pestaña también muestra:\n• Todos los dispositivos conectados con su estado (activo, rol, última actividad)\n• La asignación de perfiles a dispositivos\n• La expulsión de dispositivos concretos\n\nLos códigos QR por perfil (para reclamar) viven en la tarjeta de ajustes de la pantalla de perfiles.',
        },
        webcam: {
          title: 'Cámara web',
          body: 'Usa la cámara web como fondo animado de la canción: resolución, espejo, saturación, desenfoque y más efectos — con vista previa en vivo.',
          details: 'El fondo de cámara web corre detrás de las notas durante la canción — ¡os veis cantar!\n\nEfectos: espejo (como un selfi), saturación, desenfoque suave, sepia — visibles al instante en la vista previa.\n\nPrivacidad: la cámara corre solo en local, no se guarda ni se envía nada.',
        },
        sync: {
          title: 'Sincronización y Copia',
          body: 'Crea y restaura copias de seguridad, sincroniza datos entre dispositivos. En la versión de escritorio, los datos de juego también se reflejan permanentemente en la carpeta AppData.',
          details: 'Una copia contiene: perfiles (con XP/progreso), puntuaciones, ajustes y definiciones de listas — como un único archivo para archivar o trasladar.\n\nEl espejo en AppData (versión de escritorio) protege contra la pérdida de datos del navegador: aunque se borre el almacenamiento del navegador, la versión de escritorio lo restaura todo.\n\nRestaurar sobrescribe los datos actuales — otra vez: haz antes una copia.',
        },
        about: {
          title: 'Acerca de',
          body: 'Versión, plataforma, licencias y proyectos colaboradores — la huella digital de Karaoke ZERO.',
          details: 'También ves el canal de la build (web/escritorio) y puedes buscar actualizaciones. Las licencias enumeran los proyectos de código abierto usados — ¡gracias a todos los implicados!',
        },
        finish: {
          title: '¡Todo configurado! ⚙️',
          body: 'Ya conoces todos los ajustes.\n\nEl icono ? de la barra de menú te trae de vuelta a este tour cuando quieras — capítulo a capítulo si lo prefieres.',
          details: 'Recomendación para tu primera noche de configuración:\n1. Pestaña Biblioteca: escanear la carpeta de canciones\n2. Pestaña Micrófono: elegir un preset + mirar el nivel en vivo\n3. Pestaña Móvil: conectar teléfonos (¡tour del companion!)\n4. Pestaña de tema: pensar un tema de fiesta\n5. Sincronización y Copia: sacar la primera copia\n\nCon eso, la noche de karaoke va sobre raíles.',
        },
      },
    },

    // ═══ Tour de perfiles (R29) ═══
    profile: {
      title: 'Perfiles y Personajes',
      desc: 'Crea jugadores, sigue XP y progreso, sincronización online y reclamación por el companion.',
      chapters: {
        overview: 'Vista general',
        characters: 'Personajes y progreso',
        online: 'Online y Companion',
      },
      steps: {
        welcome: {
          title: 'Tus perfiles de jugador 👤',
          body: 'Los perfiles son las identidades del juego: XP, nivel, estadísticas y logros viven en el perfil — y las puntuaciones llevan tu nombre.\n\nEste tour muestra cómo crear y gestionar perfiles.',
          details: '¿Para qué sirven los perfiles?\n• XP y nivel: las canciones cantadas, los desafíos y los logros acumulan experiencia — el nivel sube junto con el nombre de rango (Principiante → Divino).\n• Tablas de clasificación: las entradas de puntuación muestran tu avatar.\n• Modos de fiesta: cada selección de jugadores sale de esta lista.\n• Los dispositivos compañeros pueden "reclamar" un perfil y cantar bajo su identidad.\n\nLos perfiles viven en el almacenamiento del navegador (local) o en una cuenta online (sincronizada) — tú eliges al crearlos.',
        },
        topBar: {
          title: 'La barra de acciones',
          body: 'Aquí arriba activas las tablas online, cambias entre local y global y abres el formulario de creación de perfiles nuevos.',
          details: 'Los elementos de la barra:\n• Interruptor online: activa/desactiva las funciones online globalmente (tablas, registro de cuenta)\n• Local/Global: qué tabla muestra la vista de puntuaciones\n• "Cargar perfil": te identifica con un código de sincronización y trae tu perfil online a este dispositivo\n• "Nuevo perfil": abre el formulario de creación (siguiente paso)',
        },
        createButton: {
          title: 'Crear un perfil',
          body: '"Nuevo perfil" abre el formulario: nombre, imagen de avatar, país y modo de almacenamiento (local o con cuenta online).',
          details: 'Los campos del formulario:\n• Nombre: aparece en las tablas y en las fiestas\n• Avatar: sube tu propia foto o una inicial sobre un color\n• País: bandera para las tablas globales\n• Modo de almacenamiento: "Local" guarda solo en este dispositivo; "Online" registra opcionalmente una cuenta (email + contraseña) y permite sincronizar entre dispositivos.\n\nLas cuentas online solo existen con el modo online activado — el registro corre en segundo plano y el perfil se puede usar de inmediato.',
        },
        empty: {
          title: 'Aún no hay perfiles',
          body: 'Aquí toman forma tus jugadores. Pulsa "Nuevo perfil" y crea el primer personaje — todo funciona sin uno, pero XP y logros solo se recogen en perfiles.',
        },
        cards: {
          title: 'Las tarjetas de personaje',
          body: 'Cada tarjeta muestra avatar, nivel, rango y modo de almacenamiento. Al hacer clic se selecciona el perfil y se muestran sus detalles abajo.\n\nEl punto de arriba a la derecha: verde = activo, rojo = desactivado.',
          details: 'Símbolos de las tarjetas:\n• Burbuja ✓: el perfil activo actualmente (el diálogo de inicio lo recuerda)\n• Icono de rango + "Nv. X": el progreso del perfil\n• Insignia 💾/🌐: guardado local u online\n• Insignia 📱: este perfil está reclamado por un dispositivo companion\n• Bandera: el país elegido\n\nClic en una tarjeta = seleccionarla. La desactivación (rojo) se hace en la tarjeta de progreso — los perfiles desactivados desaparecen de las selecciones de jugadores pero conservan todos sus datos.',
        },
        progression: {
          title: 'La tarjeta de progreso',
          body: 'Barra de XP hasta el siguiente nivel más las estadísticas clave: canciones cantadas, notas doradas, mejor combo y puntuación total.\n\nEl interruptor de activo a la derecha desactiva el perfil temporalmente.',
          details: 'Entendiendo las estadísticas:\n• Canciones jugadas: cuenta cada ronda terminada\n• Notas doradas: recogidas por canción — muestra con qué precisión clavas los momentos estrella\n• Mejor combo: la racha impecable más larga de la historia\n• Puntuación total: suma de todas las puntuaciones\n\nEl interruptor de activo: los perfiles desactivados desaparecen de la selección de jugadores y de la cola (las canciones de duelo/dúo piden entonces re-selección) pero NO pierden nada — basta con reactivarlos.',
        },
        settingsCard: {
          title: 'Ajustes del perfil',
          body: 'Edita nombre y avatar, cambia el país, opciones de privacidad — y el código QR del perfil que permite a un teléfono reclamarlo.',
          details: 'Privacidad: controla qué estadísticas son visibles en las tablas globales.\n\nMostrar código QR: genera un código que apunta DIRECTAMENTE a este perfil — el teléfono que lo escanea se conecta como este perfil (ideal: cada cantante lleva su perfil en su teléfono).\n\nBorrar elimina el perfil permanentemente — las puntuaciones quedan como entradas anónimas. Para perfiles online, la app vuelve a preguntar antes de borrar.',
        },
        onlineToggle: {
          title: 'Tablas online',
          body: 'El interruptor activa las funciones online: puntuaciones globales, registro de cuenta y sincronización de perfiles entre dispositivos.',
          details: 'Apagado = totalmente offline: todo queda local, ninguna petición de red para las tablas.\n\nEncendido = aparece la pestaña "Global" en las tablas y puedes crear/cargar perfiles online.\n\nEl cambio se aplica al instante — las puntuaciones locales ya recogidas siempre se conservan.',
        },
        loginButton: {
          title: 'Cargar un perfil',
          body: '¿Ya estás registrado? "Cargar perfil" trae tu perfil online vía email/código de sincronización a este dispositivo — progreso y puntuaciones vienen con él.',
          details: 'El diálogo de inicio de sesión conoce dos vías:\n• Email + contraseña (como en el registro)\n• Código de sincronización: el código corto de tu perfil — más cómodo en una máquina ajena\n\nTras iniciar sesión, el perfil cargado se fusiona con el local (gana el progreso mayor). Desde entonces las sincronizaciones corren solas en segundo plano.',
        },
        companionClaim: {
          title: 'Reclamación por el companion 📱',
          body: 'Cuando un teléfono se conecta con un perfil, la tarjeta muestra un 📱. El teléfono canta y elige bajo ese perfil — nombre, XP y logros se acumulan allí.',
          details: 'Configurar la reclamación (3 vías):\n1. Escanear el código QR en los ajustes del perfil — conecta DIRECTAMENTE con ese perfil\n2. En el teléfono, tras conectar, elegir un perfil de la lista\n3. Aquí en la pestaña Móvil de los ajustes: dispositivo → asignar perfil\n\nUn perfil solo puede ser reclamado por UN dispositivo a la vez. Desconexión: en la pestaña Móvil o desde el propio teléfono.',
        },
        finish: {
          title: '¡Equipo completo! 🎭',
          body: 'Ya sabes cómo funcionan los perfiles — de la XP a la sincronización online y la reclamación por teléfono.\n\nSigue con los logros: el tour "Logros y Progreso" muestra lo que tu perfil puede conseguir.',
        },
      },
    },

    // ═══ Tour de la cola (R29) ═══
    queue: {
      title: 'Cola',
      desc: 'Encola canciones, reordena, reglas y solicitudes del companion.',
      chapters: {
        overview: 'Vista general',
        manage: 'Gestión',
        companion: 'Companion y atajos',
      },
      steps: {
        welcome: {
          title: 'La cola 🎶',
          body: 'La cola organiza tu noche de karaoke: las canciones se alinean, todo el mundo tiene su turno — nadie tiene que vigilar el PC.\n\nEste tour cubre el encolado, la ordenación y las reglas.',
          details: 'Tres vías de encolar:\n1. Biblioteca → clic en una canción → en el diálogo de inicio elige "Añadir a la cola" en vez de "Inicio"\n2. Tras una canción: "Reproducir Siguiente Canción" en la pantalla de resultados mantiene el flujo\n3. Por la app compañera: los invitados encolan desde sus teléfonos (marcados con insignias 📱)\n\nLa barra de menú muestra la longitud de la cola como botón contador — ves venir la noche.',
        },
        navButton: {
          title: 'El botón de la cola',
          body: 'En la barra de menú, "Cola" lleva hasta aquí — el número del botón muestra cuántas canciones esperan.',
        },
        title: {
          title: 'La cola de canciones',
          body: 'La lista muestra todas las canciones en espera con posición, modo (solo/duelo/dúo) y jugadores — ordenadas por hora de entrada.',
        },
        empty: {
          title: 'Todavía vacía',
          body: 'Aún no hay canciones en la cola. Añade algunas desde la biblioteca (diálogo de inicio → "Añadir a la cola") — o deja que los invitados encolen por la app compañera.',
        },
        list: {
          title: 'La lista de la cola',
          body: 'Cada tarjeta: posición, canción, insignia de modo y los jugadores. Un clic en una tarjeta arranca la canción de inmediato — incluso fuera de orden.',
          details: 'Las insignias:\n• 🎤 Solo / ⚔️ Duelo / 🎭 Dúo — el modo con que se encoló la canción\n• 📱 — añadida vía app compañera\n\nClic en una tarjeta = reproducir ahora. El botón ✕ de la derecha elimina la entrada, ▶ la arranca.\n\nTeclado: Enter reproduce, Supr elimina, ↑/↓ recorre la lista.',
        },
        reorder: {
          title: 'Cambiar el orden',
          body: 'Arrastra las tarjetas a su nueva posición — solo las entradas locales se pueden mover; las solicitudes del companion conservan su orden.',
          details: 'Arrastrar y soltar: agarra una tarjeta y sube o baja con el botón pulsado. La lista muestra en vivo la posición de destino.\n\nPor qué las entradas del companion quedan fijas: la app del invitado ordena por hora de envío — si el anfitrión pudiera barajarlas, las peticiones parecerían manipuladas. Aun así puedes eliminarlas.',
        },
        playNext: {
          title: 'Reproducir siguiente canción',
          body: 'El botón arranca la primera entrada — el movimiento estándar entre rondas. Alternativamente, haz clic directamente en cualquier tarjeta.',
          details: 'La pantalla de resultados tras cada canción ofrece el mismo botón ("Reproducir Siguiente Canción") — el flujo sigue sin desviarse a la vista de la cola.\n\nEl botón "Reproducir Siguiente Canción" de la vista de la cola hace lo mismo — la entrada superior arranca con un clic.',
        },
        clearAll: {
          title: 'Vaciar todo',
          body: '"Borrar Todo" vacía la cola completa — entradas del companion incluidas. No hay vuelta atrás, úsalo con cuidado.',
        },
        rules: {
          title: 'Las reglas',
          body: 'El reglamento oficial está abajo: máximo 3 canciones por jugador, orden FIFO, elimina tus propias canciones, elige primero un personaje…',
          details: 'Las reglas en detalle:\n• Máximo 3 canciones por jugador a la vez — nadie puede bloquear la cola. Quien ya cantó puede volver a encolar.\n• FIFO: primero en entrar = primero en cantar. Arrastrar y soltar reordena en local.\n• Las canciones propias se pueden eliminar en cualquier momento; las de otros solo con "Borrar Todo" o como anfitrión.\n• Primero el personaje: la cola necesita perfiles activos para duelo/dúo; si no, pide re-selección al iniciar.\n• Las solicitudes del companion muestran la insignia 📱 y cuentan como propias.',
        },
        companionAdd: {
          title: 'Peticiones desde el teléfono 📱',
          body: 'Los invitados encolan canciones por la app compañera — aparecen con insignia 📱 en la lista y cuentan para su límite de 3 canciones.',
          details: 'Cómo lo ven los invitados: en la app eligen canción, modo y envían — la petición aterriza en esta lista.\n\nTú como anfitrión ves al instante: quién la pidió (avatar del jugador) y que es una petición de teléfono (📱). El límite de 3 vale por perfil — también por teléfono.\n\nMás detalles en el tour del companion.',
        },
        autoplay: {
          title: 'Atajo y flujo',
          body: 'Ctrl+Q arranca la primera entrada de la cola desde cualquier lugar — el clásico cuando la siguiente ronda debe rodar ya.',
          details: 'El flujo entre rondas: termina la canción → pantalla de resultados → botón "Reproducir Siguiente Canción" (o Ctrl+Q) mantiene la noche en marcha.\n\nCtrl+Q funciona desde cualquier sitio — sin desviarse a la vista de la cola.',
        },
        finish: {
          title: '¡La cola espera! 🎧',
          body: 'Ya conoces el encolado, la ordenación y las reglas.\n\nConsejo: combina el atajo Ctrl+Q + peticiones del companion para una noche de karaoke que se maneja sola.',
        },
      },
    },

    // ═══ Tour del chat (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Abrir el panel, enviar mensajes, el selector "enviar como" y desafíos de canción.',
      chapters: {
        basics: 'Abrir el chat',
        usage: 'Enviar mensajes',
        challenges: 'Desafíos',
      },
      steps: {
        welcome: {
          title: 'El chat de fiesta 💬',
          body: 'El chat conecta el escritorio y las apps compañeras: habla sin interrumpir el canto — e incluso retaos a duelos de canción.\n\nTe abro el panel en un momento.',
          details: 'Lo que puede hacer el chat:\n• Mensajes de texto entre el escritorio (anfitrión) y todos los teléfonos conectados\n• Elección de remitente: el anfitrión puede escribir en nombre de un jugador\n• Desafíos de canción: los invitados retan a duelos — acepta en el escritorio y a cantar\n\nRequisito: para que los teléfonos entren en la conversación, debe haber dispositivos compañeros conectados (pestaña Móvil de los ajustes — ver el tour del companion).',
        },
        navButton: {
          title: 'Abrir el chat',
          body: 'El botón de chat de la barra de menú abre el panel — entra como panel lateral sobre la pantalla y se cierra con ✕ o con un clic al lado.',
        },
        panel: {
          title: 'El panel de chat',
          body: 'El historial corre a la izquierda, tú escribes abajo. El panel permanece abierto hasta que lo cierres — incluso al cambiar de pantalla.',
        },
        messages: {
          title: 'El historial',
          body: 'Tus mensajes aparecen a la derecha en cian (como anfitrión); las contribuciones de los teléfonos, a la izquierda en morado. Cada mensaje lleva su hora.',
          details: 'Actualización en segundo plano: el panel recoge mensajes nuevos cada 3 segundos — no te pierdes nada aunque corra en segundo plano.\n\nEl botón de chat de la barra de menú se queda en su sitio — los mensajes nuevos están ahí en cuanto vuelvas a abrir el panel.',
        },
        sendAs: {
          title: '"Enviar como"',
          body: 'Eres el anfitrión — pero puedes escribir en nombre de un jugador: el desplegable elige la identidad. 🖥️ = anfitrión, 📱 = jugador.',
          details: 'Para qué sirve:\n• El anfitrión teclea por alguien sin teléfono ("Anna dice: ¡otra vez el estribillo!")\n• Anuncios de escenario en nombre del perfil de moderación\n\nEl punto de color junto al desplegable muestra el color del jugador — el historial deja claro quién "habló".',
        },
        input: {
          title: 'Escribir un mensaje',
          body: 'Teclea en el campo (máximo 200 caracteres) y pulsa Enter — o usa el botón de enviar.',
        },
        send: {
          title: 'Enviar',
          body: 'Envía con Enter o el botón — el mensaje aparece al instante en el historial y en cada teléfono conectado.',
        },
        songChallenges: {
          title: 'Desafíos de canción ⚔️',
          body: 'Los invitados pueden retarte a una canción directamente desde la app: aparece una tarjeta de desafío en el chat — "Aceptar desafío" arranca el duelo.',
          details: 'Cómo corre el desafío:\n1. Un invitado elige una canción en la app y toca "Desafiar"\n2. La tarjeta aparece en el chat con la canción, el retador y el botón de aceptar\n3. Acepta en el escritorio — el diálogo de inicio se abre con el modo duelo preseleccionado\n4. ¡A cantar! El ganador se lleva la gloria (y los puntos)\n\nNota: "Enviar como" debe estar puesto en un jugador para esto — el oponente tiene que ser identificable.',
        },
        companionSide: {
          title: 'En los teléfonos',
          body: 'La app compañera tiene su propia pestaña de chat — ahí escriben los invitados. Lo que ves aquí lo ven ellos en tiempo real, y al revés.',
        },
        finish: {
          title: '¡Mensaje entregado! 💌',
          body: 'Ya conoces el chat — del panel a los desafíos de canción.\n\nCombinado con el tour del companion queda claro cómo trabajan juntos teléfonos y escritorio.',
        },
      },
    },

    // ═══ Tour del companion (R29) ═══
    companion: {
      title: 'App Companion',
      desc: 'Conecta smartphones: micrófono, mando, peticiones de canción y canto compartido.',
      chapters: {
        connect: 'Conexión',
        features: 'Lo que puede la app',
        control: 'Control remoto: Take Control',
        solo: 'Sin control',
        help: 'Ayuda del Companion',
        manage: 'Gestionar dispositivos',
      },
      steps: {
        welcome: {
          title: 'Teléfonos como accesorios 📱',
          body: 'La app compañera convierte cada smartphone en un accesorio de karaoke: micrófono, mando a distancia, selección de canciones y chat — sin instalación, directo en el navegador.\n\nEste tour cubre el lado del escritorio del flujo.',
          details: 'El principio: el escritorio es el anfitrión (música, notas, puntuaciones) — los teléfonos se conectan por la WiFi y se convierten, según haga falta, en:\n• 🎤 Micrófonos (¡con detección de tono en el teléfono!)\n• 🎮 Mandos a distancia (navegando las pantallas)\n• 🎵 Exploradores de canciones con peticiones de cola\n• 💬 Participantes del chat\n• 🪞 Espejos en vivo de la pantalla del escritorio\n\nSin tienda de apps, sin cuenta — escanea el QR y listo.',
        },
        mobileTab: {
          title: 'Abrir la pestaña Móvil',
          body: 'La conexión empieza en Ajustes → Móvil. Acabo de abrirte la pestaña.',
        },
        qrCode: {
          title: 'Escanear el código QR',
          body: 'El código grande de la izquierda es la ruta directa: abre la cámara del teléfono, escanea y la app carga en el navegador. Importante: teléfono y PC en la misma WiFi.',
          details: 'El código QR contiene la dirección LAN del escritorio (p. ej. http://192.168.1.42:3000/mobile) — por eso ambos dispositivos deben compartir red.\n\nSi el código se resiste: la URL de abajo se puede teclear o copiar (botón). En redes WiFi públicas sin visibilidad de dispositivos la conexión falla por desgracia — usa mejor un punto de acceso personal.',
        },
        connectionInfo: {
          title: 'URL y botón de copia',
          body: 'A la derecha la dirección en texto — con un botón de copia para compartir (p. ej. por mensajería con tus invitados). La línea verde confirma la IP de red detectada.',
          details: 'Consejo de pre-envío: manda la URL a los invitados antes de la fiesta — en cuanto el escritorio arranque, todos se conectan al instante.\n\nEl aviso amarillo aparece cuando no se detectó IP LAN (p. ej. operación pura en localhost) — entonces solo la propia máquina puede alcanzarla.',
        },
        roles: {
          title: 'Los roles de la app',
          body: 'Tras conectarse, la app ofrece según el contexto:\n\n🎤 Vista de micro con visualización de tono\n🎮 Mando a distancia para el escritorio\n🎵 Explorador de canciones + peticiones de cola\n💬 Chat\n🪞 Espejo en vivo de la pantalla',
          details: 'Los roles en detalle:\n• Micrófono: el teléfono mide el tono y lo transmite en vivo — el escritorio muestra las notas como las de un micro "de verdad". Funciona en casi todos los modos (también en duelo: ¡dos teléfonos!) — excepción p. ej. Pasa el Micrófono: allí todos comparten el mismo micro del escritorio.\n• Mando a distancia: pantallas, botones y confirmaciones desde el teléfono — genial para anfitriones que recorren la sala.\n• Explorador de canciones: toda la biblioteca en el teléfono — incluida la vista previa y las peticiones de cola con la insignia 📱 en el escritorio.\n• Chat: mensajes al escritorio y a los demás invitados.\n• Espejo: la pantalla del escritorio (juego, resultados) se refleja en el teléfono — los invitados lo ven todo desde sus asientos.',
        },
        chatRole: {
          title: 'Chat en el escritorio',
          body: 'Lo que los invitados escriben en el chat de la app llega al chat del escritorio (botón de chat en la barra de menú) — y a la inversa. Hay un tour de chat dedicado para ello.',
        },
        queueRole: {
          title: 'Peticiones en la cola',
          body: 'Los invitados encolan canciones desde sus teléfonos — aparecen en el escritorio en la cola con la insignia 📱. Otro tour cubre también eso.',
        },
        singAlong: {
          title: 'Modos de canto compartido 🎶',
          body: 'En el modo de fiesta Companion Sing-A-Long los invitados cantan directamente por sus teléfonos — la detección de tono corre en el dispositivo, el escritorio dirige.',
          details: 'Companion Sing-A-Long: cada invitado ve la letra y la visualización de tono en su teléfono — el escritorio muestra la pista de notas compartida.\n\nPasa el Micrófono: todos cantan por turnos al mismo micrófono del escritorio — simplemente se va pasando. Los teléfonos sirven aquí solo de mando y espejo en vivo, nunca de micrófono.\n\nPara cantar por teléfono: cuanto mejor la WiFi, más fluido el tono.',
        },
        takeControl: {
          title: 'Take Control 🎮',
          body: 'Un teléfono ahora maneja el escritorio solo bajo orden: el botón "Tomar control" del Companion se lleva el mando remoto — antes y después, el teléfono toca solo para sí mismo.',
          details: 'El mecanismo detrás de "Tomar control":\n• El control se reserva de forma exclusiva para un único dispositivo (bloqueo remoto).\n• El escritorio y el teléfono que controla van sincronizados: cada lado ve al instante lo que hace el otro.\n• Los demás teléfonos muestran el estado "Controlado por …" y esperan.\n\nEl control termina con "Liberar" — o automáticamente si el teléfono pierde la conexión.',
        },
        controlSync: {
          title: 'Escritorio y teléfono en sincronía',
          body: 'De vuelta en la pestaña Móvil: aquí ves, como anfitrión, todos los dispositivos. Cuando un teléfono toma el control, refleja la pantalla del escritorio y maneja pantallas, botones y confirmaciones — el ratón y el teclado del escritorio siguen totalmente utilizables.',
          details: 'Como ambos lados van sincronizados, nadie puede "tocar y salir corriendo": haces clic en el escritorio y el teléfono que controla sigue — tocas en el teléfono y el escritorio cambia de pantalla.\n\nEn la lista de dispositivos reconoces al que controla por su insignia de mando remoto.',
        },
        controlHandover: {
          title: 'Solo un mando remoto a la vez',
          body: 'El control es exclusivo: mientras un teléfono maneja, ningún otro puede tomarlo — su botón muestra en cambio quién controla. Liberar o desconectar devuelve el control al instante.',
          details: 'Conviene saber:\n• El anfitrión puede seguir haciendo clic en cualquier momento — el teléfono que controla lo sigue (y conserva el control).\n• Si el teléfono que controla pierde la conexión (batería, WiFi), el control vuelve automáticamente al escritorio.\n• Una expulsión de la lista de dispositivos también termina el control.',
        },
        soloOverview: {
          title: 'Invitados sin control 🙋',
          body: 'La mayoría de los invitados nunca necesitan el mando: los teléfonos conectados sin Take Control son acompañantes autónomos — piden canciones, chatean, cantan y consultan sus propios logros sin tocar el escritorio.',
          details: 'Lo que pueden hacer los teléfonos sin control:\n• 🎵 Encolar sus propias canciones (con la insignia 📱)\n• 💬 Unirse al chat de la fiesta\n• 🎤 Cantar en los modos de fiesta (p. ej. Companion Sing-A-Long)\n• 🗳️ Votar en las votaciones (torneo, Battle Royale)\n• 🏆 Ver sus propias puntuaciones y logros',
        },
        soloQueue: {
          title: 'Peticiones sin control',
          body: 'También sin mando, cada invitado encola sus propias canciones: elige una en el teléfono, encola — listo. La petición llega aquí con la insignia 📱 y cuenta para el límite de 3 canciones del perfil.',
        },
        soloParty: {
          title: 'Cantar y votar',
          body: 'La participación en la fiesta pasa siempre por los teléfonos: en Companion Sing-A-Long los invitados cantan directamente desde su dispositivo, en el torneo y en Battle Royale votan con un toque — todo sin Take Control. Ojo con Pasa el Micrófono: allí solo se pasa el micro del escritorio; los teléfonos únicamente controlan.',
        },
        soloStats: {
          title: 'Logros y puntuaciones propios',
          body: 'Cada invitado lleva su propio álbum: en el teléfono puede ver sus puntuaciones y logros — sin Take Control. Lo que el perfil consigue, el invitado lo comprueba incluso desde el sofá.',
        },
        soloLimits: {
          title: 'Lo que sigue bloqueado',
          body: 'Sin control, los ajustes, los perfiles, la configuración de fiesta, los retos diarios y la Jukebox quedan fuera — siguen reservados al escritorio (o a un Companion con Take Control).',
          details: '¿Por qué el candado? Estas áreas cambian el estado o la configuración de la partida para todos: ajustes, gestión de perfiles, configuración de fiesta, retos diarios y Jukebox. Para eso existe el control explícito — "Tomar control" los desbloquea para exactamente un teléfono.\n\nEl anfitrión del escritorio siempre lo tiene todo en su mano.',
        },
        helpButton: {
          title: 'Ayuda en cada teléfono ❓',
          body: 'Conoces el menú ? de la barra de menú — cada teléfono conectado recibe su propio botón "?". Un toque abre la ayuda del Companion directamente en el dispositivo.',
        },
        helpLocal: {
          title: 'Solo leer, nunca controlar',
          body: 'La ayuda del Companion es una vista puramente de lectura: no envía comandos al escritorio y nunca inicia un tour del escritorio. Los invitados pueden abrirla en cualquier momento — incluso mientras alguien canta o controla.',
          details: 'Así, la ayuda queda deliberadamente separada del sistema de control: un invitado que solo quiere consultar algo ("¿Cómo encolo una canción?") no influye para nada en la noche en marcha — y los tours aquí en el escritorio siguen siendo cosa del anfitrión.\n\nSe abre con el botón "?" de la app compañera; se cierra simplemente cerrando la vista.',
        },
        deviceList: {
          title: 'La lista de dispositivos',
          body: 'De vuelta en la pestaña Móvil: todos los dispositivos conectados muestran hora de conexión, rol, perfil asignado y última actividad — incluido un botón de expulsión.',
          details: 'La tarjeta de dispositivo muestra:\n• Duración de la conexión ("12 min")\n• Qué está haciendo el dispositivo (micro activo, mando…)\n• El perfil reclamado — un desplegable asigna otro\n• Expulsar: desconecta el dispositivo (puede reconectar al instante)\n\nConsejo: da a los perfiles nombres parlantes — la lista se mantiene clara incluso con muchos invitados.',
        },
        profileClaim: {
          title: 'Reclamación de perfil',
          body: 'Cada dispositivo puede reclamar un perfil: el invitado canta entonces bajo su propio nombre con su propia XP — la pantalla de perfiles muestra la reclamación con insignia 📱.',
          details: 'Vías para reclamar:\n1. Escanear el QR del perfil en sus ajustes (lo más directo)\n2. En la app, tras conectar, elegir de la lista\n3. Aquí en la lista de dispositivos con el desplegable\n\nDetalles también en el tour de perfiles.',
        },
        microphoneFallback: {
          title: 'Teléfono en vez de configuración de micro',
          body: 'Cuando todos cantan por teléfono puedes saltarte la pestaña de micrófono por completo — la app regula la sensibilidad sola. Los micros físicos se configuran en la pestaña de micrófono, como se ha mostrado.',
        },
        finish: {
          title: '¡Conectado! 🔗',
          body: 'Ya sabes cómo se acoplan los teléfonos y lo que pueden hacer.\n\nSiguiente paso: abre la URL en tu propio teléfono y haz una primera prueba — el modo micrófono es el más impresionante.',
        },
      },
    },

    // ═══ Tour de logros (R29) ═══
    achievements: {
      title: 'Logros y Progreso',
      desc: 'Logros, niveles de XP, rarezas y desafíos diarios.',
      chapters: {
        overview: 'Vista general',
        unlock: 'Desbloquear logros',
        daily: 'Desafíos Diarios',
      },
      steps: {
        welcome: {
          title: 'Logros y progreso 🏆',
          body: 'Todo lo que recoges: logros con rarezas, niveles de XP con títulos de rango y los desafíos diarios como motor de XP.\n\nEste tour recorre la pantalla de logros y los desafíos.',
          details: 'Los tres sistemas juntos:\n• XP: el "combustible" — de canciones, desafíos y logros\n• Niveles y rangos: suben con la XP (Principiante → Divino) y muestran el progreso de un vistazo\n• Logros: hitos con recompensas — algunos secretos hasta que los desbloqueas\n\nTodo cuelga del perfil — quien canta, recoge (ver el tour de perfiles).',
        },
        navButton: {
          title: 'El botón de logros',
          body: 'En la barra de menú, el primer trofeo lleva a las tablas de clasificación (puntuaciones) — el segundo trofeo, justo al lado, abre los logros.',
        },
        playerSelector: {
          title: 'Selección de jugador',
          body: 'Aquí arriba eliges de quién ves los logros — práctico para presumir de colección. El número del perfil muestra sus desbloqueos.',
        },
        stats: {
          title: 'Las tarjetas de estadísticas',
          body: 'Cuatro tarjetas de un vistazo: logros desbloqueados, XP recogida con ellos, completitud en porcentaje y el nivel actual con nombre de rango.',
          details: 'La tarjeta de porcentaje calcula: desbloqueados ÷ todos los logros. 100 % es la meta del coleccionista — normalmente premiada con su propio logro secreto.\n\nLa tarjeta de nivel muestra además el nombre de rango ("Novato", "Leyenda", "Divino"…) — los nombres vienen del sistema de progreso del perfil.',
        },
        filters: {
          title: 'Filtros',
          body: 'Izquierda: los filtros de estado (todos / desbloqueados / bloqueados). Derecha: las categorías: rendimiento, progresión, social y especiales.',
          details: 'Lo que significan las categorías:\n• Rendimiento: hazañas de canto (combos, notas doradas, rondas perfectas)\n• Progresión: hitos de colección (canciones jugadas, cantidades de XP, niveles)\n• Social: acciones de fiesta y multijugador (duelos, rondas companion)\n• Especiales: secretos y curiosidades — la descripción solo se revela al desbloquear\n\nCombinables: "Bloqueados + Especiales" muestra lo que aún te espera.',
        },
        grid: {
          title: 'Las tarjetas de logro',
          body: 'Cada tarjeta: icono, nombre, descripción, rareza y recompensa de XP. Las desbloqueadas brillan doradas con fecha — las bloqueadas quedan grises.',
          details: 'Las rarezas (codificadas por color):\n• Común — llega solo con el juego regular\n• Raro — requiere acción deliberada\n• Épico — trabajo duro o casualidades afortunadas\n• Legendario — para pocos\n\nEl desbloqueo ocurre automáticamente al cumplirse la condición — con notificación toast incluida. La XP aterriza al instante en el perfil.',
        },
        xpSystem: {
          title: 'Cómo fluye la XP',
          body: 'La XP llega de tres fuentes: canciones cantadas (por dificultad), desafíos (diarios/semanales) y logros. Los niveles desbloquean rangos — y algunas funciones como insignias de perfil.',
          details: 'Fuentes de XP de un vistazo:\n• Canción terminada: XP base según dificultad (fácil → experto, creciente)\n• Hueco diario: 100–200 XP de base, ×0,5–3 según dificultad, más bonos\n• Hueco semanal: 250–500 XP de base, ×0,5–3 según dificultad\n• Logro: una vez por logro (5–7500 XP según el logro)\n\nLa barra de nivel en la pantalla de perfiles muestra el camino al siguiente nivel; el rango sube con la XP (Principiante → Divino).',
        },
        navDaily: {
          title: 'Hacia los desafíos',
          body: 'Los desafíos diarios tienen su propia pantalla — el botón de estrella de la barra de menú lleva allí. Navegando ahora.',
        },
        playerSelection: {
          title: 'Paso 1: elegir jugadores',
          body: 'Flujo guiado: primero quién juega — solo después aparecen las tareas. Varios jugadores posibles; las estadísticas son del primero.',
          details: '¿Por qué primero la selección? Huecos y estadísticas son por perfil — sin jugador elegido no habría nada que calcular.\n\nLa tarjeta muestra todos los perfiles activos; selección con clic. Después se despliegan el paso 2 (tareas) y el paso 3 (jugar).',
        },
        slots: {
          title: 'Paso 2: los 5 huecos',
          body: 'Cinco huecos de tarea al día, desbloqueándose en secuencia. Cada hueco muestra la tarea, las dificultades jugables y el valor de XP — las dificultades más altas multiplican.',
          details: 'Mecánica de los huecos:\n• Los huecos 2–5 se abren solo tras completar el anterior — la cadena obliga a variar.\n• Cada tarea es una condición sobre la próxima canción ("género rock", "al menos 80 % de precisión"…) — la biblioteca filtra automáticamente las canciones que encajan.\n• Dificultad elegible por hueco: hasta multiplicador ×3 de XP en Demencial.\n\nA medianoche caen cinco tareas nuevas — la cadena se reinicia.',
        },
        badges: {
          title: 'Insignias y semanales',
          body: 'Completar huecos gana insignias diarias (bronce/plata/oro) con XP extra. La contraparte semanal corre 7 días con jugosas recompensas — misma mecánica, bote mayor.',
          details: 'Niveles de insignia por día:\n• Bronce: 1 hueco\n• Plata: 3 huecos\n• Oro: los 5 huecos — más el bono diario de XP\n\nSemanal: 5 huecos en 7 días, 250–500 XP de base por hueco (× multiplicador de dificultad), reinicio los lunes. Jugar a diario Y al semanal te hace subir bastante más rápido que solo con canciones.',
        },
        challengeModes: {
          title: 'Modos de desafío',
          body: 'Además de los huecos hay modos de desafío libres con modificadores (p. ej. "velocidad 1,5×", "letras ocultas") — para reglas propias y XP extra más allá de las tareas diarias.',
          details: 'Los modos se eligen libremente: escoge un modo, sus modificadores se aplican automáticamente y la recompensa de XP crece con la dificultad.\n\nLos modos completados desbloquean desafíos posteriores encadenados — cuanto más juegas, más se abre.',
        },
        finish: {
          title: '¡Hora de coleccionar! 🏅',
          body: 'Ya conoces logros, XP y desafíos — los tres motores del progreso.\n\nConsejo para empezar: juega hoy 2 huecos diarios — el resto viene solo.',
        },
      },
    },
  },
};
