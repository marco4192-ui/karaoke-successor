// Database Management API
// Handles backup, restore, and status operations

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseService } from '@/lib/database/db-service';

/**
 * GET /api/database - Get database status
 */
export async function GET() {
  try {
    const dbService = getDatabaseService();
    const status = await dbService.getStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Database status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get database status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/database - Backup or restore database
 * Body: { action: 'backup' | 'restore' | 'clear', data?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const dbService = getDatabaseService();

    switch (action) {
      case 'backup': {
        const backupData = await dbService.createBackup();

        // Return as downloadable JSON
        return new NextResponse(backupData, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="karaoke-backup-${new Date().toISOString().split('T')[0]}.json"`,
          },
        });
      }

      case 'restore': {
        if (!data) {
          return NextResponse.json(
            { success: false, error: 'No backup data provided' },
            { status: 400 }
          );
        }

        const result = await dbService.restoreBackup(data);
        return NextResponse.json(result);
      }

      case 'clear': {
        await dbService.clearAllData();
        return NextResponse.json({
          success: true,
          message: 'All data cleared successfully',
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: backup, restore, or clear' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Database operation error:', error);
    return NextResponse.json(
      { success: false, error: 'Database operation failed' },
      { status: 500 }
    );
  }
}
