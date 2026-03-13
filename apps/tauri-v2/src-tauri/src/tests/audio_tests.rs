//! Unit tests for audio processing

#[cfg(test)]
mod tests {
    use crate::audio_toolkit::audio::{AudioDevice, AudioConfig};

    #[test]
    fn test_audio_device_structure() {
        let device = AudioDevice {
            id: "test-device".to_string(),
            name: "Test Microphone".to_string(),
            is_default: true,
            channels: 1,
            sample_rate: 16000,
        };

        assert_eq!(device.id, "test-device");
        assert_eq!(device.name, "Test Microphone");
        assert!(device.is_default);
        assert_eq!(device.channels, 1);
        assert_eq!(device.sample_rate, 16000);
    }

    #[test]
    fn test_audio_config_default() {
        let config = AudioConfig::default();
        
        assert_eq!(config.sample_rate, 16000);
        assert_eq!(config.channels, 1);
        assert_eq!(config.buffer_size, 1024);
    }

    #[test]
    fn test_audio_config_custom() {
        let config = AudioConfig {
            sample_rate: 44100,
            channels: 2,
            buffer_size: 2048,
        };

        assert_eq!(config.sample_rate, 44100);
        assert_eq!(config.channels, 2);
        assert_eq!(config.buffer_size, 2048);
    }

    #[test]
    fn test_audio_device_comparison() {
        let device1 = AudioDevice {
            id: "device-1".to_string(),
            name: "Device One".to_string(),
            is_default: true,
            channels: 1,
            sample_rate: 16000,
        };

        let device2 = AudioDevice {
            id: "device-1".to_string(),
            name: "Device One".to_string(),
            is_default: true,
            channels: 1,
            sample_rate: 16000,
        };

        let device3 = AudioDevice {
            id: "device-2".to_string(),
            name: "Device Two".to_string(),
            is_default: false,
            channels: 2,
            sample_rate: 44100,
        };

        // Same devices should be equal
        assert_eq!(device1.id, device2.id);
        
        // Different devices
        assert_ne!(device1.id, device3.id);
        assert_ne!(device1.name, device3.name);
    }
}
