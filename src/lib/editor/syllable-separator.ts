// Syllable Separator for UltraStar TXT format
// Splits song lyrics into syllables suitable for note placement
// 
// UltraStar format rules:
// - Each syllable becomes a note: `: <beat> <duration> <pitch> <syllable>`
// - Trailing space = word boundary (displayed)
// - No trailing space = syllable continues to next note
// - Line breaks ("- <beat>") separate lyric lines

/**
 * Split text into syllables suitable for UltraStar note format.
 * 
 * Strategy:
 * 1. Split text into lines (paragraphs)
 * 2. Split each line into words
 * 3. For each word, split into syllables using heuristics
 * 4. Mark the last syllable of each word with a trailing space
 */
export interface SyllableWord {
  text: string;           // The word
  syllables: string[];    // Individual syllables
}

export interface SyllableLine {
  text: string;           // Original line text
  words: SyllableWord[];  // Words with their syllables
}

export interface SyllableResult {
  lines: SyllableLine[];
  totalSyllables: number;
}

/**
 * Parse lyrics text into syllable lines
 */
export function parseLyricsToSyllables(text: string): SyllableResult {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const result: SyllableLine[] = [];
  let totalSyllables = 0;

  for (const line of lines) {
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const syllableWords: SyllableWord[] = [];

    for (const word of words) {
      const syllables = splitIntoSyllables(word);
      syllableWords.push({ text: word, syllables });
      totalSyllables += syllables.length;
    }

    result.push({ text: line, words: syllableWords });
  }

  return { lines: result, totalSyllables };
}

/**
 * Convert syllable result to UltraStar note format strings.
 * 
 * @param result - The parsed syllables
 * @param startBeat - First beat number (default 0)
 * @param beatsPerSyllable - How many beats each syllable gets (default 4)
 * @param lineBreakBeats - How many beats between lines (default 8)
 */
export function syllablesToUltraStarNotes(
  result: SyllableResult,
  startBeat: number = 0,
  beatsPerSyllable: number = 4,
  lineBreakBeats: number = 8
): string[] {
  const noteLines: string[] = [];
  let currentBeat = startBeat;

  for (const line of result.lines) {
    for (const word of line.words) {
      for (let i = 0; i < word.syllables.length; i++) {
        const isLastSyllable = i === word.syllables.length - 1;
        // Trailing space = end of word in UltraStar format
        const lyric = isLastSyllable ? `${word.syllables[i]} ` : word.syllables[i];
        noteLines.push(`: ${currentBeat} ${beatsPerSyllable} 0 ${lyric}`);
        currentBeat += beatsPerSyllable;
      }
    }

    // Line break between lyric lines
    noteLines.push(`- ${currentBeat}`);
    currentBeat += lineBreakBeats;
  }

  return noteLines;
}

/**
 * Split a single word into syllables using heuristic rules.
 * 
 * This implements basic syllable splitting that works reasonably well
 * for German and English text. It's not perfect but good enough for
 * initial note placement in the editor.
 * 
 * Rules applied (in order):
 * 1. Preserve leading/trailing non-alphabetic characters (parentheses, quotes, etc.)
 * 2. Split before double consonants (e.g., "bet→ter")
 * 3. Split after vowels before consonant clusters (e.g., "a→bout")
 * 4. Split at common prefixes/suffixes
 * 5. Fallback: split in half for long words
 */
export function splitIntoSyllables(word: string): string[] {
  if (!word || word.length <= 3) {
    return [word];
  }

  // Extract leading/trailing non-alphabetic chars
  const leadingMatch = word.match(/^([^a-zA-ZäöüÄÖÜßéèêëàâùûîïôóõåæø]+)/);
  const trailingMatch = word.match(/([^a-zA-ZäöüÄÖÜßéèêëàâùûîïôóõåæø]+)$/);

  const leading = leadingMatch ? leadingMatch[1] : '';
  const trailing = trailingMatch ? trailingMatch[1] : '';
  const core = word.slice(leading.length, trailing.length ? -trailing.length : undefined);

  if (core.length <= 3) {
    return [word];
  }

  // Try to split the core word
  const coreSyllables = splitCoreWord(core);

  // Reassemble with leading/trailing
  if (coreSyllables.length === 1) {
    return [word];
  }

  coreSyllables[0] = leading + coreSyllables[0];
  coreSyllables[coreSyllables.length - 1] = coreSyllables[coreSyllables.length - 1] + trailing;

  return coreSyllables;
}

/**
 * Split a core word (alphabetic only) into syllables
 */
function splitCoreWord(word: string): string[] {
  if (word.length <= 3) return [word];
  if (word.length <= 5) {
    // Short words: try one split point
    const split = findSplitPoint(word);
    if (split > 0 && split < word.length) {
      return [word.slice(0, split), word.slice(split)];
    }
    return [word];
  }

  // Longer words: find multiple split points
  const splits: number[] = [];
  let remaining = word;

  while (remaining.length > 4) {
    const split = findSplitPoint(remaining);
    if (split > 0 && split < remaining.length) {
      splits.push(split);
      remaining = remaining.slice(split);
    } else {
      break;
    }
  }

  if (splits.length === 0) {
    // Fallback: split roughly in half for words > 6 chars
    if (word.length > 6) {
      const mid = Math.ceil(word.length / 2);
      return [word.slice(0, mid), word.slice(mid)];
    }
    return [word];
  }

  // Reconstruct syllables from split points
  const syllables: string[] = [];
  let pos = 0;
  for (const split of splits) {
    syllables.push(word.slice(pos, pos + split));
    pos += split;
  }
  syllables.push(word.slice(pos));

  return syllables;
}

/**
 * Find the best split point in a word.
 * Returns the position (exclusive) where to split.
 */
function findSplitPoint(word: string): number {
  const vowels = 'aeiouyäöüAEIOUYÄÖÜ';
  const consonants = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZß';

  // Rule 1: Split before double consonants (e.g., "tt" in "better")
  for (let i = 1; i < word.length - 1; i++) {
    if (word[i] === word[i + 1] && consonants.includes(word[i])) {
      // Don't split at the very start
      if (i >= 1) return i + 1;
    }
  }

  // Rule 2: Vowel-Consonant-Vowel pattern (e.g., "a-bout", "e-ven")
  for (let i = 1; i < word.length - 1; i++) {
    if (
      vowels.includes(word[i - 1]) &&
      consonants.includes(word[i]) &&
      vowels.includes(word[i + 1]) &&
      // Don't split if consonant is 'x' or 'qu'
      word[i].toLowerCase() !== 'x' &&
      !(word[i].toLowerCase() === 'q' && word[i + 1].toLowerCase() === 'u')
    ) {
      return i;
    }
  }

  // Rule 3: Split after vowel followed by multiple consonants (e.g., "imp-ortant")
  for (let i = 1; i < word.length - 2; i++) {
    if (
      vowels.includes(word[i]) &&
      consonants.includes(word[i + 1]) &&
      consonants.includes(word[i + 2]) &&
      // But not common endings like "ing", "tion", "ment"
      !isCommonEnding(word.slice(i))
    ) {
      return i + 1;
    }
  }

  // Rule 4: Split before common prefixes
  const prefixes = ['un', 'in', 'dis', 're', 'pre', 'mis', 'out', 'over', 'under', 'be', 'fore', 'ver', 'ge', 'ent', 'er', 'zer'];
  const lower = word.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix) && word.length > prefix.length + 2) {
      return prefix.length;
    }
  }

  // Rule 5: Split before common suffixes
  const suffixes = ['tion', 'sion', 'ment', 'ness', 'less', 'ful', 'ing', 'ous', 'ive', 'able', 'ible', 'ent', 'ant', 'ling', 'ung', 'keit', 'heit', 'lich', 'isch'];
  for (const suffix of suffixes) {
    const idx = lower.lastIndexOf(suffix);
    if (idx > 2 && idx + suffix.length < word.length) {
      return idx;
    }
  }

  // Fallback for long words: split near middle
  if (word.length > 5) {
    const mid = Math.ceil(word.length / 2);
    // Try to find a vowel near the middle
    for (let i = mid - 1; i <= mid + 1 && i < word.length; i++) {
      if (i > 0 && i < word.length && vowels.includes(word[i])) {
        return i;
      }
    }
    return mid;
  }

  return 0; // No split
}

/**
 * Check if a substring is a common word ending that shouldn't be split
 */
function isCommonEnding(substring: string): boolean {
  const lower = substring.toLowerCase();
  const endings = ['tion', 'sion', 'ment', 'ness', 'ing', 'ous', 'ive', 'able', 'ible', 'ling', 'ung', 'eit', 'ich'];
  return endings.some(e => lower.startsWith(e));
}
