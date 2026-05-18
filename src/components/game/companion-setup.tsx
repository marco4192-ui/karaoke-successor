'use client';

/**
 * Companion Sing-A-Long — Setup Screen
 *
 * Player selection, difficulty, and game explanation.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayerProfile, PLAYER_COLORS, Difficulty, EMPTY_PLAYER_SCORE } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';
import type { CompanionPlayer, CompanionSingAlongSettings } from './companion-types';
import { DEFAULT_SETTINGS } from './companion-types';

// ===================== SETUP SCREEN =====================

export interface CompanionSingAlongSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (_players: CompanionPlayer[], _settings: CompanionSingAlongSettings) => void;
  onBack: () => void;
}

export function CompanionSingAlongSetupScreen({ profiles, onSelectSong, onBack }: CompanionSingAlongSetupProps) {
  const { t } = useTranslation();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activeProfiles = useMemo(() =>
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 8) { setError(t('companion.errorMaxPlayers')); return prev; }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleSelectSong = () => {
    if (selectedPlayers.length < 2) { setError(t('companion.errorMinPlayers')); return; }
    setError(null);

    const _players: CompanionPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id, name: profile?.name || 'Unknown', avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        ...EMPTY_PLAYER_SCORE, turnCount: 0,
      };
    });

    onSelectSong(_players, { ...DEFAULT_SETTINGS, difficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">{t('companion.back')}</Button>
        <div>
          <h1 className="text-3xl font-bold">{t('companion.title')}</h1>
          <p className="text-white/60">{t('companion.subtitle')}</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-emerald-400">{t('companion.howItWorks')}</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>{t('companion.howItWorks1')}</li>
            <li>{t('companion.howItWorks2')}</li>
            <li>{t('companion.howItWorks3')}</li>
            <li>{t('companion.howItWorks4')}</li>
            <li>{t('companion.howItWorks5')}</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">{error}</div>
      )}

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>{t('companion.gameSettings')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-2 block">{t('companion.difficulty')}</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(diff => (
                <Button key={diff} variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setDifficulty(diff)}
                  className={difficulty === diff ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-white/20'}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader><CardTitle>{t('companion.selectPlayers').replace('{n}', String(selectedPlayers.length))}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div key={profile.id} onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${isSelected
                    ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}>{profile.name.charAt(0).toUpperCase()}</div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-emerald-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">{t('companion.noActiveProfiles')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{t('companion.readyToPlay')}</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} {t('companion.playersSelected')}</p>
              <p className="text-xs text-white/40 mt-1">{t('companion.turnDuration')}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">{t('companion.playersSelected')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSelectSong} disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400">
        {t('companion.selectSong').replace('{n}', String(selectedPlayers.length))}
      </Button>
    </div>
  );
}
