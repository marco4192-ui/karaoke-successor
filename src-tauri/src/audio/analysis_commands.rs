//! Tauri commands for audio analysis (pitch detection, BPM estimation).
//!
//! These commands run on a dedicated thread to avoid blocking the main thread.
//! Progress is reported back to the frontend via Tauri events.

use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use super::analysis::{
    types::{AnalysisOptions, AnalysisProgress},
    analyzer::AudioAnalyzer,
    crepe,
};
use super::player::decode_mono_f64;

// ---------------------------------------------------------------------------
// Analysis state (managed by Tauri)
// ---------------------------------------------------------------------------

enum AnalysisCommand {
    Analyze {
        file_path: String,
        options: AnalysisOptions,
    },
    DetectBpm {
        file_path: String,
    },
    Shutdown,
}

pub struct AnalysisState {
    command_tx: Mutex<mpsc::Sender<AnalysisCommand>>,
}

impl AnalysisState {
    pub fn new(app_handle: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel::<AnalysisCommand>();

        std::thread::Builder::new()
            .name("karaoke-analysis".into())
            .spawn(move || run_analysis_thread(rx, app_handle))
            .expect("Failed to spawn analysis thread");

        Self {
            command_tx: Mutex::new(tx),
        }
    }
}

impl Drop for AnalysisState {
    fn drop(&mut self) {
        if let Ok(tx) = self.command_tx.lock() {
            let _ = tx.send(AnalysisCommand::Shutdown);
        }
    }
}

// ---------------------------------------------------------------------------
// Dedicated analysis thread
// ---------------------------------------------------------------------------

fn run_analysis_thread(
    rx: mpsc::Receiver<AnalysisCommand>,
    app_handle: AppHandle,
) {
    loop {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(AnalysisCommand::Analyze { file_path, options }) => {
                emit_progress(&app_handle, "loading", 0.0, "Lade Audiodatei...");

                match decode_mono_f64(&file_path) {
                    Ok(decoded) => {
                        emit_progress(&app_handle, "loading", 10.0, "Audio dekodiert, starte Analyse...");

                        let mut analyzer = AudioAnalyzer::new(options);
                        let result = analyzer.analyze(
                            &decoded.samples,
                            decoded.sample_rate,
                            Some(|prog| {
                                let _ = app_handle.emit("analysis:progress", prog);
                            }),
                        );

                        let _ = app_handle.emit("analysis:complete", result);
                    }
                    Err(e) => {
                        let _ = app_handle.emit("analysis:error", e);
                    }
                }
            }
            Ok(AnalysisCommand::DetectBpm { file_path }) => {
                match decode_mono_f64(&file_path) {
                    Ok(decoded) => {
                        use super::analysis::bpm::BpmDetector;
                        let det = BpmDetector::new(1024, 512, decoded.sample_rate);
                        let bpm = det.detect(&decoded.samples);

                        let _ = app_handle.emit("bpm:complete", BpmDetectionResult {
                            bpm,
                            file_path,
                            duration_ms: decoded.duration_ms,
                        });
                    }
                    Err(e) => {
                        let _ = app_handle.emit("bpm:error", e);
                    }
                }
            }
            Ok(AnalysisCommand::Shutdown) => break,
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
}

fn emit_progress(
    app: &AppHandle,
    _stage: &str,
    progress: f64,
    message: &str,
) {
    let _ = app.emit("analysis:progress", AnalysisProgress {
        stage: super::analysis::types::AnalysisStage::Loading, // will be overridden by analyzer
        progress,
        message: message.to_string(),
    });
}

// ---------------------------------------------------------------------------
// Serializable result for BPM detection
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BpmDetectionResult {
    pub bpm: f64,
    pub file_path: String,
    pub duration_ms: u64,
}

// ---------------------------------------------------------------------------
// CREPE info command
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CrepeInfo {
    pub available: bool,
    pub info: String,
}

// ---------------------------------------------------------------------------
// Tauri Commands
// ---------------------------------------------------------------------------

/// Start a full pitch analysis on an audio file.
/// The result is returned asynchronously via the "analysis:complete" event.
/// Progress is reported via "analysis:progress" events.
#[tauri::command]
pub fn audio_analyze_pitch(
    app: AppHandle,
    file_path: String,
    options: Option<AnalysisOptions>,
) -> Result<String, String> {
    let analysis_state = app.state::<AnalysisState>();
    let tx = analysis_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AnalysisCommand::Analyze {
        file_path,
        options: options.unwrap_or_default(),
    })
    .map_err(|e| e.to_string())?;

    Ok("Analysis started".to_string())
}

/// Detect the BPM of an audio file.
/// Result is returned asynchronously via the "bpm:complete" event.
#[tauri::command]
pub fn audio_detect_bpm(
    app: AppHandle,
    file_path: String,
) -> Result<String, String> {
    let analysis_state = app.state::<AnalysisState>();
    let tx = analysis_state.command_tx.lock().map_err(|e| e.to_string())?;
    tx.send(AnalysisCommand::DetectBpm { file_path })
        .map_err(|e| e.to_string())?;

    Ok("BPM detection started".to_string())
}

/// Check whether the CREPE deep-learning model is available.
#[tauri::command]
pub fn audio_crepe_info() -> CrepeInfo {
    CrepeInfo {
        available: crepe::is_crepe_available(),
        info: crepe::crepe_model_info().to_string(),
    }
}
