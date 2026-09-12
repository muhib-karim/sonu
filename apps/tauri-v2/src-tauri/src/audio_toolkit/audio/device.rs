use cpal::traits::{DeviceTrait, HostTrait};
use cpal::Device;

pub struct CpalDeviceInfo {
    pub index: String,
    pub name: String,
    pub is_default: bool,
    pub device: cpal::Device,
}

/// Enumerate either input or output devices, marking whichever matches the host's
/// default.
fn list_devices<D>(
    devices: impl IntoIterator<Item = Device>,
    default: Option<D>,
) -> Vec<CpalDeviceInfo>
where
    D: DeviceTrait,
{
    let default_name = default.and_then(|d| d.name().ok());

    devices
        .into_iter()
        .enumerate()
        .map(|(index, device)| {
            let name = device.name().unwrap_or_else(|_| "Unknown".into());
            CpalDeviceInfo {
                is_default: Some(name.clone()) == default_name,
                index: index.to_string(),
                name,
                device,
            }
        })
        .collect()
}

pub fn list_input_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    Ok(list_devices(
        host.input_devices()?,
        host.default_input_device(),
    ))
}

pub fn list_output_devices() -> Result<Vec<CpalDeviceInfo>, Box<dyn std::error::Error>> {
    let host = crate::audio_toolkit::get_cpal_host();
    Ok(list_devices(
        host.output_devices()?,
        host.default_output_device(),
    ))
}
