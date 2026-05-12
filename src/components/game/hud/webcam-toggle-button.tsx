'use client';

import { Button } from '@/components/ui/button';
import {
  WebcamBackgroundConfig,
} from '@/components/game/webcam-background';
import { useTranslation } from '@/lib/i18n/translations';

interface WebcamToggleButtonProps {
  config: WebcamBackgroundConfig;
  onConfigChange: (_config: Partial<WebcamBackgroundConfig>) => void;
}

/**
 * Compact webcam toggle button for the in-game header.
 * Toggles webcam background on/off with a single click.
 * Opens to a small size when enabled.
 */
export function WebcamToggleButton({ config, onConfigChange }: WebcamToggleButtonProps) {
  const { t } = useTranslation();

  const toggle = () => {
    onConfigChange({
      enabled: !config.enabled,
      sizeMode: !config.enabled && config.sizeMode === 'fullscreen' ? '2:10' : config.sizeMode,
    });
  };

  return (
    <Button
      variant="ghost"
      onClick={toggle}
      className={`rounded-lg w-10 h-10 p-0 text-sm ${
        config.enabled
          ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
          : 'text-white/80 hover:text-white hover:bg-white/10'
      }`}
      title={config.enabled ? t('settingsWebcam.close') : t('webcamBackground.camera')}
    >
      📷
    </Button>
  );
}
