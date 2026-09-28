import { NextRequest } from 'next/server';
import {
  handleAssignCharacter,
  handleHeartbeat,
  handleProfileUpdate,
  handleRegister,
} from './handlers/connection-handlers';
import { handleBatchPitch, handlePitch } from './handlers/pitch-handlers';
import {
  handleCommand,
  handlePlaylistAdd,
  handlePlaylistCreateAdd,
  handleRemoteAcquire,
  handleRemoteCommand,
  handleRemoteRelease,
  handleSkipAd,
} from './handlers/remote-control-handlers';
import {
  handleBrSinging,
  handleGamestate,
  handleResults,
  handleSetAdPlaying,
  handleSync,
  handleTournamentCrowdVote,
} from './handlers/game-state-handlers';
import {
  handleJukeboxAdd,
  handleJukeboxWishlistRemove,
  handleMarkPlaying,
  handleQueueAdd,
  handleQueueCompleted,
  handleQueueRemove,
  handleQueueReorder,
} from './handlers/queue-handlers';
import { handleSetHostProfiles, handleSetPlaylists, handleSetSongs } from './handlers/host-sync-handlers';
import {
  handleAcceptChallenge,
  handleAcceptChallengeHost,
  handleChat,
  handleChatHost,
  handleChatHostChallenge,
  handleSongChallenge,
} from './handlers/chat-handlers';

// ===================== POST HANDLER =====================
// Orchestrator: parses the JSON body and dispatches each POST /api/mobile
// action to its domain module in ./handlers/ (R8 split of the former
// monolithic switch — case order, auth, validation and response shapes
// are unchanged). Note: `clientId` arrives untyped from the JSON body;
// handler signatures type it as string, falsy guards behave as before.
export async function handlePostRequest(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { type, payload, clientId } = body;

    switch (type) {
      case 'register':
        return handleRegister(request, payload);

      case 'pitch':
        return handlePitch(payload, clientId);

      case 'batch_pitch':
        return handleBatchPitch(payload, clientId);

      case 'command':
        return handleCommand(payload);

      case 'sync':
        return handleSync();

      case 'gamestate':
        return handleGamestate(request, payload, clientId);

      case 'br-singing':
        return handleBrSinging(request, payload, clientId);

      case 'profile':
        return handleProfileUpdate(payload, clientId);

      case 'queue':
        return handleQueueAdd(payload, clientId);

      case 'reorderqueue':
        return handleQueueReorder(payload, clientId);

      case 'removequeue':
        return handleQueueRemove(payload, clientId);

      case 'markplaying':
        return handleMarkPlaying(request, payload);

      case 'queuecompleted':
        return handleQueueCompleted(request, payload);

      case 'jukebox':
        return handleJukeboxAdd(payload, clientId);

      case 'jukebox_wishlist_remove':
        return handleJukeboxWishlistRemove(payload, clientId);

      case 'results':
        return handleResults(request, payload);

      case 'remote_acquire':
        return handleRemoteAcquire(clientId);

      case 'remote_release':
        return handleRemoteRelease(clientId);

      case 'remote_command':
        return handleRemoteCommand(payload, clientId);

      case 'setAdPlaying':
        return handleSetAdPlaying(request, payload);

      case 'skipAd':
        return handleSkipAd(clientId);

      case 'assigncharacter':
        return handleAssignCharacter(request, payload);

      case 'heartbeat':
        return handleHeartbeat(clientId);

      case 'sethostprofiles':
        return handleSetHostProfiles(request, payload);

      case 'setplaylists':
        return handleSetPlaylists(request, payload);

      case 'setsongs':
        return handleSetSongs(request, payload);

      case 'chat':
        return handleChat(payload, clientId);

      case 'chat_host':
        return handleChatHost(request, payload);

      case 'chat_host_challenge':
        return handleChatHostChallenge(request, payload);

      case 'tournament_crowd_vote':
        return handleTournamentCrowdVote(payload, clientId);

      case 'song_challenge':
        return handleSongChallenge(payload, clientId);

      case 'accept_challenge':
        return handleAcceptChallenge(payload, clientId);

      case 'accept_challenge_host':
        return handleAcceptChallengeHost(request, payload);

      case 'playlist_add':
        return handlePlaylistAdd(payload, clientId);

      case 'playlist_create_add':
        return handlePlaylistCreateAdd(payload, clientId);

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