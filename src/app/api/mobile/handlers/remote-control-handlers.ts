// ===================== REMOTE CONTROL HANDLERS =====================
// POST /api/mobile actions around the remote-control lock and the command
// queue consumed by the desktop host: 'command' (legacy echo),
// 'remote_acquire', 'remote_release', 'remote_command', 'skipAd',
// 'playlist_add', 'playlist_create_add'. Extracted 1:1 from
// post-handlers.ts (R8), no behavior change.

import type { RemoteCommand } from '../mobile-types';
import { mobileEvents, EVENTS } from '@/lib/socketio-events';
import { mobileClients, mutableState } from '../mobile-state';

export function handleCommand(payload: unknown): Response {
  const cmdPayload = payload as { command: string; data?: unknown };
  return Response.json({ success: true, executed: cmdPayload.command });
}

export function handleRemoteAcquire(clientId: string): Response {
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

export function handleRemoteRelease(clientId: string): Response {
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

export function handleRemoteCommand(payload: unknown, clientId: string): Response {
  // Send a remote control command
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  
  const commandPayload = payload as { command: RemoteCommand['type']; data?: unknown };
  const commandClient = mobileClients.get(clientId);
  if (!commandClient) return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  
  // All companion-sent commands are allowed without explicit lock acquire.
  // The companion is a trusted device on the local network (QR-scanned).
  // Auto-acquire the lock if nobody holds it, so playback commands work.
  if (!mutableState.remoteControlState.lockedBy) {
    mutableState.remoteControlState.lockedBy = clientId;
    mutableState.remoteControlState.lockedByName = commandClient.profile?.name || commandClient.name;
    mutableState.remoteControlState.lockedAt = Date.now();
    commandClient.hasRemoteControl = true;
    mobileClients.set(clientId, commandClient);
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

  // Forward to the desktop host via Socket.IO — the desktop stops
  // HTTP-polling getcommands while its WebSocket is connected, so the
  // queued command would otherwise sit unseen in the pending queue.
  mobileEvents.emit(EVENTS.REMOTE_COMMAND, { command: newCommand });

  return Response.json({
    success: true,
    message: 'Command queued',
    command: newCommand,
  });
}

export function handleSkipAd(clientId: string): Response {
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

// Companion Playlist: Speichere pending Playlist-Operation in mutableState.
// Der Desktop liest diese via getcommands-Polling und fuehrt
// die eigentliche localStorage-Operation aus.
export function handlePlaylistAdd(payload: unknown, clientId: string): Response {
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  const plAddPayload = payload as { playlistId: string; songId: string };
  if (!plAddPayload.playlistId || !plAddPayload.songId) {
    return Response.json({ success: false, message: 'Missing playlistId or songId' }, { status: 400 });
  }
  // Als remote command speichern, damit der Desktop es verarbeitet
  const plCommand: RemoteCommand = {
    type: 'add_to_playlist',
    data: { playlistId: plAddPayload.playlistId, songId: plAddPayload.songId },
    timestamp: Date.now(),
    fromClientId: clientId,
    fromClientName: mobileClients.get(clientId)?.profile?.name || mobileClients.get(clientId)?.name || 'Companion',
  };
  mutableState.remoteControlState.pendingCommands.push(plCommand);
  return Response.json({ success: true, message: 'Song wird zur Playlist hinzugefuegt' });
}

// Companion Playlist: Neue Playlist erstellen und Song hinzufuegen
export function handlePlaylistCreateAdd(payload: unknown, clientId: string): Response {
  if (!clientId) {
    return Response.json({ success: false, message: 'Not connected' }, { status: 400 });
  }
  const plCreatePayload = payload as { name: string; songId: string };
  if (!plCreatePayload.name || !plCreatePayload.songId) {
    return Response.json({ success: false, message: 'Missing name or songId' }, { status: 400 });
  }
  const plCommand: RemoteCommand = {
    type: 'create_and_add_to_playlist',
    data: { name: plCreatePayload.name, songId: plCreatePayload.songId },
    timestamp: Date.now(),
    fromClientId: clientId,
    fromClientName: mobileClients.get(clientId)?.profile?.name || mobileClients.get(clientId)?.name || 'Companion',
  };
  mutableState.remoteControlState.pendingCommands.push(plCommand);
  return Response.json({ success: true, message: 'Playlist wird erstellt' });
}
