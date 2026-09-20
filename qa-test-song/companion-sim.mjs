/**
 * Fake companion connections for BR QA: connects one HTTP mobile client per
 * profile and links it, then heartbeats every 30s so `connected` stays fresh.
 * Usage: node qa-test-song/companion-sim.mjs <profileJson>
 *   profileJson: [{"id":"...","name":"Alice","color":"#FF6B6B"}, ...]
 */
const BASE = 'http://127.0.0.1:3000';
const profiles = JSON.parse(process.argv[2] || '[]');

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
setInterval(async () => {
  for (const c of clients) {
    try {
      await fetch(`${BASE}/api/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'heartbeat', clientId: c.clientId }),
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': c.fakeIp },
      });
    } catch { /* server restarting */ }
  }
}, 30_000);
