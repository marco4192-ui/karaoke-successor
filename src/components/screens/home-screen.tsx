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
      {/* ═══ HERO SECTION — Comic-Book Pop-Art ═══ */}
      <div className="relative text-center py-16 comic-halftone">
        {/* Comic zigzag stripe behind title */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 h-3 w-72"
          style={{
            background: '#FDE601',
            borderTop: '3px solid #000',
            borderBottom: '3px solid #000',
            clipPath: 'polygon(0% 50%, 5% 0%, 10% 50%, 15% 100%, 20% 50%, 25% 0%, 30% 50%, 35% 100%, 40% 50%, 45% 0%, 50% 50%, 55% 100%, 60% 50%, 65% 0%, 70% 50%, 75% 100%, 80% 50%, 85% 0%, 90% 50%, 95% 100%, 100% 50%, 100% 100%, 0% 100%)',
          }}
        />
        
        {/* Logo icon — comic style solid fill + offset shadow */}
        <div
          className="inline-flex items-center justify-center w-28 h-28 rounded-2xl bg-[#F939A3] relative"
          style={{
            border: '3px solid #000',
            boxShadow: '4px 4px 0px #FDE601',
            transform: 'rotate(-3deg)',
          }}
        >
          <MusicIcon className="w-16 h-16 text-white drop-shadow-lg" />
          {/* Comic star burst corners */}
          <span className="absolute -top-2 -right-2 text-[#FDE601] text-xs animate-pulse" style={{ WebkitTextStroke: '1px #000' }}>★</span>
          <span className="absolute -bottom-2 -left-2 text-[#00F3B2] text-xs animate-pulse" style={{ animationDelay: '0.5s', WebkitTextStroke: '1px #000' }}>★</span>
        </div>

        {/* Title — Comic bold text-stroke */}
        <h1 className="text-7xl md:text-8xl font-black mb-3 tracking-tight">
          <span
            className="text-[#F939A3]"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
          >
            Karaoke
          </span>{' '}
          <span
            className="text-[#FDE601]"
            style={{ WebkitTextStroke: '2px #000', paintOrder: 'stroke fill' }}
          >
            ELEVEN
          </span>
        </h1>

        {/* Comic thick stripe divider */}
        <div
          className="mx-auto w-56 h-2 mb-4"
          style={{
            background: '#FDE601',
            borderTop: '3px solid #000',
            borderBottom: '3px solid #000',
          }}
        />

        <p className="text-lg text-[#c0b8d0] mb-10 max-w-2xl mx-auto leading-relaxed" style={{ WebkitTextStroke: '0.5px transparent' }}>
          {t('home.subtitle')}
        </p>

        <div className="flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="px-10 py-6 text-lg rounded-lg font-black text-[#1a0a2e] bg-[#00F3B2] hover:bg-[#00d99e] transition-all"
            style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #6B2E77' }}
            onClick={() => onNavigate('library')}
            data-testid="home-nav-library"
          >
            <PlayIcon className="w-5 h-5 mr-2" /> {t('home.startSinging')}
          </Button>
          <Button
            size="lg"
            className="px-10 py-6 text-lg rounded-lg font-black text-white bg-[#F939A3] hover:bg-[#e02d8f] transition-all"
            style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #6B2E77' }}
            onClick={() => onNavigate('party')}
            data-testid="home-nav-party"
          >
            <PartyIcon className="w-5 h-5 mr-2" /> {t('home.partyMode')}
          </Button>
        </div>
      </div>

      {/* ═══ QUICK STATS — Comic Card Style ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #00F3B2' }}
        >
          <CardContent className="pt-6">
            <div
              className="text-3xl font-black text-[#00F3B2]"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              {isMounted ? songCount : 0}
            </div>
            <div className="text-[#c0b8d0] text-sm mt-1">{t('home.songsAvailable')}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #F939A3' }}
        >
          <CardContent className="pt-6">
            <div
              className="text-3xl font-black text-[#F939A3]"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              {isMounted ? profiles.length : 0}
            </div>
            <div className="text-[#c0b8d0] text-sm mt-1">{t('home.profilesCreated')}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #6B2E77' }}
        >
          <CardContent className="pt-6">
            <div
              className="text-3xl font-black text-[#BA279D]"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              {PARTY_GAME_COUNT}
            </div>
            <div className="text-[#c0b8d0] text-sm mt-1">{t('home.partyGames')}</div>
          </CardContent>
        </Card>
        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #FDE601' }}
        >
          <CardContent className="pt-6">
            <div
              className="text-3xl font-black text-[#FDE601]"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              {DIFFICULTY_LEVELS}
            </div>
            <div className="text-[#c0b8d0] text-sm mt-1">{t('home.difficultyLevels')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card
        className="bg-[#2a1a3e] mb-8 rounded-xl"
        style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #00F3B2' }}
      >
        <CardContent className="pt-6">
          {isMounted ? (
            <PerformanceDisplay />
          ) : (
            <div className="text-center text-white/40 py-4">{t('homeScreen.loadingStats')}</div>
          )}
        </CardContent>
      </Card>

      {/* ═══ FEATURES — Comic Pop-Art Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #00F3B2' }}
        >
          <CardHeader>
            <CardTitle
              className="text-[#00F3B2] flex items-center gap-2 font-black"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              <MicIcon className="w-6 h-6" /> {t('homeScreen.realTimePitch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#c0b8d0]/80">
              {t('homeScreen.realTimePitchDesc')}
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #BA279D' }}
        >
          <CardHeader>
            <CardTitle
              className="text-[#BA279D] flex items-center gap-2 font-black"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              <PartyIcon className="w-6 h-6" /> {t('homeScreen.partyGamesFeature')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#c0b8d0]/80">
              {t('homeScreen.partyGamesFeatureDesc')}
            </p>
          </CardContent>
        </Card>

        <Card
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #FDE601' }}
        >
          <CardHeader>
            <CardTitle
              className="text-[#FDE601] flex items-center gap-2 font-black"
              style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}
            >
              <PhoneIcon className="w-6 h-6" /> {t('homeScreen.mobileCompanion')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#FDFEFD]/70 mb-4">
              {t('homeScreen.mobileCompanionDesc')}
            </p>
            {localIP ? (
              <div className="flex items-center gap-4">
                <div
                  className="rounded-lg p-2 flex-shrink-0 bg-white"
                  style={{ border: '3px solid #000', boxShadow: '2px 2px 0px #FC6B48' }}
                >
                  {qrCodeSrc ? <img src={qrCodeSrc} alt="QR Code" className="w-32 h-32" /> : <div className="w-32 h-32 animate-pulse bg-gray-200 rounded" />}
                </div>
                <div className="text-xs text-[#c0b8d0]/70 space-y-1">
                  <p>{t('homeScreen.wifiStep1')}</p>
                  <p>{t('homeScreen.wifiStep2')}</p>
                  <p>{t('homeScreen.wifiStep3')}</p>
                  <p className="font-mono mt-2 break-all text-[#FC6B48]/70">{buildCompanionUrl(localIP)}</p>
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
          className="bg-[#2a1a3e] rounded-xl"
          style={{ border: '3px solid #000', boxShadow: '4px 4px 0px #F939A3' }}
        >
          <CardHeader>
            <CardTitle className="font-black text-[#FDFEFD]" style={{ WebkitTextStroke: '1px #000', paintOrder: 'stroke fill' }}>
              {t('homeScreen.selectCharacter')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  data-testid={`home-profile-${profile.id}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black ${
                    activeProfileId === profile.id
                      ? 'text-[#1a0a2e] bg-[#F939A3]'
                      : 'bg-[#2a1a3e] text-[#c0b8d0] hover:bg-[#3a2a4e]'
                  }`}
                  style={{
                    border: activeProfileId === profile.id
                      ? '3px solid #000'
                      : '3px dashed #000',
                    boxShadow: activeProfileId === profile.id
                      ? '4px 4px 0px #6B2E77'
                      : 'none',
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: profile.color, border: '2px solid #000' }}
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
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2a1a3e] hover:bg-[#3a2a4e] transition-all"
                style={{ border: '3px dashed #000' }}
                data-testid="home-create-profile"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#c0b8d0]"
                  style={{ border: '3px dashed #000' }}
                >
                  +
                </div>
                <span className="text-[#c0b8d0]">{t('home.createNew')}</span>
              </button>
            </div>
            {profiles.filter(p => p.isActive === false).length > 0 && (
              <p className="text-xs text-[#c0b8d0]/40 mt-3">
                {profiles.filter(p => p.isActive === false).length} {t('homeScreen.inactiveProfiles')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
