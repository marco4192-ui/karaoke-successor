'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MobileProfile } from './mobile-types';

interface ProfileCreateViewProps {
  profileName: string;
  onProfileNameChange: (value: string) => void;
  profileColor: string;
  onProfileColorChange: (color: string) => void;
  avatarPreview: string | null;
  profileColors: readonly string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCreateProfile: (hostProfile?: MobileProfile) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function MobileProfileCreateView({
  profileName,
  onProfileNameChange,
  profileColor,
  onProfileColorChange,
  avatarPreview,
  profileColors,
  fileInputRef,
  onCreateProfile,
  onPhotoUpload,
}: ProfileCreateViewProps) {
  const [hostProfiles, setHostProfiles] = useState<MobileProfile[]>([]);
  const [claimedProfileIds, setClaimedProfileIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Track a selected host profile before confirming — allows deselection
  const [selectedHostProfile, setSelectedHostProfile] = useState<MobileProfile | null>(null);

  // Fetch host profiles when component mounts
  React.useEffect(() => {
    const fetchHostProfiles = async () => {
      try {
        setIsLoading(true);
        // Include clientId to exclude own profile from "claimed" list
        const storedClientId = localStorage.getItem('karaoke-client-id');
        const clientIdParam = storedClientId ? `&clientId=${storedClientId}` : '';
        const response = await fetch(`/api/mobile?action=hostprofiles${clientIdParam}`);
        const data = await response.json();
        if (data.success && data.profiles) {
          setHostProfiles(data.profiles);
          setClaimedProfileIds(data.claimedProfileIds || []);
        }
      } catch { /* ignore */ } finally {
        setIsLoading(false);
      }
    };
    fetchHostProfiles();
  }, []);

  // Available profiles: if one is selected, only show that one
  const availableProfiles = selectedHostProfile
    ? hostProfiles.filter(hp => hp.id === selectedHostProfile.id)
    : hostProfiles.filter(hp => !claimedProfileIds.includes(hp.id));

  const handleSelectHostProfile = (hp: MobileProfile) => {
    setSelectedHostProfile(hp);
    onProfileNameChange(hp.name);
    onProfileColorChange(hp.color);
    // Note: we DON'T call onCreateProfile here — user can still deselect
  };

  const handleDeselectProfile = () => {
    setSelectedHostProfile(null);
    onProfileNameChange('');
    onProfileColorChange(profileColors[0]);
  };

  const handleConfirmSelected = () => {
    if (selectedHostProfile) {
      onCreateProfile(selectedHostProfile);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-center">Create Your Profile</CardTitle>
          <p className="text-center text-white/40 text-sm mt-2">Your profile will sync with the main app</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Choose Existing Character from Host */}
          {hostProfiles.length > 0 && !selectedHostProfile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Bestehenden Charakter wählen</h3>
              </div>
              <p className="text-xs text-white/40 mb-2">
                Wähle einen Charakter, der auf dem Hauptgerät erstellt wurde
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableProfiles.map((hp) => (
                    <button
                      key={hp.id}
                      onClick={() => handleSelectHostProfile(hp)}
                      className="flex items-center gap-3 p-2 rounded-lg w-full text-left transition-colors bg-white/5 hover:bg-white/10 cursor-pointer"
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: hp.color }}
                      >
                        {hp.avatar ? (
                          <img src={hp.avatar} alt={hp.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          hp.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block">{hp.name}</span>
                      </div>
                    </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">oder neu erstellen</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Selected host profile — show with confirm/deselect options */}
          {selectedHostProfile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Ausgewählter Charakter</h3>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mx-auto w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
              >
                {avatarPreview || selectedHostProfile.avatar ? (
                  <img src={avatarPreview || selectedHostProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="text-xl">📷</span>
                    <p className="text-[10px] text-white/40 mt-0.5">Foto</p>
                  </div>
                )}
              </button>
              <p className="text-center text-sm font-medium truncate">{selectedHostProfile.name}</p>
              <div className="flex gap-2">
                <Button
                  onClick={handleConfirmSelected}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                >
                  ✓ Bestätigen
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeselectProfile}
                  className="flex-1 border-white/30 text-white/70"
                >
                  ✕ Abwählen
                </Button>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30">oder neu erstellen</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Avatar Upload */}
          <div className="flex flex-col items-center">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-2xl">📷</span>
                  <p className="text-xs text-white/40 mt-1">Add Photo</p>
                </div>
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={onPhotoUpload}
              className="hidden" 
            />
          </div>
          
          {/* Name Input */}
          <div>
            <label htmlFor="profile-name" className="text-sm text-white/60 mb-2 block">Your Name</label>
            <Input
              id="profile-name"
              name="profile-name"
              value={profileName}
              onChange={(e) => onProfileNameChange(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          {/* Color Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Choose Color</label>
            <div className="flex flex-wrap gap-2">
              {profileColors.map((color) => (
                <button
                  key={color}
                  onClick={() => onProfileColorChange(color)}
                  className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          {/* Create Button */}
          <Button 
            onClick={onCreateProfile}
            disabled={!profileName.trim()}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
          >
            Create Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
