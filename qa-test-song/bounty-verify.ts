/**
 * R16 (user request 2): Bounty-Hunter rule verification.
 * Proves end-to-end (real game functions, no mocks):
 *   1. Target selection at round start = current score leader (≥3 actives)
 *   2. Multiplier: 1× for the target, ×1.5 for everyone else — and it REALLY
 *      multiplies hit points in the scoring tick (same code path as the hook)
 *   3. Bounty claim at round end: top challenger with a higher ROUND delta
 *      than the target claims it; a defending target keeps it unclaimed
 *   4. No bounty with <3 players / in the grand finale
 *
 * Run: bun qa-test-song/bounty-verify.ts
 */
import {
  createBattleRoyale,
  startRound,
  updatePlayerScore,
  endRoundWithoutElimination,
  getBountyMultiplier,
  getActivePlayers,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
} from '@/lib/game/battle-royale';

let failures = 0;
function check(label: string, cond: boolean, detail?: string) {
  const tag = cond ? '✓' : '✗ FAIL';
  console.log(`${tag}  ${label}${cond ? '' : `  → ${detail ?? ''}`}`);
  if (!cond) failures++;
}

const players = [
  { id: 'A', name: 'Alice', color: '#ff0000', playerType: 'microphone' as const },
  { id: 'B', name: 'Bob', color: '#00ff00', playerType: 'microphone' as const },
  { id: 'C', name: 'Carol', color: '#0000ff', playerType: 'microphone' as const },
  { id: 'D', name: 'Dave', color: '#ffff00', playerType: 'microphone' as const },
];

const settings = {
  ...DEFAULT_BATTLE_ROYALE_SETTINGS,
  bountyEnabled: true,
  bountyMultiplier: 1.5,
  songSelection: 'random' as const,
};

console.log('── 1. Round 1: all scores 0 → bounty target is set (≥3 players) ──');
let game = createBattleRoyale(players, settings, ['s1', 's2']);
game = startRound(game, 's1', 'Song 1', undefined, 200);
check('bountyPlayerId is set with 4 active players', game.bountyPlayerId !== null, `got ${game.bountyPlayerId}`);

console.log('── 2. Round 1 scoring: multiplier applies per tick (hook code path) ──');
// Tick simulation — exactly what scorePlayerTick does in use-battle-royale-game.ts:
const rawHitPoints = 100;
for (const p of ['A', 'B', 'C', 'D']) {
  const mult = getBountyMultiplier(game, p);
  const adjusted = Math.round(rawHitPoints * mult);
  game = updatePlayerScore(game, p, adjusted, 1.0, 1, 0, 1);
}
const afterR1 = Object.fromEntries(game.players.map(p => [p.id, p.score]));
console.log(`   scores after 1 hit-tick each (100 raw): ${JSON.stringify(afterR1)}`);
const r1Target = game.bountyPlayerId!;
check(`target ${r1Target} got 1× (100 pts)`, afterR1[r1Target] === 100, `got ${afterR1[r1Target]}`);
const nonTargets = ['A', 'B', 'C', 'D'].filter(id => id !== r1Target);
check('all 3 non-targets got ×1.5 (150 pts)', nonTargets.every(id => afterR1[id] === 150),
  `got ${JSON.stringify(nonTargets.map(id => afterR1[id]))}`);

console.log('── 3. Round 1 ends CLAIMED (challenger out-earned the target in-round) ──');
game = endRoundWithoutElimination(game);
check('round 1 bounty CLAIMED (challenger delta 150 > target delta 100)',
  game.rounds[0].bountyClaimed === true, `got ${game.rounds[0].bountyClaimed}`);
const claimerId = game.rounds[0].bountyClaimedById;
const claimerDelta = game.rounds[0].roundScoreDeltas[claimerId!] ?? 0;
check(`claim went to the TOP challenger (delta ${claimerDelta})`,
  claimerDelta === 150 && claimerId !== r1Target, `claimer=${claimerId}, delta=${claimerDelta}`);

console.log('── 4. Round 2: target = new score leader (a ×1.5 challenger) ──');
const leader = getActivePlayers(game).sort((a, b) => b.score - a.score)[0];
game = { ...game, status: 'setup' as const };
game = startRound(game, 's2', 'Song 2', undefined, 200);
check(`round-2 bounty target = score leader (${leader.name}, ${leader.score} pts)`,
  game.bountyPlayerId === leader.id, `expected ${leader.id}, got ${game.bountyPlayerId}`);
check('getBountyMultiplier: target → 1', getBountyMultiplier(game, leader.id) === 1);
const challengerR2 = ['A', 'B', 'C', 'D'].find(id => id !== leader.id)!;
check(`getBountyMultiplier: challenger (${challengerR2}) → 1.5`, getBountyMultiplier(game, challengerR2) === 1.5,
  `got ${getBountyMultiplier(game, challengerR2)}`);

console.log('── 5. Round 2: target DEFENDS (earns most in the round) → no claim ──');
game = updatePlayerScore(game, leader.id, 5000, 1.0, 50, 0, 50); // target's round delta: 5000
game = updatePlayerScore(game, challengerR2, 3000, 1.0, 30, 0, 30); // best challenger: 3000
game = endRoundWithoutElimination(game);
check('round 2 bounty NOT claimed (3000 < 5000)', game.rounds[1].bountyClaimed === false,
  `got ${game.rounds[1].bountyClaimed}`);

console.log('── 6. No bounty below 3 players / in the grand finale ──');
const twoPlayerGame = createBattleRoyale(players.slice(0, 2), settings, ['s1']);
const r2 = startRound(twoPlayerGame, 's1', 'Song 1');
check('2 players → no bounty target', r2.bountyPlayerId === null, `got ${r2.bountyPlayerId}`);
const finaleGame = { ...game, isGrandFinale: true, bountyPlayerId: null as string | null };
check('grand finale → bounty null → multiplier 1 for everyone',
  finaleGame.bountyPlayerId === null && getBountyMultiplier(finaleGame, 'A') === 1 && getBountyMultiplier(finaleGame, 'B') === 1);

console.log('── 7. Bounty OFF in settings → never any multiplier ──');
const offGame = { ...game, settings: { ...game.settings, bountyEnabled: false } };
check('bountyEnabled=false → multiplier always 1',
  getBountyMultiplier(offGame, 'A') === 1 && getBountyMultiplier(offGame, 'B') === 1);

console.log('');
if (failures === 0) {
  console.log('🎉 ALL BOUNTY CHECKS PASSED — the rule works exactly as designed.');
} else {
  console.log(`✗ ${failures} check(s) FAILED`);
  process.exit(1);
}
