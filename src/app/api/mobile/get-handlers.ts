import { NextRequest } from 'next/server';
import type { PitchData, MobileProfile } from './mobile-types';
import {
  mobileClients,
  connectionCodes,
  profileToClient,
  persistentProfileByIp,
  latestPitchData,
  mutableState,
  getClientIp,
  getUniqueConnectionCode,
  cleanupInactiveClients,
  getQueueByCompanion,
  resetAllState,
} from './mobile-state';

// ===================== GET HANDLER =====================
export async function handleGetRequest(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const clientId = searchParams.get('clientId');
  const companionCode = searchParams.get('code');

  // Periodic cleanup
  cleanupInactiveClients();

  switch (action) {
    case 'connect':
      // Generate new client with unique connection code
      {
        const clientIp = getClientIp(request);
        
        // CRITICAL FIX (IP-based reconnection): Before creating a new client,
        // check if there's an existing zombie client from the same IP.
        // On refresh, the old client session should be merged into the new one
        // to preserve profile, queue, and remote control state.
        const existingClients = Array.from(mobileClients.values());
        const zombieClient = existingClients.find(
          (c) => c.clientIp === clientIp && c.id !== 'active'
        );
        
        // If a zombie with same IP exists, reuse its session instead of creating new
        if (zombieClient) {
          console.log('[MobileAPI] IP-based reconnect: found zombie client', zombieClient.id,
            'from IP', clientIp, '- reusing session');
          
          // Update the zombie's activity timestamp
          zombieClient.connected = Date.now();
          zombieClient.lastActivity = Date.now();
          zombieClient.clientIp = clientIp;
          zombieClient.pitchData = null; // Clear stale pitch data
          
          // Regenerate connection code (the old one may have been saved in client's localStorage)
          // but reuse if possible so the client doesn't need to update
          const connectionCode = zombieClient.connectionCode;
          
          // Return the zombie's session as if reconnect succeeded
          return Response.json({
            success: true,
            clientId: zombieClient.id,
            connectionCode,
            message: 'Reconnected via IP recognition',
            gameState: mutableState.gameState,
            profile: zombieClient.profile || null,
            hasRemoteControl: zombieClient.hasRemoteControl,
            type: zombieClient.type,
            ipReconnected: true, // Flag to tell client this was IP-based
          });
        }
        
        // No zombie found — check persistent profile store for this IP
        // (survives cleanup after long standby >5 min)
        const persistedProfile = persistentProfileByIp.get(clientIp);
        if (persistedProfile) {
          persistentProfileByIp.delete(clientIp); // One-time restore
          console.log('[MobileAPI] Persistent profile found for IP', clientIp,
            '- profile:', persistedProfile.name);
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
          message: 'Connected to Karaoke Successor',
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
        gameState: mutableState.gameState,
        queue: mutableState.songQueue.filter(q => q.status !== 'completed'),
      });

    case 'disconnect':
      if (clientId && mobileClients.has(clientId)) {
        const client = mobileClients.get(clientId)!;
        connectionCodes.delete(client.connectionCode);
        if (client.profile) {
          profileToClient.delete(client.profile.id);
        }
        // Release remote control if this client had it
        if (mutableState.remoteControlState.lockedBy === clientId) {
          mutableState.remoteControlState = { lockedBy: null, lockedByName: null, lockedAt: null, pendingCommands: [] };
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
          if (mutableState.remoteControlState.lockedBy === kickClientId) {
            mutableState.remoteControlState = { lockedBy: null, lockedByName: null, lockedAt: null, pendingCommands: [] };
          }
          // Remove their queue items
          mutableState.songQueue = mutableState.songQueue.filter(q => q.companionCode !== client.connectionCode);
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
          isLocked: mutableState.remoteControlState.lockedBy !== null,
          lockedByName: mutableState.remoteControlState.lockedByName,
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

    case 'clearall':
      // Clear all connections (when main app closes)
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
