'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== TYPES =====================
type RemoteCommandType =
  | 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'restart'
  | 'home' | 'library' | 'settings' | 'queue' | 'party' | 'profile'
  | 'highscores' | 'achievements' | 'jukebox' | 'editor' | 'dailyChallenge' | 'online'
  | 'up' | 'down' | 'left' | 'right' | 'enter'
  | 'fullscreen' | 'escape' | 'tab' | 'backspace'
  | 'volume_up' | 'volume_down' | 'seek_forward' | 'seek_backward'
  | 'focus_search' | 'random_song' | 'random_duel' | 'play_queue'
  | 'start_ptm' | 'start_br' | 'start_tournament'
  | 'start_missing_words' | 'start_blind' | 'start_medley'
  | 'start_rate_my_song' | 'start_companion_singalong';

// ===================== SCREEN NAVIGATION CONFIG =====================
const SCREEN_BUTTONS: { key: RemoteCommandType; icon: string; labelKey: string; fallback: string }[] = [
  { key: 'home',         icon: '\u{1F3E0}', labelKey: 'remoteControl.home',         fallback: 'Home' },
  { key: 'library',      icon: '\u{1F4DA}', labelKey: 'remoteControl.library',      fallback: 'Library' },
  { key: 'party',        icon: '\u{1F389}', labelKey: 'remoteControl.party',        fallback: 'Party' },
  { key: 'queue',        icon: '\u{1F4CB}', labelKey: 'remoteControl.queue',        fallback: 'Queue' },
  { key: 'profile',      icon: '\u{1F464}', labelKey: 'remoteControl.profile',      fallback: 'Profile' },
  { key: 'highscores',   icon: '\u{1F3C6}', labelKey: 'remoteControl.highscores',   fallback: 'Highscores' },
  { key: 'achievements', icon: '\u2B50',     labelKey: 'remoteControl.achievements', fallback: 'Achieve' },
  { key: 'jukebox',      icon: '\u{1F3B5}', labelKey: 'remoteControl.jukebox',     fallback: 'Jukebox' },
  { key: 'settings',     icon: '\u2699\uFE0F', labelKey: 'remoteControl.settings', fallback: 'Settings' },
  { key: 'editor',       icon: '\u{1F4DD}', labelKey: 'remoteControl.editor',       fallback: 'Editor' },
  { key: 'dailyChallenge', icon: '\u{1F3AF}', labelKey: 'remoteControl.dailyChallenge', fallback: 'Daily' },
  { key: 'online',       icon: '\u{1F310}', labelKey: 'remoteControl.online',       fallback: 'Online' },
];

// ===================== HAPTIC FEEDBACK =====================
function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

// ===================== HELPER: RESOLVE TRANSLATION =====================
function tr(t: (key: string) => string, key: string, fallback: string): string {
  const result = t(key);
  return result === key ? fallback : result;
}

// ===================== REMOTE CONTROL VIEW =====================
export function RemoteControlView({
  clientId,
  onBack
}: {
  clientId: string | null;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [remoteState, setRemoteState] = useState<{
    hasControl: boolean;
    lockedBy: string | null;
    lockedByName: string | null;
    isLoading: boolean;
    error: string | null;
  }>({
    hasControl: false,
    lockedBy: null,
    lockedByName: null,
    isLoading: true,
    error: null,
  });

  const [commandSent, setCommandSent] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isMountedRef = useRef(true);

  // Poll remote control state
  useEffect(() => {
    isMountedRef.current = true;
    const pollRemoteState = async () => {
      try {
        const response = await fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && isMountedRef.current) {
          setRemoteState(prev => ({
            ...prev,
            hasControl: data.remoteControl.iHaveControl,
            lockedBy: data.remoteControl.lockedBy,
            lockedByName: data.remoteControl.lockedByName,
            isLoading: false,
          }));
          // Derive playing state from gamestate if available
          if (data.remoteControl.gameState?.isPlaying !== undefined) {
            setIsPlaying(data.remoteControl.gameState.isPlaying);
          }
        }
      } catch {
        if (isMountedRef.current) {
          setRemoteState(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    pollRemoteState();
    const interval = setInterval(pollRemoteState, 2000);
    return () => {
      clearInterval(interval);
      isMountedRef.current = false;
    };
  }, [clientId]);

  // Acquire remote control
  const acquireControl = async () => {
    if (!clientId) return;

    setRemoteState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_acquire',
          clientId,
        }),
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.success) {
        setRemoteState(prev => ({
          ...prev,
          hasControl: true,
          lockedBy: clientId,
          lockedByName: data.remoteControl.lockedByName,
          isLoading: false,
        }));
      } else {
        setRemoteState(prev => ({
          ...prev,
          isLoading: false,
          error: data.message || tr(t, 'remoteControl.acquireFailed', 'Failed to acquire control'),
        }));
      }
    } catch {
      setRemoteState(prev => ({
        ...prev,
        isLoading: false,
        error: tr(t, 'remoteControl.connectionError', 'Connection error'),
      }));
    }
  };

  // Release remote control
  const releaseControl = async () => {
    if (!clientId) return;

    setRemoteState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_release',
          clientId,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();

      if (data.success) {
        setRemoteState(prev => ({
          ...prev,
          hasControl: false,
          lockedBy: null,
          lockedByName: null,
          isLoading: false,
        }));
      }
    } catch {
      setRemoteState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Send command (with debounce to ignore rapid duplicate presses)
  const lastCommandRef = useRef<{ command: string; timestamp: number } | null>(null);
  const sendCommand = useCallback(async (command: RemoteCommandType) => {
    if (!clientId || !remoteState.hasControl) return;

    // Debounce: ignore same command within 300ms
    const now = Date.now();
    if (lastCommandRef.current && lastCommandRef.current.command === command && now - lastCommandRef.current.timestamp < 300) {
      return;
    }
    lastCommandRef.current = { command, timestamp: now };

    vibrate();

    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'remote_command',
          clientId,
          payload: { command },
        }),
      });

      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.success) {
        setCommandSent(command);
        setRemoteState(prev => ({ ...prev, error: null }));
        // Update local play/pause state for toggle button
        if (command === 'play') setIsPlaying(true);
        if (command === 'pause') setIsPlaying(false);
        setTimeout(() => setCommandSent(null), 1500);
      } else {
        setRemoteState(prev => ({
          ...prev,
          error: data.message || tr(t, 'remoteControl.commandFailed', 'Command failed'),
        }));
      }
    } catch {
      setRemoteState(prev => ({
        ...prev,
        error: tr(t, 'remoteControl.connectionLost', 'Connection lost'),
        hasControl: false,
      }));
      setTimeout(() => {
        fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => {
            if (data.success && isMountedRef.current) {
              setRemoteState(prev => ({
                ...prev,
                hasControl: data.remoteControl.iHaveControl,
                lockedBy: data.remoteControl.lockedBy,
                lockedByName: data.remoteControl.lockedByName,
                isLoading: false,
                error: null,
              }));
            }
          })
          .catch(() => {});
      }, 3000);
    }
  }, [clientId, remoteState.hasControl, t]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    sendCommand(isPlaying ? 'pause' : 'play');
  }, [isPlaying, sendCommand]);

  // Flash-color helper based on command type
  const getFlashClass = (cmd: string, sentCmd: string | null): string => {
    if (sentCmd !== cmd) return '';
    if (cmd === 'play' || cmd === 'pause') return 'bg-green-500/30';
    if (cmd === 'stop' || cmd === 'escape') return 'bg-red-500/30';
    if (cmd === 'fullscreen' || cmd === 'tab') return 'bg-purple-500/30';
    return 'bg-cyan-500/30';
  };

  // Loading state
  if (remoteState.isLoading && !remoteState.lockedBy) {
    return (
      <div className="p-4 flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-24 overflow-y-auto">
      <div className="p-4 max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white/60">
            {tr(t, 'remoteControl.back', '\u2190 Back')}
          </Button>
          <h2 className="text-xl font-bold">{tr(t, 'remoteControl.title', '\u{1F3AE} Remote Control')}</h2>
        </div>

        {/* ========== Section 1: Status Card ========== */}
        <Card className={`mb-4 ${remoteState.hasControl ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
          <CardContent className="py-4">
            {remoteState.hasControl ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="text-3xl">{'\u{1F3AE}'}</div>
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
                <p className="font-semibold text-cyan-400">{tr(t, 'remoteControl.youHaveControl', 'You have control!')}</p>
                <p className="text-sm text-white/40 mt-1">{tr(t, 'remoteControl.canControl', 'You can now control the main app')}</p>
                <Button
                  onClick={releaseControl}
                  variant="outline"
                  className="mt-3 border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  {tr(t, 'remoteControl.releaseControl', 'Release Control')}
                </Button>
              </div>
            ) : remoteState.lockedBy ? (
              <div className="text-center">
                <div className="text-3xl mb-2">{'\u{1F512}'}</div>
                <p className="font-semibold text-orange-400">{tr(t, 'remoteControl.controlLocked', 'Control is locked')}</p>
                <p className="text-sm text-white/40 mt-1">
                  {remoteState.lockedByName} {tr(t, 'remoteControl.isControlling', 'is currently controlling the app')}
                </p>
                <p className="text-xs text-white/30 mt-2">
                  {tr(t, 'remoteControl.waitForRelease', 'Wait for them to release control')}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl mb-2">{'\u{1F513}'}</div>
                <p className="font-semibold text-white/60">{tr(t, 'remoteControl.remoteAvailable', 'Remote control available')}</p>
                <Button
                  onClick={acquireControl}
                  className="mt-3 bg-gradient-to-r from-cyan-500 to-purple-500"
                  disabled={remoteState.isLoading}
                >
                  {remoteState.isLoading ? tr(t, 'remoteControl.acquiring', 'Acquiring...') : tr(t, 'remoteControl.takeControl', 'Take Control')}
                </Button>
                {remoteState.error && (
                  <p className="text-red-400 text-sm mt-2">{remoteState.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== Remote Control Buttons ========== */}
        <div className={`space-y-4 ${!remoteState.hasControl ? 'opacity-40 pointer-events-none' : ''}`}>

          {/* Error Banner */}
          {remoteState.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center">{remoteState.error}</p>
              {!remoteState.hasControl && (
                <Button
                  onClick={acquireControl}
                  className="mt-2 w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-sm"
                >
                  {tr(t, 'remoteControl.reconnect', 'Reconnect')}
                </Button>
              )}
            </div>
          )}

          {/* ========== Section 2: Transport Controls ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u{1F3B5}'}</span>
                {tr(t, 'remoteControl.playbackControl', 'Playback Control')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Row 1: Previous, Play/Pause, Next */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('previous')}
                  variant="outline"
                  className={`h-14 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('previous', commandSent)}`}
                >
                  <span className="text-xl leading-none">{'\u23EE\uFE0F'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.prev', 'Prev')}</span>
                </Button>
                <Button
                  onClick={togglePlayPause}
                  variant="outline"
                  className={`h-14 flex flex-col border-cyan-500/40 bg-cyan-500/5 min-h-[44px] ${
                    commandSent === 'play' ? 'bg-green-500/30 border-green-500/50' :
                    commandSent === 'pause' ? 'bg-yellow-500/30 border-yellow-500/50' : ''
                  }`}
                >
                  <span className="text-2xl leading-none">{isPlaying ? '\u23F8\uFE0F' : '\u25B6\uFE0F'}</span>
                  <span className="text-[10px] mt-0.5">{isPlaying ? tr(t, 'remoteControl.pause', 'Pause') : tr(t, 'remoteControl.play', 'Play')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('next')}
                  variant="outline"
                  className={`h-14 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('next', commandSent)}`}
                >
                  <span className="text-xl leading-none">{'\u23ED\uFE0F'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.next', 'Next')}</span>
                </Button>
              </div>

              {/* Row 2: Stop, Restart */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => sendCommand('stop')}
                  variant="outline"
                  className={`h-11 flex items-center justify-center gap-2 border-red-500/30 min-h-[44px] ${getFlashClass('stop', commandSent)}`}
                >
                  <span>{'\u23F9\uFE0F'}</span>
                  <span className="text-xs">{tr(t, 'remoteControl.stop', 'Stop')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('restart')}
                  variant="outline"
                  className={`h-11 flex items-center justify-center gap-2 border-purple-500/30 min-h-[44px] ${getFlashClass('restart', commandSent)}`}
                >
                  <span>{'\u{1F504}'}</span>
                  <span className="text-xs">{tr(t, 'remoteControl.restart', 'Restart')}</span>
                </Button>
              </div>

              {/* Row 3: Seek Back, Volume Down, Volume Up, Seek Forward */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  onClick={() => sendCommand('seek_backward')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('seek_backward', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u23EA'}</span>
                  <span className="text-[9px] mt-0.5">-10s</span>
                </Button>
                <Button
                  onClick={() => sendCommand('volume_down')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('volume_down', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F508}'}</span>
                  <span className="text-[9px] mt-0.5">Vol-</span>
                </Button>
                <Button
                  onClick={() => sendCommand('volume_up')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('volume_up', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F50A}'}</span>
                  <span className="text-[9px] mt-0.5">Vol+</span>
                </Button>
                <Button
                  onClick={() => sendCommand('seek_forward')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('seek_forward', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u23E9'}</span>
                  <span className="text-[9px] mt-0.5">+10s</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ========== Section 3: Screen Navigation ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u{1F4F1}'}</span>
                {tr(t, 'remoteControl.screenNavigation', 'Screen Navigation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-1.5">
                {SCREEN_BUTTONS.map(({ key, icon, labelKey, fallback }) => (
                  <Button
                    key={key}
                    onClick={() => sendCommand(key)}
                    variant="outline"
                    className={`h-12 flex flex-col border-white/15 min-h-[44px] text-[10px] ${getFlashClass(key, commandSent)}`}
                  >
                    <span className="text-base leading-none">{icon}</span>
                    <span className="mt-0.5 leading-none">{tr(t, labelKey, fallback)}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ========== Section 4: Quick Actions ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u26A1'}</span>
                {tr(t, 'remoteControl.quickActions', 'Quick Actions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('fullscreen')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('fullscreen', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F4FA}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.fullscreen', 'Fullscreen')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('escape')}
                  variant="outline"
                  className={`h-11 flex flex-col border-red-500/30 min-h-[44px] ${getFlashClass('escape', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F6AB}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.escape', 'Back / Esc')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('tab')}
                  variant="outline"
                  className={`h-11 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('tab', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F4C2}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.tab', 'Tab')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ========== Section 5: Directional Pad ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u{1F5B1}'}</span>
                {tr(t, 'remoteControl.elementNav', 'Element Navigation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-1">
                {/* Up */}
                <Button
                  onClick={() => sendCommand('up')}
                  variant="outline"
                  className={`w-20 h-11 flex items-center justify-center border-white/20 min-h-[44px] ${getFlashClass('up', commandSent)}`}
                >
                  <span className="text-lg">{'\u2B06\uFE0F'}</span>
                </Button>
                {/* Left, Enter, Right */}
                <div className="grid grid-cols-3 gap-1">
                  <Button
                    onClick={() => sendCommand('left')}
                    variant="outline"
                    className={`h-11 flex items-center justify-center border-white/20 min-h-[44px] ${getFlashClass('left', commandSent)}`}
                  >
                    <span className="text-lg">{'\u2B05\uFE0F'}</span>
                  </Button>
                  <Button
                    onClick={() => sendCommand('enter')}
                    variant="outline"
                    className={`h-11 flex items-center justify-center border-green-500/50 bg-green-500/10 min-h-[44px] ${commandSent === 'enter' ? 'bg-green-500/30' : ''}`}
                  >
                    <span className="text-lg font-bold">{'\u2714'}</span>
                  </Button>
                  <Button
                    onClick={() => sendCommand('right')}
                    variant="outline"
                    className={`h-11 flex items-center justify-center border-white/20 min-h-[44px] ${getFlashClass('right', commandSent)}`}
                  >
                    <span className="text-lg">{'\u27A1\uFE0F'}</span>
                  </Button>
                </div>
                {/* Down */}
                <Button
                  onClick={() => sendCommand('down')}
                  variant="outline"
                  className={`w-20 h-11 flex items-center justify-center border-white/20 min-h-[44px] ${getFlashClass('down', commandSent)}`}
                >
                  <span className="text-lg">{'\u2B07\uFE0F'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ========== Section 6: Party Quick Start ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u{1F389}'}</span>
                {tr(t, 'remoteControl.partyQuickStart', 'Party Quick Start')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => sendCommand('party')}
                variant="outline"
                className={`w-full h-11 flex items-center justify-center gap-2 border-white/20 min-h-[44px] ${getFlashClass('party', commandSent)}`}
              >
                <span>{'\u{1F389}'}</span>
                <span className="text-sm font-medium">{tr(t, 'remoteControl.goToParty', 'Go to Party Screen')}</span>
              </Button>
              {/* Row 1: Classic modes */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('start_ptm')}
                  variant="outline"
                  className={`h-12 flex flex-col border-yellow-500/30 min-h-[44px] ${getFlashClass('start_ptm', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F3A4}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.passTheMic', 'Pass the Mic')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('start_br')}
                  variant="outline"
                  className={`h-12 flex flex-col border-red-500/30 min-h-[44px] ${getFlashClass('start_br', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u2694\uFE0F'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.battleRoyale', 'Battle Royale')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('start_tournament')}
                  variant="outline"
                  className={`h-12 flex flex-col border-purple-500/30 min-h-[44px] ${getFlashClass('start_tournament', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F3C6}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.tournament', 'Tournament')}</span>
                </Button>
              </div>
              {/* Row 2: Challenge modes */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('start_missing_words')}
                  variant="outline"
                  className={`h-12 flex flex-col border-orange-500/30 min-h-[44px] ${getFlashClass('start_missing_words', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F4DD}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.missingWords', 'Missing Words')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('start_blind')}
                  variant="outline"
                  className={`h-12 flex flex-col border-green-500/30 min-h-[44px] ${getFlashClass('start_blind', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F648}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.blindKaraoke', 'Blind Karaoke')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('start_medley')}
                  variant="outline"
                  className={`h-12 flex flex-col border-purple-500/30 min-h-[44px] ${getFlashClass('start_medley', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F3B5}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.medley', 'Medley')}</span>
                </Button>
              </div>
              {/* Row 3: Special modes */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('start_rate_my_song')}
                  variant="outline"
                  className={`h-12 flex flex-col border-amber-500/30 min-h-[44px] ${getFlashClass('start_rate_my_song', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u2B50'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.rateMySong', 'Rate My Song')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('start_companion_singalong')}
                  variant="outline"
                  className={`h-12 flex flex-col border-emerald-500/30 min-h-[44px] ${getFlashClass('start_companion_singalong', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F4F1}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.companionSingalong', 'Sing-Along')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('online')}
                  variant="outline"
                  className={`h-12 flex flex-col border-cyan-500/30 min-h-[44px] ${getFlashClass('online', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F310}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.online', 'Online')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ========== Section 7: Quick Shortcuts (mirror keyboard shortcuts) ========== */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <span>{'\u2328\uFE0F'}</span>
                {tr(t, 'remoteControl.quickShortcuts', 'Quick Shortcuts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => sendCommand('focus_search')}
                  variant="outline"
                  className={`h-12 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('focus_search', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F50D}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.focusSearch', 'Search (Ctrl+L)')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('random_song')}
                  variant="outline"
                  className={`h-12 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('random_song', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F3B2}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.randomSong', 'Random (Ctrl+R)')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('random_duel')}
                  variant="outline"
                  className={`h-12 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('random_duel', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u2694\uFE0F'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.randomDuel', 'Duel (Ctrl+D)')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('play_queue')}
                  variant="outline"
                  className={`h-12 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('play_queue', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u{1F4CB}'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.playQueue', 'Queue (Ctrl+Q)')}</span>
                </Button>
                <Button
                  onClick={() => sendCommand('backspace')}
                  variant="outline"
                  className={`h-12 flex flex-col border-white/20 min-h-[44px] ${getFlashClass('backspace', commandSent)}`}
                >
                  <span className="text-base leading-none">{'\u232B'}</span>
                  <span className="text-[10px] mt-0.5">{tr(t, 'remoteControl.backspace', 'Back (Bksp)')}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="text-center text-xs text-white/40 mt-4 pb-4">
            <p>{tr(t, 'remoteControl.oneDevice', 'Only one device can control the app at a time.')}</p>
            <p>{tr(t, 'remoteControl.instantCommands', 'Commands are sent to the main screen instantly.')}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
