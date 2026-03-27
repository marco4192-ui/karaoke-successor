'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/lib/game/store';
import { GlobeIcon, PlusIcon } from '@/components/icons';
import { CharacterCreateForm } from '@/components/character/character-create-form';
import { CharacterList } from '@/components/character/character-list';
import { CharacterProgressionCard } from '@/components/character/character-progression-card';
import { CharacterSettingsCard } from '@/components/character/character-settings-card';
// Re-export for backward compatibility with components that import from here
export { COUNTRY_OPTIONS } from '@/lib/constants/countries';

export function CharacterScreen() {
  const {
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
    activeProfileId,
    setActiveProfile,
    onlineEnabled,
    setOnlineEnabled,
    leaderboardType,
    setLeaderboardType
  } = useGameStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Get selected or active profile for detail view
  const displayedProfileId = selectedProfileId || activeProfileId;
  const displayedProfile = profiles.find(p => p.id === displayedProfileId);

  // Handle creating a new profile
  const handleCreateProfile = (
    name: string,
    avatarUrl?: string,
    country?: string,
    privacy?: { showOnLeaderboard: boolean; showPhoto: boolean; showCountry: boolean }
  ) => {
    const profile = createProfile(name, avatarUrl);
    updateProfile(profile.id, {
      country: country || undefined,
      privacy: privacy,
    });
    setSelectedProfileId(profile.id);
  };

  // Handle updating privacy settings
  const handleUpdatePrivacy = (profileId: string, field: string, value: boolean) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      updateProfile(profileId, {
        privacy: {
          ...(profile.privacy || { showOnLeaderboard: true, showPhoto: true, showCountry: true }),
          [field]: value,
        },
      });
    }
  };

  // Handle updating country
  const handleUpdateCountry = (profileId: string, country: string) => {
    updateProfile(profileId, { country: country || undefined });
  };

  // Handle deleting a profile
  const handleDeleteProfile = (profileId: string) => {
    deleteProfile(profileId);
    setSelectedProfileId(null);
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Characters</h1>
        <p className="text-white/60">Create and manage your singer profiles</p>
      </div>

      {/* Top Action Bar - Online Leaderboard + Create New */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        {/* Online Leaderboard Toggle */}
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

        {/* Create New Character Button */}
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-cyan-500 to-purple-500 gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Create New Character
        </Button>
      </div>

      {/* Create New Character Form */}
      <CharacterCreateForm
        show={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onlineEnabled={onlineEnabled}
        onCreateProfile={handleCreateProfile}
      />

      {/* Character List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3 text-white/80">Your Characters ({profiles.length})</h2>
        <CharacterList
          profiles={profiles}
          displayedProfileId={displayedProfileId}
          activeProfileId={activeProfileId}
          onSelectProfile={setSelectedProfileId}
          onSetActiveProfile={setActiveProfile}
        />
      </div>

      {/* Selected Character Details */}
      {displayedProfile && (
        <div className="space-y-6">
          {/* Player Progression Card */}
          <CharacterProgressionCard
            profile={displayedProfile}
            onUpdateProfile={updateProfile}
          />

          {/* Settings Card */}
          <CharacterSettingsCard
            profile={displayedProfile}
            onlineEnabled={onlineEnabled}
            onUpdateProfile={updateProfile}
            onUpdatePrivacy={handleUpdatePrivacy}
            onUpdateCountry={handleUpdateCountry}
            onDeleteProfile={handleDeleteProfile}
          />
        </div>
      )}
    </div>
  );
}
