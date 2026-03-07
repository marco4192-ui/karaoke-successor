import { NextRequest } from 'next/server';

// Store for mobile clients and their pitch data
interface MobileClient {
  id: string;
  type: 'microphone' | 'remote' | 'viewer';
  name: string;
  connected: number;
  lastActivity: number;
  pitchData: PitchData | null;
  profile?: MobileProfile;
}

interface PitchData {
  frequency: number | null;
  note: number | null;
  clarity: number;
  volume: number;
  timestamp: number;
}

interface MobileProfile {
  id: string;
  name: string;
  avatar?: string; // Base64 encoded image
  color: string;
  createdAt: number;
}

interface QueueItem {
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
}

// Shared state for mobile clients (in-memory, resets on server restart)
const mobileClients = new Map<string, MobileClient>();

// Latest pitch data from all clients (for PC to poll)
let latestPitchData: { clientId: string; data: PitchData } | null = null;

// Game state to sync to mobile clients
let gameState: {
  currentSong: { id: string; title: string; artist: string } | null;
  isPlaying: boolean;
  currentTime: number;
  lyrics?: string;
} = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
};

// Queue for song requests from mobile clients
let songQueue: QueueItem[] = [];

// Message types
interface MobileMessage {
  type: 'register' | 'pitch' | 'volume' | 'command' | 'status' | 'sync' | 'gamestate' | 'getpitch' | 'profile' | 'songs' | 'queue' | 'getqueue';
  payload: unknown;
  clientId?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const clientId = searchParams.get('clientId');

  switch (action) {
    case 'connect':
      const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      mobileClients.set(newClientId, {
        id: newClientId,
        type: 'microphone',
        name: 'Mobile Device',
        connected: Date.now(),
        lastActivity: Date.now(),
        pitchData: null,
      });
      return Response.json({ 
        success: true, 
        clientId: newClientId,
        message: 'Connected to Karaoke Successor',
        gameState,
      });

    case 'status':
      return Response.json({
        success: true,
        clients: Array.from(mobileClients.values()).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          connected: c.connected,
          lastActivity: c.lastActivity,
          profile: c.profile,
        })),
        connectedCount: mobileClients.size,
        gameState,
      });

    case 'disconnect':
      if (clientId && mobileClients.has(clientId)) {
        mobileClients.delete(clientId);
        if (latestPitchData?.clientId === clientId) {
          latestPitchData = null;
        }
        return Response.json({ success: true, message: 'Disconnected' });
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'getpitch':
      // PC polls this to get the latest pitch from mobile devices
      return Response.json({
        success: true,
        pitch: latestPitchData,
        clients: Array.from(mobileClients.values()).map(c => ({
          id: c.id,
          name: c.name,
          hasPitch: c.pitchData !== null,
        })),
      });

    case 'gamestate':
      // Mobile client gets current game state
      return Response.json({
        success: true,
        gameState,
      });

    case 'getqueue':
      // Get current song queue
      return Response.json({
        success: true,
        queue: songQueue,
      });

    case 'profile':
      // Get profile for a client
      if (clientId && mobileClients.has(clientId)) {
        const client = mobileClients.get(clientId)!;
        return Response.json({
          success: true,
          profile: client.profile || null,
        });
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    default:
      return Response.json({
        success: true,
        message: 'Karaoke Successor Mobile API',
        endpoints: {
          connect: '/api/mobile?action=connect',
          status: '/api/mobile?action=status',
          disconnect: '/api/mobile?action=disconnect&clientId=YOUR_ID',
          getpitch: '/api/mobile?action=getpitch',
          gamestate: '/api/mobile?action=gamestate',
          getqueue: '/api/mobile?action=getqueue',
          profile: '/api/mobile?action=profile&clientId=YOUR_ID',
        },
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as MobileMessage;
    const { type, payload, clientId } = body;

    switch (type) {
      case 'register':
        const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const regPayload = payload as { type?: string; name?: string; profile?: MobileProfile };
        mobileClients.set(newClientId, {
          id: newClientId,
          type: (regPayload.type as 'microphone' | 'remote' | 'viewer') || 'microphone',
          name: regPayload.name || 'Mobile Device',
          connected: Date.now(),
          lastActivity: Date.now(),
          pitchData: null,
          profile: regPayload.profile,
        });
        return Response.json({ 
          success: true, 
          clientId: newClientId,
          message: 'Registered successfully',
          gameState,
        });

      case 'pitch':
        // Mobile client sends pitch data
        const pitchPayload = payload as PitchData;
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          client.pitchData = pitchPayload;
          mobileClients.set(clientId, client);
          
          // Update latest pitch data for PC to poll
          latestPitchData = { clientId, data: pitchPayload };
        }
        return Response.json({ success: true, received: payload });

      case 'volume':
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
        }
        return Response.json({ success: true, received: payload });

      case 'command':
        const cmdPayload = payload as { command: string; data?: unknown };
        // Handle commands from mobile (play, pause, next song, etc.)
        return Response.json({ success: true, executed: cmdPayload.command });

      case 'sync':
        return Response.json({ 
          success: true, 
          state: gameState,
        });

      case 'gamestate':
        // PC updates game state for mobile clients to see
        const gsPayload = payload as typeof gameState;
        gameState = { ...gsPayload };
        return Response.json({ success: true, updated: true });

      case 'profile':
        // Update profile for a client
        if (clientId && mobileClients.has(clientId)) {
          const profilePayload = payload as MobileProfile;
          const client = mobileClients.get(clientId)!;
          client.profile = profilePayload;
          client.name = profilePayload.name;
          mobileClients.set(clientId, client);
          return Response.json({ success: true, profile: profilePayload });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

      case 'queue':
        // Add song to queue
        const queuePayload = payload as QueueItem;
        songQueue.push(queuePayload);
        return Response.json({ 
          success: true, 
          queue: songQueue,
          message: 'Song added to queue',
        });

      case 'songs':
        // This is handled client-side by fetching from the main app's song library
        return Response.json({ success: true, message: 'Use client-side song fetching' });

      default:
        return Response.json({ success: false, message: 'Unknown message type' }, { status: 400 });
    }
  } catch {
    return Response.json({ 
      success: false, 
      message: 'Invalid request body' 
    }, { status: 400 });
  }
}
