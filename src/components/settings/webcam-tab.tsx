'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WebcamSettingsPanel, WebcamBackground } from '@/components/game/webcam-background';
import { WebcamBackgroundConfig } from '@/components/game/webcam-background';
import { InfoIcon, WebcamIcon } from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';

interface WebcamTabProps {
  webcamConfig: WebcamBackgroundConfig;
  updateWebcamConfig: (_updates: Partial<WebcamBackgroundConfig>) => void;
}

export function WebcamTab({
  webcamConfig,
  updateWebcamConfig,
}: WebcamTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* 1. Info Card — About Webcam Background */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-cyan-400" />
            {t('settingsWebcam.about')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-white/70">
            <p>
              <strong className="text-white">{t('settingsWebcam.purpose')}</strong> {t('settingsWebcam.purposeDesc')}
            </p>
            <p>
              <strong className="text-white">{t('settingsWebcam.sizeOptions')}</strong> {t('settingsWebcam.sizeOptionsDesc')}
            </p>
            <p>
              <strong className="text-white">{t('settingsWebcam.positionOptions')}</strong> {t('settingsWebcam.positionOptionsDesc')}
            </p>
            <p>
              <strong className="text-white">{t('settingsWebcam.mirrorMode')}</strong> {t('settingsWebcam.mirrorModeDesc')}
            </p>
            <p>
              <strong className="text-white">{t('settingsWebcam.filtersInfo')}</strong> {t('settingsWebcam.filtersInfoDesc')}
            </p>
            <p className="text-xs text-white/40 mt-4">
              {t('settingsWebcam.tip')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Webcam Background Settings */}
      <WebcamSettingsPanel
        config={webcamConfig}
        onConfigChange={updateWebcamConfig}
      />

      {/* 3. Webcam Preview Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('settingsWebcam.preview')}
          </CardTitle>
          <CardDescription>
            {t('settingsWebcam.previewDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10">
            <WebcamBackground
              config={webcamConfig}
              onConfigChange={updateWebcamConfig}
            />
            {!webcamConfig.enabled && (
              <div className="absolute inset-0 flex items-center justify-center text-white/40">
                <div className="text-center">
                  <WebcamIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('settingsWebcam.enableToPreview')}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
