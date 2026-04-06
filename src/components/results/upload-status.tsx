'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface UploadStatusProps {
  onlineEnabled: boolean;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  uploadMessage: string;
}

export function UploadStatus({ onlineEnabled, uploadStatus, uploadMessage }: UploadStatusProps) {
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
            <span className="text-blue-400">Uploading to global leaderboard...</span>
          </>
        )}
        {uploadStatus === 'success' && (
          <span className="text-green-400">{uploadMessage}</span>
        )}
        {uploadStatus === 'error' && (
          <span className="text-red-400">⚠️ {uploadMessage}</span>
        )}
      </CardContent>
    </Card>
  );
}
