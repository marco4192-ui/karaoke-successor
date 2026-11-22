'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloudUploadIcon, CloudDownloadIcon } from '@/components/icons';
import { FileDownIcon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';
import { downloadTextFile, todayStamp } from '@/lib/download-text';
import { RecoveryCodeDialog } from '@/components/screens/character/recovery-code-dialog';
import type { MobileProfile } from '@/app/api/mobile/mobile-types';
import { EMAIL_RE, mobileProfileToPlayerProfile } from './mobile-profile-bridge';

interface MobileSyncCardProps {
  profile: MobileProfile;
  /** Persist an updated profile (localStorage + companion server sync). */
  onProfileUpdate: (_next: MobileProfile) => void;
}

/**
 * R93g: companion twin of the desktop ProfileSyncSection — the SAME profile
 * sync features, in a mobile card:
 *   • sync code display + save-as-file + loss warning
 *   • upload (re-register + backup snapshot)
 *   • download by sync code (merge into this phone's profile)
 *   • change password (linked account)
 *   • re-link account (forgot-password rescue via sync code)
 *   • delete all online data (GDPR)
 * Online-account fields (e-mail + password) use the same server endpoints
 * and the same validation as the desktop.
 */
export function MobileSyncCard({ profile, onProfileUpdate }: MobileSyncCardProps) {
  const { t } = useTranslation();
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // R71: save the sync code (the master key to this online identity) as a
  // text file — same offer as the desktop section.
  const handleSaveCodeFile = () => {
    if (!profile.syncCode) return;
    const content = [
      'AFTERTEN KARAOKE — SYNC-CODE',
      '=========================',
      '',
      `Code:    ${profile.syncCode}`,
      `Profile: ${profile.name}`,
      `Date:    ${todayStamp()}`,
      '',
      `⚠ ${t('profileSync.syncCodeWarning')}`,
      '',
    ].join('\n');
    downloadTextFile(`afterten-karaoke-sync-code-${profile.syncCode}.txt`, content);
  };

  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);

    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const playerProfile = mobileProfileToPlayerProfile(profile);

      // R67: the sync_code (ownership token) is GENERATED SERVER-SIDE at
      // registration — identical to the desktop flow.
      const registered = await leaderboardService.registerProfile(playerProfile);
      const code = registered.sync_code || profile.syncCode;
      if (!code) throw new Error(t('profileSync.uploadFailed'));
      if (code !== profile.syncCode) {
        onProfileUpdate({ ...profile, syncCode: code });
      }

      // Upload the backup snapshot. A companion has no local highscores of
      // its own — null keeps the server-side ones intact (same call as the
      // desktop's account registration).
      const result = await leaderboardService.uploadProfile(
        { ...playerProfile, syncCode: code },
        null,
      );

      if (result.success) {
        setMessage({ type: 'success', text: t('profileSync.uploadSuccess').replace('{n}', code) });
      } else {
        throw new Error(result.error || t('profileSync.uploadFailed'));
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Companion profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : t('profileSync.uploadFailed');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadProfile = async () => {
    // R72/A: sync codes are 12 chars for new profiles, 8 chars for legacy.
    if (!inputCode || (inputCode.length !== 8 && inputCode.length !== 12)) {
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
        // Merge the downloaded fields into this phone's profile — same
        // field set as the desktop download (identity + flair + linkage).
        // The profile ID stays the phone's own (unlike login adoption) so
        // an existing companion claim is not broken.
        onProfileUpdate({
          ...profile,
          name: synced.name,
          avatar: synced.avatar || profile.avatar,
          country: synced.country || undefined,
          color: synced.color,
          privacy: synced.privacy,
          syncCode: inputCode.toUpperCase(),
          syncUid: result.profile_uid,
        });
        setMessage({ type: 'success', text: t('profileSync.syncSuccess') });
        setInputCode('');
      } else {
        throw new Error(t('profileSync.profileNotFound'));
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Companion profile download error:', error);
      const errorMessage = error instanceof Error ? error.message : t('profileSync.downloadFailedMsg');
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * R67 (GDPR): delete everything the leaderboard server stores about this
   * profile. Requires the sync_code; the LOCAL profile stays intact.
   */
  const handleDeleteOnlineData = async () => {
    setIsDeleting(true);
    setMessage(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      await leaderboardService.deleteProfile(mobileProfileToPlayerProfile(profile));
      // Clear the local online linkage — the profile becomes local-only.
      onProfileUpdate({
        ...profile,
        syncCode: undefined,
        syncUid: undefined,
        authEmail: undefined,
      });
      setShowDeleteConfirm(false);
      setMessage({ type: 'success', text: t('profileSync.deleteOnlineSuccess') });
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Companion online data deletion error:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : t('profileSync.deleteOnlineFailed');
      setMessage({ type: 'error', text: `${t('profileSync.deleteOnlineFailed')}${errorMessage ? `: ${errorMessage}` : ''}` });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="mobile-sync-card">
      {profile.syncCode && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-white/50">{t('profileSync.syncCode')}</span>
            <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
              {profile.syncCode}
            </code>
            <button
              type="button"
              onClick={handleSaveCodeFile}
              aria-label={t('profileSync.saveCodeFile')}
              title={t('profileSync.saveCodeFile')}
              data-testid="mobile-sync-code-download"
              className="inline-flex items-center gap-1 rounded border border-cyan-500/30 px-1.5 py-0.5 text-[10px] text-cyan-400 transition-colors hover:bg-cyan-500/10"
            >
              <FileDownIcon className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-amber-300/60">
            ⚠️ {t('profileSync.syncCodeWarning')}
          </p>
        </div>
      )}

      {profile.authEmail && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-white/50">🔐 {t('profileAuth.hasAccount')}</span>
          <span className="px-2 py-0.5 bg-purple-500/15 text-purple-300 rounded truncate max-w-[180px]" title={profile.authEmail}>
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
          className="h-8 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          data-testid="mobile-sync-upload"
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
            id="mobile-sync-code"
            name="mobile-sync-code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder={t('profileSync.syncCodePlaceholder')}
            maxLength={12}
            autoCapitalize="characters"
            className="h-8 w-28 text-xs bg-white/5 border-white/10"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadProfile}
            disabled={isDownloading || (inputCode.length !== 8 && inputCode.length !== 12)}
            className="h-8 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            data-testid="mobile-sync-download"
            aria-label={t('profileSync.syncCodePlaceholder')}
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

      {/* ── R67 (GDPR): delete all online data of this profile ── */}
      {profile.syncCode && (
        <div className="pt-2 border-t border-white/5">
          {!showDeleteConfirm ? (
            <div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                data-testid="mobile-delete-online-data-btn"
                className="text-[11px] text-red-300/80 hover:text-red-200 transition-colors underline underline-offset-2"
              >
                🗑️ {t('profileSync.deleteOnline')}
              </button>
              <p className="mt-1 text-[10px] leading-relaxed text-white/35">
                {t('profileSync.deleteOnlineHint')}
              </p>
            </div>
          ) : (
            <div
              className="rounded-lg border border-red-500/25 bg-red-500/5 p-2.5"
              role="alertdialog"
              aria-label={t('profileSync.deleteOnlineConfirmTitle')}
              data-testid="mobile-delete-online-confirm"
            >
              <p className="text-xs font-medium text-red-300">{t('profileSync.deleteOnlineConfirmTitle')}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                {t('profileSync.deleteOnlineConfirmText')}
              </p>
              <div className="mt-2.5 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void handleDeleteOnlineData()}
                  disabled={isDeleting}
                  className="h-7 text-xs bg-red-600 hover:bg-red-500"
                  data-testid="mobile-delete-online-confirm-btn"
                >
                  {isDeleting && <div className="w-3 h-3 border border-white/70 border-t-transparent rounded-full animate-spin mr-1" />}
                  {t('profileSync.deleteOnlineConfirm')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {profile.authEmail && (
        <MobileAccountPasswordSection profile={profile} onProfileUpdate={onProfileUpdate} />
      )}
    </div>
  );
}

/** Change-password UI for companion profiles linked to an online account,
 *  plus the R69 account-relink rescue — same behaviour as the desktop. */
function MobileAccountPasswordSection({
  profile,
  onProfileUpdate,
}: {
  profile: MobileProfile;
  onProfileUpdate: (_next: MobileProfile) => void;
}) {
  const { t } = useTranslation();
  // Parent renders this section only when authEmail is set — the fallback
  // keeps the type non-asserted (lint: no-non-null-assertion).
  const email = profile.authEmail || '';
  const [open, setOpen] = useState(false);
  const [relinkOpen, setRelinkOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwRepeat, setNewPwRepeat] = useState('');
  // Relink form (R69): new e-mail + new password, authorized by sync_code
  const [relinkEmail, setRelinkEmail] = useState('');
  const [relinkPw, setRelinkPw] = useState('');
  const [relinkPwRepeat, setRelinkPwRepeat] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRelinking, setIsRelinking] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  /** R69: recovery code issued by a relink — shown once. */
  const [relinkRecoveryCode, setRelinkRecoveryCode] = useState<string | null>(null);

  const valid = currentPw.length > 0 && newPw.length >= 8 && newPw === newPwRepeat;
  const relinkEmailValid = EMAIL_RE.test(relinkEmail.trim());
  const relinkValid = relinkEmailValid && relinkPw.length >= 8 && relinkPw === relinkPwRepeat && !!profile.syncCode;

  const handleChangePassword = async () => {
    if (!valid || isSaving || !email) return;
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

  /**
   * R69: account relink — the forgot-password rescue. registerAccount with
   * the profile's sync_code REPLACES the linked account server-side.
   */
  const handleRelink = async () => {
    if (!relinkValid || isRelinking) return;
    setIsRelinking(true);
    setMsg(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const result = await leaderboardService.registerAccount({
        profile: mobileProfileToPlayerProfile(profile),
        email: relinkEmail.trim().toLowerCase(),
        password: relinkPw,
      });
      if (result.ok) {
        // Persist the new e-mail on the profile (the old one is gone).
        onProfileUpdate({
          ...profile,
          authEmail: relinkEmail.trim().toLowerCase(),
          ...(result.sync_code ? { syncCode: result.sync_code } : {}),
        });
        setRelinkEmail('');
        setRelinkPw('');
        setRelinkPwRepeat('');
        if (result.recovery_code) {
          setRelinkRecoveryCode(result.recovery_code);
        } else {
          setMsg({ type: 'success', text: t('profileAuth.relinkSuccess') });
          setRelinkOpen(false);
        }
      } else {
        const reason = /already registered/i.test(result.error || '')
          ? t('profileAuth.emailTaken')
          : t('profileAuth.relinkFailed');
        setMsg({ type: 'error', text: reason });
      }
    } catch {
      setMsg({ type: 'error', text: t('profileAuth.relinkFailed') });
    } finally {
      setIsRelinking(false);
    }
  };

  if (relinkRecoveryCode) {
    return (
      <RecoveryCodeDialog
        code={relinkRecoveryCode}
        open
        onOpenChange={() => {
          setRelinkRecoveryCode(null);
          setRelinkOpen(false);
          setMsg({ type: 'success', text: t('profileAuth.relinkSuccess') });
        }}
      />
    );
  }

  return (
    <div className="pt-1 space-y-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] text-purple-300/80 hover:text-purple-200 transition-colors underline underline-offset-2"
      >
        🔑 {t('profileAuth.changePassword')}
      </button>

      {/* R69: forgot-password rescue via sync code */}
      {!relinkOpen && profile.syncCode && (
        <button
          type="button"
          onClick={() => setRelinkOpen(true)}
          data-testid="mobile-relink-account-btn"
          className="block text-[11px] text-amber-300/70 hover:text-amber-200 transition-colors underline underline-offset-2"
        >
          {t('profileAuth.forgotPassword')}
        </button>
      )}

      {relinkOpen && (
        <div
          className="mt-2 space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5"
          data-testid="mobile-relink-form"
        >
          <p className="text-[11px] font-medium text-amber-300">{t('profileAuth.relinkTitle')}</p>
          <p className="text-[10px] leading-relaxed text-white/50">
            {t('profileAuth.relinkHint')}
          </p>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('profileAuth.newEmail')}
            value={relinkEmail}
            onChange={(e) => setRelinkEmail(e.target.value)}
            aria-label={t('profileAuth.newEmail')}
            className="h-8 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.newPassword')}
            value={relinkPw}
            onChange={(e) => setRelinkPw(e.target.value)}
            aria-label={t('profileAuth.newPassword')}
            className="h-8 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.passwordRepeat')}
            value={relinkPwRepeat}
            onChange={(e) => setRelinkPwRepeat(e.target.value)}
            aria-label={t('profileAuth.passwordRepeat')}
            className="h-8 text-xs bg-white/5 border-white/10"
          />
          {relinkPw.length > 0 && relinkPw.length < 8 && (
            <div className="text-[11px] text-red-400">{t('profileAuth.passwordTooShort')}</div>
          )}
          {relinkPw.length >= 8 && relinkPwRepeat.length > 0 && relinkPw !== relinkPwRepeat && (
            <div className="text-[11px] text-red-400">{t('profileAuth.passwordsDontMatch')}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRelinkOpen(false)}
              disabled={isRelinking}
              className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10"
            >
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={() => void handleRelink()}
              disabled={!relinkValid || isRelinking}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500"
              data-testid="mobile-relink-submit"
            >
              {isRelinking && <div className="w-3 h-3 border border-white/70 border-t-transparent rounded-full animate-spin mr-1" />}
              {t('profileAuth.relinkButton')}
            </Button>
          </div>
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-2.5">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t('profileAuth.currentPassword')}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            aria-label={t('profileAuth.currentPassword')}
            className="h-8 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.newPassword')}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            aria-label={t('profileAuth.newPassword')}
            className="h-8 text-xs bg-white/5 border-white/10"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.passwordRepeat')}
            value={newPwRepeat}
            onChange={(e) => setNewPwRepeat(e.target.value)}
            aria-label={t('profileAuth.passwordRepeat')}
            className="h-8 text-xs bg-white/5 border-white/10"
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
              data-testid="mobile-change-password-submit"
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

      {msg && !open && (
        <div className={`text-[11px] p-2 rounded ${
          msg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
