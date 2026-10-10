// QR-Fix-Skript: Ergänzt 25 fehlende Keys in 14 completion.ts + fixt desktopChat-Leaks + Platzhalter
// Idempotent: prüft vor jedem Fix, ob er bereits angewendet wurde.
import { readFileSync, writeFileSync } from 'fs';

const base = '/home/z/my-project/src/lib/i18n/locales';

// ─── Übersetzungen pro Sprache ───
const t: Record<string, {
  cptmWaiting: string; pdfPages: string;
  pitch: string; noPitch: string;
  mic: Record<string, string>; // mobileMicView
  chat: { title: string; notificationNew: string; openChat: string; closeChat: string };
}> = {
  es: {
    cptmWaiting: 'Esperando…', pdfPages: 'Páginas del PDF',
    pitch: 'Tono: {n} Hz', noPitch: 'No se detecta tono',
    mic: {
      permissionDenied: 'Acceso al micrófono bloqueado',
      permissionDesc: 'Se denegó el permiso del micrófono. Actívalo en la configuración del navegador para poder cantar.',
      howToAllow: 'Cómo permitir el acceso al micrófono:',
      step1: 'Abre la configuración del navegador (normalmente el icono 🔒/ⓘ junto a la barra de direcciones).',
      step2: 'Busca la sección de micrófono/permisos.',
      step3: 'Cambia el micrófono a "Permitir" y recarga la página.',
      moreHelp: 'Más ayuda',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Ajustes → Safari (o Chrome) → Micrófono → permitir para este sitio web.',
      android: 'Android (Chrome):',
      androidSteps: 'Ajustes → Aplicaciones → Chrome → Permisos → Micrófono → permitir.',
      desktop: 'Navegador de escritorio:',
      desktopSteps: 'Haz clic en el icono 🔒/ⓘ de la barra de direcciones → Micrófono → Permitir y recarga.',
      tapToRetry: 'Reintentar',
      adPlaying: 'Anuncio en reproducción',
      gamePaused: 'El juego está en pausa durante el anuncio.',
      skipAd: 'Saltar anuncio',
      volumeLevel: 'Nivel de volumen',
      currentPitch: 'Tono actual',
      tapToStop: 'Toca para detener el micrófono',
      tapToSing: '¡Toca para cantar! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Nuevo mensaje de {name}', openChat: 'Abrir chat', closeChat: 'Cerrar chat' },
  },
  fr: {
    cptmWaiting: 'En attente…', pdfPages: 'Pages du PDF',
    pitch: 'Hauteur : {n} Hz', noPitch: 'Aucune hauteur détectée',
    mic: {
      permissionDenied: 'Accès au micro bloqué',
      permissionDesc: "L'autorisation du micro a été refusée. Active-la dans les réglages du navigateur pour chanter.",
      howToAllow: "Comment autoriser l'accès au micro :",
      step1: "Ouvre les réglages du navigateur (généralement l'icône 🔒/ⓘ à côté de la barre d'adresse).",
      step2: 'Trouve la section micro/autorisations.',
      step3: 'Règle le micro sur « Autoriser » et recharge la page.',
      moreHelp: "Plus d'aide",
      iOS: 'iPhone/iPad (Safari/Chrome) :',
      iOSSteps: 'Réglages → Safari (ou Chrome) → Micro → autoriser pour ce site.',
      android: 'Android (Chrome) :',
      androidSteps: 'Réglages → Applications → Chrome → Autorisations → Micro → autoriser.',
      desktop: 'Navigateur sur ordinateur :',
      desktopSteps: "Clique sur l'icône 🔒/ⓘ dans la barre d'adresse → Micro → Autoriser, puis recharge.",
      tapToRetry: 'Réessayer',
      adPlaying: 'Publicité en cours',
      gamePaused: 'Le jeu est en pause pendant la publicité.',
      skipAd: 'Passer la publicité',
      volumeLevel: 'Niveau sonore',
      currentPitch: 'Hauteur actuelle',
      tapToStop: 'Appuie pour arrêter le micro',
      tapToSing: 'Appuie pour chanter ! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Nouveau message de {name}', openChat: 'Ouvrir le chat', closeChat: 'Fermer le chat' },
  },
  it: {
    cptmWaiting: 'In attesa…', pdfPages: 'Pagine del PDF',
    pitch: 'Tono: {n} Hz', noPitch: 'Nessun tono rilevato',
    mic: {
      permissionDenied: 'Accesso al microfono bloccato',
      permissionDesc: "L'autorizzazione del microfono è stata negata. Attivala nelle impostazioni del browser per cantare.",
      howToAllow: "Come consentire l'accesso al microfono:",
      step1: "Apri le impostazioni del browser (di solito l'icona 🔒/ⓘ accanto alla barra degli indirizzi).",
      step2: 'Trova la sezione microfono/permessi.',
      step3: 'Imposta il microfono su "Consenti" e ricarica la pagina.',
      moreHelp: 'Altro aiuto',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Impostazioni → Safari (o Chrome) → Microfono → consenti per questo sito.',
      android: 'Android (Chrome):',
      androidSteps: 'Impostazioni → App → Chrome → Autorizzazioni → Microfono → consenti.',
      desktop: 'Browser desktop:',
      desktopSteps: "Clicca sull'icona 🔒/ⓘ nella barra degli indirizzi → Microfono → Consenti, poi ricarica.",
      tapToRetry: 'Riprova',
      adPlaying: 'Pubblicità in riproduzione',
      gamePaused: 'Il gioco è in pausa durante la pubblicità.',
      skipAd: 'Salta pubblicità',
      volumeLevel: 'Livello del volume',
      currentPitch: 'Tono attuale',
      tapToStop: 'Tocca per fermare il microfono',
      tapToSing: 'Tocca per cantare! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Nuovo messaggio da {name}', openChat: 'Apri la chat', closeChat: 'Chiudi la chat' },
  },
  pt: {
    cptmWaiting: 'À espera…', pdfPages: 'Páginas do PDF',
    pitch: 'Tom: {n} Hz', noPitch: 'Nenhum tom detetado',
    mic: {
      permissionDenied: 'Acesso ao microfone bloqueado',
      permissionDesc: 'A permissão do microfone foi negada. Ativa-a nas definições do navegador para poder cantar.',
      howToAllow: 'Como permitir o acesso ao microfone:',
      step1: 'Abre as definições do navegador (normalmente o ícone 🔒/ⓘ junto à barra de endereço).',
      step2: 'Procura a secção de microfone/permissões.',
      step3: 'Define o microfone como "Permitir" e recarrega a página.',
      moreHelp: 'Mais ajuda',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Ajustes → Safari (ou Chrome) → Microfone → permitir para este site.',
      android: 'Android (Chrome):',
      androidSteps: 'Definições → Aplicações → Chrome → Permissões → Microfone → permitir.',
      desktop: 'Navegador de computador:',
      desktopSteps: 'Clica no ícone 🔒/ⓘ na barra de endereço → Microfone → Permitir e recarrega.',
      tapToRetry: 'Tentar novamente',
      adPlaying: 'Anúncio em reprodução',
      gamePaused: 'O jogo está em pausa durante o anúncio.',
      skipAd: 'Ignorar anúncio',
      volumeLevel: 'Nível de volume',
      currentPitch: 'Tom atual',
      tapToStop: 'Toca para parar o microfone',
      tapToSing: 'Toca para cantar! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Nova mensagem de {name}', openChat: 'Abrir chat', closeChat: 'Fechar chat' },
  },
  ja: {
    cptmWaiting: '待機中…', pdfPages: 'PDFページ',
    pitch: '音程: {n} Hz', noPitch: '音程を検出できません',
    mic: {
      permissionDenied: 'マイクアクセスがブロックされました',
      permissionDesc: 'マイクの権限が拒否されました。歌うにはブラウザの設定で許可してください。',
      howToAllow: 'マイクアクセスを許可する方法：',
      step1: 'ブラウザの設定を開きます（通常はアドレスバー横の 🔒/ⓘ アイコン）。',
      step2: 'マイク／権限のセクションを見つけます。',
      step3: 'マイクを「許可」にしてページを再読み込みします。',
      moreHelp: 'さらにヘルプ',
      iOS: 'iPhone/iPad（Safari/Chrome）：',
      iOSSteps: '設定アプリ → Safari（または Chrome）→ マイク → このサイトを許可。',
      android: 'Android（Chrome）：',
      androidSteps: '設定 → アプリ → Chrome → 権限 → マイク → 許可。',
      desktop: 'デスクトップブラウザ：',
      desktopSteps: 'アドレスバーの 🔒/ⓘ アイコンをクリック → マイク → 許可、その後再読み込み。',
      tapToRetry: '再試行',
      adPlaying: '広告再生中',
      gamePaused: '広告の間、ゲームは一時停止中です。',
      skipAd: '広告をスキップ',
      volumeLevel: '音量レベル',
      currentPitch: '現在の音程',
      tapToStop: 'タップしてマイクを停止',
      tapToSing: 'タップして歌おう！🎤',
    },
    chat: { title: 'チャット', notificationNew: '{name}からの新着メッセージ', openChat: 'チャットを開く', closeChat: 'チャットを閉じる' },
  },
  ko: {
    cptmWaiting: '대기 중…', pdfPages: 'PDF 페이지',
    pitch: '음정: {n} Hz', noPitch: '음정이 감지되지 않음',
    mic: {
      permissionDenied: '마이크 접근이 차단되었습니다',
      permissionDesc: '마이크 권한이 거부되었습니다. 노래하려면 브라우저 설정에서 허용해 주세요.',
      howToAllow: '마이크 접근을 허용하는 방법:',
      step1: '브라우저 설정을 엽니다 (보통 주소창 옆의 🔒/ⓘ 아이콘).',
      step2: '마이크/권한 섹션을 찾습니다.',
      step3: '마이크를 "허용"으로 설정하고 페이지를 새로고침합니다.',
      moreHelp: '더 많은 도움말',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: '설정 앱 → Safari(또는 Chrome) → 마이크 → 이 웹사이트 허용.',
      android: 'Android (Chrome):',
      androidSteps: '설정 → 앱 → Chrome → 권한 → 마이크 → 허용.',
      desktop: '데스크톱 브라우저:',
      desktopSteps: '주소창의 🔒/ⓘ 아이콘 클릭 → 마이크 → 허용, 그런 다음 새로고침.',
      tapToRetry: '다시 시도',
      adPlaying: '광고 재생 중',
      gamePaused: '광고가 재생되는 동안 게임이 일시 중지되었습니다.',
      skipAd: '광고 건너뛰기',
      volumeLevel: '볼륨 수준',
      currentPitch: '현재 음정',
      tapToStop: '탭하여 마이크 중지',
      tapToSing: '탭하여 노래하세요! 🎤',
    },
    chat: { title: '채팅', notificationNew: '{name}님의 새 메시지', openChat: '채팅 열기', closeChat: '채팅 닫기' },
  },
  zh: {
    cptmWaiting: '等待中…', pdfPages: 'PDF 页面',
    pitch: '音高：{n} Hz', noPitch: '未检测到音高',
    mic: {
      permissionDenied: '麦克风访问被阻止',
      permissionDesc: '麦克风权限被拒绝。请在浏览器设置中启用才能演唱。',
      howToAllow: '如何允许麦克风访问：',
      step1: '打开浏览器设置（通常是地址栏旁边的 🔒/ⓘ 图标）。',
      step2: '找到麦克风/权限部分。',
      step3: '将麦克风设为“允许”并重新加载页面。',
      moreHelp: '更多帮助',
      iOS: 'iPhone/iPad（Safari/Chrome）：',
      iOSSteps: '设置 App → Safari（或 Chrome）→ 麦克风 → 允许此网站。',
      android: 'Android（Chrome）：',
      androidSteps: '设置 → 应用 → Chrome → 权限 → 麦克风 → 允许。',
      desktop: '桌面浏览器：',
      desktopSteps: '点击地址栏中的 🔒/ⓘ 图标 → 麦克风 → 允许，然后重新加载。',
      tapToRetry: '重试',
      adPlaying: '广告播放中',
      gamePaused: '广告播放期间游戏已暂停。',
      skipAd: '跳过广告',
      volumeLevel: '音量级别',
      currentPitch: '当前音高',
      tapToStop: '点按停止麦克风',
      tapToSing: '点按开始演唱！🎤',
    },
    chat: { title: '聊天', notificationNew: '来自{name}的新消息', openChat: '打开聊天', closeChat: '关闭聊天' },
  },
  ru: {
    cptmWaiting: 'Ожидание…', pdfPages: 'Страницы PDF',
    pitch: 'Высота тона: {n} Гц', noPitch: 'Высота тона не определяется',
    mic: {
      permissionDenied: 'Доступ к микрофону заблокирован',
      permissionDesc: 'Разрешение на микрофон отклонено. Включите его в настройках браузера, чтобы петь.',
      howToAllow: 'Как разрешить доступ к микрофону:',
      step1: 'Откройте настройки браузера (обычно значок 🔒/ⓘ рядом с адресной строкой).',
      step2: 'Найдите раздел микрофон/разрешения.',
      step3: 'Установите для микрофона значение «Разрешить» и перезагрузите страницу.',
      moreHelp: 'Дополнительная помощь',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Приложение «Настройки» → Safari (или Chrome) → Микрофон → разрешить для этого сайта.',
      android: 'Android (Chrome):',
      androidSteps: 'Настройки → Приложения → Chrome → Разрешения → Микрофон → разрешить.',
      desktop: 'Браузер на компьютере:',
      desktopSteps: 'Нажмите значок 🔒/ⓘ в адресной строке → Микрофон → Разрешить, затем перезагрузите.',
      tapToRetry: 'Повторить',
      adPlaying: 'Реклама воспроизводится',
      gamePaused: 'Игра приостановлена на время рекламы.',
      skipAd: 'Пропустить рекламу',
      volumeLevel: 'Уровень громкости',
      currentPitch: 'Текущая высота тона',
      tapToStop: 'Нажмите, чтобы остановить микрофон',
      tapToSing: 'Нажмите, чтобы петь! 🎤',
    },
    chat: { title: 'Чат', notificationNew: 'Новое сообщение от {name}', openChat: 'Открыть чат', closeChat: 'Закрыть чат' },
  },
  nl: {
    cptmWaiting: 'Wachten…', pdfPages: "PDF-pagina's",
    pitch: 'Toonhoogte: {n} Hz', noPitch: 'Geen toonhoogte gedetecteerd',
    mic: {
      permissionDenied: 'Microfoontoegang geblokkeerd',
      permissionDesc: 'De microfoontoestemming is geweigerd. Schakel deze in de browserinstellingen in om te zingen.',
      howToAllow: 'Zo sta je microfoontoegang toe:',
      step1: 'Open de browserinstellingen (meestal het 🔒/ⓘ-pictogram naast de adresbalk).',
      step2: 'Zoek de sectie microfoon/rechten.',
      step3: 'Zet de microfoon op "Toestaan" en laad de pagina opnieuw.',
      moreHelp: 'Meer hulp',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Instellingen-app → Safari (of Chrome) → Microfoon → toestaan voor deze website.',
      android: 'Android (Chrome):',
      androidSteps: 'Instellingen → Apps → Chrome → Rechten → Microfoon → toestaan.',
      desktop: 'Desktopbrowser:',
      desktopSteps: 'Klik op het 🔒/ⓘ-pictogram in de adresbalk → Microfoon → Toestaan en laad opnieuw.',
      tapToRetry: 'Opnieuw proberen',
      adPlaying: 'Advertentie wordt afgespeeld',
      gamePaused: 'Het spel is gepauzeerd tijdens de advertentie.',
      skipAd: 'Advertentie overslaan',
      volumeLevel: 'Volumeniveau',
      currentPitch: 'Huidige toonhoogte',
      tapToStop: 'Tik om de microfoon te stoppen',
      tapToSing: 'Tik om te zingen! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Nieuw bericht van {name}', openChat: 'Chat openen', closeChat: 'Chat sluiten' },
  },
  pl: {
    cptmWaiting: 'Oczekiwanie…', pdfPages: 'Strony PDF',
    pitch: 'Wysokość dźwięku: {n} Hz', noPitch: 'Nie wykryto wysokości dźwięku',
    mic: {
      permissionDenied: 'Dostęp do mikrofonu zablokowany',
      permissionDesc: 'Uprawnienie do mikrofonu zostało odrzucone. Włącz je w ustawieniach przeglądarki, aby śpiewać.',
      howToAllow: 'Jak zezwolić na dostęp do mikrofonu:',
      step1: 'Otwórz ustawienia przeglądarki (zwykle ikona 🔒/ⓘ obok paska adresu).',
      step2: 'Znajdź sekcję mikrofon/uprawnienia.',
      step3: 'Ustaw mikrofon na „Zezwalaj” i odśwież stronę.',
      moreHelp: 'Więcej pomocy',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Aplikacja Ustawienia → Safari (lub Chrome) → Mikrofon → zezwól dla tej witryny.',
      android: 'Android (Chrome):',
      androidSteps: 'Ustawienia → Aplikacje → Chrome → Uprawnienia → Mikrofon → zezwalaj.',
      desktop: 'Przeglądarka na komputerze:',
      desktopSteps: 'Kliknij ikonę 🔒/ⓘ na pasku adresu → Mikrofon → Zezwalaj, a następnie odśwież.',
      tapToRetry: 'Spróbuj ponownie',
      adPlaying: 'Odtwarzanie reklamy',
      gamePaused: 'Gra jest wstrzymana podczas reklamy.',
      skipAd: 'Pomiń reklamę',
      volumeLevel: 'Poziom głośności',
      currentPitch: 'Bieżąca wysokość dźwięku',
      tapToStop: 'Dotknij, aby zatrzymać mikrofon',
      tapToSing: 'Dotknij, aby śpiewać! 🎤',
    },
    chat: { title: 'Czat', notificationNew: 'Nowa wiadomość od {name}', openChat: 'Otwórz czat', closeChat: 'Zamknij czat' },
  },
  sv: {
    cptmWaiting: 'Väntar…', pdfPages: 'PDF-sidor',
    pitch: 'Tonhöjd: {n} Hz', noPitch: 'Ingen tonhöjd upptäckt',
    mic: {
      permissionDenied: 'Mikrofonåtkomst blockerad',
      permissionDesc: 'Mikrofonbehörigheten nekades. Aktivera den i webbläsarens inställningar för att kunna sjunga.',
      howToAllow: 'Så tillåter du mikrofonåtkomst:',
      step1: 'Öppna webbläsarens inställningar (oftast ikonen 🔒/ⓘ bredvid adressfältet).',
      step2: 'Hitta avsnittet mikrofon/behörigheter.',
      step3: 'Ställ in mikrofonen på "Tillåt" och ladda om sidan.',
      moreHelp: 'Mer hjälp',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Inställningar → Safari (eller Chrome) → Mikrofon → tillåt för denna webbplats.',
      android: 'Android (Chrome):',
      androidSteps: 'Inställningar → Appar → Chrome → Behörigheter → Mikrofon → tillåt.',
      desktop: 'Webbläsare på datorn:',
      desktopSteps: 'Klicka på ikonen 🔒/ⓘ i adressfältet → Mikrofon → Tillåt och ladda om.',
      tapToRetry: 'Försök igen',
      adPlaying: 'Reklam spelas',
      gamePaused: 'Spelet är pausat under reklamen.',
      skipAd: 'Hoppa över reklam',
      volumeLevel: 'Volymnivå',
      currentPitch: 'Nuvarande tonhöjd',
      tapToStop: 'Tryck för att stoppa mikrofonen',
      tapToSing: 'Tryck för att sjunga! 🎤',
    },
    chat: { title: 'Chatt', notificationNew: 'Nytt meddelande från {name}', openChat: 'Öppna chatten', closeChat: 'Stäng chatten' },
  },
  no: {
    cptmWaiting: 'Venter…', pdfPages: 'PDF-sider',
    pitch: 'Tonehøyde: {n} Hz', noPitch: 'Ingen tonehøyde oppdaget',
    mic: {
      permissionDenied: 'Mikrofontilgang blokkert',
      permissionDesc: 'Mikrofontillatelsen ble avslått. Aktiver den i nettleserinnstillingene for å synge.',
      howToAllow: 'Slik tillater du mikrofontilgang:',
      step1: 'Åpne nettleserinnstillingene (vanligvis 🔒/ⓘ-ikonet ved siden av adresselinjen).',
      step2: 'Finn delen for mikrofon/tillatelser.',
      step3: 'Sett mikrofonen til «Tillat» og last siden på nytt.',
      moreHelp: 'Mer hjelp',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Innstillinger-appen → Safari (eller Chrome) → Mikrofon → tillat for dette nettstedet.',
      android: 'Android (Chrome):',
      androidSteps: 'Innstillinger → Apper → Chrome → Tillatelser → Mikrofon → tillat.',
      desktop: 'Nettleser på datamaskinen:',
      desktopSteps: 'Klikk på 🔒/ⓘ-ikonet i adresselinjen → Mikrofon → Tillat, og last inn på nytt.',
      tapToRetry: 'Prøv igjen',
      adPlaying: 'Reklame spilles',
      gamePaused: 'Spillet er satt på pause under reklamen.',
      skipAd: 'Hopp over reklame',
      volumeLevel: 'Volumnivå',
      currentPitch: 'Nåværende tonehøyde',
      tapToStop: 'Trykk for å stoppe mikrofonen',
      tapToSing: 'Trykk for å synge! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Ny melding fra {name}', openChat: 'Åpne chatten', closeChat: 'Lukk chatten' },
  },
  da: {
    cptmWaiting: 'Venter…', pdfPages: 'PDF-sider',
    pitch: 'Tonehøjde: {n} Hz', noPitch: 'Ingen tonehøjde registreret',
    mic: {
      permissionDenied: 'Mikrofonadgang blokeret',
      permissionDesc: 'Mikrofontilladelsen blev afvist. Aktivér den i browserindstillingerne for at synge.',
      howToAllow: 'Sådan tillader du mikrofonadgang:',
      step1: 'Åbn browserindstillingerne (normalt 🔒/ⓘ-ikonet ved siden af adresselinjen).',
      step2: 'Find sektionen mikrofon/tilladelser.',
      step3: 'Indstil mikrofonen til "Tillad" og genindlæs siden.',
      moreHelp: 'Mere hjælp',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Indstillings-appen → Safari (eller Chrome) → Mikrofon → tillad for dette websted.',
      android: 'Android (Chrome):',
      androidSteps: 'Indstillinger → Apps → Chrome → Tilladelser → Mikrofon → tillad.',
      desktop: 'Browser på computeren:',
      desktopSteps: 'Klik på 🔒/ⓘ-ikonet i adresselinjen → Mikrofon → Tillad, og genindlæs.',
      tapToRetry: 'Prøv igen',
      adPlaying: 'Reklame afspilles',
      gamePaused: 'Spillet er sat på pause under reklamen.',
      skipAd: 'Spring reklamen over',
      volumeLevel: 'Lydstyrkeniveau',
      currentPitch: 'Nuværende tonehøjde',
      tapToStop: 'Tryk for at stoppe mikrofonen',
      tapToSing: 'Tryk for at synge! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Ny besked fra {name}', openChat: 'Åbn chatten', closeChat: 'Luk chatten' },
  },
  fi: {
    cptmWaiting: 'Odotetaan…', pdfPages: 'PDF-sivut',
    pitch: 'Sävelkorkeus: {n} Hz', noPitch: 'Sävelkorkeutta ei havaittu',
    mic: {
      permissionDenied: 'Mikrofonin käyttö estetty',
      permissionDesc: 'Mikrofonin käyttöoikeus evättiin. Ota se käyttöön selaimen asetuksissa laulaaksesi.',
      howToAllow: 'Näin sallit mikrofonin käytön:',
      step1: 'Avaa selaimen asetukset (yleensä 🔒/ⓘ-kuvake osoitepalkin vieressä).',
      step2: 'Etsi mikrofoni/käyttöoikeudet-osio.',
      step3: 'Aseta mikrofoni asentoon "Salli" ja lataa sivu uudelleen.',
      moreHelp: 'Lisää apua',
      iOS: 'iPhone/iPad (Safari/Chrome):',
      iOSSteps: 'Asetukset-sovellus → Safari (tai Chrome) → Mikrofoni → salli tälle sivustolle.',
      android: 'Android (Chrome):',
      androidSteps: 'Asetukset → Sovellukset → Chrome → Käyttöoikeudet → Mikrofoni → salli.',
      desktop: 'Tietokoneen selain:',
      desktopSteps: 'Napsauta osoitepalkin 🔒/ⓘ-kuvaketta → Mikrofoni → Salli ja lataa uudelleen.',
      tapToRetry: 'Yritä uudelleen',
      adPlaying: 'Mainos toistetaan',
      gamePaused: 'Peli on tauolla mainoksen aikana.',
      skipAd: 'Ohita mainos',
      volumeLevel: 'Äänenvoimakkuustaso',
      currentPitch: 'Nykyinen sävelkorkeus',
      tapToStop: 'Napauta lopettaaksesi mikrofonin',
      tapToSing: 'Napauta laulaaksesi! 🎤',
    },
    chat: { title: 'Chat', notificationNew: 'Uusi viesti käyttäjältä {name}', openChat: 'Avaa chat', closeChat: 'Sulje chat' },
  },
};

// QR-5b: tournament.accuracy — {n} entfernen (Code setzt die Zahl selbst davor)
const accuracyFix: Record<string, string> = {
  es: 'Precisión', fr: 'Précision', zh: '准确率', ru: 'Точность', nl: 'Nauwkeurigheid',
  pl: 'Celność', sv: 'Noggrannhet', no: 'Presisjon', da: 'Præcision', fi: 'Tarkkuus',
};
// QR-5b: partyStarting.startPlayerHint — {name} ergänzen
const startPlayerHintFix: Record<string, string> = {
  es: '{name} canta primero — ¡prepárate!',
  fr: '{name} chante en premier — prépare-toi !',
  it: '{name} canta per primo — preparati!',
  pt: '{name} canta primeiro — prepara-te!',
  zh: '{name} 先唱 — 准备好！',
  ru: '{name} поёт первым — приготовьтесь!',
  nl: '{name} zingt eerst — maak je klaar!',
  pl: 'Pierwszy śpiewa {name} — przygotuj się!',
  sv: '{name} sjunger först — gör dig redo!',
  no: '{name} synger først — gjør deg klar!',
  da: '{name} synger først — gør dig klar!',
  fi: '{name} laulaa ensin — valmistaudu!',
};
// QR-5b: companion.controlLocked — {name} ergänzen (EN: 'Control: {name}')
const controlLockedFix: Record<string, string> = {
  es: 'Control: {name}', fr: 'Contrôle : {name}', it: 'Controllo: {name}', pt: 'Controle: {name}',
  zh: '控制：{name}', ru: 'Управление: {name}', nl: 'Bediening: {name}', pl: 'Kontrola: {name}',
  sv: 'Kontroll: {name}', no: 'Kontroll: {name}', da: 'Kontrol: {name}', fi: 'Ohjaus: {name}',
};

const langs = Object.keys(t);
let fixes = 0;
const problems: string[] = [];

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

for (const lang of langs) {
  const data = t[lang];

  // ── 1) completion.ts: 25 Keys anhängen (vor dem finalen `};`) ──
  const compPath = `${base}/${lang}/completion.ts`;
  let comp = readFileSync(compPath, 'utf8');
  if (!comp.includes('mobileMicView')) {
    const block = `
  // ══ QR-Runde: zuvor fehlende Keys (mobileMicView, pitchGraph, cptmWaiting, pdfPages) ══
  mobile: {
    cptmWaiting: '${esc(data.cptmWaiting)}',
  },
  editor: {
    midiImport: {
      sheetMusic: {
        pdfPages: '${esc(data.pdfPages)}',
      },
    },
  },
  pitchGraph: {
    pitch: '${esc(data.pitch)}',
    noPitch: '${esc(data.noPitch)}',
  },
  mobileMicView: {
    permissionDenied: '${esc(data.mic.permissionDenied)}',
    permissionDesc: '${esc(data.mic.permissionDesc)}',
    howToAllow: '${esc(data.mic.howToAllow)}',
    step1: '${esc(data.mic.step1)}',
    step2: '${esc(data.mic.step2)}',
    step3: '${esc(data.mic.step3)}',
    moreHelp: '${esc(data.mic.moreHelp)}',
    iOS: '${esc(data.mic.iOS)}',
    iOSSteps: '${esc(data.mic.iOSSteps)}',
    android: '${esc(data.mic.android)}',
    androidSteps: '${esc(data.mic.androidSteps)}',
    desktop: '${esc(data.mic.desktop)}',
    desktopSteps: '${esc(data.mic.desktopSteps)}',
    tapToRetry: '${esc(data.mic.tapToRetry)}',
    adPlaying: '${esc(data.mic.adPlaying)}',
    gamePaused: '${esc(data.mic.gamePaused)}',
    skipAd: '${esc(data.mic.skipAd)}',
    volumeLevel: '${esc(data.mic.volumeLevel)}',
    currentPitch: '${esc(data.mic.currentPitch)}',
    tapToStop: '${esc(data.mic.tapToStop)}',
    tapToSing: '${esc(data.mic.tapToSing)}',
  },
};`;
    // letztes `};` ersetzen (Datei-Ende)
    const lastIdx = comp.lastIndexOf('};');
    if (lastIdx === -1) { problems.push(`${lang}: kein }; in completion.ts`); continue; }
    comp = comp.slice(0, lastIdx) + block + comp.slice(lastIdx + 2);
    writeFileSync(compPath, comp);
    fixes++;
  }

  // ── 2) core.ts: desktopChat-German-Leaks ersetzen ──
  const corePath = `${base}/${lang}/core.ts`;
  let core = readFileSync(corePath, 'utf8');
  if (core.includes("openChat: 'Chat öffnen'")) {
    const before = core;
    core = core
      .replace(/title: 'Companion-Chat',/, `title: '${esc(data.chat.title)}',`)
      .replace(/notificationNew: 'Neue Nachricht von \{name\}',/, `notificationNew: '${esc(data.chat.notificationNew)}',`)
      .replace(/openChat: 'Chat öffnen',/, `openChat: '${esc(data.chat.openChat)}',`)
      .replace(/closeChat: 'Chat schließen',/, `closeChat: '${esc(data.chat.closeChat)}',`);
    if (core === before) { problems.push(`${lang}: desktopChat-Ersetzung fehlgeschlagen`); continue; }
    writeFileSync(corePath, core);
    fixes++;
  }

  // ── 3) medleyTournament.ts: tournament.accuracy {n} entfernen ──
  if (accuracyFix[lang]) {
    const mtPath = `${base}/${lang}/medleyTournament.ts`;
    let mt = readFileSync(mtPath, 'utf8');
    // Zeile mit `accuracy: '...: {n}%'` → ohne Suffix (nur die mit {n})
    const re = /accuracy: '([^']*\{n\}%?)',/;
    if (re.test(mt)) {
      mt = mt.replace(re, `accuracy: '${esc(accuracyFix[lang])}',`);
      writeFileSync(mtPath, mt);
      fixes++;
    }
  }

  // ── 4) party.ts: startPlayerHint {name} ergänzen ──
  if (startPlayerHintFix[lang]) {
    const pPath = `${base}/${lang}/party.ts`;
    let pt = readFileSync(pPath, 'utf8');
    const re = /startPlayerHint: '(?![^']*\{name\})[^']*',/;
    if (re.test(pt)) {
      pt = pt.replace(re, `startPlayerHint: '${esc(startPlayerHintFix[lang])}',`);
      writeFileSync(pPath, pt);
      fixes++;
    }
  }

  // ── 5) party.ts: competitiveWords.bestOf zh (doppeltes {n}) ──
  if (lang === 'zh') {
    const pPath = `${base}/zh/party.ts`;
    let pt = readFileSync(pPath, 'utf8');
    if (pt.includes("bestOf: '{n}局{n}胜'")) {
      pt = pt.replace("bestOf: '{n}局{n}胜'", "bestOf: 'BO{n}'");
      writeFileSync(pPath, pt);
      fixes++;
    }
  }

  // ── 6) mobile.ts: companion.controlLocked {name} ergänzen ──
  if (controlLockedFix[lang]) {
    const mPath = `${base}/${lang}/mobile.ts`;
    let mt = readFileSync(mPath, 'utf8');
    // Nur die companion-Instanz: die VOR `},\nremoteControl: {` steht (Sektionsende)
    const re = /controlLocked: '(?![^']*\{name\})[^']*',(,\n\},\nremoteControl: \{)/;
    if (re.test(mt)) {
      mt = mt.replace(re, `controlLocked: '${esc(controlLockedFix[lang])}',$1`);
      writeFileSync(mPath, mt);
      fixes++;
    } else {
      problems.push(`${lang}: companion.controlLocked-Muster nicht gefunden`);
    }
  }
}

console.log(`Angewendete Fixes: ${fixes}`);
if (problems.length) {
  console.log('PROBLEME:');
  problems.forEach((p) => console.log('  ' + p));
} else {
  console.log('Keine Probleme.');
}
