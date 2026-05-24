'use client';

import { Button } from '@/components/ui/button';
import {
  SettingsIcon, MusicIcon, MicIcon, PhoneIcon,
  WebcamIcon, FolderIcon, InfoIcon, GamepadIcon,
} from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';

export type SettingsTab = 'general' | 'gameplay' | 'appearance' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'viral' | 'about';

interface SettingsTabBarProps {
  activeTab: SettingsTab;
  onTabChange: (_tab: SettingsTab) => void;
  tx: (_key: string) => string;
}

export function SettingsTabBar({ activeTab, onTabChange, tx }: SettingsTabBarProps) {
  const { t } = useTranslation();
  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { id: 'general', label: tx('settings.tabGeneral'), icon: SettingsIcon, color: 'cyan' },
    { id: 'gameplay', label: t('settingsTabs.gameplay'), icon: GamepadIcon, color: 'green' },
    { id: 'appearance', label: t('settingsTabs.appearance'), icon: () => <span>🎨</span>, color: 'purple' },
    { id: 'graphicsound', label: t('settingsTabs.graphicSound'), icon: MusicIcon, color: 'cyan' },
    { id: 'microphone', label: t('settingsTabs.microphone'), icon: MicIcon, color: 'cyan' },
    { id: 'mobile', label: t('settingsTabs.mobileCompanion'), icon: PhoneIcon, color: 'cyan' },
    { id: 'webcam', label: t('settingsTabs.webcam'), icon: WebcamIcon, color: 'cyan' },
    { id: 'library', label: tx('settings.tabLibrary'), icon: FolderIcon, color: 'cyan' },
    { id: 'about', label: tx('settings.tabAbout'), icon: InfoIcon, color: 'cyan' },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map(({ id, label, icon: Icon, color }) => (
        <Button
          key={id}
          variant={activeTab === id ? 'default' : 'outline'}
          onClick={() => onTabChange(id)}
          className={activeTab === id
            ? `bg-${color}-500 text-white`
            : 'border-white/20 theme-adaptive-text'
          }
          data-testid={`settings-tab-${id}`}
        >
          <Icon className="w-4 h-4 mr-2" /> {label}
        </Button>
      ))}
    </div>
  );
}
