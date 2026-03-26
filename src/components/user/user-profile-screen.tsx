// User Profile Screen - Manages guest and synced profiles
// Supports: Guest mode, Profile sync, Character customization

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getUserDatabase, 
  ExtendedPlayerProfile, 
  generateSyncCode,
  MultiplayerRoom 
} from '@/lib/db/user-db';
import { getRoomService } from '@/lib/multiplayer/room-service';
import { useWebSocket } from '@/hooks/use-websocket';
import { PLAYER_COLORS, getRankTitle, PlayerStats } from '@/types/game';
import { createEmptyPerformanceStats, getPerformanceGrade } from '@/lib/game/performance-analytics';
import { logger } from '@/lib/logger';

// Icons
function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function GuestIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="16" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// Props for the profile screen
interface UserProfileScreenProps {
  onProfileChange?: (profile: ExtendedPlayerProfile | null) => void;
  activeProfileId?: string | null;
  onSetActiveProfile?: (profileId: string) => void;
}

export function UserProfileScreen({ 
  onProfileChange, 
  activeProfileId,
  onSetActiveProfile 
}: UserProfileScreenProps) {
  const [profiles, setProfiles] = useState<ExtendedPlayerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExtendedPlayerProfile | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState('');
  const [newProfileColor, setNewProfileColor] = useState<typeof PLAYER_COLORS[number]>(PLAYER_COLORS[0]);
  const [isGuest, setIsGuest] = useState(true);
  const [syncCode, setSyncCode] = useState('');

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const db = getUserDatabase();
      await db.init();
      const allProfiles = await db.getAllProfiles();
      setProfiles(allProfiles);
    } catch (error) {
      logger.error('[UserProfile]', 'Failed to load profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    try {
      const db = getUserDatabase();
      await db.init();
      
      const profile = isGuest 
        ? await db.createGuestProfile(newProfileName.trim(), newProfileAvatar || undefined)
        : await db.createSyncedProfile(newProfileName.trim(), newProfileAvatar || undefined);
      
      // Update color if provided
      if (profile && newProfileColor) {
        await db.updateProfile(profile.id, { color: newProfileColor });
        profile.color = newProfileColor;
      }

      setProfiles(prev => [...prev, profile]);
      setShowCreateDialog(false);
      resetForm();
      
      if (onProfileChange) {
        onProfileChange(profile);
      }
      
      // Auto-activate new profile
      if (onSetActiveProfile) {
        onSetActiveProfile(profile.id);
      }
    } catch (error) {
      logger.error('[UserProfile]', 'Failed to create profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editingProfile || !newProfileName.trim()) return;

    try {
      const db = getUserDatabase();
      await db.init();
      
      const updated = await db.updateProfile(editingProfile.id, {
        name: newProfileName.trim(),
        avatar: newProfileAvatar || undefined,
        color: newProfileColor,
      });

      if (updated) {
        setProfiles(prev => prev.map(p => p.id === updated.id ? updated : p));
        setShowEditDialog(false);
        resetForm();
        
        if (onProfileChange) {
          onProfileChange(updated);
        }
      }
    } catch (error) {
      logger.error('[UserProfile]', 'Failed to update profile:', error);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (!confirm('Are you sure you want to delete this profile? This action cannot be undone.')) {
      return;
    }

    try {
      const db = getUserDatabase();
      await db.init();
      await db.deleteProfile(profileId);
      
      setProfiles(prev => prev.filter(p => p.id !== profileId));
      
      if (activeProfileId === profileId && onSetActiveProfile && profiles.length > 1) {
        const nextProfile = profiles.find(p => p.id !== profileId);
        if (nextProfile) {
          onSetActiveProfile(nextProfile.id);
        }
      }
    } catch (error) {
      logger.error('[UserProfile]', 'Failed to delete profile:', error);
    }
  };

  const handleSyncProfiles = async () => {
    if (!syncCode.trim()) return;

    try {
      const db = getUserDatabase();
      await db.init();
      
      const existingProfile = await db.getProfileBySyncCode(syncCode.trim().toUpperCase());
      
      if (existingProfile) {
        // Link this device to existing profile
        alert(`Found profile: ${existingProfile.name}. Device linked successfully!`);
        setShowSyncDialog(false);
        setSyncCode('');
      } else {
        alert('Invalid sync code. Please check and try again.');
      }
    } catch (error) {
      logger.error('[UserProfile]', 'Failed to sync profiles:', error);
      alert('Failed to sync profiles. Please try again.');
    }
  };

  const resetForm = () => {
    setNewProfileName('');
    setNewProfileAvatar('');
    setNewProfileColor(PLAYER_COLORS[0]);
    setIsGuest(true);
    setEditingProfile(null);
    setSyncCode('');
  };

  const openEditDialog = (profile: ExtendedPlayerProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setNewProfileAvatar(profile.avatar || '');
    setNewProfileColor(profile.color as typeof PLAYER_COLORS[number]);
    setShowEditDialog(true);
  };

  // Get stats display
  const getStatsDisplay = (profile: ExtendedPlayerProfile) => {
    const stats = profile.stats || createEmptyPerformanceStats();
    const gamesPlayed = profile.gamesPlayed || 0;
    const totalScore = profile.totalScore || 0;
    const avgScore = gamesPlayed > 0 ? Math.round(totalScore / gamesPlayed) : 0;

    return {
      gamesPlayed,
      totalScore,
      avgScore,
      bestCombo: stats.bestCombo || 0,
    };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">User Profiles</h2>
          <p className="text-white/60 mt-1">
            Manage your profiles for local play and multiplayer
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowSyncDialog(true)}
            className="border-white/20"
          >
            <LinkIcon className="w-4 h-4 mr-2" /> Sync Device
          </Button>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            <UserIcon className="w-4 h-4 mr-2" /> New Profile
          </Button>
        </div>
      </div>

      {/* Profile List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      ) : profiles.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <UserIcon className="w-16 h-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Profiles Yet</h3>
            <p className="text-white/60 mb-6">
              Create your first profile to start tracking your scores and achievements!
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              <UserIcon className="w-4 h-4 mr-2" /> Create Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {profiles.map(profile => {
            const stats = getStatsDisplay(profile);
            const isActive = activeProfileId === profile.id;

            return (
              <Card 
                key={profile.id}
                className={`bg-white/5 border-white/10 transition-all cursor-pointer ${
                  isActive ? 'ring-2 ring-cyan-500 border-cyan-500/50' : 'hover:border-white/20'
                }`}
                onClick={() => onSetActiveProfile?.(profile.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
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

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{profile.name}</h3>
                          {isActive && (
                            <Badge className="bg-cyan-500/30 text-cyan-300 border-cyan-500/50">
                              Active
                            </Badge>
                          )}
                          {profile.isGuest ? (
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                              <GuestIcon className="w-3 h-3 mr-1" /> Guest
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-500/50 text-green-400">
                              <SyncIcon className="w-3 h-3 mr-1" /> Synced
                            </Badge>
                          )}
                        </div>
                        
                        {/* Sync Code */}
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <span>Sync Code:</span>
                          <code className="bg-black/30 px-2 py-0.5 rounded font-mono">
                            {profile.syncCode}
                          </code>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <TrophyIcon className="w-4 h-4 text-yellow-500" />
                            <span>{stats.gamesPlayed} games</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-cyan-400">Avg:</span>
                            <span>{stats.avgScore.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-purple-400">Best Combo:</span>
                            <span>{stats.bestCombo}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(profile);
                        }}
                      >
                        <SettingsIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfile(profile.id);
                        }}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-cyan-400 mt-0.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">Profile Types</p>
              <p><strong>Guest:</strong> Local-only profile. Data stays on this device.</p>
              <p><strong>Synced:</strong> Can sync across devices using your sync code.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Profile Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Create a profile to track your scores and achievements.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Profile Type */}
            <div className="flex gap-2">
              <Button
                variant={isGuest ? 'default' : 'outline'}
                onClick={() => setIsGuest(true)}
                className={isGuest ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-white/20'}
              >
                <GuestIcon className="w-4 h-4 mr-2" /> Guest
              </Button>
              <Button
                variant={!isGuest ? 'default' : 'outline'}
                onClick={() => setIsGuest(false)}
                className={!isGuest ? 'bg-green-500 hover:bg-green-600' : 'border-white/20'}
              >
                <SyncIcon className="w-4 h-4 mr-2" /> Synced
              </Button>
            </div>

            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-white/5 border-white/20"
                maxLength={20}
              />
            </div>

            {/* Avatar URL (optional) */}
            <div>
              <label className="text-sm font-medium mb-2 block">Avatar URL (optional)</label>
              <Input
                value={newProfileAvatar}
                onChange={(e) => setNewProfileAvatar(e.target.value)}
                placeholder="https://..."
                className="bg-white/5 border-white/20"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PLAYER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewProfileColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newProfileColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-white/5 border-white/20"
                maxLength={20}
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="text-sm font-medium mb-2 block">Avatar URL</label>
              <Input
                value={newProfileAvatar}
                onChange={(e) => setNewProfileAvatar(e.target.value)}
                placeholder="https://..."
                className="bg-white/5 border-white/20"
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PLAYER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewProfileColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      newProfileColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleUpdateProfile} disabled={!newProfileName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Device Dialog */}
      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent className="bg-gray-900 border-white/20">
          <DialogHeader>
            <DialogTitle>Sync with Another Device</DialogTitle>
            <DialogDescription>
              Enter your sync code from another device to link your profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sync Code</label>
              <Input
                value={syncCode}
                onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character code..."
                className="bg-white/5 border-white/20 font-mono text-center text-lg tracking-widest"
                maxLength={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSyncDialog(false); setSyncCode(''); }} className="border-white/20">
              Cancel
            </Button>
            <Button onClick={handleSyncProfiles} disabled={syncCode.length !== 8}>
              <LinkIcon className="w-4 h-4 mr-2" /> Link Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UserProfileScreen;
