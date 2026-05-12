'use client';

import { Button } from '@/components/ui/button';
import {
  SettingsIcon, MusicIcon, MicIcon, PhoneIcon,
  WebcamIcon, FolderIcon, EditIcon, InfoIcon,
} from '@/components/settings/settings-icons';
import { useTranslation } from '@/lib/i18n/translations';

export type SettingsTab = 'general' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'editor' | 'viral' | 'about';

interface SettingsTabBarProps {
  activeTab: SettingsTab;
  onTabChange: (_tab: SettingsTab) => void;
  tx: (_key: string) => string;
}

export function SettingsTabBar({ activeTab, onTabChange, tx }: SettingsTabBarProps) {
  const { t } = useTranslation();
  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { id: 'general', label: tx('settings.tabGeneral'), icon: SettingsIcon, color: 'cyan' },
    { id: 'graphicsound', label: t('settingsTabs.graphicSound'), icon: MusicIcon, color: 'cyan' },
    { id: 'microphone', label: t('settingsTabs.microphone'), icon: MicIcon, color: 'cyan' },
    { id: 'mobile', label: t('settingsTabs.mobileCompanion'), icon: PhoneIcon, color: 'cyan' },
    { id: 'webcam', label: t('settingsTabs.webcam'), icon: WebcamIcon, color: 'cyan' },
    { id: 'library', label: tx('settings.tabLibrary'), icon: FolderIcon, color: 'cyan' },
    { id: 'editor', label: t('settingsTabs.editor'), icon: EditIcon, color: 'cyan' },
    { id: 'viral', label: t('settingsTabs.viralCharts'), icon: () => <span>&#128293;</span>, color: 'orange' },
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
        >
          <Icon className="w-4 h-4 mr-2" /> {label}
        </Button>
      ))}
    </div>
  );
}
