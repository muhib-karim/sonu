//! Unit tests for model management

#[cfg(test)]
mod tests {
    use crate::managers::model::{ModelInfo, ModelRequirements, DownloadStatus};

    #[test]
    fn test_model_info_structure() {
        let model = ModelInfo {
            id: "test-model".to_string(),
            name: "Test Model".to_string(),
            description: "A test model".to_string(),
            size_mb: 100.0,
            requirements: ModelRequirements {
                min_ram_gb: 4,
                recommended_ram_gb: 8,
                supports_gpu: true,
            },
            is_downloaded: false,
            download_progress: None,
            is_active: false,
        };

        assert_eq!(model.id, "test-model");
        assert_eq!(model.name, "Test Model");
        assert_eq!(model.size_mb, 100.0);
        assert!(!model.is_downloaded);
        assert!(!model.is_active);
    }

    #[test]
    fn test_model_requirements() {
        let requirements = ModelRequirements {
            min_ram_gb: 4,
            recommended_ram_gb: 8,
            supports_gpu: true,
        };

        assert_eq!(requirements.min_ram_gb, 4);
        assert_eq!(requirements.recommended_ram_gb, 8);
        assert!(requirements.supports_gpu);
    }

    #[test]
    fn test_download_status_variants() {
        let statuses = vec![
            DownloadStatus::NotDownloaded,
            DownloadStatus::Downloading { progress: 50.0 },
            DownloadStatus::Verifying,
            DownloadStatus::Ready,
            DownloadStatus::Failed { error: "Network error".to_string() },
            DownloadStatus::Cancelled,
        ];

        for status in statuses {
            match status {
                DownloadStatus::Downloading { progress } => {
                    assert_eq!(progress, 50.0);
                }
                DownloadStatus::Failed { error } => {
                    assert_eq!(error, "Network error");
                }
                _ => {}
            }
        }
    }
}
