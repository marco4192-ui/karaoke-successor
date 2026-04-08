//! Main Audio Analyzer — orchestrates all three layers and BPM detection.
//!
//! Pipeline:
//!   1. Decode audio → mono f64 samples
//!   2. For each hop-sized frame:
//!      a. Layer 1: Voicing detection → confidence
//!      b. If voiced: Layer 2: YIN pitch estimation → (freq, conf)
//!      c. If enabled: Layer 3: Octave correction → corrected freq
//!      d. Fuse confidences → overall score
//!   3. Merge consecutive voiced frames into notes
//!   4. Run BPM detection on the onset strength signal
//!   5. Return complete analysis result

use std::time::Instant;

use super::types::*;
use super::voicing::VoicingDetector;
use super::yin::YinDetectorSr;
use super::octave::OctaveCorrector;
use super::bpm::BpmDetector;

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
        &self,
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

        // ---- Layer 1: Voicing Detector ----
        report(AnalysisStage::VoicingDetection, 5.0, "Initialisiere Voicing-Detektion...", &progress_callback);
        let voicing = VoicingDetector::new(self.options.voicing_threshold, window_size);

        // ---- Layer 2: YIN Pitch Detector ----
        report(AnalysisStage::PitchDetection, 10.0, "Initialisiere Pitch-Detektion...", &progress_callback);
        let yin = YinDetectorSr::new(
            self.options.yin_threshold,
            self.options.min_frequency,
            self.options.max_frequency,
            sample_rate,
        );

        // ---- Layer 3: Octave Corrector ----
        let octave: Option<OctaveCorrector> = if self.options.enable_octave_correction {
            Some(OctaveCorrector::new(4, window_size))
        } else {
            None
        };

        // ---- Frame-by-frame analysis ----
        let mut frames: Vec<AnalysisFrame> = Vec::with_capacity(total_frames);
        let analysis_end_progress = if self.options.algorithm == "crepe" { 60.0 } else { 80.0 };

        for i in 0..total_frames {
            let start_sample = i * hop_size;
            let window: Vec<f64> = samples[start_sample..start_sample + window_size].to_vec();
            let time_ms = start_sample as f64 / sr * 1000.0;

            // Layer 1: Voicing
            let voicing_conf = voicing.detect(&window);

            let (frequency, midi_note, pitch_conf, overall_conf) = if voicing_conf < 0.3 {
                // Not voiced → silence / instrumental
                (None, None, 0.0, voicing_conf * 0.5)
            } else {
                // Layer 2: YIN pitch
                let (freq, conf) = yin.detect(&window);

                if freq <= 0.0 || conf < 0.1 {
                    (None, None, 0.0, voicing_conf * 0.3)
                } else {
                    let corrected_freq = if let Some(ref oct) = octave {
                        let (cf, _was_corrected) = oct.correct(&window, freq, sr);
                        cf
                    } else {
                        freq
                    };

                    let midi = frequency_to_midi(corrected_freq);

                    // Fuse confidences:
                    // - voicing (weight 0.25) + pitch (weight 0.50) + octave bonus (weight 0.25)
                    let octave_bonus = if let Some(ref oct) = octave {
                        let (_cf, was_corrected) = oct.correct(&window, freq, sr);
                        if was_corrected { 0.7 } else { 0.9 }
                    } else {
                        0.85
                    };

                    let overall = voicing_conf * 0.25 + conf * 0.50 + octave_bonus * 0.25;

                    (Some(corrected_freq), Some(midi), conf, overall)
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
        let notes = self.frames_to_notes(&frames);

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
    fn frames_to_notes(&self, frames: &[AnalysisFrame]) -> Vec<DetectedNote> {
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
            let duration = last_time - builder.start_time_ms + 50.0;
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
