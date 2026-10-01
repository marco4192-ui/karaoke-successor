'use client';

import { useTranslation } from '@/lib/i18n/translations';

interface UploadStatusProps {
  onlineEnabled: boolean;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  isVerified?: boolean;
  /** R42: slim inline banner for the one-screen results layout */
  compact?: boolean;
}

/**
 * R42 — upload status as a slim inline banner (was a full-width card that
 * pushed the whole results screen down). compact=true renders a single
 * centered line with icon + text.
 */
export function UploadStatus({ onlineEnabled, uploadStatus, uploadMessage, isVerified, compact }: UploadStatusProps) {
  const { t } = useTranslation();
  if (!onlineEnabled || uploadStatus === 'idle') return null;

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
