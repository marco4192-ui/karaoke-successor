'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropZone } from './drop-zone';
import { useTranslation } from '@/lib/i18n/translations';

interface UltrastarTabProps {
  title: string;
  setTitle: (_t: string) => void;
  artist: string;
  setArtist: (_a: string) => void;
  useVideoAudio: boolean;
  setUseVideoAudio: (_v: boolean) => void;
  audioFile: File | null;
  videoFile: File | null;
  ultrastarFile: File | null;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  ultrastarInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (_e: React.DragEvent, type: 'audio' | 'video' | 'ultrastar') => void;
  handleFileSelect: (type: 'audio' | 'video' | 'ultrastar', _file: File) => void;
}

export function UltrastarTab({
  title, setTitle, artist, setArtist, useVideoAudio, setUseVideoAudio,
  audioFile, videoFile, ultrastarFile,
  audioInputRef, videoInputRef, ultrastarInputRef,
  handleDrop, handleFileSelect,
}: UltrastarTabProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{t('importUltrastar.fileTitle')}</CardTitle>
          <CardDescription>{t('importUltrastar.fileDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={ultrastarFile}
            accept=".txt"
            inputRef={ultrastarInputRef}
            icon="📄"
            label={t('importUltrastar.fileLabel')}
            description={t('importUltrastar.fileHint')}
            onDrop={(e) => handleDrop(e, 'ultrastar')}
            onFileChange={(f) => handleFileSelect('ultrastar', f)}
            tauriFilter={{ name: 'UltraStar TXT', extensions: ['txt'] }}
            tauriPickerTitle={t('importUltrastar.pickerTitle')}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{t('importUltrastar.audioTitle')}</CardTitle>
          <CardDescription>{t('importUltrastar.audioDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={audioFile}
            accept="audio/*,.mp3,.ogg,.wav,.m4a"
            inputRef={audioInputRef}
            icon="🎵"
            label={t('importUltrastar.audioLabel')}
            onDrop={(e) => handleDrop(e, 'audio')}
            onFileChange={(f) => handleFileSelect('audio', f)}
            tauriFilter={{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'm4a', 'flac', 'aac', 'wma', 'opus'] }}
            tauriPickerTitle={t('importUltrastar.audioPicker')}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{t('importUltrastar.videoTitle')}</CardTitle>
          <CardDescription>{t('importUltrastar.videoDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={videoFile}
            accept="video/*,.mp4,.webm,.mkv,.avi"
            inputRef={videoInputRef}
            icon="🎬"
            label={t('importUltrastar.videoLabel')}
            accentColor="purple"
            extra={
              !audioFile ? (
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useVideoAudio}
                    onChange={(e) => setUseVideoAudio(e.target.checked)}
                    className="rounded"
                  />
                  {t('importUltrastar.useVideoAudio')}
                </label>
              ) : undefined
            }
            onDrop={(e) => handleDrop(e, 'video')}
            onFileChange={(f) => handleFileSelect('video', f)}
            tauriFilter={{ name: 'Video', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv'] }}
            tauriPickerTitle={t('importUltrastar.videoPicker')}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{t('importUltrastar.songInfo')}</CardTitle>
          <CardDescription>{t('importUltrastar.songInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">{t('importUltrastar.titleLabel')}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('importUltrastar.titlePlaceholder')}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">{t('importUltrastar.artistLabel')}</label>
            <Input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder={t('importUltrastar.artistPlaceholder')}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
