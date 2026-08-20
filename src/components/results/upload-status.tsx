'use client';

import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';

interface UploadStatusProps {
  onlineEnabled: boolean;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
  isVerified?: boolean;
}

export function UploadStatus({ onlineEnabled, uploadStatus, uploadMessage, isVerified }: UploadStatusProps) {
  const { t } = useTranslation();
  if (!onlineEnabled || uploadStatus === 'idle') return null;

  return (
    <Card className={`mb-8 ${
      uploadStatus === 'uploading' ? 'bg-blue-500/10 border-blue-500/30' :
      uploadStatus === 'success' ? 'bg-green-500/10 border-green-500/30' :
      'bg-red-500/10 border-red-500/30'
    }`}>
      <CardContent className="py-4 flex items-center justify-center gap-3">
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
      </CardContent>
    </Card>
  );
}
