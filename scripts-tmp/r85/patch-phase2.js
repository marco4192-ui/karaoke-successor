// R85 E2E phase 2 — runs AFTER app boot so the app-initialized weekly key is
// patched (not clobbered). Adds: weekly entries + 2 queued outbox uploads.
(() => {
  const now = Date.now();
  const keys = Object.keys(localStorage);
  const weeklyKey = keys.find(k => k.startsWith('karaoke_weekly_challenge_'));
  if (weeklyKey) {
    const weekly = JSON.parse(localStorage.getItem(weeklyKey));
    weekly.entries = [
      { playerId: 'party-guest-online', playerName: 'PartyGast', playerColor: '#ec4899', slot: 0, metric: 9100, completedAt: now },
      { playerId: 'local-guest', playerName: 'LokalerGast', playerColor: '#22c55e', slot: 0, metric: 5200, completedAt: now },
    ];
    localStorage.setItem(weeklyKey, JSON.stringify(weekly));
  }

  const mkPayload = (n) => ({
    profile_uid: 'uid-party-guest',
    sync_code: 'AB12CD34EF56',
    song_hash: 'e2e-hash-' + n,
    game_type: 's',
    score: 8000 + n,
    max_score: 10000,
    accuracy: 85.2,
    max_combo: 40,
    difficulty: 'easy',
    rating: 'great',
    notes_hit: 80,
    notes_missed: 10,
  });
  const mkProof = (n) => ({
    scoringMeta: { totalNoteTicks: 200, goldenNoteTicks: 20, normalNoteTicks: 180, pointsPerTick: 10, comboMultiplier: 2, totalNotes: 90 },
    noteResults: [{ noteIdx: 0, ticksHit: 2, totalTicks: 2, isGolden: false, wasPerfect: true }],
  });
  localStorage.setItem('karaoke-score-outbox', JSON.stringify({
    entries: [
      { queuedAt: now - 60000, attempts: 0, payload: mkPayload(1), proofInputs: mkProof(1) },
      { queuedAt: now - 30000, attempts: 0, payload: mkPayload(2), proofInputs: mkProof(2) },
    ],
  }));
  return 'PATCHED weekly=' + (weeklyKey || 'none') + ' outbox=2';
})()
