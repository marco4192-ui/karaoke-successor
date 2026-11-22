'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/translations';
import { CountryPicker } from '@/components/screens/character/country-picker';
import { EMAIL_RE } from './mobile-profile-bridge';

/**
 * R93g: online-account options for the companion profile creation — the
 * EXACT same fields, validation rules and wording as the desktop
 * CreateCharacterForm (storage mode, country, e-mail + password + repeat,
 * privacy checkboxes), just laid out for a phone screen.
 *
 * State is owned by the parent (MobileProfileCreateView → controlled props
 * via onChange), so the create button's disabled state is always accurate:
 * `wantsAccount && !auth` must disable the create button (identical to the
 * desktop rule `wantsAccount && !authValid`).
 */
export interface MobileAccountOptions {
  storageMode: 'online' | 'local';
  country: string;
  privacy: { showOnLeaderboard: boolean; showPhoto: boolean; showCountry: boolean };
  /** True when the user typed an e-mail → account INTENT (like desktop). */
  wantsAccount: boolean;
  /** Credentials — only set when fully valid (format, length ≥ 8, match). */
  auth?: { email: string; password: string };
}

export const DEFAULT_MOBILE_ACCOUNT_OPTIONS: MobileAccountOptions = {
  storageMode: 'local',
  country: '',
  privacy: { showOnLeaderboard: true, showPhoto: true, showCountry: true },
  wantsAccount: false,
};

interface MobileAccountFieldsProps {
  options: MobileAccountOptions;
  onChange: (_next: MobileAccountOptions) => void;
}

export function MobileAccountFields({ options, onChange }: MobileAccountFieldsProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');

  const { storageMode, country, privacy } = options;

  // Same validity logic as the desktop form
  const wantsAccount = storageMode === 'online' && email.trim().length > 0;
  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === passwordRepeat && password.length > 0;
  const authValid = !wantsAccount || (emailValid && passwordValid && passwordsMatch);

  /** Push the full option state up — recomputes intent + validity. */
  const push = (
    patch: Partial<Pick<MobileAccountOptions, 'storageMode' | 'country' | 'privacy'>> & {
      email?: string;
      password?: string;
    } = {},
  ) => {
    const nextEmail = patch.email ?? email;
    const nextPassword = patch.password ?? password;
    const nextStorageMode = patch.storageMode ?? storageMode;
    const nextWantsAccount = nextStorageMode === 'online' && nextEmail.trim().length > 0;
    const nextEmailValid = EMAIL_RE.test(nextEmail.trim());
    const nextPasswordValid = nextPassword.length >= 8;
    // The repeat field lives in local state — a typed password only becomes
    // a submitted credential once it is confirmed by the repeat field.
    const nextMatches = nextPassword === passwordRepeat && nextPassword.length > 0;
    onChange({
      storageMode: nextStorageMode,
      country: patch.country ?? country,
      privacy: patch.privacy ?? privacy,
      wantsAccount: nextWantsAccount,
      auth: nextWantsAccount && nextEmailValid && nextPasswordValid && nextMatches
        ? { email: nextEmail.trim().toLowerCase(), password: nextPassword }
        : undefined,
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Country (same picker as the desktop) ── */}
      <CountryPicker
        value={country}
        onChange={(next) => push({ country: next })}
      />

      {/* ── Profile storage mode: Online or Local (same cards as desktop) ── */}
      <div>
        <label className="text-sm text-white/60 mb-2 block">{t('profile.storageMode.title')} *</label>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() => push({ storageMode: 'local' })}
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
            onClick={() => push({ storageMode: 'online' })}
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

      {/* ── Optional online account: e-mail + password (same as desktop) ── */}
      {storageMode === 'online' && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 space-y-2">
          <div className="text-sm font-medium text-purple-300 flex items-center gap-2">
            🔐 {t('profileAuth.accountTitle')}
          </div>
          <p className="text-xs text-white/40">{t('profileAuth.accountDesc')}</p>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t('profileAuth.emailPlaceholder')}
            value={email}
            onChange={(e) => { setEmail(e.target.value); push({ email: e.target.value }); }}
            aria-label={t('profileAuth.email')}
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.passwordPlaceholder')}
            value={password}
            onChange={(e) => { setPassword(e.target.value); push({ password: e.target.value }); }}
            aria-label={t('profileAuth.password')}
            className="bg-white/5 border-white/10 text-white"
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t('profileAuth.passwordRepeat')}
            value={passwordRepeat}
            onChange={(e) => {
              setPasswordRepeat(e.target.value);
              // Re-validate: the match depends on the repeat field too
              const nextMatches = password === e.target.value && password.length > 0;
              onChange({
                storageMode,
                country,
                privacy,
                wantsAccount,
                auth: wantsAccount && emailValid && passwordValid && nextMatches
                  ? { email: email.trim().toLowerCase(), password }
                  : undefined,
              });
            }}
            aria-label={t('profileAuth.passwordRepeat')}
            className="bg-white/5 border-white/10 text-white"
          />
          {(wantsAccount && !authValid && (email.trim().length > 3 || password.length > 0)) && (
            <div className="text-xs text-red-400 space-y-0.5" data-testid="mobile-account-errors">
              {!emailValid && <div>{t('profileAuth.emailInvalid')}</div>}
              {!passwordValid && <div>{t('profileAuth.passwordTooShort')}</div>}
              {passwordValid && !passwordsMatch && <div>{t('profileAuth.passwordsDontMatch')}</div>}
            </div>
          )}
          <p className="text-[11px] text-white/30">{t('profileAuth.emailNote')}</p>
        </div>
      )}

      {/* ── Privacy checkboxes (same as desktop) ── */}
      {storageMode === 'online' && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={privacy.showOnLeaderboard}
              onChange={(e) => push({ privacy: { ...privacy, showOnLeaderboard: e.target.checked } })}
              className="w-4 h-4 rounded"
            />
            <span className="text-white/70">{t('profile.showOnLeaderboard')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={privacy.showPhoto}
              onChange={(e) => push({ privacy: { ...privacy, showPhoto: e.target.checked } })}
              className="w-4 h-4 rounded"
            />
            <span className="text-white/70">{t('profile.showPhoto')}</span>
          </label>
        </div>
      )}
    </div>
  );
}
