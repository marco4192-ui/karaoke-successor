import { NextRequest, NextResponse } from 'next/server';

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
  // Optional partner for duet/duel mode
  partnerId?: string;
  partnerName?: string;
  // Game mode for this queue item
  gameMode?: 'single' | 'duel' | 'duet';
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
  gameMode: string | null; // Current game mode (for pitch handling decision)
} = {
  currentSong: null,
  isPlaying: false,
  currentTime: 0,
  songEnded: false,
  isAdPlaying: false,
  gameMode: null,
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

// Song Library - Cached songs from main app for companion clients
let songLibrary: Array<{
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}> = [];

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
        // Release remote control if this client had it
        if (remoteControlState.lockedBy === clientId) {
          remoteControlState = { lockedBy: null, lockedByName: null, lockedAt: null, pendingCommands: [] };
        }
        mobileClients.delete(clientId);
        latestPitchData.delete(clientId);
        return Response.json({ success: true, message: 'Disconnected' });
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'kick':
      // Admin kick: forcefully disconnect a client (called from settings)
      {
        const kickClientId = searchParams.get('kickClientId');
        if (kickClientId && mobileClients.has(kickClientId)) {
          const client = mobileClients.get(kickClientId)!;
          const kickedName = client.profile?.name || client.name;
          connectionCodes.delete(client.connectionCode);
          if (client.profile) {
            profileToClient.delete(client.profile.id);
          }
          // Release remote control if this client had it
          if (remoteControlState.lockedBy === kickClientId) {
            remoteControlState = { lockedBy: null, lockedByName: null, lockedAt: null, pendingCommands: [] };
          }
          // Remove their queue items
          songQueue = songQueue.filter(q => q.companionCode !== client.connectionCode);
          mobileClients.delete(kickClientId);
          latestPitchData.delete(kickClientId);
          console.log(`[Mobile API] Kicked client: ${kickedName} (${client.connectionCode})`);
          return Response.json({ success: true, message: `Kicked ${kickedName}` });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
      }

    case 'clients':
      // Alias for status (used by companion list component)
      // Return all connected clients with their profiles and detailed info
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
          hasRemoteControl: c.hasRemoteControl,
        })),
        connectedCount: mobileClients.size,
        remoteControl: {
          isLocked: remoteControlState.lockedBy !== null,
          lockedByName: remoteControlState.lockedByName,
        },
      });

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

    case 'getprofiles':
      // Get all companion profiles for main app to import
      const companionProfiles: MobileProfile[] = [];
      mobileClients.forEach((client) => {
        if (client.profile) {
          companionProfiles.push(client.profile);
        }
      });
      
      return Response.json({
        success: true,
        profiles: companionProfiles,
        count: companionProfiles.length,
      });

    case 'hostprofiles':
      // Get host profiles for companion to choose from
      // Main app stores its profiles in localStorage via zustand
      // We read from a shared endpoint that the main app writes to
      {
        let hostProfiles: MobileProfile[] = [];
        try {
          const stored = localStorage.getItem('karaoke-host-profiles');
          if (stored) {
            hostProfiles = JSON.parse(stored);
          }
        } catch { /* ignore */ }
        
        return Response.json({
          success: true,
          profiles: hostProfiles,
          count: hostProfiles.length,
        });
      }

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
      songQueue = [];
      jukeboxWishlist = [];
      gameState = {
        currentSong: null,
        isPlaying: false,
        currentTime: 0,
        songEnded: false,
        isAdPlaying: false,
        gameMode: null,
      };
      // Reset remote control state
      remoteControlState = {
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        pendingCommands: [],
      };
      return Response.json({ 
        success: true, 
        message: 'All connections cleared',
      });

    case 'getsongs':
      // Get cached song library for companion clients
      return Response.json({
        success: true,
        songs: songLibrary,
        count: songLibrary.length,
      });

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
        
        const queuePayload = payload as { 
          songId: string; 
          songTitle: string; 
          songArtist: string;
          partnerId?: string;
          partnerName?: string;
          gameMode?: 'single' | 'duel' | 'duet';
        };
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
          songId: queuePayload.songId,
          songTitle: queuePayload.songTitle,
          songArtist: queuePayload.songArtist,
          addedBy: clientForQueue.profile?.name || clientForQueue.name,
          addedAt: Date.now(),
          companionCode: clientForQueue.connectionCode,
          status: 'pending',
          partnerId: queuePayload.partnerId,
          partnerName: queuePayload.partnerName,
          gameMode: queuePayload.gameMode || 'single',
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

      case 'markplaying':
        // Mark a song as currently playing (called by main app or queue screen)
        const playingPayload = payload as { itemId: string };
        const playingItem = songQueue.find(q => q.id === playingPayload.itemId);
        
        if (playingItem) {
          // Mark all other items as not playing (only one can be playing at a time)
          songQueue.forEach(q => {
            if (q.status === 'playing') {
              q.status = 'pending';
            }
          });
          
          playingItem.status = 'playing';
          
          return Response.json({ 
            success: true, 
            message: 'Song marked as playing',
            item: playingItem,
          });
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
        console.log('[Mobile API] Ad state updated:', adPayload.isAdPlaying);
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
        console.log('[Mobile API] Skip ad command queued from:', skipAdClient.profile?.name || skipAdClient.name);
        
        return Response.json({ 
          success: true, 
          message: 'Skip ad command sent',
        });

      case 'assigncharacter':
        // Assign a character profile to a companion (called from settings)
        {
          const assignPayload = payload as { targetClientId: string; profile: MobileProfile | null };
          const targetClientId = assignPayload.targetClientId;
          
          if (targetClientId && mobileClients.has(targetClientId)) {
            const targetClient = mobileClients.get(targetClientId)!;
            
            // Clear old profile mapping
            if (targetClient.profile) {
              profileToClient.delete(targetClient.profile.id);
            }
            
            // Set new profile
            targetClient.profile = assignPayload.profile;
            if (assignPayload.profile) {
              targetClient.name = assignPayload.profile.name;
              profileToClient.set(assignPayload.profile.id, targetClientId);
            } else {
              targetClient.name = 'Mobile Device';
            }
            
            mobileClients.set(targetClientId, targetClient);
            
            return Response.json({
              success: true,
              message: assignPayload.profile
                ? `Character "${assignPayload.profile.name}" assigned to companion`
                : 'Character removed from companion',
              client: {
                id: targetClient.id,
                connectionCode: targetClient.connectionCode,
                name: targetClient.name,
                profile: targetClient.profile,
              },
            });
          }
          return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
        }

      case 'heartbeat':
        // Keep connection alive
        if (clientId && mobileClients.has(clientId)) {
          const client = mobileClients.get(clientId)!;
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
          return Response.json({ success: true, timestamp: Date.now() });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

      case 'setsongs':
        // Main app syncs its song library for companion clients
        const songsPayload = payload as Array<{
          id: string;
          title: string;
          artist: string;
          duration: number;
          genre?: string;
          language?: string;
          coverImage?: string;
        }>;
        
        if (Array.isArray(songsPayload)) {
          songLibrary = songsPayload;
          console.log('[Mobile API] Song library updated:', songLibrary.length, 'songs');
          return Response.json({ 
            success: true, 
            message: 'Song library updated',
            count: songLibrary.length,
          });
        }
        return Response.json({ success: false, message: 'Invalid songs payload' }, { status: 400 });

      default:
        return Response.json({ success: false, message: 'Unknown message type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Mobile API error:', error);
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
