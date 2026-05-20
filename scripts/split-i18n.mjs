#!/usr/bin/env node
/**
 * Split monolithic i18n locale files into domain-based sub-files.
 *
 * Before:
 *   locales/en.ts   (2,366 lines, 89 sections)
 *   locales/de.ts   (2,363 lines, ...)
 *   ...
 *
 * After:
 *   locales/en/index.ts   (barrel: imports + merges all sub-files)
 *   locales/en/core.ts
 *   locales/en/library.ts
 *   locales/en/game.ts
 *   locales/en/settings.ts
 *   locales/en/party.ts
 *   locales/en/medley-tournament.ts
 *   locales/en/profile.ts
 *   locales/en/mobile.ts
 *   ...
 */

import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve('src/lib/i18n/locales');

const LOCALES = [
  'en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'nl', 'pl', 'sv', 'no', 'da', 'fi',
];

const LANG_NAMES = {
  en: 'EN', de: 'DE', es: 'ES', fr: 'FR', it: 'IT', pt: 'PT',
  ja: 'JA', ko: 'KO', zh: 'ZH', ru: 'RU', nl: 'NL', pl: 'PL',
  sv: 'SV', no: 'NO', da: 'DA', fi: 'FI',
};

// Domain → section mapping
const DOMAINS = {
  core: [
    'nav', 'home', 'homeScreen', 'common', 'dialogs',
    'connectionStatus', 'offlineBanner', 'uploadStatus',
    'shareSection', 'replayModal', 'scoreCardSocial',
    'queue', 'queueScreen', 'queueNextSong',
    'jukebox', 'jukeboxPlayer',
  ],
  library: [
    'library', 'libraryFilters', 'libraryPlaylist',
    'song', 'songCard', 'songHighscoreModal', 'songLeaderboardPreview',
    'songStart', 'folderView', 'addToPlaylist',
    'importScreen', 'importUltrastar', 'importFolderScan', 'importAlternateFormat',
    'editor',
  ],
  game: [
    'game', 'gameScreen', 'gameHud', 'gameEnhancements', 'prominentScore',
    'practicePanel', 'mic', 'webcamBackground',
    'results', 'resultsScreen', 'scoreVisualization',
    'highscore', 'highscoreScreen',
  ],
  settings: [
    'settings', 'settingsTabs', 'settingsGameplay', 'settingsGraphicSound',
    'settingsMicrophoneCard', 'settingsMicPanel', 'settingsMobileDevice',
    'settingsWebcam', 'settingsEditor', 'settingsViralCharts',
    'settingsLibrary', 'settingsCompanion', 'settingsAudioOutput', 'settingsAbout',
  ],
  party: [
    'party', 'partySetup', 'partyGameScreens',
    'cptm', 'passTheMic', 'matchAbort',
    'competitiveWords', 'battleRoyale',
  ],
  medleyTournament: [
    'medley', 'tournament', 'rateMySong',
  ],
  profile: [
    'profile', 'characterScreen', 'characterCard',
    'profileSync', 'playerProgression',
    'achievements', 'achievementsScreen',
    'badgeNames', 'badgeDescriptions',
  ],
  mobile: [
    'mobile', 'mobileClient', 'mobileMicView', 'mobileViews', 'mobileNav',
    'companion', 'remoteControl',
    'onlineMultiplayer', 'daily', 'dailyChallengeScreen', 'shortsCreator',
  ],
};

// Build reverse map: sectionKey → domain
const SECTION_TO_DOMAIN = {};
for (const [domain, sections] of Object.entries(DOMAINS)) {
  for (const s of sections) {
    SECTION_TO_DOMAIN[s] = domain;
  }
}

/**
 * Parse a locale file into a map of sectionName → { key, lines[] }
 * Uses brace counting to correctly identify top-level section boundaries.
 */
function parseSections(content) {
  const lines = content.split('\n');
  const sections = new Map(); // key → array of line strings

  // Find the opening of the translations object
  let objStartLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/export const \w+Translations\s*=\s*\{/.test(lines[i])) {
      objStartLine = i;
      break;
    }
  }
  if (objStartLine === -1) {
    throw new Error('Could not find export const xxxTranslations = {');
  }

  // Scan for top-level sections (4-space indent + word + colon + {)
  // We'll do a single pass with brace counting.
  // Start at depth 1 because the opening { was on the skipped line.
  let currentSection = null;
  let braceDepth = 1;
  let sectionLines = [];

  for (let i = objStartLine + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimEnd();

    // Count braces on this line (ignoring those inside strings)
    let openBraces = 0;
    let closeBraces = 0;
    let inString = false;
    let stringChar = '';
    for (let c = 0; c < trimmed.length; c++) {
      const ch = trimmed[c];
      if (inString) {
        if (ch === stringChar && trimmed[c - 1] !== '\\') {
          inString = false;
        }
      } else if (ch === "'" || ch === '"' || ch === '`') {
        inString = true;
        stringChar = ch;
      } else if (ch === '{') {
        openBraces++;
      } else if (ch === '}') {
        closeBraces++;
      }
    }

    const netBraces = openBraces - closeBraces;

    // Check if this line starts a new top-level section
    // We check BEFORE incrementing braceDepth: a new section appears when
    // the current depth is 1 (inside the main object) and the line matches
    // the section pattern.
    const sectionMatch = trimmed.match(/^(\s{4})(\w+):\s*\{(.*)$/);

    if (sectionMatch && braceDepth === 1 && !trimmed.startsWith('//')) {
      // Save previous section
      if (currentSection !== null) {
        sections.set(currentSection, [...sectionLines]);
      }
      currentSection = sectionMatch[2];
      sectionLines = [trimmed];
      braceDepth += netBraces; // Now increment AFTER detecting the section
      // If the opening brace is closed on the same line (empty object)
      if (netBraces === 0) {
        sections.set(currentSection, [...sectionLines]);
        currentSection = null;
        sectionLines = [];
      }
    } else {
      braceDepth += netBraces;
      if (currentSection !== null) {
        sectionLines.push(trimmed);
        // Check if this section's brace level returns to 1 (section closed)
        if (braceDepth <= 1 && closeBraces > 0) {
          // Section ended
          sections.set(currentSection, [...sectionLines]);
          currentSection = null;
          sectionLines = [];
        }
      }
    }

    // If we've returned to depth 0, the whole object is closed
    if (braceDepth <= 0) {
      break;
    }
  }

  // Handle any remaining section
  if (currentSection !== null) {
    sections.set(currentSection, [...sectionLines]);
  }

  return sections;
}

/**
 * Format a sub-file for a domain.
 */
function formatSubFile(locale, domain, domainSections) {
  const varName = `${domain}Translations`;
  const lines = [
    `// ${LANG_NAMES[locale]} translations — ${domain}`,
    `// Auto-split from monolithic locale file`,
    ``,
    `export const ${varName} = {`,
  ];

  const sectionKeys = [...domainSections.keys()];
  for (let si = 0; si < sectionKeys.length; si++) {
    const section = domainSections.get(sectionKeys[si]);
    if (!section) continue;

    for (let li = 0; li < section.length; li++) {
      let line = section[li];
      // Remove leading 4 spaces from each line (we're now one level deeper in the file)
      if (line.startsWith('    ')) {
        line = '  ' + line.substring(4);
      }
      // Ensure the closing brace of a section has a trailing comma
      // (some original files omit commas between top-level sections)
      if (li === section.length - 1 && /^\s*\}\s*$/.test(line)) {
        line = line.replace(/}\s*$/, '},');
      }
      lines.push(line);
    }
    // Add blank line between sections (not after the last one)
    if (si < sectionKeys.length - 1) {
      lines.push('');
    }
  }

  // Remove trailing blank line
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format the barrel index.ts file for a locale.
 */
function formatBarrelFile(locale, allDomainKeys) {
  const langUpper = LANG_NAMES[locale];
  const lines = [
    `// Barrel file for ${langUpper} translations`,
    `// Auto-generated — imports domain sub-files and merges them`,
    ``,
  ];

  const imports = [];
  const spreads = [];

  for (const domain of allDomainKeys) {
    const varName = `${domain}Translations`;
    imports.push(`import { ${varName} } from './${domain}';`);
    spreads.push(`  ...${varName},`);
  }

  lines.push(...imports);
  lines.push('');
  lines.push(`export const ${locale}Translations = {`);
  lines.push(...spreads);
  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// Main execution
// ============================================================

const domainKeys = Object.keys(DOMAINS);
let totalFilesCreated = 0;
let totalFilesRemoved = 0;

for (const locale of LOCALES) {
  const filePath = path.join(LOCALES_DIR, `${locale}.ts`);

  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ ${filePath} not found, skipping`);
    continue;
  }

  console.log(`\n📝 Processing ${locale.toUpperCase()}...`);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Parse sections
  const sections = parseSections(content);
  console.log(`  Found ${sections.size} top-level sections`);

  // Create locale directory
  const localeDir = path.join(LOCALES_DIR, locale);
  fs.mkdirSync(localeDir, { recursive: true });

  // Group sections by domain and write sub-files
  const domainKeysFound = [];

  for (const domain of domainKeys) {
    const domainSectionKeys = DOMAINS[domain];
    const hasAnySection = domainSectionKeys.some(k => sections.has(k));

    if (!hasAnySection) {
      console.log(`  ⚠ Domain "${domain}" has no sections in ${locale}, skipping`);
      continue;
    }

    domainKeysFound.push(domain);

    // Build a filtered map of only the sections for this domain
    const domainSections = new Map();
    for (const key of domainSectionKeys) {
      if (sections.has(key)) {
        domainSections.set(key, sections.get(key));
      }
    }

    const subContent = formatSubFile(locale, domain, domainSections);
    const subPath = path.join(localeDir, `${domain}.ts`);
    fs.writeFileSync(subPath, subContent, 'utf-8');
    console.log(`  ✓ ${domain}.ts (${domainSections.size} sections)`);
    totalFilesCreated++;

    // Track which sections were assigned
    for (const key of domainSectionKeys) {
      sections.delete(key);
    }
  }

  // Check for unassigned sections
  if (sections.size > 0) {
    console.log(`  ⚠ ${sections.size} unassigned sections: ${[...sections.keys()].join(', ')}`);
    // Write remaining sections to an "extra" file
    const extraContent = formatSubFile(locale, 'extra', sections);
    const extraPath = path.join(localeDir, 'extra.ts');
    fs.writeFileSync(extraPath, extraContent, 'utf-8');
    console.log(`  ✓ extra.ts (${sections.size} sections)`);
    totalFilesCreated++;

    // Update domainKeysFound to include extra
    domainKeysFound.push('extra');
  }

  // Write barrel file
  const barrelContent = formatBarrelFile(locale, domainKeysFound);
  const barrelPath = path.join(localeDir, 'index.ts');
  fs.writeFileSync(barrelPath, barrelContent, 'utf-8');
  console.log(`  ✓ index.ts (barrel)`);
  totalFilesCreated++;

  // Remove old monolithic file
  fs.unlinkSync(filePath);
  console.log(`  ✓ Removed old ${locale}.ts`);
  totalFilesRemoved++;
}

console.log(`\n✅ Done!`);
console.log(`   Files created: ${totalFilesCreated}`);
console.log(`   Files removed: ${totalFilesRemoved}`);
