'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { PerformanceDisplay } from '@/components/game/game-enhancements';
import { useTranslation } from '@/lib/i18n/translations';
import {
  MusicIcon,
  PlayIcon,
  PartyIcon,
  MicIcon,
  PhoneIcon
} from '@/components/icons';
import type { Screen } from '@/types/screens';
import { detectLocalIP, buildCompanionUrl } from '@/lib/qr-code';
import { useQRCode } from '@/hooks/use-qr-code';

interface HomeScreenProps {
  onNavigate: (_screen: Screen) => void;
}

// Dynamic app stats (reflects actual game modes and difficulty levels)
const PARTY_GAME_COUNT = 9; // battle-royale, tournament, pass-the-mic, companion-singalong, medley, rate-my-song, blind, missing-words, online
const DIFFICULTY_LEVELS = 3; // easy, medium, hard

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { t } = useTranslation();
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  // Track if component is mounted (to avoid hydration mismatch)
  const [isMounted, setIsMounted] = useState(false);
  
  // Detect local IP for QR code
  const [localIP, setLocalIP] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setIsMounted(true);
    detectLocalIP().then(ip => { if (ip) setLocalIP(ip); });
  }, []);
  
  const qrCodeSrc = useQRCode(localIP ? buildCompanionUrl(localIP) : '', 160);
  
  // Get song count from library — recomputed every render so it stays
  // in sync when songs are added/removed.  getAllSongs() is O(1) when
  // cached (module-level in-memory cache), so this is effectively free.
  const songCount = typeof window === 'undefined' ? 0 : getAllSongs().length;
  
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8">
      {/* ═══ HERO SECTION — Retro Karaoke Vibe ═══ */}
      <div className="relative text-center py-16 retro-scanlines">
        {/* Animated rainbow bar behind title */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 retro-gradient-rainbow rounded-full" />
        
        {/* Logo icon — neon pink glow ring */}
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-[#ff2d95] via-[#bf5af2] to-[#00e5ff] mb-6 retro-box-glow-pink relative">
          <MusicIcon className="w-16 h-16 text-white drop-shadow-lg" />
          {/* Corner sparkles */}
          <span className="absolute -top-2 -right-2 text-[#ffd60a] text-xs animate-pulse">&#10022;</span>
          <span className="absolute -bottom-2 -left-2 text-[#00e5ff] text-xs animate-pulse" style={{ animationDelay: '0.5s' }}>&#10022;</span>
        </div>

        {/* Title — retro neon glow */}
        <h1 className="text-6xl font-black mb-3 tracking-tight">
          <span className="bg-gradient-to-r from-[#ff2d95] via-[#ff00ff] to-[#bf5af2] bg-clip-text text-transparent">
            Karaoke
          </span>{' '}
          <span className="bg-gradient-to-r from-[#00e5ff] via-[#00ffff] to-[#00ff88] bg-clip-text text-transparent">
            ZERO
          </span>
        </h1>

        {/* Rainbow divider line */}
        <div className="mx-auto w-48 h-0.5 retro-gradient-rainbow rounded-full mb-4" />

        <p className="text-lg text-[#b8b8d0] mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="retro-btn retro-btn-cyan px-10 py-6 text-lg rounded-lg"
            onClick={() => onNavigate('library')}
            data-testid="home-nav-library"
          >
            <PlayIcon className="w-5 h-5 mr-2" /> {t('home.startSinging')}
          </Button>
          <Button
            size="lg"
            className="retro-btn retro-btn-pink px-10 py-6 text-lg rounded-lg"
            onClick={() => onNavigate('party')}
            data-testid="home-nav-party"
          >
            <PartyIcon className="w-5 h-5 mr-2" /> {t('home.partyMode')}
          </Button>
        </div>
      </div>

      {/* ═══ QUICK STATS — Neon Card Style ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        <Card className="retro-gradient-card retro-border-cyan backdrop-blur-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-[#00e5ff] retro-glow-cyan">{isMounted ? songCount : 0}</div>
            <div className="text-[#b8b8d0] text-sm mt-1">{t('home.songsAvailable')}</div>
          </CardContent>
        </Card>
        <Card className="retro-gradient-card retro-border-pink backdrop-blur-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-[#ff2d95] retro-glow-pink">{isMounted ? profiles.length : 0}</div>
            <div className="text-[#b8b8d0] text-sm mt-1">{t('home.profilesCreated')}</div>
          </CardContent>
        </Card>
        <Card className="retro-gradient-card backdrop-blur-sm rounded-xl" style={{ border: '2px solid rgba(191,90,242,0.4)' }}>
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-[#bf5af2] retro-glow-purple">{PARTY_GAME_COUNT}</div>
            <div className="text-[#b8b8d0] text-sm mt-1">{t('home.partyGames')}</div>
          </CardContent>
        </Card>
        <Card className="retro-gradient-card retro-border-gold backdrop-blur-sm rounded-xl">
          <CardContent className="pt-6">
            <div className="text-3xl font-black text-[#ffd60a] retro-glow-gold">{DIFFICULTY_LEVELS}</div>
            <div className="text-[#b8b8d0] text-sm mt-1">{t('home.difficultyLevels')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="retro-gradient-card retro-border-cyan mb-8 rounded-xl">
        <CardContent className="pt-6">
          {isMounted ? (
            <PerformanceDisplay />
          ) : (
            <div className="text-center text-white/40 py-4">{t('homeScreen.loadingStats')}</div>
          )}
        </CardContent>
      </Card>

      {/* ═══ FEATURES — Retro Neon Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-[#00e5ff]/10 to-[#00ffff]/5 retro-border-cyan rounded-xl retro-box-glow-cyan">
          <CardHeader>
            <CardTitle className="text-[#00e5ff] flex items-center gap-2 font-bold">
              <MicIcon className="w-6 h-6" /> {t('homeScreen.realTimePitch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#b8b8d0]/80">
              {t('homeScreen.realTimePitchDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#bf5af2]/10 to-[#ff00ff]/5 rounded-xl retro-box-glow-purple" style={{ border: '2px solid rgba(191,90,242,0.4)' }}>
          <CardHeader>
            <CardTitle className="text-[#bf5af2] flex items-center gap-2 font-bold">
              <PartyIcon className="w-6 h-6" /> {t('homeScreen.partyGamesFeature')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#b8b8d0]/80">
              {t('homeScreen.partyGamesFeatureDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#ffd60a]/10 to-[#ffaa00]/5 retro-border-gold rounded-xl retro-box-glow-gold">
          <CardHeader>
            <CardTitle className="text-[#ffd60a] flex items-center gap-2 font-bold">
              <PhoneIcon className="w-6 h-6" /> {t('homeScreen.mobileCompanion')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70 mb-4">
              {t('homeScreen.mobileCompanionDesc')}
            </p>
            {localIP ? (
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2 flex-shrink-0">
                  {qrCodeSrc ? <img src={qrCodeSrc} alt={t('home.qrCodeAlt')} className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
                </div>
                <div className="text-xs text-white/50 space-y-1">
                  <p>{t('homeScreen.wifiStep1')}</p>
                  <p>{t('homeScreen.wifiStep2')}</p>
                  <p>{t('homeScreen.wifiStep3')}</p>
                  <p className="font-mono mt-2 break-all text-orange-400/70">{buildCompanionUrl(localIP)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/40">{t('homeScreen.detectingNetwork')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Select Profile */}
      {isMounted && profiles.length > 0 && (
        <Card className="retro-gradient-card retro-border-pink backdrop-blur-sm rounded-xl">
          <CardHeader>
            <CardTitle>{t('homeScreen.selectCharacter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  data-testid={`home-profile-${profile.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeProfileId === profile.id
                      ? 'bg-gradient-to-r from-[#ff2d95] to-[#bf5af2] text-white retro-box-glow-pink'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      (profile.name?.[0] || '?').toUpperCase()
                    )}
                  </div>
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 transition-all"
                data-testid="home-create-profile"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                  +
                </div>
                <span className="text-white/60">{t('home.createNew')}</span>
              </button>
            </div>
            {profiles.filter(p => p.isActive === false).length > 0 && (
              <p className="text-xs text-white/40 mt-3">
                {profiles.filter(p => p.isActive === false).length} {t('homeScreen.inactiveProfiles')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
