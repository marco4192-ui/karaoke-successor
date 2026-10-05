import { NextRequest } from 'next/server';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteCommand } from './mobile-types';
import { mobileEvents, EVENTS } from '@/lib/socketio-events';
import { saveCoverToDisk } from '@/lib/server/companion-cover-store';
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
  tournamentVoteRegistry,
  GAMESTATE_WRITER_TTL,
} from './mobile-state';

// ===================== R33 COMMAND CLASSIFICATION =====================
// CONTROL commands drive the desktop (navigation, settings, playback, jukebox,
// profiles, …) — they require the sender to hold the remote-control lock.
// PARTICIPATION commands let any connected companion take part in the game
// (party song picks, votes, pause requests, ending the current song early,
// leaving a party) without holding the lock. Everything unknown defaults to
// CONTROL (safe side).
// R37: companion_end_early was missing here — the phone mirrors' "Song
// beenden" button was rejected with 403 for every NON-controlling companion
// (i.e. the regular players), so it silently did nothing in Medley/CPTM/BR/PTM.
const PARTICIPATION_COMMANDS = new Set([
  'party_select_song', 'party_vote', 'br_vote',
  'companion_pause', 'companion_resume',
  'companion_end_early',
  'party_show_leave', 'party_leave_confirm', 'party_leave_cancel',
  // R51/Bug13 — CPTM Starting-Screen: JEDER Teilnehmer bestätigt den Start
  // mit seinem eigenen Start-Button (ohne Fernsteuerungs-Lock — die Buttons
  // liegen bei allen Companion-Spielern vor, nicht nur beim Controller).
  'cptm_confirm_start',
]);

const PARTICIPATION_PREFIXES = [
  'party_select_song:', 'party_vote:', 'br_vote:',
  'cptm_confirm_start:',
];

export function isControlCommand(commandType: string): boolean {
  if (PARTICIPATION_COMMANDS.has(commandType)) return false;
  for (const prefix of PARTICIPATION_PREFIXES) {
    if (commandType.startsWith(prefix)) return false;
  }
  return true;
}

// ===================== POST HANDLER =====================
export async function handlePostRequest(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { type, payload, clientId, senderId } = body;

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

        // R27: Single-writer election — while another desktop instance is
        // actively posting gamestate (fresh within TTL), reject this writer
        // with 409 instead of letting both instances overwrite each other
        // every 2 s (which made companion mirror views remount cyclically).
        // The losing desktop pauses its sync loop and shows a toast.
        // Posts without a senderId (stale pre-R27 desktop tabs) map to the
        // shared 'legacy' identity so they also participate — a legacy tab
        // then competes with (and defers to / owns against) new instances
        // instead of silently corrupting the feed for everyone.
        // NOTE: `??=` self-heals dev hot-reloads — the shared mutableState
        // container survives module reloads and may predate this key.
        const writer = (mutableState.gamestateWriter ??= { id: null, lastAt: 0 });
        const effectiveSenderId = typeof senderId === 'string' && senderId ? senderId : 'legacy';
        const writerFresh = writer.id !== null && Date.now() - writer.lastAt < GAMESTATE_WRITER_TTL;
        if (writerFresh && writer.id !== effectiveSenderId) {
          return Response.json(
            { success: false, conflict: true, message: 'Another desktop window is currently syncing gamestate.' },
            { status: 409 },
          );
        }
        writer.id = effectiveSenderId;
        writer.lastAt = Date.now();

        const gsPayload = payload as typeof mutableState.gameState;
        // Clear tournament vote dedup when matchId changes
        if (gsPayload.tournamentMatchId !== mutableState.gameState.tournamentMatchId) {
          tournamentVoteRegistry.clear();
        }

        // R33/P5/P6 (BACKWARD COMPAT): Older desktop builds embedded a settings
        // snapshot (localStorage values + webcam config + default difficulty)
        // in their 2s gamestate POST. Extract it BEFORE merging (it is NOT
        // part of MobileGameState) so the companion Settings mirror can read
        // real desktop values via GET action=settingssnapshot. Current
        // desktops use the dedicated POST type:'settingssnapshot' push-on-
        // change instead — this path only serves stale tabs.
        const rawPayload = payload as Record<string, unknown>;
        if (rawPayload.settingsSnapshot && typeof rawPayload.settingsSnapshot === 'object') {
          const snap = rawPayload.settingsSnapshot as {
            values?: Record<string, string>;
            webcam?: Record<string, unknown> | null;
            defaultDifficulty?: string;
          };
          mutableState.settingsSnapshot = {
            values: snap.values && typeof snap.values === 'object' ? snap.values : {},
            webcam: snap.webcam ?? null,
            defaultDifficulty: snap.defaultDifficulty,
            updatedAt: Date.now(),
          };
          // Do NOT leak the snapshot into the companion gamestate
          delete rawPayload.settingsSnapshot;
        }

        mutableState.gameState = { ...mutableState.gameState, ...gsPayload };

        // Notify Socket.IO server to push gamestate to all companions
        mobileEvents.emit(EVENTS.GAMESTATE_UPDATE, {
          gameState: {
            ...mutableState.gameState,
            queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
          },
        });

        // If song ended, notify all clients and clear pitch data
        if (gsPayload.songEnded) {
          latestPitchData.clear();
          mobileClients.forEach((client) => {
            client.pitchData = null;
          });
        }
        
        return Response.json({ success: true, updated: true });
      }

      // R33/P16+: Desktop pushes the settings snapshot ON CHANGE only (no
      // more 2s gamestate embedding — that wasted ~1 KB+ every 2 s without
      // any change). Stored for GET action=settingssnapshot pulls and, when
      // actually changed, broadcast to all connected companions via
      // Socket.IO so open Settings mirrors update instantly.
      case 'settingssnapshot': {
        if (!requireAuthOrRemoteHolder(request, clientId)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN or hold remote control.' }, { status: 401 });
        }
        const snapPayload = (payload as { snapshot?: Record<string, unknown> }).snapshot;
        if (!snapPayload || typeof snapPayload !== 'object') {
          return Response.json({ success: false, message: 'Invalid settings snapshot payload' }, { status: 400 });
        }
        const values = (snapPayload.values && typeof snapPayload.values === 'object')
          ? snapPayload.values as Record<string, string>
          : {};
        const webcam = (snapPayload.webcam && typeof snapPayload.webcam === 'object')
          ? snapPayload.webcam as Record<string, unknown>
          : null;
        const defaultDifficulty = typeof snapPayload.defaultDifficulty === 'string'
          ? snapPayload.defaultDifficulty
          : undefined;

        // Change detection — only broadcast when the snapshot actually
        // differs (keep-alive re-pushes from the desktop don't spam companions).
        const prev = mutableState.settingsSnapshot;
        const keyOf = (v: Record<string, string> | undefined, w: Record<string, unknown> | null | undefined, d: string | undefined) =>
          JSON.stringify({ v: v ?? {}, w: w ?? null, d: d ?? null });
        const changed = !prev
          || keyOf(prev.values, prev.webcam, prev.defaultDifficulty) !== keyOf(values, webcam, defaultDifficulty);

        mutableState.settingsSnapshot = { values, webcam, defaultDifficulty, updatedAt: Date.now() };

        if (changed) {
          mobileEvents.emit(EVENTS.SETTINGS_SNAPSHOT, { snapshot: mutableState.settingsSnapshot });
        }
        return Response.json({ success: true, changed });
      }

      case 'br-singing': {
        // Desktop pushes live Battle-Royale singing feedback (per-player
        // pitch/hit/miss monitor, ~2 Hz) → broadcast to companions.
        // Ephemeral: nothing is stored, only forwarded via Socket.IO.
        if (!requireAuthOrRemoteHolder(request, clientId)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN or hold remote control.' }, { status: 401 });
        }
        const brPayload = payload as { players?: unknown };
        // Validate + clamp: must be an array of at most 12 player entries
        // with sane scalar fields (protects the companions from bad host data).
        if (!Array.isArray(brPayload.players)) {
          return Response.json({ success: false, message: 'Invalid payload (players array expected)' }, { status: 400 });
        }
        const players = brPayload.players.slice(0, 12).map((raw) => {
          const p = (raw ?? {}) as Record<string, unknown>;
          const clampNum = (v: unknown): number | null =>
            typeof v === 'number' && Number.isFinite(v) ? Math.max(-1e4, Math.min(1e4, v)) : null;
          return {
            id: typeof p.id === 'string' ? p.id.slice(0, 64) : '',
            name: typeof p.name === 'string' ? p.name.slice(0, 50) : '?',
            color: typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color) ? p.color : '#94a3b8',
            singing: p.singing === true,
            sungNote: clampNum(p.sungNote),
            targetNote: clampNum(p.targetNote),
            hitRate: typeof p.hitRate === 'number' && Number.isFinite(p.hitRate) ? Math.max(0, Math.min(1, p.hitRate)) : 0,
            streak: typeof p.streak === 'number' && Number.isFinite(p.streak) ? Math.max(0, Math.min(999, Math.round(p.streak))) : 0,
          };
        });
        mobileEvents.emit(EVENTS.BR_SINGING_UPDATE, { players, serverTime: Date.now() });
        return Response.json({ success: true, forwarded: players.length });
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
          playerId?: string;
          playerName?: string;
          partnerId?: string;
          partnerName?: string;
          gameMode?: 'single' | 'duel' | 'duet';
          difficulty?: 'easy' | 'medium' | 'hard';
          playerMicSource?: 'companion' | 'microphone';
          partnerMicSource?: 'companion' | 'microphone';
          playerMicId?: string;
          partnerMicId?: string;
          playerMicName?: string;
          partnerMicName?: string;
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
          // R39/P4: gewähltes Desktop-Mikrofon (Konfig-ID + Anzeigename) —
          // der Desktop löst die ID beim Start auf (resolveMicDeviceId).
          playerMicId: queuePayload.playerMicId,
          partnerMicId: queuePayload.partnerMicId,
          playerMicName: queuePayload.playerMicName,
          partnerMicName: queuePayload.partnerMicName,
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
        // Reorder pending queue items.
        // R39/P7: The remote-lock holder (controlling companion) may reorder
        // ALL pending items (full-queue drag&drop on the phone, main-app
        // parity); everyone else can still reorder only their OWN items.
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

        // R39/P7: Remote-lock holders reorder across ALL pending items; the
        // desktop host (auth) too.
        const reorderHoldsLock = mutableState.remoteControlState.lockedBy === clientId;
        const reorderAll = reorderHoldsLock || requireAuth(request);

        // Get all pending items belonging to this user
        const userPendingItems = reorderAll
          ? mutableState.songQueue.filter(q => q.status === 'pending')
          : mutableState.songQueue.filter(
            q => q.companionCode === reorderClient.connectionCode && q.status === 'pending'
          );

        // Verify all orderedIds belong to the allowed set and are pending
        const userPendingIds = new Set(userPendingItems.map(q => q.id));
        for (const id of reorderPayload.orderedIds) {
          if (!userPendingIds.has(id)) {
            return Response.json({ success: false, message: reorderAll ? 'Unknown or non-pending item' : 'Cannot reorder items that are not yours' }, { status: 403 });
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

      case 'removequeue': {
        // Remove song from queue — the creator (matching companionCode) can
        // always remove their own items. R39/P7: the remote-lock holder
        // (controlling companion) may remove ANY pending item — the ✕-buttons
        // on the phone previously did nothing for songs wished by others,
        // although the queue view (main-app parity) shows them all.
        const removePayload = payload as { itemId: string };
        const requestingClient = mobileClients.get(clientId);
        if (!requestingClient) {
          return Response.json({ success: false, message: 'Not connected' }, { status: 401 });
        }
        const itemIndex = mutableState.songQueue.findIndex(q => q.id === removePayload.itemId);

        if (itemIndex !== -1) {
          const item = mutableState.songQueue[itemIndex];
          // Ownership check: own songs always; other songs only with the
          // remote lock (or desktop host auth).
          const removeOwnsItem = item.companionCode === requestingClient.connectionCode;
          const removeHoldsLock = mutableState.remoteControlState.lockedBy === clientId;
          if (!removeOwnsItem && !removeHoldsLock && !requireAuth(request)) {
            return Response.json({ success: false, message: 'You can only remove your own songs' }, { status: 403 });
          }
          // Don't allow removing a song that is currently playing
          if (item.status === 'playing') {
            return Response.json({ success: false, message: 'Cannot remove a song that is currently playing' }, { status: 400 });
          }
          if (removeOwnsItem && requestingClient.queueCount > 0) {
            requestingClient.queueCount--;
            mobileClients.set(clientId, requestingClient);
          }
          mutableState.songQueue.splice(itemIndex, 1);
          return Response.json({ success: true, message: 'Song removed from queue' });
        }
        return Response.json({ success: false, message: 'Item not found' }, { status: 404 });
      }

      case 'clearqueue': {
        // R39/P7: Clear the ENTIRE companion queue (all pending items, all
        // requesters). Called by the desktop's Clear-All (host auth) and by
        // the controlling companion (remote lock). Playing items keep their
        // status (the running song is not aborted by a queue clear).
        const clearClient = mobileClients.get(clientId);
        const clearAuthorized = requireAuth(request)
          || (clientId && clearClient && mutableState.remoteControlState.lockedBy === clientId);
        if (!clearAuthorized) {
          return Response.json({ success: false, message: 'Remote control is not held — take control first' }, { status: 403 });
        }
        const clearedCount = mutableState.songQueue.filter(q => q.status === 'pending').length;
        // Reset every companion's queue counter (their pending songs are gone)
        for (const [cId, client] of mobileClients.entries()) {
          if (client.queueCount > 0) {
            client.queueCount = 0;
            mobileClients.set(cId, client);
          }
        }
        mutableState.songQueue = mutableState.songQueue.filter(q => q.status === 'playing');
        // R39/P7: Desktop-local entries are cleared as well — Clear All means
        // the whole queue (the desktop clears its zustand queue itself via
        // the remote-queue-clear event; this keeps both sides consistent).
        mutableState.desktopQueue = [];
        return Response.json({ success: true, message: 'Queue cleared', clearedCount });
      }

      case 'syncdesktopqueue': {
        // R39/P7: The desktop mirrors its local (zustand) queue here so the
        // companion queue view can show the FULL queue (main-app parity).
        // Host auth only — companions never write this.
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const syncPayload = payload as { items?: Array<{
          id: string;
          songId: string;
          songTitle: string;
          songArtist: string;
          playerName?: string;
          partnerName?: string;
          gameMode?: 'single' | 'duel' | 'duet';
          status?: string;
          addedAt?: number;
          playerMicSource?: 'companion' | 'microphone';
          partnerMicSource?: 'companion' | 'microphone';
          playerMicName?: string;
          partnerMicName?: string;
        }> };
        if (!Array.isArray(syncPayload.items)) {
          return Response.json({ success: false, message: 'Invalid items' }, { status: 400 });
        }
        mutableState.desktopQueue = syncPayload.items
          .filter(it => it && typeof it.id === 'string' && typeof it.songId === 'string')
          .slice(0, 100)
          .map(it => ({
            id: it.id,
            songId: it.songId,
            songTitle: it.songTitle || '',
            songArtist: it.songArtist || '',
            addedBy: it.playerName || 'Desktop',
            addedAt: typeof it.addedAt === 'number' ? it.addedAt : Date.now(),
            companionCode: 'desktop',
            status: (it.status === 'playing' ? 'playing' : 'pending') as 'pending' | 'playing',
            playerId: undefined,
            playerName: it.playerName,
            partnerName: it.partnerName,
            gameMode: it.gameMode,
            playerMicSource: it.playerMicSource,
            partnerMicSource: it.partnerMicSource,
            playerMicName: it.playerMicName,
            partnerMicName: it.partnerMicName,
            isDesktop: true as const,
          }));
        return Response.json({ success: true, count: mutableState.desktopQueue.length });
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
          // R51/Bug10 — Mark all other 'playing' items as COMPLETED (they
          // were played!) instead of flipping them back to 'pending', which
          // kept finished songs alive in the companion queue forever. Also
          // decrement the adding companion's queueCount (frees a slot), the
          // same way 'queuecompleted' does.
          mutableState.songQueue.forEach(q => {
            if (q.status === 'playing' && q.id !== playingItem.id) {
              q.status = 'completed';
              const client = Array.from(mobileClients.values()).find(
                c => c.connectionCode === q.companionCode
              );
              if (client && client.queueCount > 0) {
                client.queueCount--;
                mobileClients.set(client.id, client);
              }
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

      case 'completeplaying': {
        // R51/Bug10 — Song abgebrochen oder beendet: ALLE aktuell 'playing'-
        // Items der Server-Queue abschließen. Der Desktop kennt die itemId
        // beim Abbruch (Pause-Dialog) nicht unbedingt — diese Aktion ist
        // idempotent und braucht keine itemId. Bisher blieb ein abgebrochener
        // Song in der Companion-Queue ewig als "Läuft" stehen.
        // Auth: require admin PIN (host requests are always trusted)
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        let completed = 0;
        mutableState.songQueue.forEach(q => {
          if (q.status === 'playing') {
            q.status = 'completed';
            completed++;
            const client = Array.from(mobileClients.values()).find(
              c => c.connectionCode === q.companionCode
            );
            if (client && client.queueCount > 0) {
              client.queueCount--;
              mobileClients.set(client.id, client);
            }
          }
        });
        return Response.json({ success: true, completed });
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
        
        // R33/P1+P14: Remote control is EXPLICIT now. The silent auto-acquire
        // is gone — desktop-driving (CONTROL) commands are only accepted from
        // the client that holds the remote lock ("Take Control"). Everyone
        // else gets 403. PARTICIPATION commands (party song picks, votes,
        // pause requests, party-leave flow) stay open to all companions so
        // non-controlling players can still take part in party games, fill
        // the queue (type:'queue' POST, unaffected) and use the chat.
        const holdsLock = mutableState.remoteControlState.lockedBy === clientId;
        if (!holdsLock && isControlCommand(String(commandPayload.command))) {
          return Response.json({
            success: false,
            message: 'Remote control is not held — take control first',
            requiresControl: true,
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
        // R34: ALSO called from the party setup's assign panel to bind a
        // connected-but-unclaimed device to a player.
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
            
            // R34: keep the "one profile = one device" invariant — if ANOTHER
            // client still holds the profile we're about to assign, clear it
            // there (the phone flow kicks duplicates; clearing is the gentler
            // desktop-side equivalent: the other device becomes available
            // again instead of being disconnected).
            if (assignPayload.profile?.id) {
              const duplicateClientId = profileToClient.get(assignPayload.profile.id);
              if (duplicateClientId && duplicateClientId !== targetClientId) {
                const duplicateClient = mobileClients.get(duplicateClientId);
                if (duplicateClient?.profile) {
                  profileToClient.delete(duplicateClient.profile.id);
                  duplicateClient.profile = null;
                  duplicateClient.name = 'Mobile Device';
                  mobileClients.set(duplicateClientId, duplicateClient);
                  // Tell the losing phone its profile was cleared
                  mobileEvents.emit(EVENTS.PROFILE_ASSIGNED, {
                    clientId: duplicateClientId,
                    profile: null,
                  });
                }
              }
            }
            
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

            // R34: notify the phone instantly (Socket.IO) so it adopts the
            // assigned profile without waiting for its reconcile poll.
            mobileEvents.emit(EVENTS.PROFILE_ASSIGNED, {
              clientId: targetClientId,
              profile: targetClient.profile,
            });
            
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
            isActive?: boolean;
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

      case 'setplaylists':
        // Desktop synchronisiert Playlists an den Server (wie sethostprofiles)
        // Auth required: kommt von der Desktop-App
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        {
          const playlistsPayload = payload as Array<{ id: string; name: string; isSystem?: boolean }>;
          if (Array.isArray(playlistsPayload)) {
            mutableState.playlists = playlistsPayload;
            return Response.json({
              success: true,
              message: 'Playlists updated',
              count: mutableState.playlists.length,
            });
          }
          return Response.json({ success: false, message: 'Invalid playlists payload' }, { status: 400 });
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
          year?: number;
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

      // R33/P13: Desktop uploads mini cover thumbnails (96px JPEG data-URLs)
      // for the companion library. Merged into the server-side cover cache —
      // companions load them via GET action=songcover&songId=…
      case 'songcovers': {
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const coversPayload = payload as { covers?: Record<string, string> };
        if (coversPayload?.covers && typeof coversPayload.covers === 'object') {
          // R53: 400 → 2000 — der Desktop-Drain lädt jetzt das GESAMTE Backlog
          // in Chunks von 72; der alte Cut sorgte dafür, dass große POSTs
          // stillschweigend abgeschnitten wurden (fehlende Thumbnails).
          const entries = Object.entries(coversPayload.covers).slice(0, 2000);
          for (const [songId, dataUrl] of entries) {
            if (typeof songId === 'string' && typeof dataUrl === 'string'
              && dataUrl.startsWith('data:image/') && dataUrl.length < 60000) {
              mutableState.songCovers[songId] = dataUrl;
              // R53: Disk-Persistenz — überlebt Server-Restarts (Best-Effort).
              const m = /^data:(image\/[a-zA-Z+]+);base64,([\s\S]*)$/.exec(dataUrl);
              if (m) {
                saveCoverToDisk(songId, Buffer.from(m[2], 'base64'), m[1]);
              }
            }
          }
          // R53: Cap 600 → 3000 — bei Bibliotheken > 600 Songs warf der Server
          // neu hochgeladene Covers direkt wieder weg (mit Disk-Store ist der
          // Speicher-Fußabdruck ~4KB/Cover unkritisch).
          const coverIds = Object.keys(mutableState.songCovers);
          if (coverIds.length > 3000) {
            for (const id of coverIds.slice(0, coverIds.length - 3000)) {
              delete mutableState.songCovers[id];
            }
          }
          return Response.json({ success: true, message: 'Covers updated', count: entries.length });
        }
        return Response.json({ success: false, message: 'Invalid covers payload' }, { status: 400 });
      }

      // R33/P10: Desktop pushes the top-100 local highscores for the
      // companion Highscores mirror (own-scores view).
      case 'highscores': {
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const hsPayload = payload as { entries?: Array<Record<string, unknown>> };
        if (Array.isArray(hsPayload?.entries)) {
          mutableState.highscores = hsPayload.entries.slice(0, 100);
          return Response.json({ success: true, count: mutableState.highscores.length });
        }
        return Response.json({ success: false, message: 'Invalid highscores payload' }, { status: 400 });
      }

      // R33/P12: Desktop pushes Daily-Challenge snapshots per profile
      // (slots, weekly, streak, badges, level) for the companion Daily mirror.
      case 'dailystate': {
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const dailyPayload = payload as { daily?: Record<string, unknown> };
        if (dailyPayload?.daily && typeof dailyPayload.daily === 'object') {
          mutableState.dailyByProfile = dailyPayload.daily;
          return Response.json({ success: true, count: Object.keys(dailyPayload.daily).length });
        }
        return Response.json({ success: false, message: 'Invalid daily payload' }, { status: 400 });
      }

      // R33/P8: Desktop pushes the jukebox mirror state (filters, pool,
      // shuffle, repeat, lyrics) so the companion Jukebox view is in sync.
      case 'jukeboxstate': {
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized. Provide correct PIN.' }, { status: 401 });
        }
        const jbPayload = payload as Record<string, unknown>;
        if (jbPayload && typeof jbPayload === 'object') {
          mutableState.jukeboxState = jbPayload;
          return Response.json({ success: true });
        }
        return Response.json({ success: false, message: 'Invalid jukebox state payload' }, { status: 400 });
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

      // Desktop-Host Herausforderung: erstellt Chat-Nachricht mit Challenge-Button
      case 'chat_host_challenge': {
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

      // #10 Tournament crowd vote — companion spectators vote on match results
      case 'tournament_crowd_vote': {
        const votePayload = payload as { matchId: string; playerSide: 1 | 2 };
        if (!clientId || !votePayload.matchId || (votePayload.playerSide !== 1 && votePayload.playerSide !== 2)) {
          return Response.json({ success: false, message: 'Invalid vote payload' }, { status: 400 });
        }
        // Deduplication: check if this clientId already voted for this matchId
        const voteKey = `${clientId}:${votePayload.matchId}`;
        if (tournamentVoteRegistry.has(voteKey)) {
          return Response.json({ success: false, message: 'Already voted for this match' });
        }
        // Enforce max 500 total votes (prune oldest)
        if (mutableState.tournamentCrowdVotes.length >= MAX_TOURNAMENT_VOTES) {
          mutableState.tournamentCrowdVotes = mutableState.tournamentCrowdVotes.slice(-MAX_TOURNAMENT_VOTES + 1);
        }
        // Store vote in mutable state for the main app to pick up
        const client = mobileClients.get(clientId);
        mutableState.tournamentCrowdVotes.push({
          clientId,
          profileId: client?.profile?.id || null,
          profileName: client?.profile?.name || client?.name || 'Anonymous',
          matchId: votePayload.matchId,
          playerSide: votePayload.playerSide,
          timestamp: Date.now(),
        });
        tournamentVoteRegistry.add(voteKey);
        return Response.json({ success: true, message: 'Vote recorded' });
      }

      // Song Challenge: post a challenge message to chat
      case 'song_challenge': {
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
      case 'accept_challenge': {
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
      case 'accept_challenge_host': {
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

      // Companion Playlist: Speichere pending Playlist-Operation in mutableState.
      // Der Desktop liest diese via getcommands-Polling und fuehrt
      // die eigentliche localStorage-Operation aus.
      case 'playlist_add': {
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
      case 'playlist_create_add': {
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

      // ===================== R55: DUCKDNS / LET'S ENCRYPT =====================
      case 'https-domain': {
        // DuckDNS-Konfiguration speichern + Zertifikat SOFORT ausstellen.
        // Host-only (requireAuth): Die Settings-UI läuft auf dem Desktop;
        // Handys dürfen die HTTPS-Konfiguration nicht ändern.
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const httpsPayload = payload as { domain?: unknown; token?: unknown };
        const { saveDomainConfig, issueCertificate, getHttpsDomainStatus } = await import('@/lib/server/https-domain');
        try {
          const domain = saveDomainConfig(
            typeof httpsPayload.domain === 'string' ? httpsPayload.domain : '',
            typeof httpsPayload.token === 'string' ? httpsPayload.token : '',
          );
          // Ausstellung läuft synchron (10–60 s: TXT-Record setzen, ACME-
          // Validierung, Finalize). Der Swap-Handler in server.ts tauscht
          // das Zertifikat am laufenden HTTPS-Listener (setSecureContext).
          await issueCertificate({ force: true });
          return Response.json({
            success: true,
            message: `Zertifikat aktiv: ${domain}`,
            ...getHttpsDomainStatus(),
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ success: false, message, ...getHttpsDomainStatus() }, { status: 400 });
        }
      }

      case 'https-domain-clear': {
        // DuckDNS-Konfiguration entfernen — zurück zur lokalen CA (R54).
        if (!requireAuth(request)) {
          return Response.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        const { clearDomainConfig, getHttpsDomainStatus } = await import('@/lib/server/https-domain');
        try {
          clearDomainConfig();
          return Response.json({ success: true, ...getHttpsDomainStatus() });
        } catch (err) {
          return Response.json({ success: false, message: err instanceof Error ? err.message : String(err) }, { status: 500 });
        }
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
