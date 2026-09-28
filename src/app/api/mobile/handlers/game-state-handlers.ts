// ===================== GAME STATE HANDLERS =====================
// POST /api/mobile actions around the shared game/match runtime state:
// 'sync', 'gamestate', 'br-singing', 'setAdPlaying', 'results' and the
// '#10' tournament crowd vote. Extracted 1:1 from post-handlers.ts (R8),
// no behavior change.

import type { NextRequest } from 'next/server';
import { mobileEvents, EVENTS } from '@/lib/socketio-events';
import {
  mobileClients,
  latestPitchData,
  mutableState,
  requireAuth,
  requireAuthOrRemoteHolder,
  MAX_TOURNAMENT_VOTES,
  tournamentVoteRegistry,
} from '../mobile-state';

export function handleSync(): Response {
  return Response.json({ 
    success: true, 
    state: mutableState.gameState,
  });
}

export function handleGamestate(request: NextRequest, payload: unknown, clientId: string): Response {
  // PC updates game state for mobile clients to see
  // Auth: require admin PIN or current remote control holder
  if (!requireAuthOrRemoteHolder(request, clientId)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN or hold remote control.' }, { status: 401 });
  }
  const gsPayload = payload as typeof mutableState.gameState;
  // Clear tournament vote dedup when matchId changes
  if (gsPayload.tournamentMatchId !== mutableState.gameState.tournamentMatchId) {
    tournamentVoteRegistry.clear();
  }
  mutableState.gameState = { ...mutableState.gameState, ...gsPayload };

  // Notify Socket.IO server to push gamestate to all companions
  mobileEvents.emit(EVENTS.GAMESTATE_UPDATE, {
    gameState: {
      ...mutableState.gameState,
      queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
    },
  });

  // If song ended, notify all clients and clear pitch data
  if (gsPayload.songEnded) {
    latestPitchData.clear();
    mobileClients.forEach((client) => {
      client.pitchData = null;
    });
  }
  
  return Response.json({ success: true, updated: true });
}

export function handleBrSinging(request: NextRequest, payload: unknown, clientId: string): Response {
  // Desktop pushes live Battle-Royale singing feedback (per-player
  // pitch/hit/miss monitor, ~2 Hz) → broadcast to companions.
  // Ephemeral: nothing is stored, only forwarded via Socket.IO.
  if (!requireAuthOrRemoteHolder(request, clientId)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN or hold remote control.' }, { status: 401 });
  }
  const brPayload = payload as { players?: unknown };
  // Validate + clamp: must be an array of at most 12 player entries
  // with sane scalar fields (protects the companions from bad host data).
  if (!Array.isArray(brPayload.players)) {
    return Response.json({ success: false, message: 'Invalid payload (players array expected)' }, { status: 400 });
  }
  const players = brPayload.players.slice(0, 12).map((raw) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const clampNum = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(-1e4, Math.min(1e4, v)) : null;
    return {
      id: typeof p.id === 'string' ? p.id.slice(0, 64) : '',
      name: typeof p.name === 'string' ? p.name.slice(0, 50) : '?',
      color: typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color) ? p.color : '#94a3b8',
      singing: p.singing === true,
      sungNote: clampNum(p.sungNote),
      targetNote: clampNum(p.targetNote),
      hitRate: typeof p.hitRate === 'number' && Number.isFinite(p.hitRate) ? Math.max(0, Math.min(1, p.hitRate)) : 0,
      streak: typeof p.streak === 'number' && Number.isFinite(p.streak) ? Math.max(0, Math.min(999, Math.round(p.streak))) : 0,
    };
  });
  mobileEvents.emit(EVENTS.BR_SINGING_UPDATE, { players, serverTime: Date.now() });
  return Response.json({ success: true, forwarded: players.length });
}

export function handleResults(request: NextRequest, payload: unknown): Response {
  // Store game results for social features
  // Auth: require admin PIN
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
  }
  mutableState.lastGameResults = payload as typeof mutableState.lastGameResults;
  return Response.json({ success: true, message: 'Results stored' });
}

export function handleSetAdPlaying(request: NextRequest, payload: unknown): Response {
  // Set ad playing state (from main app)
  // Auth: require admin PIN
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
  }
  const adPayload = payload as { isAdPlaying: boolean };
  mutableState.gameState.isAdPlaying = adPayload.isAdPlaying;
  return Response.json({ success: true, isAdPlaying: mutableState.gameState.isAdPlaying });
}

// #10 Tournament crowd vote — companion spectators vote on match results
export function handleTournamentCrowdVote(payload: unknown, clientId: string): Response {
  const votePayload = payload as { matchId: string; playerSide: 1 | 2 };
  if (!clientId || !votePayload.matchId || (votePayload.playerSide !== 1 && votePayload.playerSide !== 2)) {
    return Response.json({ success: false, message: 'Invalid vote payload' }, { status: 400 });
  }
  // Deduplication: check if this clientId already voted for this matchId
  const voteKey = `${clientId}:${votePayload.matchId}`;
  if (tournamentVoteRegistry.has(voteKey)) {
    return Response.json({ success: false, message: 'Already voted for this match' });
  }
  // Enforce max 500 total votes (prune oldest)
  if (mutableState.tournamentCrowdVotes.length >= MAX_TOURNAMENT_VOTES) {
    mutableState.tournamentCrowdVotes = mutableState.tournamentCrowdVotes.slice(-MAX_TOURNAMENT_VOTES + 1);
  }
  // Store vote in mutable state for the main app to pick up
  const client = mobileClients.get(clientId);
  mutableState.tournamentCrowdVotes.push({
    clientId,
    profileId: client?.profile?.id || null,
    profileName: client?.profile?.name || client?.name || 'Anonymous',
    matchId: votePayload.matchId,
    playerSide: votePayload.playerSide,
    timestamp: Date.now(),
  });
  tournamentVoteRegistry.add(voteKey);
  return Response.json({ success: true, message: 'Vote recorded' });
}
