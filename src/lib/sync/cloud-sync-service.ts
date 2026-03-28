// Cloud Sync Service
// Manages synchronization between local Prisma database and PHP backend

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// PHP Backend configuration
const PHP_BACKEND_URL = process.env.PHP_BACKEND_URL || '';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
  lastSyncAt: Date | null;
}

export interface SyncStatus {
  lastSync: Date | null;
  pendingScores: number;
  pendingAchievements: number;
  totalScores: number;
  isConnected: boolean;
}

class CloudSyncService {
  private syncInProgress = false;
  private lastSyncAttempt: Date | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize automatic sync
   */
  startAutoSync(playerId: string, intervalMs: number = 5 * 60 * 1000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.performSync(playerId).catch(error => {
        logger.error('[CloudSync]', 'Auto-sync failed:', error);
      });
    }, intervalMs);

    logger.info('[CloudSync]', 'Auto-sync started');
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('[CloudSync]', 'Auto-sync stopped');
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(playerId: string): Promise<SyncStatus> {
    const player = await db.player.findUnique({
      where: { id: playerId },
      include: {
        _count: {
          select: { scores: true },
        },
      },
    });

    if (!player) {
      return {
        lastSync: null,
        pendingScores: 0,
        pendingAchievements: 0,
        totalScores: 0,
        isConnected: false,
      };
    }

    const pendingScores = await db.score.count({
      where: { playerId, syncedToCloud: false },
    });

    const pendingQueueItems = await db.syncQueueItem.count({
      where: { playerId, synced: false },
    });

    // Check connection to PHP backend
    let isConnected = false;
    if (PHP_BACKEND_URL) {
      try {
        const response = await fetch(`${PHP_BACKEND_URL}/`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        isConnected = response.ok;
      } catch {
        isConnected = false;
      }
    }

    return {
      lastSync: player.lastSyncAt,
      pendingScores,
      pendingAchievements: pendingQueueItems,
      totalScores: player._count.scores,
      isConnected,
    };
  }

  /**
   * Perform full sync (push + pull)
   */
  async performSync(playerId: string): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        errors: ['Sync already in progress'],
        lastSyncAt: null,
      };
    }

    this.syncInProgress = true;
    this.lastSyncAttempt = new Date();

    const result: SyncResult = {
      success: true,
      pushed: 0,
      pulled: 0,
      errors: [],
      lastSyncAt: null,
    };

    try {
      // Push local data to cloud
      const pushResult = await this.pushToCloud(playerId);
      result.pushed = pushResult.pushed;
      result.errors.push(...pushResult.errors);

      // Pull cloud data
      const pullResult = await this.pullFromCloud(playerId);
      result.pulled = pullResult.pulled;
      result.errors.push(...pullResult.errors);

      // Update last sync time
      await db.player.update({
        where: { id: playerId },
        data: { lastSyncAt: new Date() },
      });

      result.lastSyncAt = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Push local scores and profile to PHP backend
   */
  private async pushToCloud(playerId: string): Promise<{ pushed: number; errors: string[] }> {
    const errors: string[] = [];
    let pushed = 0;

    if (!PHP_BACKEND_URL) {
      errors.push('PHP_BACKEND_URL not configured');
      return { pushed, errors };
    }

    const player = await db.player.findUnique({
      where: { id: playerId },
      include: {
        scores: {
          where: { syncedToCloud: false },
          orderBy: { playedAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!player) {
      errors.push('Player not found');
      return { pushed, errors };
    }

    // Sync player profile
    try {
      const response = await fetch(`${PHP_BACKEND_URL}/players`, {
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

      if (!response.ok) {
        errors.push(`Profile sync failed: ${response.status}`);
      }
    } catch (error) {
      errors.push(`Profile sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    // Sync scores
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
          pushed++;
        } else {
          errors.push(`Score ${score.id} sync failed: ${response.status}`);
        }
      } catch (error) {
        errors.push(`Score ${score.id} sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return { pushed, errors };
  }

  /**
   * Pull aggregated stats from PHP backend
   */
  private async pullFromCloud(playerId: string): Promise<{ pulled: number; errors: string[] }> {
    const errors: string[] = [];
    let pulled = 0;

    if (!PHP_BACKEND_URL) {
      errors.push('PHP_BACKEND_URL not configured');
      return { pulled, errors };
    }

    // Pull player stats
    try {
      const response = await fetch(`${PHP_BACKEND_URL}/players/${playerId}`);

      if (response.ok) {
        const cloudPlayer = await response.json();

        await db.player.update({
          where: { id: playerId },
          data: {
            totalScore: cloudPlayer.total_score || 0,
            gamesPlayed: cloudPlayer.games_played || 0,
            avgAccuracy: cloudPlayer.avg_accuracy || 0,
            bestScore: cloudPlayer.best_score || 0,
          },
        });
        pulled++;
      }
    } catch (error) {
      errors.push(`Stats pull error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    return { pulled, errors };
  }

  /**
   * Add item to sync queue for offline-first support
   */
  async addToSyncQueue(
    playerId: string,
    type: 'highscore' | 'profile' | 'achievement' | 'settings',
    action: 'create' | 'update' | 'delete',
    data: unknown
  ): Promise<void> {
    await db.syncQueueItem.create({
      data: {
        playerId,
        type,
        action,
        data: JSON.stringify(data),
      },
    });
  }

  /**
   * Process pending sync queue items
   */
  async processSyncQueue(playerId: string): Promise<number> {
    const items = await db.syncQueueItem.findMany({
      where: { playerId, synced: false },
      take: 50,
    });

    let processed = 0;

    for (const item of items) {
      try {
        // Process based on type
        switch (item.type) {
          case 'highscore':
          case 'profile':
            // Already handled in pushToCloud
            break;
          case 'achievement':
            // TODO: Sync achievements
            break;
          case 'settings':
            // TODO: Sync settings
            break;
        }

        await db.syncQueueItem.update({
          where: { id: item.id },
          data: { synced: true, syncedAt: new Date() },
        });
        processed++;
      } catch (error) {
        await db.syncQueueItem.update({
          where: { id: item.id },
          data: {
            syncAttempts: { increment: 1 },
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    return processed;
  }
}

// Singleton instance
let syncServiceInstance: CloudSyncService | null = null;

export function getCloudSyncService(): CloudSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new CloudSyncService();
  }
  return syncServiceInstance;
}

export const cloudSyncService = {
  get instance(): CloudSyncService {
    return getCloudSyncService();
  },
};

export default CloudSyncService;
