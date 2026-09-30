'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from '@/lib/i18n/translations';
import { PlayerProfile } from '@/types/game';
import { getLevelForXP, getRankForXP } from '@/lib/game/player-progression';
import { CountryFlagImage } from './country-picker';

interface PlayerProgressionCardProps {
  profile: PlayerProfile;
  onToggleActive?: () => void;
  /** Stable data-testid anchor for tours / E2E. */
  testId?: string;
}

export function PlayerProgressionCard({ profile, onToggleActive, testId }: PlayerProgressionCardProps) {
  const { t } = useTranslation();
  const profileXP = profile.xp || 0;
  const playerLevel = getLevelForXP(profileXP);
  const playerRank = getRankForXP(profileXP);
  const isActive = profile.isActive ?? true;
  // R41/P8: Lokalisiertes Aria-Label über bestehende Keys (keine neuen
  // i18n-Keys möglich) — dasselbe Muster wie im Companion-Mirror
  // (mirror-profile-lite): „{Name}: Aktiv/Inaktiv".
  const activeLabel = isActive ? t('playerProgression.active') : t('playerProgression.inactive');

  return (
    <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30" data-testid={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-4">
          <div className="relative" data-testid="profile-progression-avatar">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 border-purple-400"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name[0].toUpperCase()
              )}
            </div>
            {profile.country && (
              <div className="absolute -bottom-1 -right-1 flex items-center">
                <CountryFlagImage code={profile.country} className="h-4 w-6" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{playerRank?.icon || '🎵'}</span>
              <div>
                <div className="text-xl font-bold">{profile.name}</div>
                <div className="text-sm text-white/60">
                  {playerRank?.name || 'Beginner'} • Level {playerLevel?.level || 1} • {profileXP.toLocaleString()} XP
                </div>
              </div>
            </div>
          </div>
          {/* R41/P8: Status-Badge + kleiner Schalter — der Switch visualisiert,
              dass sich der Aktiv-Status hier anklicken/umschalten lässt
              (Nutzerwunsch: „Toggle-Symbol, damit ersichtlicher ist, dass man
              hier etwas ändern kann"). Tutorial (profiles.progression) nennt
              das Element passend bereits „Aktiv-Schalter". */}
          {onToggleActive && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <span
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                {activeLabel}
              </span>
              <Switch
                checked={isActive}
                onCheckedChange={onToggleActive}
                className="h-5 w-9 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-white/25"
                aria-label={`${profile.name}: ${activeLabel}`}
                data-testid="profile-active-toggle"
              />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* XP Progress Bar */}
        <div className="mb-4" data-testid="profile-xp-bar">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-white/60">{t('playerProgression.progressToNext')}</span>
            <span className="text-purple-400">{playerLevel?.progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${playerLevel?.progress || 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>{(playerLevel?.currentXP || 0).toLocaleString()} {t('playerProgression.xp')}</span>
            <span>{playerLevel?.nextLevelXP || 500} {t('playerProgression.xpNeeded')}</span>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="profile-stats-grid">
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{profile.gamesPlayed || 0}</div>
            <div className="text-xs text-white/60">{t('playerProgression.songsPlayed')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-yellow-400">{profile.stats?.goldenNotesHit || 0}</div>
            <div className="text-xs text-white/60">{t('playerProgression.goldenNotes')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-400">{profile.stats?.bestCombo || 0}</div>
            <div className="text-xs text-white/60">{t('playerProgression.bestCombo')}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{profile.totalScore?.toLocaleString() || 0}</div>
            <div className="text-xs text-white/60">{t('playerProgression.totalScore')}</div>
          </div>
        </div>
        
        {/* Achievements */}
        {profile.achievements && profile.achievements.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-white/60 mb-2">{t('playerProgression.achievementsTitle')} ({profile.achievements.length})</h4>
            <div className="flex flex-wrap gap-2">
              {profile.achievements.slice(0, 6).map((achievement) => (
                <Badge 
                  key={achievement.id}
                  className="bg-white/10 border border-white/20"
                >
                  {achievement.icon} {achievement.name}
                </Badge>
              ))}
              {profile.achievements.length > 6 && (
                <Badge className="bg-white/10">{t('playerProgression.more').replace('{n}', String(profile.achievements.length - 6))}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
