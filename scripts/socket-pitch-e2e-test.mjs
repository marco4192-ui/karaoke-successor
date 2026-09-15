/**
 * E2E test for the new Socket.IO pitch pipeline:
 *   1. "Desktop" socket subscribes to the pitch feed (host:pitch-subscribe)
 *   2. "Phone" socket registers as companion and streams companion:pitch frames
 *   3. Assert: desktop receives instant 'pitch' pushes (full frame incl. note)
 *   4. Assert: HTTP getpitch returns the same frame (store parity / fallback)
 *   5. Assert: command routing unaffected — host:register still works
 */
import { io } from 'socket.io-client';

const URL = 'http://127.0.0.1:3000';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
};

const desktop = io(URL, { path: '/socket.io', transports: ['websocket'] });
const phone = io(URL, { path: '/socket.io', transports: ['websocket'] });

// Real phones connect via HTTP first (creates the mobileClients entry that
// getpitch requires), THEN register their socket with that clientId.
const connectRes = await fetch(URL + '/api/mobile?action=connect');
const connectData = await connectRes.json();
const clientId = connectData.clientId;
check('HTTP connect registered the companion', !!clientId, clientId);

let pushedFrames = [];
desktop.on('pitch', (event) => pushedFrames.push(event));

let subscribed = false;
desktop.on('host:pitch-subscribed', () => { subscribed = true; });

phone.on('connect', () => phone.emit('companion:register', { clientId, clientName: 'E2E Test' }));

await new Promise((r) => desktop.on('connect', r));
await new Promise((r) => phone.on('connect', r));
desktop.emit('host:pitch-subscribe');
await new Promise((r) => setTimeout(r, 500));

check('Desktop pitch-feed subscription confirmed', subscribed);

// Stream 5 frames with note data (the old handler dropped note → note: 0)
for (let i = 0; i < 5; i++) {
  phone.emit('companion:pitch', {
    frequency: 220 + i,
    note: 57 + i * 0.5,
    clarity: 0.8,
    volume: 0.4,
    timestamp: Date.now(),
    isSinging: true,
    singingConfidence: 0.9,
  });
  await new Promise((r) => setTimeout(r, 60));
}
await new Promise((r) => setTimeout(r, 400));

check('Desktop received pushed pitch frames', pushedFrames.length >= 4, `${pushedFrames.length}/5 frames`);
const first = pushedFrames[0];
check('Push payload has clientId', !!first?.clientId, first?.clientId);
check('Push payload preserves note (full frame)', typeof first?.data?.note === 'number' && first.data.note > 0, `note=${first?.data?.note}`);
check('Push payload has isSinging', first?.data?.isSinging === true);
check('Push payload has profile key', 'profile' in (first ?? {}));

// Store parity: HTTP getpitch must return the socket frame (fallback consumers)
const res = await fetch(URL + '/api/mobile?action=getpitch');
const data = await res.json();
const mine = data.pitches?.find((p) => p.clientId === clientId);
check('HTTP getpitch parity (same store)', !!mine?.data, `freq=${mine?.data?.frequency}, note=${mine?.data?.note}`);

// Latency measurement (push vs poll)
let t0 = Date.now();
let latency = null;
phone.emit('companion:pitch', { frequency: 440, note: 69, clarity: 0.9, volume: 0.5, timestamp: Date.now(), isSinging: true });
await new Promise((r) => {
  const timer = setTimeout(r, 2000);
  desktop.on('pitch', (e) => { if (e.data.frequency === 440) { latency = Date.now() - t0; clearTimeout(timer); r(); } });
});
check('Push latency < 100 ms', latency !== null && latency < 100, latency !== null ? `${latency} ms` : 'timeout');

// Command routing unaffected: register a real host and send a command
const cmdReceiver = io(URL, { path: '/socket.io', transports: ['websocket'] });
let gotCommand = false;
await new Promise((r) => cmdReceiver.on('connect', r));
cmdReceiver.emit('host:register');
cmdReceiver.on('command', (cmd) => { if (cmd.type === 'test-cmd') gotCommand = true; });
await new Promise((r) => setTimeout(r, 300));
phone.emit('companion:command', { type: 'test-cmd', timestamp: Date.now() });
await new Promise((r) => setTimeout(r, 500));
check('Command routing still works (host:register)', gotCommand);

// Cleanup
desktop.disconnect(); phone.disconnect(); cmdReceiver.disconnect();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
