import { NextRequest } from 'next/server';
import type { PitchData, MobileProfile, MobileClient } from './mobile-types';
import {
  mobileClients,
  connectionCodes,
  profileToClient,
  persistentProfileByIp,
  latestPitchData,
  mutableState,
  getUniqueConnectionCode,
  cleanupInactiveClients,
  getQueueByCompanion,
  resetAllState,
  removeClient,
  requireAuth,
} from './mobile-state';
import { getClientIp } from '@/lib/rate-limiter';

// ===================== GET HANDLER =====================

// Throttle cleanup to run at most once every 30 seconds
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 30_000;

export async function handleGetRequest(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const clientId = searchParams.get('clientId');
  const companionCode = searchParams.get('code');
  const reconnectCode = searchParams.get('reconnectCode');

  // Throttled cleanup: only run once every 30 seconds
  const now = Date.now();
  if (now - lastCleanupTime >= CLEANUP_INTERVAL_MS) {
    lastCleanupTime = now;
    cleanupInactiveClients();
  }

  try {
  switch (action) {
    case 'connect':
      // Generate new client with unique connection code
      {
        const clientIp = getClientIp(request);
        
        // CRITICAL FIX (Session reconnection): Before creating a new client,
        // check if there's an existing zombie client to merge into.
        // On refresh, the old client session should be merged into the new one
        // to preserve profile, queue, and remote control state.
        //
        // Strategy (Fix 1 — IP-based NAT session theft prevention):
        //   1. If caller provides a `reconnectCode`, look up the zombie by that code.
        //      The stored code is authoritative — no IP check required.
        //   2. Fall back to IP-based search only when no code is provided
        //      (backward compatibility for old clients).
        let zombieClient: MobileClient | null = null;
        if (reconnectCode) {
          // Code-based lookup: trust the stored connection code
          const existingClientId = connectionCodes.get(reconnectCode);
          if (existingClientId) {
            const candidate = mobileClients.get(existingClientId);
            if (candidate) {
              zombieClient = candidate;
            }
          }
        }
        // Fallback: IP-based zombie detection (backward compatibility)
        if (!zombieClient) {
          const existingClients = Array.from(mobileClients.values());
          zombieClient = existingClients.find(
            (c) => c.clientIp === clientIp
          ) ?? null;
        }
        
        // If a zombie was found, reuse its session instead of creating new
        if (zombieClient) {
          
          // Update the zombie's activity timestamp
          zombieClient.connected = Date.now();
          zombieClient.lastActivity = Date.now();
          zombieClient.clientIp = clientIp;
          zombieClient.pitchData = null; // Clear stale pitch data
          
          // Keep the zombie's connection code so the client stays consistent
          const connectionCode = zombieClient.connectionCode;
          
          // Return the zombie's session as if reconnect succeeded
          return Response.json({
            success: true,
            clientId: zombieClient.id,
            connectionCode,
            message: reconnectCode
              ? 'Reconnected via connection code'
              : 'Reconnected via IP recognition',
            gameState: mutableState.gameState,
            profile: zombieClient.profile || null,
            hasRemoteControl: zombieClient.hasRemoteControl,
            type: zombieClient.type,
            ipReconnected: !reconnectCode, // Flag: true only when IP-based
            codeReconnected: !!reconnectCode, // Flag: true when code-based
          });
        }
        
        // No zombie found — check persistent profile store for this IP
        // (survives cleanup after long standby >5 min)
        const persistedEntry = persistentProfileByIp.get(clientIp);
        const persistedProfile = persistedEntry?.profile || null;
        if (persistedEntry) {
          persistentProfileByIp.delete(clientIp); // One-time restore
        }
        
        // No zombie found — create fresh client
        const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const connectionCode = getUniqueConnectionCode();
        
        mobileClients.set(newClientId, {
          id: newClientId,
          connectionCode,
          type: 'microphone',
          name: persistedProfile?.name || 'Mobile Device',
          connected: Date.now(),
          lastActivity: Date.now(),
          pitchData: null,
          profile: persistedProfile || null,
          queueCount: 0,
          hasRemoteControl: false,
          clientIp,
        });
        
        connectionCodes.set(connectionCode, newClientId);
        
        // Restore profile mappings if we have a persisted profile
        if (persistedProfile) {
          profileToClient.set(persistedProfile.id, newClientId);
        }
        
        return Response.json({ 
          success: true, 
          clientId: newClientId,
          connectionCode,
          message: 'Connected to Karaoke ZERO',
          gameState: mutableState.gameState,
          profile: persistedProfile || undefined,
          ipReconnected: !!persistedProfile,
        });
      }

    case 'status':
      // Return all connected clients with their profiles
      return Response.json({
        success: true,
        clients: Array.from(mobileClients.values()).map(c => ({
          id: c.id,
          // connectionCode intentionally excluded — sensitive, only returned to owner
          name: c.name,
          type: c.type,
          connected: c.connected,
          lastActivity: c.lastActivity,
          profile: c.profile,
          queueCount: c.queueCount,
          hasPitch: c.pitchData !== null,
        })),
        connectedCount: mobileClients.size,
        gameState: mutableState.gameState,
        queue: mutableState.songQueue.filter(q => q.status !== 'completed'),
      });

    case 'disconnect':
      if (clientId) {
        const client = removeClient(clientId);
        if (client) {
          return Response.json({ success: true, message: 'Disconnected' });
        }
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'kick':
      // Admin kick: forcefully disconnect a client (called from settings)
      // Auth required: this is a privileged admin action
      if (!requireAuth(request)) {
        return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
      }
      {
        const kickClientId = searchParams.get('kickClientId');
        if (kickClientId) {
          const client = removeClient(kickClientId, { purgeQueue: true });
          if (client) {
            const kickedName = client.profile?.name || client.name;
            return Response.json({ success: true, message: `Kicked ${kickedName}` });
          }
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
          // connectionCode intentionally excluded — sensitive, only returned to owner
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
          isLocked: mutableState.remoteControlState.lockedBy !== null,
          lockedByName: mutableState.remoteControlState.lockedByName,
        },
      });

    case 'getpitch': {
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
    }

    case 'gamestate':
      // Mobile client gets current game state
      return Response.json({
        success: true,
        gameState: {
          ...mutableState.gameState,
          queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
        },
      });

    case 'getqueue':
      // Get current song queue with companion info
      return Response.json({
        success: true,
        queue: mutableState.songQueue.filter(q => q.status !== 'completed'),
        queueByCompanion: getQueueByCompanion(),
      });

    case 'getjukebox':
      // Get jukebox wishlist
      return Response.json({
        success: true,
        wishlist: mutableState.jukeboxWishlist,
      });

    case 'profile':
      // Get profile for a client
      if (clientId) {
        const client = mobileClients.get(clientId);
        if (!client) return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
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
      if (companionCode) {
        const existingClientId = connectionCodes.get(companionCode);
        if (!existingClientId) return Response.json({ success: false, message: 'Code not found' }, { status: 404 });
        const client = mobileClients.get(existingClientId);
        if (client) {
          client.lastActivity = Date.now();
          return Response.json({
            success: true,
            clientId: existingClientId,
            connectionCode: companionCode,
            profile: client.profile,
            message: 'Reconnected successfully',
            gameState: mutableState.gameState,
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
        results: mutableState.lastGameResults,
      });

    case 'getprofiles': {
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
    }

    case 'hostprofiles':
      // Get host profiles for companion to choose from
      // Profiles are synced to server memory by the main app via POST sethostprofiles
      {
        // Collect all profile IDs that are currently claimed by OTHER connected companions
        const requestingClientId = clientId || '';
        const claimedProfileIds: string[] = [];
        mobileClients.forEach((client) => {
          if (client.profile && client.id !== requestingClientId) {
            claimedProfileIds.push(client.profile.id);
          }
        });
        
        return Response.json({
          success: true,
          profiles: mutableState.hostProfiles,
          count: mutableState.hostProfiles.length,
          claimedProfileIds, // IDs of profiles taken by OTHER connected companions
        });
      }

    case 'remotecontrol':
      // Get remote control state (for all clients to see who has control)
      return Response.json({
        success: true,
        remoteControl: {
          isLocked: mutableState.remoteControlState.lockedBy !== null,
          lockedBy: mutableState.remoteControlState.lockedBy,
          lockedByName: mutableState.remoteControlState.lockedByName,
          lockedAt: mutableState.remoteControlState.lockedAt,
          myClientId: clientId,
          iHaveControl: mutableState.remoteControlState.lockedBy === clientId,
        },
      });

    case 'getcommands':
      // Main app polls this to get pending remote commands
      // Auth required: this exposes all queued commands
      if (!requireAuth(request)) {
        return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
      }
      {
        const commands = [...mutableState.remoteControlState.pendingCommands];
        // Clear commands after they're fetched
        mutableState.remoteControlState.pendingCommands = [];
        return Response.json({
          success: true,
          commands,
          remoteControlState: {
            isLocked: mutableState.remoteControlState.lockedBy !== null,
            lockedBy: mutableState.remoteControlState.lockedBy,
            lockedByName: mutableState.remoteControlState.lockedByName,
          },
        });
      }

    case 'clearall':
      // Clear all connections (when main app closes)
      // Auth required: destructive admin action
      if (!requireAuth(request)) {
        return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
      }
      resetAllState();
      return Response.json({ 
        success: true, 
        message: 'All connections cleared',
      });

    case 'getsongs':
      // Get cached song library for companion clients
      return Response.json({
        success: true,
        songs: mutableState.songLibrary,
        count: mutableState.songLibrary.length,
      });

    // F4: Get chat messages (last 50)
    case 'getchat':
      return Response.json({
        success: true,
        messages: mutableState.chatMessages.slice(-50),
      });

    // #10 Get tournament crowd votes for spectator UI
    case 'get_crowd_votes':
      return Response.json({
        success: true,
        votes: mutableState.tournamentCrowdVotes || [],
      });

    // F19: Get opponents for duel/duet mode (only clients WITH profiles)
    case 'getopponents': {
      if (!clientId) {
        return Response.json({ success: false, message: 'Client ID required' }, { status: 400 });
      }
      const requestingClient = mobileClients.get(clientId);

      // Collect opponents: connected clients with profiles, excluding the requester
      const connectedOpponents: Array<{
        id: string;
        name: string;
        avatar?: string;
        color: string;
        connectionCode: string;
      }> = [];

      // Track which profile IDs are claimed by connected companions
      const claimedProfileIds = new Set<string>();
      mobileClients.forEach((client) => {
        if (client.profile) {
          claimedProfileIds.add(client.profile.id);
          if (client.id !== clientId) {
            connectedOpponents.push({
              id: client.profile.id,
              name: client.profile.name,
              avatar: client.profile.avatar,
              color: client.profile.color,
              connectionCode: client.connectionCode,
            });
          }
        }
      });

      // Also include host profiles not yet claimed by any connected companion
      // (these are available for companions to adopt)
      const availableHostProfiles = mutableState.hostProfiles.filter(
        (hp) => !claimedProfileIds.has(hp.id) && hp.id !== requestingClient?.profile?.id
      ).map((hp) => ({
        id: hp.id,
        name: hp.name,
        avatar: hp.avatar,
        color: hp.color,
        connectionCode: '',
      }));

      return Response.json({
        success: true,
        opponents: connectedOpponents,
        availableProfiles: availableHostProfiles,
      });
    }

    default:
      return Response.json({
        success: true,
        message: 'Karaoke ZERO Mobile API',
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
  } catch (error) {
    console.error('[mobile GET] Internal error:', error);
    return Response.json(
      { success: false, message: 'Internal error' },
      { status: 500 }
    );
  }
}
