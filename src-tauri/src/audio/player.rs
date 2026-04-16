use std::fs::File;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, Stream, StreamConfig};
use rubato::{
    Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::DecoderOptions;
use symphonia::core::errors::Error as SymphoniaError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

/// Shared playback state, safe to access from multiple threads.
#[derive(Debug)]
pub struct PlaybackState {
    /// Current position in milliseconds.
    pub position_ms: u64,
    /// Total duration in milliseconds.
    pub duration_ms: u64,
    /// Whether the track is currently playing.
    pub is_playing: bool,
    /// Volume 0.0 .. 1.0.
    pub volume: f32,
    /// Seek request: Some(target_ms) means seek to that position.
    pub seek_request: Option<u64>,
    /// Whether a stop was requested.
    pub stop_requested: bool,
}

impl Default for PlaybackState {
    fn default() -> Self {
        Self {
            position_ms: 0,
            duration_ms: 0,
            is_playing: false,
            volume: 1.0,
            seek_request: None,
            stop_requested: false,
        }
    }
}

/// Decoded audio ready for playback.
struct DecodedAudio {
    /// Interleaved f32 samples.
    samples: Vec<f32>,
    /// Sample rate of the decoded audio.
    sample_rate: u32,
    /// Number of channels.
    channels: u16,
    /// Duration in milliseconds.
    duration_ms: u64,
}

/// The native audio player.
/// NOTE: This type is intentionally !Send because cpal::Stream is !Send on some platforms.
/// It must live exclusively on a single dedicated audio thread.
pub struct NativeAudioPlayer {
    state: Arc<Mutex<PlaybackState>>,
    stream: Option<Stream>,
}

impl NativeAudioPlayer {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(PlaybackState::default())),
            stream: None,
        }
    }

    /// Create a player that shares state with an external Arc (used by the audio thread).
    pub fn with_shared_state(state: Arc<Mutex<PlaybackState>>) -> Self {
        Self {
            state,
            stream: None,
        }
    }

    /// Get a clone of the shared state Arc.
    pub fn state_arc(&self) -> Arc<Mutex<PlaybackState>> {
        self.state.clone()
    }

    /// Get a lock on the current state (for Tauri commands).
    pub fn state(&self) -> std::sync::MutexGuard<'_, PlaybackState> {
        self.state.lock().unwrap()
    }

    /// Load an audio file, create an output stream on the given host/device,
    /// and start playback.  `device_id` is "<host_name>:<device_index>".
    pub fn play_file(&mut self, file_path: &str, device_id: &str) -> Result<(), String> {
        // Stop any previous playback
        self.stop();

        // Decode the audio file
        let decoded = decode_audio_file(file_path)?;

        // Update state
        {
            let mut state = self.state.lock().unwrap();
            state.duration_ms = decoded.duration_ms;
            state.position_ms = 0;
            state.is_playing = true;
            state.stop_requested = false;
            state.seek_request = None;
        }

        // Resolve the output device
        let (device, _host_name) = resolve_device(device_id)?;

        // Build the output config matching the device's preferred format
        let supported_config = device
            .default_output_config()
            .map_err(|e| format!("Cannot get device config: {}", e))?;

        // Extract sample_format BEFORE consuming supported_config via .into()
        let sample_format = supported_config.sample_format();
        let config: StreamConfig = supported_config.into();

        // Resample decoded audio to device sample rate if needed
        let resampled = resample_if_needed(
            decoded.samples,
            decoded.sample_rate,
            config.sample_rate.0,
            decoded.channels,
        );

        let channels = config.channels;

        match sample_format {
            SampleFormat::F32 => {
                self.build_stream::<f32>(&device, config, resampled, channels, decoded.duration_ms)?;
            }
            SampleFormat::I16 => {
                self.build_stream::<i16>(&device, config, resampled, channels, decoded.duration_ms)?;
            }
            SampleFormat::U16 => {
                self.build_stream::<u16>(&device, config, resampled, channels, decoded.duration_ms)?;
            }
            _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
        }

        Ok(())
    }

    /// Build the audio output stream for a specific sample type.
    fn build_stream<T>(
        &mut self,
        device: &cpal::Device,
        config: StreamConfig,
        samples: Vec<f32>,
        channels: u16,
        duration_ms: u64,
    ) -> Result<(), String>
    where
        T: cpal::Sample + cpal::SizedSample + Default + cpal::FromSample<f32> + 'static,
    {
        let sample_rate = config.sample_rate.0;
        let frame_size = channels as usize;
        let total_frames = samples.len() / frame_size;

        // Shared playback cursor
        let cursor = Arc::new(Mutex::new(0usize)); // frame index
        let cursor_clone = cursor.clone();

        let state = self.state.clone();
        let state_clone = state.clone();

        let samples = Arc::new(samples);

        let stream = device
            .build_output_stream(
                &config.into(),
                move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
                    let mut state = state_clone.lock().unwrap();

                    // Handle stop
                    if state.stop_requested {
                        for s in data.iter_mut() {
                            *s = T::default();
                        }
                        return;
                    }

                    // Handle seek
                    if let Some(target_ms) = state.seek_request.take() {
                        let target_frame =
                            (target_ms as f64 / 1000.0 * sample_rate as f64) as usize;
                        *cursor_clone.lock().unwrap() = target_frame.min(total_frames);
                        state.position_ms = target_ms;
                    }

                    // Handle pause
                    if !state.is_playing {
                        for s in data.iter_mut() {
                            *s = T::default();
                        }
                        return;
                    }

                    let mut cursor = cursor_clone.lock().unwrap();
                    let volume = state.volume;

                    let src = &*samples;
                    for frame in data.chunks_mut(frame_size) {
                        if *cursor >= total_frames {
                            // Fill silence and signal end
                            for s in frame.iter_mut() {
                                *s = T::default();
                            }
                            state.is_playing = false;
                            state.position_ms = duration_ms;
                            return;
                        }

                        let start = *cursor * frame_size;
                        for (i, s) in frame.iter_mut().enumerate() {
                            let src_idx = start + i;
                            if src_idx < src.len() {
                                let val = src[src_idx] * volume;
                                *s = sample_to::<T>(val);
                            } else {
                                *s = T::default();
                            }
                        }

                        *cursor += 1;
                    }

                    // Update position
                    let elapsed_frames = *cursor;
                    state.position_ms = (elapsed_frames as f64 / sample_rate as f64 * 1000.0) as u64;
                },
                |err| {
                    eprintln!("Audio stream error: {}", err);
                },
                None,
            )
            .map_err(|e| format!("Failed to build output stream: {}", e))?;

        stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;

        // Store stream to keep it alive
        self.stream = Some(stream);

        Ok(())
    }

    /// Pause playback (stream continues but outputs silence).
    pub fn pause(&self) {
        let mut state = self.state.lock().unwrap();
        state.is_playing = false;
    }

    /// Resume playback.
    pub fn resume(&self) {
        let mut state = self.state.lock().unwrap();
        state.is_playing = true;
    }

    /// Seek to a position in milliseconds.
    pub fn seek(&self, position_ms: u64) {
        let mut state = self.state.lock().unwrap();
        state.seek_request = Some(position_ms);
    }

    /// Set volume (0.0 – 1.0).
    pub fn set_volume(&self, volume: f32) {
        let mut state = self.state.lock().unwrap();
        state.volume = volume.max(0.0).min(1.0);
    }

    /// Stop playback and clean up.
    pub fn stop(&mut self) {
        {
            let mut state = self.state.lock().unwrap();
            state.stop_requested = true;
            state.is_playing = false;
        }
        // Drop the stream to stop it
        self.stream = None;
        // Reset state
        let mut state = self.state.lock().unwrap();
        state.position_ms = 0;
        state.stop_requested = false;
        state.seek_request = None;
    }

    /// Get current position in ms.
    pub fn get_position_ms(&self) -> u64 {
        self.state.lock().unwrap().position_ms
    }
}

impl Drop for NativeAudioPlayer {
    fn drop(&mut self) {
        self.stop();
    }
}

// ---------------------------------------------------------------------------
// Sample conversion helpers
// ---------------------------------------------------------------------------

/// Convert an f32 sample to the target sample type T.
/// Uses cpal::FromSample (re-exported from dasp_sample) which all cpal sample types implement.
fn sample_to<T: cpal::SizedSample + cpal::FromSample<f32>>(val: f32) -> T {
    T::from_sample(val)
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/// Decode an audio file using Symphonia. Returns interleaved f32 samples.
pub(crate) fn decode_audio_file(file_path: &str) -> Result<DecodedAudio, String> {
    let path = PathBuf::from(file_path);
    if !path.exists() {
        return Err(format!("Audio file not found: {}", file_path));
    }

    let file = File::open(&path).map_err(|e| format!("Cannot open file: {}", e))?;
    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);

    // symphonia 0.5 expects Box<dyn MediaSource>; std::fs::File implements MediaSource.
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let format_opts = FormatOptions::default();
    let metadata_opts = MetadataOptions::default();

    // get_probe().format() returns a ProbeResult.
    // The actual format reader is stored in the `.format` field.
    let probe_result = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| format!("Unsupported format: {}", e))?;

    let mut format_reader = probe_result.format;

    // Find a decodable audio track.
    // For audio files the default track is fine; for video containers (MP4, MKV)
    // the default track may be video, so we fall back to searching all tracks.
    let decoder_opts = DecoderOptions::default();
    let codecs = symphonia::default::get_codecs();

    let (track_id, mut decoder, sample_rate, channels) = {
        let mut found: Option<(u32, Box<dyn symphonia::core::codecs::Decoder>, u32, u16)> = None;

        // 1) Try the default track
        if let Some(default) = format_reader.default_track() {
            if let Ok(dec) = codecs.make(&default.codec_params, &decoder_opts) {
                let sr = default.codec_params.sample_rate.unwrap_or(44100);
                let ch = default.codec_params.channels.map(|c| c.count() as u16).unwrap_or(2);
                found = Some((default.id, dec, sr, ch));
            }
        }

        // 2) If the default track couldn't be decoded, search all tracks
        if found.is_none() {
            for track in format_reader.tracks().iter() {
                // Audio tracks have at least a sample rate or channels set
                if track.codec_params.sample_rate.is_none()
                    && track.codec_params.channels.is_none()
                {
                    continue;
                }
                if let Ok(dec) = codecs.make(&track.codec_params, &decoder_opts) {
                    let sr = track.codec_params.sample_rate.unwrap_or(44100);
                    let ch = track.codec_params.channels.map(|c| c.count() as u16).unwrap_or(2);
                    found = Some((track.id, dec, sr, ch));
                    break;
                }
            }
        }

        found.ok_or_else(|| {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("?");
            format!(
                "No decodable audio track found in file (format: {})",
                ext
            )
        })?
    };

    let mut all_samples: Vec<f32> = Vec::new();
    let mut decoded_frames: u64 = 0;

    loop {
        let packet = match format_reader.next_packet() {
            Ok(p) => p,
            Err(SymphoniaError::ResetRequired) => continue,
            Err(SymphoniaError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => {
                break
            }
            Err(e) => return Err(format!("Error reading packet: {}", e)),
        };

        if packet.track_id() != track_id {
            continue;
        }

        let audio_buf = match decoder.decode(&packet) {
            Ok(buf) => buf,
            Err(SymphoniaError::DecodeError(_)) => continue,
            Err(e) => return Err(format!("Decode error: {}", e)),
        };

        // Extract info BEFORE moving audio_buf into copy_interleaved_ref
        let buf_frames: u64 = audio_buf.frames() as u64;
        let buf_capacity: u64 = audio_buf.capacity() as u64;
        let buf_spec = *audio_buf.spec();

        // Convert to interleaved f32 (audio_buf is consumed here)
        let mut conv_buf: SampleBuffer<f32> = SampleBuffer::new(buf_capacity, buf_spec);
        conv_buf.copy_interleaved_ref(audio_buf);
        all_samples.extend_from_slice(conv_buf.samples());
        decoded_frames += buf_frames;
    }

    if all_samples.is_empty() {
        return Err("No audio data decoded".to_string());
    }

    let duration_ms = if decoded_frames > 0 && sample_rate > 0 {
        (decoded_frames * 1000) / sample_rate as u64
    } else {
        // Estimate from file size (rough fallback for formats without duration)
        ((file_size as f64 / (sample_rate as f64 * channels as f64 * 4.0)) * 1000.0) as u64
    };

    Ok(DecodedAudio {
        samples: all_samples,
        sample_rate,
        channels,
        duration_ms,
    })
}

/// Resample interleaved f32 samples if the source rate differs from the target rate.
fn resample_if_needed(
    samples: Vec<f32>,
    source_rate: u32,
    target_rate: u32,
    channels: u16,
) -> Vec<f32> {
    if source_rate == target_rate {
        return samples;
    }

    let channels = channels as usize;
    let chunk_size = 1024;

    let sinc_params = SincInterpolationParameters {
        sinc_len: 128,
        f_cutoff: 0.95,
        oversampling_factor: 64,
        interpolation: SincInterpolationType::Linear,
        window: WindowFunction::Hann,
    };

    let mut resampler = SincFixedIn::new(
        target_rate as f64 / source_rate as f64,
        0.95,       // f_cutoff (normalized, must be <= 1.0)
        sinc_params, // SincInterpolationParameters
        channels,    // number of channels
        chunk_size,  // processing chunk size
    )
    .expect("Failed to create resampler");

    let frames_in = samples.len() / channels;

    // rubato works with deinterleaved data: Vec<Vec<f32>> where each inner Vec is one channel
    let mut deinterleaved: Vec<Vec<f32>> = vec![Vec::with_capacity(chunk_size); channels];
    let mut output_samples: Vec<f32> = Vec::new();

    for frame_idx in 0..frames_in {
        for ch in 0..channels {
            deinterleaved[ch].push(samples[frame_idx * channels + ch]);
        }

        if deinterleaved[0].len() == chunk_size {
            match resampler.process(&deinterleaved, None) {
                Ok(resampled) => {
                    // Reinterleave: resampled is Vec<Vec<f64>> (channels × frames)
                    let num_out = if resampled.is_empty() {
                        0
                    } else {
                        resampled[0].len()
                    };
                    for f in 0..num_out {
                        for ch in 0..channels {
                            output_samples.push(resampled[ch][f] as f32);
                        }
                    }
                }
                Err(e) => eprintln!("Resampling error: {}", e),
            }
            for ch in &mut deinterleaved {
                ch.clear();
            }
        }
    }

    // Process remaining samples
    if !deinterleaved[0].is_empty() {
        match resampler.process(&deinterleaved, None) {
            Ok(resampled) => {
                let num_out = if resampled.is_empty() {
                    0
                } else {
                    resampled[0].len()
                };
                for f in 0..num_out {
                    for ch in 0..channels {
                        output_samples.push(resampled[ch][f] as f32);
                    }
                }
            }
            Err(e) => eprintln!("Resampling error: {}", e),
        }
    }

    output_samples
}

/// Resolve a device_id string ("<host_name>:<index>") to a cpal::Device.
fn resolve_device(device_id: &str) -> Result<(cpal::Device, String), String> {
    if device_id == "default" {
        let host = cpal::default_host();
        let device = host
            .default_output_device()
            .ok_or("No default output device")?;
        return Ok((device, format!("{:?}", host.id())));
    }

    let parts: Vec<&str> = device_id.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid device_id format: {}", device_id));
    }

    let host_name = parts[0];
    let device_index: usize = parts[1].parse().map_err(|_| "Invalid device index")?;

    // Map host name to HostId
    // NOTE: WASAPI only exists on Windows. ASIO requires the "asio" feature on cpal.
    // On non-Windows or when the feature is missing, requests fall back to the default device.
    let host_id = match host_name {
        // WASAPI is only available on Windows.
        #[cfg(target_os = "windows")]
        "WASAPI" => cpal::HostId::Wasapi,
        // On non-Windows platforms, WASAPI requests fall through to the default device.
        #[cfg(not(target_os = "windows"))]
        "WASAPI" => {
            return resolve_device("default");
        }
        // ASIO requires the "asio" feature on cpal (not enabled by default).
        // Without it, ASIO requests fall through to the default device.
        #[allow(unused)]
        "ASIO" => {
            #[cfg(feature = "asio")]
            {
                cpal::HostId::Asio
            }
            #[cfg(not(feature = "asio"))]
            {
                return resolve_device("default");
            }
        }
        _ => {
            // Unknown or unavailable host – fall back to the system default device.
            let host = cpal::default_host();
            let device = host
                .default_output_device()
                .ok_or("No default output device")?;
            return Ok((device, format!("{:?}", host.id())));
        }
    };

    let host = cpal::host_from_id(host_id)
        .map_err(|e| format!("Cannot create host {:?}: {}", host_id, e))?;

    let device = host
        .output_devices()
        .map_err(|e| format!("Cannot list devices: {}", e))?
        .nth(device_index)
        .ok_or(format!("Device index {} not found", device_index))?;

    Ok((device, host_name.to_string()))
}

// ---------------------------------------------------------------------------
// Public helper: decode audio file to mono f64 samples (for analysis)
// ---------------------------------------------------------------------------

/// Result of decoding an audio file for analysis purposes.
pub struct DecodedMonoAudio {
    /// Mono f64 samples.
    pub samples: Vec<f64>,
    /// Sample rate.
    pub sample_rate: u32,
    /// Duration in milliseconds.
    pub duration_ms: u64,
}

/// Decode an audio file and return mono f64 samples (for the analysis pipeline).
/// If the source is stereo, channels are mixed down to mono.
pub fn decode_mono_f64(file_path: &str) -> Result<DecodedMonoAudio, String> {
    let decoded = decode_audio_file(file_path)?;
    let channels = decoded.channels as usize;

    let mono: Vec<f64> = if channels == 1 {
        decoded.samples.iter().map(|&s| s as f64).collect()
    } else {
        let frames = decoded.samples.len() / channels;
        let mut mono = Vec::with_capacity(frames);
        for i in 0..frames {
            let mut sum = 0.0f32;
            for ch in 0..channels {
                let idx = i * channels + ch;
                if idx < decoded.samples.len() {
                    sum += decoded.samples[idx];
                }
            }
            mono.push((sum / channels as f32) as f64);
        }
        mono
    };

    Ok(DecodedMonoAudio {
        samples: mono,
        sample_rate: decoded.sample_rate,
        duration_ms: decoded.duration_ms,
    })
}
