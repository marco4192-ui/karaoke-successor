'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Enhanced character/profile management screen with tabs
 * for character customization, stats display, achievements showcase, and
 * social features. More feature-rich than the current character-screen.tsx.
 *
 * Currently, character management uses character-screen.tsx which was
 * refactored during Round 4 into smaller components (character-card.tsx,
 * create-character-form.tsx, player-progression-card.tsx, etc.).
 *
 * This "enhanced" version appears to be an earlier attempt at a more
 * comprehensive profile screen that was abandoned in favor of the
 * modular approach. It includes features like XP bar visualization,
 * achievement gallery, and friend list that aren't in the current screen.
 *
 * Consider: The XP bar visualization and achievement gallery could be
 * extracted and added to the current modular character screen.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/lib/game/store';
import { PlayerProfile } from '@/types/game';

// Country list with flags
const COUNTRIES = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'NL', name: 'Nederland', flag: '🇳🇱' },
  { code: 'PL', name: 'Polska', flag: '🇵🇱' },
  { code: 'JP', name: '日本', flag: '🇯🇵' },
  { code: 'KR', name: '대한민국', flag: '🇰🇷' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
];

interface CharacterEditorProps {
  profile: PlayerProfile;
  onSave: (updates: Partial<PlayerProfile>) => void;
  onDelete: () => void;
  isActive: boolean;
  onSelect: () => void;
}

function CharacterEditor({ profile, onSave, onDelete, isActive, onSelect }: CharacterEditorProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingName, setEditingName] = useState(profile.name);
  const [isEditing, setIsEditing] = useState(false);
  
  // Privacy settings with defaults
  const privacy = profile.privacy || {
    showOnLeaderboard: true,
    showPhoto: true,
    showCountry: true,
  };
  
  const selectedCountry = COUNTRIES.find(c => c.code === profile.country) || COUNTRIES[0];

  const handlePrivacyChange = (key: keyof typeof privacy, value: boolean) => {
    onSave({
      privacy: {
        ...privacy,
        [key]: value,
      },
    });
  };

  const handleCountryChange = (countryCode: string) => {
    onSave({ country: countryCode });
  };

  const handleSaveName = () => {
    if (editingName.trim() && editingName !== profile.name) {
      onSave({ name: editingName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <Card 
      className={`bg-white/5 border-white/10 transition-all ${
        isActive ? 'ring-2 ring-cyan-500' : ''
      }`}
    >
      <CardContent className="p-0">
        {/* Header with avatar */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => !isActive && onSelect()}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <Button size="sm" onClick={handleSaveName} className="bg-cyan-500">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{profile.name}</h3>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                    className="text-white/40 hover:text-white"
                  >
                    ✏️
                  </button>
                  {selectedCountry && (
                    <span className="text-xl" title={selectedCountry.name}>
                      {selectedCountry.flag}
                    </span>
                  )}
                </div>
              )}
              <div className="flex gap-2 text-sm text-white/60 mt-1">
                <span>{profile.gamesPlayed} games</span>
                <span>•</span>
                <span>{profile.totalScore.toLocaleString()} pts</span>
              </div>
            </div>
            {isActive && (
              <Badge className="bg-cyan-500">Active</Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start bg-transparent border-t border-white/10 rounded-none p-0">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent"
            >
              Stats
            </TabsTrigger>
            <TabsTrigger 
              value="privacy" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent"
            >
              🌐 Privacy
            </TabsTrigger>
          </TabsList>

          <div className="p-4 border-t border-white/10">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-400">{profile.stats.totalNotesHit}</div>
                  <div className="text-xs text-white/60">Notes Hit</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{profile.stats.bestCombo}</div>
                  <div className="text-xs text-white/60">Best Combo</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">
                    {profile.stats.totalNotesHit + profile.stats.totalNotesMissed > 0
                      ? Math.round((profile.stats.totalNotesHit / (profile.stats.totalNotesHit + profile.stats.totalNotesMissed)) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-white/60">Accuracy</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400">{profile.stats.goldenNotesHit}</div>
                  <div className="text-xs text-white/60">Golden Notes</div>
                </div>
              </div>
              
              {/* Delete button */}
              <Button 
                variant="destructive" 
                onClick={onDelete}
                className="w-full mt-4"
              >
                🗑️ Delete Character
              </Button>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="mt-0 space-y-4">
              <CardDescription className="text-white/60">
                Control how you appear on the global online leaderboard
              </CardDescription>
              
              {/* Main toggle */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium">Show on Leaderboard</p>
                  <p className="text-sm text-white/40">Appear on the public ranking</p>
                </div>
                <Switch 
                  checked={privacy.showOnLeaderboard} 
                  onCheckedChange={(c) => handlePrivacyChange('showOnLeaderboard', c)} 
                />
              </div>

              {privacy.showOnLeaderboard && (
                <>
                  {/* Photo toggle */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium">Show Profile Photo</p>
                      <p className="text-sm text-white/40">Display your avatar on the leaderboard</p>
                    </div>
                    <Switch 
                      checked={privacy.showPhoto} 
                      onCheckedChange={(c) => handlePrivacyChange('showPhoto', c)} 
                    />
                  </div>

                  {/* Country toggle */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="font-medium">Show Country</p>
                      <p className="text-sm text-white/40">Display your country flag</p>
                    </div>
                    <Switch 
                      checked={privacy.showCountry} 
                      onCheckedChange={(c) => handlePrivacyChange('showCountry', c)} 
                    />
                  </div>

                  {/* Country selection */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Your Country</label>
                    <select
                      value={profile.country || 'DE'}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Preview */}
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <p className="text-sm text-white/60 mb-3">Preview on Leaderboard:</p>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
                    style={{ backgroundColor: profile.color }}
                  >
                    {privacy.showOnLeaderboard && privacy.showPhoto && profile.avatar ? (
                      <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.name[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{profile.name}</p>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      {privacy.showOnLeaderboard && privacy.showCountry && selectedCountry && (
                        <span>{selectedCountry.flag}</span>
                      )}
                      <span>{profile.totalScore.toLocaleString()} pts</span>
                    </div>
                  </div>
                </div>
                {!privacy.showOnLeaderboard && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ You won't appear on the public leaderboard
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Main Character Screen
export function CharacterScreenEnhanced() {
  const { profiles, createProfile, updateProfile, deleteProfile, activeProfileId, setActiveProfile } = useGameStore();
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newCountry, setNewCountry] = useState('DE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = () => {
    if (newName.trim()) {
      createProfile(newName.trim(), avatarUrl || undefined);
      // Also set country for new profile
      setNewName('');
      setAvatarUrl('');
      setNewCountry('DE');
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Character Creation</h1>
        <p className="text-white/60">Create and manage your singer profiles</p>
      </div>

      {/* Create New Character */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardHeader>
          <CardTitle>Create New Character</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white/40 text-sm text-center">Upload<br/>Photo</span>
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
            <div className="flex-1 space-y-4">
              <Input
                placeholder="Character name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
              <select
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <Button onClick={handleCreate} disabled={!newName.trim()} className="bg-gradient-to-r from-cyan-500 to-purple-500">
                Create Character
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Characters */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Characters</h2>
        {profiles.length === 0 ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-8 text-center text-white/60">
              No characters yet. Create your first one above!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {profiles.map((profile) => (
              <CharacterEditor
                key={profile.id}
                profile={profile}
                onSave={(updates) => updateProfile(profile.id, updates)}
                onDelete={() => deleteProfile(profile.id)}
                isActive={activeProfileId === profile.id}
                onSelect={() => setActiveProfile(profile.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CharacterScreenEnhanced;
