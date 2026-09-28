// FR translations — tutorial
// Basé sur le fichier EN (src/lib/i18n/locales/en/tutorial.ts) — même
// structure de clés, seules les valeurs sont traduites.
export const tutorialTranslations = {
  tutorial: {
    // ? menu d'aide
    helpButtonTitle: 'Aide et tutoriels',
    helpDialogTitle: 'Aide et tutoriels',
    helpDialogDesc: 'Revoyez les visites complètes — ou sautez directement sur un sujet et faites-vous expliquer juste cette partie.',
    helpFooter: 'Clavier de la visite : → suivant · ← retour · Esc quitter',
    startFullTour: 'Visite complète',
    stepsCount: '{n} étapes',
    completedBadge: 'Terminée',
    // Groupes de visites dans le menu d\'aide (R29 : 8 visites, il faut de la structure)
    groupGettingStarted: 'Premiers pas',
    groupAreas: 'Zones et fonctions',
    groupAdvanced: 'Pour les pros',
    // Commandes de l'overlay
    ariaLabel: 'Visite guidée',
    skipTour: 'Terminer la visite',
    back: 'Retour',
    next: 'Suivant',
    finish: 'Terminé',
    clickHint: 'Cliquez dessus maintenant',
    // Dépliement "Plus d'infos" (R29)
    moreDetails: 'Plus d\'infos',
    lessDetails: 'Afficher moins',
    // Offre au premier lancement
    offerTitle: 'Bienvenue sur Karaoke ZERO !',
    offerBody: 'Envie d\'un petit tour des bases ? En 2 minutes, vous connaîtrez les défis quotidiens, les modes de chant, la bibliothèque et les jeux de fête.',
    offerStart: 'Lancer la visite',
    offerLater: 'Peut-être plus tard',
    offerHint: 'Disponible à tout moment via l\'icône ? de la barre de menu.',

    // ═══ Visite des bases ═══
    basic: {
      title: 'Les bases',
      desc: 'Le grand tour : défis, modes de chant, bibliothèque, fête et plus.',
      chapters: {
        welcome: 'Bienvenue',
        challenges: 'Quotidiens & hebdo',
        singing: 'Commencer à chanter',
        party: 'Modes de fête',
        more: 'Autres zones',
      },
      steps: {
        welcome: {
          title: 'Bienvenue ! 👋',
          body: 'Ceci est une visite en direct : je surligne les endroits importants et vous les explique.\n\nCommandes : "Suivant" (ou touche →), "Retour" (←) et "Terminer la visite" (Esc). C\'est parti !',
          details: 'Vous pouvez mettre la visite en pause à tout moment et la reprendre plus tard : l\'icône ? de la barre de menu ouvre le menu d\'aide avec toutes les visites — jouables aussi chapitre par chapitre.\n\nBeaucoup d\'étapes ont un bouton "Plus d\'infos" en bas : il déplie des détails supplémentaires sans perdre le texte court.',
        },
        heroButtons: {
          title: 'Démarrage rapide',
          body: '"Commencer à Chanter" vous emmène directement à la bibliothèque. "Mode Fête" ouvre les 9 jeux de fête pour les groupes.',
          details: 'Les cartes de démarrage rapide sont des raccourcis vers les chemins les plus courants :\n• "Commencer à Chanter" = ouvrir la bibliothèque, choisir une chanson, c\'est parti (solo, duel ou duo).\n• "Mode Fête" = la collection de jeux pour 2–24 joueurs ; les téléphones peuvent se joindre comme micros.\n\nTout ce que vous voyez ici est aussi accessible via la barre de menu — les cartes font juste gagner des clics.',
        },
        dailyCard: {
          title: 'Défi quotidien',
          body: '5 emplacements par jour avec des tâches tournantes — plus vous en complétez, plus gros est votre bonus d\'XP. Des tâches fraîches tombent à minuit.',
          details: 'Le fonctionnement du système :\n• Chacun des 5 emplacements contient un type de tâche différent (p. ex. "chantez une chanson des années 80", "marquez 8000 points").\n• Les emplacements se débloquent en séquence — l\'emplacement 2 seulement après que le 1 est complété (ou passé).\n• Chaque emplacement se joue en plusieurs difficultés ; les plus élevées donnent plus d\'XP (jusqu\'à un multiplicateur de 3×).\n• Le bonus grandit avec le nombre d\'emplacements complétés : 5/5 rapporte le bonus quotidien complet.\n\nLes tâches sortent de VOTRE bibliothèque — la sélection s\'adapte toujours à vos chansons.',
        },
        weeklyCard: {
          title: 'Défi hebdomadaire',
          body: 'La version hebdomadaire : 5 emplacements sur la semaine avec des récompenses d\'XP plus grosses. Parfait pour les objectifs à long terme.',
          details: 'Les défis hebdomadaires fonctionnent comme les quotidiens, mais :\n• Les 5 emplacements courent sur 7 jours — pas de réinitialisation quotidienne, ramassez à votre rythme.\n• Les récompenses d\'XP par emplacement sont bien plus élevées (p. ex. 500–2000 XP au lieu de 100–400).\n• La réinitialisation a lieu le lundi matin.\n\nAstuce : quotidien et hebdomadaire tournent en parallèle — jouer aux deux fait monter le plus vite.',
        },
        modeLauncher: {
          title: 'Chanter : solo, duel & duo',
          body: '🎤 Solo : un joueur, un micro.\n⚔️ Duel : deux joueurs sur la MÊME chanson — le plus de points gagne.\n🎭 Duo : deux voix sur deux pistes — la bibliothèque ne montre automatiquement que les chansons duo qui correspondent.',
          details: 'Les trois modes en détail :\n• Solo : karaoké classique — vous chantez toutes les notes, votre score rejoint les classements.\n• Duel : les deux joueurs chantent la même piste de notes simultanément. Les points tournent séparément — la comparaison finale montre qui a été le meilleur. Parfait pour les revanches.\n• Duo : la chanson a deux voix séparées (P1/P2) — chacun chante "ses" parties, les phrases partagées rapportent un bonus d\'équipe. Les chansons duo sont marquées par le filtre 🎭 dans la bibliothèque.\n\nMicros : vous pouvez attribuer autant de micros ou de smartphones que vous voulez (voir Paramètres → Microphone).',
        },
        libraryNav: {
          title: 'La bibliothèque',
          body: 'Toutes vos chansons vivent ici. Cherchez par titre ou artiste — la recherche floue pardonne même les fautes de frappe.',
          details: 'Astuces de recherche :\n• La recherche floue trouve "Dancing Qun" → "Dancing Queen". Elle ignore la casse et les fautes isolées.\n• Elle cherche titre, artiste ET genre à la fois — "Rock" trouve aussi les chansons du genre Rock.\n\nTri via le menu déroulant (titre A–Z, artiste, ajoutées récemment). Les chansons arrivent dans la bibliothèque par import, scan de dossier ou playlists — le chemin se trouve dans l\'onglet Bibliothèque des paramètres.',
        },
        filters: {
          title: 'Filtres',
          body: 'Genre, langue, année, décennie, chansons duo et hits viraux — découpez la bibliothèque comme vous voulez.',
          details: 'Tous les filtres se combinent — p. ex. "Genre : Rock + Langue : Anglais + Époque : 80s" montre exactement les chansons de rock anglaises des années 80.\n\nFiltres spéciaux :\n• Duo : uniquement les chansons avec deux pistes de voix.\n• Hits viraux : les chansons actuellement dans les charts viraux (données de Paramètres → Charts Viraux).\n• Genres & langues personnalisés : créez vos propres catégories dans Paramètres → Genres & Langues — elles apparaissent immédiatement dans ces filtres.\n\n"Réinitialiser les filtres" (✕) efface tout en une fois.',
        },
        songCard: {
          title: 'Chansons',
          body: 'Un clic sur une carte de chanson ouvre le dialogue de démarrage : mode, joueurs, micros et difficulté.',
          details: 'Chaque carte de chanson montre :\n• La pochette avec titre/artiste\n• La difficulté (facile/moyen/difficile/expert) et la note en étoiles\n• Les métadonnées clés comme genre et langue — directement de la chanson ou harmonisées par l\'IA (Éditeur → Studio de Métadonnées)\n\nL\'icône d\'aperçu lance un court extrait sans ouvrir le dialogue de démarrage.',
        },
        startModal: {
          title: 'Le dialogue de démarrage',
          body: 'Réglez tout ici : mode (solo/duel/duo), qui chante, quel micro reçoit chacun, et la difficulté.\n\nPuis appuyez sur "Démarrer" — et en avant !',
          details: 'Les options clés :\n• Mode : solo, duel (2 joueurs, même piste) ou duo (2 voix) — en duo, les deux joueurs choisissent leur voix (P1/P2).\n• Micros : chaque joueur peut avoir son propre périphérique d\'entrée — ou un smartphone comme micro (app compagnon).\n• Difficulté : influe sur le score — les difficultés élevées pardonnent moins et récompensent la précision (plus de potentiel de points, plus d\'XP).\n• "Ajouter à la file" au lieu de "Démarrer" : met la chanson en file au lieu de démarrer immédiatement — idéal quand plusieurs personnes veulent chanter.',
        },
        partyCard: {
          title: 'Modes de fête',
          body: '9 jeux pour 2–24 joueurs : Battle Royale, Passe le Micro, concours Medley, tournoi, mots manquants, karaoké aveugle et plus — les téléphones peuvent se joindre comme micros.',
          details: 'Les 9 modes d\'un coup d\'œil :\n• Battle Royale : tout le monde chante, le plus faible est éliminé à chaque tour — le dernier debout gagne.\n• Passe le Micro : le micro passe de joueur en joueur — chacun chante sa partie.\n• Concours Medley : les équipes enchaînent de courts extraits de chansons avec des règles spéciales.\n• Tournoi : tableau à élimination avec des duels — le gagnant grimpe à chaque tour.\n• Mots Manquants : les paroles sont masquées — chantez le mot manquant pour marquer.\n• Karaoké Aveugle : pas de notes à l\'écran, aux oreilles uniquement !\n• Rate my Song, Companion Sing-A-Long et plus — chaque carte de mode s\'explique elle-même.\n\nPresque tous les modes acceptent l\'app compagnon comme micro et télécommande.',
        },
        partyModes: {
          title: 'Le sélecteur de modes',
          body: 'C\'est ici que vous choisissez le mode de fête : Battle Royale (dernier debout), Passe le Micro, tournoi (tableau), medley et plus.\n\nChaque carte montre à quoi vous attendre — un clic ouvre la sélection des joueurs.',
          details: 'Après un clic sur une carte de mode suit la sélection des joueurs : choisissez des profils (ou connectez des appareils compagnons), puis réglez tailles d\'équipe, nombre de tours ou limites de temps selon le mode.\n\nAstuce fête à thème : quand un thème est actif dans les paramètres (p. ex. "Fête 80s"), chaque sélection de chanson en mode fête ne puise automatiquement que dans les chansons correspondantes — la fête reste dans le sujet.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaoké sans compétition : créez des playlists, mettez des chansons en file, partagez vos favorites. Le parfait animateur d\'ambiance.',
          details: 'Le jukebox est le mode tranquille :\n• Choisissez des playlists ou des chansons seules comme réservoir.\n• Pauses vidéo optionnelles entre les chansons pour que l\'ambiance ne retombe jamais.\n• Pas de score, pas de micro nécessaire — les chansons défilent avec leurs paroles.\n\nParfait comme divertissement toute la nuit ou pour s\'échauffer avant la première manche.',
        },
        jukeboxView: {
          title: 'Dans le menu du jukebox',
          body: '"Parcourir les playlists" vous donne un accès direct à chaque playlist enregistrée — y compris celles créées dans la bibliothèque. Un clic met toute la playlist en file.',
          details: 'Les réglages de playlist du jukebox proposent :\n• Si les vidéos sont affichées (si les chansons en ont)\n• Mode pause vidéo : vidéos d\'interlude entre les chansons, p. ex. pour des annonces\n• Si le réservoir est mélangé ou suit un ordre fixe\n\nDémarre en plein écran — sortez avec Échap ou le bouton stop en haut.',
        },
        highscoreCard: {
          title: 'Scores',
          body: 'Meilleurs scores par chanson et difficulté — battez vos amis (ou vous-même).',
          details: 'Les classements se souviennent, par chanson et difficulté :\n• Score, précision, notes dorées et date\n• Quel joueur a réalisé l\'entrée (avatar du profil)\n• Si l\'entrée est arrivée via l\'app compagnon (icône téléphone) ou depuis le bureau\n\nAvec le mode en ligne activé (écran des profils), vous voyez en plus des classements globaux et rivalisez avec des joueurs d\'autres installations.',
        },
        highscoreView: {
          title: 'Les classements des scores',
          body: 'Filtrés par chanson et difficulté — avec la barre de filtres en haut. Les icônes téléphone montrent l\'usage de l\'app compagnon.',
          details: 'La barre de filtres en haut permet :\n• De chercher par chanson ou joueur\n• De filtrer par difficulté\n• De basculer local/global (quand le mode en ligne est activé)\n\nAnti-triche : chaque entrée porte une empreinte de chanson — les résultats manipulés sont détectés et signalés.',
        },
        settingsCard: {
          title: 'Paramètres',
          body: 'Micros, langue, réglage fin du gameplay, apparence et graphismes — tous les réglages vivent ici.',
          details: 'Les 12 onglets de paramètres en un éclair :\n• Général : langue, difficulté par défaut, en ligne\n• Gameplay : score, particules, lecture auto de la file\n• Apparence : thèmes, style des paroles, fond\n• Graphismes & Son : périphérique de sortie, volume, qualité YouTube\n• Microphone : appareils, sensibilité, porte de bruit, presets\n• Mobile : connecter et gérer les appareils compagnons\n• Webcam : webcam comme fond\n• Bibliothèque : dossier des chansons, import, réinitialisation\n• Genres & Langues : catégories personnalisées\n• Fête à Thème : activer et configurer le thème\n• Sync & Sauvegarde : les filets de sécurité\n\nIl existe une visite dédiée et approfondie des paramètres pour tous les onglets dans le menu d\'aide ?.',
        },
        settingsView: {
          title: 'Les onglets des paramètres',
          body: 'Choisissez une section en haut : Général (langue), Gameplay, Apparence, Graphismes & Son, Microphone, Mobile (connexion téléphone) et plus.',
          details: 'Depuis la R28, un court texte d\'intro en haut de chaque onglet explique son rôle — plus jamais à deviner où va une option.\n\nLa visite assortie : "Paramètres" dans le menu d\'aide ? vous guide à travers chaque onglet.',
        },
        finish: {
          title: 'C\'est terminé ! 🎉',
          body: 'Vous connaissez maintenant les bases.\n\nAstuce : l\'icône ? de la barre de menu vous ramène à tout moment — y compris les chapitres par sujet, la visite de l\'éditeur et celle des paramètres.',
          details: 'Et maintenant ? Quelques suggestions pour vos premières minutes :\n1. Créez un profil (Profils dans la barre de menu) — sans profil vous jouez, mais ne collectez pas d\'XP.\n2. Importez des chansons (Paramètres → Bibliothèque).\n3. Quelques tours de défis quotidiens pour le boost d\'XP.\n4. Des amis débarquent ? Essayez le mode fête — l\'app compagnon transforme chaque téléphone en micro (il existe une visite dédiée).',
        },
      },
    },

    // ═══ Visite de l'éditeur ═══
    editor: {
      title: 'Visite de l\'éditeur',
      desc: 'Notes, paroles, voix et harmonisation — la boîte à outils des chansons.',
      chapters: {
        entry: 'Entrer',
        layout: 'Disposition',
        notes: 'Éditer les notes',
        extras: 'Extras & harmonisation',
      },
      steps: {
        welcome: {
          title: 'L\'éditeur ✏️',
          body: 'C\'est ici que les chansons deviennent des pistes de karaoké jouables : placez des notes, chronométrez les paroles, attribuez les voix.\n\nConseil bac à sable : entraînez-vous sur une chanson test — les changements se défont avec Ctrl+Z.',
          details: 'L\'éditeur travaille avec le format UltraStar : chaque note a une heure de début, une durée, une hauteur et un texte (syllabe). Beaucoup de notes forment la piste de notes que vous voyez dans le jeu.\n\nSources de nouvelles chansons :\n• Import de texte (UltraStar/TXT) dans l\'éditeur\n• Import MIDI (notes générées à partir d\'un MIDI)\n• Harmonisation IA : paroles + audio → suggestions de notes\n\nTout est non destructif : tant que vous n\'enregistrez pas, la chanson originale reste intacte.',
        },
        songList: {
          title: 'Choisir une chanson',
          body: 'Cherchez une chanson pour l\'ouvrir. Les filtres révèlent les chansons aux métadonnées manquantes — l\'éditeur les harmonise ensuite.',
          details: 'Les pastilles de filtre au-dessus de la liste montrent les chansons sans genre/langue/année — le chemin le plus rapide vers celles que le Studio de Métadonnées n\'a pas encore traitées.\n\nLa recherche couvre titre et artiste — la casse n\'a pas d\'importance.',
        },
        noSongs: {
          title: 'Pas encore de chansons',
          body: 'L\'éditeur a besoin de chansons dans la bibliothèque. Importez d\'abord des chansons (bibliothèque → import / scan de dossier) et revenez.',
          details: 'Comment obtenir des chansons :\n• Paramètres → Bibliothèque → définissez le dossier des chansons : chaque sous-dossier est lu comme une chanson (audio/vidéo + texte UltraStar).\n• Sinon, des fichiers individuels via le dialogue d\'import.\n• Ou créez une nouvelle chanson dans l\'éditeur ("Nouvelle Chanson") et assemblez vous-même paroles + audio.',
        },
        openSong: {
          title: 'Ouvrir une chanson',
          body: 'Cliquez maintenant sur une chanson de la liste pour l\'ouvrir dans l\'éditeur.',
          details: 'Une fois ouverte, vous voyez en haut la barre d\'outils (sous-en-tête) et la timeline avec forme d\'onde, couloirs de notes et paroles.\n\nLa chanson reste ouverte jusqu\'à ce que vous la fermiez via "Retour" — les changements non enregistrés demandent d\'abord confirmation.',
        },
        leftPanel: {
          title: 'Barre d\'outils',
          body: 'Tout pour les notes : ajouter, dupliquer, supprimer, diviser, fusionner — plus types de notes, voix et mode tap (ça arrive).',
          details: 'Les outils dans l\'ordre :\n• ➕ Ajouter une note : se pose à la tête de lecture\n• ⧉ Dupliquer : copie la note sélectionnée juste derrière\n• 🗑 Supprimer : retire la sélection\n• ✂ Diviser : une note → deux (au milieu)\n• ⇄ Fusionner : deux sélectionnées → une\n\nSélection par clic ; Maj+clic pour plusieurs. Puis le clavier prend le relais : ⌫ supprime, ↑/↓ transpose, ←/→ décale.',
        },
        lyricsPanel: {
          title: 'Panneau des paroles',
          body: 'Les lignes de paroles sont à gauche. Double-cliquez sur une ligne pour y sauter la lecture — texte et minutage s\'éditent ici.',
          details: 'Le panneau des paroles fait texte ET minutage en un :\n• Cliquer sur une syllabe sélectionne la note correspondante dans la timeline.\n• Le double-clic saute à l\'endroit (la lecture suit).\n• Le clic droit (ou l\'icône crayon) ouvre l\'édition de ligne : changez le texte, découpez les syllabes aux frontières de mots, décalez le minutage de toute la ligne.\n\nLe découpage aux frontières de mots utilise la détection de langue pour répartir les syllabes sur les mots intelligemment — fini le découpage manuel.',
        },
        subHeaderTools: {
          title: 'Éditer les notes',
          body: 'Les notes sont les blocs sur les couloirs de hauteur : ajouter, dupliquer, supprimer, diviser (une note → deux) et fusionner (deux → une).\n\nÉditez les notes sélectionnées à toute allure : ⌫ supprime, ↑/↓ transpose.',
          details: 'Astuces de précision :\n• Zoom : Ctrl+molette sur la timeline — zoomez pour un minutage fin.\n• Lecture : Espace bascule lecture/pause, Maj+Espace ne joue que la sélection.\n• Transposer plusieurs notes : sélectionnez-les toutes, ↑/↓ déplace tout le lot.\n\nPour le minutage : le début de la note doit tomber sur l\'attaque de la syllabe dans le chant — la forme d\'onde aide à trouver les attaques.',
        },
        noteTypes: {
          title: 'Types de notes',
          body: '5 types pour les nouvelles notes :\n: Normale (la hauteur compte)\n* Dorée (points en plus)\nF Freestyle (n\'importe quelle note compte)\nR Rap (minutage seulement)\nG Rap dorée',
          details: 'Ce que chaque type signifie dans le jeu :\n• Normale (:) : la note de chant classique — hauteur et minutage comptent.\n• Dorée (*) : affichée en or, points doubles en cas de réussite. Parfaite pour les moments forts d\'une chanson.\n• Freestyle (F) : la hauteur n\'a pas d\'importance, seul le texte/le minutage compte — bien pour les passages parlés.\n• Rap (R) : juge le minutage et le rythme plutôt que la mélodie.\n• Rap dorée (G) : comme le rap, mais avec des points en plus.\n\nLe type peut être changé ensuite : sélectionnez la note et choisissez un nouveau type dans la barre d\'outils.',
        },
        voices: {
          title: 'Voix',
          body: 'P1 = joueur 1, P2 = joueur 2 (duo !), P4/P8 = troisième/quatrième voix. Chaque note appartient à une voix — c\'est ainsi que naissent les chansons duo à parties séparées.',
          details: 'Attribution des voix :\n• Le menu déroulant des voix choisit la piste où atterrissent les nouvelles notes.\n• Les notes posées peuvent bouger : sélectionnez-les et changez de voix.\n• En mode duo dans le jeu, chaque joueur choisit sa piste — la bibliothèque filtre automatiquement les chansons avec au moins 2 voix.\n\nP4/P8 permettent même des formations de quatuor ; les principaux modes de jeu utilisent P1/P2.',
        },
        tapMode: {
          title: 'Mode tap — le turbo 🥁',
          body: 'Maintenez la touche et tapez en rythme : chaque clic dépose une note à la position de lecture actuelle, ligne de paroles par ligne de paroles. Créez des notes en temps réel.',
          details: 'Comment se déroule l\'enregistrement tap :\n1. Activez le mode tap dans la barre d\'outils.\n2. Lancez la lecture — la chanson tourne avec l\'audio audible.\n3. Cliquez au rythme des syllabes — chaque interaction dépose une note à la tête de lecture avec la dernière hauteur choisie.\n4. Ensuite, polissez : corrigez les hauteurs (↑/↓ sur les notes sélectionnées) et ajustez les durées.\n\nLe mode tap est 5–10× plus rapide que la pose de notes à la main — des chansons entières en minutes au lieu d\'heures.',
        },
        panels: {
          title: 'Panneaux d\'en-tête',
          body: 'Trois panneaux en haut à droite : métadonnées (genre/langue/année), analyse audio et l\'assistant IA.',
          details: 'Ce que font les trois panneaux :\n• Métadonnées : éditez directement genre, langue et année de la chanson ouverte — alimente les filtres et la fête à thème.\n• Analyse audio : analyse le fichier audio (sonie, tonalité, BPM) et suggère des valeurs.\n• Assistant IA : complétion de paroles, identification de chanson et harmonisation de notes par IA — nécessite un fournisseur d\'IA configuré (Paramètres → IA).',
        },
        metadataStudio: {
          title: 'Studio de Métadonnées',
          body: 'Le turbo de l\'harmonisation : suggestions IA et par règles pour genre, langue et année — avec écoute avant attribution, édition fine manuelle et file de révision pour les correspondances incertaines.',
          details: 'Le flux du studio :\n1. "Analyser toutes les chansons" — le moteur de règles (chemins de fichiers, tags) et éventuellement l\'IA suggèrent genre/langue/année.\n2. Les suggestions portent une confiance : vert = sûr, jaune = à revoir.\n3. Écoute : un clic sur une chanson joue un extrait — vérifiez les suggestions au plus vite.\n4. Attribuez individuellement ou "appliquer tous les verts".\n\nLa file de révision rassemble les correspondances incertaines pour plus tard — rien ne se perd.',
        },
        shortcuts: {
          title: 'Raccourcis',
          body: 'Tous les raccourcis clavier d\'un coup d\'œil — l\'éditeur est un instrument à clavier. Parcourez-les !',
          details: 'Les raccourcis les plus importants :\n• Ctrl+Z / Ctrl+Y : annuler / rétablir\n• Espace : lecture/pause\n• ⌫ : supprimer les notes sélectionnées\n• ↑/↓ : transposer · ←/→ : décaler dans le temps\n• S : diviser la note · M : fusionner\n• 1–5 : choisir le type de note\n\nDans le panneau des raccourcis, vous pouvez consulter et réassigner les touches.',
        },
        finish: {
          title: 'Prêt à construire ! 🛠️',
          body: 'Vous connaissez maintenant la boîte à outils de l\'éditeur.\n\nSouvenez-vous : Ctrl+Z sauve tout, et l\'icône ? de la barre de menu vous ramène à ces chapitres à tout moment.',
          details: 'Ordre recommandé pour une nouvelle chanson :\n1. Joindre l\'audio/la vidéo (onglet infos de la chanson)\n2. Importer ou saisir les paroles (onglet paroles)\n3. Taper les notes (mode tap) ou harmonisation IA\n4. Soigner les métadonnées (genre/langue/année — important pour les filtres !)\n5. Enregistrer — dès maintenant, la chanson apparaît dans la bibliothèque.',
        },
      },
    },

    // ═══ Visite des paramètres (R28) ═══
    settings: {
      title: 'Paramètres',
      desc: 'Tous les réglages d\'un coup d\'œil : onglets, réglages généraux, audio, bibliothèque, appareils compagnons et sauvegarde.',
      chapters: {
        overview: 'Vue d\'ensemble',
        basics: 'Réglages de base',
        sound: 'Audio & Microphone',
        library: 'Bibliothèque & Thème',
        devices: 'Appareils & Companion',
        data: 'Sync, Sauvegarde & Infos',
      },
      steps: {
        welcome: {
          title: 'Les paramètres 👋',
          body: 'Cette visite vous fait traverser exclusivement les paramètres — onglet par onglet.\n\nJe bascule automatiquement sur chaque onglet et vous explique ce que vous y trouverez.',
          details: 'Les onglets dans l\'ordre de la visite : Général, Gameplay, Apparence, Graphismes & Son, Microphone, Mobile (companion), Webcam, Bibliothèque, Genres & Langues, Fête à Thème, Charts Viraux, Sync & Sauvegarde et À Propos.\n\nChaque onglet a une courte intro en haut — cette visite l\'approfondit pas à pas.',
        },
        tabBar: {
          title: 'La barre d\'onglets',
          body: 'Tous les réglages sont organisés en onglets : Général, Gameplay, Apparence, Audio, Microphone, Mobile, Webcam, Bibliothèque, Genres & Langues, Fête à Thème, Sync & Sauvegarde et À Propos.\n\nDepuis la R28, un court texte d\'intro en haut de chaque onglet explique son rôle.',
          details: 'Aide à l\'orientation — en cherchant, demandez-vous…\n• "Comment le jeu SE COMPORTE-T-IL ?" → Gameplay\n• "Comment ÇA A L\'AIR ?" → Apparence\n• "Comment ÇA SONNE ?" → Graphismes & Son / Microphone\n• "Connecter des appareils ?" → Mobile (companion) / Microphone\n• "Mes chansons ?" → Bibliothèque\n• "Sauvegarder des données ?" → Sync & Sauvegarde\n\nLes onglets défilent horizontalement sur les fenêtres étroites — glissez simplement vers la droite.',
        },
        general: {
          title: 'Général',
          body: 'Langue de l\'interface, difficulté par défaut, activités en ligne et l\'aperçu complet des raccourcis clavier.',
          details: 'Langue : 16 langues sont disponibles. Le changement s\'applique en direct à toute l\'interface.\n\nDifficulté par défaut : s\'applique aux nouvelles manches, sauf si le dialogue de démarrage en choisit une autre.\n\nLes activités en ligne contrôlent si les scores sont téléversés globalement et si les défis quotidiens se génèrent en ligne.',
        },
        gameplay: {
          title: 'Gameplay',
          body: 'Score activé/désactivé, effets de particules, lecture auto de la file et d\'autres interrupteurs de comportement pour manches et résultats.',
          details: 'Les interrupteurs clés :\n• Score : pour chanter juste pour le fun, sans affichage de score.\n• Lecture auto de la file : à la fin d\'une chanson, l\'entrée suivante démarre automatiquement — idéal pour les soirées sans animateur.\n• Particules & effets : à désactiver sur les machines modestes.\n\nEn plus : comportement après les manches (écran de résultats, redémarrage instantané) et affichages de combo.',
        },
        appearance: {
          title: 'Apparence',
          body: 'Thèmes, fond animé ou votre propre vidéo de fond, style et taille des paroles, affichage des notes et le mode performance pour les machines modestes.',
          details: 'Style des paroles : "Karaoké" (coloration au fil du chant), "UltraStar" (blocs par syllabe) ou "Minimal".\n\nFond : en plus des thèmes, une vidéo personnalisée fonctionne aussi — dans le jeu, elle tourne derrière les notes, assombrie.\n\nLe mode performance coupe drastiquement animations et fonds — utile à partir d\'un matériel ~2015.',
        },
        graphicsound: {
          title: 'Audio',
          body: 'Périphérique de sortie (ASIO inclus), volume principal et d\'aperçu, sensibilité du micro, normalisation de la sonie et qualité vidéo YouTube.',
          details: 'ASIO : pertinent uniquement pour Windows + cartes son compatibles ASIO — réduit la latence du monitoring du micro.\n\nLa normalisation de la sonie lisse les écarts de volume entre chansons — les valeurs par défaut sont bien choisies.\n\nQualité YouTube : concerne les chansons avec une source vidéo YouTube ; plus de qualité = plus de bande passante.',
        },
        microphone: {
          title: 'Microphone',
          body: 'Choix de l\'appareil, sensibilité, porte de bruit et niveau en direct — plus des presets. Les smartphones se connectent via l\'onglet Mobile.',
          details: 'Presets : des configurations types ("micro vocal dynamique", "casque-micro", "téléphone") règlent sensibilité + porte de bruit en combinaisons raisonnables.\n\nPorte de bruit : filtre les souffles et le bruit de pièce — le niveau en direct montre en temps réel ce qui passe.\n\nImportant en multijoueur : CHAQUE joueur peut avoir SON PROPRE appareil — l\'attribution se fait dans le dialogue de démarrage à chaque manche.',
        },
        libraryTab: {
          title: 'Bibliothèque',
          body: 'Définissez le dossier des chansons (chaque sous-dossier = une chanson) et scannez-le, réinitialisez la bibliothèque ou supprimez toutes les données — plus l\'import depuis d\'autres systèmes de karaoké.',
          details: 'Format du dossier : un sous-dossier par chanson avec audio/vidéo + TXT (format UltraStar). Le scanner reconnaît les combinaisons courantes (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImport depuis d\'autres systèmes : une archive SingStar ? Une collection UltraStar ? Le convertisseur d\'import reprend automatiquement métadonnées et paroles.\n\nAttention avec "supprimer toutes les données" : la double confirmation demande deux fois — faites quand même d\'abord une sauvegarde (onglet Sync & Sauvegarde).',
        },
        taxonomy: {
          title: 'Genres & Langues',
          body: 'Créez vos propres entrées de genre et de langue — elles apparaissent dans tous les menus déroulants et alimentent l\'harmonisation IA.',
          details: 'Pourquoi des entrées personnalisées ? Les listes standard ne couvrent pas tout ("Schlager", "K-Pop", "Dialecte"…). Les entrées personnalisées :\n• apparaissent immédiatement dans les filtres de la bibliothèque\n• sont sélectionnables dans l\'éditeur et le Studio de Métadonnées\n• suivent l\'harmonisation (l\'IA les suggère pour les chansons correspondantes)\n\nLa suppression fonctionne aussi — les chansons gardent l\'entrée jusqu\'à réattribution.',
        },
        motto: {
          title: 'Fête à Thème',
          body: 'Mettez tout le jeu au diapason d\'un thème (p. ex. une fête 80s) : une fois actif, le thème remplace tous les champs de recherche et filtres — chaque sélection de chanson ne puise que dans les chansons correspondantes.',
          details: 'Le filtre thématique connaît plusieurs champs, librement combinables (logique ET) :\n• Genre (p. ex. rock)\n• Langue (p. ex. anglais)\n• Époque/année (p. ex. 1980–1989)\n\nEffet : bibliothèque, sélection des chansons en mode fête ET app compagnon ne montrent que le réservoir du thème — les invités ne peuvent rien choisir hors sujet.\n\nDésactiver le thème ramène instantanément tout à la vue normale ; chansons jouées et scores restent intacts.',
        },
        mobile: {
          title: 'Mobile & Companion',
          body: 'Connectez des smartphones par QR code — comme microphone, télécommande ou appareil de chant. Vous voyez tous les appareils connectés et leurs codes de connexion.',
          details: 'Connexion : scannez le QR code (même WiFi !) ou tapez l\'URL — la visite dédiée du companion explique les détails dans le menu d\'aide ?.\n\nCet onglet montre aussi :\n• Tous les appareils connectés avec leur état (actif, rôle, dernière activité)\n• L\'attribution de profils aux appareils\n• L\'expulsion d\'appareils individuels\n\nLes QR codes par profil (pour la réclamation) se trouvent dans la carte de réglages de l\'écran des profils.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Utilisez la webcam comme fond de chanson animé : résolution, miroir, saturation, flou et autres effets — avec aperçu en direct.',
          details: 'Le fond webcam tourne derrière les notes pendant la chanson — vous vous regardez chanter !\n\nEffets : miroir (comme un selfie), saturation, flou léger, sépia — immédiatement visibles dans l\'aperçu en direct.\n\nConfidentialité : la caméra tourne uniquement en local, rien n\'est stocké ni envoyé.',
        },
        sync: {
          title: 'Sync & Sauvegarde',
          body: 'Créez et restaurez des sauvegardes, synchronisez les données entre appareils. Dans la version bureau, les données de jeu sont aussi refletées en permanence dans le dossier AppData.',
          details: 'Une sauvegarde contient : profils (avec XP/progression), scores, réglages et définitions de playlists — en un seul fichier, pour archiver ou déménager.\n\nLe miroir AppData (version bureau) protège contre la perte de données du navigateur : même si le stockage du navigateur est effacé, la version bureau restaure tout.\n\nLa restauration écrase les données actuelles — encore une fois : sauvegardez d\'abord.',
        },
        about: {
          title: 'À Propos',
          body: 'Version, plateforme, licences et projets contributeurs — l\'empreinte numérique de Karaoke ZERO.',
          details: 'Vous voyez aussi le canal de la build (web/bureau) et pouvez chercher des mises à jour. Les licences listent les projets open source utilisés — merci à tous les impliqués !',
        },
        finish: {
          title: 'Entièrement configuré ! ⚙️',
          body: 'Vous connaissez maintenant tous les réglages.\n\nL\'icône ? de la barre de menu vous ramène à cette visite à tout moment — chapitre par chapitre si vous voulez.',
          details: 'Recommandation pour votre première soirée de configuration :\n1. Onglet Bibliothèque : scanner le dossier des chansons\n2. Onglet Microphone : choisir un preset + vérifier le niveau en direct\n3. Onglet Mobile : connecter les téléphones (visite du companion !)\n4. Onglet thème : penser à un thème de fête\n5. Sync & Sauvegarde : tirer la première sauvegarde\n\nAvec ça, la soirée karaoké est sur des rails.',
        },
      },
    },

    // ═══ Visite des profils (R29) ═══
    profile: {
      title: 'Profils & Personnages',
      desc: 'Créez des joueurs, suivez XP & progression, synchronisation en ligne et réclamation companion.',
      chapters: {
        overview: 'Vue d\'ensemble',
        characters: 'Personnages & Progression',
        online: 'En ligne & Companion',
      },
      steps: {
        welcome: {
          title: 'Vos profils de joueur 👤',
          body: 'Les profils sont les identités du jeu : XP, niveau, statistiques et succès vivent sur le profil — et les scores portent votre nom.\n\nCette visite montre comment créer et gérer des profils.',
          details: 'Pourquoi des profils ?\n• XP & niveau : chansons chantées, défis et succès collectent de l\'expérience — le niveau monte avec le titre de rang (débutant → légende du karaoké).\n• Classements : les entrées de score montrent votre avatar.\n• Modes de fête : chaque sélection de joueurs puise dans cette liste.\n• Les appareils compagnons peuvent "réclamer" un profil et chanter sous son identité.\n\nLes profils vivent dans le stockage du navigateur (local) ou dans un compte en ligne (synchronisé) — à vous de choisir à la création.',
        },
        topBar: {
          title: 'La barre d\'actions',
          body: 'En haut, vous activez les classements en ligne, basculez local/global et ouvrez le formulaire de création de nouveaux profils.',
          details: 'Les éléments de la barre :\n• Interrupteur en ligne : active/désactive les fonctions en ligne globalement (classements, inscription de compte)\n• Local/Global : quel classement la vue des scores affiche\n• "Charger un profil" : vous connecte avec un code de sync et rapatrie votre profil en ligne sur cet appareil\n• "Nouveau profil" : ouvre le formulaire de création (étape suivante)',
        },
        createButton: {
          title: 'Créer un profil',
          body: '"Nouveau profil" ouvre le formulaire : nom, image d\'avatar, pays et mode de stockage (local ou avec un compte en ligne).',
          details: 'Les champs du formulaire :\n• Nom : apparaît dans les classements et en fête\n• Avatar : téléversez votre propre photo ou une initiale sur une couleur\n• Pays : drapeau pour les classements globaux\n• Mode de stockage : "Local" ne sauvegarde que sur cet appareil ; "En ligne" inscrit facultativement un compte (email + mot de passe) et permet la synchronisation entre appareils.\n\nLes comptes en ligne n\'existent qu\'avec le mode en ligne activé — l\'inscription tourne en arrière-plan, le profil est utilisable immédiatement.',
        },
        empty: {
          title: 'Pas encore de profils',
          body: 'C\'est ici que vos joueurs prennent forme. Cliquez sur "Nouveau profil" et créez le premier personnage — tout fonctionne sans, mais XP et succès ne se collectent que sur des profils.',
        },
        cards: {
          title: 'Les cartes de personnage',
          body: 'Chaque carte montre avatar, niveau, rang et mode de stockage. Un clic sélectionne le profil et affiche ses détails en dessous.\n\nLe point en haut à droite : vert = actif, rouge = désactivé.',
          details: 'Symboles des cartes :\n• Bulle ✓ : le profil actuellement actif (le dialogue de démarrage s\'en souvient)\n• Icône de rang + "Niv. X" : la progression du profil\n• Badge 💾/🌐 : stocké en local ou en ligne\n• Badge 📱 : ce profil est réclamé par un appareil companion\n• Drapeau : le pays choisi\n\nCliquer sur une carte = la sélectionner. La désactivation (rouge) se fait dans la carte de progression — les profils désactivés disparaissent des sélections de joueurs mais gardent toutes leurs données.',
        },
        progression: {
          title: 'La carte de progression',
          body: 'Barre d\'XP vers le niveau suivant plus les statistiques clés : chansons chantées, notes dorées, meilleur combo et score total.\n\nL\'interrupteur d\'activation à droite désactive temporairement le profil.',
          details: 'Comprendre les stats :\n• Chansons jouées : chaque manche terminée compte\n• Notes dorées : collectées par chanson — montre la précision sur les moments forts\n• Meilleur combo : la plus longue série sans faute de tous les temps\n• Score total : somme de tous les scores\n\nL\'interrupteur d\'activation : les profils désactivés disparaissent de la sélection de joueurs et de la file (les chansons duel/duo demandent alors une resélection) mais ne perdent RIEN — il suffit de réactiver.',
        },
        settingsCard: {
          title: 'Réglages du profil',
          body: 'Éditez nom & avatar, changez de pays, options de confidentialité — et le QR code du profil qui permet à un téléphone de le réclamer.',
          details: 'Confidentialité : contrôle quelles statistiques sont visibles sur les classements globaux.\n\nAfficher le QR code : génère un code pointant DIRECTEMENT vers ce profil — le téléphone qui le scanne se connecte sous ce profil (idéalement : chaque chanteur garde son profil sur son téléphone).\n\nLa suppression efface définitivement le profil — les scores restent comme entrées anonymes. Pour les profils en ligne, l\'app redemande avant de supprimer.',
        },
        onlineToggle: {
          title: 'Classements en ligne',
          body: 'L\'interrupteur active les fonctions en ligne : scores globaux, inscription de compte et synchronisation de profils entre appareils.',
          details: 'Off = totalement hors ligne : tout reste local, aucune requête réseau pour les classements.\n\nOn = vous obtenez l\'onglet "Global" dans les classements et pouvez créer/charger des profils en ligne.\n\nLe basculement s\'applique immédiatement — les scores locaux déjà collectés restent toujours.',
        },
        loginButton: {
          title: 'Charger un profil',
          body: 'Déjà inscrit ? "Charger un profil" rapatrie votre profil en ligne via email/code de sync sur cet appareil — progression et scores suivent.',
          details: 'Le dialogue de connexion connaît deux voies :\n• Email + mot de passe (comme à l\'inscription)\n• Code de sync : le code court de votre profil — plus simple sur une machine inconnue\n\nAprès la connexion, le profil chargé fusionne avec le local (la plus grande progression gagne). Les synchronisations tournent ensuite automatiquement en arrière-plan.',
        },
        companionClaim: {
          title: 'Réclamation companion 📱',
          body: 'Quand un téléphone se connecte avec un profil, la carte affiche un 📱. Le téléphone chante et choisit sous ce profil — nom, XP et succès s\'y accumulent.',
          details: 'Configurer la réclamation (3 voies) :\n1. Scanner le QR code dans les réglages du profil — connexion DIRECTE avec ce profil\n2. Sur le téléphone, après connexion, choisir un profil dans la liste\n3. Ici dans l\'onglet Mobile des paramètres : appareil → attribuer un profil\n\nUn profil ne peut être réclamé que par UN appareil à la fois. Déconnexion : dans l\'onglet Mobile ou par le téléphone lui-même.',
        },
        finish: {
          title: 'Équipe au complet ! 🎭',
          body: 'Vous savez maintenant comment fonctionnent les profils — de l\'XP à la synchronisation en ligne jusqu\'à la réclamation par téléphone.\n\nContinuez avec les succès : la visite "Succès & Progression" montre ce que votre profil peut collecter.',
        },
      },
    },

    // ═══ Visite de la file d'attente (R29) ═══
    queue: {
      title: 'File d\'attente',
      desc: 'Mettre des chansons en file, réordonner, règles et demandes companion.',
      chapters: {
        overview: 'Vue d\'ensemble',
        manage: 'Gérer',
        companion: 'Companion & Lecture auto',
      },
      steps: {
        welcome: {
          title: 'La file d\'attente 🎶',
          body: 'La file organise votre soirée karaoké : les chansons font la queue, chacun a son tour — personne ne doit surveiller le PC.\n\nCette visite couvre la mise en file, le tri et les règles.',
          details: 'Trois façons de mettre en file :\n1. Bibliothèque → clic sur une chanson → dans le dialogue de démarrage, choisissez "Ajouter à la file" au lieu de "Démarrer"\n2. Après une chanson : "Lire la chanson suivante" sur l\'écran de résultats garde le rythme\n3. Via l\'app compagnon : les invités mettent en file depuis leurs téléphones (marqués de badges 📱)\n\nLa barre de menu montre la longueur de la file sous forme de bouton compteur — vous voyez la soirée arriver.',
        },
        navButton: {
          title: 'Le bouton de la file',
          body: 'Dans la barre de menu, "File" mène ici — le chiffre sur le bouton montre combien de chansons patientent.',
        },
        title: {
          title: 'La file de chansons',
          body: 'La liste montre toutes les chansons en attente avec position, mode (solo/duel/duo) et joueurs — triées par heure d\'ajout.',
        },
        empty: {
          title: 'Encore vide',
          body: 'Pas encore de chansons dans la file. Ajoutez-en depuis la bibliothèque (dialogue de démarrage → "Ajouter à la file") — ou laissez les invités mettre en file via l\'app compagnon.',
        },
        list: {
          title: 'La liste de la file',
          body: 'Chaque carte : position, chanson, badge de mode et les joueurs. Un clic sur une carte lance la chanson immédiatement — même hors ordre.',
          details: 'Les badges :\n• 🎤 Solo / ⚔️ Duel / 🎭 Duo — le mode avec lequel la chanson a été mise en file\n• 📱 — ajoutée via l\'app compagnon\n\nCliquer sur une carte = lire maintenant. Le bouton ✕ à droite retire l\'entrée, ▶ la lance.\n\nClavier : Entrée lit, Suppr retire, ↑/↓ parcourt la liste.',
        },
        reorder: {
          title: 'Changer l\'ordre',
          body: 'Faites glisser les cartes vers leur nouvelle position — seules les entrées locales peuvent bouger, les demandes companion gardent leur ordre.',
          details: 'Glisser-déposer : attrapez une carte et montez ou descendez en gardant le bouton enfoncé. La liste montre la position de dépôt en direct.\n\nPourquoi les entrées companion restent fixes : l\'app invitée trie par heure d\'envoi — si l\'hôte pouvait tout brasser, les demandes sembleraient manipulées. Vous pouvez quand même les supprimer.',
        },
        playNext: {
          title: 'Lire la chanson suivante',
          body: 'Le bouton lance la première entrée — le geste standard entre les manches. Autrement, cliquez directement sur n\'importe quelle carte.',
          details: 'L\'écran de résultats après chaque chanson propose le même bouton ("Lire la chanson suivante") — le flux continue sans détour par la vue de la file.\n\nAvec la lecture auto activée (Paramètres → Gameplay), l\'app avance automatiquement.',
        },
        clearAll: {
          title: 'Tout effacer',
          body: '"Tout effacer" vide la file entière — demandes companion comprises. Il n\'y a pas de retour en arrière, utilisez-le avec soin.',
        },
        rules: {
          title: 'Les règles',
          body: 'Le règlement officiel se trouve en bas : max 3 chansons par joueur, ordre FIFO, retirez vos propres chansons, choisissez d\'abord un personnage…',
          details: 'Les règles en détail :\n• Max 3 chansons par joueur à la fois — personne ne peut bloquer la file. Qui a chanté peut remettre en file.\n• FIFO : premier entré = premier à chanter. Le glisser-déposer réordonne localement.\n• Vos propres chansons se retirent à tout moment ; celles des autres seulement via "Tout effacer" ou en tant qu\'hôte.\n• Personnage d\'abord : la file a besoin de profils actifs pour duel/duo, sinon elle demande une resélection au démarrage.\n• Les demandes companion portent le badge 📱 et comptent comme les vôtres.',
        },
        companionAdd: {
          title: 'Demandes depuis les téléphones 📱',
          body: 'Les invités mettent des chansons en file via l\'app compagnon — elles apparaissent avec un badge 📱 dans la liste et comptent dans leur limite de 3 chansons.',
          details: 'Ce que voient les invités : dans l\'app, choisir une chanson, le mode, envoyer — la demande atterrit dans cette liste.\n\nVous, l\'hôte, voyez immédiatement : qui a demandé (avatar du joueur) et qu\'il s\'agit d\'une demande de téléphone (📱). La limite de 3 vaut par profil — téléphone inclus.\n\nPlus de détails dans la visite du companion.',
        },
        autoplay: {
          title: 'Lecture auto & raccourci',
          body: 'Activez la lecture auto (Paramètres → Gameplay) pour que la chanson suivante démarre automatiquement après chaque manche. Et : Ctrl+Q lance la première entrée de la file depuis n\'importe où.',
          details: 'La chaîne de lecture auto : la chanson se termine → résultats brefs → l\'entrée suivante de la file démarre. Quand la file est vide, la chaîne s\'arrête proprement.\n\nCtrl+Q fonctionne de partout — le classique quand la manche suivante doit enchaîner immédiatement.',
        },
        finish: {
          title: 'La file attend ! 🎧',
          body: 'Vous connaissez maintenant la mise en file, le tri et les règles.\n\nAstuce : combinez lecture auto + demandes companion pour une soirée karaoké qui tourne toute seule.',
        },
      },
    },

    // ═══ Visite du chat (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Ouvrir le panneau, envoyer des messages, le sélecteur "envoyer en tant que" et les défis de chanson.',
      chapters: {
        basics: 'Ouvrir le chat',
        usage: 'Envoyer des messages',
        challenges: 'Défis',
      },
      steps: {
        welcome: {
          title: 'Le chat de fête 💬',
          body: 'Le chat relie le bureau et les apps compagnes : discutez sans interrompre le chant — et même lancez-vous des défis de chanson.\n\nJe vous ouvre le panneau dans un instant.',
          details: 'Ce que sait faire le chat :\n• Messages texte entre le bureau (hôte) et tous les téléphones connectés\n• Choix de l\'expéditeur : l\'hôte peut écrire au nom d\'un joueur\n• Défis de chanson : les invités lancent des duels — acceptez sur le bureau et en avant\n\nPrérequis : pour que les téléphones rejoignent la conversation, des appareils compagnons doivent être connectés (onglet Mobile des paramètres — voir la visite du companion).',
        },
        navButton: {
          title: 'Ouvrir le chat',
          body: 'Le bouton chat de la barre de menu ouvre le panneau — il glisse en panneau latéral sur l\'écran et se ferme avec ✕ ou un clic à côté.',
        },
        panel: {
          title: 'Le panneau de chat',
          body: 'L\'historique défile à gauche, vous écrivez en bas. Le panneau reste ouvert jusqu\'à ce que vous le fermiez — même en changeant d\'écran.',
        },
        messages: {
          title: 'L\'historique',
          body: 'Vos messages apparaissent à droite en cyan (comme hôte) ; ceux des téléphones, à gauche en violet. Chaque message porte son horodatage.',
          details: 'Mise à jour en arrière-plan : le panneau récupère les nouveaux messages toutes les 3 secondes — vous ne ratez rien, même en arrière-plan.\n\nLa notification de chat du bureau (cloche) montre les messages non lus même panneau fermé.',
        },
        sendAs: {
          title: '"Envoyer en tant que"',
          body: 'Vous êtes l\'hôte — mais vous pouvez écrire au nom d\'un joueur : le menu déroulant choisit l\'identité. 🖥️ = hôte, 📱 = joueur.',
          details: 'À quoi ça sert :\n• L\'hôte tape pour quelqu\'un sans téléphone ("Anna dit : refrain encore !")\n• Annonces de scène au nom du profil animateur\n\nLe point coloré à côté du menu déroulant montre la couleur du joueur — l\'historique reste clair sur qui a "parlé".',
        },
        input: {
          title: 'Écrire un message',
          body: 'Tapez dans le champ (max 200 caractères) et appuyez sur Entrée — ou utilisez le bouton d\'envoi.',
        },
        send: {
          title: 'Envoyer',
          body: 'Envoyez avec Entrée ou le bouton — le message apparaît instantanément dans l\'historique et sur chaque téléphone connecté.',
        },
        songChallenges: {
          title: 'Défis de chanson ⚔️',
          body: 'Les invités peuvent vous lancer un défi depuis l\'app : une carte de défi apparaît dans le chat — "Accepter le défi" lance le duel.',
          details: 'Comment se déroule le défi :\n1. Un invité choisit une chanson dans l\'app et touche "Défier"\n2. La carte apparaît dans le chat avec la chanson, le challenger et le bouton d\'acceptation\n3. Acceptez sur le bureau — le dialogue de démarrage s\'ouvre avec le mode duel présélectionné\n4. Chantez ! Le vainqueur rafle la gloire (et les points)\n\nNote : "Envoyer en tant que" doit être réglé sur un joueur pour cela — l\'adversaire doit être identifiable.',
        },
        companionSide: {
          title: 'Sur les téléphones',
          body: 'L\'app compagnon a son propre onglet chat — c\'est là que les invités écrivent. Ce que vous voyez ici, ils le voient en temps réel et inversement.',
        },
        finish: {
          title: 'Message délivré ! 💌',
          body: 'Vous connaissez maintenant le chat — du panneau aux défis de chanson.\n\nCombinée à la visite du companion, on comprend comment téléphones et bureau collaborent.',
        },
      },
    },

    // ═══ Visite du companion (R29) ═══
    companion: {
      title: 'App Companion',
      desc: 'Connectez des smartphones : micro, télécommande, demandes de chanson et chant partagé.',
      chapters: {
        connect: 'Connexion',
        features: 'Ce que l\'app sait faire',
        manage: 'Gérer les appareils',
      },
      steps: {
        welcome: {
          title: 'Les téléphones comme accessoires 📱',
          body: 'L\'app compagnon transforme chaque smartphone en accessoire de karaoké : microphone, télécommande, sélection de chansons et chat — sans installation, directement dans le navigateur.\n\nCette visite couvre le côté bureau du flux.',
          details: 'Le principe : le bureau est l\'hôte (musique, notes, scores) — les téléphones se connectent via le WiFi et deviennent, au besoin :\n• 🎤 Microphones (avec détection de hauteur sur le téléphone !)\n• 🎮 Télécommandes (piloter les écrans)\n• 🎵 Explorateurs de chansons avec demandes de file\n• 💬 Participants au chat\n• 🪞 Miroirs en direct de l\'écran du bureau\n\nPas de magasin d\'apps, pas de compte — scannez le QR, c\'est fini.',
        },
        mobileTab: {
          title: 'Ouvrir l\'onglet Mobile',
          body: 'La connexion commence dans Paramètres → Mobile. Je viens de vous ouvrir l\'onglet.',
        },
        qrCode: {
          title: 'Scanner le QR code',
          body: 'Le grand code à gauche est la route directe : ouvrez l\'appareil photo du téléphone, scannez, l\'app se charge dans le navigateur. Important : téléphone et PC sur le même WiFi.',
          details: 'Le QR code contient l\'adresse LAN du bureau (p. ex. http://192.168.1.42:3000/mobile) — c\'est pourquoi les deux appareils doivent partager un réseau.\n\nSi le code résiste : l\'URL en dessous peut être tapée ou copiée (bouton). Sur les WiFi publics sans visibilité des appareils, la connexion échoue hélas — utilisez plutôt un point d\'accès personnel.',
        },
        connectionInfo: {
          title: 'URL & bouton copier',
          body: 'À droite, l\'adresse en texte — avec un bouton copier pour le partage (p. ex. par messagerie à vos invités). La ligne verte confirme l\'IP réseau détectée.',
          details: 'Astuce d\'avant-soirée : envoyez l\'URL aux invités avant la fête — dès que le bureau tourne, tout le monde se connecte instantanément.\n\nL\'avertissement jaune apparaît quand aucune IP LAN n\'a été détectée (p. ex. fonctionnement en localhost pur) — alors seule la machine elle-même peut y accéder.',
        },
        roles: {
          title: 'Les rôles de l\'app',
          body: 'Après connexion, l\'app propose selon le contexte :\n\n🎤 Vue micro avec affichage de hauteur\n🎮 Télécommande du bureau\n🎵 Explorateur de chansons + demandes de file\n💬 Chat\n🪞 Miroir en direct de l\'écran',
          details: 'Les rôles en détail :\n• Microphone : le téléphone mesure la hauteur et la transmet en direct — le bureau affiche les notes comme celles d\'un "vrai" micro. Fonctionne pour tous les modes (duel aussi : deux téléphones !).\n• Télécommande : écrans, boutons et confirmations depuis le téléphone — génial pour les hôtes qui arpentent la pièce.\n• Explorateur de chansons : toute la bibliothèque sur le téléphone — y compris aperçu et demandes de file avec le badge 📱 sur le bureau.\n• Chat : messages vers le bureau et les autres invités.\n• Miroir : l\'écran du bureau (jeu, résultats) est reflété sur le téléphone — les invités voient tout depuis leur siège.',
        },
        chatRole: {
          title: 'Chat sur le bureau',
          body: 'Ce que les invités écrivent dans le chat de l\'app atterrit dans le chat du bureau (bouton chat dans la barre de menu) — et inversement. Il existe une visite dédiée au chat pour cela.',
        },
        queueRole: {
          title: 'Demandes dans la file',
          body: 'Les invités mettent des chansons en file depuis leurs téléphones — elles apparaissent sur le bureau dans la file avec le badge 📱. Une autre visite couvre cela aussi.',
        },
        singAlong: {
          title: 'Modes de chant partagé 🎶',
          body: 'Dans les modes de fête Companion Sing-A-Long et Passe le Micro, les invités chantent directement via leurs téléphones — la détection de hauteur tourne sur l\'appareil, le bureau orchestre.',
          details: 'Companion Sing-A-Long : chaque invité a paroles + affichage de hauteur sur son téléphone — le bureau montre la piste de notes commune.\n\nPasse le Micro : le micro tourne — même en mélangeant téléphone et micro physique.\n\nPour les deux : meilleur est le WiFi, plus fluide est la hauteur. En cas de saccades, une machine plus proche du routeur aide.',
        },
        deviceList: {
          title: 'La liste des appareils',
          body: 'De retour dans l\'onglet Mobile : tous les appareils connectés affichent heure de connexion, rôle, profil attribué et dernière activité — avec bouton d\'expulsion.',
          details: 'La carte d\'appareil montre :\n• La durée de connexion ("12 min")\n• Ce que fait l\'appareil (micro actif, télécommande…)\n• Le profil réclamé — un menu déroulant en attribue un autre\n• Expulser : déconnecte l\'appareil (il peut se reconnecter instantanément)\n\nAstuce : donnez aux profils des noms parlants — la liste reste claire même avec beaucoup d\'invités.',
        },
        profileClaim: {
          title: 'Réclamation de profil',
          body: 'Chaque appareil peut réclamer un profil : l\'invité chante alors sous son propre nom avec sa propre XP — l\'écran des profils montre la réclamation avec un badge 📱.',
          details: 'Voies de réclamation :\n1. Scanner le QR du profil dans ses réglages (le plus direct)\n2. Dans l\'app, après connexion, choisir dans la liste\n3. Ici dans la liste des appareils via le menu déroulant\n\nDétails aussi dans la visite des profils.',
        },
        microphoneFallback: {
          title: 'Téléphone plutôt que réglages micro',
          body: 'Quand tout le monde chante par téléphone, vous pouvez sauter complètement l\'onglet microphone — l\'app règle la sensibilité elle-même. Les micros physiques se configurent dans l\'onglet microphone, comme montré.',
        },
        finish: {
          title: 'Connecté ! 🔗',
          body: 'Vous savez maintenant comment les téléphones s\'amarrent et ce qu\'ils savent faire.\n\nProchaine étape : ouvrez l\'URL sur votre propre téléphone et faites un premier test — le mode micro est le plus impressionnant.',
        },
      },
    },

    // ═══ Visite des succès (R29) ═══
    achievements: {
      title: 'Succès & Progression',
      desc: 'Succès, niveaux d\'XP, raretés et défis quotidiens.',
      chapters: {
        overview: 'Vue d\'ensemble',
        unlock: 'Débloquer des succès',
        daily: 'Défis Quotidiens',
      },
      steps: {
        welcome: {
          title: 'Succès & progression 🏆',
          body: 'Tout ce que vous collectionnez : succès avec raretés, niveaux d\'XP avec titres de rang et les défis quotidiens comme moteur d\'XP.\n\nCette visite parcourt l\'écran des succès et les défis.',
          details: 'Les trois systèmes ensemble :\n• XP : le "carburant" — des chansons, défis et succès\n• Niveaux & rangs : montent avec l\'XP (débutant → légende) et montrent la progression d\'un coup d\'œil\n• Succès : jalons avec récompenses — certains secrets jusqu\'au déblocage\n\nTout tient au profil — qui chante, collecte (voir la visite des profils).',
        },
        navButton: {
          title: 'Le bouton des succès',
          body: 'Dans la barre de menu, le trophée mène aux succès — la deuxième colonne de trophées à côté montre les classements.',
        },
        playerSelector: {
          title: 'Sélection du joueur',
          body: 'En haut, vous choisissez de qui vous regardez les succès — pratique pour crâner avec sa collection. Le chiffre sur le profil montre son nombre de déblocages.',
        },
        stats: {
          title: 'Les cartes de stats',
          body: 'Quatre cartes d\'un coup d\'œil : succès débloqués, XP collectée avec, complétude en pourcentage et niveau actuel avec titre de rang.',
          details: 'La carte de pourcentage calcule : débloqués ÷ tous les succès. 100 % est la barre du collectionneur — généralement récompensée par son propre succès secret.\n\nLa carte de niveau montre en plus le titre de rang ("Étoile Montante", "Légende du Karaoké"…) — les titres viennent du système de progression du profil.',
        },
        filters: {
          title: 'Filtres',
          body: 'À gauche : les filtres de statut (tous / débloqués / verrouillés). À droite : les catégories : performance, progression, social et spécial.',
          details: 'Ce que signifient les catégories :\n• Performance : exploits de chant (combos, notes dorées, manches parfaites)\n• Progression : jalons de collection (chansons jouées, montants d\'XP, niveaux)\n• Social : actions de fête et multijoueur (duels, manches companion)\n• Spécial : secrets et curiosités — la description ne se révèle qu\'au déblocage\n\nCombinables : "Verrouillés + Spécial" montre ce qui vous attend encore.',
        },
        grid: {
          title: 'Les cartes de succès',
          body: 'Chaque carte : icône, nom, description, rareté et récompense d\'XP. Les débloquées brillent en or avec une date — les verrouillées restent grises.',
          details: 'Les raretés (codées couleur) :\n• Commun — vient naturellement en jouant régulièrement\n• Rare — demande une action délibérée\n• Épique — travail acharné ou coups de chance\n• Légendaire — pour les rares\n\nLe déblocage se fait automatiquement dès que la condition est remplie — notification toast comprise. L\'XP atterrit immédiatement sur le profil.',
        },
        xpSystem: {
          title: 'Comment l\'XP circule',
          body: 'L\'XP vient de trois sources : chansons chantées (par difficulté), défis (quotidiens/hebdo) et succès. Les niveaux débloquent des rangs — et certaines fonctions comme les badges de profil.',
          details: 'Sources d\'XP d\'un coup d\'œil :\n• Chanson terminée : XP de base par difficulté (facile → expert, croissant)\n• Emplacement quotidien : 100–400 XP + bonus\n• Emplacement hebdo : 500–2000 XP\n• Succès : une fois par succès (25–1000 XP selon la rareté)\n\nLa barre de niveau dans l\'écran des profils montre le chemin vers le niveau suivant ; les rangs changent tous les quelques niveaux.',
        },
        navDaily: {
          title: 'Vers les défis',
          body: 'Les défis quotidiens ont leur propre écran — le bouton étoile dans la barre de menu y mène. On y va.',
        },
        playerSelection: {
          title: 'Étape 1 : choisir les joueurs',
          body: 'Flux guidé : d\'abord qui joue — seulement ensuite les tâches apparaissent. Plusieurs joueurs possibles ; les statistiques vont au premier.',
          details: 'Pourquoi la sélection d\'abord ? Emplacements et statistiques sont par profil — sans joueur choisi, il n\'y aurait rien à calculer.\n\nLa carte montre tous les profils actifs ; sélection par clic. Ensuite se déploient l\'étape 2 (tâches) et l\'étape 3 (jeu).',
        },
        slots: {
          title: 'Étape 2 : les 5 emplacements',
          body: 'Cinq emplacements de tâches par jour, qui se débloquent en séquence. Chaque emplacement montre la tâche, les difficultés jouables et la valeur d\'XP — les difficultés élevées multiplient.',
          details: 'Mécanique des emplacements :\n• Les emplacements 2–5 ne s\'ouvrent qu\'après que le précédent est complété ou passé — la chaîne force la variété.\n• Chaque tâche est une condition sur la prochaine chanson ("genre rock", "au moins 80 % de précision"…) — la bibliothèque filtre automatiquement les chansons correspondantes.\n• Difficulté au choix par emplacement : jusqu\'à un multiplicateur d\'XP de 3× en expert.\n\nÀ minuit, cinq tâches fraîches tombent — la chaîne repart.',
        },
        badges: {
          title: 'Badges & hebdo',
          body: 'Compléter plusieurs emplacements rapporte des badges quotidiens (bronze/argent/or) avec de l\'XP en plus. La version hebdomadaire court sur 7 jours avec de grasses récompenses — même mécanique, plus gros jackpot.',
          details: 'Paliers de badges par jour :\n• Bronze : 2 emplacements\n• Argent : 3–4 emplacements\n• Or : les 5 emplacements — plus le bonus d\'XP quotidien\n\nHebdo : 5 emplacements sur 7 jours, 500–2000 XP par emplacement, réinitialisation le lundi. Jouer au quotidien ET à l\'hebdo fait monter nettement plus vite que les chansons seules.',
        },
        challengeModes: {
          title: 'Modes de défi',
          body: 'En plus des emplacements, il existe des modes de défi libres avec modificateurs (p. ex. "tempo 2×", "sans notes") — pour des règles maison et de l\'XP en plus au-delà des tâches quotidiennes.',
          details: 'Les modes se configurent librement : choisissez un mode, combinez des modificateurs, le jackpot d\'XP grossit avec la difficulté.\n\nLes complétions débloquent de nouveaux modificateurs — la carte de collection dans la zone de défis montre ce que vous avez.',
        },
        finish: {
          title: 'Heure de collectionner ! 🏅',
          body: 'Vous connaissez maintenant succès, XP et défis — les trois moteurs de la progression.\n\nAstuce pour démarrer : jouez 2 emplacements quotidiens aujourd\'hui — le reste vient tout seul.',
        },
      },
    },
  },
};
