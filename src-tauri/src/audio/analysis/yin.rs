//! Layer 2 — YIN Pitch Estimation.
//!
//! Implements the YIN fundamental frequency estimation algorithm
//! (de Cheveigné & Kawahara, 2002). Returns a frequency + confidence pair
//! for each voiced frame.
//!
//! Only `YinDetectorSr` is exported — the version that stores the sample rate
//! for correct frequency computation.

/// A YIN detector that stores the sample rate for correct frequency computation.
pub struct YinDetectorSr {
    /// YIN absolute threshold — lower = more sensitive but more errors.
    threshold: f64,
    /// Minimum period in samples (from sample_rate / max_frequency).
    min_period: usize,
    /// Maximum period in samples (from sample_rate / min_frequency).
    max_period: usize,
    /// Audio sample rate in Hz.
    sample_rate: f64,
}

impl YinDetectorSr {
    /// Create a new YIN detector.
    ///
    /// * `threshold` — absolute threshold in the CMNDF (default 0.15).
    /// * `min_frequency` / `max_frequency` — search range in Hz.
    /// * `sample_rate` — audio sample rate.
    pub fn new(
        threshold: f64,
        min_frequency: f64,
        max_frequency: f64,
        sample_rate: u32,
    ) -> Self {
        let sr = sample_rate as f64;
        let min_period = (sr / max_frequency).floor() as usize;
        let max_period = (sr / min_frequency).ceil() as usize;
        Self {
            threshold,
            min_period: min_period.max(2),
            max_period: max_period.min(4096),
            sample_rate: sr,
        }
    }

    /// Run YIN on a frame of mono f64 samples.
    ///
    /// Returns `(frequency_hz, confidence)`.
    /// If no pitch is found, returns `(0.0, 0.0)`.
    pub fn detect(&self, buf: &[f64]) -> (f64, f64) {
        let buf_len = buf.len();
        let usable = buf_len / 2;
        if usable < self.max_period {
            return (0.0, 0.0);
        }

        // Step 1: Difference function d(τ)
        let search_start = self.min_period;
        let search_end = usable.min(self.max_period + 1);

        let mut d = vec![0.0f64; search_end];
        for tau in search_start..search_end {
            let sum: f64 = (0..usable)
                .map(|j| {
                    let delta = buf[j] - buf[j + tau];
                    delta * delta
                })
                .sum();
            d[tau] = sum;
        }

        // Step 2: Cumulative Mean Normalised Difference Function (CMNDF)
        let mut d_prime = vec![0.0f64; search_end];
        d_prime[0] = 1.0;
        let mut running_sum = 0.0;

        for tau in 1..search_end {
            running_sum += d[tau];
            if running_sum > 1e-12 {
                d_prime[tau] = d[tau] * tau as f64 / running_sum;
            } else {
                d_prime[tau] = 1.0;
            }
        }

        // Step 3: Find global minimum (used for confidence & fallback)
        let mut global_min = 1.0f64;
        for tau in search_start..search_end {
            if d_prime[tau] < global_min {
                global_min = d_prime[tau];
            }
        }

        // Step 4: Absolute threshold — find first valley below threshold
        let mut tau_estimate: Option<usize> = None;

        for tau in search_start..search_end {
            if d_prime[tau] < self.threshold {
                // Walk to local minimum (valley)
                let mut lm = tau;
                while lm + 1 < search_end && d_prime[lm + 1] < d_prime[lm] {
                    lm += 1;
                }
                tau_estimate = Some(lm);
                break;
            }
        }

        // Fallback: if no tau below threshold, use the global minimum
        // (if it's reasonably good)
        let tau = match tau_estimate {
            Some(t) => t,
            None => {
                if global_min < 0.5 {
                    let mut best_tau = search_start;
                    for tau in search_start..search_end {
                        if d_prime[tau] <= global_min + 1e-12 {
                            best_tau = tau;
                            break;
                        }
                    }
                    best_tau
                } else {
                    return (0.0, 0.0);
                }
            }
        };

        // Step 5: Parabolic interpolation for sub-sample accuracy
        let better_tau = if tau > search_start && tau + 1 < search_end {
            let s0 = d_prime[tau - 1];
            let s1 = d_prime[tau];
            let s2 = d_prime[tau + 1];
            let denom = 2.0 * (2.0 * s1 - s2 - s0);
            if denom.abs() > 1e-12 {
                let shift = (s2 - s0) / denom;
                // Clamp the shift to avoid wild extrapolation
                (tau as f64 + shift.clamp(-0.5, 0.5)).max(search_start as f64)
            } else {
                tau as f64
            }
        } else {
            tau as f64
        };

        let frequency = self.sample_rate / better_tau.max(1.0);
        let confidence = (1.0 - global_min).clamp(0.0, 1.0);

        // Human vocal range check (C2 ≈ 65 Hz to C6 ≈ 1047 Hz, with some margin)
        if frequency < 55.0 || frequency > 1400.0 {
            return (0.0, 0.0);
        }

        (frequency, confidence)
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
    fn detects_sine_frequency() {
        let sr = 22050.0;
        let freq = 261.63; // C4
        let buf = make_sine(freq, sr, 2048);
        let det = YinDetectorSr::new(0.15, 60.0, 1200.0, sr as u32);
        let (detected_freq, conf) = det.detect(&buf);
        assert!(
            (detected_freq - freq).abs() < 3.0,
            "expected ~{freq} Hz, got {detected_freq} Hz (conf={conf})"
        );
        assert!(conf > 0.5);
    }

    #[test]
    fn silence_returns_zero() {
        let sr = 22050.0;
        let buf = vec![0.0f64; 2048];
        let det = YinDetectorSr::new(0.15, 60.0, 1200.0, sr as u32);
        let (freq, conf) = det.detect(&buf);
        assert!(freq == 0.0);
        assert!(conf == 0.0);
    }

    #[test]
    fn detects_different_frequencies() {
        let sr = 44100.0;

        // Test a few frequencies across the vocal range
        let test_cases = [
            (130.81, "C3"),  // Low male
            (220.00, "A3"),  // Male
            (261.63, "C4"),  // Middle
            (440.00, "A4"),  // High male / low female
            (523.25, "C5"),  // Female
            (698.46, "F5"),  // High female
        ];

        let det = YinDetectorSr::new(0.15, 60.0, 1200.0, sr as u32);

        for (freq, name) in test_cases {
            let buf = make_sine(freq, sr, 2048);
            let (detected, _) = det.detect(&buf);
            assert!(
                (detected - freq).abs() < 5.0,
                "test {name}: expected ~{freq} Hz, got {detected} Hz"
            );
        }
    }
}
