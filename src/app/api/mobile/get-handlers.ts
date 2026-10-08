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
  getHttpsPort,
  getCaCertPem,
  getHttpsDomainInfo,
} from './mobile-state';
import { getHttpsDomainStatus } from '@/lib/server/https-domain';
import { getClientIp } from '@/lib/rate-limiter';
import { readCoverFromDisk, saveCoverToDisk } from '@/lib/server/companion-cover-store';

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
        // R52: HTTPS-Port des Standalone-Servers (Companion-Mikrofon braucht
        // einen sicheren Kontext — getUserMedia ist auf http://<LAN-IP>
        // blockiert). null = Dev-/Plain-HTTP-Betrieb.
        httpsPort: getHttpsPort(),
        // R55: DuckDNS/Let's-Encrypt-Info — QR-URLs bauen damit die echte
        // Domain statt der IP, die Companion-App blendet den Zertifikats-
        // Banner aus (echtes Zertifikat = keine Warnung, nichts zu installieren).
        ...getHttpsDomainInfo(),
      });

    case 'https-domain':
      // R55: Detail-Status für die Desktop-Settings (DuckDNS-Einrichtung).
      // Enthält KEINEN Token (der bleibt serverseitig in certs/https-domain.json).
      return Response.json({ success: true, ...getHttpsDomainStatus() });

    case 'disconnect':
      if (clientId) {
        const client = removeClient(clientId);
        if (client) {
          return Response.json({ success: true, message: 'Disconnected' });
        }
      }
      return Response.json({ success: false, message: 'Client not found' }, { status: 404 });

    case 'ca-cert':
      // R54: Einmaliger Download der lokalen Root-CA auf Handys. Nach der
      // Installation vertraut der Browser der HTTPS-Verbindung dauerhaft —
      // KEINE Zertifikats-Warnung mehr (auch nicht nach IP-Wechseln, weil der
      // Leaf dann nur von derselben CA neu signiert wird). Absichtlich OHNE
      // Auth/PIN: Das CA-Zertifikat ist per Definition öffentlich (nur der
      // Private Key bleibt auf dem Server). Muss über plain HTTP (Port 3000)
      // abrufbar sein — das Handy kann ja genau DAVOR keine HTTPS-Verbindung
      // ohne Warnung aufbauen.
      {
        const caPem = getCaCertPem();
        if (!caPem) {
          return Response.json(
            { success: false, message: 'No CA certificate available (HTTPS listener not active).' },
            { status: 404 },
          );
        }
        return new Response(caPem, {
          status: 200,
          headers: {
            // application/x-x509-ca-cert: Android öffnet direkt den
            // Zertifikats-Installer, iOS zeigt „Profil geladen".
            'Content-Type': 'application/x-x509-ca-cert',
            'Content-Disposition': 'attachment; filename="karaoke-zero-ca.crt"',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

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
      // R60 — PERF-FIX: pitches[].profile ist SLIM ({id, name, color}) — die
      // 5-10-Hz-Watchdogs (game-screen/CPTM/BR/medley-Manager) matchen
      // ausschließlich über profile.id/clientId; das volle Profil inkl.
      // Avatar-Data-URL blähte jede Antwort um ein Vielfaches auf (2-4
      // Handys = ~100 KB+ pro Poll). Die clients[]-Liste unten behält volle
      // Profile (BR-Setup-Screen zeigt Avatare, pollt aber nur alle 10 s).
      const pitches: Array<{ clientId: string; code: string; data: PitchData; profile: Pick<MobileProfile, 'id' | 'name' | 'color'> | null }> = [];
      latestPitchData.forEach((data, cId) => {
        const client = mobileClients.get(cId);
        if (client) {
          pitches.push({
            clientId: cId,
            code: client.connectionCode,
            data,
            profile: client.profile
              ? { id: client.profile.id, name: client.profile.name, color: client.profile.color }
              : null,
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
      // Get current song queue with companion info.
      // R39/P7: The queue now includes the DESKTOP's local queue entries
      // (flagged isDesktop, synced via syncdesktopqueue) so the companion
      // queue view shows the FULL queue like the main app. Desktop
      // consumers (queue-screen, use-queue-next-song) filter isDesktop
      // entries out to avoid duplicates with their local state.
      return Response.json({
        success: true,
        queue: [
          ...(mutableState.desktopQueue ?? []).map(q => ({ ...q, isDesktop: true })),
          ...mutableState.songQueue,
        ]
          .filter(q => q.status !== 'completed')
          .sort((a, b) => a.addedAt - b.addedAt),
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
      // R34: parallel map profileId → clientId so the desktop can REBIND a
      // client after a name-dedup merge (importProfileFromMobile keeps the
      // desktop profile ID, but the phone stays registered under its own
      // phone-ID → connection detection would never match).
      const profileClients: Record<string, string> = {};
      mobileClients.forEach((client) => {
        if (client.profile) {
          companionProfiles.push(client.profile);
          profileClients[client.profile.id] = client.id;
        }
      });
      
      return Response.json({
        success: true,
        profiles: companionProfiles,
        count: companionProfiles.length,
        profileClients,
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

    // R33/P5/P6: Companion Settings mirror reads the desktop's real values
    case 'settingssnapshot':
      return Response.json({
        success: true,
        snapshot: mutableState.settingsSnapshot,
      });

    // R33/P13: Mini cover thumbnail for one song (96px JPEG data-URL cache)
    case 'songcover': {
      const songId = searchParams.get('songId');
      if (!songId) {
        return Response.json({ success: false, message: 'songId required' }, { status: 400 });
      }
      const dataUrl = mutableState.songCovers[songId];
      if (dataUrl) {
        // Note: no regex /s flag — the tsconfig target predates ES2018.
        const match = /^data:(image\/[a-zA-Z+]+);base64,([\s\S]*)$/.exec(dataUrl);
        if (!match) {
          return Response.json({ success: false, message: 'Invalid cover data' }, { status: 500 });
        }
        const buffer = Buffer.from(match[2], 'base64');
        return new Response(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': match[1],
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // ── R39/P2: Server-seitiger Cover-Proxy (Fallback) ──
      // Der Desktop kann Covers von fremden Servern (http/https) nicht per
      // Canvas zu Thumbnails verkleinern — die Canvas ist CORS-tainted und
      // toDataURL() schlägt fehl. Deshalb liefert der Server hier das
      // Original-Bild direkt aus (Node-Fetch kennt kein CORS), zwischen-
      // speichert es (24 h, max. 300 Einträge) und das Handy lädt es über
      // die eigene Herkunft — CORS-problemlos. Das ist die Ursache dafür,
      // dass die Companion-Library bisher NIE Thumbnails für Online-Covers
      // zeigte, obwohl der Desktop sie anzeigt.
      // ── R53: Nach einem Server-Restart wird ZUERST der Disk-Store befragt
      // (db/companion-covers/) — hochgeladene Thumbnails und remote-geproxyte
      // Covers überleben damit Neustarts, statt 60s+ auf das Self-Healing zu
      // warten. ──
      const song = mutableState.songLibrary.find(s => s.id === songId);
      const remoteSrc = song?.coverImage;
      // data:-URLs (im Song-Library-Sync enthalten) lassen sich direkt dekodieren
      if (remoteSrc && remoteSrc.startsWith('data:image/')) {
        const inlineMatch = /^data:(image\/[a-zA-Z+]+);base64,([\s\S]*)$/.exec(remoteSrc);
        if (inlineMatch) {
          const inlineBuf = Buffer.from(inlineMatch[2], 'base64');
          return new Response(new Uint8Array(inlineBuf), {
            status: 200,
            headers: { 'Content-Type': inlineMatch[1], 'Cache-Control': 'public, max-age=86400' },
          });
        }
      }
      if (remoteSrc && /^https?:/i.test(remoteSrc)) {
        const cached = (mutableState.remoteCoverCache ??= new Map()).get(songId);
        if (cached && Date.now() - cached.at < 24 * 3600 * 1000) {
          return new Response(new Uint8Array(cached.buf), {
            status: 200,
            headers: { 'Content-Type': cached.type, 'Cache-Control': 'public, max-age=86400' },
          });
        }
        try {
          const ctl = new AbortController();
          const to = setTimeout(() => ctl.abort(), 5000);
          const res = await fetch(remoteSrc, { signal: ctl.signal });
          clearTimeout(to);
          if (res.ok) {
            const type = res.headers.get('content-type') || 'image/jpeg';
            if (type.startsWith('image/')) {
              const buf = Buffer.from(await res.arrayBuffer());
              if (buf.length <= 5 * 1024 * 1024) {
                if ((mutableState.remoteCoverCache ??= new Map()).size > 300) mutableState.remoteCoverCache.clear();
                mutableState.remoteCoverCache.set(songId, { buf, type, at: Date.now() });
                // R53: Remote-Cover auch auf die Platte — überlebt Restarts,
                // ohne die Quelle erneut anzufordern.
                saveCoverToDisk(songId, buf, type);
                return new Response(new Uint8Array(buf), {
                  status: 200,
                  headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' },
                });
              }
            }
          }
        } catch {
          // Remote fetch failed — unten weiter mit Disk-Store / 404
        }
      }
      // ── R53: Disk-Store (letzter same-origin Fallback vor dem 404) ──
      const fromDisk = readCoverFromDisk(songId);
      if (fromDisk) {
        return new Response(new Uint8Array(fromDisk.buf), {
          status: 200,
          headers: { 'Content-Type': fromDisk.type, 'Cache-Control': 'public, max-age=86400' },
        });
      }
      return Response.json({ success: false, message: 'No cover' }, { status: 404 });
    }

    // R34: Lightweight list of songIds that have an uploaded cover thumbnail
    // on the server. The desktop polls this (60 s) for self-healing after a
    // server restart — any locally tracked cover-songId missing from this
    // list is re-uploaded on the next sync tick. Kept minimal on purpose.
    case 'songcoverids':
      return Response.json({
        ok: true,
        ids: Object.keys(mutableState.songCovers),
      });

    // R51/Bug4: Lightweight song-library count for the desktop self-healing.
    // After a server restart the in-memory songLibrary is empty, but the
    // desktop's count-guard would skip the re-push (local count unchanged).
    // The sync hook polls this (60 s) and re-pushes whenever the server
    // count diverges from the local library.
    case 'songcount':
      return Response.json({
        ok: true,
        count: mutableState.songLibrary.length,
      });

    // R33/P10: Top-100 local highscores for the companion Highscores mirror
    case 'gethighscores':
      return Response.json({
        success: true,
        highscores: mutableState.highscores,
      });

    // R33/P12: Daily-Challenge snapshots per profile
    case 'getdailystate':
      return Response.json({
        success: true,
        daily: mutableState.dailyByProfile,
      });

    // R33/P8: Jukebox mirror state (filters, pool, shuffle, repeat, …)
    case 'getjukeboxstate':
      return Response.json({
        success: true,
        jukebox: mutableState.jukeboxState,
      });

    // F4: Get chat messages (last 50)
    case 'getchat':
      return Response.json({
        success: true,
        messages: mutableState.chatMessages.slice(-50),
      });

    case 'playlists':
      // Gib synchronisierte Playlists zurueck (nur ID, Name, isSystem)
      return Response.json({
        success: true,
        playlists: mutableState.playlists,
      });

    // Desktop-Chat: Liste aller aktiven Player für Dropdown
    case 'getchatplayers': {
      const players: Array<{ id: string; name: string; color: string; isHost: boolean }> = [];
      // Verbundene Companions mit Profil
      mobileClients.forEach((client) => {
        if (client.profile) {
          players.push({
            id: client.profile.id,
            name: client.profile.name,
            color: client.profile.color,
            isHost: false,
          });
        }
      });
      // Host-Profile aus der Haupt-App
      mutableState.hostProfiles.forEach((hp) => {
        // Nur hinzufügen wenn nicht bereits von einem Companion beansprucht
        const alreadyListed = players.some((p) => p.id === hp.id);
        if (!alreadyListed) {
          players.push({
            id: hp.id,
            name: hp.name,
            color: hp.color,
            isHost: true,
          });
        }
      });
      return Response.json({ success: true, players });
    }

    // #10 Get tournament crowd votes for spectator UI
    case 'get_crowd_votes':
      return Response.json({
        success: true,
        votes: mutableState.tournamentCrowdVotes || [],
      });

    // F19: Get opponents for duel/duet mode (all active profiles)
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

      // Track which profile IDs are already shown as connected opponents
      const opponentProfileIds = new Set<string>();
      mobileClients.forEach((client) => {
        if (client.profile) {
          if (client.id !== clientId) {
            connectedOpponents.push({
              id: client.profile.id,
              name: client.profile.name,
              avatar: client.profile.avatar,
              color: client.profile.color,
              connectionCode: client.connectionCode,
            });
            opponentProfileIds.add(client.profile.id);
          }
        }
      });

      // Include ALL active host profiles that are NOT already shown as connected
      // opponents and NOT the requesting client's own profile.
      // This ensures profiles that exist on the desktop but have no companion
      // connected are also selectable for duel/duet.
      const availableHostProfiles = mutableState.hostProfiles.filter(
        (hp) => {
          // Exclude inactive profiles
          if (hp.isActive === false) return false;
          // Exclude the requesting client's own profile
          if (hp.id === requestingClient?.profile?.id) return false;
          // Exclude profiles already shown as connected opponents (avoid duplicates)
          if (opponentProfileIds.has(hp.id)) return false;
          return true;
        }
      ).map((hp) => ({
        id: hp.id,
        name: hp.name,
        avatar: hp.avatar,
        color: hp.color,
        connectionCode: '',
        isActive: hp.isActive ?? true,
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
    // eslint-disable-next-line no-console
    console.error('[mobile GET] Internal error:', error);
    return Response.json(
      { success: false, message: 'Internal error' },
      { status: 500 }
    );
  }
}
