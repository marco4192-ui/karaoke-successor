use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};

/// Serializable representation of an audio output device.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    /// Unique identifier: "<host_id>:<device_index>"
    pub id: String,
    /// Human-readable device name.
    pub name: String,
    /// Which backend hosts this device (e.g. "ASIO", "WASAPI").
    pub host_name: String,
    /// Default sample rate in Hz.
    pub default_sample_rate: u32,
    /// Maximum output channels.
    pub max_channels: u16,
}

/// List all available output devices across all hosts.
pub fn list_output_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    let mut result = Vec::new();

    let available_hosts = cpal::available_hosts();
    println!("Available audio hosts: {:?}", available_hosts);

    for host_id in available_hosts {
        let host_name = format!("{:?}", host_id);

        let host = match cpal::host_from_id(host_id) {
            Ok(h) => h,
            Err(e) => {
                println!("Skipping host {:?}: {}", host_id, e);
                continue;
            }
        };

        let devices = match host.output_devices() {
            Ok(d) => d,
            Err(e) => {
                println!("Cannot list devices for {:?}: {}", host_id, e);
                continue;
            }
        };

        for (idx, device) in devices.enumerate() {
            let name = match device.name() {
                Ok(n) => n,
                Err(_) => format!("Unknown Device {}", idx),
            };

            let default_config = match device.default_output_config() {
                Ok(c) => c,
                Err(_) => continue, // skip devices we can't query
            };

            result.push(AudioDeviceInfo {
                id: format!("{}:{}", host_name, idx),
                name,
                host_name: host_name.clone(),
                default_sample_rate: default_config.sample_rate().0,
                max_channels: default_config.channels(),
            });
        }
    }

    Ok(result)
}

/// Get the default output device.
pub fn get_default_device() -> Result<AudioDeviceInfo, String> {
    let host = cpal::default_host();
    let device = host
        .default_output_device()
        .ok_or("No default output device available")?;
    let name = device.name().unwrap_or_default();
    let config = device.default_output_config().map_err(|e| e.to_string())?;

    Ok(AudioDeviceInfo {
        id: "default".to_string(),
        name,
        host_name: format!("{:?}", cpal::default_host().id()),
        default_sample_rate: config.sample_rate().0,
        max_channels: config.channels(),
    })
}
