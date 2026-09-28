// ===================== QUEUE & JUKEBOX HANDLERS =====================
// POST /api/mobile actions for the song queue and jukebox wishlist:
// 'queue', 'reorderqueue', 'removequeue', 'markplaying', 'queuecompleted',
// 'jukebox', 'jukebox_wishlist_remove'. Extracted 1:1 from post-handlers.ts
// (R8), no behavior change.

import type { NextRequest } from 'next/server';
import type { QueueItem } from '../mobile-types';
import {
  mobileClients,
  mutableState,
  requireAuth,
  MAX_JUKEBOX_PER_CLIENT,
} from '../mobile-state';

export function handleQueueAdd(payload: unknown, clientId: string): Response {
  // Add song to queue (with max 3 per companion limit)
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  
  const queuePayload = payload as { 
    songId: string; 
    songTitle: string; 
    songArtist: string;
    playerId?: string;
    playerName?: string;
    partnerId?: string;
    partnerName?: string;
    gameMode?: 'single' | 'duel' | 'duet';
    difficulty?: 'easy' | 'medium' | 'hard';
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

  // Validate required partner for duel/duet mode
  if ((queuePayload.gameMode === 'duel' || queuePayload.gameMode === 'duet') && !queuePayload.partnerId) {
    return Response.json({
      success: false,
      message: 'Duel/Duet requires an opponent. Please select an opponent or start a challenge.',
    }, { status: 400 });
  }

  // Validate partner exists for duel/duet mode
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
    playerId: queuePayload.playerId || clientForQueue.profile?.id,
    playerName: queuePayload.playerName || clientForQueue.profile?.name,
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

export function handleQueueReorder(payload: unknown, clientId: string): Response {
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
  const newQueue: typeof mutableState.songQueue = [];
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

export function handleQueueRemove(payload: unknown, clientId: string): Response {
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

export function handleMarkPlaying(request: NextRequest, payload: unknown): Response {
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

export function handleQueueCompleted(request: NextRequest, payload: unknown): Response {
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

export function handleJukeboxAdd(payload: unknown, clientId: string): Response {
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

export function handleJukeboxWishlistRemove(payload: unknown, clientId: string): Response {
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
