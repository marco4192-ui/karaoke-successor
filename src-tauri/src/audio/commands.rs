use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

use super::devices::{self, AudioDeviceInfo};
use super::player::NativeAudioPlayer;

/// Global audio player instance.
pub struct AudioState {
    pub player: NativeAudioPlayer,
}

impl AudioState {
    pub fn new() -> Self {
        Self {
            player: NativeAudioPlayer::new(),
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
#[tauri::command]
pub fn audio_play_file(
    app: AppHandle,
    file_path: String,
    device_id: String,
) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let mut audio = audio_state.lock().map_err(|e| e.to_string())?;

    // Setup callbacks for position updates
    let handle = app.clone();
    audio.player.set_on_time_update(move |position_ms: u64| {
        let _ = handle.emit("audio:time-update", position_ms);
    });

    let handle = app.clone();
    audio.player.set_on_ended(move || {
        let _ = handle.emit("audio:ended", ());
    });

    audio.player.play_file(&file_path, &device_id)
}

/// Pause native audio playback.
#[tauri::command]
pub fn audio_pause(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    audio.player.pause();
    Ok(())
}

/// Resume native audio playback.
#[tauri::command]
pub fn audio_resume(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    audio.player.resume();
    Ok(())
}

/// Seek to a position in milliseconds.
#[tauri::command]
pub fn audio_seek(app: AppHandle, position_ms: u64) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    audio.player.seek(position_ms);
    Ok(())
}

/// Set volume (0.0 – 1.0).
#[tauri::command]
pub fn audio_set_volume(app: AppHandle, volume: f32) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    audio.player.set_volume(volume);
    Ok(())
}

/// Stop native audio playback.
#[tauri::command]
pub fn audio_stop(app: AppHandle) -> Result<(), String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let mut audio = audio_state.lock().map_err(|e| e.to_string())?;
    audio.player.stop();
    Ok(())
}

/// Get the current playback position in milliseconds.
#[tauri::command]
pub fn audio_get_position(app: AppHandle) -> Result<u64, String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    Ok(audio.player.get_position_ms())
}

/// Get the current playback state.
#[tauri::command]
pub fn audio_get_state(app: AppHandle) -> Result<AudioPlaybackState, String> {
    let audio_state = app.state::<std::sync::Mutex<AudioState>>();
    let audio = audio_state.lock().map_err(|e| e.to_string())?;
    let state = audio.player.state();
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
