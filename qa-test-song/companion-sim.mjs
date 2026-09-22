/**
 * Fake companion connections for BR QA: connects one HTTP mobile client per
 * profile and links it, then heartbeats every 30s so `connected` stays fresh.
 * Usage: node qa-test-song/companion-sim.mjs <profileJson> [pitchNote]
 *   profileJson: [{"id":"...","name":"Alice","color":"#FF6B6B"}, ...]
 *   pitchNote:  optional MIDI note (e.g. 60). When set, every client also
 *               streams pitch frames at 10Hz (frequency + note + clarity +
 *               volume) — the BR host polls them into companion scoring, so
 *               companion players hit every note within ±2 semitones.
 */
const BASE = 'http://127.0.0.1:3000';
const profiles = JSON.parse(process.argv[2] || '[]');
const pitchNote = process.argv[3] ? Number(process.argv[3]) : null;

const clients = [];
for (const p of profiles) {
  const fakeIp = `10.77.0.${profiles.indexOf(p) + 10}`;
  const res = await fetch(`${BASE}/api/mobile?action=connect`, { headers: { 'X-Forwarded-For': fakeIp } });
  const data = await res.json();
  const clientId = data.clientId;
  if (!clientId) { console.error('connect failed for', p.name, data); process.exit(1); }
  const link = await fetch(`${BASE}/api/mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'profile',
      clientId,
      payload: { id: p.id, name: p.name, color: p.color, avatar: '' },
    }),
  });
  const linkData = await link.json();
  console.log(`linked ${p.name} → client ${clientId.slice(0, 8)} (${linkData.success ? 'ok' : JSON.stringify(linkData)})`);
  clients.push({ clientId, name: p.name, fakeIp });
}

// Heartbeat loop — keeps all clients "connected" until killed
console.log('heartbeat loop started (30s interval) — PID', process.pid);
if (pitchNote != null && Number.isFinite(pitchNote)) {
  console.log(`pitch stream active: note ${pitchNote} (${(440 * Math.pow(2, (pitchNote - 69) / 12)).toFixed(2)} Hz) @4Hz`);
}
setInterval(async () => {
  for (const c of clients) {
    try {
      await fetch(`${BASE}/api/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': c.fakeIp },
        body: JSON.stringify({ type: 'heartbeat', clientId: c.clientId }),
      });
    } catch { /* server restarting */ }
  }
}, 30_000);

// Optional pitch stream (10Hz) — feeds companion scoring + the note strips
if (pitchNote != null && Number.isFinite(pitchNote)) {
  const frequency = 440 * Math.pow(2, (pitchNote - 69) / 12);
  setInterval(async () => {
    for (const c of clients) {
      try {
        await fetch(`${BASE}/api/mobile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': c.fakeIp },
          body: JSON.stringify({
            type: 'pitch',
            clientId: c.clientId,
            payload: { frequency, note: pitchNote, clarity: 0.92, volume: 0.5, timestamp: Date.now() },
          }),
        });
      } catch { /* server restarting */ }
    }
  }, 250);
}
