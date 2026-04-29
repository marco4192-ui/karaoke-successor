//! Shared types for audio analysis: pitch detection, BPM estimation, confidence scoring.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Frame-level results
// ---------------------------------------------------------------------------

/// A single analysis frame (one time slice of the audio).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisFrame {
    /// Time position in ms from the start of the audio.
    pub time_ms: f64,
    /// Detected frequency in Hz (None if no voicing).
    pub frequency: Option<f64>,
    /// MIDI note number (None if no voicing).
    pub midi_note: Option<i32>,
    /// Voicing confidence 0-1. How certain we are that singing is present.
    pub voicing_confidence: f64,
    /// Pitch confidence 0-1. How certain we are about the detected pitch.
    pub pitch_confidence: f64,
    /// Overall fused confidence 0-1.
    pub overall_confidence: f64,
}

// ---------------------------------------------------------------------------
// Note-level results
// ---------------------------------------------------------------------------

/// A detected note merged from consecutive voiced frames.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedNote {
    /// Start time in ms.
    pub start_time_ms: f64,
    /// Duration in ms.
    pub duration_ms: f64,
    /// MIDI note number.
    pub midi_note: i32,
    /// Frequency in Hz.
    pub frequency: f64,
    /// Average confidence 0-1.
    pub confidence: f64,
    /// Confidence level for colour coding in the editor.
    pub confidence_level: ConfidenceLevel,
}

/// Confidence level → maps to a colour in the editor UI.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ConfidenceLevel {
    /// All 3 layers agree (>95 %) → green
    High,
    /// Layers 2 + 3 agree (70-95 %) → yellow
    Medium,
    /// Only one layer produced a result (40-70 %) → orange
    Low,
    /// Layers contradict each other (<40 %) → red, needs manual review
    VeryLow,
}

// ---------------------------------------------------------------------------
// Top-level analysis result
// ---------------------------------------------------------------------------

/// Complete pitch analysis result returned to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PitchAnalysisResult {
    /// Per-frame results (used for waveform visualisation).
    pub frames: Vec<AnalysisFrame>,
    /// Merged notes (used to populate the editor note grid).
    pub notes: Vec<DetectedNote>,
    /// Estimated BPM from onset detection.
    pub bpm: f64,
    /// Which algorithm was used ("yin" or "crepe").
    pub algorithm: String,
    /// Wall-clock time the analysis took in ms.
    pub analysis_duration_ms: u64,
    /// Sample rate the audio was analysed at.
    pub sample_rate: u32,
    /// Total audio duration in ms.
    pub audio_duration_ms: u64,
}

// ---------------------------------------------------------------------------
// Progress events (emitted to the frontend via Tauri events)
// ---------------------------------------------------------------------------

/// Progress event emitted during analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisProgress {
    /// Current analysis stage.
    pub stage: AnalysisStage,
    /// Progress 0-100.
    pub progress: f64,
    /// Human-readable status message.
    pub message: String,
}

/// Analysis stages.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AnalysisStage {
    Loading,
    VoicingDetection,
    PitchDetection,
    OctaveCorrection,
    BpmEstimation,
    NoteConversion,
    Complete,
    Error,
}

// ---------------------------------------------------------------------------
// Analysis options (sent from the frontend)
// ---------------------------------------------------------------------------

/// Options for the pitch analysis pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AnalysisOptions {
    /// "yin" (default) or "crepe" (high-accuracy mode, requires model file).
    pub algorithm: String,
    /// Minimum detectable frequency in Hz. Default 60.
    pub min_frequency: f64,
    /// Maximum detectable frequency in Hz. Default 1200.
    pub max_frequency: f64,
    /// Voicing energy threshold 0-1. Default 0.02.
    pub voicing_threshold: f64,
    /// YIN absolute threshold 0-1. Default 0.15.
    pub yin_threshold: f64,
    /// Enable Layer 3 octave correction. Default true.
    pub enable_octave_correction: bool,
    /// Hop size override in samples (None = auto based on sample rate).
    pub hop_size_override: Option<usize>,
    /// Path to the CREPE ONNX model file (e.g. "crepe-tiny.onnx").
    /// Required when algorithm = "crepe". Ignored otherwise.
    pub crepe_model_path: Option<String>,
}

impl Default for AnalysisOptions {
    fn default() -> Self {
        Self {
            algorithm: "yin".to_string(),
            min_frequency: 60.0,
            max_frequency: 1200.0,
            voicing_threshold: 0.02,
            yin_threshold: 0.15,
            enable_octave_correction: true,
            hop_size_override: None,
            crepe_model_path: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Map a confidence value to a `ConfidenceLevel`.
pub fn confidence_to_level(confidence: f64) -> ConfidenceLevel {
    if confidence >= 0.95 {
        ConfidenceLevel::High
    } else if confidence >= 0.70 {
        ConfidenceLevel::Medium
    } else if confidence >= 0.40 {
        ConfidenceLevel::Low
    } else {
        ConfidenceLevel::VeryLow
    }
}

/// Convert a frequency in Hz to the closest MIDI note number.
pub fn frequency_to_midi(freq: f64) -> i32 {
    (69.0 + 12.0 * (freq / 440.0).log2()).round() as i32
}


