/**
 * R17 (user request): Bounty fairness analysis.
 *
 * The user's critique, mathematically verified with REAL game functions:
 *   "After round 1: P1=2000 (leader), P2=1900, P3=1800, P4=1650, P5 out.
 *    If everyone except P1 is boosted ×1.5 and all sing EXACTLY as well as
 *    before (P1 still the best singer), P1 is eliminated."
 *
 * Scenarios:
 *   1. FLAT (current system) with the user's exact numbers → P1 eliminated
 *      despite being the best singer. Critique CONFIRMED.
 *   2. Round-1 flaw: with all scores 0 the "leader" (bounty target) is the
 *      arbitrarily first-listed player → everyone else gets ×1.5 in round 1
 *      for no reason at all.
 *   3. SLIDING proposal (gap-proportional multiplier) with the same numbers
 *      → ranking preserved, the actual worst singer is eliminated.
 *   4. Big-gap catch-up under the sliding proposal → boost scales with need.
 *   5. Fairness guarantee of the sliding formula (overtake threshold).
 *
 * Run: bun qa-test-song/bounty-fairness-analysis.ts
 */
import {
  createBattleRoyale,
  startRound,
  updatePlayerScore,
  eliminateWeakestMidRound,
  getBountyMultiplier,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
} from '@/lib/game/battle-royale';

const M = 1.5; // configured max multiplier (settings.bountyMultiplier)

// ── Proposed sliding formula (Vorschlag 1) ──────────────────────────────
// mult_i = 1 + (M − 1) · min(1, gap_i / leaderScore),  gap_i = L − score_i
// Round 1 / all-equal guard: leaderScore ≤ 0 → mult = 1 for everyone.
function slidingMult(gap: number, leaderScore: number, maxMult: number): number {
  if (leaderScore <= 0 || gap <= 0) return 1;
  const rel = Math.min(1, gap / leaderScore);
  return 1 + (maxMult - 1) * rel;
}

function fmt(n: number): string {
  return n.toLocaleString('de-DE');
}

function printScoreTable(title: string, rows: Array<{ name: string; before: number; raw: number; mult: number; after: number }>) {
  console.log(`\n   ${title}`);
  console.log('   ' + 'Spieler'.padEnd(9) + 'Vorher'.padStart(8) + 'Raw-Runde'.padStart(11) + 'Mult'.padStart(7) + 'Danach'.padStart(9) + '  Rang');
  const sorted = [...rows].sort((a, b) => b.after - a.after);
  rows.forEach(r => {
    const rank = sorted.findIndex(s => s.name === r.name) + 1;
    const flag = rank === sorted.length ? '  ← ELIMINIERT' : '';
    console.log('   ' + r.name.padEnd(9) + fmt(r.before).padStart(8) + fmt(r.raw).padStart(11)
      + ('×' + r.mult.toFixed(3)).padStart(7) + fmt(r.after).padStart(9) + `  #${rank}${flag}`);
  });
}

// ── Shared setup: the user's exact post-round-1 situation ───────────────
// A=2000 (leader), B=1900, C=1800, D=1650, E already eliminated.
function setupUserScenario() {
  const players = [
    { id: 'A', name: 'P1', color: '#ff0000', playerType: 'microphone' as const },
    { id: 'B', name: 'P2', color: '#00ff00', playerType: 'microphone' as const },
    { id: 'C', name: 'P3', color: '#0000ff', playerType: 'microphone' as const },
    { id: 'D', name: 'P4', color: '#ffff00', playerType: 'microphone' as const },
    { id: 'E', name: 'P5', color: '#ff00ff', playerType: 'companion' as const, connectionCode: 'X1' },
  ];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, bountyEnabled: true, bountyMultiplier: M, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1', 's2', 's3']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  // Round-1 result per the user's example (raw deltas from round 1)
  const round1: Record<string, number> = { A: 2000, B: 1900, C: 1800, D: 1650, E: 0 };
  for (const [id, delta] of Object.entries(round1)) {
    if (delta > 0) game = updatePlayerScore(game, id, delta, 1.0, 1, 0, 1);
  }
  // Eliminate P5 (weakest, score 0) mid-round — status must be 'playing'
  game = { ...game, status: 'playing' as const };
  const elim = eliminateWeakestMidRound(game);
  if (elim) game = elim.game;
  // Round 2 starts → bounty target = current leader (A)
  game = startRound(game, 's2', 'Song 2', undefined, 200);
  return game;
}

// ════════════════════════════════════════════════════════════════════════
console.log('══ 1. FLAT (AKTUELLES SYSTEM) — Beispiel des Nutzers ══');
{
  let game = setupUserScenario();
  const target = game.bountyPlayerId!;
  console.log(`\n   Runde 2 · Kopfgeld-Ziel: ${game.players.find(p => p.id === target)!.name} (Führender, ×1.0), alle anderen ×${M}`);

  // Everyone sings EXACTLY as well as in round 1 (same raw deltas)
  const rawDeltas: Record<string, number> = { A: 2000, B: 1900, C: 1800, D: 1650 };
  const rows: Array<{ name: string; before: number; raw: number; mult: number; after: number }> = [];
  for (const p of game.players.filter(p => !p.eliminated)) {
    const before = p.score;
    const mult = getBountyMultiplier(game, p.id); // REAL game function
    const raw = rawDeltas[p.id];
    const after = before + Math.round(raw * mult);
    game = updatePlayerScore(game, p.id, Math.round(raw * mult), 1.0, 1, 0, 1);
    rows.push({ name: p.name, before, raw, mult, after });
  }
  printScoreTable('Alle singen exakt wie in Runde 1 — P1 ist vom Gesang her der Beste:', rows);

  const elim = eliminateWeakestMidRound(game);
  const eliminated = elim ? game.players.find(p => p.id === elim.eliminatedId)!.name : '—';
  console.log(`\n   → ELIMINIERT WIRD: ${eliminated}  ${eliminated === 'P1' ? '❌ DER BESTE SÄNGER FLIEGT — Kritik bestätigt' : ''}`);
}

// ════════════════════════════════════════════════════════════════════════
console.log('\n══ 2. RUNDEN-1-LÜCKE (weiterer Fairness-Bug des flachen Systems) ══');
{
  const players = [
    { id: 'A', name: 'Alice', color: '#ff0000', playerType: 'microphone' as const },
    { id: 'B', name: 'Bob', color: '#00ff00', playerType: 'microphone' as const },
    { id: 'C', name: 'Carol', color: '#0000ff', playerType: 'microphone' as const },
  ];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, bountyEnabled: true, bountyMultiplier: M, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  const target = game.bountyPlayerId!;
  const targetName = game.players.find(p => p.id === target)!.name;
  const others = game.players.filter(p => !p.eliminated && p.id !== target).map(p => `${p.name}=×${getBountyMultiplier(game, p.id)}`);
  console.log(`\n   Runde 1, alle 0 Punkte → "Führender" ist beliebig ${targetName} (erster in der Liste)`);
  console.log(`   ${others.join(', ')} — die ganze erste Runde lang, ohne jeden Grund.`);
  console.log('   Under the sliding formula all multipliers would be ×1.000 here (leaderScore=0 guard).');
}

// ════════════════════════════════════════════════════════════════════════
console.log('\n══ 3. VORSCHLAG 1: GLEITENDER MULTIPLIKATOR — gleiches Beispiel ══');
{
  let game = setupUserScenario();
  const target = game.bountyPlayerId!;
  const leader = game.players.find(p => p.id === target)!;
  console.log(`\n   Runde 2 · Kopfgeld-Ziel: ${leader.name} (${fmt(leader.score)} Punkte)`);
  console.log('   Formel: mult = 1 + (M−1) · min(1, Rückstand / Führender-Punkte)');

  const rawDeltas: Record<string, number> = { A: 2000, B: 1900, C: 1800, D: 1650 };
  const rows: Array<{ name: string; before: number; raw: number; mult: number; after: number }> = [];
  for (const p of game.players.filter(p => !p.eliminated)) {
    const before = p.score;
    const gap = leader.score - before;
    const mult = slidingMult(gap, leader.score, M);
    const raw = rawDeltas[p.id];
    const after = before + Math.round(raw * mult);
    game = updatePlayerScore(game, p.id, Math.round(raw * mult), 1.0, 1, 0, 1);
    rows.push({ name: p.name, before, raw, mult, after });
  }
  printScoreTable('Alle singen exakt wie in Runde 1 — Rangfolge bleibt erhalten:', rows);

  const elim = eliminateWeakestMidRound(game);
  const eliminated = elim ? game.players.find(p => p.id === elim.eliminatedId)!.name : '—';
  console.log(`\n   → ELIMINIERT WIRD: ${eliminated}  ${eliminated === 'P4' ? '✅ der tatsächlich schwächste Sänger — gerecht' : ''}`);
}

// ════════════════════════════════════════════════════════════════════════
console.log('\n══ 4. GROSSER RÜCKSTAND — Aufholjagd funktioniert weiterhin ══');
{
  const players = [
    { id: 'A', name: 'Leader', color: '#ff0000', playerType: 'microphone' as const },
    { id: 'B', name: 'P2', color: '#00ff00', playerType: 'microphone' as const },
    { id: 'C', name: 'P3', color: '#0000ff', playerType: 'microphone' as const },
  ];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, bountyEnabled: true, bountyMultiplier: M, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1', 's2', 's3']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  const startScores: Record<string, number> = { A: 6000, B: 2000, C: 1000 };
  for (const [id, delta] of Object.entries(startScores)) game = updatePlayerScore(game, id, delta, 1.0, 1, 0, 1);

  console.log(`\n   Start: Leader=${fmt(6000)}, P2=${fmt(2000)} (Rückstand 67%), P3=${fmt(1000)} (Rückstand 83%)`);
  for (let round = 2; round <= 4; round++) {
    game = startRound(game, `s${round}`, `Song ${round}`, undefined, 200);
    const leader = game.players.reduce((a, b) => (a.score > b.score ? a : b));
    const line: string[] = [];
    for (const p of game.players.filter(p => !p.eliminated)) {
      const gap = leader.score - p.score;
      const mult = slidingMult(gap, leader.score, M);
      // everyone sings equally (raw 1000 per round)
      game = updatePlayerScore(game, p.id, Math.round(1000 * mult), 1.0, 1, 0, 1);
      line.push(`${p.name}: ×${mult.toFixed(3)} → ${fmt(game.players.find(x => x.id === p.id)!.score)}`);
    }
    console.log(`   Runde ${round} (alle raw 1000): ${line.join(' · ')}`);
  }
  const final = game.players.filter(p => !p.eliminated).map(p => `${p.name}=${fmt(p.score)}`);
  console.log(`   → Rückstand schrumpft spürbar (${final.join(', ')}), ohne dass die Führung kippt: Aufholjagd ohne Willkür.`);
}

// ════════════════════════════════════════════════════════════════════════
console.log('\n══ 5. FAIRNESS-GARANTIE der Gleitformel ══');
{
  // Equal-singing overtake condition: raw round delta d > L / (M − 1).
  // With L=2000, M=1.5 → d > 4000 raw points in ONE round while the leader
  // also earns 2000+ — i.e. the challenger must sing more than TWICE as
  // well as the leader for the lead to flip. Then the overtake is deserved.
  const L = 2000;
  const threshold = L / (M - 1);
  console.log(`\n   Bei Punktgleichem Gesang überholt ein Challenger den Führenden nur,`);
  console.log(`   wenn seine Raw-Runde > L/(M−1) = ${fmt(L)}/0.5 = ${fmt(threshold)} Punkte ist —`);
  console.log(`   also mehr als das Doppelte der Führenden-Punktzahl in EINER Runde.`);
  console.log('   Flaches System: jede noch so kleine Führung kippt sofort (Runden-Delta × 0.5 > 0 ist immer wahr).');
}

console.log('\n══════════════════════════════════════════════════════════');
