#!/usr/bin/env node
/**
 * Seed TEST entries into the live leaderboard (via GitHub Actions — the
 * sandbox cannot reach netcup directly; the workflow
 * .github/workflows/seed-test-data.yml runs this script with the
 * NEXT_PUBLIC_LEADERBOARD_* secrets).
 *
 * v2 (R81) — the score-system rebuild changed WHAT makes sense to seed:
 * - NO synthetic song scores anymore: the new global board only shows songs
 *   that exist in the player's local library, and the seeder (running on a
 *   GitHub runner) cannot know the user's library hashes. Real song scores
 *   come from actually playing songs in the app.
 * - NO Battle-Royale wins anymore: the whole counter flew out of the system.
 * - What IS seeded: the 5 test profiles + daily-challenge rows for TODAY's
 *   real slot types (the client picks them deterministically from the date
 *   — the algorithm is ported below, verified against
 *   src/lib/game/daily-challenge.ts getDailySlots) so the per-stage Top-3
 *   boxes (the R81 feature) have something to show for the Gegencheck.
 *
 * Modes:
 *   node scripts/seed-test-data.mjs            seed (default)
 *   node scripts/seed-test-data.mjs --cleanup  delete the test profiles
 */
import { readFileSync } from 'node:fs';

const BASE = (process.env.LB_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.LB_KEY ?? '';
const CLEANUP = process.argv.includes('--cleanup');
const REQUIRED_VERSION = '3.7.0';

if (!BASE || !KEY) {
  console.error('LB_URL / LB_KEY env vars required (set in the workflow from the repo secrets).');
  process.exit(1);
}

/** One shared fetch helper: JSON in/out, X-API-Key, non-2xx = hard fail. */
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    console.error(`  ${method} ${path} -> HTTP ${res.status}: ${JSON.stringify(json)}`);
    process.exit(1);
  }
  return json;
}

// Guard: the server accepts exactly 8 or 12 chars A-Z0-9 — fail fast locally
// instead of burning a CI run on a 400.
function assertValidSyncCode(code) {
  if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{12}$/.test(code)) {
    throw new Error(`sync_code '${code}' is not 8/12 chars A-Z0-9`);
  }
}

// ── The fixed test cast (deterministic UUIDs + sync codes, 12 chars, so the
//    run is repeatable & cleanable). No per-player scores — see header.
const CAST = [
  { uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0001', syncCode: 'TESTMIA5X7Q2',  name: 'TEST Mia',  color: '#FF6B9D', country: 'DE' },
  { uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0002', syncCode: 'TESTBEN8W3Y4',  name: 'TEST Ben',  color: '#4ECDC4', country: 'AT' },
  { uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0003', syncCode: 'TESTLUCA5E6F',  name: 'TEST Luca', color: '#FFD93D', country: 'CH' },
  { uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0004', syncCode: 'TESTEMMA7G8H',  name: 'TEST Emma', color: '#A78BFA', country: null },
  { uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0005', syncCode: 'TESTNOAH9J2K',  name: 'TEST Noah', color: '#6C5CE7', country: 'IT' },
];

// ── Deterministic daily-slot port (mirrors src/lib/game/daily-challenge.ts) ──
// The type pool + ids order come from scripts/daily-types.json, which is
// GENERATED from challenge-pools.ts by scripts/generate-daily-meta.ts —
// regenerate both together when the pool changes.
const { ids: DAILY_TYPE_IDS, types: DAILY_TYPES } = JSON.parse(
  readFileSync(new URL('./daily-types.json', import.meta.url), 'utf-8'),
);

/** DJB2, identical to the app (hashString in daily-challenge.ts:771-777). */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0);
}

/** Local date in the app users' timezone (Europe/Berlin) — the app switched
 *  from a UTC slice to the local day (R81); the seeder follows so the rows
 *  land on the same day the app groups them under. */
function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/** The 5 slot types for today — port of getDailySlots (the app's legacy
 *  stored-board adoption cannot be replicated without localStorage; if the
 *  user already played dailies TODAY before this deploy, slot 0 may differ —
 *  in that case only slots 1-4 line up. Harmless for the Gegencheck.) */
function getDailySlots() {
  const today = todayISO();
  const picked = [];
  let salt = 0;
  while (picked.length < 5) {
    const type = DAILY_TYPE_IDS[hashString(`${today}:${salt}`) % DAILY_TYPE_IDS.length];
    if (!picked.includes(type)) picked.push(type);
    salt++;
  }
  return picked;
}

/** Plausible metric values per metric family (within the server's per-type
 *  max bounds; notesMissed types are 'min'-direction — low is good). */
function plausibleMetric(metricKey) {
  const r = (min, max, dp = 0) => Math.round((min + Math.random() * (max - min)) * 10 ** dp) / 10 ** dp;
  switch (metricKey) {
    case 'score':            return r(8300, 9900);
    case 'accuracy':         return r(88, 98.5, 1);
    case 'tickAccuracy':     return r(85, 98, 1);
    case 'maxCombo':         return r(110, 260);
    case 'perfectNotesCount':return r(70, 220);
    case 'goldenNotesCount': return r(16, 58);
    case 'notesHit':         return r(280, 900);
    case 'notesMissed':      return r(0, 8);          // min-direction
    default:                 return r(85, 98, 1);     // category/songs metrics
  }
}

async function main() {
  console.log(`Leaderboard test seeder v2 — ${BASE} — mode: ${CLEANUP ? 'CLEANUP' : 'SEED'}`);
  for (const p of CAST) assertValidSyncCode(p.syncCode);
  const info = await api('GET', '/info');
  console.log(`Server: ${info.name} v${info.version}`);
  if (info.version !== REQUIRED_VERSION) {
    console.error(`  !! expected server v${REQUIRED_VERSION} (R81 score-system rebuild) — index.php redeploy missing?`);
    process.exit(1);
  }
  const today = todayISO();
  console.log(`Daily slot types for ${today} (Berlin): ${getDailySlots().join(', ')}`);

  if (CLEANUP) {
    for (const p of CAST) {
      const r = await api('DELETE', `/profiles/${p.uid}`, { sync_code: p.syncCode });
      console.log(`  deleted ${p.name} (${p.uid}) -> ${r.deleted === p.uid ? 'ok' : 'unexpected'}`);
    }
  } else {
    for (const p of CAST) {
      const reg = await api('POST', '/profiles', {
        profile_uid: p.uid,
        display_name: p.name,
        color: p.color,
        country_code: p.country,
        sync_code: p.syncCode,
      });
      if (reg.sync_code !== p.syncCode) {
        console.error(`  ${p.name}: server returned a different sync_code — aborting`);
        process.exit(1);
      }
      console.log(`  profile ${p.name} ok (${reg.sync_code})`);

      // Daily rows: every slot type at 2-3 tiers, plausible per metric family.
      // The per-stage Top-3 boxes show these grouped by (type, difficulty).
      const tiers = ['easy', 'normal', 'hard', 'insane'].slice(0, 2 + (p.name.length % 2));
      for (const type of getDailySlots()) {
        const def = DAILY_TYPES.find(t => t.id === type) ?? { metricKey: 'score', direction: 'max' };
        for (const difficulty of tiers) {
          const mv = plausibleMetric(def.metricKey);
          await api('POST', '/daily', {
            profile_uid: p.uid,
            challenge_date: today,
            challenge_type: type,
            metric_value: mv,
            difficulty,
            xp_earned: 100,
            sync_code: p.syncCode,
          });
          console.log(`    daily ${type} [${difficulty}] = ${mv} (${def.metricKey}, ${def.direction}) ok`);
        }
      }
    }
  }

  // ── verification reads ──────────────────────────────────────────
  console.log('--- verification (GET /daily) ---');
  const daily = await api('GET', `/daily?date=${today}&limit=100`);
  const rows = daily.leaderboard ?? [];
  const testRows = rows.filter(r => r.display_name.startsWith('TEST '));
  const byType = new Map();
  for (const r of testRows) {
    const key = `${r.challenge_type}|${r.difficulty}`;
    byType.set(key, (byType.get(key) ?? 0) + 1);
  }
  const slotTypes = getDailySlots();
  let missing = 0;
  for (const type of slotTypes) {
    for (const d of ['easy', 'normal', 'hard', 'insane']) {
      const n = byType.get(`${type}|${d}`) ?? 0;
      if (n > 0) console.log(`  ${type} [${d}]: ${n} test rows`);
    }
  }
  for (const [key, n] of byType) if (n === 0) missing++;
  const covered = slotTypes.filter(t => [...byType.keys()].some(k => k.startsWith(`${t}|`)));
  console.log(`  ${testRows.length} test rows across ${covered.length}/${slotTypes.length} slot types`);
  if (!CLEANUP && covered.length < slotTypes.length) {
    console.error('  !! not every slot type got rows — seeding incomplete');
    process.exit(1);
  }
  if (CLEANUP && testRows.length !== 0) {
    console.error('  !! daily rows survived cleanup (profiles deleted — should cascade)');
    process.exit(1);
  }
  console.log(CLEANUP ? 'CLEANUP COMPLETE — boards are test-free.' : 'SEED COMPLETE — the daily per-stage boxes carry the test cast.');
}

main().catch((e) => { console.error(e); process.exit(1); });
