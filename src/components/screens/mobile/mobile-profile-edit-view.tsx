'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StorageKeys, getItem } from '@/lib/storage';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import type { MobileProfile } from './mobile-types';
import { loadUserStats } from '@/lib/mobile-achievements';
import type { UserStats } from '@/lib/mobile-achievements';
import { MobileAchievements } from './mobile-achievements';

interface ProfileEditViewProps {
  profile: MobileProfile;
  profileName: string;
  onProfileNameChange: (_value: string) => void;
  profileColor: string;
  onProfileColorChange: (_color: string) => void;
  avatarPreview: string | null;
  connectionCode: string;
  profileColors: readonly string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSave: () => void;
  onPhotoUpload: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onSwitchToHostProfile?: (_hostProfile: MobileProfile) => void;
}

export function MobileProfileEditView({
  profile,
  profileName,
  onProfileNameChange,
  profileColor,
  onProfileColorChange,
  connectionCode,
  profileColors,
  fileInputRef,
  onSave,
  onPhotoUpload,
  onSwitchToHostProfile,
}: ProfileEditViewProps) {
  const { t } = useTranslation();
  const [hostProfiles, setHostProfiles] = useState<MobileProfile[]>([]);
  const [claimedProfileIds, setClaimedProfileIds] = useState<string[]>([]);
  const [hostProfilesError, setHostProfilesError] = useState<string | null>(null);
  const [confirmSwitchId, setConfirmSwitchId] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  // Reset confirmation state after 3 seconds
  const requestSwitchConfirm = useCallback((profileId: string) => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
    }
    setConfirmSwitchId(profileId);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmSwitchId(null);
      confirmTimerRef.current = null;
    }, 3000);
  }, []);

  const cancelSwitch = useCallback(() => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setConfirmSwitchId(null);
  }, []);

  const confirmSwitch = useCallback((hp: MobileProfile) => {
    if (confirmTimerRef.current) {
      clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    setConfirmSwitchId(null);
    onSwitchToHostProfile?.(hp);
  }, [onSwitchToHostProfile]);

  // Load user stats for achievements
  useEffect(() => {
    setUserStats(loadUserStats());
  }, []);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (confirmTimerRef.current) {
        clearTimeout(confirmTimerRef.current);
      }
    };
  }, []);

  // Fetch host profiles so the user can switch to a different host character
  React.useEffect(() => {
    const fetchHostProfiles = async () => {
      try {
        const storedClientId = getItem(StorageKeys.CLIENT_ID);
        const clientIdParam = storedClientId ? `&clientId=${storedClientId}` : '';
        const response = await fetch(`/api/mobile?action=hostprofiles${clientIdParam}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.profiles) {
          setHostProfiles(data.profiles);
          setClaimedProfileIds(data.claimedProfileIds || []);
        }
      } catch (err) {
        setHostProfilesError(err instanceof Error ? err.message : 'Failed to load profiles');
      }
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
                {t('mobileViews.code').replace('{n}', connectionCode)}
              </Badge>
            )}
          </div>

          {hostProfilesError && (
            <div className="text-red-400 text-sm text-center mb-4">{hostProfilesError}</div>
          )}

          {/* Switch to Host Profile */}
          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg">👤</span>
                <h3 className="font-bold text-sm">{t('mobileViews.switchProfile')}</h3>
              </div>
              <p className="text-xs text-white/40">
                {t('mobileViews.switchProfileDesc')}
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {availableHostProfiles.map((hp) => (
                  confirmSwitchId === hp.id ? (
                    <div
                      key={hp.id}
                      className="flex items-center gap-3 p-2 rounded-lg w-full bg-cyan-500/15 border border-cyan-500/30"
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
                        <span className="text-sm font-semibold block truncate">{hp.name}</span>
                        <span className="text-xs text-amber-400/80 block truncate">
                          {t('mobileViews.switchProfileWarning')}
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => confirmSwitch(hp)}
                          className="text-xs px-2.5 py-1 rounded-md bg-cyan-500 text-white font-medium hover:bg-cyan-400 transition-colors"
                        >
                          {t('mobileViews.confirm')}
                        </button>
                        <button
                          onClick={cancelSwitch}
                          className="text-xs px-2.5 py-1 rounded-md bg-white/10 text-white/70 font-medium hover:bg-white/20 transition-colors"
                        >
                          {t('mobileViews.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={hp.id}
                      onClick={() => requestSwitchConfirm(hp.id)}
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
                      <span className="text-xs text-cyan-400">{t('mobileViews.select')}</span>
                    </button>
                  )
                ))}
              </div>
            </div>
          )}

          {availableHostProfiles.length > 0 && onSwitchToHostProfile && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">{t('mobileViews.orEdit')}</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
          )}
          
          {/* Name Edit */}
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">{t('mobileViews.name')}</label>
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
              <label className="text-sm text-white/60 mb-2 block">{t('mobileViews.color')}</label>
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
              disabled={!profileName.trim()}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 disabled:opacity-50"
            >
              {t('mobileViews.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Section */}
      {userStats && (
        <Card className="bg-white/10 border-white/20 mt-4">
          <CardContent className="py-6">
            <MobileAchievements stats={userStats} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
