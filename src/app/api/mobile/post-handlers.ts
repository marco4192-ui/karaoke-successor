import { NextRequest } from 'next/server';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteCommand } from './mobile-types';
import {
  mobileClients,
  connectionCodes,
  profileToClient,
  latestPitchData,
  mutableState,
  getUniqueConnectionCode,
  removeClient,
  requireAuth,
} from './mobile-state';

// ===================== POST HANDLER =====================
export async function handlePostRequest(request: NextRequest): Promise<Response> {
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
          // Terminate old connection (with full cleanup)
          removeClient(profileToClient.get(regPayload.profile.id)!, { purgeQueue: true });
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
          clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
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
          gameState: mutableState.gameState,
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
          state: mutableState.gameState,
        });

      case 'gamestate':
        // PC updates game state for mobile clients to see
        const gsPayload = payload as typeof mutableState.gameState;
        mutableState.gameState = { ...gsPayload };
        
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
          const clientIp = client.clientIp;
          
          // Check for duplicate profile (different client using same profile)
          if (profileToClient.has(profilePayload.id) && profileToClient.get(profilePayload.id) !== clientId) {
            // Terminate old connection (with full cleanup)
            removeClient(profileToClient.get(profilePayload.id)!, { purgeQueue: true });
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
        const clientPendingCount = mutableState.songQueue.filter(
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
        
        mutableState.songQueue.push(queueItem);
        clientForQueue.queueCount = clientPendingCount + 1;
        mobileClients.set(clientId, clientForQueue);
        
        return Response.json({ 
          success: true, 
          queueItem,
          queue: mutableState.songQueue.filter(q => q.status !== 'completed'),
          message: 'Song added to queue',
          slotsRemaining: 3 - clientForQueue.queueCount,
        });

      case 'removequeue':
        // Remove song from queue — only the creator (matching companionCode) can remove
        const removePayload = payload as { itemId: string };
        const requestingClient = mobileClients.get(clientId);
        if (!requestingClient) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 401 });
        }
        const itemIndex = mutableState.songQueue.findIndex(q => q.id === removePayload.itemId);
        
        if (itemIndex !== -1) {
          const item = mutableState.songQueue[itemIndex];
          // Ownership check: only the companion that added this song can remove it
          if (item.companionCode !== requestingClient.connectionCode) {
            return Response.json({ success: false, message: 'You can only remove your own songs' }, { status: 403 });
          }
          // Don't allow removing a song that is currently playing
          if (item.status === 'playing') {
            return Response.json({ success: false, message: 'Cannot remove a song that is currently playing' }, { status: 400 });
          }
          if (requestingClient.queueCount > 0) {
            requestingClient.queueCount--;
          }
          mutableState.songQueue.splice(itemIndex, 1);
          mobileClients.set(clientId, requestingClient);
          return Response.json({ success: true, message: 'Song removed from queue' });
        }
        return Response.json({ success: false, message: 'Item not found' }, { status: 404 });

      case 'markplaying':
        // Mark a song as currently playing (called by main app or queue screen)
        const playingPayload = payload as { itemId: string };
        const playingItem = mutableState.songQueue.find(q => q.id === playingPayload.itemId);
        
        if (playingItem) {
          // Mark all other items as not playing (only one can be playing at a time)
          mutableState.songQueue.forEach(q => {
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
        const completedItem = mutableState.songQueue.find(q => q.id === completedPayload.itemId);
        
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
        
        mutableState.jukeboxWishlist.push(wishlistItem);
        
        return Response.json({ 
          success: true, 
          wishlistItem,
          message: 'Song added to wishlist',
        });

      case 'results':
        // Store game results for social features
        mutableState.lastGameResults = payload as typeof mutableState.lastGameResults;
        return Response.json({ success: true, message: 'Results stored' });

      case 'remote_acquire':
        // Acquire remote control lock
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const acquireClient = mobileClients.get(clientId)!;
        
        // Check if already locked by someone else
        if (mutableState.remoteControlState.lockedBy && mutableState.remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'Remote control is already taken by another device',
            lockedBy: mutableState.remoteControlState.lockedByName,
          }, { status: 403 });
        }
        
        // Acquire lock
        mutableState.remoteControlState.lockedBy = clientId;
        mutableState.remoteControlState.lockedByName = acquireClient.profile?.name || acquireClient.name;
        mutableState.remoteControlState.lockedAt = Date.now();
        acquireClient.hasRemoteControl = true;
        mobileClients.set(clientId, acquireClient);
        
        return Response.json({ 
          success: true, 
          message: 'Remote control acquired',
          remoteControl: {
            lockedBy: clientId,
            lockedByName: mutableState.remoteControlState.lockedByName,
            lockedAt: mutableState.remoteControlState.lockedAt,
          },
        });

      case 'remote_release':
        // Release remote control lock
        if (!clientId || !mobileClients.has(clientId)) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        // Can only release if we have the lock
        if (mutableState.remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'You do not have remote control',
          }, { status: 403 });
        }
        
        const releaseClient = mobileClients.get(clientId)!;
        releaseClient.hasRemoteControl = false;
        mobileClients.set(clientId, releaseClient);
        
        mutableState.remoteControlState.lockedBy = null;
        mutableState.remoteControlState.lockedByName = null;
        mutableState.remoteControlState.lockedAt = null;
        mutableState.remoteControlState.pendingCommands = [];
        
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
        if (mutableState.remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'You must acquire remote control first',
            isLocked: mutableState.remoteControlState.lockedBy !== null,
            lockedBy: mutableState.remoteControlState.lockedByName,
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
        
        mutableState.remoteControlState.pendingCommands.push(newCommand);
        
        return Response.json({ 
          success: true, 
          message: 'Command queued',
          command: newCommand,
        });

      case 'setAdPlaying':
        // Set ad playing state (from main app)
        const adPayload = payload as { isAdPlaying: boolean };
        mutableState.gameState.isAdPlaying = adPayload.isAdPlaying;
        return Response.json({ success: true, isAdPlaying: mutableState.gameState.isAdPlaying });

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
        
        mutableState.remoteControlState.pendingCommands.push(skipCommand);
        
        return Response.json({ 
          success: true, 
          message: 'Skip ad command sent',
        });

      case 'assigncharacter':
        // Assign a character profile to a companion (called from settings)
        // Auth required: this is a privileged admin action
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
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

      case 'sethostprofiles':
        // Main app syncs its character profiles for companion to choose from
        {
          const profilesPayload = payload as Array<{
            id: string;
            name: string;
            avatar?: string;
            color: string;
            createdAt: number;
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

      case 'setsongs':
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
