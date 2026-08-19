// Script to add desktopChat section to all locale mobile.ts files missing it
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../src/lib/i18n/locales');

const translations = {
  de: {
    title: 'Companion-Chat', host: 'Host', notificationNew: 'Neue Nachricht von {name}',
    openChat: 'Chat öffnen', closeChat: 'Schließen', placeholder: 'Nachricht eingeben...',
    send: 'Senden', noMessages: 'Noch keine Nachrichten', acceptChallenge: 'Annehmen',
    challengeDuel: 'Duell-Herausforderung', challengeDuet: 'Duett-Herausforderung', from: 'von',
    selectPlayer: 'Spieler wählen...', challengeAccepted: 'Herausforderung angenommen!', dismiss: 'Schließen',
  },
  da: {
    title: 'Companion-Chat', host: 'Vært', notificationNew: 'Ny besked fra {name}',
    openChat: 'Åbn chat', closeChat: 'Luk', placeholder: 'Skriv en besked...',
    send: 'Send', noMessages: 'Ingen beskeder endnu', acceptChallenge: 'Accepter',
    challengeDuel: 'Duel-udfordring', challengeDuet: 'Duet-udfordring', from: 'fra',
    selectPlayer: 'Vælg spiller...', challengeAccepted: 'Udfordring accepteret!', dismiss: 'Luk',
  },
  es: {
    title: 'Chat de Compañeros', host: 'Anfitrión', notificationNew: 'Nuevo mensaje de {name}',
    openChat: 'Abrir chat', closeChat: 'Cerrar', placeholder: 'Escribe un mensaje...',
    send: 'Enviar', noMessages: 'Aún no hay mensajes', acceptChallenge: 'Aceptar',
    challengeDuel: 'Desafío de duelo', challengeDuet: 'Desafío de dueto', from: 'de',
    selectPlayer: 'Seleccionar jugador...', challengeAccepted: '¡Desafío aceptado!', dismiss: 'Cerrar',
  },
  fi: {
    title: 'Companion-keskustelu', host: 'Isäntä', notificationNew: 'Uusi viesti käyttäjältä {name}',
    openChat: 'Avaa chat', closeChat: 'Sulje', placeholder: 'Kirjoita viesti...',
    send: 'Lähetä', noMessages: 'Ei vielä viestejä', acceptChallenge: 'Hyväksy',
    challengeDuel: 'Kaksintaisteluhaku', challengeDuet: 'Duettohaaste', from: 'käyttäjältä',
    selectPlayer: 'Valitse pelaaja...', challengeAccepted: 'Haaste hyväksytty!', dismiss: 'Sulje',
  },
  fr: {
    title: 'Chat Companion', host: 'Hôte', notificationNew: 'Nouveau message de {name}',
    openChat: 'Ouvrir le chat', closeChat: 'Fermer', placeholder: 'Tapez un message...',
    send: 'Envoyer', noMessages: 'Pas encore de messages', acceptChallenge: 'Accepter',
    challengeDuel: 'Défi en duel', challengeDuet: 'Défi en duo', from: 'de',
    selectPlayer: 'Choisir un joueur...', challengeAccepted: 'Défi accepté !', dismiss: 'Fermer',
  },
  it: {
    title: 'Chat Companion', host: 'Host', notificationNew: 'Nuovo messaggio da {name}',
    openChat: 'Apri chat', closeChat: 'Chiudi', placeholder: 'Scrivi un messaggio...',
    send: 'Invia', noMessages: 'Nessun messaggio', acceptChallenge: 'Accetta',
    challengeDuel: 'Sfida a duello', challengeDuet: 'Sfida a duetto', from: 'di',
    selectPlayer: 'Scegli giocatore...', challengeAccepted: 'Sfida accettata!', dismiss: 'Chiudi',
  },
  ja: {
    title: 'コンパニオンチャット', host: 'ホスト', notificationNew: '{name}からの新着メッセージ',
    openChat: 'チャットを開く', closeChat: '閉じる', placeholder: 'メッセージを入力...',
    send: '送信', noMessages: 'メッセージはまだありません', acceptChallenge: '承諾',
    challengeDuel: 'デュエルチャレンジ', challengeDuet: 'デュエットチャレンジ', from: 'から',
    selectPlayer: 'プレイヤーを選択...', challengeAccepted: 'チャレンジ承諾済み！', dismiss: '閉じる',
  },
  ko: {
    title: '컴패니언 채팅', host: '호스트', notificationNew: '{name}님의 새 메시지',
    openChat: '채팅 열기', closeChat: '닫기', placeholder: '메시지를 입력하세요...',
    send: '전송', noMessages: '아직 메시지가 없습니다', acceptChallenge: '수락',
    challengeDuel: '듀얼 챌린지', challengeDuet: '듀엣 챌린지', from: '에서',
    selectPlayer: '플레이어 선택...', challengeAccepted: '챌린지 수락됨!', dismiss: '닫기',
  },
  nl: {
    title: 'Companion Chat', host: 'Host', notificationNew: 'Nieuw bericht van {name}',
    openChat: 'Chat openen', closeChat: 'Sluiten', placeholder: 'Typ een bericht...',
    send: 'Versturen', noMessages: 'Nog geen berichten', acceptChallenge: 'Accepteren',
    challengeDuel: 'Duel-uitdaging', challengeDuet: 'Duet-uitdaging', from: 'van',
    selectPlayer: 'Selecteer speler...', challengeAccepted: 'Uitdaging geaccepteerd!', dismiss: 'Sluiten',
  },
  no: {
    title: 'Companion-chat', host: 'Vert', notificationNew: 'Ny melding fra {name}',
    openChat: 'Åpne chat', closeChat: 'Lukk', placeholder: 'Skriv en melding...',
    send: 'Send', noMessages: 'Ingen meldinger ennå', acceptChallenge: 'Aksepter',
    challengeDuel: 'Duel-utfordring', challengeDuet: 'Duet-utfordring', from: 'fra',
    selectPlayer: 'Velg spiller...', challengeAccepted: 'Utfordring akseptert!', dismiss: 'Lukk',
  },
  pl: {
    title: 'Czat Companion', host: 'Gospodarz', notificationNew: 'Nowa wiadomość od {name}',
    openChat: 'Otwórz czat', closeChat: 'Zamknij', placeholder: 'Wpisz wiadomość...',
    send: 'Wyślij', noMessages: 'Brak wiadomości', acceptChallenge: 'Akceptuj',
    challengeDuel: 'Pojedynek', challengeDuet: 'Duet', from: 'od',
    selectPlayer: 'Wybierz gracza...', challengeAccepted: 'Wyzwanie przyjęte!', dismiss: 'Zamknij',
  },
  pt: {
    title: 'Chat Companion', host: 'Anfitrião', notificationNew: 'Nova mensagem de {name}',
    openChat: 'Abrir chat', closeChat: 'Fechar', placeholder: 'Digite uma mensagem...',
    send: 'Enviar', noMessages: 'Nenhuma mensagem ainda', acceptChallenge: 'Aceitar',
    challengeDuel: 'Desafio de duelo', challengeDuet: 'Desafio de dueto', from: 'de',
    selectPlayer: 'Selecionar jogador...', challengeAccepted: 'Desafio aceito!', dismiss: 'Fechar',
  },
  ru: {
    title: 'Чат компаньона', host: 'Хост', notificationNew: 'Новое сообщение от {name}',
    openChat: 'Открыть чат', closeChat: 'Закрыть', placeholder: 'Введите сообщение...',
    send: 'Отправить', noMessages: 'Пока нет сообщений', acceptChallenge: 'Принять',
    challengeDuel: 'Вызов на дуэль', challengeDuet: 'Вызов на дуэт', from: 'от',
    selectPlayer: 'Выбрать игрока...', challengeAccepted: 'Вызов принят!', dismiss: 'Закрыть',
  },
  sv: {
    title: 'Companion-chatt', host: 'Värd', notificationNew: 'Nytt meddelande från {name}',
    openChat: 'Öppna chatt', closeChat: 'Stäng', placeholder: 'Skriv ett meddelande...',
    send: 'Skicka', noMessages: 'Inga meddelanden än', acceptChallenge: 'Acceptera',
    challengeDuel: 'Duell-utmaning', challengeDuet: 'Duett-utmaning', from: 'från',
    selectPlayer: 'Välj spelare...', challengeAccepted: 'Utmaning accepterad!', dismiss: 'Stäng',
  },
  zh: {
    title: '伴唱聊天', host: '主机', notificationNew: '{name} 的新消息',
    openChat: '打开聊天', closeChat: '关闭', placeholder: '输入消息...',
    send: '发送', noMessages: '暂无消息', acceptChallenge: '接受',
    challengeDuel: '对决挑战', challengeDuet: '二重唱挑战', from: '来自',
    selectPlayer: '选择玩家...', challengeAccepted: '已接受挑战！', dismiss: '关闭',
  },
};

function buildSection(tr) {
  return `  desktopChat: {
    title: '${tr.title}',
    host: '${tr.host}',
    notificationNew: '${tr.notificationNew}',
    openChat: '${tr.openChat}',
    closeChat: '${tr.closeChat}',
    placeholder: '${tr.placeholder}',
    send: '${tr.send}',
    noMessages: '${tr.noMessages}',
    acceptChallenge: '${tr.acceptChallenge}',
    challengeDuel: '${tr.challengeDuel}',
    challengeDuet: '${tr.challengeDuet}',
    from: '${tr.from}',
    selectPlayer: '${tr.selectPlayer}',
    challengeAccepted: '${tr.challengeAccepted}',
    dismiss: '${tr.dismiss}',
  },

`;
}

const localeDirs = ['da', 'de', 'es', 'fi', 'fr', 'it', 'ja', 'ko', 'nl', 'no', 'pl', 'pt', 'ru', 'sv', 'zh'];

for (const locale of localeDirs) {
  const filePath = join(localesDir, locale, 'mobile.ts');
  let content = readFileSync(filePath, 'utf-8');

  if (content.includes('desktopChat:')) {
    console.log(`  [${locale}] Already has desktopChat, patching missing keys...`);
    const tr = translations[locale];
    // Add host key if missing
    if (!content.includes("host: '")) {
      // Find the title line and add host after it
      const titleLineRegex = /title: '[^']+',/;
      content = content.replace(titleLineRegex, `title: '${tr.title}',\n    host: '${tr.host}',`);
      console.log(`    Added 'host' key`);
    }
    // Add dismiss key if missing (before the closing brace of desktopChat)
    if (!content.includes("dismiss: '")) {
      const challengeAcceptedRegex = /challengeAccepted: '[^']+',/;
      content = content.replace(challengeAcceptedRegex, `challengeAccepted: '${tr.challengeAccepted}',\n    dismiss: '${tr.dismiss}',`);
      console.log(`    Added 'dismiss' key`);
    }
  } else {
    const section = buildSection(translations[locale]);
    content = content.replace('  mobilePreview: {', section + '  mobilePreview: {');
    console.log(`  [${locale}] Added desktopChat section`);
  }

  writeFileSync(filePath, content, 'utf-8');
}

console.log('\nDone!');
