'use client';

// ===================== Party-Setup-Mirror — Spieler-Auswahl =====================
//
// SPIELER-AUSWAHL-Block des Party-Setup-Mirrors (R6-Auslagerung aus
// mirror-party-setup-lite.tsx — JSX unverändert; modeInfo.minPlayers/maxPlayers
// → minPlayers/maxPlayers-Props, handleTogglePlayer → onTogglePlayer).

import { useTranslation } from '@/lib/i18n/translations';
import { SectionHeader } from './ui-controls';
import type { PartySetupProfile } from './types';

export interface PlayerSelectionSectionProps {
  selectedPlayers: string[];
  minPlayers: number;
  maxPlayers: number;
  activeProfiles: PartySetupProfile[];
  profilesLoading: boolean;
  onTogglePlayer: (profileId: string) => void;
}

export function PlayerSelectionSection({
  selectedPlayers,
  minPlayers,
  maxPlayers,
  activeProfiles,
  profilesLoading,
  onTogglePlayer,
}: PlayerSelectionSectionProps) {
  const { t } = useTranslation();
  return (
    <div>
      <SectionHeader>
        {t('partySetup.players') || 'Spieler'} ({selectedPlayers.length}/{minPlayers}-{maxPlayers})
      </SectionHeader>
      <div className="grid grid-cols-2 gap-2">
        {activeProfiles.map((profile, idx: number) => {
          const isSelected = selectedPlayers.includes(profile.id);
          const colors = ['#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444', '#3B82F6', '#F97316'];
          const color = profile.color || colors[idx % colors.length];
          return (
            <button
              key={profile.id}
              onClick={() => onTogglePlayer(profile.id)}
              className={'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left active:scale-[0.97] transition-all border ' +
                (isSelected
                  ? 'border-white/30 bg-white/10'
                  : 'border-white/10 bg-white/5 opacity-60')}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                style={{ backgroundColor: color + '40', border: `2px solid ${isSelected ? color : 'transparent'}` }}
              >
                {isSelected
                  ? '\u2713'
                  : profile.avatar
                    ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                    : (profile.name?.[0] || '?')}
              </div>
              <span className="text-sm font-medium text-white truncate">{profile.name || 'Player'}</span>
            </button>
          );
        })}
      </div>
      {activeProfiles.length === 0 && !profilesLoading ? (
        <p className="text-xs text-white/30 text-center py-3">
          {t('mobile.mirrorProfileNoProfiles') || 'Keine Profile auf dem Desktop vorhanden'}
        </p>
      ) : null}
      {profilesLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <span className="ml-2 text-xs text-white/40">{t('mobile.mirrorLoadingProfiles') || 'Profile laden...'}</span>
        </div>
      ) : null}
    </div>
  );
}
