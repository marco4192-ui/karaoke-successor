'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PitchData } from '@/components/screens/mobile/mobile-types';
import { yinPitchDetection } from '@/lib/audio/pitch-algorithm';

interface UseMobilePitchDetectionOptions {
  clientId: string | null;
  isPlaying: boolean;
  songEnded: boolean;
  onError?: (_message: string) => void;
  /** Optional Socket.IO push path (from useMobileConnection.sendPitch).
   *  Preferred over the HTTP batch: frames arrive at the desktop instantly
   *  instead of via the 200ms batch flush + host polling chain. Returns true
   *  when the frame was emitted; false → fall back to HTTP. */
  sendSocketPitch?: (_frame: {
    frequency: number | null;
    note: number | null;
    clarity: number;
    volume: number;
    timestamp?: number;
  }) => boolean;
}

export function useMobilePitchDetection({
  clientId,
  isPlaying,
  songEnded,
  onError,
  sendSocketPitch,
}: UseMobilePitchDetectionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData>({ frequency: null, note: null, volume: 0 });
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  // R52 — iOS/WebView-Autoplay: Wird das Mikro OUTHALB einer Nutzer-Geste
  // gestartet (Auto-Sing nach Gamestate-Push), bleibt der AudioContext auf
  // iOS Safari im 'suspended'-Zustand — getUserMedia läuft, aber
  // getFloatTimeDomainData liefert nur Nullen → es wird NIEMALS ein Frame
  // gesendet. Die Companion-UI zeigt daraufhin den „Tippen zum Aktivieren"-
  // Hinweis; der Tap läuft DANN in einer echten Geste und resume() klappt.
  const [audioSuspended, setAudioSuspended] = useState(false);
  // R52 — „lebt das Mikro überhaupt?": true, sobald EINMAL ein Nicht-Null-
  // Sample ankam (Analyser liefert echte Daten). Bleibt es false, obwohl
  // isListening true ist, liefert das Mikro keinen Ton (suspended Context
  // oder stummes/defektes Gerät) — ebenfalls ein Fall für den Tap-Hinweis.
  const [hasSignal, setHasSignal] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // R52 — Ref-Mirror von hasSignal (rAF-Loop liest/setzt ohne Re-Render-Loop)
  const hasSignalRef = useRef(false);
  // R52 — Ref-Zugriff auf startMicrophone für resumeAudioContext (definiert
  // unten; Ref wird per Effect nach jedem Render synchronisiert).
  const startMicrophoneRef = useRef<(() => Promise<void>) | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders
  const lastPitchUpdateRef = useRef<number>(0);

  // === Batch pitch upload (5 requests/sec instead of 20) ===
  const pitchBatchRef = useRef<Array<{
    frequency: number | null;
    note: number | null;
    clarity: number;
    volume: number;
    timestamp: number;
  }>>([]);
  const MAX_BATCH_SIZE = 10;
  const BATCH_FLUSH_INTERVAL = 200; // ms — 5 flushes/sec
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const useFallbackRef = useRef(false); // fall back to single pitch if batch fails
  const lastPitchSendRef = useRef<number>(0); // used only in fallback mode
  const PITCH_SEND_INTERVAL = 50;

  // === Socket.IO push path (preferred) ===
  // Throttled to ~30 Hz — the YIN analysis window is ~93 ms, so higher rates
  // carry no additional information. Kept in a ref so the rAF loop always
  // uses the latest callback without re-starting the microphone.
  const sendSocketPitchRef = useRef(sendSocketPitch);
  useEffect(() => {
    sendSocketPitchRef.current = sendSocketPitch;
  }, [sendSocketPitch]);
  const lastSocketPitchSendRef = useRef<number>(0);
  const SOCKET_PITCH_SEND_INTERVAL = 33; // ~30 Hz

  // Refs for values consumed inside the requestAnimationFrame loop.
  // Without these, detectPitch would capture stale snapshots of
  // isPlaying / songEnded / clientId at the time startMicrophone was called.
  const isPlayingRef = useRef(isPlaying);
  const songEndedRef = useRef(songEnded);
  const clientIdRef = useRef(clientId);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    songEndedRef.current = songEnded;
    clientIdRef.current = clientId;
  }, [isPlaying, songEnded, clientId]);

  // Flush the accumulated pitch batch to the server
  const flushPitchBatch = useCallback(async (activeClientId: string) => {
    const batch = pitchBatchRef.current;
    if (batch.length === 0) return;
    pitchBatchRef.current = []; // clear immediately to avoid re-sending
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          type: 'batch_pitch',
          clientId: activeClientId,
          payload: { frames: batch },
        }),
      });
      if (!res.ok) {
        useFallbackRef.current = true;
      }
    } catch {
      // Network error or abort — switch to fallback
      useFallbackRef.current = true;
    }
  }, []);

  // Send a single pitch frame (fallback when batch approach fails)
  const sendSinglePitch = useCallback((
    activeClientId: string,
    frame: { frequency: number | null; note: number | null; clarity: number; volume: number; timestamp: number },
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        type: 'pitch',
        clientId: activeClientId,
        payload: frame,
      }),
    }).catch(() => {});
  }, []);

  const stopMicrophone = useCallback(() => {
    // Flush any remaining batch before stopping
    const cid = clientIdRef.current;
    if (cid && pitchBatchRef.current.length > 0) {
      flushPitchBatch(cid);
    }
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setCurrentPitch({ frequency: null, note: null, volume: 0 });
    pitchBatchRef.current = [];
    useFallbackRef.current = false;
    setAudioSuspended(false);
    setHasSignal(false);
  }, [flushPitchBatch]);

  // R52 — Geste-sicherer (Re-)Start: Aus einem Tap-Handler gerufen, kann
  // resume() auf iOS nicht abgewiesen werden. Deckt alle drei Problemfälle
  // ab: (a) Context suspended → resume; (b) Mikro nie gestartet (Auto-Sing
  // fehlgeschlagen, z. B. insecure context oder Race) → voller Start;
  // (c) alles läuft → no-op. Idempotent, nie werfend.
  const resumeAudioContext = useCallback(async () => {
    const ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      // Nichts (mehr) da → kompletter Neustart über den normalen Pfad
      try { await startMicrophoneRef.current?.(); } catch { /* Fehler geht an onError */ }
      return;
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[MobilePitch] Manual resume failed — retrying once');
        await new Promise<void>(resolve => setTimeout(resolve, 100));
        try { await ctx.resume(); } catch { /* UI zeigt weiterhin den Hinweis */ }
      }
    }
  }, []);

  const startMicrophone = useCallback(async () => {
    if (!clientIdRef.current) return;

    // Guard: if already running, stop first
    if (audioContextRef.current && mediaStreamRef.current) {
      stopMicrophone();
    }
    
    // Reset permission denied state on retry so the user gets another chance
    setMicPermissionDenied(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext({ latencyHint: 'interactive' });

      // CRITICAL: On iOS Safari and some Android browsers, the AudioContext
      // starts in a "suspended" state and the AnalyserNode returns all-zeros.
      // Must resume within the same user-gesture callback (tap on mic button).
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (resumeErr) {
          // eslint-disable-next-line no-console
          console.warn('[MobilePitch] AudioContext.resume() failed, retrying…', resumeErr);
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await audioContextRef.current.resume();
        }
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      // R44: humming/singing classifier (VocalDetector) removed — pitch
      // presence (YIN) is the single activity signal.

      setIsListening(true);
      
      // Reset batch state for this session
      pitchBatchRef.current = [];
      useFallbackRef.current = false;
      // R52 — Signal-Lebenszeichen für die neue Session zurücksetzen
      hasSignalRef.current = false;
      setHasSignal(false);

      // Start batch flush timer: every 200ms, send accumulated pitch frames
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      const startBatchTimer = () => {
        batchTimerRef.current = setInterval(() => {
          const cid = clientIdRef.current;
          if (cid && !useFallbackRef.current) {
            flushPitchBatch(cid);
          }
        }, BATCH_FLUSH_INTERVAL);
      };
      startBatchTimer();

      const buffer = new Float32Array(analyserRef.current.fftSize);
      // Pre-allocate YIN scratch buffer outside the RAF loop to avoid GC pressure
      const yinBuffer = new Float32Array(Math.floor(buffer.length / 2));
      
      const detectPitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        // Guard: if AudioContext was suspended (e.g. phone locked/unlocked),
        // try to resume — otherwise getFloatTimeDomainData returns all zeros.
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        
        // STOP loop if song ended or not playing (read from ref to avoid stale closure)
        // Prevents wasting CPU/battery analysing silence after song finishes.
        const currentlyPlaying = isPlayingRef.current;
        const currentlyEnded = songEndedRef.current;
        if (currentlyEnded || !currentlyPlaying) {
          // Stop the animation frame loop — the effect will handle full cleanup
          // when the component unmounts or a new song starts.
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }
        
        // R52 — Suspended-State für die UI tracken (iOS: Context ohne Geste
        // bleibt suspended → Analyser liefert Nullen). Der rAF-Loop läuft
        // weiter, damit der Tap-Resume sofort wirkt.
        const ctxState = audioContextRef.current.state;
        setAudioSuspended(prev => (prev !== (ctxState === 'suspended')) ? ctxState === 'suspended' : prev);

        analyserRef.current.getFloatTimeDomainData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(1, rms * 5);

        // R52 — Signal-Lebenszeichen: irgendein Nicht-Null-Sample reicht als
        // Beweis, dass der Analyser echte Daten liefert (setzt hasSignal
        // genau einmal, kein permanenter State-Tick bei jedem Frame).
        if (!hasSignalRef.current && sum > 0) {
          hasSignalRef.current = true;
          setHasSignal(true);
        }
        
        const frequency = yinPitchDetection(buffer, yinBuffer, audioContextRef.current.sampleRate);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }

        // R44: vocal detection removed — a detected tone is activity.

        // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders from 60fps RAF loop
        const pitchNow = performance.now();
        if (pitchNow - lastPitchUpdateRef.current >= 50) {
          setCurrentPitch({ frequency, note, volume });
          lastPitchUpdateRef.current = pitchNow;
        }
        
        // Only send pitch if song is playing and not ended (via refs)
        const now = performance.now();
        const activeClientId = clientIdRef.current;
        if (activeClientId && currentlyPlaying && !currentlyEnded && (volume > 0.01 || frequency !== null)) {
          const frame = {
            frequency,
            note,
            clarity: 0,
            volume,
            timestamp: Date.now(),
          };

          // Preferred path: Socket.IO push (~30 Hz). The server writes the
          // frame into the SAME latestPitchData store the HTTP batch uses,
          // so every HTTP-polling consumer keeps working unchanged. When the
          // socket is down, sendPitch returns false → HTTP fallback below.
          if (
            sendSocketPitchRef.current &&
            now - lastSocketPitchSendRef.current >= SOCKET_PITCH_SEND_INTERVAL
          ) {
            const sent = sendSocketPitchRef.current(frame);
            if (sent) {
              lastSocketPitchSendRef.current = now;
              animationFrameRef.current = requestAnimationFrame(detectPitch);
              return;
            }
          }

          if (useFallbackRef.current) {
            // Fallback: individual POST per frame (throttled to ~20 req/sec)
            if (now - lastPitchSendRef.current >= PITCH_SEND_INTERVAL) {
              lastPitchSendRef.current = now;
              sendSinglePitch(activeClientId, frame);
            }
          } else {
            // Batch mode: accumulate frames, flush every 200ms or when batch is full
            pitchBatchRef.current.push(frame);
            if (pitchBatchRef.current.length >= MAX_BATCH_SIZE) {
              flushPitchBatch(activeClientId);
            }
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(detectPitch);
      };
      
      detectPitch();
    } catch (err) {
      const isPermissionDenied = err instanceof DOMException && (
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
      );
      if (isPermissionDenied) {
        setMicPermissionDenied(true);
        // Provide platform-specific instructions
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) {
          onError?.('Microphone access denied. On iOS: Settings > Safari > Microphone > allow access, then reload the page.');
        } else if (/Android/.test(ua)) {
          onError?.('Microphone access denied. On Android: tap the lock/permissions icon in the address bar > Microphone > Allow, then reload.');
        } else {
          onError?.('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
        }
      } else {
        const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
        onError?.(
          `Could not access microphone (${isSecureContext ? 'permission or hardware issue' : 'insecure HTTP context'}). ` +
          `Make sure a microphone is connected and this page is served over HTTPS.`
        );
      }
    }
  }, [onError, stopMicrophone]);

  // R52 — startMicrophone-Ref nach jedem Render synchronisieren (Deklaration
  // oben bei den anderen Refs, damit resumeAudioContext sie lesen kann).
  useEffect(() => {
    startMicrophoneRef.current = startMicrophone;
  }, [startMicrophone]);

  // Clean up microphone resources on unmount to prevent leaking
  // the media stream, audio context, animation frame loop, and batch timer.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      // Flush remaining pitch batch
      const cid = clientIdRef.current;
      if (cid && pitchBatchRef.current.length > 0) {
        // Synchronous flush via sendBeacon — best-effort, no await
        try {
          navigator.sendBeacon('/api/mobile', JSON.stringify({
            type: 'batch_pitch',
            clientId: cid,
            payload: { frames: pitchBatchRef.current },
          }));
        } catch { /* ignore — page is unloading */ }
        pitchBatchRef.current = [];
      }
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    currentPitch,
    micPermissionDenied,
    audioSuspended,
    hasSignal,
    startMicrophone,
    stopMicrophone,
    resumeAudioContext,
  };
}
