/**
 * Quick verification for R23 (custom taxonomy in harmonization):
 *  - canonicalizeGenre must keep a user-defined "Jazz" (NOT alias-map it to R&B)
 *  - sub-genres of custom categories still map to the custom parent
 *  - normalizeLanguage must recognize custom languages ("bairisch" → "Bairisch")
 *  - mixed custom/builtin languages join correctly
 * Run: bun qa-test-song/r23-custom-taxonomy.ts
 */
export {};

// Simulate a browser environment BEFORE the module imports read localStorage
const storageData: Record<string, string> = {
  'karaoke-custom-genres': JSON.stringify(['Jazz']),
  'karaoke-custom-languages': JSON.stringify(['Bairisch']),
};
(globalThis as Record<string, unknown>).window = globalThis;
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => (k in storageData ? storageData[k] : null),
  setItem: (k: string, v: string) => { storageData[k] = String(v); },
  removeItem: (k: string) => { delete storageData[k]; },
};

const { canonicalizeGenre, normalizeLanguage, normalizeLanguageMixed } = await import('../src/lib/parsers/meta-normalizer');
const { customTaxonomy } = await import('../src/lib/game/custom-taxonomy');

let failures = 0;
function check(label: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

// Genres — custom "Jazz" is canonical and wins over the alias map
check('canonicalizeGenre("Jazz") stays Jazz', canonicalizeGenre('Jazz'), 'Jazz');
check('canonicalizeGenre("jazz") casing-normalized', canonicalizeGenre('jazz'), 'Jazz');
check('canonicalizeGenre("Jazz (80s)") parens stripped', canonicalizeGenre('Jazz (80s)'), 'Jazz');
check('canonicalizeGenre("Vocal Jazz") still alias→R&B', canonicalizeGenre('Vocal Jazz'), 'R&B');
check('canonicalizeGenre("Swing") still alias→R&B', canonicalizeGenre('Swing'), 'R&B');
check('canonicalizeGenre("Synthpop") still alias→Pop', canonicalizeGenre('Synthpop'), 'Pop');
check('getAllGenres includes Jazz', customTaxonomy.getAllGenres().includes('Jazz'), true);
check('getAllGenres keeps 23 builtins + 1', customTaxonomy.getAllGenres().length, 24);

// Languages — custom "Bairisch" recognized
check('normalizeLanguage("bairisch") → Bairisch', normalizeLanguage('bairisch'), 'Bairisch');
check('normalizeLanguage("Bairisch (Oberbayern)") parens stripped', normalizeLanguage('Bairisch (Oberbayern)'), 'Bairisch');
check('normalizeLanguageMixed("bairisch/de") → Bairisch/German', normalizeLanguageMixed('bairisch/de'), 'Bairisch/German');
check('normalizeLanguage("deutsch") still alias→German', normalizeLanguage('deutsch'), 'German');
check('getAllLanguages includes Bairisch', customTaxonomy.getAllLanguages().includes('Bairisch'), true);

// Extra parameter override (API route path — no localStorage on the server)
check('canonicalizeGenre("Jazz", ["Jazz"]) via extras', canonicalizeGenre('Jazz', ['Jazz']), 'Jazz');
check('normalizeLanguage("bairisch", ["Bairisch"]) via extras', normalizeLanguage('bairisch', ['Bairisch']), 'Bairisch');

// Add/remove validation
check('addCustomGenre("Pop") rejected (builtin duplicate)', customTaxonomy.addCustomGenre('Pop').duplicate, true);
check('addCustomGenre("JAZZ") rejected (custom duplicate, case-insensitive)', customTaxonomy.addCustomGenre('JAZZ').duplicate, true);
check('addCustomGenre("   ") rejected (empty)', customTaxonomy.addCustomGenre('   ').error, 'empty');
check('addCustomGenre("Latin Jazz") ok', customTaxonomy.addCustomGenre('Latin Jazz').ok, true);
check('canonicalizeGenre("latin jazz") → Latin Jazz', canonicalizeGenre('latin jazz'), 'Latin Jazz');
check('removeCustomGenre("Latin Jazz") works', customTaxonomy.removeCustomGenre('Latin Jazz'), true);
check('removeCustomGenre("Pop") no-op (builtin)', customTaxonomy.removeCustomGenre('Pop'), false);
check('after removal "Latin Jazz" falls back to title-case', canonicalizeGenre('Latin Jazz'), 'Latin Jazz');

console.log(failures === 0 ? '\n🎉 ALL CHECKS PASSED' : `\n💥 ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
