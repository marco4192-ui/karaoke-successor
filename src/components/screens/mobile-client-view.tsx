'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StorageKeys, setItem, setJson, removeItem } from '@/lib/storage';
import { useTranslation } from '@/lib/i18n/translations';

// Types & constants
import type { MobileProfile } from './mobile/mobile-types';
import { screenToMirrorId, type MirrorScreenId } from './mobile/mobile-types';
import { MobileChat } from './mobile/mobile-chat';
import { ChatNotificationPopup } from './mobile/mobile-chat-notification';
import { PROFILE_COLORS } from './mobile/mobile-types';

// Mirror view
import { MirrorView } from './mobile/mirror-views/mirror-view';

// View components
import {
  MobileProfileCreateView,
  MobileProfileEditView,
  MobileBottomNav,
} from './mobile/mobile-views';
import { MobileOfflineIndicator } from './mobile/mobile-offline-indicator';

// Error boundary
import { MobileErrorBoundary } from './mobile/mobile-error-boundary';

// Hooks
import { useMobileConnection } from '@/hooks/use-mobile-connection';
import { useMobilePitchDetection } from '@/hooks/use-mobile-pitch-detection';
import { useMobileData } from '@/hooks/use-mobile-data';

// ===================== MOBILE CLIENT VIEW =====================
interface MobileClientViewProps {
  profileId?: string;
}

export function MobileClientView({ profileId }: MobileClientViewProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatPopupMessage, setChatPopupMessage] = useState<{ fromName: string; text: string; isHost: boolean } | null>(null);
  const chatMessageCountRef = useRef(0);
  const [showProfile, setShowProfile] = useState(false);
  const [votedMatchIds, setVotedMatchIds] = useState<Set<string>>(new Set());
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aktiver Desktop-Screen (wird vom Footer gesteuert)
  const [activeDesktopScreen, setActiveDesktopScreen] = useState<string>('home');

  // Punkt 6: Ladebildschirm-Animation bei Screen-Wechsel
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScreenRef = useRef<string>('home');

  // Connection
  const { clientId, connectionCode, isConnected, gameState, connect, disconnect, syncProfile, cleanup } = useMobileConnection({
    onProfileLoaded: (p) => setProfile(p),
    onProfileFieldsLoaded: (name, color, avatar) => { setProfileName(name); setProfileColor(color); setAvatarPreview(avatar); },
    onGameStateUpdate: (_state) => {
      // Sync difficulty from desktop global settings to companion
      if (_state.difficulty && _state.difficulty !== data.difficulty) {
        data.setDifficulty(_state.difficulty);
      }
    },
    onError: setError,
    onSongEnd: () => { data.loadGameResults(); data.loadQueue(); },
  });

  // Pitch detection
  const { isListening, currentPitch, micPermissionDenied, startMicrophone, stopMicrophone, getPitchHistory } = useMobilePitchDetection({
    clientId, isPlaying: gameState.isPlaying, songEnded: gameState.songEnded, onError: setError,
  });

  // Data (songs, queue, jukebox, results, partners)
  const data = useMobileData({ clientId, profile, onNavigateToProfile: () => setShowProfile(true) });

  // ===================== CHAT NOTIFICATION POLLING =====================
  useEffect(() => {
    if (!isConnected || !clientId || showChat) return;
    const pollChat = async () => {
      try {
        const res = await fetch(`/api/mobile?action=getchat&clientId=${encodeURIComponent(clientId)}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.success && Array.isArray(d.messages)) {
          const msgs = d.messages as Array<{ id: string; fromName: string; text: string; isHost: boolean; timestamp: number }>;
          // Zeige Popup nur für neue Nachrichten von anderen
          if (msgs.length > chatMessageCountRef.current && msgs.length > 0) {
            const latest = msgs[msgs.length - 1];
            // Nicht anzeigen wenn die eigene Nachricht die letzte ist
            if (latest.fromName !== profile?.name) {
              setChatPopupMessage({ fromName: latest.fromName, text: latest.text, isHost: latest.isHost });
            }
          }
          chatMessageCountRef.current = msgs.length;
        }
      } catch { /* ignore */ }
    };
    pollChat();
    const iv = setInterval(pollChat, 4000);
    return () => clearInterval(iv);
  }, [isConnected, clientId, showChat, profile?.name]);

  // Stop mic when game stops or song ends
  useEffect(() => {
    if (isListening && (!gameState.isPlaying || gameState.songEnded)) stopMicrophone();
  }, [gameState.isPlaying, gameState.songEnded, isListening, stopMicrophone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopMicrophone(); cleanup(); };
  }, [stopMicrophone, cleanup]);

  // Persist clientId to localStorage
  useEffect(() => {
    if (clientId) setItem(StorageKeys.CLIENT_ID, clientId);
  }, [clientId]);

  // Auto-adopt host profile from QR ?profile= param
  const autoAdoptDoneRef = useRef(false);
  useEffect(() => {
    if (!profileId || !isConnected || !clientId || autoAdoptDoneRef.current) return;
    autoAdoptDoneRef.current = true;
    fetch('/api/mobile?action=hostprofiles&clientId=' + clientId)
      .then(r => r.json())
      .then(d => {
        if (!d.success || !Array.isArray(d.profiles)) return;
        const match = d.profiles.find((p: { id: string }) => p.id === profileId);
        if (match) {
          const hostProfile: import('./mobile/mobile-types').MobileProfile = {
            id: match.id, name: match.name,
            avatar: match.avatar || undefined,
            color: match.color, createdAt: match.createdAt || Date.now(),
          };
          setProfile(hostProfile); setProfileName(hostProfile.name);
          setProfileColor(hostProfile.color); setAvatarPreview(hostProfile.avatar || null);
          setJson(StorageKeys.MOBILE_PROFILE, hostProfile); syncProfile(hostProfile);
        }
      })
      .catch(() => { console.warn('Failed to auto-adopt profile'); });
  }, [profileId, isConnected, clientId, syncProfile]);

  // Profile callbacks
  const handleCreateProfile = useCallback((hostProfile?: MobileProfile) => {
    if (!profileName.trim()) return;
    const newProfile: MobileProfile = hostProfile
      ? { id: hostProfile.id, name: hostProfile.name, avatar: hostProfile.avatar || avatarPreview || undefined, color: hostProfile.color, createdAt: hostProfile.createdAt || Date.now() }
      : { id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, name: profileName.trim(), avatar: avatarPreview || undefined, color: profileColor, createdAt: Date.now() };
    setProfile(newProfile); setJson(StorageKeys.MOBILE_PROFILE, newProfile); syncProfile(newProfile);
    setShowProfile(false);
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
    setProfile(updated); setJson(StorageKeys.MOBILE_PROFILE, updated); syncProfile(updated);
    setShowProfile(false);
  }, [profile, profileName, profileColor, avatarPreview, syncProfile]);

  const handleSwitchToHostProfile = useCallback((hostProfile: MobileProfile) => {
    const switchedProfile: MobileProfile = { id: hostProfile.id, name: hostProfile.name, avatar: hostProfile.avatar || undefined, color: hostProfile.color, createdAt: hostProfile.createdAt || Date.now() };
    setProfile(switchedProfile); setProfileName(switchedProfile.name); setProfileColor(switchedProfile.color);
    setAvatarPreview(switchedProfile.avatar || null); setJson(StorageKeys.MOBILE_PROFILE, switchedProfile); syncProfile(switchedProfile);
    setShowProfile(false);
  }, [syncProfile]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setProfile(null); setProfileName(''); setProfileColor('#06B6D4'); setAvatarPreview(null);
    removeItem(StorageKeys.MOBILE_PROFILE); removeItem(StorageKeys.CLIENT_ID);
    setActiveDesktopScreen('home');
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => connect(), 500);
  }, [disconnect, connect]);

  // Effects for lazy loading
  useEffect(() => {
    return () => { if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => data.loadQueue());
      queueMicrotask(() => data.loadSongs());
      const interval = setInterval(() => data.loadQueue(), 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, data.loadQueue, data.loadSongs]);

  // Auto-Sing: Wenn man aktiver Spieler im aktuellen Spiel ist, Mikrofon automatisch starten
  const autoSingDoneRef = useRef(false);
  useEffect(() => {
    if (!profile || !gameState.isPlaying || !isConnected) {
      autoSingDoneRef.current = false;
      return;
    }
    // Prüfe ob dieser Companion-Player der aktive Spieler ist
    const isMyTurn =
      gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id && gameState.singalongTurn.countdown === null ||
      gameState.cptmTurn?.isActive && gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null;
    if (isMyTurn && !isListening && !autoSingDoneRef.current) {
      autoSingDoneRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
      setTimeout(() => startMicrophone(), 500);
    }
    if (!isMyTurn) autoSingDoneRef.current = false;
  }, [profile, gameState.isPlaying, gameState.singalongTurn, gameState.cptmTurn, isListening, isConnected, startMicrophone]);

  // ===================== DESKTOP MIRRORING =====================
  const handleSendDesktopCommand = useCallback((screen: string) => {
    if (!clientId || !profile) return;
    fetch('/api/mobile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'remote_command', clientId, payload: { command: screen } }),
    }).catch(() => { /* ignore */ });
  }, [clientId, profile]);

  // ===================== REMOTE LOCK STATE =====================
  const [remoteLock, setRemoteLock] = useState<{
    isLocked: boolean;
    lockedByMe: boolean;
    lockedByName: string | null;
  }>({ isLocked: false, lockedByMe: false, lockedByName: null });

  // ===================== CONTROL STATE =====================
  // "controlled" = this companion has the remote lock OR nobody has it (desktop drives).
  // Only the controlling companion mirrors the desktop screen and can send commands.
  const controlled = !remoteLock.isLocked || remoteLock.lockedByMe;
  const hasReleasedRef = useRef(false);
  const isControlling = controlled && !hasReleasedRef.current;

  // ===================== SINGING STATE =====================
  // Whether this companion user is the active singer OR in an active game screen
  // (header/footer must be hidden during any game to prevent accidental navigation)
  const isDesktopGameScreen = activeDesktopScreen === 'game' || !!activeDesktopScreen?.endsWith('-game');
  const isSinging = profile && (
    (gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id && gameState.singalongTurn.countdown === null) ||
    (gameState.cptmTurn?.isActive && gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null) ||
    // Also disable during any active game when this companion is participating
    (gameState.isPlaying && !!gameState.currentSong && gameState.isPartyModeActive) ||
    // Disable during any game screen (ptm-intro, game) regardless of singing state
    isDesktopGameScreen
  ) ? true : false;

  // ===================== SONG-RUNNING WARNING (Issue 11) =====================
  const [showSongRunningOverlay, setShowSongRunningOverlay] = useState(false);
  const isSongRunning = gameState.isPlaying && !!gameState.currentSong;

  // ===================== SCREEN SYNC (desktop → companion) =====================
  // Always sync for party/game/setup screens so ALL companions follow the
  // desktop during party mode. For regular screens, only sync when controlling.
  useEffect(() => {
    const desktop = gameState.currentScreen;
    if (!desktop) return;
    // Party-related screens: always follow desktop, even for non-controlling companions
    const isPartyScreen = desktop === 'party' || desktop === 'party-setup'
      || desktop === 'song-voting'
      || desktop === 'game' || desktop.endsWith('-game')
      || desktop === 'results';
    if (isPartyScreen || controlled) {
      setActiveDesktopScreen(desktop);
    }
  }, [gameState.currentScreen, controlled]);

  // ===================== COMPUTED MIRROR ID =====================
  const mirrorScreenId = useMemo((): MirrorScreenId => {
    const screen = activeDesktopScreen || gameState.currentScreen;
    const base = screenToMirrorId(screen);
    // When Desktop is in PTM/CPTM intro phase, show the intro screen
    if (
      (screen === 'pass-the-mic-game' || screen === 'companion-singalong-game') &&
      gameState.ptmPhase === 'intro'
    ) {
      return 'ptm-intro';
    }
    return base;
  }, [activeDesktopScreen, gameState.currentScreen, gameState.ptmPhase]);

  // Aktiver Footer-Tab: priorisiere lokalen State fuer sofortiges Highlight
  const activeFooterScreen = useMemo(() => {
    return activeDesktopScreen || 'home';
  }, [activeDesktopScreen]);

  // ===================== FOOTER NAVIGATION =====================
  const handleFooterNavigate = useCallback((screen: string) => {
    // Issue 11: Song läuft und User navigiert weg → Overlay zeigen
    // But exempt party-setup: going back to setup doesn't leave the party
    if (isControlling && isSongRunning && screen !== 'game' && screen !== 'party-setup' && screen !== activeDesktopScreen) {
      setShowSongRunningOverlay(true);
      return;
    }
    if (isControlling) {
      // Controlling companion: update local state and send command to desktop
      setActiveDesktopScreen(screen);
      handleSendDesktopCommand(screen);
    } else {
      // Non-controlling companion: navigate locally only, no desktop influence
      setActiveDesktopScreen(screen);
    }
  }, [isControlling, isSongRunning, activeDesktopScreen, handleSendDesktopCommand]);

  const isMountedRef2 = useRef(true);
  useEffect(() => {
    if (!isConnected || !clientId) return;
    const pollLock = async () => {
      try {
        const res = await fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`);
        if (!res.ok) return;
        const d = await res.json();
        if (d.success && isMountedRef2.current) {
          setRemoteLock({
            isLocked: !!d.remoteControl?.lockedBy,
            lockedByMe: !!d.remoteControl?.iHaveControl,
            lockedByName: d.remoteControl?.lockedByName || null,
          });
        }
      } catch { /* ignore */ }
    };
    pollLock();
    const iv = setInterval(pollLock, 3000);
    return () => { clearInterval(iv); isMountedRef2.current = false; };
  }, [isConnected, clientId]);

  const handleAcquireRemote = useCallback(async () => {
    if (!clientId) return;
    hasReleasedRef.current = false;
    try {
      await fetch('/api/mobile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remote_acquire', clientId }),
      });
      setRemoteLock({ isLocked: true, lockedByMe: true, lockedByName: profile?.name || null });
    } catch { /* ignore */ }
  }, [clientId, profile?.name]);

  const handleReleaseRemote = useCallback(async () => {
    if (!clientId) return;
    hasReleasedRef.current = true;
    try {
      await fetch('/api/mobile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'remote_release', clientId }),
      });
      setRemoteLock({ isLocked: false, lockedByMe: false, lockedByName: null });
    } catch { /* ignore */ }
  }, [clientId]);

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <MobileOfflineIndicator />
      <MobileErrorBoundary>

      {/* ====== HEADER ====== */}
      {isConnected && profile && !isSinging && (
        <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-3 py-2.5">
            {/* Links: Profil-Button */}
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 active:opacity-70 transition-opacity"
            >
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: profile.color }}
              >
                {profile.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  : profile.name[0]?.toUpperCase() || '?'}
              </div>
              <span className="text-sm font-medium text-white/80 max-w-[100px] truncate">{profile.name}</span>
            </button>

            {/* Rechts: Chat-Button, Verbindung-Info + Abmelden */}
            <div className="flex items-center gap-2">
              {/* Chat-Button im Header */}
              <button
                onClick={() => setShowChat(true)}
                className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/10 active:scale-90 transition-transform"
                title={t('mobile.mirrorChat')}
              >
                <span className="text-sm leading-none">💬</span>
              </button>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              {connectionCode && (
                <span className="text-[10px] font-mono text-white/30">{connectionCode}</span>
              )}
              <button
                onClick={handleDisconnect}
                className="text-white/30 hover:text-red-400 text-lg leading-none transition-colors p-1"
                title={t('mobileClient.disconnect')}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mic-Status-Leiste wenn aktiv */}
          {isListening && (
            <div className="px-3 pb-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.max(0, currentPitch.volume * 100))}%` }}
                />
              </div>
              {currentPitch.note !== null && (
                <span className="text-xs font-mono text-cyan-400">
                  {(() => { const n = Math.round(currentPitch.note); const n2 = n % 12; const o = Math.floor(n / 12) - 1; const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; return `${names[n2 < 0 ? n2 + 12 : n2]}${o}`; })()}
                </span>
              )}
            </div>
          )}

          {/* Now-Playing Ticker direkt unter dem Header */}
          {gameState.currentSong && !showChat && (
            <div className="relative overflow-hidden border-t border-white/5 bg-black/30">
              <div className="flex items-center h-7 px-3 min-w-0">
                {gameState.isPlaying ? (
                  <span className="shrink-0 mr-2 flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                ) : (
                  <span className="shrink-0 mr-2 text-white/30 text-[10px]">⏸</span>
                )}
                <div className="overflow-hidden flex-1">
                  <div
                    className="whitespace-nowrap animate-[marquee_12s_linear_infinite]"
                  >
                    <span className="text-xs text-white/60">
                      {gameState.currentSong.title} — {gameState.currentSong.artist}
                    </span>
                    {gameState.gameMode && (
                      <span className="ml-2 text-[10px] text-purple-300/60 uppercase tracking-wider">{gameState.gameMode}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== MAIN CONTENT ====== */}
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
      ) : showProfile ? (
        <div className="pb-20">
          <MobileProfileEditView
            profile={profile} profileName={profileName} onProfileNameChange={setProfileName}
            profileColor={profileColor} onProfileColorChange={setProfileColor}
            avatarPreview={avatarPreview} connectionCode={connectionCode}
            profileColors={PROFILE_COLORS} fileInputRef={fileInputRef}
            onSave={handleSaveProfile} onPhotoUpload={handlePhotoUpload}
            onSwitchToHostProfile={handleSwitchToHostProfile}
          />
          <div className="sticky bottom-16 left-0 right-0 px-4 py-2 bg-gradient-to-t from-black/80 to-transparent">
            <button
              onClick={() => setShowProfile(false)}
              className="w-full py-3 rounded-xl bg-white/10 border border-white/20 text-white/70 font-medium active:scale-[0.98] transition-transform"
            >
              {t('companion.backToParty') || '← Zurück'}
            </button>
          </div>
        </div>
      ) : (
        <div className="pb-16">
          {/* MirrorView: Nur im Kontrollier-Modus oder waehrend des Spiels */}
          {isControlling ? (
            <MirrorView
              mirrorScreenId={mirrorScreenId}
              gameState={gameState}
              clientId={clientId}
              profileName={profile?.name || ''}
              queue={data.queue}
              slotsRemaining={data.slotsRemaining}
              onRemoveFromQueue={data.removeFromQueue}
              onReorderQueue={data.reorderQueue}
              songSearch={data.songSearch}
              onSongSearchChange={data.setSongSearch}
              songsLoading={data.songsLoading}
              songsError={data.songsError}
              songs={data.songs}
              filteredSongs={data.filteredSongs}
              showSongOptions={data.showSongOptions}
              selectedGameMode={data.selectedGameMode}
              selectedPartner={data.selectedPartner}
              availablePartners={data.availablePartners}
              opponents={data.opponents}
              availableProfiles={data.availableProfiles}
              onShowSongOptions={data.setShowSongOptions}
              onSelectGameMode={data.setSelectedGameMode}
              onSelectPartner={data.setSelectedPartner}
              onAddToQueue={data.addToQueue}
              onLoadPartners={data.loadAvailablePartners}
              onLoadOpponents={data.loadOpponents}
              onRefreshSongs={data.loadSongs}
              formatDuration={data.formatDuration}
              difficulty={data.difficulty}
              onDifficultyChange={data.setDifficulty}
              playerMicSource={data.playerMicSource}
              onPlayerMicSourceChange={data.setPlayerMicSource}
              partnerMicSource={data.partnerMicSource}
              onPartnerMicSourceChange={data.setPartnerMicSource}
              duetPartsSwapped={data.duetPartsSwapped}
              onDuetPartsSwappedChange={data.setDuetPartsSwapped}
              addedQueuePosition={data.addedQueuePosition}
              jukeboxWishlist={data.jukeboxWishlist}
              onRemoveFromJukebox={data.removeFromJukeboxWishlist}
              onRefreshJukebox={data.loadJukeboxWishlist}
              gameResults={data.gameResults}
              onNavigate={() => {}}
              onOpenChat={() => setShowChat(true)}
              isRemoteLocked={false}
              remoteLockedBy={null}
              onAcquireRemote={handleAcquireRemote}
              onReleaseRemote={handleReleaseRemote}
              onSendDesktopCommand={handleSendDesktopCommand}
            />
          ) : (
            <MirrorView
              mirrorScreenId={mirrorScreenId}
              gameState={gameState}
              clientId={clientId}
              profileName={profile?.name || ''}
              queue={data.queue}
              slotsRemaining={data.slotsRemaining}
              onRemoveFromQueue={data.removeFromQueue}
              onReorderQueue={data.reorderQueue}
              songSearch={data.songSearch}
              onSongSearchChange={data.setSongSearch}
              songsLoading={data.songsLoading}
              songsError={data.songsError}
              songs={data.songs}
              filteredSongs={data.filteredSongs}
              showSongOptions={data.showSongOptions}
              selectedGameMode={data.selectedGameMode}
              selectedPartner={data.selectedPartner}
              availablePartners={data.availablePartners}
              opponents={data.opponents}
              availableProfiles={data.availableProfiles}
              onShowSongOptions={data.setShowSongOptions}
              onSelectGameMode={data.setSelectedGameMode}
              onSelectPartner={data.setSelectedPartner}
              onAddToQueue={data.addToQueue}
              onLoadPartners={data.loadAvailablePartners}
              onLoadOpponents={data.loadOpponents}
              onRefreshSongs={data.loadSongs}
              formatDuration={data.formatDuration}
              difficulty={data.difficulty}
              onDifficultyChange={data.setDifficulty}
              playerMicSource={data.playerMicSource}
              onPlayerMicSourceChange={data.setPlayerMicSource}
              partnerMicSource={data.partnerMicSource}
              onPartnerMicSourceChange={data.setPartnerMicSource}
              duetPartsSwapped={data.duetPartsSwapped}
              onDuetPartsSwappedChange={data.setDuetPartsSwapped}
              addedQueuePosition={data.addedQueuePosition}
              jukeboxWishlist={data.jukeboxWishlist}
              onRemoveFromJukebox={data.removeFromJukeboxWishlist}
              onRefreshJukebox={data.loadJukeboxWishlist}
              gameResults={data.gameResults}
              onNavigate={() => {}}
              onOpenChat={() => setShowChat(true)}
              isRemoteLocked={true}
              remoteLockedBy={remoteLock.lockedByName}
              onAcquireRemote={handleAcquireRemote}
              onReleaseRemote={handleReleaseRemote}
              onSendDesktopCommand={() => {}}
            />
          )}
        </div>
      )}

      {/* ====== LADEBILDSCHIRM-OVERLAY (Punkt 6) ====== */}
      {isTransitioning && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-gray-900/95 via-purple-900/95 to-gray-900/95 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500/60 border-t-cyan-400 rounded-full animate-spin" />
            <p className="text-sm text-white/50 animate-pulse">Wird geladen...</p>
          </div>
        </div>
      )}

      {/* ====== FOOTER: Horiz. scrollbar Navigation ====== */}
      {isConnected && profile && !showProfile && !isSinging && (
        <MobileBottomNav
          activeScreen={activeFooterScreen}
          onNavigate={handleFooterNavigate}
          disabledScreens={isControlling
            ? []
            : ['party', 'dailyChallenge', 'jukebox', 'highscores', 'achievements']}
        />
      )}

      {/* ====== CHAT OVERLAY ====== */}
      {showChat && clientId && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
          <MobileChat clientId={clientId} onClose={() => setShowChat(false)} />
        </div>
      )}

      {/* ====== CHAT NOTIFICATION POPUP ====== */}
      {chatPopupMessage && !showChat && (
        <ChatNotificationPopup message={chatPopupMessage} onDismiss={() => setChatPopupMessage(null)} />
      )}

      {/* ====== SINGALONG OVERLAY ====== */}
      {(isConnected && profile && gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId === profile.id) ? (
        <SingalongOverlay
          isMyTurn={gameState.singalongTurn.countdown === null}
          countdown={gameState.singalongTurn.countdown}
        />
      ) : null}

      {/* ====== CPTM OVERLAY ====== */}
      {(isConnected && profile && gameState.cptmTurn?.isActive) ? (
        (gameState.cptmTurn.countdown !== null && gameState.cptmTurn.nextProfileId === profile.id) ? (
          <CptmBlinkOverlay countdown={gameState.cptmTurn.countdown} playerColor={profile.color} />
        ) : (gameState.cptmTurn.profileId === profile.id && gameState.cptmTurn.countdown === null) ? (
          <CptmYourTurnOverlay playerName={profile.name} playerColor={profile.color} />
        ) : null
      ) : null}

      {/* ====== TOURNAMENT VOTE OVERLAY ====== */}
      {isConnected && profile && gameState.isPlaying && gameState.gameMode === 'duel' && gameState.tournamentMatchId && !votedMatchIds.has(gameState.tournamentMatchId) && (
        <div className="fixed bottom-16 left-4 right-4 z-50 bg-zinc-900/95 backdrop-blur-sm border border-rose-500/30 rounded-2xl p-4 shadow-2xl">
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
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'tournament_crowd_vote', payload: { matchId: gameState.tournamentMatchId, playerSide: 1 }, clientId }),
                }).catch(() => { console.warn('Failed to cast tournament vote for P1'); });
              }}
            >
              {t('companion.player1')}
            </Button>
            <Button
              className="flex-1 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-sm py-3"
              onClick={() => {
                if (!clientId || !gameState.tournamentMatchId) return;
                setVotedMatchIds(prev => new Set(prev).add(gameState.tournamentMatchId!));
                fetch('/api/mobile', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'tournament_crowd_vote', payload: { matchId: gameState.tournamentMatchId, playerSide: 2 }, clientId }),
                }).catch(() => { console.warn('Failed to cast tournament vote for P2'); });
              }}
            >
              {t('companion.player2')}
            </Button>
          </div>
        </div>
      )}
      {/* ====== SONG-RUNNING WARNING OVERLAY (Issue 11) ====== */}
      {showSongRunningOverlay ? (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSongRunningOverlay(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-amber-400/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{'\u26A0\uFE0F'}</div>
              <h2 className="text-lg font-bold text-white">{t('mobile.mirrorSongRunningWarning')}</h2>
              <p className="text-sm text-white/50 mt-2">
                {gameState.currentSong ? `${gameState.currentSong.title} {'\u2014'} ${gameState.currentSong.artist}` : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSongRunningOverlay(false);
                  handleSendDesktopCommand('quit');
                }}
                className="flex-1 py-3 rounded-xl font-medium bg-red-500/20 border border-red-500/40 text-red-300 active:bg-red-500/30 transition-all text-sm"
              >
                {'\u2716'} {t('mobile.mirrorEndSong')}
              </button>
              <button
                onClick={() => {
                  setShowSongRunningOverlay(false);
                  handleReleaseRemote();
                  // Navigate to home locally so the user can use free functions
                  setActiveDesktopScreen('home');
                }}
                className="flex-1 py-3 rounded-xl font-medium bg-green-500/20 border border-green-500/40 text-green-300 active:bg-green-500/30 transition-all text-sm"
              >
                {'\u{1F513}'} {t('mobile.mirrorReleaseControlShort')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      </MobileErrorBoundary>
    </div>
  );
}

// ===================== SINGALONG OVERLAY =====================
interface SingalongOverlayProps { isMyTurn: boolean; countdown: number | null; }

function SingalongOverlay({ isMyTurn, countdown }: SingalongOverlayProps) {
  const { t } = useTranslation();
  const [flashVisible, setFlashVisible] = useState(false);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 300);
      return () => clearTimeout(flashTimer);
    } else if (countdown === null && isMyTurn) {
      queueMicrotask(() => setFlashVisible(true));
      const flashTimer = setTimeout(() => setFlashVisible(false), 500);
      return () => clearTimeout(flashTimer);
    }
  }, [countdown, isMyTurn]);

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
interface CptmBlinkOverlayProps { countdown: number | null; playerColor: string; }

function CptmBlinkOverlay({ countdown, playerColor }: CptmBlinkOverlayProps) {
  const { t } = useTranslation();
  const intensity = countdown === 3 ? 0.15 : countdown === 2 ? 0.3 : 0.5;
  if (countdown === null || countdown <= 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ backgroundColor: playerColor, opacity: intensity }}>
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: playerColor, animation: `cptm-blink ${countdown === 3 ? 2 : countdown === 2 ? 1 : 0.5}s ease-in-out infinite alternate` }} />
      <div className="relative z-10 text-center">
        <div className="text-8xl font-bold text-white/90 animate-pulse">{countdown}</div>
        <div className="text-lg font-medium text-white/70 mt-2">{t('mobileCompanion.getReady')}</div>
      </div>
      <style>{`@keyframes cptm-blink { 0% { opacity: 0; } 100% { opacity: ${Math.min(intensity * 2.5, 0.8)}; } }`}</style>
    </div>
  );
}

// ===================== CPTM YOUR TURN OVERLAY =====================
interface CptmYourTurnOverlayProps { playerName: string; playerColor: string; }

function CptmYourTurnOverlay({ playerName, playerColor }: CptmYourTurnOverlayProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  useEffect(() => { queueMicrotask(() => setShow(true)); }, []);
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${playerColor}40, transparent 70%)` }} />
      <div className="relative z-10 text-center animate-[scale-in_0.3s_ease-out]">
        <div className="text-sm font-bold text-white/60 uppercase tracking-[0.3em] mb-2">{t('mobileCompanion.yourTurn')}</div>
        <div className="text-5xl font-bold text-white" style={{ textShadow: `0 0 30px ${playerColor}` }}>{playerName}</div>
        <div className="mt-4 mx-auto h-1.5 rounded-full" style={{ width: '120px', backgroundColor: playerColor }} />
      </div>
    </div>
  );
}
MobileClientView.displayName = 'MobileClientView';
SingalongOverlay.displayName = 'SingalongOverlay';
CptmBlinkOverlay.displayName = 'CptmBlinkOverlay';
CptmYourTurnOverlay.displayName = 'CptmYourTurnOverlay';
