'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Users,
  Music,
  Trophy,
} from 'lucide-react';

interface DatabaseStatus {
  initialized: boolean;
  version: number;
  lastBackup: string | null;
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

export function DatabaseManagementPanel() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch database status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/database');
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch database status:', error);
    }
  }, []);

  // Create backup
  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karaoke-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: 'Backup created successfully!' });
      } else {
        throw new Error('Backup failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' });
    } finally {
      setLoading(false);
    }
  };

  // Restore from backup
  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const text = await file.text();
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', data: text }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'Backup restored successfully!' });
        fetchStatus();
      } else {
        throw new Error(result.message || 'Restore failed');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restore backup',
      });
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Clear all data
  const handleClearData = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear' }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: 'success', text: 'All data cleared successfully!' });
        fetchStatus();
      } else {
        throw new Error('Clear failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to clear data' });
    } finally {
      setLoading(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Load status on mount
  useState(() => {
    fetchStatus();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            Manage your local database. All data is stored locally on your device.
            No console commands required!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Display */}
          {status && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Users</p>
                  <p className="text-lg font-semibold">{status.counts.users}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Players</p>
                  <p className="text-lg font-semibold">{status.counts.players}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Music className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Scores</p>
                  <p className="text-lg font-semibold">{status.counts.scores}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Size</p>
                  <p className="text-lg font-semibold">{formatSize(status.size)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {status?.initialized ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Database initialized and ready
                </span>
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-yellow-500" />
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  Initializing database...
                </span>
              </>
            )}
          </div>

          {/* Message Display */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Backup Button */}
            <Button onClick={handleBackup} disabled={loading} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Create Backup
            </Button>

            {/* Restore Button */}
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                className="hidden"
                id="backup-restore"
                disabled={loading}
              />
              <label htmlFor="backup-restore">
                <Button variant="outline" disabled={loading} asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Backup
                  </span>
                </Button>
              </label>
            </div>

            {/* Refresh Status */}
            <Button onClick={fetchStatus} disabled={loading} variant="ghost">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Clear Data (with confirmation) */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={loading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All user accounts</li>
                      <li>All player profiles</li>
                      <li>All scores and achievements</li>
                      <li>All settings</li>
                    </ul>
                    <p className="mt-2 text-destructive font-semibold">
                      This action cannot be undone!
                    </p>
                    <p className="mt-2">
                      We recommend creating a backup first.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Database className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">Automatic Database Management</p>
              <p>
                The database is automatically created when you first start the app.
                No installation or console commands are needed. All your data is stored
                locally in a single file that can be easily backed up and restored.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DatabaseManagementPanel;
