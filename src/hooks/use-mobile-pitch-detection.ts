'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PitchData } from '@/components/screens/mobile/mobile-types';
import { yinPitchDetection } from '@/lib/audio/pitch-algorithm';
import { DIFFICULTY_PITCH_CONFIGS } from '@/lib/audio/pitch-config';

interface UseMobilePitchDetectionOptions {
  clientId: string | null;
  isPlaying: boolean;
  songEnded: boolean;
  onError?: (_message: string) => void;
  /** R94-5: the desktop's current difficulty (2s gamestate push). The YIN
   *  threshold now follows DIFFICULTY_PITCH_CONFIGS exactly like the
   *  desktop detector — before, the phone always used the fixed 0.15
   *  (= desktop "hard"), a permanently more lenient detection than the
   *  desktop mic on easy/medium. */
  difficulty?: 'easy' | 'medium' | 'hard';
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
  difficulty,
  sendSocketPitch,
}: UseMobilePitchDetectionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData>({ frequency: null, note: null, volume: 0 });
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  // R94-5: current difficulty in a ref — the detection loop reads it without
  // restarting (same pattern as the desktop detector's setDifficulty).
  const difficultyRef = useRef<'easy' | 'medium' | 'hard'>(difficulty ?? 'medium');
  useEffect(() => {
    if (difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard') {
      difficultyRef.current = difficulty;
    }
  }, [difficulty]);
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

  // ═══ R65 — Close-Range-Gate (Original-Gesangs-Filter, Nutzer-Feedback 1) ═══
  // Das Handy als Mikro (CPTM/Companion-Singen) hört neben der eigenen Stimme
  // auch den ORIGINAL-GESANG aus den Desktop-Lautsprechern (Fernfeld, 2–4 m).
  // YIN detektiert den dominierenden Ton bei JEDEM Pegel — in Gesangspausen
  // ist das der Original-Sänger, und dessen Punkte landen auf dem Companion-
  // Konto: ein Vorteil, den es am Desktop so nicht gibt (Nutzer-Feedback).
  // Physik: Nahfeld-Gesang (10–30 cm Handyabstand) erreicht das Mikro mit
  // 15–30 dB mehr Pegel als das Lautsprecher-Fernfeld; AGC staucht das auf
  // ~8–15 dB — bleibt klar trennbar. Lösung: ein Frame zählt nur als
  // GESANG, wenn sein Pegel deutlich über dem Ambien-Teppich liegt —
  // ADAPTIV, damit AGC-Anhebung stummer Fernfeld-Phasen (Original-Gesang
  // zwischen den eigenen Phrasen) das Gate nicht unterlaufen kann:
  //   gate = max(MIN_GATE, ambientFloor · GAIN_FACTOR)
  //   ambientFloor = EMA der Unter-Gate-Pegel + Konstanz-Tracking (R95/3)
  // Hysterese (release bei 0.6·gate) verhindert Flackern an der Grenze; auf
  // gegatete Frames wird note=null gesendet/gemappt — das Desktop-Scoring
  // sieht „singt nicht“, der Original-Gesang wird nicht mehr gewertet.
  //
  // ═══ R95/3 — Empfindlichkeits-Kalibrierung („Companion zu empfindlich“) ═══
  // Nutzer-Messung: Musik aus den Lautsprechern wurde (auch laut) als
  // Gesang gewertet; selbst leises Singen mit 2 m Handyabstand wurde
  // zuverlässig erkannt. Zwei Ursachen:
  //  1. autoGainControl:true hob das Fernfeld um 20–30 dB an und einebnet
  //     genau die Nah/Fern-Physik, auf der das Gate gebaut ist → AGC JETZT
  //     OFF (wie der Desktop-Recording-Pfad, microphone-manager). Leises
  //     2-m-Singen landet damit physikalisch UNTER jedem sinnvollen Gate.
  //  2. CLOSE_RANGE_MIN_GATE 0.07 war zu niedrig — Lautsprecher-Musik ohne
  //     AGC erreicht typischerweise volume 0.03–0.2 → angehoben auf 0.12
  //     (leises Singen in der Hand: 0.15–0.3, bleibt sicher darüber).
  //  3. Floor-Deadlock: Das EMA lernte NUR auf Unter-Gate-Frames — laute
  //     Musik (dauerhaft ÜBER dem Gate) frierte den Boden bei 0.02 ein und
  //     ging für immer durch. NEU: Konstanz-Tracking — Musik hat einen
  //     konstanten Pegel (Variationskoeffizient CV < 0.22 über 4 s), Gesang
  //     schwankt dynamisch (Silben-Onsets, Atem, Vibrato → CV hoch). Erst
  //     nach ≥3 s konstantem Pegel wandert der Boden langsam Richtung
  //     Musikpegel (Deckel 0.30), das Gate folgt → laute Musik wird
  //     gegatet, Gesang in der Hand (CV hoch) wird nie verfolgt.
  const CLOSE_RANGE_MIN_GATE = 0.16;    // min(1, rms·5)-Skala: absolutes Minimum
                                        // R110 (user point 6): 0.12 → 0.16 —
                                        // Feedback „Empfindlichkeit immer noch zu
                                        // hoch“: leises 2-m-Singen / Lautsprecher-
                                        // Musik (0,03–0,2) fällt jetzt unters
                                        // absolute Minimum; Singen in der Hand
                                        // (0,15–0,3 ohne AGC, laut 0,3–1,0)
                                        // bleibt darüber.
  const CLOSE_RANGE_GAIN_FACTOR = 2.0;  // Faktor über dem adaptiven Boden (1,8 → 2,0)
  const ambientFloorRef = useRef(0.02);
  const wasLocalRef = useRef(false);
  // R95/3 — Konstanz-Tracking (Musikerkennung für den adaptiven Boden)
  const volumeWindowRef = useRef<Array<{ v: number; t: number }>>([]);
  const lastVariableRef = useRef(0);        // letzter Zeitpunkt mit Gesangs-Dynamik
  const lastFloorRiseRef = useRef(0);       // Drossel des Boden-Anstiegs
  const CV_WINDOW_MS = 4000;                // Beobachtungsfenster für CV
  const CV_WINDOW_MIN_SAMPLES = 30;         // ~1 s Daten, bevor CV aussagekräftig
  const CV_THRESHOLD = 0.22;                // Musik ≈ CV<0.22; Gesang deutlich darüber
  const CONSTANCY_MIN_MS = 2000;            // R110: 3 s → 2 s — konstante Musik
                                            // lernt den Boden schneller hoch
  const FLOOR_RISE_INTERVAL_MS = 400;       // R110: 500 → 400 ms — zügigerer Anstieg
  const FLOOR_RISE_RATE = 0.08;             // R110: 0.05 → 0.08 (~5 s statt ~10 s
                                            // bis zur Annäherung an Musikpegel)
  const FLOOR_CEILING = 0.35;               // R110: 0.30 → 0.35 — Gate max 2.0·0.35=0.7,
                                            // Handgesang (typ. 0,3–1,0) bleibt drüber
  // R65 — YIN-Confidence-Receiver (vorab allokiert, rAF-Loop ohne GC-Druck):
  // gegatete Frames erhalten clarity 0, echte Frames die ehrliche YIN-
  // Periodizität — vormals wurde immer clarity: 0 gesendet.
  const yinConfidenceRef = useRef({ value: 0 });
  // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders
  const lastPitchUpdateRef = useRef<number>(0);
  // R54 — Standby-Watchdog: requestAnimationFrame läuft NUR bei sichtbarem
  // Dokument. Geht das Display aus (bzw. Tab in den Hintergrund), friert der
  // rAF-Loop ein — die Pitch-Erkennung stand still (Nutzer-Feedback: gesungene
  // Höhen/Tiefen kamen nicht mehr an, die Linie blieb „flach"). Der Watchdog
  // prüft zyklisch, ob der letzte Tick zu alt ist, und treibt detectPitch
  // dann selbst an. Primäre Lösung ist der Screen Wake Lock (use-screen-wake-
  // lock.ts) — der Watchdog ist die Best-Effort-Rückfallebene, falls der Lock
  // nicht verfügbar ist (alter Browser) oder der Nutzer das Display trotzdem
  // ausschaltet.
  const lastTickRef = useRef<number>(0);
  const watchdogTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (watchdogTimerRef.current) {
      clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
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
          // R110 (user point 7): noiseSuppression OFF — Chromes stationäre
          // Rauschunterdrückung adaptiert innerhalb ~0,5–1,5 s und senkt dann
          // den Pegel LANG gehaltener, gleichbleibender Töne (Balladen!) ab:
          // das Close-Range-Gate schließt, die Wertung reißt mitten im Ton ab
          // („Tonwertung nach ca. 1,5 Sekunden abgebrochen“, Aufeinanderfolge
          // gleichbleibender Töne → Wertungsaussetzer). Musik-Ablehnung
          // übernimmt das Close-Range-Gate (R95/3), nicht die NS.
          noiseSuppression: false,
          // R95/3: AGC OFF — das Handy ist ein NAHFELD-Mikro (in der Hand).
          // AGC hob das Fernfeld (Lautsprecher-Musik, 2-m-Stimmen) um
          // 20–30 dB an und hob leises Fern-Singen ÜBER das Close-Range-Gate
          // („jeder Ton wurde einwandfrei erkannt“). Ohne AGC beträgt der
          // Nah/Fern-Abstand wieder 15–30 dB — die physikalische Basis des
          // Gates. Der Desktop-Spiel-Pfad nutzt AGC bewusst weiter (dort
          // gleicht AGC distanz-leises Singen an, es gibt kein Nahfeld-Gate).
          autoGainControl: false,
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
      
      // R65 — Gate-Zustand pro Session zurücksetzen (neuer Song/neues Mikro):
      // der Ambient-Boden startet konservativ tief und kalibriert sich in
      // den ersten Sekunden auf das Raum-Ambiente ein.
      ambientFloorRef.current = 0.02;
      wasLocalRef.current = false;
      // R95/3 — Konstanz-Tracker ebenfalls pro Session zurücksetzen
      volumeWindowRef.current = [];
      lastVariableRef.current = performance.now();
      lastFloorRiseRef.current = 0;

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
        // R54 — Herzschlag für den Standby-Watchdog (siehe unten).
        lastTickRef.current = performance.now();

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

        // ═══ R95/3 — Konstanz-Tracking: laute Musik vom Boden lernen ═══
        // Das R65-EMA lernte den Ambient-Boden nur auf UNTER-Gate-Frames —
        // dauerhaft laute Musik (immer über dem Gate) frierte den Boden bei
        // 0.02 ein und wurde nie gegatet. Musik ist pegel-konstant, Gesang
        // dynamisch: Variationskoeffizient (CV=σ/µ) über ein 4-s-Fenster
        // trennt zuverlässig. Erst nach ≥3 s Konstanz wandert der Boden
        // langsam (alle 500 ms, 5 %) Richtung konstanten Pegel — Gesang
        // (Silben/Atem ⇒ CV hoch) setzt lastVariableRef laufend zurück und
        // wird NIE verfolgt. Deckel 0.30 → Gate maximal 0.54; Handgesang
        // (typ. 0.3–1.0 ohne AGC) bleibt über dem Gate.
        const cvNow = performance.now();
        const cvWin = volumeWindowRef.current;
        cvWin.push({ v: volume, t: cvNow });
        while (cvWin.length > 2 && cvNow - cvWin[0].t > CV_WINDOW_MS) cvWin.shift();
        if (cvWin.length >= CV_WINDOW_MIN_SAMPLES) {
          let cvMean = 0;
          for (let i = 0; i < cvWin.length; i++) cvMean += cvWin[i].v;
          cvMean /= cvWin.length;
          let cvVar = 0;
          for (let i = 0; i < cvWin.length; i++) {
            const d = cvWin[i].v - cvMean;
            cvVar += d * d;
          }
          const cv = Math.sqrt(cvVar / cvWin.length) / Math.max(cvMean, 1e-6);
          if (cv > CV_THRESHOLD) {
            lastVariableRef.current = cvNow;
          } else if (
            cvNow - lastVariableRef.current >= CONSTANCY_MIN_MS &&
            cvMean > ambientFloorRef.current &&
            cvNow - lastFloorRiseRef.current >= FLOOR_RISE_INTERVAL_MS
          ) {
            lastFloorRiseRef.current = cvNow;
            const target = Math.min(cvMean, FLOOR_CEILING);
            ambientFloorRef.current = Math.min(
              FLOOR_CEILING,
              ambientFloorRef.current + (target - ambientFloorRef.current) * FLOOR_RISE_RATE
            );
          }
        }
        
        const frequency = yinPitchDetection(buffer, yinBuffer, audioContextRef.current.sampleRate, DIFFICULTY_PITCH_CONFIGS[difficultyRef.current].yinThreshold, yinConfidenceRef.current);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }

        // ═══ R65 — Close-Range-Gate anwenden ═══
        const gate = Math.max(CLOSE_RANGE_MIN_GATE, ambientFloorRef.current * CLOSE_RANGE_GAIN_FACTOR);
        // Hysterese: einmal als Nahfeld erkannt, bleibt ein Frame bis
        // 0.7·gate gültig (R110: 0.6 → 0.7 — der Rückhalte-Puffer nach
        // einem lauten Silben-Onset war so groß, dass leises Fern-Singen
        // danach Sekunden weitergewertet wurde; Phrasen-Enden/Atem bleiben
        // trotzdem überbrückt).
        const isLocal = volume >= gate || (wasLocalRef.current && volume >= gate * 0.7);
        if (isLocal) {
          wasLocalRef.current = true;
        } else {
          // Ambient-Frame (Fernfeld: Original-Gesang/Instrumental): Boden
          // nachziehen — langsames EMA, ~10 Frames Konvergenz; der Boden
          // sinkt bei wahrer Stille von selbst (konvergiert gegen ~0).
          ambientFloorRef.current = Math.max(0.015, ambientFloorRef.current * 0.9 + volume * 0.1);
          wasLocalRef.current = false;
        }
        // Gegatete Frames: kein Ton (note/frequency/clarity = null/0) —
        // Anzeige UND gesendete Frames sehen „singt nicht“; volume bleibt
        // ehrlich (Mikro-Status-UI zeigt weiterhin Ambien-Pegel an).
        const outFrequency = isLocal ? frequency : null;
        const outNote = isLocal ? note : null;
        const outClarity = isLocal ? yinConfidenceRef.current.value : 0;

        // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders from 60fps RAF loop
        // R65: gegatete Frames zeigen KEINEN Ton (note null) — die Pitch-Linie
        // auf dem Handy bleibt in Gesangspausen flach, statt die Melodie des
        // Original-Sängers aus den Desktop-Lautsprechern nachzuzeichnen.
        const pitchNow = performance.now();
        if (pitchNow - lastPitchUpdateRef.current >= 50) {
          setCurrentPitch({ frequency: outFrequency, note: outNote, volume });
          lastPitchUpdateRef.current = pitchNow;
        }
        
        // Only send pitch if song is playing and not ended (via refs).
        // R65: gegatete Frames werden ALS NULL-FRAME gesendet (note null,
        // volume ehrlich) — überschreibt am Desktop das zuletzt gespeicherte
        // (möglicherweise vom Original-Gesang stammende) Pitch und stoppt so
        // die Wertung, statt auf Stille einfach nichts zu senden (der Server
        // würde den STALEN Frame weiterverwenden).
        const now = performance.now();
        const activeClientId = clientIdRef.current;
        if (activeClientId && currentlyPlaying && !currentlyEnded && (volume > 0.01 || outFrequency !== null)) {
          const frame = {
            frequency: outFrequency,
            note: outNote,
            clarity: outClarity,
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

      // R54 — Standby-Watchdog: Läuft rAF nicht (Display aus / Tab hidden),
      // übernimmt dieses Intervall die Detektion. Achtung: Browser throttlen
      // Intervalle in versteckten Tabs teils auf 1×/Minute — das ist
      // Best-Effort (Wake Lock ist die primäre Lösung), aber deutlich besser
      // als der komplette Stillstand von vorher.
      if (watchdogTimerRef.current) clearInterval(watchdogTimerRef.current);
      watchdogTimerRef.current = setInterval(() => {
        if (document.hidden && performance.now() - lastTickRef.current > 150) {
          detectPitch();
        }
      }, 120);

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
      if (watchdogTimerRef.current) {
        clearInterval(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
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
