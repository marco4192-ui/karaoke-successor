// User Profile Screen - Manages guest and synced profiles
// Supports: Guest mode, Profile sync, Character customization

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ExtendedPlayerProfile } from '@/lib/db/user-db';
import { PLAYER_COLORS } from '@/types/game';

// Import extracted components and hook
import { UserIcon, LinkIcon, InfoIcon } from './profile-icons';
import { ProfileCard } from './profile-card';
import { ProfileFormFields } from './profile-form-fields';
import { useUserProfile } from '@/hooks/use-user-profile';

// Props for the profile screen
interface UserProfileScreenProps {
  onProfileChange?: (profile: ExtendedPlayerProfile | null) => void;
  activeProfileId?: string | null;
  onSetActiveProfile?: (profileId: string) => void;
}

export function UserProfileScreen({
  onProfileChange,
  activeProfileId,
  onSetActiveProfile,
}: UserProfileScreenProps) {
  const {
    profiles,
    isLoading,
    showCreateDialog,
    setShowCreateDialog,
    showEditDialog,
    setShowEditDialog,
    showSyncDialog,
    setShowSyncDialog,
    newProfileName,
    setNewProfileName,
    newProfileAvatar,
    setNewProfileAvatar,
    newProfileColor,
    setNewProfileColor,
    isGuest,
    setIsGuest,
    syncCode,
    setSyncCode,
    handleCreateProfile,
    handleUpdateProfile,
    handleDeleteProfile,
    handleSyncProfiles,
    resetForm,
    openEditDialog,
  } = useUserProfile({
    onProfileChange,
    activeProfileId,
    onSetActiveProfile,
  });

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
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={activeProfileId === profile.id}
              onSelect={() => onSetActiveProfile?.(profile.id)}
              onEdit={() => openEditDialog(profile)}
              onDelete={() => handleDeleteProfile(profile.id)}
            />
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-cyan-400 mt-0.5">
              <InfoIcon className="w-5 h-5" />
            </div>
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">Profile Types</p>
              <p>
                <strong>Guest:</strong> Local-only profile. Data stays on this device.
              </p>
              <p>
                <strong>Synced:</strong> Can sync across devices using your sync code.
              </p>
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

          <div className="py-4">
            <ProfileFormFields
              name={newProfileName}
              onNameChange={setNewProfileName}
              avatar={newProfileAvatar}
              onAvatarChange={setNewProfileAvatar}
              color={newProfileColor}
              onColorChange={(color) => setNewProfileColor(color as typeof PLAYER_COLORS[number])}
              showTypeSelector
              isGuest={isGuest}
              onGuestChange={setIsGuest}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetForm();
              }}
              className="border-white/20"
            >
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

          <div className="py-4">
            <ProfileFormFields
              name={newProfileName}
              onNameChange={setNewProfileName}
              avatar={newProfileAvatar}
              onAvatarChange={setNewProfileAvatar}
              color={newProfileColor}
              onColorChange={(color) => setNewProfileColor(color as typeof PLAYER_COLORS[number])}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                resetForm();
              }}
              className="border-white/20"
            >
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

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Sync Code</label>
            <input
              value={syncCode}
              onChange={(e) => setSyncCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character code..."
              className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 font-mono text-center text-lg tracking-widest"
              maxLength={8}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSyncDialog(false);
                setSyncCode('');
              }}
              className="border-white/20"
            >
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
