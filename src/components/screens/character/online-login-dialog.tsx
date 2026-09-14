'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudDownloadIcon } from '@/components/icons';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import type { PlayerProfile } from '@/types/game';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface OnlineLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * App-only login dialog: load an online profile on this device with
 * e-mail + password. There is no web login anywhere — this dialog is the
 * only place where account credentials can be used.
 */
export function OnlineLoginDialog({ open, onOpenChange }: OnlineLoginDialogProps) {
  const { t } = useTranslation();
  const { importOnlineProfile, highscores, addHighscore } = useGameStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && password.length > 0 && !isLoggingIn;

  const reset = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoggingIn(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleLogin = async () => {
    if (!canSubmit) return;
    setIsLoggingIn(true);
    setError(null);

    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const result = await leaderboardService.loginWithAccount(email.trim().toLowerCase(), password);

      if (!result.ok) {
        setError(result.reason === 'noSnapshot'
          ? t('profileAuth.noSnapshot')
          : t('profileAuth.loginFailed'));
        return;
      }

      const snapshot = result.snapshot;
      const imported = importOnlineProfile(snapshot.profile as PlayerProfile);

      // Restore the backed-up highscores (skip local duplicates, same
      // dedup semantics as the sync-code download in the settings card).
      const existing = new Set(
        highscores
          .filter(h => h.playerId === imported.id)
          .map(h => `${h.songId}|${h.difficulty}|${h.score}`),
      );
      const backup = Object.values(snapshot.highscores ?? {}).flat();
      for (const entry of backup) {
        if (existing.has(`${entry.songId}|${entry.difficulty}|${entry.score}`)) continue;
        addHighscore({
          ...entry,
          playerId: imported.id,
          playerName: imported.name,
          playerColor: imported.color,
        });
      }

      handleClose(false);
    } catch (err) {
      console.error('Online login error:', err); // eslint-disable-line no-console
      setError(t('profileAuth.loginFailed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownloadIcon className="w-5 h-5 text-purple-400" />
            {t('profileAuth.loginTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-white/50">{t('profileAuth.loginDesc')}</p>

          <Input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder={t('profileAuth.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label={t('profileAuth.email')}
            className="bg-white/5 border-white/15 text-white"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin(); }}
          />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t('profileAuth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label={t('profileAuth.password')}
            className="bg-white/5 border-white/15 text-white"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin(); }}
          />

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              className="border-white/20"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => void handleLogin()}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 gap-2"
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CloudDownloadIcon className="w-4 h-4" />
              )}
              {t('profileAuth.loginButton')}
            </Button>
          </div>

          <p className="text-[11px] text-white/30 text-center">
            🔒 {t('profileAuth.emailNote')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
