import { NextRequest } from 'next/server';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteCommand } from './mobile-types';
import {
  mobileClients,
  connectionCodes,
  profileToClient,
  latestPitchData,
  mutableState,
  getUniqueConnectionCode,
  registerClient,
  removeClient,
  requireAuth,
  requireAuthOrRemoteHolder,
  MAX_JUKEBOX_PER_CLIENT,
  MAX_TOURNAMENT_VOTES,
  tournamentVoteDedup,
} from './mobile-state';

// ===================== POST HANDLER =====================
export async function handlePostRequest(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { type, payload, clientId } = body;

    switch (type) {
      case 'register': {
        const newClientId = `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        const connectionCode = getUniqueConnectionCode();
        const regPayload = payload as { type?: string; name?: string; profile?: MobileProfile };
        
        // Check for duplicate profile
        if (regPayload.profile) {
          const existingClientId = profileToClient.get(regPayload.profile.id);
          if (existingClientId) {
            // Terminate old connection (with full cleanup)
            removeClient(existingClientId, { purgeQueue: true });
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
          clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined,
        };

        // Check max client limit before registering
        const regError = registerClient(newClientId, newClient);
        if (regError) {
          return Response.json({ success: false, message: regError }, { status: 503 });
        }
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
      }

      case 'pitch': {
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

      case 'batch_pitch': {
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

      case 'command': {
        const cmdPayload = payload as { command: string; data?: unknown };
        return Response.json({ success: true, executed: cmdPayload.command });
      }

      case 'sync':
        return Response.json({ 
          success: true, 
          state: mutableState.gameState,
        });

      case 'gamestate': {
        // PC updates game state for mobile clients to see
        // Auth: require admin PIN or current remote control holder
        if (!requireAuthOrRemoteHolder(request, clientId)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN or hold remote control.' }, { status: 401 });
        }
        const gsPayload = payload as typeof mutableState.gameState;
        // Clear tournament vote dedup when matchId changes
        if (gsPayload.tournamentMatchId !== mutableState.gameState.tournamentMatchId) {
          tournamentVoteDedup.clear();
        }
        mutableState.gameState = { ...gsPayload };
        
        // If song ended, notify all clients and clear pitch data
        if (gsPayload.songEnded) {
          latestPitchData.clear();
          mobileClients.forEach((client) => {
            client.pitchData = null;
          });
        }
        
        return Response.json({ success: true, updated: true });
      }

      case 'profile':
        // Update profile for a client
        if (clientId) {
          const profilePayload = payload as MobileProfile;
          // Input validation: name max 50 chars, color must be hex format
          if (!profilePayload.name || typeof profilePayload.name !== 'string' || profilePayload.name.length > 50) {
            return Response.json({ success: false, message: 'Invalid name (max 50 characters)' }, { status: 400 });
          }
          if (!/^#[0-9A-Fa-f]{6}$/.test(profilePayload.color || '')) {
            return Response.json({ success: false, message: 'Invalid color (must be hex format #RRGGBB)' }, { status: 400 });
          }
          const client = mobileClients.get(clientId);
          if (!client) return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
          
          // Check for duplicate profile (different client using same profile)
          const duplicateClientId = profileToClient.get(profilePayload.id);
          if (duplicateClientId && duplicateClientId !== clientId) {
            // Terminate old connection (with full cleanup)
            removeClient(duplicateClientId, { purgeQueue: true });
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

      case 'queue': {
        // Add song to queue (with max 3 per companion limit)
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const queuePayload = payload as { 
          songId: string; 
          songTitle: string; 
          songArtist: string;
          partnerId?: string;
          partnerName?: string;
          gameMode?: 'single' | 'duel' | 'duet';
          difficulty?: 'easy' | 'normal' | 'hard';
          playerMicSource?: 'companion' | 'microphone';
          partnerMicSource?: 'companion' | 'microphone';
          duetPartsSwapped?: boolean;
        };
        // Input validation: songTitle and songArtist max 200 chars
        if (!queuePayload.songTitle || typeof queuePayload.songTitle !== 'string' || queuePayload.songTitle.length > 200) {
          return Response.json({ success: false, message: 'Invalid song title (max 200 characters)' }, { status: 400 });
        }
        if (!queuePayload.songArtist || typeof queuePayload.songArtist !== 'string' || queuePayload.songArtist.length > 200) {
          return Response.json({ success: false, message: 'Invalid song artist (max 200 characters)' }, { status: 400 });
        }
        const clientForQueue = mobileClients.get(clientId);
        if (!clientForQueue) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        
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

        // F19: Validate partner exists for duel/duet mode
        if ((queuePayload.gameMode === 'duel' || queuePayload.gameMode === 'duet') && queuePayload.partnerId) {
          // Look up partner by connection code or profile ID
          let partnerFound = false;
          let partnerClientId: string | null = null;
          
          mobileClients.forEach((client) => {
            if (client.id === clientId) return; // Skip self
            if (client.connectionCode === queuePayload.partnerId ||
                client.profile?.id === queuePayload.partnerId) {
              partnerFound = true;
              partnerClientId = client.id;
            }
          });

          if (!partnerFound && queuePayload.partnerId) {
            // Partner might be a host profile not yet adopted — allow it
            // (the main app will match it when starting the game)
            const isHostProfile = mutableState.hostProfiles.some(
              (hp) => hp.id === queuePayload.partnerId
            );
            if (!isHostProfile) {
              return Response.json({
                success: false,
                message: 'Selected opponent is no longer connected',
              }, { status: 400 });
            }
          }

          // F19: Store pending duel request so the partner's companion can poll it
          if (partnerClientId && clientForQueue.profile) {
            mutableState.pendingDuelRequests = mutableState.pendingDuelRequests || [];
            // Remove any existing pending request to the same partner
            mutableState.pendingDuelRequests = mutableState.pendingDuelRequests.filter(
              (r: { targetClientId: string }) => r.targetClientId !== partnerClientId
            );
            mutableState.pendingDuelRequests.push({
              fromClientId: clientId,
              fromProfileName: clientForQueue.profile.name,
              targetClientId: partnerClientId,
              songTitle: queuePayload.songTitle,
              gameMode: queuePayload.gameMode || 'duel',
              timestamp: Date.now(),
            });
          }
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
          difficulty: queuePayload.difficulty,
          playerMicSource: queuePayload.playerMicSource,
          partnerMicSource: queuePayload.partnerMicSource,
          duetPartsSwapped: queuePayload.duetPartsSwapped,
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
      }

      case 'reorderqueue': {
        // Reorder pending queue items — only the user's own items
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 401 });
        }
        const reorderPayload = payload as { orderedIds: string[] };
        const reorderClient = mobileClients.get(clientId);
        if (!reorderClient) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 401 });
        }

        if (!Array.isArray(reorderPayload.orderedIds) || reorderPayload.orderedIds.length === 0) {
          return Response.json({ success: false, message: 'Invalid ordered IDs' }, { status: 400 });
        }

        // Get all pending items belonging to this user
        const userPendingItems = mutableState.songQueue.filter(
          q => q.companionCode === reorderClient.connectionCode && q.status === 'pending'
        );

        // Verify all orderedIds belong to this user and are pending
        const userPendingIds = new Set(userPendingItems.map(q => q.id));
        for (const id of reorderPayload.orderedIds) {
          if (!userPendingIds.has(id)) {
            return Response.json({ success: false, message: 'Cannot reorder items that are not yours' }, { status: 403 });
          }
        }

        // Rebuild the global queue: keep non-user items in place, reorder user's items
        const orderedSet = new Set(reorderPayload.orderedIds);
        const reorderedUserItems = reorderPayload.orderedIds
          .map(id => mutableState.songQueue.find(q => q.id === id))
          .filter(Boolean) as typeof mutableState.songQueue;

        // Build new queue: insert reordered items where the first user item was
        let newQueue: typeof mutableState.songQueue = [];
        let userItemsInserted = false;

        for (const item of mutableState.songQueue) {
          if (orderedSet.has(item.id)) {
            if (!userItemsInserted) {
              newQueue.push(...reorderedUserItems);
              userItemsInserted = true;
            }
            // Skip — already inserted in new order
          } else {
            newQueue.push(item);
          }
        }

        mutableState.songQueue = newQueue;

        return Response.json({
          success: true,
          message: 'Queue reordered',
          queue: mutableState.songQueue.filter(q => q.status !== 'completed'),
        });
      }

      case 'removequeue': {
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
      }

      case 'markplaying': {
        // Mark a song as currently playing (called by main app or queue screen)
        // Auth: require admin PIN
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
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
      }

      case 'queuecompleted': {
        // Mark a song as completed (called by main app)
        // Auth: require admin PIN
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
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
      }

      case 'jukebox': {
        // Add song to jukebox wishlist
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const jukeboxPayload = payload as { songId: string; songTitle: string; songArtist: string; coverImage?: string; duration?: number };
        const clientForJukebox = mobileClients.get(clientId);
        if (!clientForJukebox) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        
        // Enforce max 20 items per clientId
        const clientWishlistCount = mutableState.jukeboxWishlist.filter(
          q => q.companionCode === clientForJukebox.connectionCode
        ).length;
        if (clientWishlistCount >= MAX_JUKEBOX_PER_CLIENT) {
          return Response.json({
            success: false,
            message: `Maximum ${MAX_JUKEBOX_PER_CLIENT} wishlist songs per companion`,
          }, { status: 400 });
        }

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
      }

      case 'jukebox_wishlist_remove': {
        // Remove song from jukebox wishlist — only the creator (matching companionCode) can remove
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 403 });
        }
        const removeWishPayload = payload as { itemId: string };
        const requestingWishClient = mobileClients.get(clientId);
        if (!requestingWishClient) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 403 });
        }
        const wishIndex = mutableState.jukeboxWishlist.findIndex(q => q.id === removeWishPayload.itemId);

        if (wishIndex !== -1) {
          const wishItem = mutableState.jukeboxWishlist[wishIndex];
          // Ownership check: only the companion that added this song can remove it
          if (wishItem.companionCode !== requestingWishClient.connectionCode) {
            return Response.json({ success: false, message: 'You can only remove your own songs' }, { status: 403 });
          }
          mutableState.jukeboxWishlist.splice(wishIndex, 1);
          return Response.json({ success: true, message: 'Song removed from wishlist' });
        }
        return Response.json({ success: false, message: 'Item not found' }, { status: 404 });
      }

      case 'results':
        // Store game results for social features
        // Auth: require admin PIN
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        mutableState.lastGameResults = payload as typeof mutableState.lastGameResults;
        return Response.json({ success: true, message: 'Results stored' });

      case 'remote_acquire': {
        // Acquire remote control lock
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const acquireClient = mobileClients.get(clientId);
        if (!acquireClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        
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
      }

      case 'remote_release': {
        // Release remote control lock
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        // Can only release if we have the lock
        if (mutableState.remoteControlState.lockedBy !== clientId) {
          return Response.json({ 
            success: false, 
            message: 'You do not have remote control',
          }, { status: 403 });
        }
        
        const releaseClient = mobileClients.get(clientId);
        if (!releaseClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
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
      }

      case 'remote_command': {
        // Send a remote control command
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const commandPayload = payload as { command: RemoteCommand['type']; data?: unknown };
        const commandClient = mobileClients.get(clientId);
        if (!commandClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        
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
      }

      case 'setAdPlaying': {
        // Set ad playing state (from main app)
        // Auth: require admin PIN
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const adPayload = payload as { isAdPlaying: boolean };
        mutableState.gameState.isAdPlaying = adPayload.isAdPlaying;
        return Response.json({ success: true, isAdPlaying: mutableState.gameState.isAdPlaying });
      }

      case 'skipAd': {
        // Request to skip ad (from mobile client)
        // This will be picked up by the main app polling for commands
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        
        const skipAdClient = mobileClients.get(clientId);
        if (!skipAdClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        
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
      }

      case 'assigncharacter':
        // Assign a character profile to a companion (called from settings)
        // Auth required: this is a privileged admin action
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        {
          const assignPayload = payload as { targetClientId: string; profile: MobileProfile | null };
          const targetClientId = assignPayload.targetClientId;
          
          if (targetClientId) {
            const targetClient = mobileClients.get(targetClientId);
            if (!targetClient) return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
            
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
        if (clientId) {
          const client = mobileClients.get(clientId);
          if (!client) return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
          client.lastActivity = Date.now();
          mobileClients.set(clientId, client);
          return Response.json({ success: true, timestamp: Date.now() });
        }
        return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

      case 'sethostprofiles':
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

      case 'setsongs': {
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
      }

      // F4: Companion sends a chat message
      case 'chat': {
        if (!clientId) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
        }
        const chatPayload = payload as { text: string };
        const chatClient = mobileClients.get(clientId);
        if (!chatClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });

        const chatText = typeof chatPayload.text === 'string' ? chatPayload.text.trim() : '';
        if (!chatText || chatText.length > 200) {
          return Response.json({ success: false, message: 'Message must be 1-200 characters' }, { status: 400 });
        }

        const chatMsg = {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          from: clientId,
          fromName: chatClient.profile?.name || chatClient.name,
          text: chatText,
          timestamp: Date.now(),
          isHost: false,
        };

        mutableState.chatMessages.push(chatMsg);

        // Keep max 100 messages (FIFO)
        if (mutableState.chatMessages.length > 100) {
          mutableState.chatMessages = mutableState.chatMessages.slice(-100);
        }

        // Update activity
        chatClient.lastActivity = Date.now();
        mobileClients.set(clientId, chatClient);

        return Response.json({ success: true, message: 'Message sent' });
      }

      // F4: Host sends a chat message (authenticated)
      case 'chat_host': {
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const hostChatPayload = payload as { text: string; fromName?: string };
        const hostChatText = typeof hostChatPayload.text === 'string' ? hostChatPayload.text.trim() : '';
        if (!hostChatText || hostChatText.length > 200) {
          return Response.json({ success: false, message: 'Message must be 1-200 characters' }, { status: 400 });
        }

        const hostChatMsg = {
          id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          from: 'host',
          fromName: hostChatPayload.fromName || 'Host',
          text: hostChatText,
          timestamp: Date.now(),
          isHost: true,
        };

        mutableState.chatMessages.push(hostChatMsg);

        // Keep max 100 messages (FIFO)
        if (mutableState.chatMessages.length > 100) {
          mutableState.chatMessages = mutableState.chatMessages.slice(-100);
        }

        return Response.json({ success: true, message: 'Host message sent' });
      }

      // #10 Tournament crowd vote — companion spectators vote on match results
      case 'tournament_crowd_vote': {
        const votePayload = payload as { matchId: string; playerSide: 1 | 2 };
        if (!clientId || !votePayload.matchId || !votePayload.playerSide) {
          return Response.json({ success: false, message: 'Invalid vote payload' }, { status: 400 });
        }
        // Deduplication: check if this clientId already voted for this matchId
        const voteKey = `${clientId}:${votePayload.matchId}`;
        if (tournamentVoteDedup.has(voteKey)) {
          return Response.json({ success: false, message: 'Already voted for this match' });
        }
        // Enforce max 500 total votes (prune oldest)
        if (mutableState.tournamentCrowdVotes.length >= MAX_TOURNAMENT_VOTES) {
          mutableState.tournamentCrowdVotes = mutableState.tournamentCrowdVotes.slice(-MAX_TOURNAMENT_VOTES + 1);
        }
        // Store vote in mutable state for the main app to pick up
        if (!mutableState.tournamentCrowdVotes) {
          mutableState.tournamentCrowdVotes = [];
        }
        const client = mobileClients.get(clientId);
        mutableState.tournamentCrowdVotes.push({
          clientId,
          profileId: client?.profile?.id || null,
          profileName: client?.profile?.name || client?.name || 'Anonymous',
          matchId: votePayload.matchId,
          playerSide: votePayload.playerSide,
          timestamp: Date.now(),
        });
        tournamentVoteDedup.add(voteKey);
        return Response.json({ success: true, message: 'Vote recorded' });
      }

      default:
        return Response.json({ success: false, message: 'Unknown message type' }, { status: 400 });
    }
  } catch (error) {
    // ECONNRESET / aborted: client disconnected mid-request (e.g. React
    // StrictMode double-mount or navigation).  Silently ignore — not a real error.
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ECONNRESET' || code === 'ECANCELED') {
      return new Response(null, { status: 499 });
    }
    // eslint-disable-next-line no-console
    console.error('Mobile API error:', error);
    return Response.json({
      success: false,
      message: 'Invalid request body'
    }, { status: 400 });
  }
}
