'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobeIcon, CloudUploadIcon } from '@/components/icons';
import { useGameStore } from '@/lib/game/store';
import { PlayerProfile } from '@/types/game';
import { COUNTRY_OPTIONS } from './country-options';
import { ProfileSyncSection } from './profile-sync-section';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';

interface CharacterSettingsCardProps {
  profile: PlayerProfile;
  onlineEnabled: boolean;
  onDelete: () => void;
}

export function CharacterSettingsCard({ profile, onlineEnabled, onDelete }: CharacterSettingsCardProps) {
  const { updateProfile } = useGameStore();
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [localIP, setLocalIP] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    detectLocalIP().then(ip => { if (ip) setLocalIP(ip); });
  }, []);

  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP, 3000, profile.id) : '', 160);

  const handleUpdatePrivacy = (field: string, value: boolean) => {
    updateProfile(profile.id, {
      privacy: {
        ...(profile.privacy || { showOnLeaderboard: true, showPhoto: true, showCountry: true }),
        [field]: value,
      },
    });
  };

  const handleUpdateCountry = (country: string) => {
    updateProfile(profile.id, { country: country || undefined });
  };

  const startEditingCharacter = () => {
    setEditName(profile.name);
    setEditAvatarUrl(profile.avatar || '');
    setIsEditingCharacter(true);
  };

  const cancelEditingCharacter = () => {
    setIsEditingCharacter(false);
    setEditName('');
    setEditAvatarUrl('');
  };

  const saveEditedCharacter = () => {
    if (editName.trim()) {
      updateProfile(profile.id, {
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
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Character Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Edit Character Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white/60">Name &amp; Avatar</h4>
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
                style={{ backgroundColor: profile.color }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile.name[0].toUpperCase()
                )}
              </div>
              <div>
                <div className="font-medium">{profile.name}</div>
                <div className="text-xs text-white/50">
                  {profile.avatar ? 'Photo uploaded' : 'No photo'}
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
                updateProfile(profile.id, {
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
                    updateProfile(profile.id, {
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

        {/* Country & Privacy */}
        {onlineEnabled && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-3">Country &amp; Privacy</h4>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Country:</span>
                <select
                  value={profile.country || ''}
                  onChange={(e) => handleUpdateCountry(e.target.value)}
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
                  onClick={() => handleUpdatePrivacy('showOnLeaderboard', !(profile.privacy?.showOnLeaderboard ?? true))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    (profile.privacy?.showOnLeaderboard ?? true) ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  <GlobeIcon className="w-3 h-3" />
                  {(profile.privacy?.showOnLeaderboard ?? true) ? 'Visible' : 'Hidden'}
                </button>
                <button
                  onClick={() => handleUpdatePrivacy('showPhoto', !(profile.privacy?.showPhoto ?? true))}
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

        {/* Companion App QR Code */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/60 mb-3">Companion-App Verknüpfung</h4>
          <p className="text-xs text-white/40 mb-3">
            Scanne diesen QR-Code, um dich direkt mit diesem Charakter in der Companion-App zu verbinden.
          </p>
          <button
            onClick={() => setShowQR(!showQR)}
            className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
          >
            {showQR ? 'QR-Code ausblenden' : 'QR-Code anzeigen'}
          </button>
          {showQR && localIP && (
            <div className="mt-3 flex items-center gap-4">
              <div className="bg-white rounded-lg p-2">
                {qrCodeSrc ? <img src={qrCodeSrc} alt="QR Code" className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
              </div>
              <p className="text-xs text-white/40 font-mono break-all">
                {buildCompanionUrl(localIP, 3000, profile.id)}
              </p>
            </div>
          )}
          {showQR && !localIP && (
            <p className="text-xs text-white/40 mt-2">Netzwerkadresse wird erkannt...</p>
          )}
        </div>

        {/* Delete Button */}
        <div className="pt-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
            onClick={onDelete}
          >
            Delete Character
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
