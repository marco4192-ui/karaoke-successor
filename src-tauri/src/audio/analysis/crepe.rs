//! Layer CREPE — Deep-learning pitch detection (optional, behind `crepe` feature).
//!
//! CREPE (Jongmin Woo et al., 2018) uses a tiny convolutional neural network
//! trained on human vocal pitch. It offers state-of-the-art accuracy at the
//! cost of higher CPU/GPU usage and an ~30 MB ONNX model file.
//!
//! When the `crepe` feature is NOT enabled, this module exports only stubs
//! so the rest of the codebase compiles without ort/ndarray.

// ---------------------------------------------------------------------------
// Stubs when the `crepe` feature is not enabled
// ---------------------------------------------------------------------------

#[cfg(not(feature = "crepe"))]
pub struct CrepeDetector {
    _private: (),
}

#[cfg(not(feature = "crepe"))]
impl CrepeDetector {
    pub fn new() -> Self {
        println!("[crepe] Feature not enabled — CREPE detection unavailable. Use 'yin' algorithm.");
        Self { _private: () }
    }

    /// Always returns (0.0, 0.0) — CREPE is not available.
    pub fn detect(&self, _samples: &[f64], _sample_rate: f64) -> (f64, f64) {
        (0.0, 0.0)
    }

    /// Returns false — CREPE model is not loaded.
    pub fn is_loaded(&self) -> bool {
        false
    }
}

#[cfg(not(feature = "crepe"))]
pub fn is_crepe_available() -> bool {
    false
}

#[cfg(not(feature = "crepe"))]
pub fn crepe_model_info() -> &'static str {
    "CREPE is not compiled in. Rebuild with: cargo build --features crepe"
}

// ---------------------------------------------------------------------------
// Full implementation when `crepe` feature IS enabled
// ---------------------------------------------------------------------------

#[cfg(feature = "crepe")]
pub use crepe_impl::*;

#[cfg(feature = "crepe")]
mod crepe_impl {
    use std::path::Path;

    /// CREPE deep-learning pitch detector using ONNX Runtime.
    ///
    /// Model: "crepe-tiny" or "crepe-full" ONNX model.
    /// Input: 1024-sample window at 16 kHz.
    /// Output: 360 bins (one per cent between C1 and B7), each with a voiced probability.
    pub struct CrepeDetector {
        session: Option<ort::Session>,
        loaded: bool,
        error_msg: Option<String>,
    }

    impl CrepeDetector {
        /// Try to load a CREPE ONNX model from the given file path.
        pub fn new() -> Self {
            Self {
                session: None,
                loaded: false,
                error_msg: None,
            }
        }

        /// Load the CREPE model from a file path.
        pub fn load_model(&mut self, model_path: &str) -> Result<(), String> {
            let path = Path::new(model_path);
            if !path.exists() {
                let err = format!("CREPE model file not found: {}", model_path);
                self.error_msg = Some(err.clone());
                return Err(err);
            }

            match ort::Session::builder()
                .map_err(|e| format!("ONNX Runtime init failed: {}", e))?
                .commit_from_file(path)
            {
                Ok(session) => {
                    self.session = Some(session);
                    self.loaded = true;
                    self.error_msg = None;
                    println!("[crepe] Model loaded successfully from: {}", model_path);
                    Ok(())
                }
                Err(e) => {
                    let err = format!("Failed to load CREPE model: {}", e);
                    self.error_msg = Some(err.clone());
                    Err(err)
                }
            }
        }

        /// Run CREPE inference on a 1024-sample window at 16 kHz.
        ///
        /// Returns (frequency_hz, confidence).
        pub fn detect(&self, samples: &[f64], _sample_rate: f64) -> (f64, f64) {
            let session = match &self.session {
                Some(s) => s,
                None => return (0.0, 0.0),
            };

            if samples.len() != 1024 {
                return (0.0, 0.0);
            }

            // CREPE expects input shape [1, 1024] of f32
            let input_array: ndarray::Array2<f32> =
                ndarray::Array2::from_shape_vec((1, 1024), samples.iter().map(|&s| s as f32).collect())
                    .unwrap_or_else(|_| ndarray::Array2::zeros((1, 1024)));

            let input_tensor = ort::Value::from_array(session.allocator(), &input_array.into_dyn())
                .unwrap_or_else(|e| {
                    eprintln!("[crepe] Failed to create input tensor: {}", e);
                    // Return a dummy tensor — the run will fail and we catch it
                    ort::Value::from_array(session.allocator(), &ndarray::Array2::zeros((1, 1)).into_dyn()).unwrap()
                });

            let outputs = match session.run(ort::inputs![input_tensor].unwrap()) {
                Ok(o) => o,
                Err(e) => {
                    eprintln!("[crepe] Inference failed: {}", e);
                    return (0.0, 0.0);
                }
            };

            // CREPE output: [1, 360] — pitch bins (cents 0-359) + activation
            // First output = pitch probabilities, second = voiced activation
            let pitch_probs = match outputs.get("output") {
                Some(v) => v,
                None => match outputs.first() {
                    Some(v) => v,
                    None => return (0.0, 0.0),
                },
            };

            // Extract the pitch probabilities and find the argmax
            if let Ok(probs) = pitch_probs.try_extract_tensor::<f32>() {
                let shape = probs.shape();
                if shape.len() >= 2 && shape[1] == 360 {
                    let probabilities = probs.as_slice().unwrap();

                    // Find argmax (the cent bin with highest probability)
                    let mut best_bin = 0usize;
                    let mut best_prob = 0.0f32;

                    for (i, &p) in probabilities.iter().enumerate().take(360) {
                        if p > best_prob {
                            best_prob = p;
                            best_bin = i;
                        }
                    }

                    // Convert cent bin to frequency
                    // CREPE bins: bin 0 = 32.70 Hz (C1), bin 359 = 1975.53 Hz (B7)
                    // Each bin = 20 cents = 20/1200 = 1/60 of an octave
                    let frequency = 32.70 * (2.0_f64).powf(best_bin as f64 / 60.0);
                    let confidence = best_prob as f64;

                    // Check vocal range
                    if frequency < 55.0 || frequency > 1400.0 || confidence < 0.1 {
                        return (0.0, 0.0);
                    }

                    return (frequency, confidence);
                }
            }

            (0.0, 0.0)
        }

        pub fn is_loaded(&self) -> bool {
            self.loaded
        }

        pub fn error_message(&self) -> Option<&str> {
            self.error_msg.as_deref()
        }
    }

    /// Check whether the CREPE feature is compiled in.
    pub fn is_crepe_available() -> bool {
        true
    }

    /// Return info about the CREPE model requirements.
    pub fn crepe_model_info() -> &'static str {
        "CREPE is compiled in. Provide a CREPE ONNX model file (crepe-tiny.onnx) via the analysis command."
    }
}
