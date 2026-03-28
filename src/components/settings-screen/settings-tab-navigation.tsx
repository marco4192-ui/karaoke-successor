'use client';

import { Button } from '@/components/ui/button';
import {
  MusicIcon,
  MicIcon,
  PhoneIcon,
  SettingsIcon,
  SparkleIcon,
  EditIcon,
  WebcamIcon,
  FolderIcon,
  DatabaseIcon,
  InfoIcon,
} from '@/components/icons';
import { SettingsTab } from './use-settings-screen';

interface SettingsTabNavigationProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  tx: (key: string) => string;
  isEditorMode?: boolean;
}

export function SettingsTabNavigation({ activeTab, onTabChange, tx, isEditorMode = false }: SettingsTabNavigationProps) {
  const containerClass = isEditorMode 
    ? 'flex flex-wrap gap-2 mb-2 px-4 pt-4' 
    : 'flex flex-wrap gap-2 mb-6';

  return (
    <div className={containerClass}>
      <Button
        variant={activeTab === 'general' ? 'default' : 'outline'}
        onClick={() => onTabChange('general')}
        className={activeTab === 'general' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <SettingsIcon className="w-4 h-4 mr-2" /> {tx('settings.tabGeneral')}
      </Button>
      <Button
        variant={activeTab === 'graphicsound' ? 'default' : 'outline'}
        onClick={() => onTabChange('graphicsound')}
        className={activeTab === 'graphicsound' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <MusicIcon className="w-4 h-4 mr-2" /> Graphic / Sound
      </Button>
      <Button
        variant={activeTab === 'microphone' ? 'default' : 'outline'}
        onClick={() => onTabChange('microphone')}
        className={activeTab === 'microphone' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <MicIcon className="w-4 h-4 mr-2" /> Microphone
      </Button>
      <Button
        variant={activeTab === 'mobile' ? 'default' : 'outline'}
        onClick={() => onTabChange('mobile')}
        className={activeTab === 'mobile' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <PhoneIcon className="w-4 h-4 mr-2" /> Mobile Companion
      </Button>
      <Button
        variant={activeTab === 'webcam' ? 'default' : 'outline'}
        onClick={() => onTabChange('webcam')}
        className={activeTab === 'webcam' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <WebcamIcon className="w-4 h-4 mr-2" /> Webcam
      </Button>
      <Button
        variant={activeTab === 'library' ? 'default' : 'outline'}
        onClick={() => onTabChange('library')}
        className={activeTab === 'library' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <FolderIcon className="w-4 h-4 mr-2" /> {tx('settings.tabLibrary')}
      </Button>
      <Button
        variant={activeTab === 'editor' ? 'default' : 'outline'}
        onClick={() => onTabChange('editor')}
        className={activeTab === 'editor' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <EditIcon className="w-4 h-4 mr-2" /> Editor
      </Button>
      <Button
        variant={activeTab === 'assets' ? 'default' : 'outline'}
        onClick={() => onTabChange('assets')}
        className={activeTab === 'assets' ? 'bg-purple-500 text-white' : 'border-white/20 text-white'}
      >
        <SparkleIcon className="w-4 h-4 mr-2" /> AI Asset
      </Button>
      <Button
        variant={activeTab === 'data' ? 'default' : 'outline'}
        onClick={() => onTabChange('data')}
        className={activeTab === 'data' ? 'bg-emerald-500 text-white' : 'border-white/20 text-white'}
      >
        <DatabaseIcon className="w-4 h-4 mr-2" /> Data
      </Button>
      <Button
        variant={activeTab === 'about' ? 'default' : 'outline'}
        onClick={() => onTabChange('about')}
        className={activeTab === 'about' ? 'bg-cyan-500 text-white' : 'border-white/20 text-white'}
      >
        <InfoIcon className="w-4 h-4 mr-2" /> {tx('settings.tabAbout')}
      </Button>
    </div>
  );
}
