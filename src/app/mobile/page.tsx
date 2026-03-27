'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMobilePage } from '@/hooks/use-mobile-page';

export default function MobilePage() {
  const {
    isConnected,
    connectionCode,
    mode,
    volume,
    pitch,
    error,
    successMessage,
    isMicActive,
    remoteControl,
    isAcquiringControl,
    gameState,
    libraryLoading,
    librarySearch,
    queueSlots,
    addingSongId,
    filteredSongs,
    setMode,
    setLibrarySearch,
    toggleMic,
    acquireControl,
    releaseControl,
    sendRemoteCommand,
    skipAd,
    addSongToQueue,
    setError,
    setSuccessMessage,
  } = useMobilePage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Karaoke Successor
        </h1>
        <p className="text-sm text-white/60">Mobile Companion</p>
      </div>

      {/* Connection Status */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
          <div className="flex items-center gap-2">
            {connectionCode && <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">{connectionCode}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30 mb-4">
          <CardContent className="py-3 text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {successMessage && (
        <Card className="bg-green-500/10 border-green-500/30 mb-4">
          <CardContent className="py-3 text-green-400 text-sm flex items-center justify-between">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300">✕</button>
          </CardContent>
        </Card>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <Button onClick={() => setMode('mic')} className={`flex-1 ${mode === 'mic' ? 'bg-cyan-500' : 'bg-white/10'}`}>🎤 Mic</Button>
        <Button onClick={() => setMode('library')} className={`flex-1 ${mode === 'library' ? 'bg-cyan-500' : 'bg-white/10'}`}>📚 Library</Button>
        <Button onClick={() => setMode('remote')} className={`flex-1 ${mode === 'remote' ? 'bg-cyan-500' : 'bg-white/10'}`}>📱 Remote</Button>
      </div>

      {/* Mic Mode */}
      {mode === 'mic' && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/60">Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div className="h-8 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all" style={{ width: `${volume * 100}%` }} />
              </div>
            </div>
            {pitch && <div className="text-center py-4 bg-white/5 rounded-lg"><div className="text-4xl font-bold text-cyan-400">{pitch}</div><div className="text-sm text-white/60">Hz</div></div>}
            <button onClick={toggleMic} className={`w-full aspect-square max-h-64 rounded-full flex items-center justify-center transition-all ${isMicActive ? 'bg-gradient-to-br from-red-500 to-pink-500 shadow-lg shadow-red-500/30' : 'bg-gradient-to-br from-cyan-500 to-purple-500 shadow-lg shadow-purple-500/30'}`}>
              <div className="text-center">
                <div className="text-6xl mb-2">{isMicActive ? '⏹️' : '🎤'}</div>
                <div className="font-bold text-lg">{isMicActive ? 'Stop' : 'Start'}</div>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* Library Mode */}
      {mode === 'library' && (
        <div className="space-y-3">
          {/* Queue Slots Indicator */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Queue Slots</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div 
                      key={i} 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        i < queueSlots.used ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search */}
          <Input
            placeholder="Search songs..."
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />

          {/* Songs List */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {libraryLoading ? 'Loading...' : `${filteredSongs.length} Songs`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filteredSongs.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    {libraryLoading ? 'Loading songs...' : 'No songs found'}
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredSongs.map(song => (
                      <div 
                        key={song.id} 
                        className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                      >
                        {/* Cover Image */}
                        {song.coverImage ? (
                          <img 
                            src={song.coverImage} 
                            alt="" 
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                            🎵
                          </div>
                        )}
                        
                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{song.title}</p>
                          <p className="text-sm text-white/60 truncate">{song.artist}</p>
                          {song.genre && (
                            <Badge variant="outline" className="text-xs mt-1">{song.genre}</Badge>
                          )}
                        </div>
                        
                        {/* Add to Queue Button */}
                        <Button
                          size="sm"
                          onClick={() => addSongToQueue(song)}
                          disabled={queueSlots.used >= queueSlots.max || addingSongId === song.id}
                          className={`flex-shrink-0 ${
                            queueSlots.used >= queueSlots.max 
                              ? 'bg-white/10 text-white/40' 
                              : 'bg-cyan-500 hover:bg-cyan-400'
                          }`}
                        >
                          {addingSongId === song.id ? '...' : '+'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remote Mode */}
      {mode === 'remote' && (
        <div className="space-y-3">
          {/* Control Status Card */}
          <Card className={`border-white/10 ${remoteControl.iHaveControl ? 'bg-green-500/10 border-green-500/30' : remoteControl.isLocked ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5'}`}>
            <CardContent className="py-3">
              {remoteControl.iHaveControl ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm text-green-400">You have control</span>
                  </div>
                  <Button onClick={releaseControl} variant="outline" size="sm" className="border-green-500/50 text-green-400 hover:bg-green-500/20">
                    Release
                  </Button>
                </div>
              ) : remoteControl.isLocked ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-orange-400">Controlled by: {remoteControl.lockedByName || 'Another device'}</span>
                </div>
              ) : (
                <Button
                  onClick={acquireControl}
                  disabled={isAcquiringControl}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                >
                  {isAcquiringControl ? 'Acquiring...' : '🎮 Take Control'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Skip Ad Banner */}
          {gameState.isAdPlaying && (
            <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 animate-pulse">
              <CardContent className="py-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-ping" />
                    <span className="text-yellow-400 font-bold text-lg">Werbung läuft</span>
                  </div>
                  <Button
                    onClick={skipAd}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold h-14 text-lg shadow-lg shadow-yellow-500/30"
                  >
                    ⏭️ Werbung überspringen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playback Controls */}
          <Card className={`bg-white/5 border-white/10 transition-opacity ${!remoteControl.iHaveControl ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Playback</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <Button onClick={() => sendRemoteCommand('previous')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-16 text-2xl disabled:opacity-50">⏮️</Button>
              <Button onClick={() => sendRemoteCommand('play')} disabled={!remoteControl.iHaveControl} className="bg-green-500 h-16 text-2xl disabled:opacity-50">▶️</Button>
              <Button onClick={() => sendRemoteCommand('next')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-16 text-2xl disabled:opacity-50">⏭️</Button>
            </CardContent>
          </Card>

          {/* Navigation */}
          <Card className={`bg-white/5 border-white/10 transition-opacity ${!remoteControl.iHaveControl ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Navigation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendRemoteCommand('library')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">📚 Library</Button>
              <Button onClick={() => sendRemoteCommand('queue')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">📋 Queue</Button>
              <Button onClick={() => sendRemoteCommand('settings')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">⚙️ Settings</Button>
              <Button onClick={() => sendRemoteCommand('home')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">🏠 Home</Button>
            </CardContent>
          </Card>

          {/* Game Controls */}
          <Card className={`bg-white/5 border-white/10 transition-opacity ${!remoteControl.iHaveControl ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Game Controls</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendRemoteCommand('pause')} disabled={!remoteControl.iHaveControl} className="bg-yellow-500/80 h-14 disabled:opacity-50">⏸️ Pause</Button>
              <Button onClick={() => sendRemoteCommand('stop')} disabled={!remoteControl.iHaveControl} className="bg-red-500/80 h-14 disabled:opacity-50">⏹️ Stop</Button>
              <Button onClick={() => sendRemoteCommand('restart')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">🔄 Restart</Button>
              <Button onClick={() => sendRemoteCommand('skip')} disabled={!remoteControl.iHaveControl} className="bg-white/10 h-14 disabled:opacity-50">⏭️ Skip</Button>
            </CardContent>
          </Card>

          {/* Volume */}
          <Card className={`bg-white/5 border-white/10 transition-opacity ${!remoteControl.iHaveControl ? 'opacity-50' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Volume</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => sendRemoteCommand('volume', { direction: 'down' })} disabled={!remoteControl.iHaveControl} className="bg-white/10 flex-1 h-12 text-xl disabled:opacity-50">➖</Button>
                <Button onClick={() => sendRemoteCommand('volume', { direction: 'up' })} disabled={!remoteControl.iHaveControl} className="bg-white/10 flex-1 h-12 text-xl disabled:opacity-50">➕</Button>
              </div>
              <Progress value={50} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
