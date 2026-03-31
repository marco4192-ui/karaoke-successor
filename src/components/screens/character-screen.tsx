'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useGameStore } from '@/lib/game/store';
import { GlobeIcon, CloudUploadIcon, CloudDownloadIcon, PlusIcon, UserIcon } from '@/components/icons';
import { PlayerProfile, HighscoreEntry } from '@/types/game';
import { getLevelForXP, getRankForXP } from '@/lib/game/player-progression';
import { createEmptyPerformanceStats, getPerformanceGrade, formatPlayTime } from '@/lib/game/performance-analytics';

// Country options for selection
const COUNTRY_OPTIONS: { code: string; name: string; flag: string }[] = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
];

// Profile Sync Section Component
function ProfileSyncSection({ profile }: { profile: PlayerProfile }) {
  const [syncCode, setSyncCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { updateProfile, highscores } = useGameStore();

  // Generate a new sync code
  const generateSyncCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Upload profile to server
  const handleUploadProfile = async () => {
    setIsUploading(true);
    setMessage(null);
    
    try {
      // Generate sync code if not exists
      const code = profile.syncCode || generateSyncCode();
      
      // Update profile with sync code locally
      updateProfile(profile.id, { syncCode: code });
      
      // Get highscores for this profile
      const profileHighscores: Record<string, HighscoreEntry[]> = {};
      highscores
        .filter(h => h.playerId === profile.id)
        .forEach(h => {
          if (!profileHighscores[h.songId]) {
            profileHighscores[h.songId] = [];
          }
          profileHighscores[h.songId].push(h);
        });
      
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const result = await leaderboardService.uploadProfile(profile, profileHighscores);
      
      if (result.success) {
        setSyncCode(code);
        setMessage({ type: 'success', text: `Profile uploaded! Sync code: ${code}` });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: unknown) {
      console.error('Profile upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
    }
  };

  // Download profile from server
  const handleDownloadProfile = async () => {
    if (!inputCode || inputCode.length !== 8) {
      setMessage({ type: 'error', text: 'Please enter a valid 8-character sync code' });
      return;
    }
    
    setIsDownloading(true);
    setMessage(null);
    
    try {
      // Call the actual API
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      
      const downloadedProfile = await leaderboardService.downloadProfileByCode(inputCode.toUpperCase());
      
      if (downloadedProfile) {
        // Update the local profile with downloaded data
        updateProfile(profile.id, {
          name: downloadedProfile.name,
          avatar: downloadedProfile.avatar || undefined,
          country: downloadedProfile.country || undefined,
          color: downloadedProfile.color,
          stats: downloadedProfile.stats,
          achievements: downloadedProfile.achievements,
          privacy: downloadedProfile.settings.privacy,
          syncCode: downloadedProfile.sync_code,
        });
        
        setMessage({ type: 'success', text: 'Profile synced successfully!' });
        setInputCode('');
      } else {
        throw new Error('Profile not found');
      }
    } catch (error: unknown) {
      console.error('Profile download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download profile. Check the sync code.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-2">
      {/* Show existing sync code if available */}
      {profile.syncCode && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white/50">Sync Code:</span>
          <code className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded font-mono">
            {profile.syncCode}
          </code>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleUploadProfile}
          disabled={isUploading}
          className="h-7 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          {isUploading ? (
            <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin mr-1" />
          ) : (
            <CloudUploadIcon className="w-3 h-3 mr-1" />
          )}
          Upload
        </Button>
        
        <div className="flex items-center gap-1">
          <Input
            id="sync-code"
            name="sync-code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="Sync code"
            maxLength={8}
            className="h-7 w-28 text-xs bg-white/5 border-white/10"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadProfile}
            disabled={isDownloading || inputCode.length !== 8}
            className="h-7 text-xs border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {isDownloading ? (
              <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <CloudDownloadIcon className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Status message */}
      {message && (
        <div className={`text-xs p-2 rounded ${
          message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export function CharacterScreen() {
  const { profiles, createProfile, updateProfile, deleteProfile, activeProfileId, setActiveProfile, onlineEnabled, setOnlineEnabled, leaderboardType, setLeaderboardType } = useGameStore();
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [privacySettings, setPrivacySettings] = useState({
    showOnLeaderboard: true,
    showPhoto: true,
    showCountry: true,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  
  // Get selected or active profile for detail view
  const displayedProfileId = selectedProfileId || activeProfileId;
  const displayedProfile = profiles.find(p => p.id === displayedProfileId);
  
  // Get active profile's progression info
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const profileXP = displayedProfile?.xp || 0;
  const playerLevel = getLevelForXP(profileXP);
  const playerRank = getRankForXP(profileXP);

  const handleCreate = () => {
    if (newName.trim()) {
      const profile = createProfile(newName.trim(), avatarUrl || undefined);
      updateProfile(profile.id, {
        country: selectedCountry || undefined,
        privacy: privacySettings,
      });
      setNewName('');
      setAvatarUrl('');
      setSelectedCountry('');
      setPrivacySettings({ showOnLeaderboard: true, showPhoto: true, showCountry: true });
      setShowCreateForm(false);
      setSelectedProfileId(profile.id);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleUpdateCountry = (profileId: string, country: string) => {
    updateProfile(profileId, { country: country || undefined });
  };

  const startEditingCharacter = () => {
    if (displayedProfile) {
      setEditName(displayedProfile.name);
      setEditAvatarUrl(displayedProfile.avatar || '');
      setIsEditingCharacter(true);
    }
  };

  const cancelEditingCharacter = () => {
    setIsEditingCharacter(false);
    setEditName('');
    setEditAvatarUrl('');
  };

  const saveEditedCharacter = () => {
    if (displayedProfile && editName.trim()) {
      updateProfile(displayedProfile.id, {
        name: editName.trim(),
        avatar: editAvatarUrl || undefined
      });
      setIsEditingCharacter(false);
    }
  };

  const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
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

      {/* Create New Character Form (Collapsible) */}
      {showCreateForm && (
        <Card className="bg-white/5 border-white/10 mb-6 animate-in slide-in-from-top-2 duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Create New Character</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-shrink-0">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/40 text-xs text-center">Upload<br/>Photo</span>
                  )}
                </button>
                <input 
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  id="character-name"
                  name="character-name"
                  placeholder="Character name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-[rgb(30,30,40)] dark:bg-[rgb(30,30,40)] border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
                  style={{ 
                    colorScheme: 'dark',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 0.5rem center', 
                    backgroundSize: '1.5em 1.5em' 
                  }}
                >
                  <option value="" className="bg-[rgb(30,30,40)] text-white/60">Select Country (optional)</option>
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.code} value={c.code} className="bg-[rgb(30,30,40)] text-white">{c.flag} {c.name}</option>
                  ))}
                </select>
                {onlineEnabled && (
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={privacySettings.showOnLeaderboard}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showOnLeaderboard: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white/70">Show on leaderboard</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={privacySettings.showPhoto}
                        onChange={(e) => setPrivacySettings(prev => ({ ...prev, showPhoto: e.target.checked }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white/70">Show photo</span>
                    </label>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-gradient-to-r from-cyan-500 to-purple-500">
                    Create Character
                  </Button>
                  <Button onClick={() => setShowCreateForm(false)} variant="outline" className="border-white/20">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Character List - Compact horizontal cards */}
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
            {profiles.map((profile) => {
              const level = getLevelForXP(profile.xp || 0);
              const rank = getRankForXP(profile.xp || 0);
              const isSelected = displayedProfileId === profile.id;
              const isActiveProfile = activeProfileId === profile.id;
              const isProfileActive = profile.isActive ?? true;

              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    setSelectedProfileId(profile.id);
                    setActiveProfile(profile.id);
                  }}
                  className={`
                    w-28 p-3 rounded-xl cursor-pointer transition-all relative
                    ${isSelected
                      ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-500 scale-105'
                      : isProfileActive
                        ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 opacity-50 grayscale'
                    }
                  `}
                >
                  {/* Active/Inactive Status Indicator */}
                  <div
                    className={`absolute top-2 right-2 w-3 h-3 rounded-full border border-black/30 ${
                      isProfileActive ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={isProfileActive ? 'Active' : 'Inactive'}
                  />
                    <div className="flex flex-col items-center text-center">
                      {/* Avatar */}
                      <div className="relative mb-2">
                        <div 
                          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold overflow-hidden border-2"
                          style={{
                            backgroundColor: profile.color,
                            borderColor: isActiveProfile ? '#22d3ee' : 'transparent'
                          }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                          ) : (
                            profile.name[0].toUpperCase()
                          )}
                        </div>
                        {/* Selected/Aktives Profil indicator */}
                        {isActiveProfile && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full border-2 border-black flex items-center justify-center">
                            <span className="text-[8px]">✓</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Name */}
                      <div className="text-sm font-medium truncate w-full mb-1">{profile.name}</div>
                      
                      {/* Level/Rank */}
                      <div className="text-xs text-white/50 mb-1">
                        {rank?.icon} Lv.{level?.level || 1}
                      </div>
                      
                      {/* Country flag */}
                      {profile.country && (
                        <div className="text-lg">
                          {COUNTRY_OPTIONS.find(c => c.code === profile.country)?.flag || ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        )}
      </div>

      {/* Selected Character Details */}
      {displayedProfile && (
        <div className="space-y-6">
          {/* Player Progression Card */}
          <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-4">
                <div className="relative">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden border-2 border-purple-400"
                    style={{ backgroundColor: displayedProfile.color }}
                  >
                    {displayedProfile.avatar ? (
                      <img src={displayedProfile.avatar} alt={displayedProfile.name} className="w-full h-full object-cover" />
                    ) : (
                      displayedProfile.name[0].toUpperCase()
                    )}
                  </div>
                  {displayedProfile.country && (
                    <div className="absolute -bottom-1 -right-1 text-xl">
                      {COUNTRY_OPTIONS.find(c => c.code === displayedProfile.country)?.flag || ''}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{playerRank?.icon || '🎵'}</span>
                    <div>
                      <div className="text-xl font-bold">{displayedProfile.name}</div>
                      <div className="text-sm text-white/60">
                        {playerRank?.name || 'Beginner'} • Level {playerLevel?.level || 1} • {profileXP.toLocaleString()} XP
                      </div>
                    </div>
                  </div>
                </div>
                {/* Active/Inactive Toggle */}
                <button
                  onClick={() => updateProfile(displayedProfile.id, { isActive: !(displayedProfile.isActive ?? true) })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    (displayedProfile.isActive ?? true) 
                      ? 'bg-green-500/30 text-green-300' 
                      : 'bg-red-500/30 text-red-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${(displayedProfile.isActive ?? true) ? 'bg-green-400' : 'bg-red-400'}`} />
                  {(displayedProfile.isActive ?? true) ? 'Active' : 'Inactive'}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* XP Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Progress to Next Level</span>
                  <span className="text-purple-400">{playerLevel?.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                    style={{ width: `${playerLevel?.progress || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/40 mt-1">
                  <span>{playerLevel?.currentXP || 0} XP</span>
                  <span>{playerLevel?.nextLevelXP || 500} XP needed</span>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-cyan-400">{displayedProfile.gamesPlayed || 0}</div>
                  <div className="text-xs text-white/60">Songs Played</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-yellow-400">{displayedProfile.stats?.goldenNotesHit || 0}</div>
                  <div className="text-xs text-white/60">Golden Notes</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-400">{displayedProfile.stats?.bestCombo || 0}</div>
                  <div className="text-xs text-white/60">Best Combo</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-400">{displayedProfile.totalScore?.toLocaleString() || 0}</div>
                  <div className="text-xs text-white/60">Total Score</div>
                </div>
              </div>
              
              {/* Achievements */}
              {displayedProfile.achievements && displayedProfile.achievements.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-white/60 mb-2">Achievements ({displayedProfile.achievements.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {displayedProfile.achievements.slice(0, 6).map((achievement) => (
                      <Badge 
                        key={achievement.id}
                        className="bg-white/10 border border-white/20"
                      >
                        {achievement.icon} {achievement.name}
                      </Badge>
                    ))}
                    {displayedProfile.achievements.length > 6 && (
                      <Badge className="bg-white/10">+{displayedProfile.achievements.length - 6} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings Card - Privacy & Sync */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Character Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Edit Character Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white/60">Name & Avatar</h4>
                  {!isEditingCharacter && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startEditingCharacter}
                      className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10"
                    >
                      Edit
                    </Button>
                  )}
                </div>
                
                {isEditingCharacter ? (
                  <div className="flex flex-col sm:flex-row gap-4 bg-white/5 rounded-lg p-3">
                    <div className="flex-shrink-0">
                      <button 
                        onClick={() => editFileInputRef.current?.click()}
                        className="w-16 h-16 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
                      >
                        {editAvatarUrl ? (
                          <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white/40 text-xs text-center">Upload<br/>Photo</span>
                        )}
                      </button>
                      <input 
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditFileUpload}
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <Input
                        id="edit-character-name"
                        name="edit-character-name"
                        placeholder="Character name..."
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={saveEditedCharacter} 
                          disabled={!editName.trim()} 
                          size="sm"
                          className="bg-gradient-to-r from-cyan-500 to-purple-500 h-7"
                        >
                          Save
                        </Button>
                        <Button 
                          onClick={cancelEditingCharacter} 
                          variant="outline" 
                          size="sm"
                          className="border-white/20 h-7"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden border border-white/20"
                      style={{ backgroundColor: displayedProfile.color }}
                    >
                      {displayedProfile.avatar ? (
                        <img src={displayedProfile.avatar} alt={displayedProfile.name} className="w-full h-full object-cover" />
                      ) : (
                        displayedProfile.name[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{displayedProfile.name}</div>
                      <div className="text-xs text-white/50">
                        {displayedProfile.avatar ? 'Photo uploaded' : 'No photo'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rank Display Options */}
              <div>
                <h4 className="text-sm font-medium text-white/60 mb-3">Rang-Anzeige</h4>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-sm text-white/80">Rang im Namen anzeigen</span>
                  <button
                    onClick={() => {
                      updateProfile(displayedProfile.id, {
                        showRankInName: !displayedProfile.showRankInName
                      });
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${displayedProfile.showRankInName ? 'bg-purple-500' : 'bg-white/20'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${displayedProfile.showRankInName ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                
                {displayedProfile.showRankInName && (
                  <div className="flex gap-2">
                    {[
                      { id: 'prefix', name: 'Präfix', example: '🎤 Name' },
                      { id: 'suffix', name: 'Suffix', example: 'Name 🎤' },
                      { id: 'nickname', name: 'Vollständig', example: '🎤 Name (Singer)' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          updateProfile(displayedProfile.id, {
                            rankDisplayStyle: style.id as 'prefix' | 'suffix' | 'nickname'
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                          displayedProfile.rankDisplayStyle === style.id
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

              {/* Country Selector */}
              {onlineEnabled && (
                <div className="pt-3 border-t border-white/10">
                  <h4 className="text-sm font-medium text-white/60 mb-3">Country & Privacy</h4>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Country:</span>
                      <select
                        value={displayedProfile.country || ''}
                        onChange={(e) => handleUpdateCountry(displayedProfile.id, e.target.value)}
                        className="bg-[rgb(30,30,40)] dark:bg-[rgb(30,30,40)] border border-white/20 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer min-w-[160px]"
                        style={{ 
                          colorScheme: 'dark',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, 
                          backgroundRepeat: 'no-repeat', 
                          backgroundPosition: 'right 0.5rem center', 
                          backgroundSize: '1.2em 1.2em' 
                        }}
                      >
                        <option value="" className="bg-[rgb(30,30,40)] text-white/60">Select Country</option>
                        {COUNTRY_OPTIONS.map(c => (
                          <option key={c.code} value={c.code} className="bg-[rgb(30,30,40)] text-white">{c.flag} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdatePrivacy(displayedProfile.id, 'showOnLeaderboard', !(displayedProfile.privacy?.showOnLeaderboard ?? true))}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          (displayedProfile.privacy?.showOnLeaderboard ?? true) ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'
                        }`}
                      >
                        <GlobeIcon className="w-3 h-3" />
                        {(displayedProfile.privacy?.showOnLeaderboard ?? true) ? 'Visible' : 'Hidden'}
                      </button>
                      <button
                        onClick={() => handleUpdatePrivacy(displayedProfile.id, 'showPhoto', !(displayedProfile.privacy?.showPhoto ?? true))}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                          (displayedProfile.privacy?.showPhoto ?? true) ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/50'
                        }`}
                      >
                        📷 {(displayedProfile.privacy?.showPhoto ?? true) ? 'Shown' : 'Hidden'}
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
                  <ProfileSyncSection profile={displayedProfile} />
                </div>
              )}

              {/* Delete Button */}
              <div className="pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    deleteProfile(displayedProfile.id);
                    setSelectedProfileId(null);
                  }}
                >
                  Delete Character
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
