use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleFormat, SampleRate, Stream, StreamConfig};
use rubato::{SincFixedIn, Resampler};
use symphonia::core::audio::SampleBuffer;
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
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
pub struct NativeAudioPlayer {
    state: Arc<Mutex<PlaybackState>>,
    stream: Option<Stream>,
    /// Callback invoked periodically with position updates (ms).
    on_time_update: Option<Box<dyn Fn(u64) + Send + 'static>>,
    /// Callback invoked when playback ends.
    on_ended: Option<Box<dyn Fn() + Send + 'static>>,
}

impl NativeAudioPlayer {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(PlaybackState::default())),
            stream: None,
            on_time_update: None,
            on_ended: None,
        }
    }

    /// Set the time-update callback.
    pub fn set_on_time_update<F>(&mut self, f: F)
    where
        F: Fn(u64) + Send + 'static,
    {
        self.on_time_update = Some(Box::new(f));
    }

    /// Set the ended callback.
    pub fn set_on_ended<F>(&mut self, f: F)
    where
        F: Fn() + Send + 'static,
    {
        self.on_ended = Some(Box::new(f));
    }

    /// Get a clone of the current state (for Tauri commands).
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
        let (device, host_name) = resolve_device(device_id)?;

        // Build the output config matching the device's preferred format
        let supported_config = device
            .default_output_config()
            .map_err(|e| format!("Cannot get device config: {}", e))?;

        let config: StreamConfig = supported_config.into();

        // Resample decoded audio to device sample rate if needed
        let resampled = resample_if_needed(
            decoded.samples,
            decoded.sample_rate,
            config.sample_rate.0,
            decoded.channels,
        );

        // Convert to the device's sample format
        let sample_format = supported_config.sample_format();
        let channels = config.channels;

        match sample_format {
            SampleFormat::F32 => self.build_stream::<f32>(&device, config, resampled, channels, decoded.duration_ms),
            SampleFormat::I16 => self.build_stream::<i16>(&device, config, resampled, channels, decoded.duration_ms),
            SampleFormat::U16 => self.build_stream::<u16>(&device, config, resampled, channels, decoded.duration_ms),
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
        T: cpal::Sample + cpal::SizedSample + 'static,
    {
        let sample_rate = config.sample_rate.0;
        let frame_size = channels as usize;
        let total_frames = samples.len() / frame_size;

        // Shared playback cursor
        let cursor = Arc::new(Mutex::new(0usize)); // frame index
        let cursor_clone = cursor.clone();

        let state = self.state.clone();
        let state_clone = state.clone();

        let on_time_update = self.on_time_update.take();
        let on_ended = self.on_ended.take();

        let samples = Arc::new(samples);

        let stream = device
            .build_output_stream(
                &config.into(),
                move |data: &mut [T], _: &cpal::OutputCallbackInfo| {
                    let mut state = state_clone.lock().unwrap();

                    // Handle stop
                    if state.stop_requested {
                        for s in data.iter_mut() {
                            *s = T::SILENCE;
                        }
                        return;
                    }

                    // Handle seek
                    if let Some(target_ms) = state.seek_request.take() {
                        let target_frame = (target_ms as f64 / 1000.0 * sample_rate as f64) as usize;
                        *cursor_clone.lock().unwrap() = target_frame.min(total_frames);
                        state.position_ms = target_ms;
                    }

                    // Handle pause
                    if !state.is_playing {
                        for s in data.iter_mut() {
                            *s = T::SILENCE;
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
                                *s = T::SILENCE;
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
                                *s = T::from::<f32>(&val);
                            } else {
                                *s = T::SILENCE;
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

        // Re-store callbacks (they were taken above)
        // We can't move them back into self since we need them in the closure.
        // Instead, spawn a position-update thread.
        let state_for_updates = self.state.clone();
        let on_ended_cb = on_ended;

        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(50));
                let state = state_for_updates.lock().unwrap();
                if !state.is_playing {
                    if state.position_ms >= state.duration_ms && state.duration_ms > 0 {
                        drop(state);
                        if let Some(ref cb) = on_ended_cb {
                            cb();
                        }
                        return;
                    }
                    if state.stop_requested {
                        return;
                    }
                }
                if state.stop_requested {
                    return;
                }
                drop(state);
            }
        });

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
// Helper functions
// ---------------------------------------------------------------------------

/// Decode an audio file using Symphonia. Returns interleaved f32 samples.
fn decode_audio_file(file_path: &str) -> Result<DecodedAudio, String> {
    let path = PathBuf::from(file_path);
    if !path.exists() {
        return Err(format!("Audio file not found: {}", file_path));
    }

    let file = File::open(&path).map_err(|e| format!("Cannot open file: {}", e))?;
    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);

    let mss = MediaSourceStream::new(BufReader::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let format_opts = FormatOptions::default();
    let metadata_opts = MetadataOptions::default();

    let mut format_reader = symphonia::default::get_probe()
        .format(&hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| format!("Unsupported format: {}", e))?;

    let default_track = format_reader
        .default_track()
        .ok_or("No default track in audio file")?;

    let track_id = default_track.id;
    let track = default_track;

    // Determine sample rate and channels from codec params
    let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
    let channels = track
        .codec_params
        .channels
        .map(|c| c.count())
        .unwrap_or(2) as u16;

    let decoder_opts = DecoderOptions::default();
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &decoder_opts)
        .map_err(|e| format!("No decoder available: {}", e))?;

    let mut all_samples: Vec<f32> = Vec::new();
    let mut decoded_frames = 0u64;

    loop {
        let packet = match format_reader.next_packet() {
            Ok(p) => p,
            Err(SymphoniaError::ResetRequired) => continue,
            Err(SymphoniaError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
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

        // Convert to f32
        let mut conv_buf: SampleBuffer<f32> = SampleBuffer::new(
            audio_buf.capacity() as u64,
            *audio_buf.spec(),
        );
        conv_buf.copy_interleaved_ref(&audio_buf);
        all_samples.extend_from_slice(conv_buf.samples());
        decoded_frames += audio_buf.frames();
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
fn resample_if_needed(samples: Vec<f32>, source_rate: u32, target_rate: u32, channels: u16) -> Vec<f32> {
    if source_rate == target_rate {
        return samples;
    }

    let chunk_size = 1024;
    let mut resampler = SincFixedIn::new(
        target_rate as f64 / source_rate as f64,
        2.0,
        chunk_size,
        channels as usize,
    )
    .expect("Failed to create resampler");

    let frames_in = samples.len() / channels as usize;
    let mut input = Vec::with_capacity(chunk_size * channels as usize);
    let mut output_samples = Vec::new();

    for frame_idx in 0..frames_in {
        for ch in 0..channels as usize {
            input.push(samples[frame_idx * channels as usize + ch]);
        }

        if input.len() == chunk_size * channels as usize {
            let resampled = resampler.process(&input, None).expect("Resampling failed");
            for chunk in resampled {
                for ch in 0..channels as usize {
                    output_samples.push(chunk[ch]);
                }
            }
            input.clear();
        }
    }

    // Process remaining samples
    if !input.is_empty() {
        let resampled = resampler.process(&input, None).expect("Resampling failed");
        for chunk in resampled {
            for ch in 0..channels as usize {
                output_samples.push(chunk[ch]);
            }
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
    let host_id = match host_name {
        "WASAPI" => cpal::HostId::Wasapi,
        "ASIO" => cpal::HostId::Asio,
        "DirectSound" | "Dsound" => cpal::HostId::Dsound,
        _ => {
            // Try default host as fallback
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
