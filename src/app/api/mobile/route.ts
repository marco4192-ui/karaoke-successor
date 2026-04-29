import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest } from './get-handlers';
import { handlePostRequest } from './post-handlers';

export async function GET(request: NextRequest) {
  return handleGetRequest(request);
}

export async function POST(request: NextRequest) {
  return handlePostRequest(request);
}
