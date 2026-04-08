//! Layer 3 — Octave Correction via Harmonic Product Spectrum (HPS).
//!
//! YIN occasionally detects an octave error (e.g. C5 instead of C4).
//! This layer cross-checks the candidate frequency against the harmonic
//! structure of the signal using FFT-based spectral analysis.

use rustfft::{FftPlanner, num_complex::Complex};

// ---------------------------------------------------------------------------
// OctaveCorrector
// ---------------------------------------------------------------------------

pub struct OctaveCorrector {
    /// Number of harmonics to use in the HPS (typically 4-5).
    harmonics: usize,
    /// FFT size (must be >= window size).
    fft_size: usize,
}

impl OctaveCorrector {
    pub fn new(harmonics: usize, fft_size: usize) -> Self {
        Self {
            harmonics: harmonics.max(2).min(8),
            fft_size,
        }
    }

    /// Given an audio window and the YIN-estimated frequency, verify (and
    /// possibly correct) the octave.
    ///
    /// Returns the corrected frequency and a boolean indicating whether
    /// a correction was applied.
    pub fn correct(&self, samples: &[f64], yin_freq: f64, sample_rate: f64) -> (f64, bool) {
        if samples.len() < self.fft_size {
            return (yin_freq, false);
        }

        // ---- Step 1: Compute magnitude spectrum via FFT ----
        let magnitude = self.magnitude_spectrum(samples);

        // ---- Step 2: Harmonic Product Spectrum ----
        let hps = self.harmonic_product(&magnitude, sample_rate);

        // ---- Step 3: Find the peak in the HPS within the vocal range ----
        let min_bin = ((60.0 * self.fft_size as f64 / sample_rate) as usize).max(1);
        let max_bin = ((1200.0 * self.fft_size as f64 / sample_rate) as usize)
            .min(hps.len() / 2);

        let (hps_peak_bin, hps_peak_val) = self.find_peak(&hps, min_bin, max_bin);
        let hps_freq = hps_peak_bin as f64 * sample_rate / self.fft_size as f64;

        // ---- Step 4: Compare YIN result with HPS result ----
        // Check if the YIN frequency is a harmonic (2x, 0.5x, etc.) of the HPS peak
        let ratio = yin_freq / hps_freq;

        let corrected = if ratio > 1.7 && ratio < 2.3 {
            // YIN detected one octave too high → divide by 2
            Some(yin_freq / 2.0)
        } else if ratio > 0.4 && ratio < 0.6 {
            // YIN detected one octave too low → multiply by 2
            Some(yin_freq * 2.0)
        } else {
            None
        };

        // Only apply correction if the HPS peak is reasonably strong
        // and the corrected frequency is still in the vocal range
        match corrected {
            Some(freq) if hps_peak_val > 0.1 && freq >= 55.0 && freq <= 1400.0 => {
                (freq, true)
            }
            _ => (yin_freq, false),
        }
    }

    /// Compute the magnitude spectrum via FFT.
    fn magnitude_spectrum(&self, samples: &[f64]) -> Vec<f64> {
        let n = self.fft_size;

        // Build input buffer (zero-pad if necessary)
        let mut buffer: Vec<Complex<f64>> = (0..n)
            .map(|i| {
                let val = if i < samples.len() {
                    // Apply Hann window
                    let w = 0.5 * (1.0 - (2.0 * std::f64::consts::PI * i as f64 / (n - 1) as f64).cos());
                    samples[i] * w
                } else {
                    0.0
                };
                Complex::new(val, 0.0)
            })
            .collect();

        // FFT
        let mut planner = FftPlanner::new();
        let fft = planner.plan_fft_forward(n);
        fft.process(&mut buffer);

        // Magnitude spectrum (only first half is meaningful)
        buffer[0..n / 2]
            .iter()
            .map(|c| (c.re * c.re + c.im * c.im).sqrt())
            .collect()
    }

    /// Compute the Harmonic Product Spectrum by downsampling the magnitude
    /// spectrum by factors 1, 2, ..., H and multiplying element-wise.
    fn harmonic_product(&self, magnitude: &[f64], sample_rate: f64) -> Vec<f64> {
        let n = magnitude.len();
        let mut hps = vec![0.0f64; n];

        // Start with the original spectrum
        for i in 0..n {
            hps[i] = magnitude[i];
        }

        // Multiply with downsampled versions
        for h in 2..=self.harmonics {
            for i in 0..n {
                let downsampled_idx = i * h;
                if downsampled_idx < n {
                    hps[i] *= magnitude[downsampled_idx];
                } else {
                    hps[i] *= 0.0;
                }
            }
        }

        hps
    }

    /// Find the bin with the maximum value in the given range.
    fn find_peak(&self, data: &[f64], min_bin: usize, max_bin: usize) -> (usize, f64) {
        let mut best_bin = min_bin;
        let mut best_val = 0.0f64;

        for bin in min_bin..max_bin.min(data.len()) {
            if data[bin] > best_val {
                best_val = data[bin];
                best_bin = bin;
            }
        }

        (best_bin, best_val)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn make_sine(freq: f64, sr: f64, n: usize) -> Vec<f64> {
        (0..n)
            .map(|i| (2.0 * std::f64::consts::PI * freq * i as f64 / sr).sin() * 0.5)
            .collect()
    }

    #[test]
    fn correct_frequency_ok_for_clean_sine() {
        let sr = 22050.0;
        let freq = 261.63;
        let buf = make_sine(freq, sr, 2048);
        let corrector = OctaveCorrector::new(4, 2048);

        // Feed the correct frequency — should not change
        let (corrected, was_corrected) = corrector.correct(&buf, freq, sr);
        assert!(!was_corrected || (corrected - freq).abs() < 5.0);
    }

    #[test]
    fn corrects_one_octave_high() {
        let sr = 22050.0;
        let true_freq = 220.0; // A3
        let buf = make_sine(true_freq, sr, 2048);
        let corrector = OctaveCorrector::new(4, 2048);

        // Feed double the frequency (one octave too high)
        let (corrected, was_corrected) = corrector.correct(&buf, true_freq * 2.0, sr);
        assert!(was_corrected, "expected octave correction to be applied");
        assert!(
            (corrected - true_freq).abs() < 20.0,
            "expected ~{true_freq} Hz, got {corrected} Hz"
        );
    }
}
