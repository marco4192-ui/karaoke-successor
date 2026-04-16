//! BPM (Beats Per Minute) Detection.
//!
//! Uses an onset-strength signal derived from spectral flux, then applies
//! autocorrelation to find the dominant periodicity → BPM.

use rustfft::{FftPlanner, num_complex::Complex};

// ---------------------------------------------------------------------------
// BpmDetector
// ---------------------------------------------------------------------------

pub struct BpmDetector {
    fft_size: usize,
    hop_size: usize,
    sample_rate: f64,
}

impl BpmDetector {
    pub fn new(fft_size: usize, hop_size: usize, sample_rate: u32) -> Self {
        Self {
            fft_size,
            hop_size,
            sample_rate: sample_rate as f64,
        }
    }

    /// Detect BPM from mono f64 audio samples.
    ///
    /// Returns the estimated BPM.
    pub fn detect(&self, samples: &[f64]) -> f64 {
        if samples.len() < self.fft_size * 4 {
            return 120.0; // fallback
        }

        // ---- Step 1: Compute onset strength signal ----
        let onset = self.onset_strength(samples);

        if onset.len() < 8 {
            return 120.0;
        }

        // ---- Step 2: Autocorrelation of the onset signal ----
        let bpm = self.autocorrelation_bpm(&onset);

        bpm
    }

    // ---- Internal ----------------------------------------------------------

    /// Compute the onset strength envelope using spectral flux.
    fn onset_strength(&self, samples: &[f64]) -> Vec<f64> {
        let n = self.fft_size;
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(n);

        let num_frames = (samples.len() - n) / self.hop_size + 1;
        let mut onset = Vec::with_capacity(num_frames.max(1));
        let mut prev_magnitude: Option<Vec<f64>> = None;

        for frame_idx in 0..num_frames.max(1) {
            let start = frame_idx * self.hop_size;
            let end = (start + n).min(samples.len());
            if end - start < n {
                break;
            }

            // Build windowed input
            let window: Vec<f64> = (0..n).map(|i| {
                let w = 0.5 * (1.0 - (2.0 * std::f64::consts::PI * i as f64 / (n - 1) as f64).cos());
                samples[start + i] * w
            }).collect();

            let mut buffer: Vec<Complex<f64>> = window.iter().map(|&v| Complex::new(v, 0.0)).collect();

            if buffer.len() < n {
                buffer.resize(n, Complex::new(0.0, 0.0));
            }

            fft.process(&mut buffer);

            // Magnitude spectrum (first half)
            let magnitude: Vec<f64> = buffer[0..n / 2]
                .iter()
                .map(|c| (c.re * c.re + c.im * c.im).sqrt())
                .collect();

            // Spectral flux: sum of positive differences (half-wave rectification)
            let flux = match &prev_magnitude {
                Some(prev) => magnitude
                    .iter()
                    .zip(prev.iter())
                    .map(|(curr, p)| (curr - p).max(0.0))
                    .sum::<f64>(),
                None => 0.0,
            };

            onset.push(flux);
            prev_magnitude = Some(magnitude);
        }

        onset
    }

    /// Estimate BPM using autocorrelation of the onset signal.
    ///
    /// The algorithm searches a wide BPM range (40–400) and then applies
    /// multi-octave correction: if a shorter lag (higher BPM) has comparable
    /// correlation strength, the higher BPM is preferred. This prevents
    /// sub-harmonic errors where e.g. a 324 BPM song is detected as 81 BPM
    /// (period × 4).
    fn autocorrelation_bpm(&self, onset: &[f64]) -> f64 {
        let frames_per_second = self.sample_rate / self.hop_size as f64;

        // Search BPM range: 40-400 BPM (wide range to cover fast songs)
        let min_bpm = 40.0;
        let max_bpm = 400.0;

        let min_lag = (frames_per_second * 60.0 / max_bpm) as usize;
        let max_lag = ((frames_per_second * 60.0 / min_bpm) as usize).min(onset.len() / 2);

        if max_lag <= min_lag {
            return 120.0;
        }

        // Compute mean and variance for normalisation
        let mean: f64 = onset.iter().sum::<f64>() / onset.len() as f64;
        let variance: f64 = onset.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / onset.len() as f64;

        if variance < 1e-10 {
            return 120.0;
        }

        // Helper: normalised autocorrelation at a given lag
        let corr_at = |lag: usize| -> f64 {
            if lag == 0 || lag >= onset.len() {
                return 0.0;
            }
            let c: f64 = (0..onset.len() - lag)
                .map(|i| (onset[i] - mean) * (onset[i + lag] - mean))
                .sum::<f64>()
                / (onset.len() - lag) as f64;
            c / variance
        };

        // Find the lag with the highest autocorrelation
        let mut best_lag = min_lag;
        let mut best_corr = f64::NEG_INFINITY;

        for lag in min_lag..max_lag {
            let norm_corr = corr_at(lag);
            if norm_corr > best_corr {
                best_corr = norm_corr;
                best_lag = lag;
            }
        }

        // ---- Multi-octave correction ----
        // If the detected lag is a multiple of the true beat period, halving
        // the lag (doubling the BPM) will also yield a strong correlation.
        // Walk up to 3 octaves (×2, ×4, ×8 BPM) as long as the correlation
        // stays above a threshold relative to the previous candidate.
        let mut candidate_lag = best_lag;
        let mut candidate_corr = best_corr;
        let octave_threshold = 0.60; // accept up to 40 % correlation drop per octave

        for _ in 0..3 {
            let shorter = candidate_lag / 2;
            if shorter < min_lag {
                break;
            }
            let shorter_corr = corr_at(shorter);
            if shorter_corr >= octave_threshold * candidate_corr {
                candidate_lag = shorter;
                candidate_corr = shorter_corr;
            } else {
                break;
            }
        }

        // Convert final lag to BPM
        let beat_period_seconds = candidate_lag as f64 / frames_per_second;
        let bpm = 60.0 / beat_period_seconds;

        bpm.clamp(40.0, 500.0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    /// Generate a synthetic click signal at a given BPM.
    fn make_click_signal(sr: u32, bpm: f64, num_beats: usize) -> Vec<f64> {
        let beat_samples = (60.0 / bpm * sr as f64) as usize;
        let total_samples = beat_samples * num_beats;
        let mut signal = vec![0.0f64; total_samples];
        let click_len = (0.005 * sr as f64) as usize; // 5 ms click
        for beat in 0..num_beats {
            let pos = beat * beat_samples;
            for i in 0..click_len.min(total_samples - pos) {
                signal[pos + i] =
                    ((i as f64 / click_len as f64) * std::f64::consts::PI).sin().exp() * 0.8;
            }
        }
        signal
    }

    #[test]
    fn detect_bpm_fallback_for_short_audio() {
        let det = BpmDetector::new(1024, 512, 22050);
        let short = vec![0.0f64; 100];
        assert_eq!(det.detect(&short), 120.0);
    }

    #[test]
    fn detect_bpm_120() {
        let sr = 22050u32;
        let det = BpmDetector::new(1024, 512, sr);
        let signal = make_click_signal(sr, 120.0, 16);
        let detected = det.detect(&signal);
        assert!(
            (detected - 120.0).abs() < 15.0,
            "expected ~120 BPM, got {detected} BPM"
        );
    }

    #[test]
    fn detect_bpm_324_high_bpm() {
        // Regression: previously detected as 81 BPM (324 / 4)
        let sr = 44100u32;
        let det = BpmDetector::new(1024, 512, sr);
        let signal = make_click_signal(sr, 324.0, 64);
        let detected = det.detect(&signal);
        assert!(
            (detected - 324.0).abs() < 40.0,
            "expected ~324 BPM, got {detected} BPM"
        );
    }

    #[test]
    fn detect_bpm_80() {
        let sr = 22050u32;
        let det = BpmDetector::new(1024, 512, sr);
        let signal = make_click_signal(sr, 80.0, 12);
        let detected = det.detect(&signal);
        assert!(
            (detected - 80.0).abs() < 15.0,
            "expected ~80 BPM, got {detected} BPM"
        );
    }

    #[test]
    fn detect_bpm_200() {
        let sr = 44100u32;
        let det = BpmDetector::new(1024, 512, sr);
        let signal = make_click_signal(sr, 200.0, 32);
        let detected = det.detect(&signal);
        assert!(
            (detected - 200.0).abs() < 20.0,
            "expected ~200 BPM, got {detected} BPM"
        );
    }
}
