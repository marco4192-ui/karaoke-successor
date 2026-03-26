/**
 * General Settings Tab
 * Language, game settings, keyboard shortcuts
 */
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Difficulty } from '@/types/game';
import { useTranslation, LANGUAGE_NAMES, LANGUAGE_FLAGS, Language } from '@/lib/i18n/translations';

// Icons
function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function KeyboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M8 16h8" />
    </svg>
  );
}

interface GeneralSettingsTabProps {
  defaultDifficulty: Difficulty;
  showPitchGuide: boolean;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onPitchGuideToggle: (enabled: boolean) => void;
  onLanguageChange: (language: Language) => void;
}

export function GeneralSettingsTab({
  defaultDifficulty,
  showPitchGuide,
  onDifficultyChange,
  onPitchGuideToggle,
  onLanguageChange,
}: GeneralSettingsTabProps) {
  const { t, language } = useTranslation();
  
  // Helper to access nested translations with fallback
  const tx = (key: string): string => {
    // Use translation function directly for simple keys
    const result = t(key);
    return result;
  };
  
  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LanguageIcon className="w-5 h-5 text-cyan-400" />
            {tx('settings.language')}
          </CardTitle>
          <CardDescription>{tx('settings.languageDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="w-full bg-gray-800 border border-white/20 rounded-lg px-4 py-3 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
          >
            {Object.entries(LANGUAGE_FLAGS).map(([code, flag]) => (
              <option key={code} value={code} className="bg-gray-800 text-white">
                {flag} {LANGUAGE_NAMES[code as Language] || code}
              </option>
            ))}
          </select>
          <p className="text-xs text-white/40 mt-2">
            {tx('settings.languageNote')}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{tx('settings.gameSettings')}</CardTitle>
          <CardDescription>{tx('settings.gameSettingsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Difficulty */}
          <div className="space-y-3">
            <label className="text-sm font-medium">{tx('settings.defaultDifficulty')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => onDifficultyChange(diff)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all capitalize cursor-pointer ${
                    defaultDifficulty === diff
                      ? diff === 'easy' ? 'border-green-500 bg-green-500/20 text-green-400' 
                        : diff === 'medium' ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                        : 'border-red-500 bg-red-500/20 text-red-400'
                      : 'border-white/10 bg-white/5 hover:border-white/30 text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-xs text-white/40">{tx('settings.defaultDifficultyDesc')}</p>
          </div>
          
          {/* Show Pitch Guide Toggle */}
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <h4 className="font-medium">{tx('settings.showPitchGuide')}</h4>
              <p className="text-sm text-white/60">{tx('settings.showPitchGuideDesc')}</p>
            </div>
            <button
              type="button"
              onClick={() => onPitchGuideToggle(!showPitchGuide)}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                showPitchGuide ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                showPitchGuide ? 'left-8' : 'left-1'
              }`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyboardIcon className="w-5 h-5 text-yellow-400" />
            {tx('settings.keyboardShortcuts')}
          </CardTitle>
          <CardDescription>{tx('settings.keyboardShortcutsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.searchShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">/</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.fullscreenShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">F</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.libraryShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">L</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.settingsShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+,</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.closeShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Esc</kbd>
            </div>
            <div className="flex items-center justify-between p-2 bg-white/5 rounded">
              <span className="text-white/60">{tx('settings.searchAltShortcut')}</span>
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+K</kbd>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default GeneralSettingsTab;
