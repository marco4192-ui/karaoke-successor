'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface UploadStatusProps {
  onlineEnabled: boolean;
  uploadStatus: 'idle' | 'consent' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  isVerified?: boolean;
  /** R42: slim inline banner for the one-screen results layout */
  compact?: boolean;
  /** R67: consent callbacks for the first-upload data notice */
  onAcceptConsent?: () => void;
  onDeclineConsent?: () => void;
}

/**
 * R42 — upload status as a slim inline banner (was a full-width card that
 * pushed the whole results screen down). compact=true renders a single
 * centered line with icon + text.
 *
 * R67 — uploadStatus 'consent' renders the first-upload data notice instead
 * of a status line: what is stored (name, color, optional country, scores),
 * with "agree & upload" / "don't upload" actions.
 */
export function UploadStatus({ onlineEnabled, uploadStatus, uploadMessage, isVerified, compact, onAcceptConsent, onDeclineConsent }: UploadStatusProps) {
  const { t } = useTranslation();
  if (!onlineEnabled || uploadStatus === 'idle') return null;

  // ── R67: first-upload consent notice ──────────────────────
  if (uploadStatus === 'consent') {
    return (
      <div
        className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 px-4 py-3"
        role="dialog"
        aria-label={t('uploadStatus.consentTitle')}
        data-testid="leaderboard-consent-card"
      >
        <div className="flex items-start gap-2.5">
          <span className="text-base leading-5" aria-hidden>ℹ️</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-cyan-200">{t('uploadStatus.consentTitle')}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">{t('uploadStatus.consentText')}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAcceptConsent}
                data-testid="leaderboard-consent-accept"
                className="h-8 rounded-lg bg-cyan-500 px-3 text-xs font-medium text-black transition-colors hover:bg-cyan-400"
              >
                {t('uploadStatus.consentAccept')}
              </button>
              <button
                type="button"
                onClick={onDeclineConsent}
                data-testid="leaderboard-consent-decline"
                className="h-8 rounded-lg border border-white/15 px-3 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                {t('uploadStatus.consentDecline')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tint =
    uploadStatus === 'uploading' ? 'text-blue-300 bg-blue-500/10 border-blue-500/25'
    : uploadStatus === 'success' ? 'text-green-300 bg-green-500/10 border-green-500/25'
    : 'text-red-300 bg-red-500/10 border-red-500/25';

  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-2 rounded-full border px-4 py-1.5 text-xs ${tint}`} role="status">
        {uploadStatus === 'uploading' && (
          <div className="animate-spin w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" aria-hidden />
        )}
        {uploadStatus === 'success' && (
          <>
            <span>{uploadMessage}</span>
            {isVerified !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                  isVerified
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                }`}
                title={isVerified ? t('uploadStatus.verifiedDesc') : t('uploadStatus.unverifiedDesc')}
              >
                {isVerified ? `✓ ${t('uploadStatus.verified')}` : `? ${t('uploadStatus.unverified')}`}
              </span>
            )}
          </>
        )}
        {uploadStatus === 'uploading' && <span>{t('uploadStatus.uploading')}</span>}
        {uploadStatus === 'error' && <span>⚠️ {uploadMessage}</span>}
      </div>
    );
  }

  return (
    <div className={`mb-4 rounded-xl border ${tint}`}>
      <div className="py-3 flex items-center justify-center gap-3">
        {uploadStatus === 'uploading' && (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="text-blue-400">{t('uploadStatus.uploading')}</span>
          </>
        )}
        {uploadStatus === 'success' && (
          <div className="flex items-center gap-2">
            <span className="text-green-400">{uploadMessage}</span>
            {isVerified !== undefined && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                isVerified
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              }`} title={isVerified ? t('uploadStatus.verifiedDesc') : t('uploadStatus.unverifiedDesc')}>
                {isVerified ? `✓ ${t('uploadStatus.verified')}` : `? ${t('uploadStatus.unverified')}`}
              </span>
            )}
          </div>
        )}
        {uploadStatus === 'error' && (
          <span className="text-red-400">⚠️ {uploadMessage}</span>
        )}
      </div>
    </div>
  );
}
