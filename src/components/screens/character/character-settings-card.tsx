'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GlobeIcon, CloudUploadIcon } from '@/components/icons';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { PlayerProfile } from '@/types/game';
import { CountryPicker } from './country-picker';
import { ProfileSyncSection } from './profile-sync-section';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';
import { QrWlanHint } from '@/components/qr-wlan-hint';

interface CharacterSettingsCardProps {
  profile: PlayerProfile;
  onlineEnabled: boolean;
  onDelete: () => void;
}

export function CharacterSettingsCard({ profile, onlineEnabled, onDelete }: CharacterSettingsCardProps) {
  const { t } = useTranslation();
  const { updateProfile } = useGameStore();
  const [isEditingCharacter, setIsEditingCharacter] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [localIP, setLocalIP] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    detectLocalIP().then(ip => { if (ip) setLocalIP(ip); });
  }, []);

  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP, undefined, profile.id) : '', 160);

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
    setEditCountry(profile.country || '');
    setIsEditingCharacter(true);
  };

  const cancelEditingCharacter = () => {
    setIsEditingCharacter(false);
    setEditName('');
    setEditAvatarUrl('');
    setEditCountry('');
  };

  const saveEditedCharacter = () => {
    if (editName.trim()) {
      updateProfile(profile.id, {
        name: editName.trim(),
        avatar: editAvatarUrl || undefined,
        country: editCountry || undefined,
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
        <CardTitle className="text-lg">{t('characterScreen.settingsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Edit Character Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white/60">{t('characterScreen.nameAndAvatar')}</h4>
            {!isEditingCharacter && (
              <Button
                size="sm"
                variant="outline"
                onClick={startEditingCharacter}
                className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10"
              >
                {t('common.edit')}
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
                    <span className="text-white/40 text-xs text-center">{t('profile.uploadPhoto')}</span>
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
                  id="edit-profile-name"
                  name="edit-profile-name"
                  placeholder={t('profile.namePlaceholder')}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <CountryPicker
                  value={editCountry}
                  onChange={setEditCountry}
                  compact
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={saveEditedCharacter} 
                    disabled={!editName.trim()} 
                    size="sm"
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 h-7"
                  >
                    {t('common.save')}
                  </Button>
                  <Button 
                    onClick={cancelEditingCharacter} 
                    variant="outline" 
                    size="sm"
                    className="border-white/20 h-7"
                  >
                    {t('common.cancel')}
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
                  {profile.avatar ? t('profile.photoUploaded') : t('profile.noPhoto')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rank Display Options */}
        <div>
          <h4 className="text-sm font-medium text-white/60 mb-3">{t('characterScreen.rankDisplay')}</h4>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-sm text-white/80">{t('characterScreen.showRankInName')}</span>
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
                { id: 'prefix', name: t('characterScreen.rankPrefix'), example: '🎤 Name' },
                { id: 'suffix', name: t('characterScreen.rankSuffix'), example: 'Name 🎤' },
                { id: 'nickname', name: t('characterScreen.rankFull'), example: '🎤 Name (Singer)' },
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

        {/* ── Profile storage mode: Online or Local (switchable later) ── */}
        {onlineEnabled && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-1">{t('profile.storageMode.title')}</h4>
            <p className="text-xs text-white/40 mb-3">{t('profile.storageMode.settingsDesc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => updateProfile(profile.id, { storageMode: 'local' })}
                aria-pressed={(profile.storageMode ?? 'online') === 'local'}
                className={`p-3 rounded-lg text-left transition-all border ${
                  (profile.storageMode ?? 'online') === 'local'
                    ? 'bg-cyan-500/15 border-cyan-500/60 ring-1 ring-cyan-400/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <span>💾</span> {t('profile.storageMode.local')}
                </div>
                <div className="text-xs text-white/50 mt-1">{t('profile.storageMode.localDesc')}</div>
              </button>
              <button
                onClick={() => updateProfile(profile.id, { storageMode: 'online' })}
                aria-pressed={profile.storageMode === 'online'}
                className={`p-3 rounded-lg text-left transition-all border ${
                  profile.storageMode === 'online'
                    ? 'bg-purple-500/15 border-purple-500/60 ring-1 ring-purple-400/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <span>🌐</span> {t('profile.storageMode.online')}
                </div>
                <div className="text-xs text-white/50 mt-1">{t('profile.storageMode.onlineDesc')}</div>
              </button>
            </div>
          </div>
        )}

        {/* Country & Privacy — only relevant for online profiles */}
        {onlineEnabled && (profile.storageMode ?? 'online') !== 'local' && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-3">{t('characterScreen.countryAndPrivacy')}</h4>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">{t('characterScreen.selectCountry')}:</span>
                <CountryPicker
                  value={profile.country || ''}
                  onChange={handleUpdateCountry}
                  compact
                  className="min-w-[180px] max-w-[280px]"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdatePrivacy('showOnLeaderboard', !(profile.privacy?.showOnLeaderboard ?? true))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    (profile.privacy?.showOnLeaderboard ?? true) ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  <GlobeIcon className="w-3 h-3" />
                  {(profile.privacy?.showOnLeaderboard ?? true) ? t('characterScreen.visible') : t('characterScreen.hidden')}
                </button>
                <button
                  onClick={() => handleUpdatePrivacy('showPhoto', !(profile.privacy?.showPhoto ?? true))}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    (profile.privacy?.showPhoto ?? true) ? 'bg-purple-500/30 text-purple-300' : 'bg-white/10 text-white/50'
                  }`}
                >
                  📷 {(profile.privacy?.showPhoto ?? true) ? t('characterScreen.shown') : t('characterScreen.hidden')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Sync Section — only for online profiles */}
        {onlineEnabled && (profile.storageMode ?? 'online') !== 'local' && (
          <div className="pt-3 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
              <CloudUploadIcon className="w-4 h-4" /> {t('profileSync.title')}
            </h4>
            <ProfileSyncSection profile={profile} />
          </div>
        )}

        {/* Companion App QR Code */}
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/60 mb-3">{t('characterScreen.companionAppLink')}</h4>
          <p className="text-xs text-white/40 mb-3">
            {t('characterScreen.companionAppLinkDesc')}
          </p>
          <button
            onClick={() => setShowQR(!showQR)}
            className="px-3 py-1.5 rounded-lg text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
          >
            {showQR ? t('characterScreen.hideQrCode') : t('characterScreen.showQrCode')}
          </button>
          {showQR && localIP && (
            <div className="mt-3">
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2">
                  {qrCodeSrc ? <img src={qrCodeSrc} alt="QR Code" className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
                </div>
                <p className="text-xs text-white/40 font-mono break-all">
                  {buildCompanionUrl(localIP, undefined, profile.id)}
                </p>
              </div>
              <QrWlanHint />
            </div>
          )}
          {showQR && !localIP && (
            <p className="text-xs text-white/40 mt-2">{t('mobile.detectingNetwork')}</p>
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
            {t('profile.delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
