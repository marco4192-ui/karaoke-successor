'use client';

import { useState, useEffect, useRef } from 'react';

export function useSongEnergy(audioElement?: HTMLAudioElement | null) {
  const [energy, setEnergy] = useState(0.5);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioElement) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;

    if (!sourceRef.current) {
      sourceRef.current = audioContext.createMediaElementSource(audioElement);
    }
    const source = sourceRef.current;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateEnergy = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average energy in bass frequencies (first 1/4 of spectrum)
      let bassEnergy = 0;
      const bassRange = Math.floor(dataArray.length / 4);
      for (let i = 0; i < bassRange; i++) {
        bassEnergy += dataArray[i];
      }
      bassEnergy /= bassRange * 255;

      setEnergy((prev) => prev * 0.9 + bassEnergy * 0.1); // Smooth transition
    };

    const interval = setInterval(updateEnergy, 50);

    return () => {
      clearInterval(interval);
    };
  }, [audioElement]);

  return energy;
}
