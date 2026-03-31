'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

interface MobileProfileSectionProps {
  clientId: string | null;
  connectionCode: string | null;
}

// Avatar color options
const AVATAR_COLORS = [
  '#22d3ee', // Cyan
  '#a855f7', // Purple
  '#f43f5e', // Rose
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#ec4899', // Pink
  '#84cc16', // Lime
];

export function MobileProfileSection({ clientId, connectionCode }: MobileProfileSectionProps) {
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile from server
  const loadProfile = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const res = await fetch(`/api/mobile?action=profile&clientId=${clientId}`);
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
      }
    } catch {
      // No profile yet
    }
  }, [clientId]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Create or update profile
  const saveProfile = useCallback(async () => {
    if (!clientId || !name.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const newProfile: MobileProfile = {
        id: profile?.id || `profile-${Date.now()}`,
        name: name.trim(),
        avatar: avatarUrl || undefined,
        color: selectedColor,
        createdAt: profile?.createdAt || Date.now(),
      };
      
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'profile',
          clientId,
          payload: newProfile,
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        setProfile(newProfile);
        setIsCreating(false);
        setIsEditing(false);
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch {
      setError('Failed to save profile');
    } finally {
      setLoading(false);
    }
  }, [clientId, name, avatarUrl, selectedColor, profile]);

  // Handle file upload for avatar
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

  // Cancel creation/editing
  const cancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setName(profile?.name || '');
    setAvatarUrl(profile?.avatar || '');
    setSelectedColor(profile?.color || AVATAR_COLORS[0]);
    setError(null);
  };

  // Start editing
  const startEditing = () => {
    setName(profile?.name || '');
    setAvatarUrl(profile?.avatar || '');
    setSelectedColor(profile?.color || AVATAR_COLORS[0]);
    setIsEditing(true);
  };

  // Show create form if no profile exists
  if (!profile && !isCreating) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="py-6 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-white/60 mb-4">No character created yet</p>
          <Button 
            onClick={() => {
              setName('');
              setAvatarUrl('');
              setSelectedColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
              setIsCreating(true);
            }}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            Create Character
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show create/edit form
  if (isCreating || isEditing) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{isEditing ? 'Edit Character' : 'Create Character'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar and Color Selection */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden flex-shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: selectedColor }}
                >
                  {name.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </button>
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex-1">
              <p className="text-xs text-white/60 mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Name Input */}
          <Input
            placeholder="Character name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10 text-white"
          />
          
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={saveProfile} 
              disabled={!name.trim() || loading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {loading ? 'Saving...' : (isEditing ? 'Save' : 'Create')}
            </Button>
            <Button onClick={cancel} variant="outline" className="border-white/20">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show profile card
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-white/20"
            style={{ backgroundColor: profile?.color }}
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile?.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{profile?.name}</h3>
            <p className="text-white/60 text-sm">Connected as</p>
            {connectionCode && (
              <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400 mt-1">
                {connectionCode}
              </Badge>
            )}
          </div>
          <Button onClick={startEditing} variant="outline" size="sm" className="border-white/20">
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MobileProfileSection;
