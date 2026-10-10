// ===================== CHAT & CHALLENGE HANDLERS =====================
// POST /api/mobile actions for the F4 in-game chat and song challenges:
// 'chat', 'chat_host', 'chat_host_challenge', 'song_challenge',
// 'accept_challenge', 'accept_challenge_host'. Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.

import type { NextRequest } from 'next/server';
import type { QueueItem } from '../mobile-types';
import { mobileClients, mutableState, requireAuth } from '../mobile-state';

// F4: Companion sends a chat message
export function handleChat(payload: unknown, clientId: string): Response {
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
export function handleChatHost(request: NextRequest, payload: unknown): Response {
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

// Desktop-Host Herausforderung: erstellt Chat-Nachricht mit Challenge-Button
export function handleChatHostChallenge(request: NextRequest, payload: unknown): Response {
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const chPayload = payload as { fromName: string; songId: string; songTitle: string; songArtist: string; gameMode: 'duel' | 'duet' };
  if (!chPayload.songTitle || !chPayload.songArtist || !chPayload.fromName) {
    return Response.json({ success: false, message: 'Missing data' }, { status: 400 });
  }
  const modeLabel = chPayload.gameMode === 'duet' ? 'Duett-Partner' : 'Gegner';
  const chMsg = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    from: 'host',
    fromName: chPayload.fromName,
    text: `${chPayload.fromName} sucht einen ${modeLabel} für "${chPayload.songTitle}" von ${chPayload.songArtist}!`,
    timestamp: Date.now(),
    isHost: true,
    challenge: {
      songId: chPayload.songId,
      songTitle: chPayload.songTitle,
      songArtist: chPayload.songArtist,
      challengerClientId: 'host',
      challengerName: chPayload.fromName,
      accepted: false,
      acceptedBy: null,
      acceptedByName: null,
    },
  };
  mutableState.chatMessages.push(chMsg);
  if (mutableState.chatMessages.length > 100) {
    mutableState.chatMessages = mutableState.chatMessages.slice(-100);
  }
  return Response.json({ success: true, message: 'Challenge sent' });
}

// Song Challenge: post a challenge message to chat
export function handleSongChallenge(payload: unknown, clientId: string): Response {
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  const chPayload = payload as { songId: string; songTitle: string; songArtist: string };
  const chClient = mobileClients.get(clientId);
  if (!chClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  if (!chPayload.songTitle || !chPayload.songArtist) {
    return Response.json({ success: false, message: 'Missing song info' }, { status: 400 });
  }

  const chName = chClient.profile?.name || chClient.name;
  const chMsg = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    from: clientId,
    fromName: chName,
    text: `${chName} sucht einen Gegner für "${chPayload.songTitle}" von ${chPayload.songArtist}!`,
    timestamp: Date.now(),
    isHost: false,
    challenge: {
      songId: chPayload.songId,
      songTitle: chPayload.songTitle,
      songArtist: chPayload.songArtist,
      challengerClientId: clientId,
      challengerName: chName,
      accepted: false,
      acceptedBy: null,
      acceptedByName: null,
    },
  };

  mutableState.chatMessages.push(chMsg);
  if (mutableState.chatMessages.length > 100) {
    mutableState.chatMessages = mutableState.chatMessages.slice(-100);
  }
  chClient.lastActivity = Date.now();
  mobileClients.set(clientId, chClient);

  return Response.json({ success: true, message: 'Challenge sent' });
}

// Accept Challenge: creates a duel queue entry with challenger + acceptor
export function handleAcceptChallenge(payload: unknown, clientId: string): Response {
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  const acPayload = payload as { messageId: string };
  const acClient = mobileClients.get(clientId);
  if (!acClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  if (!acPayload.messageId) {
    return Response.json({ success: false, message: 'Missing messageId' }, { status: 400 });
  }

  // Find the challenge message
  const chMsgIdx = mutableState.chatMessages.findIndex(
    (m) => m.id === acPayload.messageId && m.challenge && !m.challenge.accepted
  );
  if (chMsgIdx === -1) {
    return Response.json({ success: false, message: 'Challenge not found or already accepted' }, { status: 400 });
  }

  const chMsgData = mutableState.chatMessages[chMsgIdx];
  if (!chMsgData.challenge) {
    return Response.json({ success: false, message: 'Invalid challenge' }, { status: 400 });
  }

  // Don't accept own challenge
  if (chMsgData.challenge.challengerClientId === clientId) {
    return Response.json({ success: false, message: 'Cannot accept your own challenge' }, { status: 400 });
  }

  const acceptorName = acClient.profile?.name || acClient.name;

  // Mark challenge as accepted
  chMsgData.challenge.accepted = true;
  chMsgData.challenge.acceptedBy = clientId;
  chMsgData.challenge.acceptedByName = acceptorName;
  mutableState.chatMessages[chMsgIdx] = chMsgData;

  // Find challenger client for queue entry
  const challengerClient = mobileClients.get(chMsgData.challenge.challengerClientId);

  // Create ONE duel queue entry (challenger vs acceptor)
  const baseQueueItem = {
    songId: chMsgData.challenge.songId,
    songTitle: chMsgData.challenge.songTitle,
    songArtist: chMsgData.challenge.songArtist,
    gameMode: 'duel' as const,
    difficulty: 'medium' as const,
    status: 'pending' as const,
    addedAt: Date.now(),
  };

  // Single queue entry representing the duel match
  const duelQueueItem: QueueItem = {
    ...baseQueueItem,
    id: `queue-challenge-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    addedBy: chMsgData.challenge.challengerName,
    companionCode: challengerClient?.connectionCode || '',
    partnerId: acClient.profile?.id || clientId,
    partnerName: acceptorName,
  };

  mutableState.songQueue.push(duelQueueItem);

  // Post acceptance message to chat
  const acceptMsg = {
    id: `chat-${Date.now()}-accept-${Math.random().toString(36).slice(2, 11)}`,
    from: clientId,
    fromName: acceptorName,
    text: `${acceptorName} hat die Herausforderung von ${chMsgData.challenge.challengerName} angenommen! Song wird der Queue hinzugefügt.`,
    timestamp: Date.now(),
    isHost: false,
  };
  mutableState.chatMessages.push(acceptMsg);
  if (mutableState.chatMessages.length > 100) {
    mutableState.chatMessages = mutableState.chatMessages.slice(-100);
  }

  return Response.json({ success: true, message: 'Challenge accepted, song queued!' });
}

// Accept Challenge from HOST (desktop): uses selected profile identity
export function handleAcceptChallengeHost(request: NextRequest, payload: unknown): Response {
  if (!requireAuth(request)) {
    return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }
  const achPayload = payload as { messageId: string; profileId: string; profileName: string };
  if (!achPayload.messageId || !achPayload.profileId || !achPayload.profileName) {
    return Response.json({ success: false, message: 'Missing data' }, { status: 400 });
  }

  // Find the challenge message
  const achMsgIdx = mutableState.chatMessages.findIndex(
    (m) => m.id === achPayload.messageId && m.challenge && !m.challenge.accepted
  );
  if (achMsgIdx === -1) {
    return Response.json({ success: false, message: 'Challenge not found or already accepted' }, { status: 400 });
  }

  const achMsgData = mutableState.chatMessages[achMsgIdx];
  if (!achMsgData.challenge) {
    return Response.json({ success: false, message: 'Invalid challenge' }, { status: 400 });
  }

  // Don't accept own challenge (host challenged with a profile, can't accept with same profile)
  if (achMsgData.challenge.challengerClientId === 'host' && achPayload.profileId === achMsgData.challenge.challengerClientId) {
    return Response.json({ success: false, message: 'Cannot accept your own challenge' }, { status: 400 });
  }

  const acceptorName = achPayload.profileName;

  // Mark challenge as accepted
  achMsgData.challenge.accepted = true;
  achMsgData.challenge.acceptedBy = achPayload.profileId;
  achMsgData.challenge.acceptedByName = acceptorName;
  mutableState.chatMessages[achMsgIdx] = achMsgData;

  // Create ONE duel queue entry for the match
  const achBaseQueueItem = {
    songId: achMsgData.challenge.songId,
    songTitle: achMsgData.challenge.songTitle,
    songArtist: achMsgData.challenge.songArtist,
    gameMode: 'duel' as const,
    difficulty: 'medium' as const,
    status: 'pending' as const,
    addedAt: Date.now(),
  };

  const achChallengerClient = achMsgData.challenge.challengerClientId !== 'host'
    ? mobileClients.get(achMsgData.challenge.challengerClientId)
    : null;

  // Single queue entry representing the duel match
  const achQueueItem: QueueItem = {
    ...achBaseQueueItem,
    id: `queue-challenge-host-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    addedBy: achMsgData.challenge.challengerName,
    companionCode: achChallengerClient?.connectionCode || '',
    partnerId: achPayload.profileId,
    partnerName: acceptorName,
  };
  mutableState.songQueue.push(achQueueItem);

  // Post acceptance message to chat
  const achAcceptMsg = {
    id: `chat-${Date.now()}-accept-${Math.random().toString(36).slice(2, 11)}`,
    from: 'host',
    fromName: acceptorName,
    text: `${acceptorName} hat die Herausforderung von ${achMsgData.challenge.challengerName} angenommen! Song wird der Queue hinzugefuegt.`,
    timestamp: Date.now(),
    isHost: true,
  };
  mutableState.chatMessages.push(achAcceptMsg);
  if (mutableState.chatMessages.length > 100) {
    mutableState.chatMessages = mutableState.chatMessages.slice(-100);
  }

  return Response.json({ success: true, message: 'Challenge accepted from host!' });
}
