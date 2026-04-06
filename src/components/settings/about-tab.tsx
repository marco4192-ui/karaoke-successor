'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { leaderboardService } from '@/lib/api/leaderboard-service';
import { safeAlert } from '@/lib/safe-dialog';
import { MusicIcon } from '@/components/settings/settings-icons';

interface AboutTabProps {
  tx: (key: string) => string;
  isTauriDetected: boolean;
}

export function AboutTab({
  tx,
  isTauriDetected,
}: AboutTabProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
              <MusicIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-xl">Karaoke Successor</div>
              <div className="text-sm text-white/60">{tx('settings.version')} 1.0.0</div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/70 mb-4">
            {tx('settings.aboutDesc')}
          </p>
          <div className="space-y-2 text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">•</span>
              {tx('settings.feature1')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">•</span>
              {tx('settings.feature2')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">•</span>
              {tx('settings.feature3')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">•</span>
              {tx('settings.feature4')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">•</span>
              {tx('settings.feature5')}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-cyan-400 font-medium">Next.js 15</div>
              <div className="text-xs text-white/40">Framework</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-purple-400 font-medium">React</div>
              <div className="text-xs text-white/40">UI Library</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-pink-400 font-medium">Zustand</div>
              <div className="text-xs text-white/40">State Management</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-yellow-400 font-medium">Tailwind CSS</div>
              <div className="text-xs text-white/40">Styling</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Status */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Online Leaderboard</h4>
              <p className="text-sm text-white/60">Connect to global highscores</p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                const connected = await leaderboardService.testConnection();
                safeAlert(connected ? '✅ Connected to leaderboard!' : '❌ Could not connect to leaderboard');
              }}
              className="border-cyan-500/50 text-cyan-400"
            >
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      
      {/* Tauri Desktop App Info - Show in Tauri mode */}
      {isTauriDetected && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-green-400">Desktop App Installed</h4>
              <p className="text-sm text-white/60">This app is running as a native desktop application with full offline support.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
