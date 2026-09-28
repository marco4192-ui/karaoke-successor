// ===================== HOST SYNC HANDLERS =====================
// PIN-authenticated actions where the desktop host pushes reference data for
// companion clients: 'sethostprofiles', 'setplaylists', 'setsongs'.
// Extracted 1:1 from post-handlers.ts (R8), no behavior change.

import type { NextRequest } from 'next/server';
import { mutableState, requireAuth } from '../mobile-state';

export function handleSetHostProfiles(request: NextRequest, payload: unknown): Response {
  // Main app syncs its character profiles for companion to choose from
  // Auth: require admin PIN
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
  }
  {
    const profilesPayload = payload as Array<{
      id: string;
      name: string;
      avatar?: string;
      color: string;
      createdAt: number;
      isActive?: boolean;
    }>;
    if (Array.isArray(profilesPayload)) {
      mutableState.hostProfiles = profilesPayload;
      return Response.json({
        success: true,
        message: 'Host profiles updated',
        count: mutableState.hostProfiles.length,
      });
    }
    return Response.json({ success: false, message: 'Invalid profiles payload' }, { status: 400 });
  }
}

export function handleSetPlaylists(request: NextRequest, payload: unknown): Response {
  // Desktop synchronisiert Playlists an den Server (wie sethostprofiles)
  // Auth required: kommt von der Desktop-App
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
  }
  {
    const playlistsPayload = payload as Array<{ id: string; name: string; isSystem?: boolean }>;
    if (Array.isArray(playlistsPayload)) {
      mutableState.playlists = playlistsPayload;
      return Response.json({
        success: true,
        message: 'Playlists updated',
        count: mutableState.playlists.length,
      });
    }
    return Response.json({ success: false, message: 'Invalid playlists payload' }, { status: 400 });
  }
}

export function handleSetSongs(request: NextRequest, payload: unknown): Response {
  // Main app syncs its song library for companion clients
  // Auth required: this is a privileged admin action
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
  }
  const songsPayload = payload as Array<{
    id: string;
    title: string;
    artist: string;
    duration: number;
    genre?: string;
    language?: string;
    year?: number;
    coverImage?: string;
  }>;
  
  if (Array.isArray(songsPayload)) {
    mutableState.songLibrary = songsPayload;
    return Response.json({ 
      success: true, 
      message: 'Song library updated',
      count: mutableState.songLibrary.length,
    });
  }
  return Response.json({ success: false, message: 'Invalid songs payload' }, { status: 400 });
}
