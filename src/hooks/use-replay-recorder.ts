'use client';

import { useState, useRef, useCallback } from 'react';
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

    // Add webcam video tracks if webcam is active
    const useWebcam = isWebcamActive;
    if (useWebcam) {
      // Request a new camera stream — browsers remember permission so this is instant.
      // We can't reuse the WebcamBackground's stream (it's internal), so we request our own.
      navigator.mediaDevices
        .getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: false,
        })
        .then(webcamStream => {
          webcamStreamRef.current = webcamStream;
          webcamStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

          // Update the recorder's stream (it's the same stream object, tracks are added in-place)
          // No need to recreate the recorder since we already started it
          console.log('[ReplayRecorder] Webcam stream added to recording');
        })
        .catch(err => {
          console.warn('[ReplayRecorder] Could not get webcam for replay:', err);
          // Continue with audio-only recording
        });
    }

    const mimeType = selectMimeType(useWebcam);
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: useWebcam ? 2_500_000 : undefined,
    };

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, recorderOptions);
    } catch (err) {
      // Fallback: try without codec options
      try {
        recorder = new MediaRecorder(combinedStream);
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

    console.log('[ReplayRecorder] Recording started — mimeType:', recorder.mimeType);
  }, [enabled, songId, isWebcamActive, getMicStream]);

  /**
   * Stop recording: collect all chunks, create a Blob, store in IndexedDB.
   */
  const stopRecording = useCallback((gameResult?: GameResult | null) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive' || savedRef.current) return;
    savedRef.current = true;

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
      const id = `replay-${songId}-${Date.now()}`;

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
          console.log('[ReplayRecorder] Replay saved — id:', id, 'size:', blob.size, 'duration:', duration);
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
        console.log('[ReplayRecorder] Recording paused');
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
        console.log('[ReplayRecorder] Recording resumed');
      } catch (err) {
        console.warn('[ReplayRecorder] Failed to resume:', err);
      }
    }
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
