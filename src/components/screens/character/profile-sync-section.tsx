'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudUploadIcon, CloudDownloadIcon } from '@/components/icons';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { PlayerProfile, HighscoreEntry } from '@/types/game';

function generateSyncCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function ProfileSyncSection({ profile }: { profile: PlayerProfile }) {
  const { t } = useTranslation();
  const [__syncCode, setSyncCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateProfile, highscores } = useGameStore();

  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);
    
    try {
      const code = profile.syncCode || generateSyncCode();
      updateProfile(profile.id, { syncCode: code });
      
      const profileHighscores: Record<string, HighscoreEntry[]> = {};
      highscores
        .filter(h => h.playerId === profile.id)
        .forEach(h => {
          if (!profileHighscores[h.songId]) {
            profileHighscores[h.songId] = [];
          }
          profileHighscores[h.songId].push(h);
        });
      
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const result = await leaderboardService.uploadProfile(profile, profileHighscores);
      
      if (result.success) {
        setSyncCode(code);
        setMessage({ type: 'success', text: t('profileSync.uploadSuccess').replace('{n}', code) });
      } else {
        throw new Error(t('profileSync.uploadFailed'));
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : t('profileSync.downloadFailed');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadProfile = async () => {
    if (!inputCode || inputCode.length !== 8) {
      setMessage({ type: 'error', text: t('profileSync.invalidCode') });
      return;
    }
    
    setIsDownloading(true);
    setMessage(null);
    
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const downloadedProfile = await leaderboardService.downloadProfileByCode(inputCode.toUpperCase());
      
      if (downloadedProfile) {
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
        
        setMessage({ type: 'success', text: t('profileSync.syncSuccess') });
        setInputCode('');
      } else {
        throw new Error('Profile not found');
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Profile download error:', error);
      const errorMessage = error instanceof Error ? error.message : t('profileSync.downloadFailedMsg');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {profile.syncCode && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">{t('profileSync.syncCode')}</span>
          <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
            {profile.syncCode}
          </code>
        </div>
      )}
      
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
          {t('profileSync.upload')}
        </Button>
        
        <div className="flex items-center gap-1">
          <Input
            id="sync-code"
            name="sync-code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder={t('profileSync.syncCodePlaceholder')}
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
