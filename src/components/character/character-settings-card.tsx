'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { GlobeIcon, CloudUploadIcon } from '@/components/icons';
import { PlayerProfile } from '@/types/game';
import { ProfileSyncSection } from '@/components/profile/profile-sync-section';
import { COUNTRY_OPTIONS } from '@/components/screens/character-screen';

export interface CharacterSettingsCardProps {
  profile: PlayerProfile;
  onlineEnabled: boolean;
  onUpdateProfile: (profileId: string, updates: Partial<PlayerProfile>) => void;
  onUpdatePrivacy: (profileId: string, field: string, value: boolean) => void;
  onUpdateCountry: (profileId: string, country: string) => void;
  onDeleteProfile: (profileId: string) => void;
}

export function CharacterSettingsCard({
  profile,
  onlineEnabled,
  onUpdateProfile,
  onUpdatePrivacy,
  onUpdateCountry,
  onDeleteProfile,
}: CharacterSettingsCardProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Character Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rank Display Options */}
        <div>
          <h4 className="text-sm font-medium text-white/60 mb-3">Rang-Anzeige</h4>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm text-white/80">Rang im Namen anzeigen</span>
            <button
              onClick={() => {
                onUpdateProfile(profile.id, {
                  showRankInName: !profile.showRankInName
                });
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${profile.showRankInName ? 'bg-purple-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${profile.showRankInName ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {profile.showRankInName && (
            <div className="flex gap-2">
              {[
                { id: 'prefix', name: 'Präfix', example: '🎤 Name' },
                { id: 'suffix', name: 'Suffix', example: 'Name 🎤' },
                { id: 'nickname', name: 'Vollständig', example: '🎤 Name (Singer)' },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => {
                    onUpdateProfile(profile.id, {
                      rankDisplayStyle: style.id as 'prefix' | 'suffix' | 'nickname'
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    profile.rankDisplayStyle === style.id
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/30'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Country Selector & Privacy */}
        {onlineEnabled && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-3">Country & Privacy</h4>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Country:</span>
                <select
                  value={profile.country || ''}
                  onChange={(e) => onUpdateCountry(profile.id, e.target.value)}
                  className="bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white"
                >
                  <option value="">-</option>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onUpdatePrivacy(profile.id, 'showOnLeaderboard', !(profile.privacy?.showOnLeaderboard ?? true))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    (profile.privacy?.showOnLeaderboard ?? true) ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  <GlobeIcon className="w-3 h-3" />
                  {(profile.privacy?.showOnLeaderboard ?? true) ? 'Visible' : 'Hidden'}
                </button>
                <button
                  onClick={() => onUpdatePrivacy(profile.id, 'showPhoto', !(profile.privacy?.showPhoto ?? true))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    (profile.privacy?.showPhoto ?? true) ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  📷 {(profile.privacy?.showPhoto ?? true) ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Sync Section */}
        {onlineEnabled && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
              <CloudUploadIcon className="w-4 h-4" /> Profile Sync
            </h4>
            <ProfileSyncSection profile={profile} />
          </div>
        )}

        {/* Delete Button */}
        <div className="pt-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => onDeleteProfile(profile.id)}
          >
            Delete Character
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
