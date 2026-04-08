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
    fn autocorrelation_bpm(&self, onset: &[f64]) -> f64 {
        let frames_per_second = self.sample_rate / self.hop_size as f64;

        // Search BPM range: 40-220 BPM
        let min_bpm = 40.0;
        let max_bpm = 220.0;

        let min_lag = (frames_per_second * 60.0 / max_bpm) as usize;
        let max_lag = ((frames_per_second * 60.0 / min_bpm) as usize).min(onset.len() / 2);

        if max_lag <= min_lag {
            return 120.0;
        }

        // Compute autocorrelation for lags in the BPM range
        let mut best_lag = min_lag;
        let mut best_corr = f64::NEG_INFINITY;

        // Also compute the mean of the onset signal for normalisation
        let mean: f64 = onset.iter().sum::<f64>() / onset.len() as f64;
        let variance: f64 = onset.iter().map(|x| (x - mean).powi(2)).sum::<f64>() / onset.len() as f64;

        if variance < 1e-10 {
            return 120.0;
        }

        for lag in min_lag..max_lag {
            let corr: f64 = (0..onset.len() - lag)
                .map(|i| (onset[i] - mean) * (onset[i + lag] - mean))
                .sum::<f64>()
                / (onset.len() - lag) as f64;

            let norm_corr = corr / variance;

            if norm_corr > best_corr {
                best_corr = norm_corr;
                best_lag = lag;
            }
        }

        // Convert lag to BPM
        let beat_period_seconds = best_lag as f64 / frames_per_second;
        let bpm = 60.0 / beat_period_seconds;

        // Check for double/half-time errors
        let double_lag = best_lag * 2;
        let half_lag = best_lag / 2;

        let double_bpm = if double_lag < max_lag {
            let _corr: f64 = (0..onset.len() - double_lag)
                .map(|i| (onset[i] - mean) * (onset[i + double_lag] - mean))
                .sum::<f64>()
                / (onset.len() - double_lag) as f64
                / variance;
            60.0 / (double_lag as f64 / frames_per_second)
        } else {
            0.0
        };

        let half_bpm = if half_lag >= min_lag {
            let _corr: f64 = (0..onset.len() - half_lag)
                .map(|i| (onset[i] - mean) * (onset[i + half_lag] - mean))
                .sum::<f64>()
                / (onset.len() - half_lag) as f64
                / variance;
            60.0 / (half_lag as f64 / frames_per_second)
        } else {
            0.0
        };

        // Prefer BPM in the 80-180 range (most common for karaoke)
        if bpm < 80.0 && double_bpm >= 80.0 && double_bpm <= 200.0 {
            return double_bpm;
        }
        if bpm > 200.0 && half_bpm >= 80.0 && half_bpm <= 200.0 {
            return half_bpm;
        }

        bpm.clamp(40.0, 220.0)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_bpm_fallback_for_short_audio() {
        let det = BpmDetector::new(1024, 512, 22050);
        let short = vec![0.0f64; 100];
        assert_eq!(det.detect(&short), 120.0);
    }

    #[test]
    fn detect_bpm_for_periodic_clicks() {
        // Generate a signal with clicks at 120 BPM
        let sr = 22050u32;
        let bpm = 120.0;
        let beat_samples = (60.0 / bpm * sr as f64) as usize;
        let total_samples = beat_samples * 8; // 8 beats

        let mut signal = vec![0.0f64; total_samples];
        for beat in 0..8 {
            let pos = beat * beat_samples;
            // Create a short click (10ms)
            let click_len = (0.01 * sr as f64) as usize;
            for i in 0..click_len.min(total_samples - pos) {
                signal[pos + i] = ((i as f64 / click_len as f64) * std::f64::consts::PI).sin().exp() * 0.8;
            }
        }

        let det = BpmDetector::new(1024, 512, sr);
        let detected = det.detect(&signal);
        // Allow some tolerance since onset detection isn't perfect for synthetic clicks
        assert!(
            (detected - bpm).abs() < 20.0,
            "expected ~{bpm} BPM, got {detected} BPM"
        );
    }
}
