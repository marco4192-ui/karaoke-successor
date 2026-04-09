//! Layer CREPE — Deep-learning pitch detection.
//!
//! CREPE (Jongmin Woo et al., 2018) uses a tiny convolutional neural network
//! trained on human vocal pitch. It offers state-of-the-art accuracy at the
//! cost of higher CPU/GPU usage and an ~30 MB ONNX model file.
//!
//! This is a **default feature** — it is always compiled in and the ONNX Runtime
//! library is automatically downloaded at build time by the `ort` crate.
//!
//! At runtime, the user must provide a CREPE ONNX model file (crepe-tiny.onnx).
//! The model is loaded on demand when the "crepe" algorithm is selected.

// ---------------------------------------------------------------------------
// Stub implementation when `crepe` feature is disabled
// ---------------------------------------------------------------------------

#[cfg(not(feature = "crepe"))]
pub struct CrepeDetector {
    _private: (),
}

#[cfg(not(feature = "crepe"))]
impl CrepeDetector {
    pub fn new() -> Self {
        Self { _private: () }
    }

    /// Always returns (0.0, 0.0) — CREPE is not compiled in.
    pub fn detect(&mut self, _samples: &[f64], _sample_rate: f64) -> (f64, f64) {
        (0.0, 0.0)
    }

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
    "CREPE is not compiled in. Rebuild with default features (includes crepe)."
}

// ---------------------------------------------------------------------------
// Full implementation when `crepe` feature IS enabled (this is the default)
// ---------------------------------------------------------------------------

#[cfg(feature = "crepe")]
pub use crepe_impl::*;

#[cfg(feature = "crepe")]
mod crepe_impl {
    use std::path::Path;

    /// CREPE deep-learning pitch detector using ONNX Runtime.
    ///
    /// Model: "crepe-tiny" ONNX model.
    /// Input: 1024-sample window at 16 kHz (shape [1, 1024], f32).
    /// Output: 360 pitch-class bins (one per 20 cents, C1–B7).
    ///
    /// Usage:
    ///   1. Create with `CrepeDetector::new()`
    ///   2. Load model with `load_model(path)`
    ///   3. Call `detect(samples, sample_rate)` per frame
    pub struct CrepeDetector {
        session: Option<ort::session::Session>,
        loaded: bool,
        error_msg: Option<String>,
    }

    impl CrepeDetector {
        /// Create a new (unloaded) CREPE detector.
        pub fn new() -> Self {
            Self {
                session: None,
                loaded: false,
                error_msg: None,
            }
        }

        /// Load the CREPE ONNX model from a file path.
        pub fn load_model(&mut self, model_path: &str) -> Result<(), String> {
            let path = Path::new(model_path);
            if !path.exists() {
                let err = format!("CREPE model file not found: {}", model_path);
                self.error_msg = Some(err.clone());
                return Err(err);
            }

            // ort 2.x: Session::builder() returns Result<SessionBuilder>
            let mut builder = ort::session::Session::builder()
                .map_err(|e| format!("ONNX Runtime init failed: {}", e))?;

            let session = builder
                .commit_from_file(path)
                .map_err(|e| format!("Failed to load CREPE model: {}", e))?;

            self.session = Some(session);
            self.loaded = true;
            self.error_msg = None;
            println!("[crepe] Model loaded from: {}", model_path);
            Ok(())
        }

        /// Run CREPE inference on a 1024-sample window at 16 kHz.
        ///
        /// Returns `(frequency_hz, confidence)`.
        /// Returns `(0.0, 0.0)` if the model is not loaded, the window is
        /// wrong-sized, or no pitch is detected.
        ///
        /// **Important:** Takes `&mut self` because ONNX Runtime sessions
        /// are not thread-safe (ort 2.x requirement).
        pub fn detect(&mut self, samples: &[f64], _sample_rate: f64) -> (f64, f64) {
            let session = match &mut self.session {
                Some(s) => s,
                None => return (0.0, 0.0),
            };

            // CREPE expects exactly 1024 samples per frame
            if samples.len() != 1024 {
                return (0.0, 0.0);
            }

            // Build input array [1, 1024] of f32
            let input_array: ndarray::Array2<f32> =
                ndarray::Array2::from_shape_vec((1, 1024), samples.iter().map(|&s| s as f32).collect())
                    .unwrap_or_else(|_| ndarray::Array2::zeros((1, 1024)));

            // Create a TensorRef from the ndarray view (ort 2.x API)
            let input_ref = match ort::value::TensorRef::from_array_view(&input_array) {
                Ok(r) => r,
                Err(e) => {
                    eprintln!("[crepe] Failed to create input tensor: {}", e);
                    return (0.0, 0.0);
                }
            };

            // Run inference — session.run() needs &mut self in ort 2.x
            let outputs = match session.run(ort::inputs![input_ref]) {
                Ok(o) => o,
                Err(e) => {
                    eprintln!("[crepe] Inference failed: {}", e);
                    return (0.0, 0.0);
                }
            };

            // Get the first output (pitch probabilities)
            if outputs.len() == 0 {
                return (0.0, 0.0);
            }

            let output = &outputs[0];

            // Extract tensor data — try_extract_tensor returns Result<(&Shape, &[T])>
            let (shape, data) = match output.try_extract_tensor::<f32>() {
                Ok(result) => result,
                Err(_) => return (0.0, 0.0),
            };

            // Verify output shape is [1, 360]
            let total_elements = shape.num_elements();
            if total_elements < 360 {
                return (0.0, 0.0);
            }

            // Find argmax — the cent bin with the highest probability
            let mut best_bin: usize = 0;
            let mut best_prob: f32 = 0.0;

            for (i, &p) in data.iter().enumerate().take(360) {
                if p > best_prob {
                    best_prob = p;
                    best_bin = i;
                }
            }

            // Convert cent bin to frequency:
            //   CREPE bins: bin 0 = 32.70 Hz (C1), bin 359 = 1975.53 Hz (B7)
            //   Each bin = 20 cents = 1/60 of an octave
            let frequency = 32.70 * (2.0_f64).powf(best_bin as f64 / 60.0);
            let confidence = best_prob as f64;

            // Human vocal range filter (C2 ≈ 65 Hz to C6 ≈ 1047 Hz, with margin)
            if frequency < 55.0 || frequency > 1400.0 || confidence < 0.1 {
                return (0.0, 0.0);
            }

            (frequency, confidence)
        }

        /// Returns true if the CREPE model is loaded and ready.
        pub fn is_loaded(&self) -> bool {
            self.loaded
        }

        /// Returns the last error message, if any.
        pub fn error_message(&self) -> Option<&str> {
            self.error_msg.as_deref()
        }
    }

    /// Check whether the CREPE feature is compiled in (always true with default features).
    pub fn is_crepe_available() -> bool {
        true
    }

    /// Return info about the CREPE model requirements.
    pub fn crepe_model_info() -> &'static str {
        "CREPE is compiled in. Provide a CREPE ONNX model file (crepe-tiny.onnx) to enable high-accuracy mode."
    }
}
