/**
 * Extracts, per language, the missing keys (vs EN) grouped by locale file,
 * exported as NESTED objects so agents can copy structure directly.
 * Also extracts "suspicious identical" keys (identical to EN but containing
 * English-looking sentences) for quality review.
 */
import { getTranslations, flattenObject } from '../src/lib/i18n/locales/index';
import * as fs from 'fs';

const tr = getTranslations();
const langs = ['de','es','fr','it','pt','ja','ko','zh','ru','nl','pl','sv','no','da','fi'] as const;

// Map top-level key -> locale file (from analysis of en files)
const topLevelToFile: Record<string, string> = {
  // core.ts
  core:'core', nav:'core', home:'core', homeScreen:'core', common:'core', dialogs:'core',
  connectionStatus:'core', offlineBanner:'core', uploadStatus:'core', shareSection:'core',
  replayModal:'core', scoreCardSocial:'core', queue:'core', queueScreenCore:'core',
  jukebox:'core', jukeboxPlayer:'core', songPool:'core', songPoolSelect:'core',
  switchPool:'core', jukeboxA11y:'core', fullscreen:'core', errorBoundary:'core',
  countries:'core', dailyChallenge:'core', dailyBadges:'core', desktopChat:'core',
  songChallenge:'core', difficulty:'core',
  // library.ts
  ai:'library', library:'library', libraryFilters:'library', playlists:'library',
  libraryPlaylist:'library', playlistQueueConfig:'library', song:'library', songCard:'library',
  songHighscoreModal:'library', songLeaderboardPreview:'library', songStart:'library',
  folderView:'library', addToPlaylist:'library', importUltrastar:'library',
  importFolderScan:'library', importAlternateFormat:'library', editor:'library',
  importHook:'library', importFolderBadges:'library', importExtra:'library',
  // game.ts
  share:'game', scoreEvents:'game', difficultyGame:'game', game:'game', gameScreen:'game',
  gameHud:'game', gameEnhancements:'game', prominentScore:'game', noteLane:'game',
  practicePanel:'game', mic:'game', webcamBackground:'game', results:'game',
  resultsScreen:'game', scoreVisualization:'game', highscore:'game',
  highscoreScreen:'game', keyboardShortcuts:'game', audioAnalysis:'game',
  battleRoyaleGame:'game', remoteControl:'game', mobilePage:'game', youtube:'game',
  editorGame:'game', paused:'game', go:'game', commonGame:'game', page:'game',
  achievementsGame:'game', ranks:'game', challenges:'game', modifiers:'game',
  rankingTitles:'game', battleRoyale:'game', blind:'game', missingWords:'game',
  competitive:'game',
  // settings.ts
  settings:'settings', settingsTabs:'settings', settingsTaxonomy:'settings',
  settingsMotto:'settings', settingsGameplay:'settings', settingsGraphicSound:'settings',
  settingsMicrophoneCard:'settings', settingsMicPanel:'settings', settingsMobileDevice:'settings',
  settingsWebcam:'settings', settingsEditor:'settings', settingsViralCharts:'settings',
  settingsLibrary:'settings', settingsCompanion:'settings', settingsAudioOutput:'settings',
  settingsMicPresets:'settings', settingsGeneral:'settings', settingsAbout:'settings',
  webcamSettings:'settings', appearance:'settings', gameplay:'settings',
  graphicSound:'settings', about:'settings', syncBackup:'settings',
  // party.ts
  partyHelpers:'party', party:'party', partySetup:'party', partyGameScreens:'party',
  passTheMic:'party', companionSingalong:'party', matchAbort:'party', tournament:'party',
  competitiveWords:'party', battleRoyaleParty:'party', unifiedSetup:'party',
  partyHistory:'party', extendedDesc:'party', modeSettings:'party', partyStarting:'party',
  gameModes:'party',
  // medleyTournament.ts
  medley:'medleyTournament', tournamentMT:'medleyTournament', rateMySong:'medleyTournament',
  // profile.ts
  profile:'profile', profileAuth:'profile', characterScreen:'profile',
  characterCard:'profile', profileSync:'profile', playerProgression:'profile',
  achievements:'profile', achievementsScreen:'profile', badgeNames:'profile',
  badgeDescriptions:'profile', mobileAchievements:'profile',
  // mobile.ts
  mobile:'mobile', mobileClient:'mobile', mobileViews:'mobile', mobileNav:'mobile',
  companion:'mobile', remoteControlMobile:'mobile', onlineMultiplayer:'mobile',
  daily:'mobile', dailyChallengeScreen:'mobile', dailyTypes:'mobile', weeklyTypes:'mobile',
  shortsCreator:'mobile', mobileCompanion:'mobile', mobileLeaderboard:'mobile',
  mobileErrorBoundary:'mobile', mobileOffline:'mobile', mobilePullRefresh:'mobile',
  mobileMoods:'mobile', mobileChallenge:'mobile', mobileOnboarding:'mobile',
  mobileChat:'mobile', mobilePreview:'mobile', mobilePhotoBooth:'mobile',
  // tutorial.ts
  tutorial:'tutorial',
};

function unflatten(entries: Record<string,string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    const parts = key.split('.');
    let cur: Record<string, unknown> = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) cur[parts[i]] = {};
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
  return root;
}

// Whitelist: keys commonly identical across languages (proper nouns, brand, short tech terms)
const alwaysOk = /karaoke|youtube|vimeo|bilibili|niconico|dailymotion|rutube|ultrastar|midi|playlist|genre|combo|bonus|rap|freestyle|karaoke zero/i;

for (const lang of langs) {
  const langTr = tr[lang];
  const missingEntries: Record<string,string> = {};
  const suspicious: Record<string,string> = {};
  for (const [key, enVal] of Object.entries(tr.en)) {
    if (!(key in langTr)) {
      missingEntries[key] = enVal;
    } else if (langTr[key] === enVal && !alwaysOk.test(enVal)) {
      // identical to EN: flag if it looks like a translatable phrase (has 3+ words or ends with ./:)
      const words = enVal.trim().split(/\s+/).length;
      if (words >= 3 || /[.:]$/.test(enVal.trim())) suspicious[key] = enVal;
    }
  }
  // group missing by file
  const byFile: Record<string, Record<string,string>> = {};
  for (const [key, val] of Object.entries(missingEntries)) {
    const top = key.split('.')[0];
    let file = topLevelToFile[top];
    if (!file) {
      // heuristic fallback by known groups
      file = 'core';
      console.error(`WARN ${lang}: unknown top-level '${top}' -> core`);
    }
    (byFile[file] = byFile[file] || {})[key] = val;
  }
  const suspiciousByFile: Record<string, Record<string,string>> = {};
  for (const [key, val] of Object.entries(suspicious)) {
    const top = key.split('.')[0];
    const file = topLevelToFile[top] || 'core';
    (suspiciousByFile[file] = suspiciousByFile[file] || {})[key] = val;
  }
  const out = {
    language: lang,
    missingCount: Object.keys(missingEntries).length,
    missingByFile: Object.fromEntries(Object.entries(byFile).map(([f, e]) => [f, unflatten(e)])),
    suspiciousIdenticalByFile: Object.fromEntries(Object.entries(suspiciousByFile).map(([f, e]) => [f, unflatten(e)])),
  };
  fs.writeFileSync(`tmp-analysis/missing-${lang}.json`, JSON.stringify(out, null, 2));
  console.log(`${lang}: missing=${Object.keys(missingEntries).length} (files: ${Object.entries(byFile).map(([f,e]) => `${f}:${Object.keys(e).length}`).join(', ')}) suspiciousIdentical=${Object.keys(suspicious).length}`);
}
