'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { COUNTRY_OPTIONS } from '@/components/screens/character-screen';

export interface CharacterCreateFormProps {
  show: boolean;
  onClose: () => void;
  onlineEnabled: boolean;
  onCreateProfile: (name: string, avatarUrl?: string, country?: string, privacy?: {
    showOnLeaderboard: boolean;
    showPhoto: boolean;
    showCountry: boolean;
  }) => void;
}

export function CharacterCreateForm({
  show,
  onClose,
  onlineEnabled,
  onCreateProfile,
}: CharacterCreateFormProps) {
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [privacySettings, setPrivacySettings] = useState({
    showOnLeaderboard: true,
    showPhoto: true,
    showCountry: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateProfile(
        newName.trim(),
        avatarUrl || undefined,
        selectedCountry || undefined,
        privacySettings
      );
      // Reset form
      setNewName('');
      setAvatarUrl('');
      setSelectedCountry('');
      setPrivacySettings({ showOnLeaderboard: true, showPhoto: true, showCountry: true });
      onClose();
    }
  };

  if (!show) return null;

  return (
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
              className="w-full bg-gray-800 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
            >
              <option value="" className="bg-gray-800 text-white">Select Country (optional)</option>
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code} className="bg-gray-800 text-white">{c.flag} {c.name}</option>
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
              <Button onClick={onClose} variant="outline" className="border-white/20">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
