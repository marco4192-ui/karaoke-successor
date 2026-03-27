'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  MusicIcon,
  LibraryIcon,
  PartyIcon,
  QueueIcon,
  UserIcon,
  StarIcon,
  TrophyIcon,
  SettingsIcon,
} from '@/components/icons';

export type Screen = 'home' | 'library' | 'game' | 'party' | 'character' | 'queue' | 'mobile' | 'results' | 'highscores' | 'import' | 'settings' | 'jukebox' | 'achievements' | 'dailyChallenge' | 'tournament' | 'tournament-game' | 'battle-royale' | 'battle-royale-game' | 'pass-the-mic' | 'pass-the-mic-game' | 'companion-singalong' | 'companion-singalong-game' | 'medley' | 'medley-game' | 'editor' | 'online' | 'party-setup' | 'song-voting';

export interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  queueLength: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/**
 * Navigation component
 * Contains the main navigation bar with logo, nav buttons, and fullscreen toggle.
 */
export function Navigation({
  currentScreen,
  onNavigate,
  queueLength,
  isFullscreen,
  onToggleFullscreen,
}: NavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => onNavigate('home')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
            <MusicIcon className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Karaoke Successor
          </span>
        </button>
        
        <div className="flex items-center gap-2">
          <NavButton active={currentScreen === 'library'} onClick={() => onNavigate('library')}>
            <LibraryIcon className="w-5 h-5" /> Library
          </NavButton>
          <NavButton active={currentScreen === 'party'} onClick={() => onNavigate('party')}>
            <PartyIcon className="w-5 h-5" /> Party
          </NavButton>
          <NavButton active={currentScreen === 'dailyChallenge'} onClick={() => onNavigate('dailyChallenge')}>
            <StarIcon className="w-5 h-5" /> Challenges
          </NavButton>
          <NavButton active={currentScreen === 'queue'} onClick={() => onNavigate('queue')}>
            <QueueIcon className="w-5 h-5" /> Queue
            {queueLength > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{queueLength}</Badge>
            )}
          </NavButton>
          <NavButton active={currentScreen === 'character'} onClick={() => onNavigate('character')}>
            <UserIcon className="w-5 h-5" /> Characters
          </NavButton>
          <NavButton active={currentScreen === 'highscores'} onClick={() => onNavigate('highscores')}>
            <TrophyIcon className="w-5 h-5" /> Highscores
          </NavButton>
          <NavButton active={currentScreen === 'achievements'} onClick={() => onNavigate('achievements')}>
            <TrophyIcon className="w-5 h-5" /> Achievements
          </NavButton>
          <NavButton active={currentScreen === 'jukebox'} onClick={() => onNavigate('jukebox')}>
            <MusicIcon className="w-5 h-5" /> Jukebox
          </NavButton>
          <NavButton active={currentScreen === 'settings'} onClick={() => onNavigate('settings')}>
            <SettingsIcon className="w-5 h-5" /> Settings
          </NavButton>
          {/* Fullscreen Toggle Button */}
          <button
            onClick={onToggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-white/70 hover:text-white hover:bg-white/10"
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Toggle Fullscreen (F11)"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ===================== NAV BUTTON =====================
export function NavButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-white/20 text-white' 
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
