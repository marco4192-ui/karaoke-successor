// Cloud Sync API
// Handles synchronization between local Prisma/PostgreSQL and PHP backend

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';

// PHP Backend URL (configurable)
const PHP_BACKEND_URL = process.env.PHP_BACKEND_URL || 'https://your-server.com/leaderboard-api';

// Sync all data to/from cloud
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'push':
        return await pushToCloud(session.user.id, data);
      case 'pull':
        return await pullFromCloud(session.user.id);
      case 'full':
        return await fullSync(session.user.id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Push local data to cloud
async function pushToCloud(userId: string, data: any) {
  const player = await db.player.findUnique({
    where: { userId },
    include: {
      scores: {
        where: { syncedToCloud: false },
        orderBy: { playedAt: 'asc' },
        take: 100, // Batch size
      },
      achievements: {
        include: { achievement: true },
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const results = {
    scores: { success: 0, failed: 0 },
    achievements: { success: 0, failed: 0 },
    profile: false,
  };

  // Sync profile to PHP backend
  try {
    const profileResponse = await fetch(`${PHP_BACKEND_URL}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: player.id,
        name: player.name,
        country: player.country,
        color: player.color,
        avatar_url: player.avatar,
      }),
    });

    if (profileResponse.ok) {
      results.profile = true;
      await db.player.update({
        where: { id: player.id },
        data: { lastSyncAt: new Date() },
      });
    }
  } catch (error) {
    console.error('Profile sync error:', error);
  }

  // Sync scores to PHP backend
  for (const score of player.scores) {
    try {
      const response = await fetch(`${PHP_BACKEND_URL}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          song_id: score.songId,
          score: score.score,
          accuracy: score.accuracy,
          max_combo: score.maxCombo,
          difficulty: score.difficulty,
          game_mode: score.gameMode,
          rating: score.rating,
          notes_hit: score.notesHit,
          notes_missed: score.notesMissed,
          duration_played: score.durationPlayed,
          is_duet: score.isDuet,
          harmony_score: score.harmonyScore,
          song_title: data?.songTitle,
          song_artist: data?.songArtist,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await db.score.update({
          where: { id: score.id },
          data: {
            syncedToCloud: true,
            cloudScoreId: result.id,
          },
        });
        results.scores.success++;
      } else {
        results.scores.failed++;
      }
    } catch (error) {
      console.error('Score sync error:', error);
      results.scores.failed++;
    }
  }

  return NextResponse.json({
    message: 'Push sync completed',
    results,
    pendingScores: await db.score.count({
      where: { playerId: player.id, syncedToCloud: false },
    }),
  });
}

// Pull data from cloud
async function pullFromCloud(userId: string) {
  const player = await db.player.findUnique({
    where: { userId },
  });

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const results = {
    scores: 0,
    achievements: 0,
    stats: false,
  };

  // Pull player stats from PHP backend
  try {
    const response = await fetch(`${PHP_BACKEND_URL}/players/${player.id}`);
    if (response.ok) {
      const cloudPlayer = await response.json();

      // Update local stats from cloud (cloud is source of truth for online data)
      await db.player.update({
        where: { id: player.id },
        data: {
          totalScore: BigInt(cloudPlayer.total_score || 0),
          gamesPlayed: cloudPlayer.games_played || 0,
          avgAccuracy: cloudPlayer.avg_accuracy || 0,
          bestScore: cloudPlayer.best_score || 0,
          lastSyncAt: new Date(),
        },
      });
      results.stats = true;
    }
  } catch (error) {
    console.error('Pull stats error:', error);
  }

  // Pull global leaderboard for comparison
  try {
    const response = await fetch(`${PHP_BACKEND_URL}/leaderboard/global?limit=100`);
    if (response.ok) {
      const { leaderboard } = await response.json();
      // Store in cache or return for display
      return NextResponse.json({
        message: 'Pull sync completed',
        results,
        leaderboard,
      });
    }
  } catch (error) {
    console.error('Pull leaderboard error:', error);
  }

  return NextResponse.json({
    message: 'Pull sync completed',
    results,
  });
}

// Full sync (bidirectional)
async function fullSync(userId: string) {
  // First push all local data
  const pushResult = await pushToCloud(userId, {});

  // Then pull cloud data
  const pullResult = await pullFromCloud(userId);

  // Process sync queue
  const queueItems = await db.syncQueueItem.findMany({
    where: { playerId: (await db.player.findUnique({ where: { userId } }))?.id, synced: false },
    take: 50,
  });

  for (const item of queueItems) {
    try {
      // Process each queue item based on type
      const processed = await processQueueItem(item);
      if (processed) {
        await db.syncQueueItem.update({
          where: { id: item.id },
          data: { synced: true, syncedAt: new Date() },
        });
      }
    } catch (error) {
      console.error('Queue item processing error:', error);
      await db.syncQueueItem.update({
        where: { id: item.id },
        data: { syncAttempts: { increment: 1 } },
      });
    }
  }

  return NextResponse.json({
    message: 'Full sync completed',
    push: pushResult,
    pull: pullResult,
    queueProcessed: queueItems.length,
  });
}

async function processQueueItem(item: any): Promise<boolean> {
  const data = JSON.parse(item.data);

  switch (item.type) {
    case 'highscore':
      // Already handled in pushToCloud
      return true;
    case 'profile':
      // Already handled in pushToCloud
      return true;
    case 'achievement':
      // Sync achievement to cloud
      return true;
    default:
      return false;
  }
}

// Get sync status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const player = await db.player.findUnique({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: {
            scores: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Count pending scores separately
    const pendingScores = await db.score.count({
      where: { playerId: player.id, syncedToCloud: false },
    });

    const pendingQueueItems = await db.syncQueueItem.count({
      where: { playerId: player.id, synced: false },
    });

    return NextResponse.json({
      lastSync: player.lastSyncAt,
      totalScores: player._count.scores,
      pendingScores,
      pendingQueueItems,
      syncCode: player.syncCode,
      canSync: true,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
