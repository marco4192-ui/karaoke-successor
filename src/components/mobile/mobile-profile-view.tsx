'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

interface MobileProfileViewProps {
  profile: MobileProfile;
  profileName: string;
  profileColor: string;
  avatarPreview: string | null;
  connectionCode: string | null;
  profileColors: string[];
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (profile: MobileProfile) => void;
}

/**
 * Profile editing view for mobile companion app
 * Shows user profile with editing capabilities
 */
export function MobileProfileView({
  profile,
  profileName,
  profileColor,
  avatarPreview,
  connectionCode,
  profileColors,
  onNameChange,
  onColorChange,
  onPhotoUpload,
  onSave,
}: MobileProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                <span className="text-4xl font-bold flex items-center justify-center h-full">
                  {profile.name[0]}
                </span>
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

          {/* Name Edit */}
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">
                Name
              </label>
              <Input
                id="edit-profile-name"
                name="edit-profile-name"
                value={profileName}
                onChange={(e) => onNameChange(e.target.value)}
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
                    onClick={() => onColorChange(color)}
                    className={`w-10 h-10 rounded-full transition-transform ${
                      profileColor === color ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={() => {
                const updated = {
                  ...profile,
                  name: profileName,
                  color: profileColor,
                  avatar: avatarPreview || undefined,
                };
                onSave(updated);
              }}
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

export default MobileProfileView;
