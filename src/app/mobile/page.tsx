'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type MobileMode = 'mic' | 'remote';

export default function MobilePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [mode, setMode] = useState<MobileMode>('mic');
  const [volume, setVolume] = useState(0);
  const [pitch, setPitch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isMicActiveRef = useRef(false);
  const hasConnectedRef = useRef(false);

  // Simple pitch detection using zero-crossing
  const detectPitchFn = (buffer: Float32Array, sampleRate: number): number | null => {
    const threshold = 0.01;
    let crossings = 0;
    let lastSign = buffer[0] >= 0;

    for (let i = 1; i < buffer.length; i++) {
      const currentSign = buffer[i] >= 0;
      if (currentSign !== lastSign && Math.abs(buffer[i]) > threshold) {
        crossings++;
        lastSign = currentSign;
      }
    }

    if (crossings < 2) return null;

    const frequency = (crossings * sampleRate) / (2 * buffer.length);
    
    if (frequency >= 80 && frequency <= 1000) {
      return Math.round(frequency);
    }
    return null;
  };

  // Analyze audio - regular function that calls itself via requestAnimationFrame
  const analyzeAudio = () => {
    if (!analyserRef.current || !audioContextRef.current || !isMicActiveRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);
    const normalizedVolume = Math.min(1, rms * 5);
    setVolume(normalizedVolume);

    const pitchVal = detectPitchFn(dataArray, audioContextRef.current.sampleRate);
    setPitch(pitchVal);

    animationRef.current = requestAnimationFrame(analyzeAudio);
  };

  // Connect to server
  const connect = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=connect');
      const data = await res.json();
      if (data.success) {
        setClientId(data.clientId);
        setIsConnected(true);
        setError(null);
      }
    } catch {
      setError('Failed to connect');
    }
  }, []);

  // Start microphone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      isMicActiveRef.current = true;
      setIsMicActive(true);
      analyzeAudio();
    } catch {
      setError('Microphone access denied');
    }
  }, []);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    isMicActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setVolume(0);
    setPitch(null);
    setIsMicActive(false);
  }, []);

  // Send command
  const sendCommand = useCallback(async (command: string) => {
    if (!clientId) return;
    await fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'command', clientId, payload: { command } }),
    });
  }, [clientId]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (isMicActive) stopMicrophone();
    else startMicrophone();
  }, [isMicActive, startMicrophone, stopMicrophone]);

  // Cleanup and initial connection
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      connect();
    }
    return () => { stopMicrophone(); };
  }, [connect, stopMicrophone]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Karaoke Successor
        </h1>
        <p className="text-sm text-white/60">Mobile Companion</p>
      </div>

      <Card className="bg-white/5 border-white/10 mb-4">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
          {clientId && <Badge variant="outline" className="text-xs border-white/20">{clientId.slice(0, 12)}...</Badge>}
        </CardContent>
      </Card>

      {error && <Card className="bg-red-500/10 border-red-500/30 mb-4"><CardContent className="py-3 text-red-400 text-sm">{error}</CardContent></Card>}

      <div className="flex gap-2 mb-4">
        <Button onClick={() => setMode('mic')} className={`flex-1 ${mode === 'mic' ? 'bg-cyan-500' : 'bg-white/10'}`}>🎤 Mic</Button>
        <Button onClick={() => setMode('remote')} className={`flex-1 ${mode === 'remote' ? 'bg-cyan-500' : 'bg-white/10'}`}>📱 Remote</Button>
      </div>

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

      {mode === 'remote' && (
        <div className="space-y-3">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Playback</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              <Button onClick={() => sendCommand('prev')} className="bg-white/10 h-16 text-2xl">⏮️</Button>
              <Button onClick={() => sendCommand('play')} className="bg-green-500 h-16 text-2xl">▶️</Button>
              <Button onClick={() => sendCommand('next')} className="bg-white/10 h-16 text-2xl">⏭️</Button>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Navigation</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button onClick={() => sendCommand('library')} className="bg-white/10 h-14">📚 Library</Button>
              <Button onClick={() => sendCommand('queue')} className="bg-white/10 h-14">📋 Queue</Button>
              <Button onClick={() => sendCommand('settings')} className="bg-white/10 h-14">⚙️ Settings</Button>
              <Button onClick={() => sendCommand('home')} className="bg-white/10 h-14">🏠 Home</Button>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2"><CardTitle className="text-lg">Volume</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={() => sendCommand('volume-down')} className="bg-white/10 flex-1 h-12 text-xl">➖</Button>
                <Button onClick={() => sendCommand('volume-up')} className="bg-white/10 flex-1 h-12 text-xl">➕</Button>
              </div>
              <Progress value={50} className="h-2" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
