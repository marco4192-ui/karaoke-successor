//! Layer 1 — Voicing Detection.
//!
//! Determines whether a given audio frame contains voiced speech/singing
//! or silence/instrumental sound. Uses energy + autocorrelation peak ratio.
//!
//! This is the "gatekeeper" — only frames marked as *voiced* are forwarded
//! to the YIN pitch estimator, which saves significant CPU time.

// ---------------------------------------------------------------------------
// VoicingDetector
// ---------------------------------------------------------------------------

/// Detects voicing in audio frames using energy and autocorrelation metrics.
pub struct VoicingDetector {
    /// RMS energy threshold below which a frame is considered silence.
    energy_threshold: f64,
    /// Window size in samples used for analysis.
    window_size: usize,
}

impl VoicingDetector {
    pub fn new(energy_threshold: f64, window_size: usize) -> Self {
        Self {
            energy_threshold,
            window_size,
        }
    }

    /// Analyse a single window of mono f32 samples.
    ///
    /// Returns a confidence 0-1 indicating how likely the frame contains
    /// voiced speech/singing.
    pub fn detect(&self, samples: &[f64]) -> f64 {
        debug_assert_eq!(samples.len(), self.window_size);

        // ---- Step 1: RMS energy ----
        let rms = self.rms(samples);

        // Very quiet → definitely not voiced
        if rms < self.energy_threshold * 0.5 {
            return 0.0;
        }

        // ---- Step 2: Normalised autocorrelation peak ----
        //    A strongly periodic signal (voiced) will have a clear peak in
        //    its autocorrelation function. Noise / silence will not.
        let norm_peak = self.autocorrelation_peak(samples);

        // ---- Step 3: Zero-crossing rate ----
        //    Voiced speech tends to have a lower ZCR than unvoiced consonants
        //    or noise, but this is just a soft hint.
        let zcr = self.zero_crossing_rate(samples);
        let zcr_score = if zcr < 0.15 { 1.0 } else if zcr < 0.3 { 0.7 } else { 0.3 };

        // ---- Step 4: Energy-based score ----
        let energy_score = if rms >= self.energy_threshold {
            (rms / self.energy_threshold).min(1.0)
        } else {
            rms / self.energy_threshold
        };

        // ---- Fuse the three indicators ----
        let combined = norm_peak * 0.50 + zcr_score * 0.15 + energy_score * 0.35;

        combined.clamp(0.0, 1.0)
    }

    // ---- Internal helpers --------------------------------------------------

    fn rms(&self, samples: &[f64]) -> f64 {
        let sum: f64 = samples.iter().map(|s| s * s).sum();
        (sum / samples.len() as f64).sqrt()
    }

    /// Compute the normalised autocorrelation peak (max of r(τ)/r(0) for τ > 0).
    /// Uses a limited range corresponding to the vocal pitch range (60-1200 Hz).
    fn autocorrelation_peak(&self, samples: &[f64]) -> f64 {
        // r(0) = mean of x[i]²
        let r0: f64 = samples.iter().map(|s| s * s).sum::<f64>() / samples.len() as f64;
        if r0 < 1e-10 {
            return 0.0;
        }

        // Search for the highest normalised autocorrelation in the pitch range.
        // For a given sample_rate we only search τ values corresponding to
        // 60 Hz … 1200 Hz, but we don't know the sample rate here.
        // We search the full meaningful range (tau 2 … window_size/2)
        // and take the peak.
        let max_tau = self.window_size / 2;
        let mut best: f64 = 0.0;

        for tau in 2..max_tau {
            let r: f64 = (0..self.window_size - tau)
                .map(|i| samples[i] * samples[i + tau])
                .sum::<f64>()
                / (self.window_size - tau) as f64;

            let norm = r / r0;
            if norm > best {
                best = norm;
            }
        }

        best.clamp(0.0, 1.0)
    }

    /// Zero-crossing rate: fraction of adjacent sample pairs with sign change.
    fn zero_crossing_rate(&self, samples: &[f64]) -> f64 {
        if samples.len() < 2 {
            return 0.0;
        }
        let crossings = samples.windows(2).filter(|w| w[0] * w[1] < 0.0).count();
        crossings as f64 / (samples.len() - 1) as f64
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn silence_has_zero_confidence() {
        let det = VoicingDetector::new(0.02, 512);
        let silence = vec![0.0f64; 512];
        assert!(det.detect(&silence) < 0.05);
    }

    #[test]
    fn periodic_signal_has_high_confidence() {
        let det = VoicingDetector::new(0.02, 512);
        let sr = 22050.0;
        let freq = 261.63; // C4
        let signal: Vec<f64> = (0..512)
            .map(|i| (2.0 * std::f64::consts::PI * freq * i as f64 / sr).sin() * 0.5)
            .collect();
        let conf = det.detect(&signal);
        assert!(conf > 0.5, "expected high confidence for periodic signal, got {}", conf);
    }
}
