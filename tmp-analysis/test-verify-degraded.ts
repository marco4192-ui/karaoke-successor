/**
 * R65 — Verify-Degradation E2E logic test (AI unavailable, the user's
 * environment): the pipeline must verify via databases, badge the songs,
 * cache with languageChecked=false, and report degraded (no error banner).
 *
 * Run: bun tmp-analysis/test-verify-degraded.ts
 */
import { harmonizeSongs } from '@/lib/ai/harmonize-client';
import { getCachedHarmonize } from '@/lib/ai/harmonize-cache';

// Stub fetch: /api/ai-status → unavailable; everything else passes through
// (the factual lookups hit the real MusicBrainz/iTunes — 2 songs, ~2-3 s).
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  if (url.includes('/api/ai-status')) {
    return new Response(JSON.stringify({ success: true, available: false, provider: null, reason: 'no-config' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  return realFetch(input as RequestInfo, init);
}) as typeof fetch;

const songs = [
  { id: 'deg-1', title: 'Yesterday', artist: 'The Beatles', genre: 'Pop', language: 'English', year: 1965 },
  { id: 'deg-2', title: 'Imagine', artist: 'John Lennon', genre: 'Pop', language: 'English', year: 1971 },
];

const result = await harmonizeSongs(songs, {
  verify: true,
  verifyFields: { genre: true, language: true, year: true },
});

console.log('══ RESULT ══');
console.log(`  success:            ${result.success}`);
console.log(`  degraded:           ${result.degraded}`);
console.log(`  error:              ${result.error ?? '(none)'}`);
console.log(`  notAnalyzed:        ${result.stats.notAnalyzed}`);
console.log(`  aiErrors:           ${result.stats.aiErrors}`);
console.log(`  noChange:           ${result.stats.noChange}`);
console.log(`  suggestions:        ${result.suggestions.length}`);
console.log(`  verifiedOkIds:      ${JSON.stringify(result.verifiedOkIds)}`);

let failures = 0;
const check = (label: string, cond: boolean) => {
  console.log(`${cond ? '✓' : '✗ FAIL'}  ${label}`);
  if (!cond) failures++;
};

check('degraded === true (AI unavailable recognized)', result.degraded === true);
check('success === true (no error banner anymore)', result.success === true);
check('notAnalyzed === 0 (songs count as checked, degraded)', result.stats.notAnalyzed === 0);
check('every song either verified or carrying a DB finding',
  songs.every(s => result.verifiedOkIds.includes(s.id) || result.suggestions.some(x => x.songId === s.id)));
check('languages were NOT LLM-checked (llm absent by design)',
  songs.every(s => {
    const cached = getCachedHarmonize({ ...s, title: s.title });
    return cached ? cached.verifiedFields?.language === false : true;
  }));

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
