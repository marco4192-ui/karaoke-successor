// PT translations — tutorial
// Baseado no arquivo em inglês (src/lib/i18n/locales/en/tutorial.ts): textos dos
// tours guiados (básico + editor + configurações + R29: perfis, fila, chat,
// companion, conquistas). Cada etapa pode ter um texto `details` opcional — o
// botão "Saiba mais" no tooltip expande o aprofundamento (primeiro o corpo
// curto, os detalhes sob demanda).
export const tutorialTranslations = {
  tutorial: {
    // ? menu de ajuda
    helpButtonTitle: 'Ajuda e tours',
    helpDialogTitle: 'Ajuda e tours',
    helpDialogDesc: 'Revise os tours completos — ou pule direto para um assunto e peça só aquele pedaço explicado.',
    helpFooter: 'Teclas do tour: → próximo · ← voltar · Esc sair',
    startFullTour: 'Tour completo',
    stepsCount: '{n} etapas',
    completedBadge: 'Concluído',
    // Grupos de tours no menu de ajuda (R29: 8 tours pedem organização)
    groupGettingStarted: 'Primeiros passos',
    groupAreas: 'Áreas e funções',
    groupAdvanced: 'Para especialistas',
    // Controles do overlay
    ariaLabel: 'Tour guiado',
    skipTour: 'Encerrar tour',
    back: 'Voltar',
    next: 'Próximo',
    finish: 'Concluir',
    clickHint: 'Clique agora',
    // Expansão "Saiba mais" (R29)
    moreDetails: 'Saiba mais',
    lessDetails: 'Mostrar menos',
    // Oferta no primeiro início
    offerTitle: 'Bem-vindo ao Karaoke ZERO!',
    offerBody: 'Quer uma passada rápida pelo básico? Em 2 minutos você conhece os desafios diários, os modos de canto, a biblioteca e os jogos de festa.',
    offerStart: 'Iniciar tour',
    offerLater: 'Talvez depois',
    offerHint: 'Disponível a qualquer momento pelo ícone ? na barra de menu.',

    // ═══ Tour básico ═══
    basic: {
      title: 'O básico',
      desc: 'A volta completa: desafios, modos de canto, biblioteca, festa e mais.',
      chapters: {
        welcome: 'Bem-vindo',
        challenges: 'Diários e semanais',
        singing: 'Começar a cantar',
        party: 'Modos de festa',
        more: 'Outras áreas',
      },
      steps: {
        welcome: {
          title: 'Bem-vindo! 👋',
          body: 'Este é um tour ao vivo: eu destaco os pontos importantes e explico cada um.\n\nControles: "Próximo" (ou tecla →), "Voltar" (←) e "Encerrar tour" (Esc). Vamos lá!',
          details: 'Você pode pausar o tour a qualquer momento e retomar depois: o ícone ? na barra de menu abre o menu de ajuda com todos os tours — dá para reproduzir capítulo por capítulo também.\n\nMuitas etapas têm um botão "Saiba mais" aqui embaixo: ele expande os detalhes extras sem perder o texto curto.',
        },
        heroButtons: {
          title: 'Início rápido',
          body: '"Começar a Cantar" leva direto à biblioteca. "Modo Festa" abre os 9 jogos de festa para grupos.',
          details: 'Os cartões de início rápido são atalhos para os caminhos mais comuns:\n• "Começar a Cantar" = abrir a biblioteca, escolher uma música e cantar (solo, duelo ou dueto).\n• "Modo Festa" = a coleção de jogos para até 32 jogadores, com celulares entrando como microfones.\n\nTudo o que você vê aqui também está na barra de menu — os cartões só economizam cliques.',
        },
        dailyCard: {
          title: 'Desafio diário',
          body: '5 espaços por dia com tarefas rotativas — quanto mais espaços você completa, maior seu bônus de XP. Tarefas novas caem à meia-noite.',
          details: 'Como o sistema funciona:\n• Cada um dos 5 espaços guarda um tipo de tarefa diferente (ex.: "cante uma música dos anos 80", "faça 8000 pontos").\n• Os espaços desbloqueiam em sequência — o espaço 2 só abre depois que o 1 é concluído.\n• Cada espaço pode ser jogado em várias dificuldades; as mais altas rendem mais XP (até multiplicador de 3×).\n• O bônus cresce com o número de espaços concluídos: 5/5 garante o bônus diário completo.\n\nAs tarefas saem da SUA biblioteca — a seleção sempre se adapta às suas músicas.',
        },
        weeklyCard: {
          title: 'Desafio semanal',
          body: 'A contraparte semanal: 5 espaços ao longo da semana com recompensas de XP maiores. Perfeito para metas de longo prazo.',
          details: 'Os desafios semanais funcionam como os diários, mas:\n• Os 5 espaços valem por 7 dias — sem reset diário, colecione no seu ritmo.\n• As recompensas de XP por espaço são maiores: 250–500 XP base em vez de 100–200 dos diários — e o multiplicador de dificuldade (até 3×) entra por cima.\n• O reset acontece na segunda-feira de manhã.\n\nDica: diários e semanais rodam em paralelo — jogar os dois é o jeito mais rápido de subir de nível.',
        },
        modeLauncher: {
          title: 'Cantar: Solo, Duelo e Dueto',
          body: '🎤 Solo: um jogador, um microfone.\n⚔️ Duelo: dois jogadores na MESMA música — vence quem fizer mais pontos.\n🎭 Dueto: duas vozes em duas faixas — a biblioteca mostra automaticamente só as músicas de dueto.',
          details: 'Os três modos em detalhe:\n• Solo: karaokê clássico — você canta todas as notas e sua pontuação entra no ranking.\n• Duelo: os dois jogadores cantam a mesma faixa de notas ao mesmo tempo. Os pontos correm separados — a comparação no final mostra quem foi melhor. Perfeito para revanches.\n• Dueto: a música tem duas vozes separadas (P1/P2) — cada um canta "sua" parte, e as frases compartilhadas rendem bônus de equipe. As músicas de dueto aparecem com o filtro 🎭 na biblioteca.\n\nMicrofones: até 4 microfones físicos mais os smartphones como entradas adicionais (veja Configurações → Microfone).',
        },
        libraryNav: {
          title: 'A biblioteca',
          body: 'Todas as suas músicas moram aqui. Busque por título ou artista — a busca fuzzy perdoa até erros de digitação.',
          details: 'Dicas de busca:\n• A busca fuzzy encontra "Dancing Qun" → "Dancing Queen". Ela ignora maiúsculas e erros isolados.\n• Ela pesquisa título, artista E gênero de uma vez — "Rock" também acha as músicas do gênero Rock.\n\nA ordenação fica no menu suspenso (título A–Z, artista, adicionadas recentemente). As músicas entram na biblioteca via importação, escaneamento de pastas ou playlists — o caminho está na aba Biblioteca das configurações.',
        },
        filters: {
          title: 'Filtros',
          body: 'Gênero, idioma, ano, década, duetos e hits virais — fatie a biblioteca como quiser.',
          details: 'Todos os filtros se combinam — ex.: "Gênero: Rock + Idioma: Inglês + Época: anos 80" mostra exatamente os rocks ingleses dos anos oitenta.\n\nFiltros especiais:\n• Dueto: só músicas com duas faixas de voz.\n• Hits virais: músicas que estão nas paradas virais do momento (configuradas em Configurações → Biblioteca).\n• Gêneros e idiomas personalizados: crie suas próprias categorias em Configurações → Gêneros & Idiomas — elas aparecem nesses filtros na hora.\n\n"Limpar filtros" (✕) zera tudo de uma vez.',
        },
        songCard: {
          title: 'As músicas',
          body: 'Clicar num cartão de música abre o diálogo de início: modo, jogadores, microfones e dificuldade.',
          details: 'Cada cartão de música mostra:\n• Capa com título/artista\n• Dificuldade (fácil/médio/difícil/especialista) e estrelas\n• Metadados principais como gênero e idioma — direto da música ou harmonizados por IA (Editor → Metadata Studio).\n\nO ícone de prévia toca um teaser rápido sem abrir o diálogo de início.',
        },
        startModal: {
          title: 'O diálogo de início',
          body: 'Configure tudo aqui: modo (solo/duelo/dueto), quem canta, qual microfone cada um recebe e a dificuldade.\n\nDepois clique em "Iniciar" — e lá vamos nós!',
          details: 'As opções principais:\n• Modo: solo, duelo (2 jogadores, mesma faixa) ou dueto (2 vozes) — no dueto, os dois jogadores escolhem sua voz (P1/P2).\n• Microfones: cada jogador pode ter seu próprio dispositivo de entrada — ou um smartphone como microfone (app Companion).\n• Dificuldade: afeta a pontuação — dificuldades maiores perdoam menos e premiam a precisão (mais potencial de pontos, mais XP).\n• "Adicionar à Fila" em vez de "Iniciar": coloca a música na fila em vez de começar na hora — ideal quando várias pessoas querem cantar.',
        },
        partyCard: {
          title: 'Modos de festa',
          body: '9 jogos para até 32 jogadores: Battle Royale, Passe o Microfone, concurso de Medley, torneio, Palavras Faltantes, Karaokê Cego e mais — os celulares entram como microfones.',
          details: 'Os 9 modos em resumo:\n• Battle Royale: todo mundo canta, o pior é eliminado a cada rodada — vence o último de pé.\n• Passe o Microfone: o microfone circula de jogador em jogador — cada um canta sua parte.\n• Concurso de Medley: as equipes cantam trechos curtos de músicas com regras especiais.\n• Torneio: chaveamento eliminatório com duelos — o vencedor sobe a cada rodada.\n• Palavras Faltantes: a letra fica com lacunas — cante a palavra que falta para pontuar.\n• Karaokê Cego: a pista de notas escurece em trechos — só o ouvido!\n• Avalie Minha Música e Companion Sing-A-Long, entre outros — cada cartão de modo se explica sozinho.\n\nQuase todos os modos aceitam o app Companion como microfone e controle.',
        },
        partyModes: {
          title: 'A escolha do modo',
          body: 'É aqui que se escolhe o modo de festa: Battle Royale (o último de pé vence), Passe o Microfone, torneio (chaveamento), medley e mais.\n\nCada cartão mostra o que esperar — um clique abre a seleção de jogadores.',
          details: 'Depois de clicar num cartão de modo vem a seleção de jogadores: escolha os perfis (ou conecte dispositivos Companion) e defina tamanho das equipes, número de rodadas ou limites de tempo, conforme o modo.\n\nDica de festa temática: com um tema ativo nas configurações (ex.: "Festa Anos 80"), toda seleção de músicas no modo festa sai automaticamente só das músicas compatíveis — a festa fica no tema.',
        },
        jukeboxCard: {
          title: 'Jukebox',
          body: 'Karaokê sem competição: monte playlists, enfileire músicas, compartilhe favoritos. O entretenimento perfeito de fundo.',
          details: 'O jukebox é o modo relax:\n• Escolha playlists ou músicas avulsas como repertório.\n• Intervalos de vídeo opcionais, para a vibe nunca quebrar.\n• Sem pontuação, sem microfone — as músicas simplesmente tocam com a letra.\n\nPerfeito como entretenimento a noite toda ou para aquecer antes da primeira rodada.',
        },
        jukeboxView: {
          title: 'Dentro do menu do jukebox',
          body: '"Ver playlists" dá acesso direto a todas as playlists salvas — inclusive as que você criou na biblioteca. Um clique coloca a playlist inteira na fila.',
          details: 'As configurações de playlist do jukebox oferecem:\n• Se os vídeos são exibidos (quando as músicas têm)\n• Intervalos de vídeo: clipes de pausa entre as músicas, ex.: para anúncios\n• Se o repertório é embaralhado ou segue ordem fixa\n\nAbre em tela cheia — saia com Esc ou com o botão de parar no topo.',
        },
        highscoreCard: {
          title: 'Pontuações',
          body: 'Pontuações por música e dificuldade — vença seus amigos (ou você mesmo).',
          details: 'Os rankings lembram, por música e dificuldade:\n• Pontuação, precisão, notas douradas e data\n• Qual jogador conseguiu a marca (avatar do perfil)\n• Se a entrada veio do app Companion (ícone de celular) ou do desktop\n\nCom o modo online ativado (tela de perfis) você também vê rankings globais e compete com jogadores de outras instalações.',
        },
        highscoreView: {
          title: 'Os rankings',
          body: 'Filtrados por música e dificuldade — com a barra de filtros no topo. Os ícones de celular indicam o uso do app Companion.',
          details: 'A barra de filtros no topo permite:\n• Buscar por música ou jogador\n• Filtrar por dificuldade\n• Alternar local/global (com o online ativado)\n\nAnti-cheat: cada entrada carrega uma impressão digital da música — resultados manipulados são detectados e marcados.',
        },
        settingsCard: {
          title: 'Configurações',
          body: 'Microfones, idioma, ajuste fino da jogabilidade, aparência e gráficos — todos os controles estão aqui.',
          details: 'As 12 abas de configurações num relance:\n• Geral: idioma, dificuldade padrão, online\n• Jogabilidade: pontuação, partículas, combo, gravação de replay\n• Aparência: temas, estilo da letra, plano de fundo\n• Áudio: dispositivo de saída, volume, loudness, qualidade do YouTube\n• Microfone: dispositivos, sensibilidade, noise gate, presets\n• Mobile: conectar e gerenciar dispositivos Companion\n• Webcam: webcam como plano de fundo\n• Biblioteca: pasta de músicas, importação, paradas virais, redefinição\n• Gêneros & Idiomas: categorias personalizadas\n• Festa Temática: ativar e configurar o tema\n• Sync & Backup: as salvaguardas\n• Sobre: versão, plataforma, licenças\n\nNo menu de ajuda ? existe um tour dedicado e aprofundado das configurações, aba por aba.',
        },
        settingsView: {
          title: 'As abas de configurações',
          body: 'Escolha uma seção no topo: Geral (idioma), Jogabilidade, Aparência, Áudio, Microfone, Mobile (conexão de celulares) e mais.',
          details: 'Um texto curto de introdução no topo de cada aba explica o que ela faz — você nunca precisa adivinhar onde fica uma opção.\n\nO tour correspondente: "Configurações" no menu de ajuda ? percorre todas as abas com você.',
        },
        finish: {
          title: 'Concluído! 🎉',
          body: 'Agora você conhece o básico.\n\nDica: o ícone ? na barra de menu traz você de volta a qualquer momento — incluindo capítulos avulsos por assunto, o tour do editor e o das configurações.',
          details: 'E agora? Algumas sugestões para os primeiros minutos:\n1. Crie um perfil (Perfis na barra de menu) — sem um, você joga do mesmo jeito, mas não ganha XP.\n2. Importe músicas (Configurações → Biblioteca).\n3. Algumas rodadas de desafios diários para o boost de XP.\n4. Amigos chegando? Experimente o modo festa — o app Companion transforma cada celular num microfone (tem um tour dedicado ao Companion).',
        },
      },
    },

    // ═══ Tour do editor ═══
    editor: {
      title: 'Tour do editor',
      desc: 'Notas, letras, vozes e harmonização — a caixa de ferramentas das músicas.',
      chapters: {
        entry: 'Entrando',
        layout: 'Layout',
        notes: 'Editando notas',
        extras: 'Extras e harmonização',
      },
      steps: {
        welcome: {
          title: 'O editor ✏️',
          body: 'É aqui que as músicas viram faixas de karaokê jogáveis: posicione notas, sincronize letras, atribua vozes.\n\nDica de treino: pratique numa música de teste — as mudanças desfazem com Ctrl+Z.',
          details: 'O editor trabalha com o formato UltraStar: cada nota tem um início, uma duração, um tom e um texto (a sílaba). Muitas notas formam a pista de notas que você vê no jogo.\n\nFontes de novas músicas:\n• Importação de texto (UltraStar/TXT) no editor\n• Importação de MIDI (notas geradas do MIDI)\n• Harmonização por IA: letra + áudio → sugestões de notas\n\nTudo é não destrutivo: até você salvar, a música original fica intacta.',
        },
        songList: {
          title: 'Seleção de música',
          body: 'Busque uma música para abri-la. Os filtros revelam as músicas com metadados faltando — o editor harmoniza essas depois.',
          details: 'Os chips de filtro acima da lista mostram as músicas sem gênero/idioma/ano — o caminho mais rápido até as que o Metadata Studio ainda não processou.\n\nA busca cobre título e artista — maiúsculas não importam.',
        },
        noSongs: {
          title: 'Nenhuma música ainda',
          body: 'O editor precisa de músicas na biblioteca. Importe músicas primeiro (biblioteca → importação / escanear pastas) e volte aqui.',
          details: 'Como conseguir músicas:\n• Configurações → Biblioteca → defina a pasta de músicas: cada subpasta é lida como uma música (áudio/vídeo + texto UltraStar).\n• Alternativamente, arquivos individuais pelo diálogo de importação.\n• Ou crie uma música nova no editor ("Nova Música") e junte você mesmo letra e áudio.',
        },
        openSong: {
          title: 'Abrir uma música',
          body: 'Clique agora numa música da lista para abri-la no editor.',
          details: 'Aberta a música, você vê a barra de ferramentas (subcabeçalho) no topo e a linha do tempo com forma de onda, pistas de notas e letra.\n\nA música fica aberta até você fechar com "Voltar" — mudanças não salvas pedem confirmação antes.',
        },
        leftPanel: {
          title: 'Barra de ferramentas',
          body: 'Tudo para as notas: adicionar, duplicar, excluir, dividir, mesclar — mais tipos de nota, vozes e modo tap (já vem).',
          details: 'As ferramentas em ordem:\n• ➕ Adicionar nota: cai na posição de reprodução\n• ⧉ Duplicar: copia a nota selecionada logo adiante\n• 🗑 Excluir: remove a seleção\n• ✂ Dividir: uma nota → duas (no meio)\n• ⇄ Mesclar: une a nota selecionada com a próxima\n\nSeleção com clique; shift+clique para várias. Depois a teclado manda: ⌫ exclui, ↑/↓ transpõe, ←/→ ajusta no tempo.',
        },
        lyricsPanel: {
          title: 'Painel da letra',
          body: 'As linhas da letra ficam à esquerda. Clique duas vezes numa linha para saltar a reprodução direto para lá — texto e sincronização são editáveis aqui.',
          details: 'O painel da letra é texto E tempo num só:\n• Clicar numa sílaba seleciona a nota correspondente na linha do tempo.\n• Clique duplo salta para o ponto (a reprodução acompanha).\n• Clique direito (ou ícone de lápis) abre a edição da linha: mude o texto, divida sílabas nas fronteiras de palavra, desloque o tempo da linha inteira.\n\nA divisão nas fronteiras de palavra usa detecção de idioma para distribuir as sílabas de forma sensata — chega de cortar na mão.',
        },
        subHeaderTools: {
          title: 'Editando notas',
          body: 'As notas são os blocos nas pistas de tom: adicionar, duplicar, excluir, dividir (uma nota → duas) e mesclar (com a próxima nota).\n\nEdite as notas selecionadas em ritmo: ⌫ exclui, ↑/↓ transpõe.',
          details: 'Dicas de precisão:\n• Zoom: Ctrl+roda do mouse sobre a linha do tempo — aproxime para ajustes finos.\n• Reprodução: Espaço alterna play/pausa, Shift+Espaço toca só a seleção.\n• Transpor várias notas: selecione todas, ↑/↓ move o conjunto.\n\nNo tempo: o início da nota precisa cair no ataque da sílaba no vocal — a forma de onda ajuda a achar os ataques.',
        },
        noteTypes: {
          title: 'Tipos de nota',
          body: '5 tipos para notas novas:\n: Normal (o tom conta)\n* Dourada (pontos extras)\nF Freestyle (qualquer nota vale)\nR Rap (só o ritmo)\nG Rap dourada',
          details: 'O que cada tipo significa no jogo:\n• Normal (:): a nota cantada clássica — contam tom e tempo.\n• Dourada (*): desenhada em ouro, pontos em dobro no acerto. Perfeita para os momentos altos da música.\n• Freestyle (F): o tom não importa, contam só texto e tempo — boa para falas.\n• Rap (R): avalia ritmo e sincronia em vez de melodia.\n• Rap dourada (G): como o rap, mas com pontos extras.\n\nO tipo dá para mudar depois: selecione a nota e escolha um novo tipo na barra de ferramentas.',
        },
        voices: {
          title: 'Vozes',
          body: 'P1 = jogador 1, P2 = jogador 2 (dueto!), P4/P8 = terceira/quarta voz. Cada nota pertence a uma voz — é assim que nascem as músicas de dueto com partes separadas.',
          details: 'Atribuição de vozes:\n• O menu suspenso de vozes escolhe a faixa onde as notas novas caem.\n• Notas já posicionadas podem mudar: selecione e troque a voz.\n• No modo dueto no jogo, cada jogador escolhe sua faixa — a biblioteca filtra automaticamente as músicas com pelo menos 2 vozes.\n\nP4/P8 até permitem formações de quarteto; os modos principais do jogo usam P1/P2.',
        },
        tapMode: {
          title: 'Modo tap — o turbo 🥁',
          body: 'Ative e toque junto: cada clique solta uma nota na posição atual de reprodução, linha por linha da letra. Crie notas em tempo real.',
          details: 'Como funciona a gravação por tap:\n1. Ative o modo tap na barra de ferramentas.\n2. Comece a reprodução — a música roda com áudio audível.\n3. Clique no ritmo das sílabas — cada clique solta uma nota na posição, com o último tom escolhido.\n4. Depois refine: corrija os tons (↑/↓ nas notas selecionadas) e ajuste as durações.\n\nO modo tap é 5–10× mais rápido que posicionar notas à mão — músicas inteiras em minutos em vez de horas.',
        },
        panels: {
          title: 'Painéis do topo',
          body: 'Três painéis no canto superior direito: metadados (gênero/idioma/ano), análise de áudio e assistente de IA.',
          details: 'O que os três painéis fazem:\n• Metadados: edite gênero, idioma e ano da música aberta — alimenta filtros e festa temática.\n• Análise de áudio: analisa o arquivo de áudio (loudness, tom, BPM) e sugere valores.\n• Assistente de IA: completar letras, identificar músicas e harmonizar notas por IA — requer um provedor de IA configurado (Configurações → IA).',
        },
        metadataStudio: {
          title: 'Metadata Studio',
          body: 'O turbo da harmonização: sugestões de IA e de regras para gênero, idioma e ano — com escuta antes de atribuir, edição fina manual e fila de revisão para os casos incertos.',
          details: 'O fluxo do estúdio:\n1. "Analisar todas as músicas" — o motor de regras (caminhos de arquivo, tags) e opcionalmente a IA sugerem gênero/idioma/ano.\n2. As sugestões vêm com confiança: verde = certo, amarelo = revisar.\n3. Escuta: clicar numa música toca um trecho — verifique as sugestões na hora.\n4. Atribua individualmente ou "aplicar todos os verdes".\n\nA fila de revisão junta os casos incertos para depois — nada se perde.',
        },
        shortcuts: {
          title: 'Atalhos',
          body: 'Todos os atalhos de teclado num relance — o editor é um instrumento de teclado. Dê uma olhada!',
          details: 'Os atalhos mais importantes:\n• Ctrl+Z / Ctrl+Y: desfazer / refazer\n• Espaço: play/pausa\n• ⌫: excluir notas selecionadas\n• ↑/↓: transpor (Shift = oitava inteira) · ←/→: ajustar no tempo (Shift = passos maiores)\n• M: mesclar com a próxima nota\n• Ctrl+S: salvar · Ctrl+C/V: copiar/colar notas\n\nO painel de atalhos na barra à esquerda mostra todas as teclas num relance.',
        },
        finish: {
          title: 'Pronto para construir! 🛠️',
          body: 'Agora você conhece a caixa de ferramentas do editor.\n\nLembre-se: Ctrl+Z salva tudo, e o ícone ? na barra de menu traz você de volta a esses capítulos a qualquer hora.',
          details: 'Ordem recomendada para uma música nova:\n1. Anexar áudio/vídeo (aba de informações da música)\n2. Importar ou digitar a letra (aba da letra)\n3. Notas no modo tap ou harmonização com IA\n4. Cuidar dos metadados (gênero/idioma/ano — importantes para os filtros!)\n5. Salvar — a partir daí a música aparece na biblioteca.',
        },
      },
    },

    // ═══ Tour das configurações (R28) ═══
    settings: {
      title: 'Configurações',
      desc: 'Todas as configurações num relance: abas, ajustes gerais, áudio, biblioteca, dispositivos Companion e backup.',
      chapters: {
        overview: 'Visão geral',
        basics: 'Ajustes básicos',
        sound: 'Áudio e Microfone',
        library: 'Biblioteca e Tema',
        devices: 'Dispositivos e Companion',
        data: 'Sync, Backup e Info',
      },
      steps: {
        welcome: {
          title: 'As configurações 👋',
          body: 'Este tour percorre exclusivamente as configurações — aba por aba.\n\nEu troco de aba automaticamente e explico o que você encontra em cada uma.',
          details: 'As abas na ordem do tour: Geral, Jogabilidade, Aparência, Áudio, Microfone, Mobile (Companion), Webcam, Biblioteca, Gêneros & Idiomas, Festa Temática, Sync & Backup e Sobre.\n\nCada aba abre com uma introdução curta — este tour a aprofunda passo a passo.',
        },
        tabBar: {
          title: 'A barra de abas',
          body: 'Todas as configurações estão organizadas em abas: Geral, Jogabilidade, Aparência, Áudio, Microfone, Mobile, Webcam, Biblioteca, Gêneros & Idiomas, Festa Temática, Sync & Backup e Sobre.\n\nUma introdução curta no topo de cada aba explica o que ela faz.',
          details: 'Para se orientar — quando procurar algo, pergunte a si mesmo…\n• "Como o jogo SE COMPORTA?" → Jogabilidade\n• "Como ele APARECE?" → Aparência\n• "Como ele SOA?" → Áudio / Microfone\n• "Conectar dispositivos?" → Mobile (Companion) / Microfone\n• "Minhas músicas?" → Biblioteca\n• "Fazer backup?" → Sync & Backup\n\nEm janelas estreitas as abas rolam na horizontal — é só arrastar para a direita.',
        },
        general: {
          title: 'Geral',
          body: 'Idioma da interface, dificuldade padrão, atividades online e a visão geral completa dos atalhos de teclado.',
          details: 'Idioma: 16 idiomas disponíveis. A troca vale na hora para a interface inteira.\n\nDificuldade padrão: vale para rodadas novas, a menos que o diálogo de início escolha outra.\n\nAs atividades online controlam se as pontuações sobem globalmente e se os desafios diários são gerados online.',
        },
        gameplay: {
          title: 'Jogabilidade',
          body: 'Exibição de pontuação, efeitos de partícula, exibição de combo, gravação de replay, tela cheia automática e mais interruptores de comportamento para rodadas e resultados.',
          details: 'Os interruptores principais:\n• Exibição de pontuação: para cantar por puro divertimento, sem leitura de pontos.\n• Partículas e efeitos: desative em máquinas mais fracas.\n• Replay: grava áudio e webcam enquanto você canta — o replay toca na tela de resultados.\n• Tela cheia automática: entra em tela cheia sozinho quando uma música começa.\n• Sinais de aviso: bipes curtos antes dos trechos às cegas e das palavras faltantes.\n\nAlém disso: exibição de combo e mais.',
        },
        appearance: {
          title: 'Aparência',
          body: 'Temas, plano de fundo animado ou seu próprio vídeo de fundo, estilo e tamanho da letra, exibição das notas e o modo de desempenho para máquinas mais fracas.',
          details: 'Estilo da letra: 10 temas visuais — "Clássico", "Concerto", "Retrô", "Neon", "Minimalista" e outros.\n\nPlano de fundo: além dos temas, um vídeo personalizado também funciona — no jogo ele roda atrás das notas, escurecido.\n\nO modo de desempenho corta animações e fundos drasticamente — vale a pena em hardware até ~2015.',
        },
        graphicsound: {
          title: 'Áudio',
          body: 'Dispositivo de saída (incl. ASIO), volume geral e de prévia, sensibilidade do microfone, normalização de volume e a qualidade dos vídeos do YouTube.',
          details: 'ASIO: só relevante para Windows + placas de som com suporte — reduz a latência do monitoramento do microfone.\n\nA normalização de volume equilibra as diferenças entre as músicas — os padrões já vêm bem calibrados.\n\nQualidade do YouTube: afeta músicas com fonte de vídeo no YouTube; mais qualidade = mais banda.',
        },
        microphone: {
          title: 'Microfone',
          body: 'Escolha do dispositivo, sensibilidade, noise gate e nível ao vivo — além de presets. Os smartphones conectam pela aba Mobile.',
          details: 'Presets: as configurações típicas ("Ideal", "Baixa Latência", "Alta Precisão", "Ambiente Ruidoso", "Baixo", "Soprano") definem sensibilidade e noise gate em combinações sensatas.\n\nNoise gate: filtra respirações e ruído de ambiente — o nível ao vivo mostra em tempo real o que passa.\n\nImportante no multijogador: CADA jogador pode ter o SEU próprio dispositivo — a atribuição acontece no diálogo de início, rodada a rodada.',
        },
        libraryTab: {
          title: 'Biblioteca',
          body: 'Defina a pasta de músicas (cada subpasta = uma música) e escaneie, redefina a biblioteca ou apague todos os dados — mais a importação de outros sistemas de karaokê.',
          details: 'Formato das pastas: uma subpasta por música com áudio/vídeo + TXT (formato UltraStar). O scanner reconhece as combinações comuns (.mp3/.ogg + .txt, .mp4/.mkv + .txt).\n\nImportação de outros sistemas: um arquivo do SingStar? Uma coleção UltraStar? O conversor de importação assume metadados e letras automaticamente.\n\nCuidado com "apagar todos os dados": a confirmação dupla pergunta duas vezes — ainda assim, faça um backup antes (aba Sync & Backup).',
        },
        taxonomy: {
          title: 'Gêneros & Idiomas',
          body: 'Crie suas próprias entradas de gênero e idioma — elas aparecem em todos os menus suspensos e alimentam a harmonização por IA.',
          details: 'Por que entradas personalizadas? As listas padrão não cobrem tudo ("Schlager", "K-Pop", "Dialeto"…). Entradas personalizadas:\n• aparecem na hora nos filtros da biblioteca\n• ficam selecionáveis no editor e no Metadata Studio\n• entram na harmonização (a IA sugere elas para as músicas correspondentes)\n\nExcluir também funciona — as músicas mantêm a entrada até ser reatribuída.',
        },
        motto: {
          title: 'Festa Temática',
          body: 'Coloque todo o jogo num tema (ex.: uma festa anos 80): ativo, o tema substitui todos os campos de busca e filtros — toda seleção de músicas sai só do repertório compatível.',
          details: 'O filtro por tema conhece vários campos, combináveis livremente (lógica AND):\n• Gênero (ex.: rock)\n• Idioma (ex.: inglês)\n• Época/ano (ex.: 1980–1989)\n\nEfeito: biblioteca, seleção de músicas da festa E app Companion mostram só o repertório do tema — os convidados não conseguem escolher nada fora do tema.\n\nDesativar o tema devolve tudo à visão normal na hora; músicas tocadas e pontuações ficam intactas.',
        },
        mobile: {
          title: 'Mobile e Companion',
          body: 'Conecte smartphones pelo QR code — como microfone, controle remoto ou aparelho para cantar junto. Você vê todos os dispositivos conectados e seus códigos de conexão.',
          details: 'Conexão: escaneie o QR code (mesmo Wi-Fi!) ou digite a URL — o tour dedicado ao Companion explica os detalhes no menu de ajuda ?.\n\nEsta aba também mostra:\n• Todos os dispositivos conectados com status (ativo, papel, última atividade)\n• A atribuição de perfis aos dispositivos\n• A expulsão de dispositivos individuais\n\nOs QR codes por perfil (para reivindicação) ficam no cartão de configurações da tela de perfis.',
        },
        webcam: {
          title: 'Webcam',
          body: 'Use a webcam como plano de fundo animado da música: resolução, espelhamento, saturação, desfoque e mais efeitos — com prévia ao vivo.',
          details: 'O plano de fundo da webcam roda atrás das notas durante a música — vocês se assistem cantando!\n\nEfeitos: espelhamento (tipo selfie), saturação, desfoque suave, sépia — tudo visível na hora na prévia ao vivo.\n\nPrivacidade: a câmera roda só localmente, nada é gravado ou enviado.',
        },
        sync: {
          title: 'Sync & Backup',
          body: 'Crie e restaure backups, sincronize dados entre dispositivos. Na versão desktop, os dados dos jogadores também ficam espelhados permanentemente na pasta AppData.',
          details: 'Um backup contém: perfis (com XP/progresso), pontuações, configurações e definições de playlists — num único arquivo para arquivar ou levar.\n\nO espelho no AppData (versão desktop) protege contra perda de dados do navegador: mesmo que o armazenamento do navegador seja apagado, a versão desktop restaura tudo.\n\nRestaurar sobrescreve os dados atuais — de novo: faça backup antes.',
        },
        about: {
          title: 'Sobre',
          body: 'Versão, plataforma, licenças e projetos contribuintes — a identidade digital do Karaoke ZERO.',
          details: 'Você também vê o canal da build (web/desktop) e pode verificar atualizações. As licenças listam os projetos de código aberto usados — obrigado a todos os envolvidos!',
        },
        finish: {
          title: 'Tudo configurado! ⚙️',
          body: 'Agora você conhece todas as configurações.\n\nO ícone ? na barra de menu traz você de volta a este tour a qualquer momento — capítulo por capítulo, se quiser.',
          details: 'Recomendação para a primeira noite de configuração:\n1. Aba Biblioteca: escaneie a pasta de músicas\n2. Aba Microfone: escolha um preset e confira o nível ao vivo\n3. Aba Mobile: conecte os celulares (tem o tour do Companion!)\n4. Aba de tema: pense num tema de festa\n5. Sync & Backup: faça o primeiro backup\n\nCom isso, a noite de karaokê está nos trilhos.',
        },
      },
    },

    // ═══ Tour de perfis (R29) ═══
    profile: {
      title: 'Perfis e Personagens',
      desc: 'Crie jogadores, acompanhe XP e progresso, sync online e reivindicação pelo celular.',
      chapters: {
        overview: 'Visão geral',
        characters: 'Personagens e Progresso',
        online: 'Online e Companion',
      },
      steps: {
        welcome: {
          title: 'Seus perfis de jogador 👤',
          body: 'Os perfis são as identidades do jogo: XP, nível, estatísticas e conquistas vivem no perfil — e as pontuações levam seu nome.\n\nEste tour mostra como criar e gerenciar perfis.',
          details: 'Por que perfis?\n• XP e nível: músicas cantadas, desafios e conquistas acumulam experiência — o nível sobe junto com o nome de rank (Iniciante → Divino).\n• Rankings: as entradas de pontuação mostram seu avatar.\n• Modos de festa: toda seleção de jogadores sai dessa lista.\n• Dispositivos Companion podem "reivindicar" um perfil e cantar com a identidade dele.\n\nOs perfis ficam no armazenamento do navegador (local) ou numa conta online (com sync) — você escolhe ao criar.',
        },
        topBar: {
          title: 'A barra de ações',
          body: 'Aqui em cima você liga os rankings online, alterna local/global e abre o formulário de criação de novos perfis.',
          details: 'Os elementos da barra:\n• Interruptor online: liga/desliga globalmente os recursos online (rankings, registro de conta)\n• Local/Global: qual ranking a visão de pontuações mostra\n• "Carregar Perfil": entra com um código de sync e traz seu perfil online para este dispositivo\n• "Novo Perfil": abre o formulário de criação (próxima etapa)',
        },
        createButton: {
          title: 'Criando um perfil',
          body: '"Novo Perfil" abre o formulário: nome, imagem de avatar, país e modo de armazenamento (local ou com conta online).',
          details: 'Os campos do formulário:\n• Nome: aparece nos rankings e nas festas\n• Avatar: envie sua própria imagem ou uma inicial numa cor\n• País: bandeira para os rankings globais\n• Modo de armazenamento: "Local" salva só neste dispositivo; "Online" registra opcionalmente uma conta (e-mail + senha) e permite sincronizar entre dispositivos.\n\nContas online só existem com o modo online ativado — o registro roda em segundo plano e o perfil já fica utilizável.',
        },
        empty: {
          title: 'Nenhum perfil ainda',
          body: 'É aqui que seus jogadores tomam forma. Clique em "Novo Perfil" e crie o primeiro personagem — tudo funciona sem um, mas XP e conquistas só se acumulam em perfis.',
        },
        cards: {
          title: 'Os cartões de personagem',
          body: 'Cada cartão mostra avatar, nível, rank e modo de armazenamento. Um clique seleciona o perfil e mostra os detalhes abaixo.\n\nO pontinho no canto superior direito: verde = ativo, vermelho = desativado.',
          details: 'Os símbolos do cartão:\n• ✓ balãozinho: o perfil ativo no momento (o diálogo de início lembra dele)\n• Ícone de rank + "Lv. X": o progresso do perfil\n• Distintivo 💾/🌐: salvo localmente ou online\n• Distintivo 📱: este perfil está reivindicado por um dispositivo Companion\n• Bandeira: o país escolhido\n\nClique num cartão = selecionar. A desativação (vermelho) fica no cartão de progresso — perfis desativados somem das seleções de jogadores, mas guardam todos os dados.',
        },
        progression: {
          title: 'O cartão de progresso',
          body: 'Barra de XP até o próximo nível mais as estatísticas principais: músicas cantadas, notas douradas, melhor combo e pontuação total.\n\nO interruptor à direita desativa o perfil temporariamente.',
          details: 'Entendendo as estatísticas:\n• Músicas tocadas: cada rodada concluída conta\n• Notas douradas: coletadas por música — mostram a precisão nos momentos altos\n• Melhor combo: a maior sequência impecável de todos os tempos\n• Pontuação total: a soma de todas as pontuações\n\nO interruptor: perfis desativados desaparecem da seleção de jogadores e da fila (músicas de duelo/dueto então pedem nova seleção), mas não perdem NADA — basta reativar.',
        },
        settingsCard: {
          title: 'Configurações do perfil',
          body: 'Edite nome e avatar, troque o país, opções de privacidade — e o QR code do perfil, que deixa um celular reivindicá-lo.',
          details: 'Privacidade: controla quais estatísticas aparecem nos rankings globais.\n\nMostrar QR code: gera um código apontando DIRETAMENTE para este perfil — o celular que escanear conecta como esse perfil (ideal: cada cantor com seu celular e seu perfil).\n\nExcluir remove o perfil para sempre — as pontuações ficam como entradas anônimas. Para perfis online, o app pergunta de novo antes de excluir.',
        },
        onlineToggle: {
          title: 'Rankings online',
          body: 'O interruptor ativa os recursos online: pontuações globais, registro de conta e sync de perfis entre dispositivos.',
          details: 'Desligado = totalmente offline: tudo fica local, sem requisições de rede para rankings.\n\nLigado = você ganha a aba "Global" nos rankings e pode criar/carregar perfis online.\n\nA troca vale imediatamente — as pontuações locais já coletadas sempre ficam.',
        },
        loginButton: {
          title: 'Carregando um perfil',
          body: 'Já é registrado? "Carregar Perfil" traz seu perfil online para este dispositivo por e-mail/código de sync — progresso e pontuações vêm junto.',
          details: 'O diálogo de login conhece dois caminhos:\n• E-mail + senha (como no registro)\n• Código de sync: o código curto do seu perfil — mais fácil num computador emprestado\n\nApós o login, o perfil carregado se mescla com o local (o progresso maior vence). Os syncs passam a rodar automaticamente em segundo plano.',
        },
        companionClaim: {
          title: 'Reivindicando um perfil 📱',
          body: 'Quando um celular conecta com um perfil, o cartão mostra um 📱. O celular canta e seleciona com esse perfil — nome, XP e conquistas se acumulam lá.',
          details: 'Como "reivindicar" um perfil (3 jeitos):\n1. Escaneie o QR code nas configurações do perfil — conexão DIRETA com esse perfil\n2. No celular, depois de conectar, escolha um perfil da lista\n3. Aqui na aba Mobile das configurações: dispositivo → atribuir perfil\n\nUm perfil só pode ser reivindicado por UM dispositivo por vez. Para desconectar: na aba Mobile ou pelo próprio celular.',
        },
        finish: {
          title: 'Time completo! 🎭',
          body: 'Agora você sabe como funcionam os perfis — do XP ao sync online e à reivindicação pelo celular.\n\nContinue com as conquistas: o tour "Conquistas e Progresso" mostra o que seu perfil pode colecionar.',
        },
      },
    },

    // ═══ Tour da fila (R29) ═══
    queue: {
      title: 'Fila',
      desc: 'Enfileirar músicas, reordenar, regras e pedidos pelo Companion.',
      chapters: {
        overview: 'Visão geral',
        manage: 'Gerenciamento',
        companion: 'Companion e Atalhos',
      },
      steps: {
        welcome: {
          title: 'A fila 🎶',
          body: 'A fila organiza sua noite de karaokê: as músicas entram na linha, todo mundo tem sua vez — ninguém precisa ficar de olho no PC.\n\nEste tour cobre enfileirar, ordenar e as regras.',
          details: 'Três jeitos de enfileirar:\n1. Biblioteca → clique numa música → no diálogo de início escolha "Adicionar à Fila" em vez de "Iniciar"\n2. Depois de uma música: "Tocar Próxima Música" na tela de resultados mantém o fluxo\n3. Pelo app Companion: os convidados enfileiram dos celulares (marcadas com o distintivo 📱)\n\nA barra de menu mostra o tamanho da fila num botão contador — dá para ver a noite chegando.',
        },
        navButton: {
          title: 'O botão da fila',
          body: 'Na barra de menu, "Fila" leva até aqui — o número no botão mostra quantas músicas estão esperando.',
        },
        title: {
          title: 'A fila de músicas',
          body: 'A lista mostra todas as músicas em espera com posição, modo (solo/duelo/dueto) e jogadores — ordenadas por horário de entrada.',
        },
        empty: {
          title: 'Ainda vazia',
          body: 'Nenhuma música na fila. Adicione algumas da biblioteca (diálogo de início → "Adicionar à Fila") — ou deixe os convidados enfileirarem pelo app Companion.',
        },
        list: {
          title: 'A lista da fila',
          body: 'Cada cartão: posição, música, distintivo do modo e os jogadores. Clicar num cartão já toca a música — até fora de ordem.',
          details: 'Os distintivos:\n• 🎤 Solo / ⚔️ Duelo / 🎭 Dueto — o modo com que a música foi enfileirada\n• 📱 — adicionada pelo app Companion\n\nClique num cartão = tocar agora. O botão ✕ à direita remove a entrada, ▶ toca.\n\nTeclado: Enter toca, Delete remove, ↑/↓ navega pela lista.',
        },
        reorder: {
          title: 'Mudando a ordem',
          body: 'Arraste os cartões para a nova posição — só as entradas locais se movem; pedidos do Companion mantêm a ordem.',
          details: 'Arrastar e soltar: pegue um cartão e puxe para cima ou para baixo com o botão pressionado. A lista mostra ao vivo a posição de soltura.\n\nPor que as entradas do Companion ficam fixas: o app dos convidados ordena por horário de envio — se o host pudesse reembaralhar, os pedidos pareceriam manipulados. Remover ainda é possível.',
        },
        playNext: {
          title: 'Tocar próxima música',
          body: 'O botão inicia a primeira entrada — o movimento padrão entre as rodadas. Ou clique direto em qualquer cartão.',
          details: 'A tela de resultados depois de cada música oferece o mesmo botão ("Tocar Próxima Música") — o fluxo segue sem desviar para a visão da fila.\n\nO botão "Tocar Próxima Música" da visão da fila faz o mesmo — a primeira entrada começa com um clique.',
        },
        clearAll: {
          title: 'Limpar tudo',
          body: '"Limpar Tudo" esvazia a fila inteira — pedidos do Companion incluídos. Não há volta, use com cuidado.',
        },
        rules: {
          title: 'As regras',
          body: 'O regulamento oficial fica embaixo: máximo de 3 músicas por jogador, ordem FIFO, remova as suas, escolha um personagem primeiro…',
          details: 'As regras em detalhe:\n• Máximo de 3 músicas por jogador ao mesmo tempo — ninguém bloqueia a fila. Quem cantou pode enfileirar de novo.\n• FIFO: primeiro a entrar = primeiro a sair. Arrastar e soltar reordena localmente.\n• As próprias músicas podem ser removidas a qualquer hora; as dos outros só com "Limpar Tudo" ou como host.\n• Personagem primeiro: a fila precisa de perfis ativos para duelo/dueto, senão pede nova seleção no início.\n• Pedidos do Companion mostram o distintivo 📱 e contam como os seus.',
        },
        companionAdd: {
          title: 'Pedidos dos celulares 📱',
          body: 'Os convidados enfileiram músicas pelo app Companion — elas aparecem com o distintivo 📱 na lista e contam no limite de 3 músicas deles.',
          details: 'Como fica para os convidados: no app, escolhem uma música, selecionam o modo, enviam — o pedido cai nesta lista.\n\nVocê, como host, vê na hora: quem pediu (avatar do jogador) e que é um pedido de celular (📱). O limite de 3 vale por perfil — inclusive pelo celular.\n\nMais no tour do Companion.',
        },
        autoplay: {
          title: 'Atalho & fluxo',
          body: 'Ctrl+Q inicia a primeira entrada da fila de qualquer lugar — o clássico quando a próxima rodada tem que rolar já.',
          details: 'O fluxo entre as rodadas: música termina → tela de resultados → o botão "Tocar Próxima Música" (ou Ctrl+Q) mantém a noite rolando.\n\nCtrl+Q funciona de qualquer lugar — sem desviar para a visão da fila.',
        },
        finish: {
          title: 'A fila está esperando! 🎧',
          body: 'Agora você sabe enfileirar, ordenar e as regras.\n\nDica: combine o atalho Ctrl+Q + pedidos do Companion para uma noite de karaokê que se sustenta sozinha.',
        },
      },
    },

    // ═══ Tour do chat (R29) ═══
    chat: {
      title: 'Chat',
      desc: 'Abrir o painel, enviar mensagens, o seletor "Enviar como" e os desafios de música.',
      chapters: {
        basics: 'Abrindo o chat',
        usage: 'Enviando mensagens',
        challenges: 'Desafios',
      },
      steps: {
        welcome: {
          title: 'O chat da festa 💬',
          body: 'O chat conecta desktop e apps Companion: conversar sem interromper quem canta — e até desafiar alguém para um duelo de música.\n\nJá já eu abro o painel para você.',
          details: 'O que o chat faz:\n• Mensagens de texto entre desktop (host) e todos os celulares conectados\n• Escolha do remetente: o host pode escrever em nome de um jogador\n• Desafios de música: os convidados pedem duelos — aceite no desktop e vá\n\nPré-requisito: para os celulares entrarem na conversa, é preciso ter dispositivos Companion conectados (aba Mobile das configurações — veja o tour do Companion).',
        },
        navButton: {
          title: 'Abrindo o chat',
          body: 'O botão do chat na barra de menu abre o painel — ele desliza como painel lateral sobre a tela e fecha com ✕ ou um clique ao lado.',
        },
        panel: {
          title: 'O painel do chat',
          body: 'O histórico corre à esquerda, você escreve embaixo. O painel fica aberto até você fechar — mesmo trocando de tela.',
        },
        messages: {
          title: 'O histórico',
          body: 'Suas mensagens aparecem à direita em ciano (como host), as dos celulares à esquerda em roxo. Cada mensagem carrega seu horário.',
          details: 'Atualização em segundo plano: o painel busca novas mensagens a cada 3 segundos — você não perde nada nem rodando em segundo plano.\n\nO botão do chat na barra de menu fica no lugar — as mensagens novas estão lá na hora em que você reabre o painel.',
        },
        sendAs: {
          title: '"Enviar como"',
          body: 'Você é o host — mas pode escrever em nome de um jogador: o menu suspenso escolhe a identidade. 🖥️ = host, 📱 = jogador.',
          details: 'Para que serve:\n• O host digita para quem não tem celular ("A Ana manda: refrão de novo!")\n• Anúncios de palco em nome do perfil de mestre de cerimônias\n\nO pontinho colorido ao lado do menu mostra a cor do jogador — o histórico fica claro sobre quem "falou".',
        },
        input: {
          title: 'Escrevendo uma mensagem',
          body: 'Digite no campo (máximo de 200 caracteres) e aperte Enter — ou use o botão de enviar.',
        },
        send: {
          title: 'Enviando',
          body: 'Envie com Enter ou com o botão — a mensagem aparece na hora no histórico e em cada celular conectado.',
        },
        songChallenges: {
          title: 'Desafios de música ⚔️',
          body: 'Os convidados podem desafiar você a uma música direto do app: um cartão de desafio aparece no chat — "Aceitar Desafio" inicia o duelo.',
          details: 'Como o desafio corre:\n1. Um convidado escolhe uma música no app e toca em "Desafiar"\n2. O cartão aparece no chat com música, desafiante e o botão de aceitar\n3. Aceite no desktop — o diálogo de início abre com o modo duelo pré-selecionado\n4. Cante! O vencedor leva a glória (e os pontos)\n\nObs.: "Enviar como" precisa estar num jogador — o adversário tem que ser identificável.',
        },
        companionSide: {
          title: 'Nos celulares',
          body: 'O app Companion tem sua própria aba de chat — é ali que os convidados escrevem. O que você vê aqui, eles veem em tempo real, e vice-versa.',
        },
        finish: {
          title: 'Mensagem entregue! 💌',
          body: 'Agora você conhece o chat — do painel aos desafios de música.\n\nJunto com o tour do Companion, dá para entender como celulares e desktop trabalham juntos.',
        },
      },
    },

    // ═══ Tour do Companion (R29) ═══
    companion: {
      title: 'App Companion',
      desc: 'Conecte smartphones: microfone, controle remoto, pedidos de música e canto conjunto.',
      chapters: {
        connect: 'Conectando',
        features: 'O que o app faz',
        control: 'Controle remoto: Take Control',
        solo: 'Sem controle',
        help: 'Ajuda do Companion',
        manage: 'Gerenciando dispositivos',
      },
      steps: {
        welcome: {
          title: 'Celulares como acessórios 📱',
          body: 'O app Companion transforma cada smartphone num acessório de karaokê: microfone, controle remoto, seleção de músicas e chat — sem instalar nada, direto no navegador.\n\nEste tour cobre o lado desktop do fluxo.',
          details: 'O princípio: o desktop é o host (música, notas, pontos) — os celulares conectam pelo Wi-Fi e viram, conforme a necessidade:\n• 🎤 Microfones (com detecção de tom no próprio celular!)\n• 🎮 Controles remotos (navegando nas telas)\n• 🎵 Navegadores de música com pedidos para a fila\n• 💬 Participantes do chat\n• 🪞 Espelhos ao vivo da tela do desktop\n\nSem loja de apps, sem conta — escaneie o QR e pronto.',
        },
        mobileTab: {
          title: 'Abrindo a aba Mobile',
          body: 'A conexão começa em Configurações → Mobile. Acabei de abrir a aba para você.',
        },
        qrCode: {
          title: 'Escaneando o QR code',
          body: 'O código grande à esquerda é o caminho direto: abra a câmera do celular, escaneie, e o app carrega no navegador. Importante: celular e PC no mesmo Wi-Fi.',
          details: 'O QR code guarda o endereço LAN do desktop (ex.: http://192.168.1.42:3000/mobile) — por isso os dois aparelhos precisam dividir a mesma rede.\n\nSe o código teimar: a URL abaixo dá para digitar ou copiar (botão). Em Wi-Fi público sem visibilidade entre dispositivos, a conexão infelizmente falha — use um ponto de acesso pessoal.',
        },
        connectionInfo: {
          title: 'URL e botão de copiar',
          body: 'À direita o endereço em texto — com um botão de copiar para compartilhar (ex.: por mensageiro com seus convidados). A linha verde confirma o IP de rede detectado.',
          details: 'Dica de pré-festa: mande a URL para os convidados antes da festa — assim que o desktop estiver rodando, todo mundo conecta na hora.\n\nO aviso amarelo aparece quando nenhum IP LAN é detectado (ex.: operação só em localhost) — nesse caso, só a própria máquina alcança.',
        },
        roles: {
          title: 'Os papéis do app',
          body: 'Depois de conectar, o app oferece conforme o contexto:\n\n🎤 Visão de microfone com exibição de tom\n🎮 Controle remoto do desktop\n🎵 Navegação de músicas + pedidos para a fila\n💬 Chat\n🪞 Espelho ao vivo da tela',
          details: 'Os papéis em detalhe:\n• Microfone: o celular mede o tom e transmite ao vivo — o desktop mostra as notas como de um microfone "de verdade". Funciona em todos os modos (duelo incluso: dois celulares!).\n• Controle remoto: telas, botões e confirmações pelo celular — ótimo para o host que circula pela sala.\n• Navegação de músicas: a biblioteca inteira no celular — com prévia e pedidos para a fila com o distintivo 📱 no desktop.\n• Chat: mensagens para o desktop e os outros convidados.\n• Espelho: a tela do desktop (jogo, resultados) é espelhada no celular — os convidados veem tudo do lugar deles.',
        },
        chatRole: {
          title: 'O chat no desktop',
          body: 'O que os convidados escrevem no chat do app cai no chat do desktop (botão do chat na barra de menu) — e volta. Tem um tour dedicado a isso.',
        },
        queueRole: {
          title: 'Pedidos na fila',
          body: 'Os convidados enfileiram músicas dos celulares — elas aparecem no desktop na fila com o distintivo 📱. Outro tour cobre isso.',
        },
        singAlong: {
          title: 'Modos de canto conjunto 🎶',
          body: 'Nos modos de festa Companion Sing-A-Long e Passe o Microfone, os convidados cantam direto pelos celulares — a detecção de tom roda no aparelho, o desktop rege.',
          details: 'Companion Sing-A-Long: cada convidado recebe letra e exibição de tom no celular — o desktop mostra a pista de notas compartilhada.\n\nPasse o Microfone: o microfone circula — até misturando celular e microfone físico.\n\nPara os dois: quanto melhor o Wi-Fi, mais suave o tom. Se engasgar, uma máquina mais perto do roteador ajuda.',
        },
        takeControl: {
          title: 'Take Control 🎮',
          body: 'Um telefone agora só comanda o desktop sob comando: o botão "Assumir controle" no Companion pega o controle remoto — antes e depois disso, o telefone toca apenas para si.',
          details: 'O mecanismo por trás de "Assumir controle":\n• O controle é reservado exclusivamente para exatamente um aparelho (bloqueio remoto).\n• Desktop e telefone que controla ficam em sincronia: cada lado vê na hora o que o outro faz.\n• Todos os demais telefones mostram o status "Controlado por …" e aguardam.\n\nO controle termina com "Libertar" — ou automaticamente quando o telefone perde a conexão.',
        },
        controlSync: {
          title: 'Desktop e telefone em sincronia',
          body: 'De volta à aba Móvel: aqui você vê, como anfitrião, todos os aparelhos. Quando um telefone assume o controle, ele espelha a tela do desktop e opera telas, botões e confirmações — mouse e teclado no desktop continuam totalmente utilizáveis.',
          details: 'Como os dois lados rodam em sincronia, ninguém consegue "tocar e fugir": clique no desktop e o telefone que controla acompanha — toque no telefone e o desktop troca de tela.\n\nNa lista de aparelhos você reconhece o aparelho que controla pelo badge de controle remoto.',
        },
        controlHandover: {
          title: 'Só um controle remoto por vez',
          body: 'O controle é exclusivo: enquanto um telefone comanda, nenhum segundo assume — o botão dele mostra em vez disso quem está no controle. Libertar ou desconectar devolve o controle na hora.',
          details: 'Bom saber:\n• O anfitrião pode continuar clicando a qualquer momento — o telefone que controla acompanha (e mantém o controle).\n• Se o telefone que controla perder a conexão (bateria, WiFi), o controle volta automaticamente ao desktop.\n• Uma expulsão da lista de aparelhos também encerra o controle.',
        },
        soloOverview: {
          title: 'Convidados sem controle 🙋',
          body: 'A maioria dos convidados nunca precisa do controle remoto: telefones conectados sem Take Control são acompanhantes autônomos — pedem músicas, conversam no chat, cantam junto e conferem as próprias conquistas sem tocar no desktop.',
          details: 'O que os telefones sem controle podem fazer:\n• 🎵 Colocar as próprias músicas na fila (com o distintivo 📱)\n• 💬 Entrar no chat da festa\n• 🎤 Cantar nos modos de festa (Companion Sing-A-Long, Passe o Microfone)\n• 🗳️ Votar nas enquetes (torneio, Battle Royale)\n• 🏆 Ver as próprias pontuações e conquistas',
        },
        soloQueue: {
          title: 'Pedidos sem controle',
          body: 'Mesmo sem controle remoto, cada convidado enfileira as próprias músicas: escolha uma música no telefone, coloque na fila — pronto. O pedido chega aqui com o distintivo 📱 e conta para o limite de 3 músicas do perfil.',
        },
        soloParty: {
          title: 'Cantar junto e votar',
          body: 'A participação na festa passa sempre pelos telefones: no Companion Sing-A-Long e no Passe o Microfone os convidados cantam direto do aparelho, no torneio e no Battle Royale votam com um toque — tudo sem Take Control.',
        },
        soloStats: {
          title: 'Conquistas e pontuações próprias',
          body: 'Cada convidado mantém seu próprio álbum: no telefone dá para ver as próprias pontuações e conquistas — sem Take Control. O que o perfil conquista, o convidado confere até do sofá.',
        },
        soloLimits: {
          title: 'O que segue bloqueado',
          body: 'Sem controle, definições, perfis, configuração da festa, desafios diários e Jukebox ficam de fora — seguem reservados ao desktop (ou a um Companion com Take Control).',
          details: 'Por que o cadeado? Essas áreas mudam o estado do jogo ou a configuração para todos: definições, gestão de perfis, configuração da festa, desafios diários e Jukebox. É para isso que existe o controle explícito — "Assumir controle" desbloqueia para exatamente um telefone.\n\nO anfitrião do desktop sempre mantém tudo em suas mãos.',
        },
        helpButton: {
          title: 'Ajuda em cada telefone ❓',
          body: 'Você conhece o menu ? aqui na barra de menu — cada telefone conectado ganha seu próprio botão "?". Um toque abre a ajuda do Companion direto no aparelho.',
        },
        helpLocal: {
          title: 'Só ler, nunca controlar',
          body: 'A ajuda do Companion é uma visualização somente leitura: ela não envia comandos ao desktop e nunca inicia um tour do desktop. Os convidados podem abri-la a qualquer momento — mesmo enquanto alguém canta ou controla.',
          details: 'Assim a ajuda fica deliberadamente separada do sistema de controle: um convidado que só quer consultar algo ("Como coloco uma música na fila?") não exerce nenhuma influência sobre a noite em andamento — e os tours aqui no desktop continuam assunto do anfitrião.\n\nAbra pelo botão "?" na app Companion; feche simplesmente fechando a visualização.',
        },
        deviceList: {
          title: 'A lista de dispositivos',
          body: 'De volta à aba Mobile: todos os dispositivos conectados mostram tempo de conexão, papel, perfil atribuído e última atividade — incluindo um botão de expulsar.',
          details: 'O cartão do dispositivo mostra:\n• Há quanto tempo está conectado ("há 12 min")\n• O que o dispositivo está fazendo (microfone ativo, controle remoto…)\n• O perfil reivindicado — um menu suspenso atribui outro\n• Expulsar: desconecta o dispositivo (ele reconecta na hora)\n\nDica: dê nomes fáceis de reconhecer aos perfis — a lista continua legível mesmo com muitos convidados.',
        },
        profileClaim: {
          title: 'Reivindicação de perfil',
          body: 'Cada dispositivo pode reivindicar um perfil: o convidado canta assim com o próprio nome e o próprio XP — a tela de perfis mostra a reivindicação com o distintivo 📱.',
          details: 'Caminhos para reivindicar:\n1. Escaneie o QR do perfil nas configurações dele (o mais direto)\n2. No app, depois de conectar, escolha da lista\n3. Aqui na lista de dispositivos, pelo menu suspenso\n\nDetalhes também no tour de perfis.',
        },
        microphoneFallback: {
          title: 'Celular no lugar dos microfones',
          body: 'Quando todo mundo canta pelo celular, você pode pular a aba Microfone por completo — o app regula a sensibilidade sozinho. Microfones físicos se configuram na aba Microfone, como mostrado.',
        },
        finish: {
          title: 'Conectado! 🔗',
          body: 'Agora você sabe como os celulares se conectam e do que são capazes.\n\nPróximo passo: abra a URL no seu próprio celular e faça um primeiro teste — o modo microfone é o mais impressionante.',
        },
      },
    },

    // ═══ Tour de conquistas (R29) ═══
    achievements: {
      title: 'Conquistas e Progresso',
      desc: 'Conquistas, níveis de XP, raridades e desafios diários.',
      chapters: {
        overview: 'Visão geral',
        unlock: 'Desbloqueando conquistas',
        daily: 'Desafios Diários',
      },
      steps: {
        welcome: {
          title: 'Conquistas e progresso 🏆',
          body: 'Tudo o que você acumula: conquistas com raridades, níveis de XP com títulos de rank e os desafios diários como motor de XP.\n\nEste tour percorre a tela de conquistas e os desafios.',
          details: 'Os três sistemas juntos:\n• XP: o "combustível" — de músicas, desafios e conquistas\n• Níveis e ranks: sobem com o XP (Iniciante → Divino) e mostram o progresso num relance\n• Conquistas: marcos com recompensas — algumas secretas até você desbloquear\n\nTudo depende do perfil — quem canta, acumula (veja o tour de perfis).',
        },
        navButton: {
          title: 'O botão de conquistas',
          body: 'Na barra de menu, o primeiro troféu leva aos rankings (pontuações) — o segundo troféu ao lado abre as conquistas.',
        },
        playerSelector: {
          title: 'Seleção de jogador',
          body: 'Aqui em cima você escolhe de quem ver as conquistas — ótimo para exibir a coleção. O número no perfil mostra as dele já desbloqueadas.',
        },
        stats: {
          title: 'Os cartões de estatísticas',
          body: 'Quatro cartões num relance: conquistas desbloqueadas, XP acumulado com elas, completude em percentual e o nível atual com nome de rank.',
          details: 'O cartão de percentual calcula: desbloqueadas ÷ total de conquistas. 100% é a meta do colecionador — normalmente premiada com uma conquista secreta própria.\n\nO cartão de nível ainda mostra o nome de rank ("Novato", "Lenda", "Divino"…) — os nomes vêm do sistema de progressão do perfil.',
        },
        filters: {
          title: 'Filtros',
          body: 'À esquerda, os filtros de status (todas / desbloqueadas / bloqueadas). À direita, as categorias: desempenho, progressão, social e especiais.',
          details: 'O que as categorias significam:\n• Desempenho: feitos de canto (combos, notas douradas, rodadas perfeitas)\n• Progressão: marcos de coleção (músicas tocadas, quantidades de XP, níveis)\n• Social: ações de festa e multijogador (duelos, rodadas via Companion)\n• Especiais: segredos e curiosidades — a descrição só se revela no desbloqueio\n\nCombináveis: "Bloqueadas + Especiais" mostra o que ainda te espera.',
        },
        grid: {
          title: 'Os cartões de conquistas',
          body: 'Cada cartão: ícone, nome, descrição, raridade e recompensa de XP. As desbloqueadas brilham em dourado com a data — as bloqueadas ficam cinza.',
          details: 'As raridades (codificadas por cor):\n• Comum — vem naturalmente jogando com regularidade\n• Rara — exige ação deliberada\n• Épica — muito esforço ou coincidências felizes\n• Lendária — para poucos\n\nO desbloqueio acontece automaticamente quando a condição é cumprida — com notificação toast inclusa. O XP cai no perfil na hora.',
        },
        xpSystem: {
          title: 'Como o XP flui',
          body: 'O XP vem de três fontes: músicas cantadas (por dificuldade), desafios (diários/semanais) e conquistas. Os níveis desbloqueiam ranks — e alguns recursos, como distintivos de perfil.',
          details: 'As fontes de XP num relance:\n• Música concluída: XP base por dificuldade (fácil → especialista, crescente)\n• Espaço diário: 100–200 XP base, ×0,5–3 por dificuldade, mais bônus\n• Espaço semanal: 250–500 XP base, ×0,5–3 por dificuldade\n• Conquista: única por conquista (5–7500 XP dependendo da conquista)\n\nA barra de nível na tela de perfis mostra o caminho ao próximo nível; o rank sobe com o XP (Iniciante → Divino).',
        },
        navDaily: {
          title: 'Até os desafios',
          body: 'Os desafios diários têm uma tela própria — o botão de estrela na barra de menu leva lá. Estou navegando.',
        },
        playerSelection: {
          title: 'Passo 1: escolha os jogadores',
          body: 'Fluxo guiado: primeiro escolha quem joga — só então as tarefas aparecem. Vários jogadores são possíveis; as estatísticas pertencem ao primeiro.',
          details: 'Por que a seleção primeiro? Espaços e estatísticas são por perfil — sem um jogador escolhido, não haveria o que calcular.\n\nO cartão mostra todos os perfis ativos; a seleção é por clique. Depois se desdobram o passo 2 (tarefas) e o passo 3 (jogar).',
        },
        slots: {
          title: 'Passo 2: os 5 espaços',
          body: 'Cinco espaços de tarefas por dia, desbloqueando em sequência. Cada espaço mostra a tarefa, as dificuldades jogáveis e o valor em XP — dificuldades maiores multiplicam.',
          details: 'A mecânica dos espaços:\n• Os espaços 2–5 só abrem depois que o anterior é concluído — a corrente força variedade.\n• Cada tarefa é uma condição sobre a próxima música ("gênero rock", "pelo menos 80% de precisão"…) — a biblioteca filtra automaticamente as músicas compatíveis.\n• Escolha de dificuldade por espaço: até 3× de multiplicador de XP no Insano.\n\nÀ meia-noite caem cinco tarefas novas — a corrente recomeça.',
        },
        badges: {
          title: 'Distintivos e o semanal',
          body: 'Completar espaços rende distintivos diários (bronze/prata/ouro) com XP extra. A contraparte semanal roda 7 dias com recompensas gordas — mesma mecânica, pote maior.',
          details: 'As faixas de distintivo por dia:\n• Bronze: 1 espaço\n• Prata: 3 espaços\n• Ouro: os 5 espaços — mais o bônus de XP diário\n\nSemanal: 5 espaços em 7 dias, 250–500 XP base por espaço (× multiplicador de dificuldade), reset nas segundas. Jogar o diário E o semanal sobe de nível bem mais rápido que só músicas.',
        },
        challengeModes: {
          title: 'Modos de desafio',
          body: 'Além dos espaços existem modos de desafio livres com modificadores (ex.: "velocidade 1,5×", "letra oculta") — para regras personalizadas e XP extra além das tarefas diárias.',
          details: 'Os modos são de escolha livre: escolha um modo, os modificadores dele se aplicam automaticamente, e a recompensa de XP cresce com a dificuldade.\n\nConclusões desbloqueiam desafios seguintes em cadeia — quanto mais você joga, mais se abre.',
        },
        finish: {
          title: 'Hora de colecionar! 🏅',
          body: 'Agora você conhece conquistas, XP e desafios — os três motores do progresso.\n\nDica para começar: jogue hoje 2 espaços diários — o resto vem sozinho.',
        },
      },
    },
  },
};
