/**
 * R84 E2E seed builder — constructs the localStorage payloads + the mocked
 * /scores/batch response for the agent-browser verification of the online
 * boards (session cache, per_difficulty client-side chips, refresh button).
 *
 * Uses the APP'S OWN fingerprint code (songHashFromSong) so the mocked board
 * keys match what the client will request.
 *
 * Output: /tmp/r84-e2e-seed.json
 */
import { songHashFromSong } from '../src/lib/leaderboard/song-fingerprint';
import type { Song, HighscoreEntry } from '../src/types/game';

// Tiny 1-color SVG covers as data URIs
const cover = (c1: string, c2: string, label: string) =>
  'data:image/svg+xml;base64,' + Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="68" font-size="28" fill="white" text-anchor="middle" font-family="sans-serif">${label}</text></svg>`
  ).toString('base64');

let noteSeq = 0;
function note(pitch: number, startTime: number, duration: number, text: string, golden = false, player?: 'P1' | 'P2') {
  return {
    id: `n${++noteSeq}`,
    pitch,
    frequency: 440 * Math.pow(2, (pitch - 69) / 12),
    startTime,
    duration,
    lyric: text,
    isBonus: false,
    isGolden: golden,
    ...(player ? { player } : {}),
  };
}
function line(id: string, text: string, startTime: number, endTime: number, notes: ReturnType<typeof note>[], player?: 'P1' | 'P2') {
  return { id, text, startTime, endTime, notes, ...(player ? { player } : {}) };
}

// ── 3 songs: 2 solo + 1 duet ──
const songA: Song = {
  id: 'e2e-song-a', title: 'Neon Skyline', artist: 'The Voltage', bpm: 240, duration: 180000,
  difficulty: 'easy', rating: 3, gap: 0, lyrics: [
    line('a1', 'Neon lights they call my name', 1000, 6000, [
      note(64, 1000, 400, 'Neon'), note(67, 1500, 400, 'lights'), note(69, 2000, 500, 'they'), note(67, 2600, 400, 'call'), note(64, 3100, 600, 'my'), note(62, 3800, 900, 'name'),
    ]),
    line('a2', 'Running through the rain', 7000, 12000, [
      note(64, 7000, 400, 'Run'), note(65, 7500, 400, 'ning'), note(67, 8000, 500, 'through', true), note(69, 8700, 400, 'the'), note(71, 9200, 800, 'rain'),
    ]),
  ],
  coverImage: cover('#7c3aed', '#06b6d4', 'A'),
} as unknown as Song;

const songB: Song = {
  id: 'e2e-song-b', title: 'Midnight Coffee', artist: 'Luna Parker', bpm: 200, duration: 210000,
  difficulty: 'medium', rating: 4, gap: 0, lyrics: [
    line('b1', 'Coffee at midnight keeps me warm', 800, 6500, [
      note(60, 800, 350, 'Cof'), note(62, 1200, 350, 'fee'), note(64, 1600, 400, 'at'), note(65, 2100, 450, 'mid'), note(64, 2650, 400, 'night', true), note(62, 3150, 700, 'keeps'), note(60, 3950, 900, 'me'), note(59, 5000, 1100, 'warm'),
    ]),
  ],
  coverImage: cover('#db2777', '#f59e0b', 'B'),
} as unknown as Song;

const songC: Song = {
  id: 'e2e-song-c', title: 'Two Hearts Duet', artist: 'Ada & Benji', bpm: 220, duration: 200000,
  difficulty: 'hard', rating: 4, gap: 0, isDuet: true, duetPlayerNames: ['Ada', 'Benji'],
  lyrics: [
    line('c1', 'I will sing the high part now', 1000, 6000, [
      note(72, 1000, 400, 'I', false, 'P1'), note(74, 1500, 400, 'will', false, 'P1'), note(76, 2000, 500, 'sing', true, 'P1'), note(74, 2600, 400, 'high', false, 'P1'), note(72, 3100, 800, 'part', false, 'P1'),
    ], 'P1'),
    line('c2', 'I will sing the low part now', 6500, 11500, [
      note(55, 6500, 400, 'I', false, 'P2'), note(57, 7000, 400, 'will', false, 'P2'), note(59, 7500, 500, 'sing', true, 'P2'), note(57, 8100, 400, 'low', false, 'P2'), note(55, 8600, 800, 'part', false, 'P2'),
    ], 'P2'),
  ],
  coverImage: cover('#059669', '#f43f5e', 'C'),
} as unknown as Song;

// ── Fingerprints (app code!) ──
const hashA = songHashFromSong(songA, 's');
const hashB = songHashFromSong(songB, 's');
const hashC_s = songHashFromSong(songC, 's');
const hashC_d = songHashFromSong(songC, 'd');
console.log('hashes:', { hashA, hashB, hashC_s, hashC_d });

// ── Local highscores (Local tab) ──
const now = Date.now();
const avatarDataUri = 'data:image/svg+xml;base64,' + Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="48" fill="#f97316"/><text x="48" y="60" font-size="40" fill="white" text-anchor="middle" font-family="sans-serif">M</text></svg>`
).toString('base64');

const highscores: HighscoreEntry[] = [
  { id: 'hs1', playerId: 'p1', playerName: 'Mia', playerColor: '#f97316', playerAvatar: avatarDataUri, songId: 'e2e-song-a', songTitle: 'Neon Skyline', artist: 'The Voltage', score: 6431, accuracy: 81.3, maxCombo: 6, difficulty: 'easy', gameMode: 'single', rating: 'great', rankTitle: 'Vocal Virtuoso', playedAt: now - 3600_000 },
  { id: 'hs2', playerId: 'p2', playerName: 'Ben', playerColor: '#3b82f6', songId: 'e2e-song-a', songTitle: 'Neon Skyline', artist: 'The Voltage', score: 5987, accuracy: 76.2, maxCombo: 4, difficulty: 'easy', gameMode: 'single', rating: 'good', rankTitle: 'Rising Star', playedAt: now - 7200_000 },
  { id: 'hs3', playerId: 'p1', playerName: 'Mia', playerColor: '#f97316', playerAvatar: avatarDataUri, songId: 'e2e-song-b', songTitle: 'Midnight Coffee', artist: 'Luna Parker', score: 7210, accuracy: 88.1, maxCombo: 8, difficulty: 'hard', gameMode: 'single', rating: 'excellent', rankTitle: 'Karaoke Royalty', playedAt: now - 10_800_000 },
];

// ── Mocked ONLINE board entries (per_difficulty=true) ──
function entry(rank: number, uid: string, name: string, color: string, hash: string, score: number, difficulty: 'easy' | 'normal' | 'hard', accuracy: number, country: string | null, maxCombo: number) {
  return {
    rank, profile_uid: uid, display_name: name, color, country_code: country, song_hash: hash,
    score, max_score: 10000, accuracy, max_combo: maxCombo, difficulty,
    rating: 'great', played_at: new Date(now - 5_400_000).toISOString(), verified: true,
    fingerprint_version: 'v1', ac_flags: null,
  };
}

const onlineScores = {
  // Song A: Mia easy 5500, Mia hard 6800, Ben hard 7200 → per-diff rows survive
  [hashA]: [
    entry(1, '11111111-1111-4111-8111-111111111111', 'Ben', '#3b82f6', hashA, 7200, 'hard', 84.0, 'DE', 9),
    entry(2, '22222222-2222-4222-8222-222222222222', 'Mia', '#f97316', hashA, 6800, 'hard', 81.5, 'AT', 7),
    entry(3, '22222222-2222-4222-8222-222222222222', 'Mia', '#f97316', hashA, 5500, 'easy', 74.2, 'AT', 5),
  ],
  // Song B: Luca normal 6100 only
  [hashB]: [
    entry(1, '33333333-3333-4333-8333-333333333333', 'Luca', '#10b981', hashB, 6100, 'normal', 78.9, 'CH', 6),
  ],
  // Song C solo board: Emma easy 5000
  [hashC_s]: [
    entry(1, '44444444-4444-4444-8444-444444444444', 'Emma', '#e11d48', hashC_s, 5000, 'easy', 70.1, null, 4),
  ],
  // Song C duet board: the duet pair hard 8100
  [hashC_d]: [
    entry(1, '55555555-5555-4555-8555-555555555555', 'Mia & Ben', '#a855f7', hashC_d, 8100, 'hard', 90.3, 'DE', 12),
  ],
};

const batchMock = { scores: onlineScores, per_difficulty: true };
const infoMock = { name: 'Karaoke Leaderboard', version: '3.7.2', copyright_safe: true, anti_cheat: true, app_only_auth: true };

const storePayload = {
  state: {
    profiles: [],
    activeProfileId: null,
    highscores,
    leaderboardType: 'local',
    onlineEnabled: true,
    persistedDifficulty: 'medium',
  },
  version: 0,
};

const out = {
  songs: [songA, songB, songC],
  storePayload,
  batchMock,
  infoMock,
  hashes: { hashA, hashB, hashC_s, hashC_d },
};
await Bun.write('/tmp/r84-e2e-seed.json', JSON.stringify(out, null, 2));
console.log('seed written to /tmp/r84-e2e-seed.json');
console.log('d-hash should differ from s-hash for the duet song:', hashC_d !== hashC_s);
