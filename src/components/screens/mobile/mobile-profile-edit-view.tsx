'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MobileProfile } from './mobile-types';

interface ProfileEditViewProps {
  profile: MobileProfile;
  profileName: string;
  onProfileNameChange: (value: string) => void;
  profileColor: string;
  onProfileColorChange: (color: string) => void;
  avatarPreview: string | null;
  connectionCode: string;
  profileColors: readonly string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwitchToHostProfile?: (hostProfile: MobileProfile) => void;
}

export function MobileProfileEditView({
  profile,
  profileName,
  onProfileNameChange,
  profileColor,
  onProfileColorChange,
  avatarPreview,
  connectionCode,
  profileColors,
  fileInputRef,
  onSave,
  onPhotoUpload,
  onSwitchToHostProfile,
}: ProfileEditViewProps) {
  const [hostProfiles, setHostProfiles] = useState<MobileProfile[]>([]);
  const [claimedProfileIds, setClaimedProfileIds] = useState<string[]>([]);

  // Fetch host profiles so the user can switch to a different host character
  React.useEffect(() => {
    const fetchHostProfiles = async () => {
      try {
        const storedClientId = localStorage.getItem('karaoke-client-id');
        const clientIdParam = storedClientId ? `&clientId=${storedClientId}` : '';
        const response = await fetch(`/api/mobile?action=hostprofiles${clientIdParam}`);
        const data = await response.json();
        if (data.success && data.profiles) {
          setHostProfiles(data.profiles);
          setClaimedProfileIds(data.claimedProfileIds || []);
        }
      } catch { /* ignore */ }
    };
    fetchHostProfiles();
  }, []);

  // Filter out the current profile (already selected) and already-claimed profiles
  const availableHostProfiles = hostProfiles.filter(
    (hp) => hp.id !== profile.id && !claimedProfileIds.includes(hp.id)
  );

  return (
    <div className="p-4 max-w-md mx-auto">
      <Card className="bg-white/10 border-white/20">
        <CardContent className="py-6">
          <div className="flex flex-col items-center mb-6">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 hover:border-white/40 transition-colors"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold flex items-center justify-center h-full">{profile.name[0]}</span>
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              onChange={onPhotoUpload}
              className="hidden" 
            />
            <h2 className="text-xl font-bold mt-4">{profile.name}</h2>
            {/* Show connection code */}
            {connectionCode && (
              <Badge variant="outline" className="mt-2 border-cyan-500/50 text-cyan-400 font-mono">
                Code: {connectionCode}
              </Badge>
            )}
          </div>

          {/* Switch to Host Character */}
          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">Charakter wechseln</h3>
              </div>
              <p className="text-xs text-white/40">
                Wähle einen Charakter aus der Haupt-App
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableHostProfiles.map((hp) => (
                  <button
                    key={hp.id}
                    onClick={() => onSwitchToHostProfile(hp)}
                    className="flex items-center gap-3 p-2 rounded-lg w-full text-left bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
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
                    <span className="text-sm truncate flex-1">{hp.name}</span>
                    <span className="text-xs text-cyan-400">Auswählen</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">oder bearbeiten</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          )}
          
          {/* Name Edit */}
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">Name</label>
              <Input
                id="edit-profile-name"
                name="edit-profile-name"
                value={profileName}
                onChange={(e) => onProfileNameChange(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            
            {/* Color Edit */}
            <div>
              <label className="text-sm text-white/60 mb-2 block">Color</label>
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
            
            {/* Save Button */}
            <Button 
              onClick={onSave}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
