'use client';

import { useState, useEffect } from 'react';
import { getUserDatabase, ExtendedPlayerProfile } from '@/lib/db/user-db';
import { PLAYER_COLORS } from '@/types/game';
import { logger } from '@/lib/logger';

interface UseUserProfileOptions {
  onProfileChange?: (profile: ExtendedPlayerProfile | null) => void;
  activeProfileId?: string | null;
  onSetActiveProfile?: (profileId: string) => void;
}

export function useUserProfile({
  onProfileChange,
  activeProfileId,
  onSetActiveProfile,
}: UseUserProfileOptions) {
  const [profiles, setProfiles] = useState<ExtendedPlayerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ExtendedPlayerProfile | null>(null);

  // Form state
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

      if (profile && newProfileColor) {
        await db.updateProfile(profile.id, { color: newProfileColor });
        profile.color = newProfileColor;
      }

      setProfiles((prev) => [...prev, profile]);
      setShowCreateDialog(false);
      resetForm();

      if (onProfileChange) {
        onProfileChange(profile);
      }

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
        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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

      setProfiles((prev) => prev.filter((p) => p.id !== profileId));

      if (activeProfileId === profileId && onSetActiveProfile && profiles.length > 1) {
        const nextProfile = profiles.find((p) => p.id !== profileId);
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

  return {
    // State
    profiles,
    isLoading,
    showCreateDialog,
    setShowCreateDialog,
    showEditDialog,
    setShowEditDialog,
    showSyncDialog,
    setShowSyncDialog,
    editingProfile,
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

    // Actions
    handleCreateProfile,
    handleUpdateProfile,
    handleDeleteProfile,
    handleSyncProfiles,
    resetForm,
    openEditDialog,
  };
}
