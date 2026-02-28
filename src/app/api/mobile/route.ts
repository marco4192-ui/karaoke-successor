import { NextRequest } from 'next/server';

// Store for mobile clients
interface MobileClient {
  id: string;
  type: 'microphone' | 'remote' | 'viewer';
  name: string;
  connected: number;
  lastActivity: number;
}

const mobileClients = new Map<string, MobileClient>();

// Message types
interface MobileMessage {
  type: 'register' | 'pitch' | 'volume' | 'command' | 'status' | 'sync';
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
      });
      return Response.json({ 
        success: true, 
        clientId: newClientId,
        message: 'Connected to Karaoke Successor' 
      });

    case 'status':
      return Response.json({
        success: true,
        clients: Array.from(mobileClients.values()),
        connectedCount: mobileClients.size,
      });

    case 'disconnect':
      if (clientId && mobileClients.has(clientId)) {
        mobileClients.delete(clientId);
        return Response.json({ success: true, message: 'Disconnected' });
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
        const regPayload = payload as { type?: string; name?: string };
        mobileClients.set(newClientId, {
          id: newClientId,
          type: (regPayload.type as 'microphone' | 'remote' | 'viewer') || 'microphone',
          name: regPayload.name || 'Mobile Device',
          connected: Date.now(),
          lastActivity: Date.now(),
        });
        return Response.json({ 
          success: true, 
          clientId: newClientId,
          message: 'Registered successfully' 
        });

      case 'pitch':
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
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
        return Response.json({ success: true, executed: payload });

      case 'sync':
        return Response.json({ 
          success: true, 
          state: {
            currentSong: null,
            isPlaying: false,
            time: 0,
          }
        });

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
