'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { CountryPicker } from './country-picker';

export interface CreateProfileOptions {
  storageMode: 'online' | 'local';
  country: string;
  privacy: { showOnLeaderboard: boolean; showPhoto: boolean; showCountry: boolean };
  /** Optional online-account credentials (email + password login). */
  auth?: { email: string; password: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface CreateCharacterFormProps {
  onCreate: (_name: string, _avatarUrl: string, _options: CreateProfileOptions) => void;
  onCancel: () => void;
  onlineEnabled: boolean;
}

export function CreateCharacterForm({ onCreate, onCancel, onlineEnabled }: CreateCharacterFormProps) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  // Profile storage mode: everyone can decide freely whether the profile
  // lives on the leaderboard server (online) or stays on this device only.
  const [storageMode, setStorageMode] = useState<'online' | 'local'>('local');
  const [privacySettings, setPrivacySettings] = useState({
    showOnLeaderboard: true,
    showPhoto: true,
    showCountry: true,
  });
  // Online account credentials (optional email + password login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [touchedAuth, setTouchedAuth] = useState(false);
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

  const wantsAccount = onlineEnabled && storageMode === 'online' && email.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === passwordRepeat && password.length > 0;
  const authValid = !wantsAccount || (emailValid && passwordValid && passwordsMatch);

  const handleCreate = () => {
    setTouchedAuth(true);
    if (newName.trim() && authValid) {
      onCreate(newName.trim(), avatarUrl, {
        storageMode,
        country: selectedCountry,
        privacy: privacySettings,
        auth: wantsAccount ? { email: email.trim().toLowerCase(), password } : undefined,
      });
      setNewName('');
      setAvatarUrl('');
      setSelectedCountry('');
      setStorageMode('local');
      setEmail('');
      setPassword('');
      setPasswordRepeat('');
      setTouchedAuth(false);
      setPrivacySettings({ showOnLeaderboard: true, showPhoto: true, showCountry: true });
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 mb-6 animate-in slide-in-from-top-2 duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('characterScreen.createProfile')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors overflow-hidden"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={t('profile.avatar')} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-xs text-center">{t('profile.uploadPhoto')}</span>
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
              id="profile-name"
              name="profile-name"
              placeholder={t('profile.namePlaceholder')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />

            {/* ── Country: searchable picker with flags for ALL countries ── */}
            <CountryPicker
              value={selectedCountry}
              onChange={setSelectedCountry}
            />

            {/* ── Profile storage mode: Online or Local (free choice, no force) ── */}
            {onlineEnabled && (
              <div>
                <label className="text-sm text-white/60 mb-2 block">{t('profile.storageMode.title')} *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStorageMode('local')}
                    aria-pressed={storageMode === 'local'}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      storageMode === 'local'
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
                    type="button"
                    onClick={() => setStorageMode('online')}
                    aria-pressed={storageMode === 'online'}
                    className={`p-3 rounded-lg text-left transition-all border ${
                      storageMode === 'online'
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
                {storageMode === 'online' && (
                  <div className="text-xs text-cyan-400/70 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2 mt-2">
                    <span className="block">{t('profile.privacyHint')}</span>
                    <span className="block text-white/40 mt-0.5">{t('profile.privacyHintDesc')}</span>
                  </div>
                )}
              </div>
            )}

            {/* ── Optional online account: email + password for cross-device login ── */}
            {onlineEnabled && storageMode === 'online' && (
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
                <div className="text-sm font-medium text-purple-300 flex items-center gap-2">
                  🔐 {t('profileAuth.accountTitle')}
                </div>
                <p className="text-xs text-white/40">{t('profileAuth.accountDesc')}</p>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('profileAuth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label={t('profileAuth.email')}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('profileAuth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label={t('profileAuth.password')}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('profileAuth.passwordRepeat')}
                  value={passwordRepeat}
                  onChange={(e) => setPasswordRepeat(e.target.value)}
                  aria-label={t('profileAuth.passwordRepeat')}
                  className="bg-white/5 border-white/10 text-white"
                />
                {touchedAuth && wantsAccount && !authValid && (
                  <div className="text-xs text-red-400 space-y-0.5">
                    {!emailValid && <div>{t('profileAuth.emailInvalid')}</div>}
                    {!passwordValid && <div>{t('profileAuth.passwordTooShort')}</div>}
                    {passwordValid && !passwordsMatch && <div>{t('profileAuth.passwordsDontMatch')}</div>}
                  </div>
                )}
                <p className="text-[11px] text-white/30">{t('profileAuth.emailNote')}</p>
              </div>
            )}

            {onlineEnabled && storageMode === 'online' && (
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={privacySettings.showOnLeaderboard}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, showOnLeaderboard: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white/70">{t('profile.showOnLeaderboard')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={privacySettings.showPhoto}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, showPhoto: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white/70">{t('profile.showPhoto')}</span>
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || (touchedAuth && !authValid)}
                className="bg-gradient-to-r from-cyan-500 to-purple-500"
              >
                {t('profile.create')}
              </Button>
              <Button onClick={onCancel} variant="outline" className="border-white/20">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
