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
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateProfile, highscores, addHighscore } = useGameStore();

  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);

    try {
      const code = profile.syncCode || generateSyncCode();
      // Upload immediately with the fresh code — the profile object from
      // this render is stale and would upload without it.
      const uploadableProfile: PlayerProfile = { ...profile, syncCode: code };
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
      const result = await leaderboardService.uploadProfile(uploadableProfile, profileHighscores);

      if (result.success) {
        setMessage({ type: 'success', text: t('profileSync.uploadSuccess').replace('{n}', code) });
      } else {
        throw new Error(result.error || t('profileSync.uploadFailed'));
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : t('profileSync.uploadFailed');
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
      const result = await leaderboardService.downloadProfileByCode(inputCode.toUpperCase());

      if (result?.profile) {
        const synced = result.profile;
        updateProfile(profile.id, {
          name: synced.name,
          avatar: synced.avatar || undefined,
          country: synced.country || undefined,
          color: synced.color,
          stats: synced.stats,
          achievements: synced.achievements || [],
          xp: synced.xp,
          level: synced.level,
          privacy: synced.privacy,
          syncCode: inputCode.toUpperCase(),
          syncUid: result.profile_uid,
        });

        // Restore the backed-up highscores for this profile (skip entries
        // that already exist locally so repeated downloads don't duplicate).
        const existing = new Set(
          highscores.filter(h => h.playerId === profile.id).map(h => `${h.songId}|${h.difficulty}|${h.score}`)
        );
        const backup = Object.values(result.highscores ?? {}).flat();
        for (const entry of backup) {
          if (existing.has(`${entry.songId}|${entry.difficulty}|${entry.score}`)) continue;
          addHighscore({ ...entry, playerId: profile.id, playerName: synced.name, playerColor: synced.color });
        }

        setMessage({ type: 'success', text: t('profileSync.syncSuccess') });
        setInputCode('');
      } else {
        throw new Error(t('profileSync.profileNotFound'));
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

      {profile.authEmail && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">🔐 {t('profileAuth.hasAccount')}</span>
          <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded truncate" title={profile.authEmail}>
            {profile.authEmail}
          </span>
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

      {profile.authEmail && (
        <AccountPasswordSection email={profile.authEmail} />
      )}
    </div>
  );
}

/** Change-password UI for profiles linked to an online account. */
function AccountPasswordSection({ email }: { email: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwRepeat, setNewPwRepeat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const valid = currentPw.length > 0 && newPw.length >= 8 && newPw === newPwRepeat;

  const handleChangePassword = async () => {
    if (!valid || isSaving) return;
    setIsSaving(true);
    setMsg(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const result = await leaderboardService.changeAccountPassword(email, currentPw, newPw);
      if (result.ok) {
        setMsg({ type: 'success', text: t('profileAuth.passwordChanged') });
        setCurrentPw('');
        setNewPw('');
        setNewPwRepeat('');
      } else {
        setMsg({ type: 'error', text: t('profileAuth.passwordChangeFailed') });
      }
    } catch {
      setMsg({ type: 'error', text: t('profileAuth.passwordChangeFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] text-purple-300/80 hover:text-purple-200 transition-colors underline underline-offset-2"
      >
        🔑 {t('profileAuth.changePassword')}
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t('profileAuth.currentPassword')}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            aria-label={t('profileAuth.currentPassword')}
            className="h-7 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.newPassword')}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            aria-label={t('profileAuth.newPassword')}
            className="h-7 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.passwordRepeat')}
            value={newPwRepeat}
            onChange={(e) => setNewPwRepeat(e.target.value)}
            aria-label={t('profileAuth.passwordRepeat')}
            className="h-7 text-xs bg-white/5 border-white/10"
          />
          {newPw.length > 0 && newPw.length < 8 && (
            <div className="text-[11px] text-red-400">{t('profileAuth.passwordTooShort')}</div>
          )}
          {newPw.length >= 8 && newPwRepeat.length > 0 && newPw !== newPwRepeat && (
            <div className="text-[11px] text-red-400">{t('profileAuth.passwordsDontMatch')}</div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => void handleChangePassword()}
              disabled={!valid || isSaving}
              className="h-7 text-xs bg-purple-500 hover:bg-purple-600"
            >
              {isSaving && <div className="w-3 h-3 border border-white/70 border-t-transparent rounded-full animate-spin mr-1" />}
              {t('profileAuth.changePassword')}
            </Button>
          </div>
          {msg && (
            <div className={`text-[11px] p-2 rounded ${
              msg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {msg.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
