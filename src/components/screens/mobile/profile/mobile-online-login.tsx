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
import { useTranslation } from '@/lib/i18n/translations';
import { RecoveryCodeDialog } from '@/components/screens/character/recovery-code-dialog';
import type { MobileProfile } from '@/app/api/mobile/mobile-types';
import { EMAIL_RE, playerProfileToMobile } from './mobile-profile-bridge';

interface MobileOnlineLoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the mobile-shaped profile after a successful login. */
  onAdoptProfile: (_profile: MobileProfile) => void;
}

/**
 * R93g: companion-side twin of the desktop OnlineLoginDialog — the SAME
 * e-mail + password login (plus the R69 "forgot password" recovery flow),
 * but the downloaded profile is adopted as THIS phone's companion profile
 * instead of being imported into the desktop game store. The profile keeps
 * its server identity (id, syncCode, syncUid, authEmail), so the phone and
 * a logged-in desktop sing under the same profile.
 */
export function MobileOnlineLoginDialog({ open, onOpenChange, onAdoptProfile }: MobileOnlineLoginDialogProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Recovery form
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('');

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** R69: rotated/first-issued recovery code to show once. */
  const [recoveryResult, setRecoveryResult] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && password.length > 0 && !isLoggingIn;
  const recoverCodeClean = recoveryCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const canRecover = emailValid
    && recoverCodeClean.length >= 16
    && newPassword.length >= 8
    && newPassword === newPasswordRepeat
    && !isRecovering;

  const reset = () => {
    setMode('login');
    setEmail('');
    setPassword('');
    setRecoveryCode('');
    setNewPassword('');
    setNewPasswordRepeat('');
    setError(null);
    setIsLoggingIn(false);
    setIsRecovering(false);
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

      // Adopt the downloaded profile as this phone's companion profile —
      // same field mapping as the desktop's importOnlineProfile, but for
      // the lightweight MobileProfile shape (identity + sync linkage).
      onAdoptProfile(playerProfileToMobile(result.snapshot.profile));

      // R69: legacy account without a recovery code — the server issued one
      // with this login. Show it exactly once before the dialog closes.
      if (result.recoveryCode) {
        setRecoveryResult(result.recoveryCode);
        setPassword('');
        return;
      }
      reset();
      handleClose(false);
    } catch (err) {
      console.error('Companion online login error:', err); // eslint-disable-line no-console
      setError(t('profileAuth.loginFailed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  /** R69: reset the password with the one-time recovery code. */
  const handleRecover = async () => {
    if (!canRecover) return;
    setIsRecovering(true);
    setError(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const result = await leaderboardService.recoverAccount(
        email.trim().toLowerCase(),
        recoverCodeClean,
        newPassword,
      );
      if (!result.ok) {
        setError(t('profileAuth.recoverFailed'));
        return;
      }
      // Success: new password is set, the server rotated the recovery code.
      setRecoveryCode('');
      setNewPassword('');
      setNewPasswordRepeat('');
      if (result.recovery_code) {
        setRecoveryResult(result.recovery_code);
      } else {
        setMode('login');
        setError(null);
      }
    } catch {
      setError(t('profileAuth.recoverFailed'));
    } finally {
      setIsRecovering(false);
    }
  };

  // R69: the recovery-code dialog overlays everything; closing it returns
  // to the (freshly reset) login form.
  if (recoveryResult) {
    return (
      <RecoveryCodeDialog
        code={recoveryResult}
        open
        onOpenChange={() => {
          setRecoveryResult(null);
          setMode('login');
          setPassword('');
          setError(null);
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[rgb(24,24,32)] border-white/15 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownloadIcon className="w-5 h-5 text-purple-400" />
            {mode === 'login' ? t('profileAuth.loginTitle') : t('profileAuth.recoverTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {mode === 'login' && (
            <>
              <p className="text-xs text-white/50">{t('profileAuth.loginDesc')}</p>

              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
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
                  data-testid="mobile-login-submit"
                >
                  {isLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CloudDownloadIcon className="w-4 h-4" />
                  )}
                  {t('profileAuth.loginButton')}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setMode('recover'); setError(null); }}
                  data-testid="mobile-forgot-password-link"
                  className="text-[11px] text-purple-300/80 hover:text-purple-200 transition-colors underline underline-offset-2"
                >
                  {t('profileAuth.forgotPassword')}
                </button>
                <p className="text-[11px] text-white/30">
                  🔒 {t('profileAuth.emailNote')}
                </p>
              </div>
            </>
          )}

          {mode === 'recover' && (
            <>
              <p className="text-xs leading-relaxed text-white/50">
                {t('profileAuth.recoverDesc')}
              </p>

              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
                autoFocus
                placeholder={t('profileAuth.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label={t('profileAuth.email')}
                className="bg-white/5 border-white/15 text-white"
              />
              <Input
                autoComplete="one-time-code"
                placeholder={t('profileAuth.recoveryCodePlaceholder')}
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                aria-label={t('profileAuth.recoveryCode')}
                className="bg-white/5 border-white/15 text-white font-mono tracking-wider"
                maxLength={19}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('profileAuth.newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                aria-label={t('profileAuth.newPassword')}
                className="bg-white/5 border-white/15 text-white"
                onKeyDown={(e) => { if (e.key === 'Enter') void handleRecover(); }}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder={t('profileAuth.passwordRepeat')}
                value={newPasswordRepeat}
                onChange={(e) => setNewPasswordRepeat(e.target.value)}
                aria-label={t('profileAuth.passwordRepeat')}
                className="bg-white/5 border-white/15 text-white"
                onKeyDown={(e) => { if (e.key === 'Enter') void handleRecover(); }}
              />

              {newPassword.length > 0 && newPassword.length < 8 && (
                <div className="text-[11px] text-red-400">{t('profileAuth.passwordTooShort')}</div>
              )}
              {newPassword.length >= 8 && newPasswordRepeat.length > 0 && newPassword !== newPasswordRepeat && (
                <div className="text-[11px] text-red-400">{t('profileAuth.passwordsDontMatch')}</div>
              )}

              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="border-white/20"
                >
                  {t('common.back')}
                </Button>
                <Button
                  onClick={() => void handleRecover()}
                  disabled={!canRecover}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 gap-2"
                  data-testid="mobile-recover-submit"
                >
                  {isRecovering && (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  )}
                  {t('profileAuth.recoverButton')}
                </Button>
              </div>

              <p className="text-[11px] text-white/35 text-center leading-relaxed">
                {t('profileAuth.recoverRelinkHint')}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
