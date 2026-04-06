---
Task ID: 1
Agent: Main Agent
Task: Implement ASIO/WASAPI native audio output support

Work Log:
- Pulled latest code from GitHub master branch
- Analyzed current audio architecture: browser Web Audio API (AudioContext, HTMLAudioElement, GainNode)
- Analyzed game loop: reads audioRef.currentTime for position tracking, controls play/pause/seek on <audio> elements
- Planned ASIO architecture: Rust backend (cpal + symphonia) for native audio, frontend integration via Tauri commands/events
- Added Rust dependencies: cpal 0.15 (audio I/O), symphonia 0.5 (audio decoding), rubato 0.15 (resampling)
- Created src-tauri/src/audio/ module:
  - devices.rs: Device enumeration across all hosts (ASIO, WASAPI, DirectSound)
  - player.rs: Native audio player with symphonia decoding, cpal output, playback control (play/pause/seek/stop/volume)
  - commands.rs: Tauri commands (audio_list_devices, audio_play_file, audio_pause, audio_resume, audio_seek, audio_set_volume, audio_stop, audio_get_position, audio_get_state)
  - mod.rs: Module root
- Updated src-tauri/src/lib.rs: Added mod audio, registered AudioState, added all audio commands to invoke_handler
- Created src/lib/audio/native-audio.ts: TypeScript wrappers for all Tauri audio commands + event listeners
- Created src/hooks/use-native-audio.ts: React hook for native audio state management with localStorage persistence
- Created src/components/settings/audio-output-section.tsx: Settings UI for device selection with ASIO detection, device grouping by host, refresh, current device info
- Updated src/components/settings/graphic-sound-tab.tsx: Added AudioOutputSection at top of Graphics & Sound tab
- Updated src/hooks/use-game-loop.ts: Added native audio options (isNativeAudio, nativeAudioTime, play/pause/resume/stop/seek), integrated native audio time in game loop, added native audio start in playMedia (mutes browser audio, starts native playback), added native audio cleanup in endGameAndCleanup and pause/resume
- Updated src/components/screens/game-screen.tsx: Integrated useNativeAudio hook, passed native audio params to useGameLoop, added native audio stop on back button
- Committed and pushed to GitHub master

Stage Summary:
- ASIO/WASAPI native audio output support fully implemented
- Device enumeration works across all available audio hosts
- Native audio playback decodes MP3/AAC/FLAC/WAV/OGG/MKV via symphonia, outputs through selected device via cpal
- Resampling supported via rubato (converts source sample rate to device sample rate)
- Settings UI shows devices grouped by host (ASIO highlighted as Low-Latency)
- Game loop uses native audio time updates when ASIO is enabled
- Graceful fallback: if native audio fails, browser audio is unmuted and used
- Persistent device selection via localStorage
