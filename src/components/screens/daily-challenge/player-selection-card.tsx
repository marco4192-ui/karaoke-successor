'use client';

// Daily Challenge Screen — STEP 1 · player selection card
//
// The guided flow starts here. Without a player everything below stays hidden.
// The FIRST selected player also owns the statistics section at the bottom
// (no duplicate selection).

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface PlayerSelectionCardProps {
  data: DailyChallengeScreenData;
}

export function PlayerSelectionCard({ data }: PlayerSelectionCardProps) {
  const { t } = useTranslation();
  const { activeProfiles, selectedPlayerIds, hasPlayer, togglePlayer } = data;

  return (
    <Card
      className={`bg-white/5 mb-6 transition-all ${hasPlayer ? 'border-green-500/25' : 'border-cyan-500/40 shadow-[0_0_36px_rgba(34,211,238,0.07)]'}`}
      data-testid="daily-player-selection"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <span
            className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold border shrink-0 ${
              hasPlayer
                ? 'bg-green-500/20 border-green-500 text-green-300'
                : 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
            }`}
            aria-hidden
          >
            {hasPlayer ? '✓' : '1'}
          </span>
          {t('dailyChallengeScreen.stepPlayers')}
        </CardTitle>
        <CardDescription>{t('dailyChallengeScreen.stepPlayersDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {activeProfiles.length === 0 ? (
          <p className="text-sm text-white/50 py-2">{t('dailyChallengeScreen.noActiveProfiles')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {activeProfiles.map((profile) => {
              const isSelected = selectedPlayerIds.includes(profile.id);
              const slot = selectedPlayerIds.indexOf(profile.id);
              return (
                <button
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  aria-pressed={isSelected}
                  className={`group relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                      : 'border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/10'
                  }`}
                >
                  <span className="relative">
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold overflow-hidden"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        profile.name?.[0] || '?'
                      )}
                    </span>
                    {isSelected && (
                      <span
                        className="absolute -bottom-1 -right-1 px-1 py-0 rounded-full text-[8px] font-black bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                        aria-label={slot === 0 ? 'P1' : 'P2'}
                      >
                        {slot === 0 ? 'P1' : 'P2'}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium text-white/90 truncate max-w-full">{profile.name}</span>
                  <span className="text-[11px] text-white/45">Lv. {profile.level || 1}</span>
                </button>
              );
            })}
          </div>
        )}
        {!hasPlayer && (
          <p className="text-xs text-amber-400/90 mt-3 flex items-center gap-1.5" data-testid="daily-player-gate-hint">
            <span aria-hidden>👆</span> {t('dailyChallengeScreen.selectPlayerFirst')}
          </p>
        )}
        {hasPlayer && selectedPlayerIds.length >= 2 && (
          <p className="text-xs text-white/50 mt-3">{t('dailyChallengeScreen.dualPlayerHint')}</p>
        )}
      </CardContent>
    </Card>
  );
}
