'use client';

/**
 * Hidden audio sources of the editor (R5 module split, extracted 1:1 from
 * karaoke-editor.tsx). Three exclusive variants, exactly like the original
 * inline JSX: a plain `<audio>` element, the MIDI synth bridge (when the
 * song's music file IS a MIDI/KAR file — playback via useEditorPlayback
 * runs through the Web Audio adapter) and the video-file fallback when no
 * separate audio exists.
 */

import { MidiAudioSource } from '@/components/game/midi-audio-source';
import type { EditorAudioSourceBridgeProps } from './types';

export function EditorAudioSourceBridge({
  audioUrl,
  videoBackground,
  songId,
  midiMusicActive,
  audioRef,
  onEnded,
}: EditorAudioSourceBridgeProps) {
  return (
    <>
      {audioUrl && !midiMusicActive && (
        <audio ref={audioRef} src={audioUrl} onEnded={onEnded} />
      )}
      {/* MIDI music: bridge assigns the synth adapter to audioRef (playback
          via useEditorPlayback — play/pause/seek/playbackRate all supported) */}
      {audioUrl && midiMusicActive && (
        <MidiAudioSource
          audioRef={audioRef}
          audioUrl={audioUrl}
          songId={songId}
          onEnded={onEnded}
        />
      )}
      {/* Fallback: play audio from video file when no separate audio exists */}
      {!audioUrl && videoBackground && !videoBackground.startsWith('http') && (
        <audio ref={audioRef} src={videoBackground} onEnded={onEnded} />
      )}
    </>
  );
}
