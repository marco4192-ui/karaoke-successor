'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StorageKeys, setItem, setJson, removeItem } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n/translations';

// Types & constants
import type { MobileView, MobileProfile } from './mobile/mobile-types';
import { PROFILE_COLORS } from './mobile/mobile-types';

// View components
import { RemoteControlView } from './mobile/remote-control-view';
import {
  MobileHomeView,
  MobileMicView,
  MobileSongsView,
  MobileQueueView,
  MobileResultsView,
  MobileJukeboxView,
  MobileProfileCreateView,
  MobileProfileEditView,
  MobileBottomNav,
} from './mobile/mobile-views';

// Hooks
import { useMobileConnection } from '@/hooks/use-mobile-connection';
import { useMobilePitchDetection } from '@/hooks/use-mobile-pitch-detection';
import { useMobileData } from '@/hooks/use-mobile-data';

// ===================== MOBILE CLIENT VIEW =====================
interface MobileClientViewProps {
  /** Optional host profile ID passed via ?profile= in the QR URL */
  profileId?: string;
}

export function MobileClientView({ profileId }: MobileClientViewProps) {
  const { t } = useTranslation();
  const [currentView, setCurrentView] = useState<MobileView>('home');
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // #10 Tournament spectator vote state
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set());
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection
  const { clientId, connectionCode, isConnected, gameState, connect, disconnect, syncProfile, cleanup } = useMobileConnection({
    onProfileLoaded: (p) => setProfile(p),
    onProfileFieldsLoaded: (name, color, avatar) => { setProfileName(name); setProfileColor(color); setAvatarPreview(avatar); },
    onGameStateUpdate: (_state) => {},
    onError: setError,
    onSongEnd: () => { data.loadGameResults(); data.loadQueue(); },
  });

  // Pitch detection
  const { isListening, currentPitch, micPermissionDenied, startMicrophone, stopMicrophone } = useMobilePitchDetection({
    clientId, isPlaying: gameState.isPlaying, songEnded: gameState.songEnded, onError: setError,
  });

  // Data (songs, queue, jukebox, results, partners)
  const data = useMobileData({ clientId, profile, onNavigateToProfile: () => setCurrentView('profile') });

  // Stop mic when game stops or song ends
  useEffect(() => {
    if (isListening && (!gameState.isPlaying || gameState.songEnded)) stopMicrophone();
  }, [gameState.isPlaying, gameState.songEnded, isListening, stopMicrophone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopMicrophone(); cleanup(); };
  }, [stopMicrophone, cleanup]);

  // Persist clientId to localStorage for IP-based reconnection hints
  useEffect(() => {
    if (clientId) {
      setItem(StorageKeys.CLIENT_ID, clientId);
    }
  }, [clientId]);

  // When a profileId is provided via QR, auto-adopt the matching host profile
  // once the connection is established. This takes priority over any
  // localStorage-restored profile (the user explicitly chose this character).
  const autoAdoptDoneRef = useRef(false);
  useEffect(() => {
    if (!profileId || !isConnected || !clientId || autoAdoptDoneRef.current) return;
    autoAdoptDoneRef.current = true;
    // Fetch host profiles and auto-select the matching one
    fetch('/api/mobile?action=hostprofiles&clientId=' + clientId)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !Array.isArray(d.profiles)) return;
        const match = d.profiles.find((p: { id: string }) => p.id === profileId);
        if (match) {
          const hostProfile: import('./mobile/mobile-types').MobileProfile = {
            id: match.id,
            name: match.name,
            avatar: match.avatar || undefined,
            color: match.color,
            createdAt: match.createdAt || Date.now(),
          };
          setProfile(hostProfile);
          setProfileName(hostProfile.name);
          setProfileColor(hostProfile.color);
          setAvatarPreview(hostProfile.avatar || null);
          setJson(StorageKeys.MOBILE_PROFILE, hostProfile);
          syncProfile(hostProfile);
        }
      })
      .catch(() => {});
  }, [profileId, isConnected, clientId, syncProfile]);

  // Profile callbacks
  const handleCreateProfile = useCallback((hostProfile?: MobileProfile) => {
    if (!profileName.trim()) return;
    const newProfile: MobileProfile = hostProfile
      ? {
          // CRITICAL FIX: Use the host profile's original ID so the companion
          // and main program recognize it as the same character/entity
          id: hostProfile.id,
          name: hostProfile.name,
          avatar: hostProfile.avatar || avatarPreview || undefined,
          color: hostProfile.color,
          createdAt: hostProfile.createdAt || Date.now(),
        }
      : {
          id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: profileName.trim(), avatar: avatarPreview || undefined, color: profileColor, createdAt: Date.now(),
        };
    setProfile(newProfile);
    setJson(StorageKeys.MOBILE_PROFILE, newProfile);
    syncProfile(newProfile);
    setCurrentView('home');
  }, [profileName, avatarPreview, profileColor, syncProfile]);

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSaveProfile = useCallback(() => {
    if (!profile) return;
    const updated = { ...profile, name: profileName, color: profileColor, avatar: avatarPreview || undefined };
    setProfile(updated);
    setJson(StorageKeys.MOBILE_PROFILE, updated);
    syncProfile(updated);
  }, [profile, profileName, profileColor, avatarPreview, syncProfile]);

  // Switch to a host character from the main app (preserves host profile ID)
  const handleSwitchToHostProfile = useCallback((hostProfile: MobileProfile) => {
    const switchedProfile: MobileProfile = {
      id: hostProfile.id,
      name: hostProfile.name,
      avatar: hostProfile.avatar || undefined,
      color: hostProfile.color,
      createdAt: hostProfile.createdAt || Date.now(),
    };
    setProfile(switchedProfile);
    setProfileName(switchedProfile.name);
    setProfileColor(switchedProfile.color);
    setAvatarPreview(switchedProfile.avatar || null);
    setJson(StorageKeys.MOBILE_PROFILE, switchedProfile);
    syncProfile(switchedProfile);
  }, [syncProfile]);

  // Disconnect from server and reset local state
  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setProfile(null);
    setProfileName('');
    setProfileColor('#06B6D4');
    setAvatarPreview(null);
    removeItem(StorageKeys.MOBILE_PROFILE);
    setCurrentView('home');
    // Re-connect after a short delay to allow fresh profile creation
    reconnectTimerRef.current = setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  // Effects for lazy loading
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (currentView === 'songs' && data.songs.length === 0) queueMicrotask(() => data.loadSongs());
  }, [currentView, data.songs.length, data.loadSongs, data]);

  // Keyboard navigation: Arrow keys to move focus between interactive elements, Enter to activate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter key: activate the currently focused element (buttons, links)
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement;
        if (active && (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button' || active.tagName === 'A')) {
          e.preventDefault();
          active.click();
          return;
        }
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const focusableSelector = 'button:not([disabled]), [role="button"], input, [tabindex]:not([tabindex="-1"])';
        const focusable = Array.from(document.querySelectorAll<HTMLElement>(focusableSelector))
          .filter(el => {
            // Only consider elements visible and inside the main content area
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            return rect.top >= 0 && rect.bottom <= window.innerHeight && rect.left >= 0 && rect.right <= window.innerWidth;
          });

        if (focusable.length === 0) return;
        const active = document.activeElement as HTMLElement;
        const currentIndex = focusable.indexOf(active);

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          let nextIndex: number;
          if (currentIndex === -1) {
            nextIndex = e.key === 'ArrowDown' ? 0 : focusable.length - 1;
          } else if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % focusable.length;
          } else {
            nextIndex = (currentIndex - 1 + focusable.length) % focusable.length;
          }
          focusable[nextIndex]?.focus();
          focusable[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          // For grid layouts: move to the nearest element in the horizontal direction
          if (currentIndex === -1) {
            focusable[0]?.focus();
          } else {
            const activeRect = active.getBoundingClientRect();
            const activeCenterY = activeRect.top + activeRect.height / 2;
            let bestIndex = -1;
            let bestDist = Infinity;
            focusable.forEach((el, i) => {
              if (i === currentIndex) return;
              const rect = el.getBoundingClientRect();
              const centerY = rect.top + rect.height / 2;
              const horizontalDist = e.key === 'ArrowRight'
                ? (rect.left - activeRect.right)
                : (activeRect.left - rect.right);
              // Only consider elements that are roughly on the same row (within 50px vertical distance)
              const verticalDist = Math.abs(centerY - activeCenterY);
              if (horizontalDist > 0 && horizontalDist < bestDist && verticalDist < 80) {
                bestDist = horizontalDist;
                bestIndex = i;
              }
            });
            if (bestIndex === -1) {
              // Fallback: just move to next/previous element
              const nextIndex = e.key === 'ArrowRight'
                ? (currentIndex + 1) % focusable.length
                : (currentIndex - 1 + focusable.length) % focusable.length;
              focusable[nextIndex]?.focus();
              focusable[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
              focusable[bestIndex]?.focus();
              focusable[bestIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => data.loadQueue());
      const interval = setInterval(() => data.loadQueue(), 5000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- data.loadQueue is stable; isConnected is the actual trigger
  }, [isConnected, data.loadQueue]);

  useEffect(() => {
    if (currentView === 'jukebox') queueMicrotask(() => data.loadJukeboxWishlist());
  }, [currentView, data.loadJukeboxWishlist, data]);

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {profile && currentView !== 'home' && (
              <button onClick={() => setCurrentView('home')} className="text-white/60 hover:text-white">{t('mobileClient.back')}</button>
            )}
            <h1 className="text-lg font-bold">Karaoke ZERO</h1>
          </div>
          <div className="flex items-center gap-3">
            {connectionCode && <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono">{connectionCode}</Badge>}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected && profile && (
              <button
                onClick={handleDisconnect}
                className="text-white/40 hover:text-red-400 text-xs transition-colors"
                title={t('mobileClient.disconnect')}
              >
                ✕
              </button>
            )}
            {profile && (
              <button onClick={() => setCurrentView('profile')} className="w-8 h-8 rounded-full overflow-hidden" style={{ backgroundColor: profile.color }}>
                {profile.avatar ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" /> : <span className="text-sm font-bold">{profile.name[0]}</span>}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
          <p className="text-white/60 mb-4">{t('mobileClient.connecting')}</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Button onClick={connect} className="bg-cyan-500 hover:bg-cyan-400">{t('mobileClient.retryConnection')}</Button>
        </div>
      ) : !profile ? (
        <MobileProfileCreateView
          profileName={profileName} onProfileNameChange={setProfileName}
          profileColor={profileColor} onProfileColorChange={setProfileColor}
          avatarPreview={avatarPreview} profileColors={PROFILE_COLORS}
          fileInputRef={fileInputRef} onCreateProfile={handleCreateProfile} onPhotoUpload={handlePhotoUpload}
        />
      ) : (
        <div className="pb-20">
          {currentView === 'home' && <MobileHomeView gameState={gameState} queue={data.queue} onNavigate={setCurrentView} />}
          {currentView === 'mic' && (
            <MobileMicView gameState={gameState} clientId={clientId} currentPitch={currentPitch}
              isListening={isListening} micPermissionDenied={micPermissionDenied} onStartMic={startMicrophone} onStopMic={stopMicrophone} />
          )}
          {currentView === 'songs' && (
            <MobileSongsView
              songSearch={data.songSearch} onSongSearchChange={data.setSongSearch}
              songsLoading={data.songsLoading} filteredSongs={data.filteredSongs}
              showSongOptions={data.showSongOptions} selectedGameMode={data.selectedGameMode}
              selectedPartner={data.selectedPartner} availablePartners={data.availablePartners}
              onShowSongOptions={data.setShowSongOptions} onSelectGameMode={data.setSelectedGameMode}
              onSelectPartner={data.setSelectedPartner} onAddToQueue={data.addToQueue}
              onLoadPartners={data.loadAvailablePartners} formatDuration={data.formatDuration}
            />
          )}
          {currentView === 'queue' && <MobileQueueView queue={data.queue} slotsRemaining={data.slotsRemaining} queueError={data.queueError} onRemoveFromQueue={data.removeFromQueue} onNavigate={setCurrentView} clientId={clientId} />}
          {currentView === 'results' && <MobileResultsView gameResults={data.gameResults} onNavigate={setCurrentView} />}
          {currentView === 'jukebox' && <MobileJukeboxView jukeboxWishlist={data.jukeboxWishlist} onNavigate={setCurrentView} />}
          {currentView === 'remote' && <RemoteControlView clientId={clientId} profile={profile} onBack={() => setCurrentView('home')} />}
          {currentView === 'profile' && (
            <MobileProfileEditView
              profile={profile} profileName={profileName} onProfileNameChange={setProfileName}
              profileColor={profileColor} onProfileColorChange={setProfileColor}
              avatarPreview={avatarPreview} connectionCode={connectionCode}
              profileColors={PROFILE_COLORS} fileInputRef={fileInputRef}
              onSave={handleSaveProfile} onPhotoUpload={handlePhotoUpload}
              onSwitchToHostProfile={handleSwitchToHostProfile}
            />
          )}
        </div>
      )}

      {isConnected && profile && <MobileBottomNav currentView={currentView} onNavigate={setCurrentView} />}

      {/* ── Companion Sing-A-Long overlay ── */}
      {isConnected && profile && gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id && (
        <SingalongOverlay
          isMyTurn={gameState.singalongTurn.countdown === null}
          countdown={gameState.singalongTurn.countdown}
        />
      )}

      {/* ── Companion Pass-the-Mic overlay: blink warning + YOUR TURN ── */}
      {isConnected && profile && gameState.cptmTurn?.isActive && (
        (gameState.cptmTurn.countdown !== null && gameState.cptmTurn.nextProfileId === profile.id) ? (
          // Blink warning: player's phone blinks before their turn (decent, pulsing)
          <CptmBlinkOverlay
            countdown={gameState.cptmTurn.countdown}
            playerColor={profile.color}
          />
        ) : (gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null) ? (
          // Active turn: "YOUR TURN!" display
          <CptmYourTurnOverlay playerName={profile.name} playerColor={profile.color} />
        ) : null
      )}

      {/* #10 Tournament Spectator Vote Overlay — show when a duel is in progress */}
      {isConnected && profile && gameState.isPlaying && gameState.gameMode === 'duel' && gameState.tournamentMatchId && !votedMatchIds.has(gameState.tournamentMatchId) && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-sm border border-rose-500/30 rounded-2xl p-4 shadow-2xl">
          <div className="text-center mb-3">
            <span className="text-2xl">❤️</span>
            <p className="text-sm font-bold text-white mt-1">{t('mobile.tournamentVoteTitle')}</p>
            <p className="text-xs text-white/50">{t('mobile.tournamentVoteDesc')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-sm py-3"
              onClick={() => {
                if (!clientId || !gameState.tournamentMatchId) return;
                setVotedMatchIds(prev => new Set(prev).add(gameState.tournamentMatchId!));
                fetch('/api/mobile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'tournament_crowd_vote', payload: { matchId: gameState.tournamentMatchId, playerSide: 1 }, clientId }),
                }).catch(() => {});
              }}
            >
              P1
            </Button>
            <Button
              className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-sm py-3"
              onClick={() => {
                if (!clientId || !gameState.tournamentMatchId) return;
                setVotedMatchIds(prev => new Set(prev).add(gameState.tournamentMatchId!));
                fetch('/api/mobile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'tournament_crowd_vote', payload: { matchId: gameState.tournamentMatchId, playerSide: 2 }, clientId }),
                }).catch(() => {});
              }}
            >
              P2
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================== SINGALONG OVERLAY =====================
interface SingalongOverlayProps {
  isMyTurn: boolean;
  countdown: number | null;
}

function SingalongOverlay({ isMyTurn, countdown }: SingalongOverlayProps) {
  const { t } = useTranslation();
  const [flashVisible, setFlashVisible] = useState(false);

  // Flash briefly when countdown changes (new turn)
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      // Flash the screen
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 300);
      return () => clearTimeout(flashTimer);
    } else if (countdown === null && isMyTurn) {
      // Brief flash when becoming the active singer
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 500);
      return () => clearTimeout(flashTimer);
    }
  }, [countdown, isMyTurn]);

  // Countdown phase: show big numbers 3, 2, 1
  if (countdown !== null && countdown > 0) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-100 ${flashVisible ? 'bg-emerald-500' : 'bg-emerald-900/95'}`}>
        <div className="text-center">
          <div className="text-[12rem] font-bold text-white leading-none animate-pulse">{countdown}</div>
          <div className="text-2xl font-bold text-emerald-200 mt-4 animate-pulse">{t('mobileClient.getReady')}</div>
        </div>
      </div>
    );
  }

  // Active singing phase
  if (isMyTurn) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ${flashVisible ? 'bg-emerald-500/40' : 'bg-transparent'}`}>
        <div className="absolute top-4 left-0 right-0 text-center">
          <div className="inline-block bg-emerald-500/90 text-white px-6 py-2 rounded-full text-lg font-bold animate-pulse">
            🎤 {t('mobileClient.youreSinging')}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ===================== CPTM BLINK OVERLAY =====================
// Decent pulsing blink effect on the phone before the player's turn
interface CptmBlinkOverlayProps {
  countdown: number | null;
  playerColor: string;
}

function CptmBlinkOverlay({ countdown, playerColor }: CptmBlinkOverlayProps) {
  const { t } = useTranslation();
  // The blink intensity increases as countdown decreases (3→2→1)
  const intensity = countdown === 3 ? 0.15 : countdown === 2 ? 0.3 : 0.5;

  if (countdown === null || countdown <= 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ backgroundColor: playerColor, opacity: intensity }}
    >
      {/* Subtle pulsing animation that gets faster as countdown decreases */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: playerColor,
          animation: `cptm-blink ${countdown === 3 ? 2 : countdown === 2 ? 1 : 0.5}s ease-in-out infinite alternate`,
        }}
      />
      {/* Countdown number (small, decent) */}
      <div className="relative z-10 text-center">
        <div className="text-8xl font-bold text-white/90 animate-pulse">{countdown}</div>
        <div className="text-lg font-medium text-white/70 mt-2">{t('mobileCompanion.getReady')}</div>
      </div>

      {/* Inject keyframe animation */}
      <style>{`
        @keyframes cptm-blink {
          0% { opacity: 0; }
          100% { opacity: ${Math.min(intensity * 2.5, 0.8)}; }
        }
      `}</style>
    </div>
  );
}

// ===================== CPTM YOUR TURN OVERLAY =====================
// Bold "YOUR TURN!" display when the player's segment starts
interface CptmYourTurnOverlayProps {
  playerName: string;
  playerColor: string;
}

function CptmYourTurnOverlay({ playerName, playerColor }: CptmYourTurnOverlayProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  // Brief flash-in animation
  useEffect(() => {
    queueMicrotask(() => setShow(true));
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${playerColor}40, transparent 70%)`,
        }}
      />

      {/* YOUR TURN text */}
      <div className="relative z-10 text-center animate-[scale-in_0.3s_ease-out]">
        <div className="text-sm font-bold text-white/60 uppercase tracking-[0.3em] mb-2">{t('mobileCompanion.yourTurn')}</div>
        <div className="text-5xl font-bold text-white" style={{ textShadow: `0 0 30px ${playerColor}` }}>
          {playerName}
        </div>
        <div
          className="mt-4 mx-auto h-1.5 rounded-full"
          style={{ width: '120px', backgroundColor: playerColor }}
        />
      </div>
    </div>
  );
}
