//! Audio Analysis Module.
//!
//! Provides pitch detection (YIN + CREPE), octave correction,
//! voicing detection, and BPM estimation for karaoke song files.
//!
//! Pipeline (3 cooperative layers):
//!   Layer 1 — Voicing Detection (autocorrelation + energy + ZCR)
//!   Layer 2 — YIN Pitch Estimation (CMNDF + parabolic interpolation)
//!   Layer 3 — Octave Correction (Harmonic Product Spectrum via FFT)
//!
//! Optional: CREPE deep-learning pitch detection (behind `crepe` feature).

pub mod types;
pub mod voicing;
pub mod yin;
pub mod octave;
pub mod bpm;
pub mod analyzer;
pub mod crepe;

// Re-export main types for convenience
#[allow(unused_imports)]
pub use types::*;
#[allow(unused_imports)]
pub use analyzer::AudioAnalyzer;
