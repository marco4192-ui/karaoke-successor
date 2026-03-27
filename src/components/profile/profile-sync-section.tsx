'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/lib/game/store';
import { CloudUploadIcon, CloudDownloadIcon } from '@/components/icons';
import { PlayerProfile, HighscoreEntry } from '@/types/game';

interface ProfileSyncSectionProps {
  profile: PlayerProfile;
}

export function ProfileSyncSection({ profile }: ProfileSyncSectionProps) {
  const [syncCode, setSyncCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateProfile, highscores } = useGameStore();

  // Generate a new sync code
  const generateSyncCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Upload profile to server
  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);
    
    try {
      // Generate sync code if not exists
      const code = profile.syncCode || generateSyncCode();
      
      // Update profile with sync code locally
      updateProfile(profile.id, { syncCode: code });
      
      // Get highscores for this profile
      const profileHighscores: Record<string, HighscoreEntry[]> = {};
      highscores
        .filter(h => h.playerId === profile.id)
        .forEach(h => {
          if (!profileHighscores[h.songId]) {
            profileHighscores[h.songId] = [];
          }
          profileHighscores[h.songId].push(h);
        });
      
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const result = await leaderboardService.uploadProfile(profile, profileHighscores);
      
      if (result.success) {
        setSyncCode(code);
        setMessage({ type: 'success', text: `Profile uploaded! Sync code: ${code}` });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: unknown) {
      console.error('Profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  // Download profile from server
  const handleDownloadProfile = async () => {
    if (!inputCode || inputCode.length !== 8) {
      setMessage({ type: 'error', text: 'Please enter a valid 8-character sync code' });
      return;
    }
    
    setIsDownloading(true);
    setMessage(null);
    
    try {
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const downloadedProfile = await leaderboardService.downloadProfileByCode(inputCode.toUpperCase());
      
      if (downloadedProfile) {
        // Update the local profile with downloaded data
        updateProfile(profile.id, {
          name: downloadedProfile.name,
          avatar: downloadedProfile.avatar || undefined,
          country: downloadedProfile.country || undefined,
          color: downloadedProfile.color,
          stats: downloadedProfile.stats,
          achievements: downloadedProfile.achievements,
          privacy: downloadedProfile.settings.privacy,
          syncCode: downloadedProfile.sync_code,
        });
        
        setMessage({ type: 'success', text: 'Profile synced successfully!' });
        setInputCode('');
      } else {
        throw new Error('Profile not found');
      }
    } catch (error: unknown) {
      console.error('Profile download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download profile. Check the sync code.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Show existing sync code if available */}
      {profile.syncCode && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">Sync Code:</span>
          <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
            {profile.syncCode}
          </code>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUploadProfile}
          disabled={isUploading}
          className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          {isUploading ? (
            <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin mr-1" />
          ) : (
            <CloudUploadIcon className="w-3 h-3 mr-1" />
          )}
          Upload
        </Button>
        
        <div className="flex items-center gap-1">
          <Input
            id="sync-code"
            name="sync-code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Sync code"
            maxLength={8}
            className="h-7 w-28 text-xs bg-white/5 border-white/10"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadProfile}
            disabled={isDownloading || inputCode.length !== 8}
            className="h-7 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {isDownloading ? (
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudDownloadIcon className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Status message */}
      {message && (
        <div className={`text-xs p-2 rounded ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
