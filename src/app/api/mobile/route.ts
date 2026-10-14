import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from './get-handlers';
import { handlePostRequest } from './post-handlers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';
import { isHostRequest } from './mobile-state';

// ===================== ROUTE HANDLERS =====================

// Per-action GET rate limits (requests per minute, per IP).
// Each action gets its own sliding-window bucket via compound key `${ip}:${action}`.
// IMPORTANT: BR companion polling runs at 200ms intervals (5 Hz = 300/min).
// Do NOT lower this below 300 — that would cause constant 429 errors during BR gameplay.
const GET_RATE_LIMITS: Record<string, number> = {
  connect: 10,    // new companion connections — keep existing limit
  // R65: getpitch 300 → 600. Die dokumentierte Companion-Pollrate liegt bei
  // 5 Hz = 300/min — EXAKT am Limit: jedes Reconnect/Burst-Doppel-Poll über
  // die Kante schiebt 429s in die Wertungs-Pipeline (Nutzer-Feedback 4).
  // 600 = 2× Steady-State — sauberer Puffer ohne Missbrauchs-Risiko (lokal).
  getpitch: 600,
  getcommands: 300, // polled by main app at ~2-5 Hz for remote control commands
  // R65: gamestate 180 → 300 — die 2-Hz-Polling-Nutzung (120/min) bekam bei
  // Reconnect-Stürmen (mehrere Views fragen gleichzeitig nach) zu wenig
  // Kopfzimmer; 300 deckt Burst + Reserve wie bei getcommands.
  gamestate: 300,
  status: 30,
  clients: 30,
  // R34: lazy-loaded cover thumbnails — a large library easily requests
  // more than 60 covers/min while scrolling (each tile = one request), so
  // the old DEFAULT_GET_LIMIT (60/min) caused 429s → broken covers.
  // R53: 300 → 900 — beim schnellen Scrollen durch große Bibliotheken
  // (> 300 Songs, nicht virtualisierte Liste) feuerten die Tiles mehr als
  // 300 Anfragen/Minute ab; die 429-Antworten begruben die Cover-Retries.
  // R65: 900 → 1800 — mit dem Cover-Index-Gate (use-companion-cover-index)
  // kommen nur noch Cover-relevante Requests; die Restlast sind Neulad-
  // bursts nach Bibliotheks-Imports + die Retry-Leiter. 1800/min = 30/s ist
  // für einen lokalen Server, der 96px-JPEGs aus dem Speicher schickt,
  // selbstlos (Nutzer-Feedback 4: 429-Flut begrub die Cover-Anzeige).
  songcover: 1800,
  songcoverids: 300, // desktop self-healing poll (1/min) — headroom for retries; R65: also the phone's cover-index refresh (≤ 2/min)
  // R54: Einmaliger Root-CA-Download (Handys) — 30/min reichen locker
  // (pro Handy exakt 1 Download nötig), schützt vor Missbrauch des Endpunkts.
  'ca-cert': 30,
  // R55: DuckDNS-Status für die Settings-UI (Polling alle paar Sekunden
  // während der Einrichtung) — 60/min reichen.
  'https-domain': 60,
};
const DEFAULT_GET_LIMIT = 60; // catch-all for unlisted GET actions

// R37: HOST getpitch budget. The 300/min limit is fine for a phone (they
// barely call getpitch), but the DESKTOP polls it as an HTTP watchdog while a
// companion's Socket.IO feed is down ("HTTP-only companion", e.g. after
// standby): pitch-detector-manager polls at 10 Hz PER MOBILE PLAYER, plus the
// game-screen/CPTM/BR watchdogs at 5-10 Hz — all from the host's loopback
// IP. 2+ players easily exceed 1200 req/min and the shared 300/min bucket
// 429-flooded the scoring pipeline (R36 open point). The host machine is
// trusted (loopback TCP peer, spoof-safe via server.ts) and generates only
// local traffic, so it gets a generous 100 req/s budget; phones keep 300/min.
const HOST_GETPITCH_LIMIT = 6000;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  // Per-action rate limiting — use a compound key so each endpoint has an
  // independent sliding window (prevents a chatty getpitch from starving status).
  const isHost = isHostRequest(request);
  const limit = action === 'getpitch' && isHost
    ? HOST_GETPITCH_LIMIT
    : (action ? (GET_RATE_LIMITS[action] ?? DEFAULT_GET_LIMIT) : DEFAULT_GET_LIMIT);
  const bucket = action ? `${ip}:get:${action}` : `${ip}:get`;

  if (!checkRateLimit(bucket, limit)) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please wait a minute.' },
      { status: 429 },
    );
  }

  return handleGetRequest(request);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // R60 — PERF-FIX: Pitch-Familie bekommt einen EIGENEN, großzügigen Bucket.
  // Zuvor galt die generelle 300/min-Kappe über ALLE POST-Aktionen: Der
  // batch_pitch-HTTP-Fallback eines Handys lief mit ~6 req/s = 360/min schon
  // allein darüber hinaus → 429 → der Client flog in den Single-Pitch-Fallback
  // (20 req/s = 1200/min) → fast alles 429 → Pitch-Linie flach, Spiel stockte.
  // Der Body wird per request.clone() gepeekt (nicht konsumiert — der echte
  // Parse bleibt in handlePostRequest). 1800/min = 30 req/s deckt den
  // Single-Fallback plus Reserve ab; alle anderen Aktionen bleiben bei 300/min.
  let postType = '';
  try {
    const cloned = request.clone();
    const peeked = await cloned.json();
    postType = typeof peeked?.type === 'string' ? peeked.type : '';
  } catch {
    // Malformed body — der Handler meldet den Fehler ordentlich zurück.
  }
  const isPitchFamily = postType === 'pitch' || postType === 'batch_pitch';
  const bucket = isPitchFamily ? `${ip}:post:pitch` : `${ip}:post`;
  const limit = isPitchFamily ? 1800 : 300;

  if (!checkRateLimit(bucket, limit)) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  return handlePostRequest(request);
}
