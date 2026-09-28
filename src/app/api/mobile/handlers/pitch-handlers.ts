// ===================== PITCH STREAM HANDLERS =====================
// POST /api/mobile actions for companion pitch streaming: 'pitch' (single
// frame) and 'batch_pitch' (batched frames). Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.

import type { PitchData } from '../mobile-types';
import { mobileClients, latestPitchData } from '../mobile-state';

export function handlePitch(payload: unknown, clientId: string): Response {
  // Mobile client sends pitch data
  const pitchPayload = payload as PitchData;
  // Input validation: frequency 20-2000 Hz, clarity 0-1, volume 0-1
  if (pitchPayload.frequency !== null && pitchPayload.frequency !== undefined) {
    if (typeof pitchPayload.frequency !== 'number' || pitchPayload.frequency < 20 || pitchPayload.frequency > 2000) {
      return Response.json({ success: false, message: 'Invalid frequency (must be 20-2000 Hz)' }, { status: 400 });
    }
  }
  if (typeof pitchPayload.clarity !== 'number' || pitchPayload.clarity < 0 || pitchPayload.clarity > 1) {
    return Response.json({ success: false, message: 'Invalid clarity (must be 0-1)' }, { status: 400 });
  }
  if (typeof pitchPayload.volume !== 'number' || pitchPayload.volume < 0 || pitchPayload.volume > 1) {
    return Response.json({ success: false, message: 'Invalid volume (must be 0-1)' }, { status: 400 });
  }
  if (clientId) {
    const client = mobileClients.get(clientId);
    if (!client) return Response.json({ success: true, received: true });
    client.lastActivity = Date.now();
    client.pitchData = pitchPayload;
    mobileClients.set(clientId, client);
    latestPitchData.set(clientId, pitchPayload);
  }
  return Response.json({ success: true, received: true });
}

export function handleBatchPitch(payload: unknown, clientId: string): Response {
  // Batch pitch upload: receives multiple pitch frames in one request.
  // Stores only the LAST frame in latestPitchData (for the 10Hz host polling).
  const batchPayload = payload as { frames: PitchData[] };

  // Validate payload shape
  if (!Array.isArray(batchPayload.frames) || batchPayload.frames.length === 0) {
    return Response.json({ success: false, message: 'batch_pitch requires a non-empty frames array' }, { status: 400 });
  }
  if (batchPayload.frames.length > 20) {
    return Response.json({ success: false, message: 'batch_pitch max 20 frames per request' }, { status: 400 });
  }

  // Validate each frame (same rules as single pitch)
  for (const frame of batchPayload.frames) {
    if (frame.frequency !== null && frame.frequency !== undefined) {
      if (typeof frame.frequency !== 'number' || frame.frequency < 20 || frame.frequency > 2000) {
        return Response.json({ success: false, message: 'Invalid frequency in batch frame (must be 20-2000 Hz)' }, { status: 400 });
      }
    }
    if (typeof frame.clarity !== 'number' || frame.clarity < 0 || frame.clarity > 1) {
      return Response.json({ success: false, message: 'Invalid clarity in batch frame (must be 0-1)' }, { status: 400 });
    }
    if (typeof frame.volume !== 'number' || frame.volume < 0 || frame.volume > 1) {
      return Response.json({ success: false, message: 'Invalid volume in batch frame (must be 0-1)' }, { status: 400 });
    }
  }

  if (clientId) {
    const client = mobileClients.get(clientId);
    if (!client) return Response.json({ success: true, received: true, frameCount: 0 });
    client.lastActivity = Date.now();

    // Store only the last frame — this is what the host polls via latestPitchData
    const lastFrame = batchPayload.frames[batchPayload.frames.length - 1];
    client.pitchData = lastFrame;
    mobileClients.set(clientId, client);
    latestPitchData.set(clientId, lastFrame);
  }
  return Response.json({ success: true, received: true, frameCount: batchPayload.frames.length });
}
