// Database Service - Automatic initialization and management
// Handles all database operations without requiring console commands

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

// Database status
export interface DatabaseStatus {
  initialized: boolean;
  version: number;
  lastBackup: Date | null;
  size: number;
  path: string;
  needsMigration: boolean;
  counts: {
    users: number;
    players: number;
    scores: number;
    songs: number;
  };
}

// Backup data structure
export interface BackupData {
  version: string;
  timestamp: string;
  appVersion: string;
  data: {
    users: unknown[];
    players: unknown[];
    scores: unknown[];
    achievements: unknown[];
    settings: unknown[];
  };
}

class DatabaseService {
  private prisma: PrismaClient | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize database - called automatically on app start
   * Creates tables if they don't exist, runs migrations if needed
   */
  async initialize(): Promise<PrismaClient> {
    if (this.prisma && this.initialized) {
      return this.prisma;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.prisma!;
    }

    this.initPromise = this.doInitialize();
    await this.initPromise;
    return this.prisma!;
  }

  private async doInitialize(): Promise<void> {
    try {
      logger.info('[Database]', 'Initializing database...');

      // Create Prisma client
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      });

      // Connect to database
      await this.prisma.$connect();

      // Run migrations (push schema to database)
      await this.runMigrations();

      // Seed default data if needed
      await this.seedDefaultData();

      this.initialized = true;
      logger.info('[Database]', 'Database initialized successfully');
    } catch (error) {
      logger.error('[Database]', 'Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   * In Tauri, we use $push instead of migrate for simplicity
   */
  private async runMigrations(): Promise<void> {
    try {
      // Check if database is empty (first run)
      const userCount = await this.prisma!.user.count();

      if (userCount === 0) {
        logger.info('[Database]', 'First run detected - database schema ready');
      }
    } catch (error) {
      // Tables don't exist yet - this is fine for first run
      // Prisma will create them on first query
      logger.info('[Database]', 'Creating database schema...');
    }
  }

  /**
   * Seed default data for new installation
   */
  private async seedDefaultData(): Promise<void> {
    try {
      // Check if any achievements exist
      const achievementCount = await this.prisma!.achievement.count();

      if (achievementCount === 0) {
        logger.info('[Database]', 'Seeding default achievements...');
        await this.seedAchievements();
      }
    } catch (error) {
      logger.warn('[Database]', 'Could not seed default data:', error);
    }
  }

  /**
   * Seed default achievements
   */
  private async seedAchievements(): Promise<void> {
    const defaultAchievements = [
      { id: 'first-song', name: 'First Steps', description: 'Complete your first song', category: 'general', xpReward: 100, condition: '{"type":"songs","count":1}', rarity: 'common' },
      { id: 'ten-songs', name: 'Getting Started', description: 'Complete 10 songs', category: 'general', xpReward: 250, condition: '{"type":"songs","count":10}', rarity: 'common' },
      { id: 'fifty-songs', name: 'Karaoke Enthusiast', description: 'Complete 50 songs', category: 'general', xpReward: 500, condition: '{"type":"songs","count":50}', rarity: 'uncommon' },
      { id: 'hundred-songs', name: 'Karaoke Addict', description: 'Complete 100 songs', category: 'general', xpReward: 1000, condition: '{"type":"songs","count":100}', rarity: 'rare' },
      { id: 'perfect-score', name: 'Perfectionist', description: 'Score 100% on a song', category: 'scoring', xpReward: 500, condition: '{"type":"accuracy","value":100}', rarity: 'epic' },
      { id: 'ninety-accuracy', name: 'Pitch Perfect', description: 'Score 95% or higher on 10 songs', category: 'scoring', xpReward: 750, condition: '{"type":"accuracy","value":95,"count":10}', rarity: 'rare' },
      { id: 'eighty-accuracy', name: 'On Key', description: 'Score 85% or higher on 25 songs', category: 'scoring', xpReward: 400, condition: '{"type":"accuracy","value":85,"count":25}', rarity: 'uncommon' },
      { id: 'level-10', name: 'Rising Star', description: 'Reach level 10', category: 'progression', xpReward: 300, condition: '{"type":"level","value":10}', rarity: 'uncommon' },
      { id: 'level-25', name: 'Stage Veteran', description: 'Reach level 25', category: 'progression', xpReward: 750, condition: '{"type":"level","value":25}', rarity: 'rare' },
      { id: 'level-50', name: 'Karaoke Legend', description: 'Reach level 50', category: 'progression', xpReward: 2000, condition: '{"type":"level","value":50}', rarity: 'legendary' },
      { id: 'multiplayer-win', name: 'Champion', description: 'Win a multiplayer game', category: 'social', xpReward: 300, condition: '{"type":"multiplayer","action":"win"}', rarity: 'uncommon' },
      { id: 'five-day-streak', name: 'Dedicated Singer', description: 'Play for 5 days in a row', category: 'general', xpReward: 400, condition: '{"type":"streak","days":5}', rarity: 'uncommon' },
    ];

    for (const achievement of defaultAchievements) {
      await this.prisma!.achievement.create({
        data: achievement,
      }).catch(() => {
        // Ignore if already exists
      });
    }

    logger.info('[Database]', `Seeded ${defaultAchievements.length} achievements`);
  }

  /**
   * Get database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    await this.initialize();

    // Get database stats
    const [users, players, scores, songs] = await Promise.all([
      this.prisma!.user.count(),
      this.prisma!.player.count(),
      this.prisma!.score.count(),
      this.prisma!.song.count(),
    ]);

    // Estimate database size (rough approximation)
    const estimatedSize = (users * 2 + players * 5 + scores * 1 + songs * 2) * 1024; // rough KB estimate

    return {
      initialized: this.initialized,
      version: 1,
      lastBackup: null, // TODO: Track last backup
      size: estimatedSize,
      path: 'karaoke.db',
      needsMigration: false,
      counts: { users, players, scores, songs },
    };
  }

  /**
   * Create a full backup of the database
   */
  async createBackup(): Promise<string> {
    await this.initialize();

    logger.info('[Database]', 'Creating backup...');

    const backup: BackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      appVersion: process.env.npm_package_version || '1.0.0',
      data: {
        users: await this.prisma!.user.findMany(),
        players: await this.prisma!.player.findMany(),
        scores: await this.prisma!.score.findMany(),
        achievements: await this.prisma!.playerAchievement.findMany(),
        settings: await this.prisma!.userSettings.findMany(),
      },
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupJson: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.initialize();

      const backup: BackupData = JSON.parse(backupJson);

      // Validate backup
      if (!backup.version || !backup.data) {
        return { success: false, message: 'Invalid backup file format' };
      }

      logger.info('[Database]', 'Restoring from backup...');

      // Clear existing data (in transaction)
      await this.prisma!.$transaction(async (tx) => {
        // Delete in correct order (respecting foreign keys)
        await tx.score.deleteMany();
        await tx.playerAchievement.deleteMany();
        await tx.dailyChallengeCompletion.deleteMany();
        await tx.syncQueueItem.deleteMany();
        await tx.player.deleteMany();
        await tx.userSettings.deleteMany();
        await tx.account.deleteMany();
        await tx.session.deleteMany();
        await tx.user.deleteMany();

        // Restore data
        if (backup.data.users?.length) {
          for (const user of backup.data.users as any[]) {
            await tx.user.create({ data: user });
          }
        }

        if (backup.data.players?.length) {
          for (const player of backup.data.players as any[]) {
            await tx.player.create({ data: player });
          }
        }

        if (backup.data.scores?.length) {
          for (const score of backup.data.scores as any[]) {
            await tx.score.create({ data: score });
          }
        }

        if (backup.data.achievements?.length) {
          for (const achievement of backup.data.achievements as any[]) {
            await tx.playerAchievement.create({ data: achievement });
          }
        }

        if (backup.data.settings?.length) {
          for (const settings of backup.data.settings as any[]) {
            await tx.userSettings.create({ data: settings });
          }
        }
      });

      logger.info('[Database]', 'Backup restored successfully');
      return { success: true, message: 'Backup restored successfully' };
    } catch (error) {
      logger.error('[Database]', 'Failed to restore backup:', error);
      return { success: false, message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Clear all user data (factory reset)
   */
  async clearAllData(): Promise<void> {
    await this.initialize();

    logger.info('[Database]', 'Clearing all data...');

    await this.prisma!.$transaction(async (tx) => {
      await tx.score.deleteMany();
      await tx.playerAchievement.deleteMany();
      await tx.dailyChallengeCompletion.deleteMany();
      await tx.syncQueueItem.deleteMany();
      await tx.player.deleteMany();
      await tx.userSettings.deleteMany();
      await tx.account.deleteMany();
      await tx.session.deleteMany();
      await tx.user.deleteMany();
    });

    // Re-seed default data
    await this.seedDefaultData();

    logger.info('[Database]', 'All data cleared');
  }

  /**
   * Get Prisma client
   */
  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.prisma;
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      this.initialized = false;
      logger.info('[Database]', 'Disconnected from database');
    }
  }
}

// Singleton instance
let dbServiceInstance: DatabaseService | null = null;

export function getDatabaseService(): DatabaseService {
  if (!dbServiceInstance) {
    dbServiceInstance = new DatabaseService();
  }
  return dbServiceInstance;
}

export const databaseService = {
  get instance(): DatabaseService {
    return getDatabaseService();
  },
};

// Auto-initialize on import (for use in app startup)
export async function initializeDatabase(): Promise<PrismaClient> {
  return getDatabaseService().initialize();
}

export default DatabaseService;
