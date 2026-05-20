import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from './get-handlers';
import { handlePostRequest } from './post-handlers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// ===================== ROUTE HANDLERS =====================

// Per-action GET rate limits (requests per minute, per IP).
// Each action gets its own sliding-window bucket via compound key `${ip}:${action}`.
const GET_RATE_LIMITS: Record<string, number> = {
  connect: 10,    // new companion connections — keep existing limit
  getpitch: 60,   // polled by main app at ~1 Hz
  status: 30,
  clients: 30,
};
const DEFAULT_GET_LIMIT = 60; // catch-all for unlisted GET actions

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  // Per-action rate limiting — use a compound key so each endpoint has an
  // independent sliding window (prevents a chatty getpitch from starving status).
  const limit = action
    ? (GET_RATE_LIMITS[action] ?? DEFAULT_GET_LIMIT)
    : DEFAULT_GET_LIMIT;
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

  // General POST rate limit (300/min across all POST actions).
  // Per-action limits (pitch: 600/min, others: 120/min) are enforced inside
  // post-handlers.ts — we cannot inspect the JSON body here without consuming it.
  if (!checkRateLimit(`${ip}:post`, 300)) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  return handlePostRequest(request);
}
