// ===================== COMPANION CONNECTION & PROFILE HANDLERS =====================
// POST /api/mobile actions for the companion connection lifecycle:
// 'register', 'profile' (self-update), 'assigncharacter' (admin-assigned)
// and 'heartbeat'. Extracted 1:1 from post-handlers.ts (R8), no behavior change.

import type { NextRequest } from 'next/server';
import type { MobileClient, MobileProfile } from '../mobile-types';
import {
  mobileClients,
  connectionCodes,
  profileToClient,
  mutableState,
  getUniqueConnectionCode,
  registerClient,
  removeClient,
  requireAuth,
} from '../mobile-state';

export function handleRegister(request: NextRequest, payload: unknown): Response {
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

export function handleProfileUpdate(payload: unknown, clientId: string): Response {
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
}

export function handleAssignCharacter(request: NextRequest, payload: unknown): Response {
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
}

export function handleHeartbeat(clientId: string): Response {
  // Keep connection alive
  if (clientId) {
    const client = mobileClients.get(clientId);
    if (!client) return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
    client.lastActivity = Date.now();
    mobileClients.set(clientId, client);
    return Response.json({ success: true, timestamp: Date.now() });
  }
  return Response.json({ success: false, message: 'Client not found' }, { status: 404 });
}
