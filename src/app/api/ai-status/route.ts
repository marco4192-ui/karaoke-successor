import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { isLocalRequest } from '@/app/api/lib/is-local-request';

/**
 * Lightweight availability probe for the AI service (LLM features).
 *
 * Why: /api/harmonize & friends return 503 when the ZAI SDK has no
 * credentials (.z-ai-config is missing — e.g. on end-user machines running
 * the packaged desktop app). Clients that probe THIS route first can skip
 * the doomed LLM calls entirely: no 4xx/5xx console spam, no wasted
 * round-trips — the UI shows "AI nicht verfügbar" instead.
 *
 * The probe result is cached in module scope for 60s so a harmonize run
 * over 500 songs doesn't re-check on every chunk.
 */

interface AiStatusCache {
  available: boolean;
  checkedAt: number;
}

const CACHE_TTL_MS = 60_000;

// Module-scope cache — shared across all requests in this server process.
// (Next.js dev/standalone may load route modules multiple times through
// separate module graphs; worst case is one extra probe per graph. Fine.)
let statusCache: AiStatusCache | null = null;

/**
 * Local-request guard for this GET endpoint.
 *
 * The shared isLocalRequest() matches the Origin/Referer EXACTLY — but a
 * same-origin browser GET sends no Origin header and a Referer WITH path
 * ("http://localhost:3000/editor"), so a plain GET would always 403.
 * GETs from the app are still strictly local: the Referer must PREFIX-match
 * a local origin (localhost/127.0.0.1/tauri.localhost), or the Host header
 * must be one of those (covers Tauri, where Referer can be absent).
 */
function isLocalProbeRequest(request: NextRequest): boolean {
  if (isLocalRequest(request)) return true; // Origin-header path (POST, curl)
  const referer = request.headers.get('referer') || '';
  const host = (request.headers.get('host') || '').replace(/^https?:\/\//, '');
  return (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(referer) ||
    /^https?:\/\/tauri\.localhost(:\d+)?\//.test(referer) ||
    /^(localhost|127\.0\.0\.1|tauri\.localhost)(:\d+)?$/.test(host)
  );
}

async function probeAiAvailability(): Promise<boolean> {
  if (statusCache && Date.now() - statusCache.checkedAt < CACHE_TTL_MS) {
    return statusCache.available;
  }
  let available = false;
  try {
    await ZAI.create();
    available = true;
  } catch {
    available = false;
  }
  statusCache = { available, checkedAt: Date.now() };
  return available;
}

export async function GET(request: NextRequest) {
  if (!isLocalProbeRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const available = await probeAiAvailability();
  return NextResponse.json({
    success: true,
    available,
    // Human-readable hint for the UI
    reason: available ? null : 'AI-Dienst nicht konfiguriert (.z-ai-config fehlt)',
  });
}
