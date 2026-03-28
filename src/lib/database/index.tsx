'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeDatabase, getDatabaseService, DatabaseStatus } from './db-service';

// Re-export everything from db-service
export { initializeDatabase, getDatabaseService, getDatabaseService as databaseService } from './db-service';
export type { DatabaseStatus, BackupData } from './db-service';

interface DatabaseContextType {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  status: DatabaseStatus | null;
  refreshStatus: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  initialized: false,
  loading: true,
  error: null,
  status: null,
  refreshStatus: async () => {},
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);

  // Initialize database on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        console.log('[DatabaseProvider] Initializing database...');
        await initializeDatabase();

        if (mounted) {
          setInitialized(true);
          setLoading(false);

          // Fetch initial status
          const dbService = getDatabaseService();
          const dbStatus = await dbService.getStatus();
          setStatus(dbStatus);

          console.log('[DatabaseProvider] Database initialized successfully');
        }
      } catch (err) {
        console.error('[DatabaseProvider] Failed to initialize database:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize database');
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const refreshStatus = async () => {
    try {
      const dbService = getDatabaseService();
      const dbStatus = await dbService.getStatus();
      setStatus(dbStatus);
    } catch (err) {
      console.error('[DatabaseProvider] Failed to refresh status:', err);
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        initialized,
        loading,
        error,
        status,
        refreshStatus,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

export default DatabaseProvider;
