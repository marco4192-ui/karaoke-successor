'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameResult } from '@/types/game';
import { storeReplay, type ReplayRecord } from '@/lib/db/replay-db';

export interface ReplayData {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  recordedAt: number;     // timestamp
  duration: number;        // ms
  blob: Blob;             // audio/webm or video/webm
  hasWebcam: boolean;
  gameResult: GameResult | null;
  playerName: string;
}

export interface UseReplayRecorderOptions {
  enabled: boolean;                         // user has enabled replay recording in settings
  songId: string | null;
  songTitle: string;
  songArtist: string;
  playerName: string;
  isWebcamActive: boolean;                  // whether webcam is currently active
  getMicStream: () => MediaStream | null;   // callback to get mic stream from PitchDetector
  onReplaySaved: (replay: ReplayData) => void;
}

export interface UseReplayRecorderResult {
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: (gameResult?: GameResult | null) => void;
  /** Pause the MediaRecorder when the game is paused */
  pauseRecording: () => void;
  /** Resume the MediaRecorder when the game is resumed */
  resumeRecording: () => void;
  hasReplay: boolean;
  lastReplay: ReplayData | null;
}

/**
 * Select the best supported mimeType for MediaRecorder.
 * Priority: video/webm with vp9 > vp8 > generic, audio/webm with opus > generic.
 */
function selectMimeType(hasWebcam: boolean): string {
  if (hasWebcam) {
    const videoCodecs = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    for (const mime of videoCodecs) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
  }
  // Audio-only or fallback
  const audioCodecs = [
    'audio/webm;codecs=opus',
    'audio/webm',
  ];
  for (const mime of audioCodecs) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  // Last resort
  return 'video/webm';
}

/**
 * Hook that manages the replay recording lifecycle during gameplay.
 *
 * - Records ONLY the user's microphone audio and optional webcam video.
 * - Never records background videos or original song audio.
 * - Stores replays in IndexedDB via replay-db.
 */
export function useReplayRecorder(options: UseReplayRecorderOptions): UseReplayRecorderResult {
  const {
    enabled,
    songId,
    songTitle,
    songArtist,
    playerName,
    isWebcamActive,
    getMicStream,
    onReplaySaved,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [hasReplay, setHasReplay] = useState(false);
  const [lastReplay, setLastReplay] = useState<ReplayData | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const savedRef = useRef(false);

  /**
   * Start recording: combine mic audio tracks + webcam video tracks into one stream.
   */
  const startRecording = useCallback(() => {
    if (!enabled || !songId || mediaRecorderRef.current) return;

    const micStream = getMicStream();
    if (!micStream || micStream.getAudioTracks().length === 0) {
      console.warn('[ReplayRecorder] No mic stream available — skipping replay');
      return;
    }

    const combinedStream = new MediaStream();

    // Add mic audio tracks
    micStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));

    // Add webcam video tracks if webcam is active (must complete before starting recorder)
    const useWebcam = isWebcamActive;
    const startRecorderWithStream = async (stream: MediaStream, hasWebcam: boolean) => {
      if (hasWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false,
          });
          webcamStreamRef.current = webcamStream;
          webcamStream.getVideoTracks().forEach(track => stream.addTrack(track));
        } catch (err) {
          console.warn('[ReplayRecorder] Could not get webcam for replay:', err);
        }
      }

      const mimeType = selectMimeType(hasWebcam && webcamStreamRef.current !== null);
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: hasWebcam ? 2_500_000 : undefined,
      };

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, recorderOptions);
      } catch (err) {
        try {
          recorder = new MediaRecorder(stream);
        } catch (fallbackErr) {
          console.error('[ReplayRecorder] Failed to create MediaRecorder:', fallbackErr);
          return;
        }
      }

      chunksRef.current = [];
      savedRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(1000); // Collect chunks every second
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setHasReplay(false);
      setLastReplay(null);

    };

    startRecorderWithStream(combinedStream, useWebcam);
  }, [enabled, songId, isWebcamActive, getMicStream]);

  /**
   * Stop recording: collect all chunks, create a Blob, store in IndexedDB.
   */
  const stopRecording = useCallback((gameResult?: GameResult | null) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive' || savedRef.current) return;
    savedRef.current = true;

    // Generate ID immediately so the Results Screen can find the replay
    // even before the async IndexedDB save completes.
    const replayId = `replay-${songId}-${Date.now()}`;

    const stopAndSave = () => {
      const duration = Date.now() - startTimeRef.current;
      const chunks = chunksRef.current;

      // Clean up webcam stream (we own this one)
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
        webcamStreamRef.current = null;
      }

      setIsRecording(false);
      mediaRecorderRef.current = null;

      if (chunks.length === 0) {
        console.warn('[ReplayRecorder] No recorded data — skipping save');
        return;
      }

      const mimeType = recorder.mimeType || (isWebcamActive ? 'video/webm' : 'audio/webm');
      const blob = new Blob(chunks, { type: mimeType });
      const id = replayId;

      const playerResult = gameResult?.players?.[0] ?? null;

      const record: ReplayRecord = {
        id,
        songId: songId!,
        songTitle,
        songArtist,
        recordedAt: Date.now(),
        duration,
        hasWebcam: isWebcamActive && blob.type.startsWith('video/'),
        playerName,
        data: blob,
        score: playerResult?.score ?? 0,
        accuracy: playerResult?.accuracy ?? 0,
        rating: playerResult?.rating ?? '—',
      };

      storeReplay(record)
        .then(() => {
          const replayData: ReplayData = {
            id,
            songId: songId!,
            songTitle,
            songArtist,
            recordedAt: record.recordedAt,
            duration,
            blob,
            hasWebcam: record.hasWebcam,
            gameResult: gameResult ?? null,
            playerName,
          };
          setHasReplay(true);
          setLastReplay(replayData);
          onReplaySaved(replayData);
        })
        .catch(err => {
          console.error('[ReplayRecorder] Failed to save replay:', err);
        });
    };

    // If the recorder is still recording, wait for it to finish
    if (recorder.state === 'recording') {
      recorder.onstop = stopAndSave;
      recorder.stop();
    } else {
      stopAndSave();
    }
  }, [songId, songTitle, songArtist, isWebcamActive, playerName, onReplaySaved]);

  /** Pause recording when the game is paused. */
  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.pause();
      } catch (err) {
        console.warn('[ReplayRecorder] Failed to pause:', err);
      }
    }
  }, []);

  /** Resume recording when the game is resumed. */
  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === 'paused') {
      try {
        recorder.resume();
      } catch (err) {
        console.warn('[ReplayRecorder] Failed to resume:', err);
      }
    }
  }, []);

  // H8: Cleanup on unmount — stop recorder and release webcam+mic streams
  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try { recorder.stop(); } catch { /* already stopped */ }
      }
      mediaRecorderRef.current = null;
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(t => t.stop());
        webcamStreamRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    hasReplay,
    lastReplay,
  };
}
