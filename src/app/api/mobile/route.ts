import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ===================== TYPES =====================
interface MobileClient {
  id: string;
  connectionCode: string; // 4-character unique code
  type: 'microphone' | 'remote' | 'viewer';
  name: string;
  connected: number;
  lastActivity: number;
  pitchData: PitchData | null;
  profile: MobileProfile | null;
  queueCount: number; // Songs currently in queue
  hasRemoteControl: boolean; // Whether this client has remote control
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
  avatar?: string;
  color: string;
  createdAt: number;
}

interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
  companionCode: string;
  status: 'pending' | 'playing' | 'completed';
}

interface RemoteCommand {
  type: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'volume' | 'seek' | 'skip' | 'restart' | 'quit' | 'home' | 'library' | 'settings';
  data?: unknown;
  timestamp: number;
  fromClientId: string;
  fromClientName: string;
}

interface RemoteControlState {
  lockedBy: string | null; // clientId that has control
  lockedByName: string | null; // name of the client
  lockedAt: number | null;
  pendingCommands: RemoteCommand[]; // Commands waiting to be executed by main app
}

// ===================== AUDIO STREAMING TYPES =====================
// Transmission mode for companion devices
type TransmissionMode = 'pitch-only' | 'audio-stream';

// Audio chunk from mobile client (base64 encoded)
interface AudioChunk {
  clientId: string;
  data: string; // base64 encoded audio data
  sampleRate: number;
  channels: number;
  timestamp: number;
  sequenceNumber: number;
}

// Audio buffer for streaming mode
interface ClientAudioBuffer {
  clientId: string;
  chunks: AudioChunk[];
  totalBytes: number;
  lastSequenceNumber: number;
  startedAt: number;
  sampleRate: number;
  channels: number;
}

// Game type to determine transmission mode
type GameType = 'battle-royale' | 'companion-singalong' | 'duet' | 'pass-the-mic' | 'single' | 'medley';

// ===================== GLOBAL STATE =====================
// Shared state for mobile clients (in-memory, resets on server restart)
const mobileClients = new Map<string, MobileClient>();
const connectionCodes = new Map<string, string>(); // code -> clientId
const profileToClient = new Map<string, string>(); // profileId -> clientId (for duplicate detection)

// Latest pitch data from all clients (for PC to poll)
let latestPitchData: Map<string, PitchData> = new Map();

// Game state to sync to mobile clients
let gameState: {
  currentSong: { id: string; title: string; artist: string } | null;
  isPlaying: boolean;
  currentTime: number;
  songEnded: boolean;
  isAdPlaying: boolean;
} = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  songEnded: false,
  isAdPlaying: false,
};

// Queue for song requests from mobile clients
let songQueue: QueueItem[] = [];

// Jukebox wishlist
let jukeboxWishlist: QueueItem[] = [];

// Game results for social features
let lastGameResults: {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
} | null = null;

// Remote Control State - Only ONE client can have control at a time
let remoteControlState: RemoteControlState = {
  lockedBy: null,
  lockedByName: null,
  lockedAt: null,
  pendingCommands: [],
};

// ===================== AUDIO STREAMING STATE =====================
// Current transmission mode for all clients
let currentTransmissionMode: TransmissionMode = 'pitch-only';

// Current game type
let currentGameType: GameType | null = null;

// Audio buffers for streaming clients
const audioBuffers = new Map<string, ClientAudioBuffer>();

// Maximum audio buffer size per client (10MB)
const MAX_AUDIO_BUFFER_SIZE = 10 * 1024 * 1024;

// Maximum chunks to keep in buffer (rolling window)
const MAX_CHUNKS_IN_BUFFER = 100;

// Determine transmission mode based on game type
function getTransmissionModeForGame(gameType: GameType | null): TransmissionMode {
  // Battle Royale uses pitch-only (optimized for many players)
  if (gameType === 'battle-royale') {
    return 'pitch-only';
  }
  // All other game types use audio streaming
  return 'audio-stream';
}

// ===================== HELPER FUNCTIONS =====================
function generateConnectionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getUniqueConnectionCode(): string {
  let code = generateConnectionCode();
  let attempts = 0;
  while (connectionCodes.has(code) && attempts < 100) {
    code = generateConnectionCode();
    attempts++;
  }
  return code;
}

// Clean up inactive clients (older than 5 minutes without activity)
function cleanupInactiveClients() {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes
  
  mobileClients.forEach((client, clientId) => {
    if (now - client.lastActivity > timeout) {
      // Remove client
      mobileClients.delete(clientId);
      connectionCodes.delete(client.connectionCode);
      if (client.profile) {
        profileToClient.delete(client.profile.id);
      }
      latestPitchData.delete(clientId);
    }
  });
}

// ===================== GET HANDLER =====================
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const clientId = searchParams.get('clientId');
  const companionCode = searchParams.get('code');

  // Periodic cleanup
  cleanupInactiveClients();

  switch (action) {
    case 'connect':
      // Generate new client with unique connection code
      const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const connectionCode = getUniqueConnectionCode();
      
      mobileClients.set(newClientId, {
        id: newClientId,
        connectionCode,
        type: 'microphone',
        name: 'Mobile Device',
        connected: Date.now(),
        lastActivity: Date.now(),
        pitchData: null,
        profile: null,
        queueCount: 0,
        hasRemoteControl: false,
      });
      
      connectionCodes.set(connectionCode, newClientId);
      
      return Response.json({ 
        success: true, 
        clientId: newClientId,
        connectionCode,
        message: 'Connected to Karaoke Successor',
        gameState,
      });

    case 'status':
      // Return all connected clients with their profiles
      return Response.json({
        success: true,
        clients: Array.from(mobileClients.values()).map(c => ({
          id: c.id,
          connectionCode: c.connectionCode,
          name: c.name,
          type: c.type,
          connected: c.connected,
          lastActivity: c.lastActivity,
          profile: c.profile,
          queueCount: c.queueCount,
          hasPitch: c.pitchData !== null,
        })),
        connectedCount: mobileClients.size,
        gameState,
        queue: songQueue.filter(q => q.status !== 'completed'),
      });

    case 'disconnect':
      if (clientId && mobileClients.has(clientId)) {
        const client = mobileClients.get(clientId)!;
        connectionCodes.delete(client.connectionCode);
        if (client.profile) {
          profileToClient.delete(client.profile.id);
        }
        mobileClients.delete(clientId);
        latestPitchData.delete(clientId);
        return Response.json({ success: true, message: 'Disconnected' });
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'getpitch':
      // PC polls this to get the latest pitch from all mobile devices
      const pitches: Array<{ clientId: string; code: string; data: PitchData; profile: MobileProfile | null }> = [];
      latestPitchData.forEach((data, cId) => {
        const client = mobileClients.get(cId);
        if (client) {
          pitches.push({
            clientId: cId,
            code: client.connectionCode,
            data,
            profile: client.profile,
          });
        }
      });
      
      return Response.json({
        success: true,
        pitches,
        clients: Array.from(mobileClients.values()).map(c => ({
          id: c.id,
          code: c.connectionCode,
          name: c.name,
          profile: c.profile,
          hasPitch: c.pitchData !== null,
        })),
      });

    case 'gamestate':
      // Mobile client gets current game state
      return Response.json({
        success: true,
        gameState: {
          ...gameState,
          queueLength: songQueue.filter(q => q.status === 'pending').length,
        },
      });

    case 'getqueue':
      // Get current song queue with companion info
      return Response.json({
        success: true,
        queue: songQueue.filter(q => q.status !== 'completed'),
        queueByCompanion: getQueueByCompanion(),
      });

    case 'getjukebox':
      // Get jukebox wishlist
      return Response.json({
        success: true,
        wishlist: jukeboxWishlist,
      });

    case 'profile':
      // Get profile for a client
      if (clientId && mobileClients.has(clientId)) {
        const client = mobileClients.get(clientId)!;
        return Response.json({
          success: true,
          profile: client.profile || null,
          connectionCode: client.connectionCode,
          queueCount: client.queueCount,
        });
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'reconnect':
      // Reconnect using companion code
      if (companionCode && connectionCodes.has(companionCode)) {
        const existingClientId = connectionCodes.get(companionCode)!;
        const client = mobileClients.get(existingClientId);
        if (client) {
          client.lastActivity = Date.now();
          return Response.json({
            success: true,
            clientId: existingClientId,
            connectionCode: companionCode,
            profile: client.profile,
            message: 'Reconnected successfully',
            gameState,
          });
        }
      }
      return Response.json({ 
        success: false, 
        message: 'Invalid or expired connection code',
        requireNewConnection: true,
      }, { status: 404 });

    case 'results':
      // Get last game results for social features
      return Response.json({
        success: true,
        results: lastGameResults,
      });

    case 'remotecontrol':
      // Get remote control state (for all clients to see who has control)
      return Response.json({
        success: true,
        remoteControl: {
          isLocked: remoteControlState.lockedBy !== null,
          lockedBy: remoteControlState.lockedBy,
          lockedByName: remoteControlState.lockedByName,
          lockedAt: remoteControlState.lockedAt,
          myClientId: clientId,
          iHaveControl: remoteControlState.lockedBy === clientId,
        },
      });

    case 'getcommands':
      // Main app polls this to get pending remote commands
      const commands = [...remoteControlState.pendingCommands];
      // Clear commands after they're fetched
      remoteControlState.pendingCommands = [];
      return Response.json({
        success: true,
        commands,
        remoteControlState: {
          isLocked: remoteControlState.lockedBy !== null,
          lockedBy: remoteControlState.lockedBy,
          lockedByName: remoteControlState.lockedByName,
        },
      });

    case 'clearall':
      // Clear all connections (when main app closes)
      mobileClients.clear();
      connectionCodes.clear();
      profileToClient.clear();
      latestPitchData.clear();
      audioBuffers.clear();
      songQueue = [];
      jukeboxWishlist = [];
      gameState = {
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        songEnded: false,
        isAdPlaying: false,
      };
      // Reset remote control state
      remoteControlState = {
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        pendingCommands: [],
      };
      // Reset transmission mode
      currentTransmissionMode = 'pitch-only';
      currentGameType = null;
      return Response.json({ 
        success: true, 
        message: 'All connections cleared',
      });

    // ===================== AUDIO STREAMING ENDPOINTS =====================
    case 'transmissionmode':
      // Get current transmission mode for companion devices
      return Response.json({
        success: true,
        transmissionMode: currentTransmissionMode,
        gameType: currentGameType,
      });

    case 'getaudio':
      // PC polls this to get audio chunks from streaming clients
      const audioClientId = searchParams.get('audioClientId');
      
      if (audioClientId && audioBuffers.has(audioClientId)) {
        // Get audio for specific client
        const buffer = audioBuffers.get(audioClientId)!;
        const chunks = [...buffer.chunks];
        
        return Response.json({
          success: true,
          clientId: audioClientId,
          chunks: chunks.map(c => ({
            data: c.data,
            sampleRate: c.sampleRate,
            channels: c.channels,
            timestamp: c.timestamp,
            sequenceNumber: c.sequenceNumber,
          })),
          totalBytes: buffer.totalBytes,
        });
      } else {
        // Get audio from all streaming clients
        const allAudio: Array<{
          clientId: string;
          chunks: AudioChunk[];
          totalBytes: number;
          profile: MobileProfile | null;
        }> = [];
        
        audioBuffers.forEach((buffer, cId) => {
          const client = mobileClients.get(cId);
          allAudio.push({
            clientId: cId,
            chunks: [...buffer.chunks],
            totalBytes: buffer.totalBytes,
            profile: client?.profile || null,
          });
        });
        
        return Response.json({
          success: true,
          audioBuffers: allAudio,
          transmissionMode: currentTransmissionMode,
        });
      }

    case 'clearaudio':
      // Clear audio buffer for a specific client or all clients
      const clearClientId = searchParams.get('audioClientId');
      
      if (clearClientId) {
        audioBuffers.delete(clearClientId);
        return Response.json({ success: true, message: `Audio buffer cleared for client ${clearClientId}` });
      } else {
        audioBuffers.clear();
        return Response.json({ success: true, message: 'All audio buffers cleared' });
      }

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
          reconnect: '/api/mobile?action=reconnect&code=XXXX',
          results: '/api/mobile?action=results',
          clearall: '/api/mobile?action=clearall',
        },
      });
  }
}

// ===================== POST HANDLER =====================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, payload, clientId } = body;

    switch (type) {
      case 'register':
        const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const connectionCode = getUniqueConnectionCode();
        const regPayload = payload as { type?: string; name?: string; profile?: MobileProfile };
        
        // Check for duplicate profile
        if (regPayload.profile && profileToClient.has(regPayload.profile.id)) {
          // Terminate old connection
          const oldClientId = profileToClient.get(regPayload.profile.id)!;
          const oldClient = mobileClients.get(oldClientId);
          if (oldClient) {
            connectionCodes.delete(oldClient.connectionCode);
            mobileClients.delete(oldClientId);
            latestPitchData.delete(oldClientId);
          }
        }
        
        const newClient: MobileClient = {
          id: newClientId,
          connectionCode,
          type: (regPayload.type as 'microphone' | 'remote' | 'viewer') || 'microphone',
          name: regPayload.name || regPayload.profile?.name || 'Mobile Device',
          connected: Date.now(),
          lastActivity: Date.now(),
          pitchData: null,
          profile: regPayload.profile || null,
          queueCount: 0,
          hasRemoteControl: false,
        };
        
        mobileClients.set(newClientId, newClient);
        connectionCodes.set(connectionCode, newClientId);
        
        if (regPayload.profile) {
          profileToClient.set(regPayload.profile.id, newClientId);
        }
        
        return Response.json({ 
          success: true, 
          clientId: newClientId,
          connectionCode,
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
          latestPitchData.set(clientId, pitchPayload);
        }
        return Response.json({ success: true, received: true });

      case 'volume':
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
        }
        return Response.json({ success: true });

      case 'command':
        const cmdPayload = payload as { command: string; data?: unknown };
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
        
        // If song ended, notify all clients and clear pitch data
        if (gsPayload.songEnded) {
          latestPitchData.clear();
          mobileClients.forEach((client) => {
            client.pitchData = null;
          });
        }
        
        return Response.json({ success: true, updated: true });

      case 'profile':
        // Update profile for a client
        if (clientId && mobileClients.has(clientId)) {
          const profilePayload = payload as MobileProfile;
          const client = mobileClients.get(clientId)!;
          
          // Check for duplicate profile (different client using same profile)
          if (profileToClient.has(profilePayload.id) && profileToClient.get(profilePayload.id) !== clientId) {
            const oldClientId = profileToClient.get(profilePayload.id)!;
            const oldClient = mobileClients.get(oldClientId);
            if (oldClient) {
              connectionCodes.delete(oldClient.connectionCode);
              mobileClients.delete(oldClientId);
              latestPitchData.delete(oldClientId);
            }
          }
          
          client.profile = profilePayload;
          client.name = profilePayload.name;
          mobileClients.set(clientId, client);
          profileToClient.set(profilePayload.id, clientId);
          
          return Response.json({ 
            success: true, 
            profile: profilePayload,
            connectionCode: client.connectionCode,
          });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

      case 'queue':
        // Add song to queue (with max 3 per companion limit)
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const queuePayload = payload as { songId: string; songTitle: string; songArtist: string };
        const clientForQueue = mobileClients.get(clientId)!;
        
        // Check queue limit (max 3 pending songs per companion)
        const clientPendingCount = songQueue.filter(
          q => q.companionCode === clientForQueue.connectionCode && q.status === 'pending'
        ).length;
        
        if (clientPendingCount >= 3) {
          return Response.json({ 
            success: false, 
            message: 'Maximum 3 songs in queue per companion',
            queueFull: true,
            currentCount: clientPendingCount,
          }, { status: 400 });
        }
        
        const queueItem: QueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          ...queuePayload,
          addedBy: clientForQueue.profile?.name || clientForQueue.name,
          addedAt: Date.now(),
          companionCode: clientForQueue.connectionCode,
          status: 'pending',
        };
        
        songQueue.push(queueItem);
        clientForQueue.queueCount = clientPendingCount + 1;
        mobileClients.set(clientId, clientForQueue);
        
        return Response.json({ 
          success: true, 
          queueItem,
          queue: songQueue.filter(q => q.status !== 'completed'),
          message: 'Song added to queue',
          slotsRemaining: 3 - clientForQueue.queueCount,
        });

      case 'removequeue':
        // Remove song from queue
        const removePayload = payload as { itemId: string };
        const itemIndex = songQueue.findIndex(q => q.id === removePayload.itemId);
        
        if (itemIndex !== -1) {
          const item = songQueue[itemIndex];
          const clientForRemove = Array.from(mobileClients.values()).find(c => c.connectionCode === item.companionCode);
          if (clientForRemove && clientForRemove.queueCount > 0) {
            clientForRemove.queueCount--;
          }
          songQueue.splice(itemIndex, 1);
          return Response.json({ success: true, message: 'Song removed from queue' });
        }
        return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

      case 'queuecompleted':
        // Mark a song as completed (called by main app)
        const completedPayload = payload as { itemId: string };
        const completedItem = songQueue.find(q => q.id === completedPayload.itemId);
        
        if (completedItem) {
          completedItem.status = 'completed';
          
          // Update companion's queue count
          const completedClient = Array.from(mobileClients.values()).find(
            c => c.connectionCode === completedItem.companionCode
          );
          if (completedClient && completedClient.queueCount > 0) {
            completedClient.queueCount--;
            mobileClients.set(completedClient.id, completedClient);
          }
          
          return Response.json({ success: true, message: 'Song marked as completed' });
        }
        return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

      case 'jukebox':
        // Add song to jukebox wishlist
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const jukeboxPayload = payload as { songId: string; songTitle: string; songArtist: string };
        const clientForJukebox = mobileClients.get(clientId)!;
        
        const wishlistItem: QueueItem = {
          id: `wish-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          ...jukeboxPayload,
          addedBy: clientForJukebox.profile?.name || clientForJukebox.name,
          addedAt: Date.now(),
          companionCode: clientForJukebox.connectionCode,
          status: 'pending',
        };
        
        jukeboxWishlist.push(wishlistItem);
        
        return Response.json({ 
          success: true, 
          wishlistItem,
          message: 'Song added to wishlist',
        });

      case 'results':
        // Store game results for social features
        lastGameResults = payload as typeof lastGameResults;
        return Response.json({ success: true, message: 'Results stored' });

      case 'remote_acquire':
        // Acquire remote control lock
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const acquireClient = mobileClients.get(clientId)!;
        
        // Check if already locked by someone else
        if (remoteControlState.lockedBy && remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'Remote control is already taken by another device',
            lockedBy: remoteControlState.lockedByName,
          }, { status: 403 });
        }
        
        // Acquire lock
        remoteControlState.lockedBy = clientId;
        remoteControlState.lockedByName = acquireClient.profile?.name || acquireClient.name;
        remoteControlState.lockedAt = Date.now();
        acquireClient.hasRemoteControl = true;
        mobileClients.set(clientId, acquireClient);
        
        return Response.json({ 
          success: true, 
          message: 'Remote control acquired',
          remoteControl: {
            lockedBy: clientId,
            lockedByName: remoteControlState.lockedByName,
            lockedAt: remoteControlState.lockedAt,
          },
        });

      case 'remote_release':
        // Release remote control lock
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        // Can only release if we have the lock
        if (remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'You do not have remote control',
          }, { status: 403 });
        }
        
        const releaseClient = mobileClients.get(clientId)!;
        releaseClient.hasRemoteControl = false;
        mobileClients.set(clientId, releaseClient);
        
        remoteControlState.lockedBy = null;
        remoteControlState.lockedByName = null;
        remoteControlState.lockedAt = null;
        remoteControlState.pendingCommands = [];
        
        return Response.json({ 
          success: true, 
          message: 'Remote control released',
        });

      case 'remote_command':
        // Send a remote control command
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const commandPayload = payload as { command: RemoteCommand['type']; data?: unknown };
        const commandClient = mobileClients.get(clientId)!;
        
        // Must have the lock to send commands
        if (remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'You must acquire remote control first',
            isLocked: remoteControlState.lockedBy !== null,
            lockedBy: remoteControlState.lockedByName,
          }, { status: 403 });
        }
        
        // Add command to pending queue for main app to pick up
        const newCommand: RemoteCommand = {
          type: commandPayload.command,
          data: commandPayload.data,
          timestamp: Date.now(),
          fromClientId: clientId,
          fromClientName: commandClient.profile?.name || commandClient.name,
        };
        
        remoteControlState.pendingCommands.push(newCommand);
        
        return Response.json({ 
          success: true, 
          message: 'Command queued',
          command: newCommand,
        });

      case 'setAdPlaying':
        // Set ad playing state (from main app)
        const adPayload = payload as { isAdPlaying: boolean };
        gameState.isAdPlaying = adPayload.isAdPlaying;
        logger.debug('[Mobile API]', 'Ad state updated:', adPayload.isAdPlaying);
        return Response.json({ success: true, isAdPlaying: gameState.isAdPlaying });

      case 'skipAd':
        // Request to skip ad (from mobile client)
        // This will be picked up by the main app polling for commands
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const skipAdClient = mobileClients.get(clientId)!;
        
        // Add skip command to pending queue
        const skipCommand: RemoteCommand = {
          type: 'skip',
          timestamp: Date.now(),
          fromClientId: clientId,
          fromClientName: skipAdClient.profile?.name || skipAdClient.name,
        };
        
        remoteControlState.pendingCommands.push(skipCommand);
        logger.debug('[Mobile API]', 'Skip ad command queued from:', skipAdClient.profile?.name || skipAdClient.name);
        
        return Response.json({ 
          success: true, 
          message: 'Skip ad command sent',
        });

      case 'heartbeat':
        // Keep connection alive
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
          return Response.json({ success: true, timestamp: Date.now() });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

      // ===================== AUDIO STREAMING CASES =====================
      case 'audiochunk':
        // Mobile client sends audio chunk (for audio-stream mode)
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const audioChunkPayload = payload as {
          data: string; // base64 encoded audio
          sampleRate: number;
          channels: number;
          sequenceNumber: number;
        };
        
        // Get or create audio buffer for this client
        let audioBuffer = audioBuffers.get(clientId);
        
        if (!audioBuffer) {
          audioBuffer = {
            clientId,
            chunks: [],
            totalBytes: 0,
            lastSequenceNumber: -1,
            startedAt: Date.now(),
            sampleRate: audioChunkPayload.sampleRate,
            channels: audioChunkPayload.channels,
          };
        }
        
        // Create the audio chunk
        const newChunk: AudioChunk = {
          clientId,
          data: audioChunkPayload.data,
          sampleRate: audioChunkPayload.sampleRate,
          channels: audioChunkPayload.channels,
          timestamp: Date.now(),
          sequenceNumber: audioChunkPayload.sequenceNumber,
        };
        
        // Add chunk to buffer
        audioBuffer.chunks.push(newChunk);
        audioBuffer.lastSequenceNumber = audioChunkPayload.sequenceNumber;
        
        // Calculate data size (base64 is ~4/3 the size of binary)
        const chunkSize = Math.ceil(audioChunkPayload.data.length * 0.75);
        audioBuffer.totalBytes += chunkSize;
        
        // Keep buffer size in check - remove old chunks if needed
        while (audioBuffer.chunks.length > MAX_CHUNKS_IN_BUFFER) {
          const removedChunk = audioBuffer.chunks.shift();
          if (removedChunk) {
            const removedSize = Math.ceil(removedChunk.data.length * 0.75);
            audioBuffer.totalBytes -= removedSize;
          }
        }
        
        // Save buffer
        audioBuffers.set(clientId, audioBuffer);
        
        // Update client activity
        const audioClient = mobileClients.get(clientId)!;
        audioClient.lastActivity = Date.now();
        mobileClients.set(clientId, audioClient);
        
        return Response.json({
          success: true,
          received: true,
          sequenceNumber: audioChunkPayload.sequenceNumber,
          bufferSize: audioBuffer.chunks.length,
        });

      case 'setgametype':
        // Main app sets the game type (determines transmission mode)
        const gameTypePayload = payload as { gameType: GameType };
        currentGameType = gameTypePayload.gameType;
        currentTransmissionMode = getTransmissionModeForGame(currentGameType);
        
        console.log(`[Mobile API] Game type set to: ${currentGameType}, transmission mode: ${currentTransmissionMode}`);
        
        return Response.json({
          success: true,
          gameType: currentGameType,
          transmissionMode: currentTransmissionMode,
        });

      case 'startaudiostream':
        // Mobile client starts audio streaming
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        // Initialize audio buffer
        const streamConfig = payload as {
          sampleRate: number;
          channels: number;
        };
        
        audioBuffers.set(clientId, {
          clientId,
          chunks: [],
          totalBytes: 0,
          lastSequenceNumber: -1,
          startedAt: Date.now(),
          sampleRate: streamConfig.sampleRate,
          channels: streamConfig.channels,
        });
        
        console.log(`[Mobile API] Audio stream started for client: ${clientId}`);
        
        return Response.json({
          success: true,
          message: 'Audio stream started',
          transmissionMode: currentTransmissionMode,
        });

      case 'stopaudiostream':
        // Mobile client stops audio streaming
        if (clientId) {
          audioBuffers.delete(clientId);
          console.log(`[Mobile API] Audio stream stopped for client: ${clientId}`);
        }
        
        return Response.json({
          success: true,
          message: 'Audio stream stopped',
        });

      case 'consumeaudio':
        // Main app consumes and clears audio chunks (after processing)
        const consumePayload = payload as { 
          clientIds?: string[];
          keepLast?: number; // Keep last N chunks
        };
        
        if (consumePayload.clientIds) {
          consumePayload.clientIds.forEach(cId => {
            const buffer = audioBuffers.get(cId);
            if (buffer) {
              if (consumePayload.keepLast && buffer.chunks.length > consumePayload.keepLast) {
                // Keep only last N chunks
                const chunksToRemove = buffer.chunks.length - consumePayload.keepLast;
                buffer.chunks.splice(0, chunksToRemove);
              } else {
                // Clear all chunks
                buffer.chunks = [];
              }
              buffer.totalBytes = buffer.chunks.reduce((sum, c) => sum + Math.ceil(c.data.length * 0.75), 0);
            }
          });
        } else {
          // Consume from all clients
          audioBuffers.forEach((buffer, cId) => {
            if (consumePayload.keepLast && buffer.chunks.length > consumePayload.keepLast) {
              const chunksToRemove = buffer.chunks.length - consumePayload.keepLast;
              buffer.chunks.splice(0, chunksToRemove);
            } else {
              buffer.chunks = [];
            }
            buffer.totalBytes = buffer.chunks.reduce((sum, c) => sum + Math.ceil(c.data.length * 0.75), 0);
          });
        }
        
        return Response.json({ success: true, message: 'Audio consumed' });

      default:
        return Response.json({ success: false, message: 'Unknown message type' }, { status: 400 });
    }
  } catch (error) {
    logger.error('[Mobile API]', 'Error:', error);
    return Response.json({ 
      success: false, 
      message: 'Invalid request body' 
    }, { status: 400 });
  }
}

// ===================== HELPER =====================
function getQueueByCompanion(): Record<string, QueueItem[]> {
  const result: Record<string, QueueItem[]> = {};
  songQueue.forEach(item => {
    if (!result[item.companionCode]) {
      result[item.companionCode] = [];
    }
    if (item.status !== 'completed') {
      result[item.companionCode].push(item);
    }
  });
  return result;
}
