// R85 E2E verification — inspect all local traces after removals
(() => {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const store = JSON.parse(localStorage.getItem('karaoke-successor-storage') || '{}');
  const profiles = (store.state?.profiles || []).map(p => `${p.name}(${p.id})`);
  const hsPlayers = (store.state?.highscores || []).map(h => h.playerId);
  const keys = Object.keys(localStorage);
  const partyKeys = keys.filter(k => k.includes('party-guest'));
  const localKeys = keys.filter(k => k.includes('local-guest'));
  const best = JSON.parse(localStorage.getItem('karaoke_daily_best_results') || '{}');
  const slotScores = JSON.parse(localStorage.getItem('karaoke_daily_slot_scores_' + today) || '[]');
  const dailyLb = JSON.parse(localStorage.getItem('dailyChallengeLeaderboard_' + today) || '{"entries":[]}');
  const weeklyKey = keys.find(k => k.startsWith('karaoke_weekly_challenge_'));
  const weekly = weeklyKey ? JSON.parse(localStorage.getItem(weeklyKey) || '{"entries":[]}') : { entries: [] };
  const outbox = JSON.parse(localStorage.getItem('karaoke-score-outbox') || '{"entries":[]}');
  return JSON.stringify({
    profiles,
    activeProfileId: store.state?.activeProfileId ?? null,
    hsPlayers,
    partyTraces: partyKeys,
    localTraces: localKeys,
    bestResultPlayers: Object.keys(best),
    slotScorePlayers: slotScores.map(s => s.playerId),
    dailyLbPlayers: (dailyLb.entries || []).map(e => e.playerId),
    weeklyPlayers: (weekly.entries || []).map(e => e.playerId),
    outboxUids: (outbox.entries || []).map(e => e.payload.profile_uid),
  }, null, 1);
})()
