/**
 * Hook for managing mobile client profile
 */

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

export interface UseMobileProfileOptions {
  clientId: string | null;
  onConnectionCodeUpdate?: (code: string) => void;
}

export interface UseMobileProfileReturn {
  profile: MobileProfile | null;
  profileName: string;
  profileColor: string;
  avatarPreview: string | null;
  profileColors: string[];
  setProfileName: (name: string) => void;
  setProfileColor: (color: string) => void;
  setAvatarPreview: (preview: string | null) => void;
  createProfile: () => void;
  saveProfile: (profile: MobileProfile) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loadSavedProfile: () => void;
}

export function useMobileProfile(
  options: UseMobileProfileOptions
): UseMobileProfileReturn {
  const { clientId, onConnectionCodeUpdate } = options;

  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileColors = [
    '#06B6D4',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#EF4444',
    '#3B82F6',
    '#F97316',
  ];

  // Sync profile to server
  const syncProfile = useCallback(
    async (profileData: MobileProfile) => {
      if (!clientId) return;
      try {
        const data = await apiClient.mobileProfile(clientId, profileData);
        if (data.connectionCode && onConnectionCodeUpdate) {
          onConnectionCodeUpdate(data.connectionCode as string);
          localStorage.setItem('karaoke-connection-code', data.connectionCode as string);
        }
      } catch {
        // Ignore sync errors
      }
    },
    [clientId, onConnectionCodeUpdate]
  );

  // Create profile
  const createProfile = useCallback(() => {
    if (!profileName.trim()) return;

    const newProfile: MobileProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: profileName.trim(),
      avatar: avatarPreview || undefined,
      color: profileColor,
      createdAt: Date.now(),
    };

    setProfile(newProfile);
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(newProfile));
    syncProfile(newProfile);
  }, [profileName, avatarPreview, profileColor, syncProfile]);

  // Save profile changes
  const saveProfile = useCallback(
    (updatedProfile: MobileProfile) => {
      setProfile(updatedProfile);
      localStorage.setItem('karaoke-mobile-profile', JSON.stringify(updatedProfile));
      syncProfile(updatedProfile);
    },
    [syncProfile]
  );

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // Load saved profile from localStorage
  const loadSavedProfile = useCallback(() => {
    const savedProfile = localStorage.getItem('karaoke-mobile-profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile) as MobileProfile;
        setProfile(parsed);
        setProfileName(parsed.name);
        setProfileColor(parsed.color);
        setAvatarPreview(parsed.avatar || null);
        return parsed;
      } catch {
        // Ignore parse errors
      }
    }
    return null;
  }, []);

  return {
    profile,
    profileName,
    profileColor,
    avatarPreview,
    profileColors,
    setProfileName,
    setProfileColor,
    setAvatarPreview,
    createProfile,
    saveProfile,
    handlePhotoUpload,
    loadSavedProfile,
  };
}
