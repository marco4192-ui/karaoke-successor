/**
 * R19 (user decision): per-round score reset + tie-break showdown + coin flip.
 * Proves end-to-end with REAL game functions (no mocks):
 *
 *   1. PER-ROUND RESET: every round starts at 0 for all active players —
 *      the user's exact scenario (P1 2000, P2 1900, P3 1800, P4 1650, P5 out)
 *      no longer eliminates the best singer: with identical singing in round
 *      2, the actually weakest singer (P4) goes out.
 *   2. ROUND DELTAS: roundScoreDeltas = round points; eliminated players'
 *      deltas stay 0 in later rounds.
 *   3. RHYTHM TIE → SHOWDOWN: tied bottom at the elimination deadline → tie
 *      signal (no arbitrary elimination); after the 10s extension:
 *        • still tied → COIN FLIP (both players can lose — statistical check)
 *        • tie broken → the lower scorer goes out fairly
 *   4. ROUND-END TIE (medley path): endRoundAndEliminate coin-flips a tied
 *      bottom instead of using arbitrary tiebreakers.
 *   5. GRAND FINALE TIE: equal duel scores → coin flip decides the round win.
 *   6. detectRoundEndTie routing (full rounds → null, medley → elimination,
 *      finale duel → finale, 2 players + finale enabled → none).
 *
 * Run: bun qa-test-song/round-reset-verify.ts
 */
import {
  createBattleRoyale,
  startRound,
  updatePlayerScore,
  eliminateWeakestMidRound,
  endRoundWithoutElimination,
  endRoundAndEliminate,
  enterGrandFinale,
  detectRoundEndTie,
  resolveTieBreakElimination,
  startTieBreak,
  findEliminationTie,
  advanceToNextRound,
  getActivePlayers,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
  TIE_BREAK_EXTENSION_SECONDS,
} from '@/lib/game/battle-royale';

let failures = 0;
function check(label: string, cond: boolean, detail?: string) {
  const tag = cond ? '✓' : '✗ FAIL';
  console.log(`${tag}  ${label}${cond ? '' : `  → ${detail ?? ''}`}`);
  if (!cond) failures++;
}

const mic = (id: string, name: string) => ({ id, name, color: '#ff0000', playerType: 'microphone' as const });

console.log('── 1. PER-ROUND RESET — das Nutzer-Szenario ──');
{
  const players = [
    mic('A', 'P1'), mic('B', 'P2'), mic('C', 'P3'), mic('D', 'P4'),
    { id: 'E', name: 'P5', color: '#f0f', playerType: 'companion' as const, connectionCode: 'X1' },
  ];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1', 's2', 's3']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);

  // Round 1: the user's numbers
  const round1: Record<string, number> = { A: 2000, B: 1900, C: 1800, D: 1650 };
  for (const [id, delta] of Object.entries(round1)) {
    game = updatePlayerScore(game, id, delta, 1.0, 1, 0, 1);
  }
  // P5 (0 points, weakest) eliminated mid-round
  game = { ...game, status: 'playing' as const };
  const elim = eliminateWeakestMidRound(game);
  check('round 1: P5 (weakest, 0 points) is eliminated', !!elim && !('tie' in elim) && elim.eliminatedId === 'E',
    JSON.stringify(elim && 'eliminatedId' in elim ? elim.eliminatedId : elim));
  game = elim && !('tie' in elim) ? elim.game : game;

  // Real round transition (as the round-handlers hook drives it):
  // song ends → close round → advance → next round starts (RESET)
  game = endRoundWithoutElimination(game);
  game = advanceToNextRound(game);

  // Round 2 starts → RESET: everyone back to 0
  game = startRound(game, 's2', 'Song 2', undefined, 200);
  const scoresAfterReset = Object.fromEntries(getActivePlayers(game).map(p => [p.id, p.score]));
  check('round 2: all active players reset to 0', Object.values(scoresAfterReset).every(s => s === 0),
    JSON.stringify(scoresAfterReset));
  check('round 2: snapshot (previousRoundScores) is 0 for all actives',
    Object.entries(game.previousRoundScores).filter(([id]) => !game.players.find(p => p.id === id)?.eliminated).every(([, v]) => v === 0));
  check('round 2: eliminated P5 keeps frozen score (0)', game.players.find(p => p.id === 'E')!.score === 0);

  // Round 2: everyone sings EXACTLY as well as in round 1 (same raw deltas)
  for (const [id, delta] of Object.entries(round1)) {
    game = updatePlayerScore(game, id, delta, 1.0, 1, 0, 1);
  }
  const afterR2 = Object.fromEntries(getActivePlayers(game).map(p => [p.id, p.score]));
  console.log(`   scores round 2: ${JSON.stringify(afterR2)}`);

  const elim2 = eliminateWeakestMidRound(game);
  const eliminated2 = elim2 && !('tie' in elim2) ? elim2.eliminatedId : 'TIE!';
  check('round 2: P4 (actually weakest singer) is eliminated — NOT P1', eliminated2 === 'D', `got ${eliminated2}`);
  check('round 2: no tie signal (scores differ)', !!elim2 && !('tie' in elim2));

  // Deltas: close the round and verify roundScoreDeltas = round points
  game = elim2 && !('tie' in elim2) ? elim2.game : game;
  const closed = endRoundWithoutElimination(game);
  const deltas = closed.rounds[closed.rounds.length - 1].roundScoreDeltas;
  check('round 2 deltas = round points (A=2000, B=1900, C=1800, D=1650, E=0)',
    deltas.A === 2000 && deltas.B === 1900 && deltas.C === 1800 && deltas.D === 1650 && deltas.E === 0,
    JSON.stringify(deltas));
}

console.log('\n── 2. ALL-ZERO TIE (Instrumental-Intro) → Showdown (einheitliche Regel) ──');
{
  const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
  let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  game = { ...game, status: 'playing' as const };
  const result = eliminateWeakestMidRound(game);
  check('all-zero: tie signal instead of arbitrary kill',
    !!result && 'tie' in result && result.tie && result.tiedIds.length === 3,
    JSON.stringify(result && 'tiedIds' in result ? result.tiedIds : result));
}

console.log('\n── 3. SHOWDOWN: 10s Extension → danach Entscheidung ──');
{
  // 3a. STILL TIED after the extension → coin flip (statistical: both lose sometimes)
  const flips = { A: 0, B: 0 };
  let lastByCoinFlip = false;
  for (let i = 0; i < 100; i++) {
    const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
    let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
    game = startRound(game, 's1', 'Song 1', undefined, 200);
    game = { ...game, status: 'playing' as const };
    // A and B tied at the bottom (50), C safe (500)
    game = updatePlayerScore(game, 'A', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'B', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'C', 500, 1.0, 1, 0, 1);

    const tie = findEliminationTie(game);
    if (!tie || tie.length !== 2 || !tie.includes('A') || !tie.includes('B')) {
      check('tie detection: A+B tied at bottom', false, JSON.stringify(tie));
      break;
    }
    let showdown = startTieBreak(game, tie);
    check('startTieBreak: extension is 10s', TIE_BREAK_EXTENSION_SECONDS === 10);
    check('startTieBreak: game.tieBreak set with both contenders',
      !!showdown.tieBreak && showdown.tieBreak.playerIds.includes('A') && showdown.tieBreak.playerIds.includes('B'));

    // Nobody scores during the extension → deadline passes → resolve
    showdown = { ...showdown, tieBreak: { ...showdown.tieBreak!, until: Date.now() - 1 } };
    const res = resolveTieBreakElimination(showdown);
    if (!res) { check('resolution returns a result', false); break; }
    if (!res.eliminatedId) { check('coin flip eliminates someone', false); break; }
    flips[res.eliminatedId as 'A' | 'B']++;
    lastByCoinFlip = res.byCoinFlip;
    if (res.byCoinFlip !== true) { check('still-tied → byCoinFlip = true', false, String(res.byCoinFlip)); break; }
    if (!['A', 'B'].includes(res.eliminatedId)) { check('coin flip only hits tied players', false, res.eliminatedId); break; }
    check('showdown cleared after resolution', res.game.tieBreak === null);
    break; // structure checks once; statistics loop below
  }
  // Statistical: 200 flips
  let aWins = 0, bWins = 0;
  for (let i = 0; i < 200; i++) {
    const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
    let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
    game = startRound(game, 's1', 'Song 1', undefined, 200);
    game = { ...game, status: 'playing' as const };
    game = updatePlayerScore(game, 'A', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'B', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'C', 500, 1.0, 1, 0, 1);
    game = startTieBreak(game, ['A', 'B']);
    game = { ...game, tieBreak: { ...game.tieBreak!, until: Date.now() - 1 } };
    const res = resolveTieBreakElimination(game)!;
    if (res.eliminatedId === 'A') aWins++; else if (res.eliminatedId === 'B') bWins++;
  }
  console.log(`   coin flip distribution over 200 runs: A eliminated ${aWins}×, B eliminated ${bWins}×`);
  check('coin flip is random (both outcomes occur, roughly balanced)',
    aWins > 60 && bWins > 60, `A=${aWins} B=${bWins}`);
  check('last coin flip was flagged byCoinFlip', lastByCoinFlip === true);

  // 3b. Tie BROKEN during the extension → the lower scorer goes out fairly
  {
    const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
    let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
    game = startRound(game, 's1', 'Song 1', undefined, 200);
    game = { ...game, status: 'playing' as const };
    game = updatePlayerScore(game, 'A', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'B', 50, 1.0, 1, 0, 1);
    game = updatePlayerScore(game, 'C', 500, 1.0, 1, 0, 1);
    game = startTieBreak(game, ['A', 'B']);
    // During the extension: A scores, B does not
    game = updatePlayerScore(game, 'A', 120, 1.0, 1, 0, 1);
    game = { ...game, tieBreak: { ...game.tieBreak!, until: Date.now() - 1 } };
    const res = resolveTieBreakElimination(game)!;
    check('tie broken in extension → B (lower) eliminated fairly', res.eliminatedId === 'B' && res.byCoinFlip === false,
      `got ${res.eliminatedId}, byCoinFlip=${res.byCoinFlip}`);
    check('safe contender C survives the showdown', !res.game.players.find(p => p.id === 'C')!.eliminated);
  }

  // 3c. resolve before the deadline is a no-op (unless forced)
  {
    const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
    let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
    game = startRound(game, 's1', 'Song 1', undefined, 200);
    game = startTieBreak(game, ['A', 'B']);
    const premature = resolveTieBreakElimination(game);
    check('resolution before the deadline: no-op (null)', premature === null);
    const forced = resolveTieBreakElimination(game, true);
    check('forced resolution works (song ended mid-showdown)', !!forced && forced.eliminatedId !== null);
  }
}

console.log('\n── 4. RUNDENENDE (Medley-Pfad): Tie → Münzwurf in endRoundAndEliminate ──');
{
  const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, medleyMode: true, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1', 's2']);
  game = startRound(game, 's1', 'Song 1',
    [{ songId: 's1', songName: 'Song 1' }, { songId: 's2', songName: 'Song 2' }]);
  check('medley round type', game.rounds[0].roundType === 'medley');
  game = { ...game, status: 'playing' as const }; // round 1 starts in 'countdown' — simulate the playing phase

  // A and B tied at the bottom at round end
  game = updatePlayerScore(game, 'A', 300, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'B', 300, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'C', 900, 1.0, 1, 0, 1);

  const tie = detectRoundEndTie(game);
  check('detectRoundEndTie: medley + tied bottom → elimination showdown',
    !!tie && tie.kind === 'elimination' && tie.tiedIds.length === 2, JSON.stringify(tie));

  // Showdown over (expired) → round ends → endRoundAndEliminate coin-flips
  game = startTieBreak(game, tie!.tiedIds);
  game = { ...game, tieBreak: { ...game.tieBreak!, until: Date.now() - 1 } };
  const ended = endRoundAndEliminate(game);
  const eliminatedId = ended.rounds[ended.rounds.length - 1].eliminatedPlayerId;
  check('round end with standing tie → coin flip eliminates A or B',
    eliminatedId === 'A' || eliminatedId === 'B', `got ${eliminatedId}`);
  check('coin-flip elimination flagged in the round highlight',
    ended.gameStats.roundHighlights[ended.gameStats.roundHighlights.length - 1].byCoinFlip === true);
  check('tieBreak cleared when the round closed', ended.tieBreak === null);
}

console.log('\n── 5. GRAND FINALE: Punkte-Gleichstand → Münzwurf entscheidet die Runde ──');
{
  const players = [mic('A', 'Alice'), mic('B', 'Bob')];
  const settings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, grandFinaleBestOf: 3 as const, songSelection: 'random' as const };
  let game = createBattleRoyale(players, settings, ['s1', 's2']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  game = updatePlayerScore(game, 'A', 1000, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'B', 500, 1.0, 1, 0, 1);
  game = { ...game, status: 'playing' as const };
  game = endRoundAndEliminate(game); // 2 players + finale → enters grand finale
  check('grand finale entered with 2 players', game.isGrandFinale === true);

  // Real finale flow: intro → setup → finale round (scores reset)
  game = advanceToNextRound(game); // → 'grand-finale-intro'
  game = advanceToNextRound(game); // → 'setup'
  game = startRound(game, 's2', 'Song 2', undefined, 200); // finale round
  check('finale round starts at 0 (reset)', getActivePlayers(game).every(p => p.score === 0));
  game = updatePlayerScore(game, 'A', 700, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'B', 700, 1.0, 1, 0, 1); // EXACT tie

  const duelTie = detectRoundEndTie(game);
  check('detectRoundEndTie: finale duel tie → finale showdown',
    !!duelTie && duelTie.kind === 'finale' && duelTie.tiedIds.length === 2, JSON.stringify(duelTie));

  // Showdown expired, still tied → round ends → coin flip decides the round WIN
  game = startTieBreak(game, duelTie!.tiedIds);
  game = { ...game, tieBreak: { ...game.tieBreak!, until: Date.now() - 1 } };
  const ended = endRoundAndEliminate(game);
  const winnerId = ended.gameStats.roundHighlights[ended.gameStats.roundHighlights.length - 1].topScorerId;
  check('finale tie → coin flip decides the round win (A or B)',
    winnerId === 'A' || winnerId === 'B', `got ${winnerId}`);
  check('finale coin-flip flagged in the highlight',
    ended.gameStats.roundHighlights[ended.gameStats.roundHighlights.length - 1].byCoinFlip === true);
  check('finalWins credited to the coin-flip winner', (ended.finalWins[winnerId!] ?? 0) === 1);
}

console.log('\n── 6. detectRoundEndTie Routing ──');
{
  // Full-song rhythm round → null (eliminations run on the ticker, song end is just a song change)
  const players = [mic('A', 'Alice'), mic('B', 'Bob'), mic('C', 'Carol')];
  let game = createBattleRoyale(players, DEFAULT_BATTLE_ROYALE_SETTINGS, ['s1']);
  game = startRound(game, 's1', 'Song 1', undefined, 200);
  game = { ...game, status: 'playing' as const };
  game = updatePlayerScore(game, 'A', 100, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'B', 100, 1.0, 1, 0, 1);
  game = updatePlayerScore(game, 'C', 100, 1.0, 1, 0, 1);
  check('full rhythm round: no round-end tie (even when all tied)',
    detectRoundEndTie(game) === null);

  // 2 players + finale enabled → finale ENTRY, no elimination pending → null
  const finaleSettings = { ...DEFAULT_BATTLE_ROYALE_SETTINGS, grandFinaleBestOf: 3 as const };
  const medleySettings = { ...finaleSettings, medleyMode: true };
  let g2 = createBattleRoyale([mic('A', 'Alice'), mic('B', 'Bob')], medleySettings, ['s1', 's2']);
  g2 = startRound(g2, 's1', 'Song 1', [{ songId: 's1', songName: 'S1' }, { songId: 's2', songName: 'S2' }]);
  g2 = { ...g2, status: 'playing' as const };
  g2 = updatePlayerScore(g2, 'A', 100, 1.0, 1, 0, 1);
  g2 = updatePlayerScore(g2, 'B', 100, 1.0, 1, 0, 1);
  check('2 players + finale enabled: no showdown (finale entry decides)',
    detectRoundEndTie(g2) === null);
}

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECKS FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
