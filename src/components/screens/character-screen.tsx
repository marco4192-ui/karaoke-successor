'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { GlobeIcon, PlusIcon, UserIcon } from '@/components/icons';
import { CharacterCard } from './character/character-card';
import { CreateCharacterForm } from './character/create-character-form';
import { PlayerProgressionCard } from './character/player-progression-card';
import { CharacterSettingsCard } from './character/character-settings-card';

export function CharacterScreen() {
  const {
    profiles, createProfile, updateProfile, deleteProfile,
    activeProfileId, setActiveProfile,
    onlineEnabled, setOnlineEnabled,
    leaderboardType, setLeaderboardType,
  } = useGameStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // ── Track which characters are claimed by connected companions ──
  const [claimedProfileIds, setClaimedProfileIds] = useState<Record<string, string>>({});
  // Map: profileId → companion connection code

  const fetchClaimedProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=clients');
      const data = await response.json();
      if (data.success && data.clients) {
        const claimed: Record<string, string> = {};
        for (const client of data.clients) {
          if (client.profile?.id) {
            claimed[client.profile.id] = client.connectionCode;
          }
        }
        setClaimedProfileIds(claimed);
      }
    } catch { /* ignore */ }
  }, []);

  // Poll claimed profiles every 10s
  useEffect(() => {
    fetchClaimedProfiles();
    const interval = setInterval(fetchClaimedProfiles, 10000);
    return () => clearInterval(interval);
  }, [fetchClaimedProfiles]);

  const displayedProfileId = selectedProfileId || activeProfileId;
  const displayedProfile = profiles.find(p => p.id === displayedProfileId);

  const handleCreate = (
    name: string, avatarUrl: string,
    country: string, privacy: { showOnLeaderboard: boolean; showPhoto: boolean; showCountry: boolean },
  ) => {
    const profile = createProfile(name, avatarUrl || undefined);
    updateProfile(profile.id, {
      country: country || undefined,
      privacy,
    });
    setShowCreateForm(false);
    setSelectedProfileId(profile.id);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Characters</h1>
        <p className="text-white/60">Create and manage your singer profiles</p>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <GlobeIcon className="w-5 h-5 text-cyan-400" />
          <span className="text-sm text-white/80">Online Leaderboard</span>
          <button
            onClick={() => setOnlineEnabled(!onlineEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${onlineEnabled ? 'bg-cyan-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${onlineEnabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        
        {onlineEnabled && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setLeaderboardType('local')}
              size="sm"
              className={leaderboardType === 'local' ? 'bg-cyan-500 h-7' : 'bg-white/10 h-7'}
            >
              Local
            </Button>
            <Button
              onClick={() => setLeaderboardType('global')}
              size="sm"
              className={leaderboardType === 'global' ? 'bg-purple-500 h-7' : 'bg-white/10 h-7'}
            >
              Global
            </Button>
          </div>
        )}
        
        <div className="flex-1" />
        
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Create New Character
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <CreateCharacterForm
          onCreate={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          onlineEnabled={onlineEnabled}
        />
      )}

      {/* Character List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-white/80">Your Characters ({profiles.length})</h2>
        {profiles.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-8 text-center text-white/60">
              <UserIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No characters yet. Click "Create New Character" to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap gap-3">
            {profiles.map((profile) => (
              <CharacterCard
                key={profile.id}
                profile={profile}
                isSelected={displayedProfileId === profile.id}
                isActiveProfile={activeProfileId === profile.id}
                isClaimedByCompanion={!!claimedProfileIds[profile.id]}
                claimedByDevice={claimedProfileIds[profile.id] ? `Companion (${claimedProfileIds[profile.id]})` : undefined}
                onClick={() => {
                  setSelectedProfileId(profile.id);
                  setActiveProfile(profile.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Character Details */}
      {displayedProfile && (
        <div className="space-y-6">
          <PlayerProgressionCard
            profile={displayedProfile}
            onToggleActive={() => updateProfile(displayedProfile.id, {
              isActive: !(displayedProfile.isActive ?? true),
            })}
          />
          <CharacterSettingsCard
            profile={displayedProfile}
            onlineEnabled={onlineEnabled}
            onDelete={() => {
              deleteProfile(displayedProfile.id);
              setSelectedProfileId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
