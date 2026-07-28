import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/server-info?action=local-ip
 *
 * Returns the local (LAN) IP address of the server as seen by the caller.
 * This is used by the companion-app QR code: when a phone on the same network
 * hits this endpoint, its source IP is the address the phone should connect to.
 *
 * Also returns the server port for building the companion URL on the client.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  if (action === 'local-ip') {
    // The phone's request source IP is the LAN IP the server is reachable at.
    // x-forwarded-for may contain the real client IP if proxied.
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')?.trim()
      || '';

    return NextResponse.json({
      ip: clientIp || null,
      // The server port is always 3000 in Tauri (hardcoded in Rust side)
      port: 3000,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
