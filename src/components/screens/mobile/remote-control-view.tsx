'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MobileProfile } from './mobile-types';

// ===================== REMOTE CONTROL VIEW =====================
export function RemoteControlView({ 
  clientId, 
  profile,
  onBack 
}: { 
  clientId: string | null; 
  profile: MobileProfile | null;
  onBack: () => void;
}) {
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
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  
  // Poll remote control state
  useEffect(() => {
    const pollRemoteState = async () => {
      try {
        const response = await fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`);
        const data = await response.json();
        if (data.success) {
          setRemoteState(prev => ({
            ...prev,
            hasControl: data.remoteControl.iHaveControl,
            lockedBy: data.remoteControl.lockedBy,
            lockedByName: data.remoteControl.lockedByName,
            isLoading: false,
          }));
        }
      } catch {
        setRemoteState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    pollRemoteState();
    const interval = setInterval(pollRemoteState, 2000);
    return () => clearInterval(interval);
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
          error: data.message || 'Failed to acquire control',
        }));
      }
    } catch {
      setRemoteState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Connection error',
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
  
  // Send command
  const sendCommand = async (command: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'restart' | 'home' | 'library' | 'settings') => {
    if (!clientId || !remoteState.hasControl) return;
    
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
      
      const data = await response.json();
      
      if (data.success) {
        setCommandSent(command);
        setRemoteState(prev => ({ ...prev, error: null }));
        setTimeout(() => setCommandSent(null), 1500);
      } else {
        // Show error from server (e.g., "no active game")
        setRemoteState(prev => ({
          ...prev,
          error: data.message || `Command "${command}" failed`,
        }));
      }
    } catch {
      // Connection lost — show clear error with reconnection hint
      setRemoteState(prev => ({
        ...prev,
        error: 'Connection lost. Check if the main app is running. Retrying...',
        hasControl: false, // Release control since we can't communicate
      }));
      // Re-poll after a delay to detect when connection is restored
      setTimeout(() => {
        fetch(`/api/mobile?action=remotecontrol&clientId=${clientId}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
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
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <h2 className="text-xl font-bold">🎮 Remote Control</h2>
      </div>
      
      {/* Status Card */}
      <Card className={`mb-6 ${remoteState.hasControl ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 border-white/10'}`}>
        <CardContent className="py-4">
          {remoteState.hasControl ? (
            <div className="text-center">
              <div className="text-3xl mb-2">🎮</div>
              <p className="font-semibold text-cyan-400">You have control!</p>
              <p className="text-sm text-white/40 mt-1">You can now control the main app</p>
              <Button 
                onClick={releaseControl}
                variant="outline"
                className="mt-4 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Release Control
              </Button>
            </div>
          ) : remoteState.lockedBy ? (
            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <p className="font-semibold text-orange-400">Control is locked</p>
              <p className="text-sm text-white/40 mt-1">
                {remoteState.lockedByName} is currently controlling the app
              </p>
              <p className="text-xs text-white/30 mt-2">
                Wait for them to release control
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-3xl mb-2">🔓</div>
              <p className="font-semibold text-white/60">Remote control available</p>
              <Button 
                onClick={acquireControl}
                className="mt-4 bg-gradient-to-r from-cyan-500 to-purple-500"
                disabled={remoteState.isLoading}
              >
                {remoteState.isLoading ? 'Acquiring...' : 'Take Control'}
              </Button>
              {remoteState.error && (
                <p className="text-red-400 text-sm mt-2">{remoteState.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Remote Control Buttons */}
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
                Reconnect
              </Button>
            )}
          </div>
        )}
        
        {/* Transport Controls */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Playback Control</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              <Button
                onClick={() => sendCommand('previous')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'previous' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⏮️</span>
                <span className="text-xs">Prev</span>
              </Button>
              <Button
                onClick={() => sendCommand('play')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'play' ? 'bg-green-500/30' : ''}`}
              >
                <span className="text-xl">▶️</span>
                <span className="text-xs">Play</span>
              </Button>
              <Button
                onClick={() => sendCommand('pause')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'pause' ? 'bg-yellow-500/30' : ''}`}
              >
                <span className="text-xl">⏸️</span>
                <span className="text-xs">Pause</span>
              </Button>
              <Button
                onClick={() => sendCommand('next')}
                variant="outline"
                className={`h-16 flex flex-col border-white/20 ${commandSent === 'next' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⏭️</span>
                <span className="text-xs">Next</span>
              </Button>
            </div>
            
            {/* Stop and Restart */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                onClick={() => setShowStopConfirm(true)}
                variant="outline"
                className={`h-12 flex items-center gap-2 border-red-500/30 ${showStopConfirm ? 'bg-red-500/30' : ''}`}
              >
                <span>⏹️</span>
                <span>Stop</span>
              </Button>
              <Button
                onClick={() => sendCommand('restart')}
                variant="outline"
                className={`h-12 flex items-center gap-2 border-purple-500/30 ${commandSent === 'restart' ? 'bg-purple-500/30' : ''}`}
              >
                <span>🔄</span>
                <span>Restart</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Navigation Controls */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => sendCommand('home')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'home' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">🏠</span>
                <span className="text-xs">Home</span>
              </Button>
              <Button
                onClick={() => sendCommand('library')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'library' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">📚</span>
                <span className="text-xs">Library</span>
              </Button>
              <Button
                onClick={() => sendCommand('settings')}
                variant="outline"
                className={`h-14 flex flex-col border-white/20 ${commandSent === 'settings' ? 'bg-cyan-500/30' : ''}`}
              >
                <span className="text-xl">⚙️</span>
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Info */}
        <div className="text-center text-xs text-white/40 mt-4">
          <p>Only one device can control the app at a time.</p>
          <p>Commands are sent to the main screen instantly.</p>
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="bg-gray-900/95 border-red-500/30 mx-4 w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-center text-lg text-red-400">Song stoppen?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-white/70 text-sm">
                Möchtest du den aktuellen Song wirklich stoppen und zur Bibliothek zurückkehren?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowStopConfirm(false);
                    // Send pause instead of stop to keep the song loaded
                    sendCommand('pause');
                  }}
                  className="flex-1 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                >
                  ⏸ Pause
                </Button>
                <Button
                  onClick={() => {
                    setShowStopConfirm(false);
                    sendCommand('stop');
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-400 text-white"
                >
                  ⏹ Stoppen
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowStopConfirm(false)}
                className="w-full text-white/40 hover:text-white/60"
              >
                Abbrechen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
