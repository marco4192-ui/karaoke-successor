//! Main Audio Analyzer — orchestrates all three layers and BPM detection.
//!
//! Pipeline:
//!   1. Decode audio → mono f64 samples
//!   2. For each hop-sized frame:
//!      a. Layer 1: Voicing detection → confidence
//!      b. If voiced:
//!         - "yin": Layer 2 (YIN) → Layer 3 (Octave correction)
//!         - "crepe": CREPE deep-learning model
//!      c. Fuse confidences → overall score
//!   3. Merge consecutive voiced frames into notes
//!   4. Run BPM detection on the onset strength signal
//!   5. Return complete analysis result

use std::time::Instant;

use super::types::*;
use super::voicing::VoicingDetector;
use super::yin::YinDetectorSr;
use super::octave::OctaveCorrector;
use super::bpm::BpmDetector;
#[cfg(feature = "crepe")]
use super::crepe::CrepeDetector;

// ---------------------------------------------------------------------------
// AudioAnalyzer
// ---------------------------------------------------------------------------

pub struct AudioAnalyzer {
    options: AnalysisOptions,
}

impl AudioAnalyzer {
    pub fn new(options: AnalysisOptions) -> Self {
        Self { options }
    }

    /// Run the full analysis pipeline on decoded mono f64 samples.
    ///
    /// * `samples` — mono audio data (already decoded & resampled)
    /// * `sample_rate` — sample rate of the audio
    /// * `progress_callback` — optional callback for progress events
    ///
    /// Returns the complete `PitchAnalysisResult`.
    pub fn analyze<F>(
        &mut self,
        samples: &[f64],
        sample_rate: u32,
        progress_callback: Option<F>,
    ) -> PitchAnalysisResult
    where
        F: Fn(AnalysisProgress),
    {
        let start = Instant::now();
        let sr = sample_rate as f64;
        let total_duration_ms = (samples.len() as f64 / sr * 1000.0) as u64;

        let report = |stage: AnalysisStage, progress: f64, msg: &str, cb: &Option<F>| {
            if let Some(ref f) = cb {
                f(AnalysisProgress {
                    stage,
                    progress,
                    message: msg.to_string(),
                });
            }
        };

        // ---- Configuration ----
        let window_size = 2048;
        let hop_size = self.options.hop_size_override.unwrap_or(1024);
        let total_frames = (samples.len() - window_size) / hop_size;

        if total_frames == 0 {
            return PitchAnalysisResult {
                frames: vec![],
                notes: vec![],
                bpm: 120.0,
                algorithm: self.options.algorithm.clone(),
                analysis_duration_ms: 0,
                sample_rate,
                audio_duration_ms: total_duration_ms,
            };
        }

        // ---- Layer 1: Voicing Detector (always used) ----
        report(AnalysisStage::VoicingDetection, 5.0, "Initialisiere Voicing-Detektion...", &progress_callback);
        let voicing = VoicingDetector::new(self.options.voicing_threshold, window_size);

        // ---- Prepare algorithm-specific detectors ----
        report(AnalysisStage::PitchDetection, 10.0, "Initialisiere Pitch-Detektion...", &progress_callback);

        let use_crepe = self.options.algorithm == "crepe";

        // YIN detector (used for "yin" algorithm and as fallback)
        let yin = YinDetectorSr::new(
            self.options.yin_threshold,
            self.options.min_frequency,
            self.options.max_frequency,
            sample_rate,
        );

        // Octave corrector (only for YIN pipeline)
        let octave: Option<OctaveCorrector> = if self.options.enable_octave_correction && !use_crepe {
            Some(OctaveCorrector::new(4, window_size))
        } else {
            None
        };

        // CREPE detector (only for "crepe" algorithm)
        #[cfg(feature = "crepe")]
        let mut crepe: Option<CrepeDetector> = None;
        #[cfg(feature = "crepe")]
        if use_crepe {
            let mut detector = CrepeDetector::new();
            // Try to load the model from the provided path
            if let Some(ref model_path) = self.options.crepe_model_path {
                match detector.load_model(model_path) {
                    Ok(()) => {
                        report(AnalysisStage::PitchDetection, 12.0, "CREPE-Modell geladen — Hochpräzision aktiv!", &progress_callback);
                        crepe = Some(detector);
                    }
                    Err(e) => {
                        report(AnalysisStage::PitchDetection, 12.0, &format!("CREPE-Modell konnte nicht geladen werden: {}. Fallback auf YIN.", e), &progress_callback);
                    }
                }
            } else {
                report(AnalysisStage::PitchDetection, 12.0, "CREPE ausgewählt, aber kein Modellpfad angegeben. Fallback auf YIN.", &progress_callback);
            }
        }

        // ---- Frame-by-frame analysis ----
        let mut frames: Vec<AnalysisFrame> = Vec::with_capacity(total_frames);
        let analysis_end_progress = if use_crepe { 60.0 } else { 80.0 };

        for i in 0..total_frames {
            let start_sample = i * hop_size;
            let window: Vec<f64> = samples[start_sample..start_sample + window_size].to_vec();
            let time_ms = start_sample as f64 / sr * 1000.0;

            // Layer 1: Voicing (always first)
            let voicing_conf = voicing.detect(&window);

            let (frequency, midi_note, pitch_conf, overall_conf) = if voicing_conf < 0.3 {
                // Not voiced → silence / instrumental
                (None, None, 0.0, voicing_conf * 0.5)
            } else {
                // ---- Choose algorithm ----
                #[cfg(feature = "crepe")]
                let use_crepe_active = use_crepe && crepe.as_ref().map_or(false, |c| c.is_loaded());
                #[cfg(not(feature = "crepe"))]
                let use_crepe_active = false;

                if use_crepe_active {
                    // ---- CREPE pipeline ----
                    let crepe_det = crepe.as_mut().unwrap();
                    let (freq, conf) = crepe_det.detect(&window, sr);

                    if freq <= 0.0 || conf < 0.1 {
                        (None, None, 0.0, voicing_conf * 0.3)
                    } else {
                        let midi = frequency_to_midi(freq);
                        // CREPE confidence is already very reliable, weight it higher
                        let overall = voicing_conf * 0.20 + conf * 0.65 + 0.15;
                        (Some(freq), Some(midi), conf, overall)
                    }
                } else {
                    // ---- YIN pipeline (Layer 2 + Layer 3) ----
                    let (freq, conf) = yin.detect(&window);

                    if freq <= 0.0 || conf < 0.1 {
                        (None, None, 0.0, voicing_conf * 0.3)
                    } else {
                        // Layer 3: Octave correction — called ONCE per frame
                        let (corrected_freq, was_corrected) = if let Some(ref oct) = octave {
                            oct.correct(&window, freq, sr)
                        } else {
                            (freq, false)
                        };

                        let midi = frequency_to_midi(corrected_freq);

                        // Fuse confidences:
                        // - voicing (0.25) + pitch (0.50) + octave agreement (0.25)
                        let octave_bonus = if was_corrected { 0.7 } else { 0.9 };
                        let overall = voicing_conf * 0.25 + conf * 0.50 + octave_bonus * 0.25;

                        (Some(corrected_freq), Some(midi), conf, overall)
                    }
                }
            };

            frames.push(AnalysisFrame {
                time_ms,
                frequency,
                midi_note,
                voicing_confidence: voicing_conf,
                pitch_confidence: pitch_conf,
                overall_confidence: overall_conf,
            });

            // Report progress periodically
            if i % 100 == 0 {
                let prog = 10.0 + (i as f64 / total_frames as f64) * (analysis_end_progress - 10.0);
                report(AnalysisStage::PitchDetection, prog, &format!("Analysiere... {}%", i * 100 / total_frames), &progress_callback);
            }
        }

        // ---- BPM estimation ----
        report(AnalysisStage::BpmEstimation, 82.0, "Erkenne BPM...", &progress_callback);
        let bpm_det = BpmDetector::new(1024, 512, sample_rate);
        let bpm = bpm_det.detect(samples);

        // ---- Convert frames to notes ----
        report(AnalysisStage::NoteConversion, 90.0, "Erstelle Noten...", &progress_callback);
        let notes = Self::frames_to_notes(&frames, hop_size, sr);

        report(AnalysisStage::Complete, 100.0, "Analyse abgeschlossen!", &progress_callback);

        let elapsed = start.elapsed().as_millis() as u64;

        PitchAnalysisResult {
            frames,
            notes,
            bpm: bpm.round() as f64,
            algorithm: self.options.algorithm.clone(),
            analysis_duration_ms: elapsed,
            sample_rate,
            audio_duration_ms: total_duration_ms,
        }
    }

    // ---- Note conversion ----------------------------------------------------

    /// Merge consecutive voiced frames into discrete notes.
    fn frames_to_notes(frames: &[AnalysisFrame], hop_size: usize, sr: f64) -> Vec<DetectedNote> {
        let mut notes: Vec<DetectedNote> = Vec::new();
        let pitch_tolerance = 1.0; // semitones
        let min_note_duration_ms = 60.0;
        let confidence_threshold = 0.20;

        #[derive(Default)]
        struct NoteBuilder {
            start_time_ms: f64,
            pitch_sum: f64,
            freq_sum: f64,
            conf_sum: f64,
            count: usize,
        }

        let mut current: Option<NoteBuilder> = None;

        for frame in frames {
            let is_voiced = frame.frequency.is_some()
                && frame.midi_note.is_some()
                && frame.overall_confidence >= confidence_threshold;

            if !is_voiced {
                // End current note
                if let Some(builder) = current.take() {
                    let duration = frame.time_ms - builder.start_time_ms;
                    if duration >= min_note_duration_ms {
                        let avg_midi = (builder.pitch_sum / builder.count as f64).round() as i32;
                        let avg_freq = builder.freq_sum / builder.count as f64;
                        let avg_conf = builder.conf_sum / builder.count as f64;

                        notes.push(DetectedNote {
                            start_time_ms: builder.start_time_ms,
                            duration_ms: duration,
                            midi_note: avg_midi,
                            frequency: avg_freq,
                            confidence: avg_conf,
                            confidence_level: confidence_to_level(avg_conf),
                        });
                    }
                }
                continue;
            }

            let freq = frame.frequency.unwrap();
            let midi = frame.midi_note.unwrap();

            match &mut current {
                None => {
                    current = Some(NoteBuilder {
                        start_time_ms: frame.time_ms,
                        pitch_sum: midi as f64,
                        freq_sum: freq,
                        conf_sum: frame.overall_confidence,
                        count: 1,
                    });
                }
                Some(builder) => {
                    let avg_pitch = builder.pitch_sum / builder.count as f64;
                    let diff = (midi as f64 - avg_pitch).abs();

                    if diff <= pitch_tolerance {
                        // Continue the same note
                        builder.pitch_sum += midi as f64;
                        builder.freq_sum += freq;
                        builder.conf_sum += frame.overall_confidence;
                        builder.count += 1;
                    } else {
                        // Pitch changed — finalise current, start new
                        let duration = frame.time_ms - builder.start_time_ms;
                        if duration >= min_note_duration_ms {
                            let avg_midi = (builder.pitch_sum / builder.count as f64).round() as i32;
                            let avg_freq = builder.freq_sum / builder.count as f64;
                            let avg_conf = builder.conf_sum / builder.count as f64;

                            notes.push(DetectedNote {
                                start_time_ms: builder.start_time_ms,
                                duration_ms: duration,
                                midi_note: avg_midi,
                                frequency: avg_freq,
                                confidence: avg_conf,
                                confidence_level: confidence_to_level(avg_conf),
                            });
                        }

                        *builder = NoteBuilder {
                            start_time_ms: frame.time_ms,
                            pitch_sum: midi as f64,
                            freq_sum: freq,
                            conf_sum: frame.overall_confidence,
                            count: 1,
                        };
                    }
                }
            }
        }

        // Finalise the last note
        if let Some(builder) = current {
            let last_time = frames.last().map(|f| f.time_ms).unwrap_or(0.0);
            let duration = last_time - builder.start_time_ms + hop_size as f64 / sr * 1000.0;
            if duration >= min_note_duration_ms {
                let avg_midi = (builder.pitch_sum / builder.count as f64).round() as i32;
                let avg_freq = builder.freq_sum / builder.count as f64;
                let avg_conf = builder.conf_sum / builder.count as f64;

                notes.push(DetectedNote {
                    start_time_ms: builder.start_time_ms,
                    duration_ms: duration,
                    midi_note: avg_midi,
                    frequency: avg_freq,
                    confidence: avg_conf,
                    confidence_level: confidence_to_level(avg_conf),
                });
            }
        }

        notes
    }
}
