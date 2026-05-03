import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from './get-handlers';
import { handlePostRequest } from './post-handlers';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

// ===================== ROUTE HANDLERS =====================

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  // Rate-limit connect and setpitch to prevent abuse
  if (action === 'connect') {
    if (!checkRateLimit(ip, 10)) {
      return NextResponse.json(
        { success: false, message: 'Too many connection attempts. Please wait a minute.' },
        { status: 429 },
      );
    }
  }

  return handleGetRequest(request);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate-limit setpitch (most frequent POST from companions)
  if (!checkRateLimit(ip, 300)) {
    return NextResponse.json(
      { success: false, message: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  return handlePostRequest(request);
}
