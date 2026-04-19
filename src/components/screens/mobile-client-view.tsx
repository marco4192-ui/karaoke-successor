'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
export function MobileClientView() {
  const [currentView, setCurrentView] = useState<MobileView>('home');
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection
  const { clientId, connectionCode, isConnected, gameState, connect, syncProfile, cleanup } = useMobileConnection({
    onProfileLoaded: (p) => setProfile(p),
    onProfileFieldsLoaded: (name, color, avatar) => { setProfileName(name); setProfileColor(color); setAvatarPreview(avatar); },
    onGameStateUpdate: () => {},
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
      localStorage.setItem('karaoke-client-id', clientId);
    }
  }, [clientId]);

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
    console.log('[MobileClient] Creating profile:', newProfile.name, newProfile.id);
    setProfile(newProfile);
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(newProfile));
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
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(updated));
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
    console.log('[MobileClient] Switching to host profile:', switchedProfile.name, switchedProfile.id);
    setProfile(switchedProfile);
    setProfileName(switchedProfile.name);
    setProfileColor(switchedProfile.color);
    setAvatarPreview(switchedProfile.avatar || null);
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(switchedProfile));
    syncProfile(switchedProfile);
  }, [syncProfile]);

  // Effects for lazy loading
  useEffect(() => {
    if (currentView === 'songs' && data.songs.length === 0) queueMicrotask(() => data.loadSongs());
  }, [currentView, data.songs.length, data.loadSongs]);

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
  }, [isConnected, data.loadQueue]);

  useEffect(() => {
    if (currentView === 'jukebox') queueMicrotask(() => data.loadJukeboxWishlist());
  }, [currentView, data.loadJukeboxWishlist]);

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {profile && currentView !== 'home' && (
              <button onClick={() => setCurrentView('home')} className="text-white/60 hover:text-white">← Back</button>
            )}
            <h1 className="text-lg font-bold">Karaoke Successor</h1>
          </div>
          <div className="flex items-center gap-3">
            {connectionCode && <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono">{connectionCode}</Badge>}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
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
          <p className="text-white/60 mb-4">Connecting to server...</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Button onClick={connect} className="bg-cyan-500 hover:bg-cyan-400">Retry Connection</Button>
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
          {currentView === 'queue' && <MobileQueueView queue={data.queue} slotsRemaining={data.slotsRemaining} queueError={data.queueError} onNavigate={setCurrentView} />}
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
    </div>
  );
}
