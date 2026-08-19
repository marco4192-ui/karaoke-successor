/**
 * Fix cross-missing keys between EN and DE.
 * Also add all missing keys to EN and DE.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const BASE = resolve('/home/z/my-project/karaoke-successor/src/lib/i18n/locales');
const MODULES = ['core','game','library','medleyTournament','mobile','party','profile','settings'];

function parseTSObject(content) {
  let pos = 0;
  function skipWS() {
    while (pos < content.length) {
      if (/[\s,]/.test(content[pos])) { pos++; continue; }
      if (content[pos] === '/' && content[pos+1] === '/') { while (pos < content.length && content[pos] !== '\n') pos++; continue; }
      if (content[pos] === '/' && content[pos+1] === '*') { pos += 2; while (pos < content.length && !(content[pos] === '*' && content[pos+1] === '/')) pos++; pos += 2; continue; }
      break;
    }
  }
  function parseStr() {
    const q = content[pos]; pos++;
    let r = '';
    while (pos < content.length && content[pos] !== q) { if (content[pos] === '\\') { pos++; r += content[pos] || ''; } else r += content[pos]; pos++; }
    pos++; return r;
  }
  function parseObj() {
    pos++; const obj = {}; skipWS();
    while (pos < content.length && content[pos] !== '}') {
      let key;
      if (content[pos] === "'" || content[pos] === '"') key = parseStr();
      else { let s = pos; while (/[\w$]/.test(content[pos])) pos++; key = content.substring(s, pos); }
      skipWS(); if (content[pos] === ':') pos++;
      skipWS();
      if (content[pos] === '{') obj[key] = parseObj();
      else if (content[pos] === "'" || content[pos] === '"') obj[key] = parseStr();
      else { while (pos < content.length && content[pos] !== ',' && content[pos] !== '}') pos++; }
      skipWS();
    }
    pos++; return obj;
  }
  const bi = content.indexOf('{'); pos = bi; return parseObj();
}

function getLeafPaths(obj, prefix = '') {
  const paths = {};
  if (!obj || typeof obj !== 'object') return paths;
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof value === 'string') paths[fullKey] = value;
    else if (typeof value === 'object' && value !== null) Object.assign(paths, getLeafPaths(value, fullKey));
  }
  return paths;
}

function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function formatObject(obj, indent = 0) {
  const innerSpaces = '  '.repeat(indent + 1);
  const lines = [];
  const entries = Object.entries(obj);
  entries.forEach(([key, value], idx) => {
    const comma = idx < entries.length - 1 ? ',' : '';
    const needsQuoting = !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
    const keyStr = needsQuoting ? "'" + key.replace(/'/g, "\\'") + "'" : key;
    if (typeof value === 'string') {
      const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      lines.push(innerSpaces + keyStr + ": '" + escaped + "'" + comma);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(innerSpaces + keyStr + ': {');
      lines.push(formatObject(value, indent + 1));
      lines.push(innerSpaces + '}' + comma);
    }
  });
  return lines.join('\n');
}

function writeTranslations(filePath, obj, moduleName, langCode) {
  const varName = moduleName + 'Translations';
  const header = '// ' + langCode + ' translations — ' + moduleName + '\n// Auto-split from monolithic locale file\n\nexport const ' + varName + ' = {';
  const footer = '\n};\n';
  writeFileSync(filePath, header + '\n' + formatObject(obj, 0) + footer, 'utf-8');
}

// Manual EN translations for DE-only keys
const deToEn = {
  'common.exitFullscreen': 'Exit Fullscreen',
  'queue.ariaQueue': 'Queue',
  'library.ariaSongSelection': 'Song Selection',
  'jukeboxPlayer.ariaSongProgress': 'Song progress',
  'jukeboxPlayer.ariaUnmute': 'Unmute',
  'jukeboxPlayer.ariaMute': 'Mute',
  'jukeboxPlayer.ariaVolume': 'Volume',
  'jukeboxPlayer.ariaShuffle': 'Shuffle',
  'jukeboxPlayer.ariaRepeat': 'Repeat',
  'mobile.mirrorSetupLoading': 'Setting Up...',
  'mobile.mirrorBackToParty': 'Back to Party',
  'mobile.mirrorBackToSetup': 'Back to Setup',
  'mobile.mirrorSetupDesktopHint': 'Configure on the desktop',
  'mobile.mirrorSetupDesktopHintDesc': 'Use the desktop app to set up the party',
  'mobile.mirrorSongVoting': 'Song Voting',
  'mobile.mirrorSongVotingHint': 'Vote for the next song',
  'mobile.mirrorSongVotingDesc': 'Players vote on which song to sing next',
  'mobile.mirrorLibrary': 'Library',
  'mobile.mirrorSearchSongs': 'Search Songs',
  'mobile.mirrorNoSongs': 'No Songs',
  'mobile.mirrorProfile': 'Profile',
  'mobile.mirrorHome': 'Home',
  'mobile.mirrorRestart': 'Restart',
  'mobile.mirrorPause': 'Pause',
  'mobile.mirrorPlay': 'Play',
  'mobile.mirrorSkip': 'Skip',
  'mobile.mirrorFullscreen': 'Fullscreen',
  'mobile.mirrorChatNew': 'New message',
  'mobile.mirrorChallengeSent': 'Challenge sent!',
  'mobile.mirrorDuetFilterHint': 'Songs that are suitable for duets',
  'mobile.mirrorDuelHint': 'Challenge another player to a duel',
  'mobile.mirrorDuetHint': 'Sing together as a duo',
  'mobile.mirrorChallengeDuel': 'Duel Challenge',
  'mobile.mirrorChallengeDuet': 'Duet Challenge',
  'mobile.mirrorLoadingProfiles': 'Loading profiles...',
  'gameMode.single': 'Single',
  'gameMode.duel': 'Duel',
  'gameMode.duet': 'Duet',
  'chatNotification.newMessage': 'New message',
  'songChallenge.challengeBtn': 'Challenge',
  'songChallenge.acceptBtn': 'Accept',
  'songChallenge.accepted': 'Challenge accepted!',
  'songChallenge.acceptedBy': '{name} accepted your challenge!',
  'songChallenge.challengeText': 'challenged you to a singing duel!',
  'songChallenge.acceptedText': 'has accepted your challenge!',
  'desktopChat.title': 'Chat',
  'desktopChat.placeholder': 'Type a message...',
  'desktopChat.send': 'Send',
  'desktopChat.noMessages': 'No messages yet',
  'desktopChat.host': 'Host',
  'desktopChat.sendAs': 'Send as',
  'desktopChat.noPlayers': 'No players available',
  'desktopChat.waitingForOpponent': 'Waiting for opponent...',
  'desktopChat.challenge': 'Challenge',
  'desktopChat.challengeSong': 'Challenge with this song',
  'extendedDesc.🔄 Nach jedem Segment wechselt der Sänger': '🔄 The singer changes after each segment',
  'extendedDesc.⚡ Wenn das Handy aufleuchtet, bist du dran!': '⚡ When your phone lights up, it\'s your turn!',
  'extendedDesc.⚔️ Team: 1v1 oder 2v2 — Teams treten in Duellen gegeneinander an': '⚔️ Team: 1v1 or 2v2 — teams compete in duels',
  'extendedDesc.⚔️ 1-gegen-1 Matches': '⚔️ 1-on-1 Matches',
  'extendedDesc.📱 Bis zu 20 weitere Spieler über die Companion App': '📱 Up to 20 more players via Companion App',
  'extendedDesc.🔄 Jede Runde ein neuer Song (oder per Abstimmung)': '🔄 New song each round (or by vote)',
  'extendedDesc.🏆 Grand Finale: Best-of-3 oder Best-of-5 für die letzten 2': '🏆 Grand Finale: Best-of-3 or Best-of-5 for the last 2',
  'extendedDesc.🎤 Beide singen den gleichen Song': '🎤 Both sing the same song',
  'extendedDesc.🧠 Singe aus dem Gedächtnis ohne Noten-Hilfe': '🧠 Sing from memory without note assistance',
  'extendedDesc.🔥 HARDCORE: Wenn Noten sichtbar → Text versteckt (und umgekehrt)': '🔥 HARDCORE: When notes visible → text hidden (and vice versa)',
  'extendedDesc.👥 Solo, Kooperativ oder Kompetitiv (2–4 Spieler)': '👥 Solo, Co-op or Competitive (2–4 players)',
  'extendedDesc.🎤 Die erste Strophe bleibt immer sichtbar als Anhaltspunkt': '🎤 The first verse always remains visible as reference',
  'extendedDesc.🔥 Hardcore: Versteckte Wörter bleiben bis zum Ende verborgen': '🔥 Hardcore: Hidden words stay hidden until the end',
  'extendedDesc.⭐ Erweiterte Bonusse: Streak, Perfect, Comeback': '⭐ Extended bonuses: Streak, Perfect, Comeback',
  'extendedDesc.⭐ 4 Bewertungskategorien mit gewichtetem Gesamtergebnis': '⭐ 4 rating categories with weighted overall result',
  'extendedDesc.🏆 Ränge, Achievements & Hall of Fame': '🏆 Ranks, Achievements & Hall of Fame',
};

// Manual DE translations for EN-only keys
const enToDe = {
  'rateMySong.scoreLabel': 'Punktzahl',
  'extendedDesc.🔄 The singer changes after each segment': '🔄 Nach jedem Segment wechselt der Sänger',
  'extendedDesc.⚡ When your phone lights up, it\'s your turn!': '⚡ Wenn das Handy aufleuchtet, bist du dran!',
  'extendedDesc.⚔️ Team: 1v1 or 2v2 — teams compete in duels': '⚔️ Team: 1v1 oder 2v2 — Teams treten in Duellen gegeneinander an',
  'extendedDesc.⚔️ 1-on-1 Matches': '⚔️ 1-gegen-1 Matches',
  'extendedDesc.📱 Up to 20 more players via Companion App': '📱 Bis zu 20 weitere Spieler über die Companion App',
  'extendedDesc.🔄 New song each round (or by vote)': '🔄 Jede Runde ein neuer Song (oder per Abstimmung)',
  'extendedDesc.🏆 Grand Finale: Best-of-3 or Best-of-5 for the last 2': '🏆 Grand Finale: Best-of-3 oder Best-of-5 für die letzten 2',
  'extendedDesc.🎤 Both sing the same song': '🎤 Beide singen den gleichen Song',
  'extendedDesc.🧠 Sing from memory without note assistance': '🧠 Singe aus dem Gedächtnis ohne Noten-Hilfe',
  'extendedDesc.🔥 HARDCORE: When notes visible → text hidden (and vice versa)': '🔥 HARDCORE: Wenn Noten sichtbar → Text versteckt (und umgekehrt)',
  'extendedDesc.👥 Solo, Co-op or Competitive (2–4 players)': '👥 Solo, Kooperativ oder Kompetitiv (2–4 Spieler)',
  'extendedDesc.🎤 The first verse always remains visible as reference': '🎤 Die erste Strophe bleibt immer sichtbar als Anhaltspunkt',
  'extendedDesc.🔥 Hardcore: Hidden words stay hidden until the end': '🔥 Hardcore: Versteckte Wörter bleiben bis zum Ende verborgen',
  'extendedDesc.⭐ Extended bonuses: Streak, Perfect, Comeback': '⭐ Erweiterte Bonusse: Streak, Perfect, Comeback',
  'extendedDesc.⭐ 4 rating categories with weighted overall result': '⭐ 4 Bewertungskategorien mit gewichtetem Gesamtergebnis',
  'extendedDesc.🏆 Ranks, Achievements & Hall of Fame': '🏆 Ränge, Achievements & Hall of Fame',
};

// Fix EN: add DE-only keys with English values
for (const mod of MODULES) {
  const filePath = join(BASE, 'en', mod + '.ts');
  const content = readFileSync(filePath, 'utf-8');
  const obj = parseTSObject(content);
  const paths = getLeafPaths(obj);
  let added = 0;
  for (const [key, value] of Object.entries(deToEn)) {
    // Only add keys that belong to this module (first segment matches a top-level key in this file)
    const topNs = key.split('.')[0];
    if (!(key in paths) && (topNs in obj || mod === 'core')) { setNestedValue(obj, key, value); added++; }
  }
  if (added > 0) { writeTranslations(filePath, obj, mod, 'EN'); console.log('EN ' + mod + ': +' + added + ' keys'); }
}

// Fix DE: add EN-only keys with German values
for (const mod of MODULES) {
  const filePath = join(BASE, 'de', mod + '.ts');
  const content = readFileSync(filePath, 'utf-8');
  const obj = parseTSObject(content);
  const paths = getLeafPaths(obj);
  let added = 0;
  for (const [key, value] of Object.entries(enToDe)) {
    const topNs = key.split('.')[0];
    if (!(key in paths) && (topNs in obj || mod === 'core')) { setNestedValue(obj, key, value); added++; }
  }
  if (added > 0) { writeTranslations(filePath, obj, mod, 'DE'); console.log('DE ' + mod + ': +' + added + ' keys'); }
}

console.log('EN/DE cross-fix done!');
