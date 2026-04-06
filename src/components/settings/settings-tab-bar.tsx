'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  SettingsIcon, MusicIcon, MicIcon, PhoneIcon,
  WebcamIcon, FolderIcon, EditIcon, SparkleIcon, InfoIcon,
} from '@/components/settings/settings-icons';

export type SettingsTab = 'general' | 'graphicsound' | 'microphone' | 'mobile' | 'webcam' | 'library' | 'editor' | 'assets' | 'about';

interface SettingsTabBarProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  tx: (key: string) => string;
}

export function SettingsTabBar({ activeTab, onTabChange, tx }: SettingsTabBarProps) {
  const isEditor = activeTab === 'editor';

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }>; color: string }[] = [
    { id: 'general', label: tx('settings.tabGeneral'), icon: SettingsIcon, color: 'cyan' },
    { id: 'graphicsound', label: 'Graphic / Sound', icon: MusicIcon, color: 'cyan' },
    { id: 'microphone', label: 'Microphone', icon: MicIcon, color: 'cyan' },
    { id: 'mobile', label: 'Mobile Companion', icon: PhoneIcon, color: 'cyan' },
    { id: 'webcam', label: 'Webcam', icon: WebcamIcon, color: 'cyan' },
    { id: 'library', label: tx('settings.tabLibrary'), icon: FolderIcon, color: 'cyan' },
    { id: 'editor', label: 'Editor', icon: EditIcon, color: 'cyan' },
    { id: 'assets', label: 'AI Asset', icon: SparkleIcon, color: 'purple' },
    { id: 'about', label: tx('settings.tabAbout'), icon: InfoIcon, color: 'cyan' },
  ];

  return (
    <div className={isEditor ? 'flex flex-wrap gap-2 mb-2 px-4 pt-4' : 'flex flex-wrap gap-2 mb-6'}>
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
