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
      {/* ═══ HERO SECTION — Karaoke Eleven Brand ═══ */}
      <div
        className="relative text-center py-16 rounded-2xl mb-10 overflow-hidden eleven-stars"
        style={{
          background: 'linear-gradient(180deg, #0a0014 0%, #140028 40%, #1a0033 70%, #0a0014 100%)',
          border: '1px solid rgba(191, 90, 242, 0.15)',
        }}
      >
        {/* Animated gradient bar at top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, #00e5ff, #bf5af2, #ff2d95, #00e5ff)',
            backgroundSize: '300% 100%',
            animation: 'eleven-gradient-border 4s ease-in-out infinite',
          }}
        />

        {/* Logo — large, with pulsing glow */}
        <div
          className="mb-6 inline-block"
          style={{
            animation: 'eleven-logo-pulse 3s ease-in-out infinite',
          }}
        >
          <img
            src="/logo-retro.png"
            alt="Karaoke Eleven"
            className="h-[200px] w-auto"
          />
        </div>

        {/* Title — neon cyan glow */}
        <h1
          className="text-5xl md:text-6xl font-black tracking-tight mb-3"
          style={{
            color: '#00e5ff',
            textShadow: '0 0 7px #00e5ff, 0 0 20px #00e5ff, 0 0 42px rgba(0,229,255,0.6)',
          }}
        >
          Karaoke Eleven
        </h1>

        {/* Subtitle — pink with subtle glow */}
        <p
          className="text-xl md:text-2xl font-bold mb-10 tracking-wide"
          style={{
            color: '#ff2d95',
            textShadow: '0 0 10px rgba(255,45,149,0.4), 0 0 20px rgba(255,45,149,0.2)',
          }}
        >
          Sing. Compete. Shine.
        </p>

        {/* Quick-start buttons — glass-morphism with gradient border */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            size="lg"
            className="group relative px-10 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.03]"
            onClick={() => onNavigate('library')}
            data-testid="home-nav-library"
            style={{
              background: 'rgba(10, 0, 20, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '2px solid transparent',
              borderImage: 'linear-gradient(135deg, #00e5ff, #bf5af2) 1',
              color: '#00e5ff',
              boxShadow: '0 0 12px rgba(0,229,255,0.3), inset 0 0 12px rgba(0,229,255,0.05)',
            }}
          >
            <PlayIcon className="w-5 h-5 mr-2" />
            <span>{t('home.startSinging')}</span>
          </Button>
          <Button
            size="lg"
            className="group relative px-10 py-6 text-lg font-bold rounded-xl transition-all duration-300 hover:scale-[1.03]"
            onClick={() => onNavigate('party')}
            data-testid="home-nav-party"
            style={{
              background: 'rgba(10, 0, 20, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '2px solid transparent',
              borderImage: 'linear-gradient(135deg, #ff2d95, #bf5af2) 1',
              color: '#ff2d95',
              boxShadow: '0 0 12px rgba(255,45,149,0.3), inset 0 0 12px rgba(255,45,149,0.05)',
            }}
          >
            <PartyIcon className="w-5 h-5 mr-2" />
            <span>{t('home.partyMode')}</span>
          </Button>
        </div>

        {/* Animated gradient bar at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: 'linear-gradient(90deg, #ff2d95, #bf5af2, #00e5ff, #ff2d95)',
            backgroundSize: '300% 100%',
            animation: 'eleven-gradient-border 4s ease-in-out infinite',
            animationDelay: '-2s',
          }}
        />
      </div>

      {/* ═══ QUICK STATS — Eleven Glass Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        <Card
          className="eleven-glass rounded-xl transition-all duration-300 hover:scale-[1.02] eleven-box-glow"
        >
          <CardContent className="pt-6">
            <div className="text-3xl font-black retro-glow-cyan">{isMounted ? songCount : 0}</div>
            <div className="text-white/60 text-sm mt-1">{t('home.songsAvailable')}</div>
          </CardContent>
        </Card>
        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(255, 45, 149, 0.4)',
            boxShadow: '0 0 8px rgba(255,45,149,0.3), 0 0 24px rgba(255,45,149,0.15)',
          }}
        >
          <CardContent className="pt-6">
            <div className="text-3xl font-black retro-glow-pink">{isMounted ? profiles.length : 0}</div>
            <div className="text-white/60 text-sm mt-1">{t('home.profilesCreated')}</div>
          </CardContent>
        </Card>
        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(191, 90, 242, 0.4)',
            boxShadow: '0 0 8px rgba(191,90,242,0.3), 0 0 24px rgba(191,90,242,0.15)',
          }}
        >
          <CardContent className="pt-6">
            <div className="text-3xl font-black retro-glow-purple">{PARTY_GAME_COUNT}</div>
            <div className="text-white/60 text-sm mt-1">{t('home.partyGames')}</div>
          </CardContent>
        </Card>
        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(255, 214, 10, 0.4)',
            boxShadow: '0 0 8px rgba(255,214,10,0.3), 0 0 24px rgba(255,214,10,0.15)',
          }}
        >
          <CardContent className="pt-6">
            <div className="text-3xl font-black retro-glow-gold">{DIFFICULTY_LEVELS}</div>
            <div className="text-white/60 text-sm mt-1">{t('home.difficultyLevels')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="eleven-glass rounded-xl mb-8">
        <CardContent className="pt-6">
          {isMounted ? (
            <PerformanceDisplay />
          ) : (
            <div className="text-center text-white/40 py-4">{t('homeScreen.loadingStats')}</div>
          )}
        </CardContent>
      </Card>

      {/* ═══ FEATURES — Eleven Glass Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02] eleven-box-glow"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(0, 229, 255, 0.35)',
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold" style={{ color: '#00e5ff' }}>
              <MicIcon className="w-6 h-6" /> {t('homeScreen.realTimePitch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">
              {t('homeScreen.realTimePitchDesc')}
            </p>
          </CardContent>
        </Card>

        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(191, 90, 242, 0.35)',
            boxShadow: '0 0 8px rgba(191,90,242,0.3), 0 0 24px rgba(191,90,242,0.15)',
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold" style={{ color: '#bf5af2' }}>
              <PartyIcon className="w-6 h-6" /> {t('homeScreen.partyGamesFeature')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60">
              {t('homeScreen.partyGamesFeatureDesc')}
            </p>
          </CardContent>
        </Card>

        <Card
          className="rounded-xl transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: 'rgba(10, 0, 20, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '2px solid rgba(255, 214, 10, 0.35)',
            boxShadow: '0 0 8px rgba(255,214,10,0.3), 0 0 24px rgba(255,214,10,0.15)',
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold" style={{ color: '#ffd60a' }}>
              <PhoneIcon className="w-6 h-6" /> {t('homeScreen.mobileCompanion')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/60 mb-4">
              {t('homeScreen.mobileCompanionDesc')}
            </p>
            {localIP ? (
              <div className="flex items-center gap-4">
                <div className="bg-white rounded-lg p-2 flex-shrink-0">
                  {qrCodeSrc ? <img src={qrCodeSrc} alt="QR Code" className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
                </div>
                <div className="text-xs text-white/50 space-y-1">
                  <p>{t('homeScreen.wifiStep1')}</p>
                  <p>{t('homeScreen.wifiStep2')}</p>
                  <p>{t('homeScreen.wifiStep3')}</p>
                  <p className="font-mono mt-2 break-all" style={{ color: 'rgba(255,214,10,0.7)' }}>{buildCompanionUrl(localIP)}</p>
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
        <Card
          className="eleven-glass rounded-xl"
        >
          <CardHeader>
            <CardTitle className="text-white">{t('homeScreen.selectCharacter')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  data-testid={`home-profile-${profile.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    activeProfileId === profile.id
                      ? 'retro-box-glow-pink'
                      : 'hover:bg-white/10'
                  }`}
                  style={{
                    background: activeProfileId === profile.id
                      ? 'linear-gradient(135deg, rgba(255,45,149,0.3), rgba(191,90,242,0.3))'
                      : 'rgba(255,255,255,0.05)',
                    border: activeProfileId === profile.id
                      ? '2px solid rgba(255,45,149,0.5)'
                      : '2px solid rgba(255,255,255,0.1)',
                  }}
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
                  <span className="font-medium text-white">{profile.name}</span>
                </button>
              ))}
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/10"
                data-testid="home-create-profile"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed rgba(255,255,255,0.2)',
                }}
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
