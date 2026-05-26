use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{ipc::Channel, AppHandle, Manager};

use super::devices::{self, AudioDeviceInfo};
use super::player::{NativeAudioPlayer, PlaybackState};

// ---------------------------------------------------------------------------
// Commands sent from Tauri handlers → dedicated audio thread
// ---------------------------------------------------------------------------

enum AudioCommand {
    Play {
        file_path: String,
        device_id: String,
        on_time_update: Channel<u64>,
        on_ended: Channel<()>,
        on_error: Channel<String>,
    },
    Pause,
    Resume,
    Seek(u64),
    SetVolume(f32),
    Stop,
    Shutdown,
}

// ---------------------------------------------------------------------------
// Managed state (Send + Sync safe)
// ---------------------------------------------------------------------------

/// Global audio state managed by Tauri.
/// The actual `NativeAudioPlayer` (which owns a !Send cpal::Stream) lives on a
/// dedicated thread.  We communicate with it via a channel and share the
/// `PlaybackState` via `Arc<Mutex<_>>`.
pub struct AudioState {
    /// Channel sender wrapped in Mutex for Sync (mpsc::Sender is Send-only).
    command_tx: Mutex<mpsc::Sender<AudioCommand>>,
    /// Shared playback state updated by the audio thread / cpal callbacks.
    state: Arc<Mutex<PlaybackState>>,
}

impl AudioState {
    /// Spawn the dedicated audio thread and return the managed state.
    pub fn new() -> Result<Self, String> {
        let (tx, rx) = mpsc::channel::<AudioCommand>();
        let state = Arc::new(Mutex::new(PlaybackState::default()));
        let shared_state = state.clone();

        std::thread::Builder::new()
            .name("karaoke-audio".into())
            .spawn(move || {
                run_audio_thread(rx, shared_state);
            })
            .map_err(|e| format!("Failed to spawn audio thread: {}", e))?;

        Ok(Self {
            command_tx: Mutex::new(tx),
            state,
        })
    }
}

impl Drop for AudioState {
    fn drop(&mut self) {
        // Gracefully shut down the audio thread
        if let Ok(tx) = self.command_tx.lock() {
            let _ = tx.send(AudioCommand::Shutdown);
        }
    }
}

// ---------------------------------------------------------------------------
// Dedicated audio thread
// ---------------------------------------------------------------------------

fn run_audio_thread(
    rx: mpsc::Receiver<AudioCommand>,
    shared_state: Arc<Mutex<PlaybackState>>,
) {
    let mut player = NativeAudioPlayer::with_shared_state(shared_state.clone());
    let mut ended_emitted = false;

    // Channels for streaming events to the frontend (set on each Play command).
    let mut time_update_ch: Option<Channel<u64>> = None;
    let mut ended_ch: Option<Channel<()>> = None;
    let mut error_ch: Option<Channel<String>> = None;

    loop {
        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(AudioCommand::Play {
                file_path,
                device_id,
                on_time_update,
                on_ended,
                on_error,
            }) => {
                ended_emitted = false;
                time_update_ch = Some(on_time_update);
                ended_ch = Some(on_ended);
                error_ch = Some(on_error);
                if let Err(e) = player.play_file(&file_path, &device_id) {
                    eprintln!("Play failed for '{}': {}", file_path, e);
                    if let Some(ch) = &error_ch {
                        let _ = ch.send(e.to_string());
                    }
                }
            }
            Ok(AudioCommand::Pause) => {
                player.pause();
            }
            Ok(AudioCommand::Resume) => {
                player.resume();
            }
            Ok(AudioCommand::Seek(pos)) => {
                player.seek(pos);
            }
            Ok(AudioCommand::SetVolume(vol)) => {
                player.set_volume(vol);
            }
            Ok(AudioCommand::Stop) => {
                ended_emitted = false;
                player.stop();
                // Drop channels so stale callbacks cannot fire after stop
                time_update_ch = None;
                ended_ch = None;
                error_ch = None;
            }
            Ok(AudioCommand::Shutdown) => {
                player.stop();
                break;
            }
            Err(RecvTimeoutError::Timeout) => {
                // Poll shared state for event emission
                let Ok(state) = shared_state.lock() else {
                    // Mutex poisoned — another thread panicked. Exit audio thread gracefully.
                    eprintln!("[audio] Shared state mutex poisoned, exiting audio thread");
                    break;
                };

                // Send periodic time-update while playing via Channel IPC
                if state.is_playing {
                    if let Some(ch) = &time_update_ch {
                        let _ = ch.send(state.position_ms);
                    }
                }

                // Detect playback ended (set by the cpal callback inside player)
                if !ended_emitted
                    && !state.is_playing
                    && state.duration_ms > 0
                    && state.position_ms >= state.duration_ms
                {
                    drop(state); // release lock before sending
                    if let Some(ch) = ended_ch.take() {
                        let _ = ch.send(());
                    }
                    time_update_ch = None;
                    error_ch = None;
                    ended_emitted = true;
                }
            }
            Err(RecvTimeoutError::Disconnected) => {
                // Channel closed – shut down
                break;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

/// List all available audio output devices.
#[tauri::command]
pub fn audio_list_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    devices::list_output_devices()
}

/// Get the default output device info.
#[tauri::command]
pub fn audio_get_default_device() -> Result<AudioDeviceInfo, String> {
    devices::get_default_device()
}

/// Play an audio file on the specified device.
/// `device_id` can be "default" or "<host_name>:<device_index>".
/// Time-update, ended, and error events are reported via Tauri Channels (bypasses ACL).
#[tauri::command]
pub fn audio_play_file(
    app: AppHandle,
    file_path: String,
    device_id: String,
    on_time_update: Channel<u64>,
    on_ended: Channel<()>,
    on_error: Channel<String>,
) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::Play {
        file_path,
        device_id,
        on_time_update,
        on_ended,
        on_error,
    })
    .map_err(|e| e.to_string())
}

/// Pause native audio playback.
#[tauri::command]
pub fn audio_pause(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::Pause).map_err(|e| e.to_string())
}

/// Resume native audio playback.
#[tauri::command]
pub fn audio_resume(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::Resume).map_err(|e| e.to_string())
}

/// Seek to a position in milliseconds.
#[tauri::command]
pub fn audio_seek(app: AppHandle, position_ms: u64) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::Seek(position_ms))
        .map_err(|e| e.to_string())
}

/// Set volume (0.0 – 1.0).
#[tauri::command]
pub fn audio_set_volume(app: AppHandle, volume: f32) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::SetVolume(volume))
        .map_err(|e| e.to_string())
}

/// Stop native audio playback.
#[tauri::command]
pub fn audio_stop(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<AudioState>();
    let tx = audio_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AudioCommand::Stop).map_err(|e| e.to_string())
}

/// Get the current playback position in milliseconds.
#[tauri::command]
pub fn audio_get_position(app: AppHandle) -> Result<u64, String> {
    let audio_state = app.state::<AudioState>();
    let state = audio_state.state.lock().map_err(|e| e.to_string())?;
    Ok(state.position_ms)
}

/// Get the current playback state.
#[tauri::command]
pub fn audio_get_state(app: AppHandle) -> Result<AudioPlaybackState, String> {
    let audio_state = app.state::<AudioState>();
    let state = audio_state.state.lock().map_err(|e| e.to_string())?;
    Ok(AudioPlaybackState {
        position_ms: state.position_ms,
        duration_ms: state.duration_ms,
        is_playing: state.is_playing,
        volume: state.volume,
    })
}

/// Serializable playback state for the frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AudioPlaybackState {
    pub position_ms: u64,
    pub duration_ms: u64,
    pub is_playing: bool,
    pub volume: f32,
}
