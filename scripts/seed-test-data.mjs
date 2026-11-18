#!/usr/bin/env node
/**
 * Seed TEST entries into the live leaderboard (via GitHub Actions — the
 * sandbox cannot reach netcup directly; the workflow
 * .github/workflows/seed-test-data.yml runs this script with the
 * NEXT_PUBLIC_LEADERBOARD_* secrets).
 *
 * Modes:
 *   node scripts/seed-test-data.mjs            seed (default)
 *   node scripts/seed-test-data.mjs --cleanup  delete the test profiles
 *
 * Design notes (mirrors the real app, see leaderboard-api/anti-cheat.php):
 * - Every score carries a COMPLETE valid proof (integrity hash, fresh
 *   timestamp, plausible numbers, consistent points_per_tick), so the
 *   submissions come back verified=true with NO soft flags — exactly like
 *   a real client. Integrity hash = sha256 over the '|' join, no secret.
 * - The test profiles use FIXED UUIDs + FIXED 12-char sync codes, so the
 *   script is idempotent (re-run = upsert) and --cleanup can delete them.
 * - Song boards are keyed by song_hash; the test songs use synthetic
 *   hashes (v1:…) that exist nowhere in any real library — the test
 *   players appear on the GLOBAL / MONTH / WEEK / DAILY boards and own
 *   "crowns" on their own synthetic songs, but never appear inside a
 *   real song's board (by design, no pollution of real song rankings
 *   apart from the global boards, where test entries are the point).
 */
import { createHash, randomBytes } from 'node:crypto';

const BASE = (process.env.LB_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.LB_KEY ?? '';
const CLEANUP = process.argv.includes('--cleanup');

if (!BASE || !KEY) {
  console.error('LB_URL / LB_KEY env vars required (set in the workflow from the repo secrets).');
  process.exit(1);
}

/** One shared fetch helper: JSON in/out, X-API-Key, non-2xx = hard fail. */
async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'X-API-Key': KEY,
      'Content-Type': 'application/json',
    },
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

const hex = (n) => randomBytes(n).toString('hex');
const nowSec = () => Math.floor(Date.now() / 1000);

// Guard: the server accepts exactly 8 or 12 chars A-Z0-9 — fail fast
// locally instead of burning a CI run on a 400 (happened with an 11-char
// code in the first attempt).
function assertValidSyncCode(code) {
  if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{12}$/.test(code)) {
    throw new Error(`sync_code '${code}' is not 8/12 chars A-Z0-9`);
  }
}

/**
 * Build a complete, valid anti-cheat proof for one score row.
 * tick model: golden songs distribute 70% of 10 000 over the ticks,
 * so points_per_tick = 7000 / totalTicks must be an exact short decimal.
 * Allowed totalTicks (7000/ticks is exact & <= 14 significant digits):
 * 200->35, 250->28, 350->20, 400->17.5, 500->14, 560->12.5
 */
function buildProof({ ticks, golden, notes, hit, miss, combo, score, acc, diff }) {
  const totalTicks = ticks;
  const goldenTicks = golden;
  const totalNotes = notes;
  const notesHit = hit;
  const notesMissed = miss;
  const maxCombo = combo;
  const accuracy = acc;
  const difficulty = diff;
  const pointsPerTick = 7000 / totalTicks; // exact per the table above
  const comboMultiplier = 1.8;             // within [1.0, 2.0]
  const chainLength = totalNotes;          // == hit+missed -> no chain_note_mismatch
  const proofTs = nowSec() - 25;           // fresh (<120s: no stale_proof, <300s: valid)
  const fingerprintVersion = 'v1';
  const fields = [
    totalTicks, goldenTicks, totalTicks - goldenTicks,
    pointsPerTick, comboMultiplier, totalNotes, 10000,
    hex(16), chainLength, proofTs,
    score, accuracy, maxCombo, notesHit, notesMissed, difficulty,
    fingerprintVersion,
  ];
  const integrityHash = createHash('sha256').update(fields.join('|')).digest('hex');
  return {
    total_note_ticks: totalTicks,
    golden_note_ticks: goldenTicks,
    normal_note_ticks: totalTicks - goldenTicks,
    points_per_tick: pointsPerTick,
    combo_multiplier: comboMultiplier,
    total_notes: totalNotes,
    max_possible_score: 10000,
    chain_root: fields[7],
    chain_length: chainLength,
    proof_ts: proofTs,
    fingerprint_version: fingerprintVersion,
    integrity_hash: integrityHash,
  };
}

// ── The fixed test cast (deterministic UUIDs + sync codes, 12 chars
//    from the unambiguous alphabet so the run is repeatable & cleanable).
const CAST = [
  {
    uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0001',
    syncCode: 'TESTMIA5X7Q2',
    name: 'TEST Mia', color: '#FF6B9D', country: 'DE',
    scores: [
      { song: 'v1:5eed5eed5eed5eed', gt: 's', ticks: 400, golden: 100, notes: 180, hit: 172, miss: 8, combo: 155, score: 9250, acc: 94.5, diff: 'normal' },
      { song: 'v1:5eed5eed5eed5eed', gt: 'd', ticks: 500, golden: 125, notes: 190, hit: 178, miss: 12, combo: 160, score: 8700, acc: 91.25, diff: 'normal' },
      { song: 'v1:cafe-cafe-cafe99', gt: 's', ticks: 560, golden: 140, notes: 210, hit: 196, miss: 14, combo: 175, score: 8150, acc: 89.5, diff: 'hard' },
    ],
    daily: [
      { type: 'score', metric: 8650, diff: 'normal', xp: 650 },
      { type: 'accuracy', metric: 93.5, diff: 'normal', xp: 420 },
    ],
    brWin: true,
  },
  {
    uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0002',
    syncCode: 'TESTBEN8W3Y4',
    name: 'TEST Ben', color: '#4ECDC4', country: 'AT',
    scores: [
      { song: 'v1:beef-beef-beef77', gt: 's', ticks: 250, golden: 60, notes: 120, hit: 110, miss: 10, combo: 105, score: 7800, acc: 88.75, diff: 'normal' },
      { song: 'v1:d00d-d00d-d00d11', gt: 'd', ticks: 400, golden: 100, notes: 180, hit: 165, miss: 15, combo: 150, score: 8350, acc: 90.5, diff: 'normal' },
    ],
    daily: [],
    brWin: false,
  },
  {
    uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0003',
    syncCode: 'TESTLUCA5E6F',
    name: 'TEST Luca', color: '#FFD93D', country: 'CH',
    scores: [
      { song: 'v1:d1ce-d1ce-d1ce44', gt: 's', ticks: 400, golden: 100, notes: 180, hit: 170, miss: 10, combo: 158, score: 8900, acc: 92.25, diff: 'normal' },
      { song: 'v1:ba5e-ba5e-ba5e66', gt: 's', ticks: 500, golden: 125, notes: 190, hit: 176, miss: 14, combo: 162, score: 8450, acc: 90.75, diff: 'normal' },
      { song: 'v1:facade-face-face88', gt: 'd', ticks: 250, golden: 60, notes: 120, hit: 108, miss: 12, combo: 100, score: 7950, acc: 88.5, diff: 'hard' },
    ],
    daily: [
      { type: 'combo', metric: 385, diff: 'normal', xp: 550 },
    ],
    brWin: true,
  },
  {
    uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0004',
    syncCode: 'TESTEMMA7G8H',
    name: 'TEST Emma', color: '#A78BFA', country: null, // no flag expected
    scores: [
      { song: 'v1:5eed-5eed-5eed2a', gt: 's', ticks: 560, golden: 140, notes: 210, hit: 190, miss: 20, combo: 168, score: 8600, acc: 91.25, diff: 'normal' },
      { song: 'v1:cafe-cafe-cafe2b', gt: 's', ticks: 350, golden: 70, notes: 160, hit: 146, miss: 14, combo: 132, score: 8050, acc: 89.25, diff: 'normal' },
    ],
    daily: [],
    brWin: false,
  },
  {
    uid: '7e57e57e-7e57-4e57-8e57-7e57e57e0005',
    syncCode: 'TESTNOAH9J2K',
    name: 'TEST Noah', color: '#6C5CE7', country: 'IT',
    scores: [
      { song: 'v1:d00d-d00d-d00d3c', gt: 's', ticks: 350, golden: 70, notes: 160, hit: 145, miss: 15, combo: 130, score: 8050, acc: 89.25, diff: 'normal' },
    ],
    daily: [
      { type: 'accuracy', metric: 88.75, diff: 'hard', xp: 380 },
    ],
    brWin: false,
  },
];

async function main() {
  console.log(`Leaderboard test seeder — ${BASE} — mode: ${CLEANUP ? 'CLEANUP' : 'SEED'}`);
  for (const p of CAST) assertValidSyncCode(p.syncCode); // fail fast, not in CI
  const info = await api('GET', '/info');
  console.log(`Server: ${info.name} v${info.version}`);
  if (info.version !== '3.6.2') {
    console.error(`  !! expected server v3.6.2 (R78 upsert fix) — index.php redeploy missing?`);
    process.exit(1);
  }

  // Preflight (R78): /health exercises the write path's stored procedure
  // (proc_call). Non-fatal — soft fetch, an older server just skips it.
  try {
    const res = await fetch(`${BASE}/health`, { headers: { 'X-API-Key': KEY } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const h = await res.json();
    const q = h.queries ?? {};
    const proc = q.proc_call
      ? (q.proc_call.ok ? 'ok' : `FAIL: ${q.proc_call.error}`)
      : 'absent (pre-R77 server)';
    console.log(`  /health v${h.api_version}: ok=${h.ok}, proc_call=${proc}`);
    for (const p of h.problems ?? []) console.log(`    problem: ${p}`);
  } catch {
    console.log('  /health unavailable (older server) — skipping preflight');
  }

  if (CLEANUP) {
    for (const p of CAST) {
      const r = await api('DELETE', `/profiles/${p.uid}`, { sync_code: p.syncCode });
      console.log(`  deleted ${p.name} (${p.uid}) -> ${r.deleted === p.uid ? 'ok' : 'unexpected'}`);
    }
  } else {
    for (const p of CAST) {
      // 1) register / upsert profile (fixed sync code keeps it idempotent)
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

      // 2) scores — each with a complete valid proof
      for (const s of p.scores) {
        const proof = buildProof(s);
        const r = await api('POST', '/scores', {
          profile_uid: p.uid,
          song_hash: s.song,
          game_type: s.gt,
          score: s.score,
          max_score: 10000,
          accuracy: s.acc,
          max_combo: s.combo,
          difficulty: s.diff,
          rating: s.acc >= 95 ? 'perfect' : s.acc >= 88 ? 'excellent' : 'good',
          notes_hit: s.hit,
          notes_missed: s.miss,
          sync_code: p.syncCode,
          nonce: hex(16),
          proof,
        });
        const bad = [];
        if (r.verified !== true) bad.push('NOT verified');
        if (r.flags?.length) bad.push(`flags: ${r.flags.join(',')}`);
        if (r.verification_note) bad.push(`note: ${r.verification_note}`);
        console.log(`    score ${s.song} ${s.gt} ${s.score} -> rank ${r.rank}, new_best ${r.is_new_best}${bad.length ? '  !! ' + bad.join(' | ') : ''}`);
        if (bad.length) process.exit(1);
      }

      // 3) daily challenge rows for today (UTC date is always <= server date)
      const today = new Date().toISOString().slice(0, 10);
      for (const dly of p.daily) {
        await api('POST', '/daily', {
          profile_uid: p.uid,
          challenge_date: today,
          challenge_type: dly.type,
          metric_value: dly.metric,
          difficulty: dly.diff,
          xp_earned: dly.xp,
          sync_code: p.syncCode,
        });
        console.log(`    daily ${dly.type}=${dly.metric} (${dly.diff}) ok`);
      }

      // 4) one BR win (nonce mandatory, 120s interval — one per run)
      if (p.brWin) {
        const r = await api('POST', '/br', {
          profile_uid: p.uid,
          sync_code: p.syncCode,
          won: true,
          nonce: hex(16),
        });
        console.log(`    br win -> counted=${r.counted} br_wins=${r.br_wins}`);
        if (!r.counted) process.exit(1);
      }
    }
  }

  // ── verification reads ──────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const windows = ['all', 'month', 'week'];
  console.log('--- verification (GET boards) ---');
  for (const w of windows) {
    const b = await api('GET', `/leaderboard/global?window=${w}&limit=50`);
    const test = b.leaderboard.filter((r) => r.display_name.startsWith('TEST '));
    console.log(`  window=${w}: ${test.length}/5 test players, total_players=${b.total_players}`);
    for (const t of test) {
      console.log(`    #${t.rank} ${t.display_name}  score=${t.total_score} best=${t.best_score} acc=${t.avg_accuracy} plays=${t.games_played} br=${t.br_wins}${t.country_code ? ' ' + t.country_code : ''}`);
    }
    if (CLEANUP ? test.length !== 0 : test.length !== 5) process.exit(1);
  }
  const daily = await api('GET', `/daily?date=${today}`);
  const dailyTest = (daily.leaderboard ?? []).filter((r) => r.display_name.startsWith('TEST '));
  console.log(`  daily ${today}: ${dailyTest.length} test rows`);
  for (const t of dailyTest) {
    console.log(`    #${t.rank} ${t.display_name} ${t.challenge_type}=${t.metric_value} (${t.difficulty})`);
  }
  const mia = CAST[0];
  const crowns = await api('GET', `/leaderboard/crowns?uid=${mia.uid}`);
  console.log(`  crowns(${mia.name}): ${crowns.crowns}`);
  console.log(CLEANUP ? 'CLEANUP COMPLETE — boards are test-free.' : 'SEED COMPLETE — boards carry the test cast.');
}

main().catch((e) => { console.error(e); process.exit(1); });
