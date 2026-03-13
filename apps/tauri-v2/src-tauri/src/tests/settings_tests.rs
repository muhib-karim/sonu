//! Unit tests for settings module

#[cfg(test)]
mod tests {
    use crate::settings::*;

    #[test]
    fn test_log_level_serialization() {
        // Test that LogLevel can be serialized and deserialized correctly
        let levels = vec![
            LogLevel::Trace,
            LogLevel::Debug,
            LogLevel::Info,
            LogLevel::Warn,
            LogLevel::Error,
        ];

        for level in levels {
            let json = serde_json::to_string(&level).unwrap();
            let deserialized: LogLevel = serde_json::from_str(&json).unwrap();
            assert_eq!(level, deserialized);
        }
    }

    #[test]
    fn test_model_unload_timeout_conversion() {
        // Test timeout to minutes conversion
        assert_eq!(ModelUnloadTimeout::Never.to_minutes(), None);
        assert_eq!(ModelUnloadTimeout::Immediately.to_minutes(), Some(0));
        assert_eq!(ModelUnloadTimeout::Min2.to_minutes(), Some(2));
        assert_eq!(ModelUnloadTimeout::Min5.to_minutes(), Some(5));
        assert_eq!(ModelUnloadTimeout::Min10.to_minutes(), Some(10));
        assert_eq!(ModelUnloadTimeout::Min15.to_minutes(), Some(15));
        assert_eq!(ModelUnloadTimeout::Hour1.to_minutes(), Some(60));

        // Test timeout to seconds conversion
        assert_eq!(ModelUnloadTimeout::Never.to_seconds(), None);
        assert_eq!(ModelUnloadTimeout::Immediately.to_seconds(), Some(0));
        assert_eq!(ModelUnloadTimeout::Sec5.to_seconds(), Some(5));
        assert_eq!(ModelUnloadTimeout::Min2.to_seconds(), Some(120));
    }

    #[test]
    fn test_sound_theme_paths() {
        let marimba = SoundTheme::Marimba;
        assert_eq!(marimba.to_start_path(), "resources/marimba_start.wav");
        assert_eq!(marimba.to_stop_path(), "resources/marimba_stop.wav");

        let pop = SoundTheme::Pop;
        assert_eq!(pop.to_start_path(), "resources/pop_start.wav");
        assert_eq!(pop.to_stop_path(), "resources/pop_stop.wav");

        let custom = SoundTheme::Custom;
        assert_eq!(custom.to_start_path(), "resources/custom_start.wav");
        assert_eq!(custom.to_stop_path(), "resources/custom_stop.wav");
    }

    #[test]
    fn test_default_settings_creation() {
        let settings = get_default_settings();
        
        // Check that bindings are initialized
        assert!(settings.bindings.contains_key("transcribe"));
        assert!(settings.bindings.contains_key("cancel"));
        
        // Check default values
        assert!(settings.push_to_talk);
        assert!(!settings.audio_feedback);
        assert_eq!(settings.audio_feedback_volume, 1.0);
        assert!(!settings.start_hidden);
        assert!(!settings.autostart_enabled);
        assert!(settings.update_checks_enabled);
        assert_eq!(settings.selected_language, "auto");
        assert!(!settings.debug_mode);
    }

    #[test]
    fn test_shortcut_binding_structure() {
        let binding = ShortcutBinding {
            id: "test".to_string(),
            name: "Test Binding".to_string(),
            description: "Test description".to_string(),
            default_binding: "ctrl+space".to_string(),
            current_binding: "alt+space".to_string(),
        };

        assert_eq!(binding.id, "test");
        assert_eq!(binding.name, "Test Binding");
        assert_eq!(binding.default_binding, "ctrl+space");
        assert_eq!(binding.current_binding, "alt+space");
    }

    #[test]
    fn test_llm_prompt_structure() {
        let prompt = LLMPrompt {
            id: "test-prompt".to_string(),
            name: "Test Prompt".to_string(),
            prompt: "Test prompt content".to_string(),
        };

        assert_eq!(prompt.id, "test-prompt");
        assert_eq!(prompt.name, "Test Prompt");
        assert_eq!(prompt.prompt, "Test prompt content");
    }

    #[test]
    fn test_post_process_provider_structure() {
        let provider = PostProcessProvider {
            id: "test-provider".to_string(),
            label: "Test Provider".to_string(),
            base_url: "https://api.test.com/v1".to_string(),
            allow_base_url_edit: true,
            models_endpoint: Some("/models".to_string()),
        };

        assert_eq!(provider.id, "test-provider");
        assert_eq!(provider.label, "Test Provider");
        assert!(provider.allow_base_url_edit);
        assert_eq!(provider.models_endpoint, Some("/models".to_string()));
    }

    #[test]
    fn test_log_level_into_tauri() {
        let trace: tauri_plugin_log::LogLevel = LogLevel::Trace.into();
        let debug: tauri_plugin_log::LogLevel = LogLevel::Debug.into();
        let info: tauri_plugin_log::LogLevel = LogLevel::Info.into();
        let warn: tauri_plugin_log::LogLevel = LogLevel::Warn.into();
        let error: tauri_plugin_log::LogLevel = LogLevel::Error.into();

        assert!(matches!(trace, tauri_plugin_log::LogLevel::Trace));
        assert!(matches!(debug, tauri_plugin_log::LogLevel::Debug));
        assert!(matches!(info, tauri_plugin_log::LogLevel::Info));
        assert!(matches!(warn, tauri_plugin_log::LogLevel::Warn));
        assert!(matches!(error, tauri_plugin_log::LogLevel::Error));
    }

    #[test]
    fn test_paste_method_default() {
        // Test that default paste method is correctly set based on platform
        let default = PasteMethod::default();
        
        // On Linux, should be Direct
        #[cfg(target_os = "linux")]
        assert!(matches!(default, PasteMethod::Direct));
        
        // On other platforms, should be CtrlV
        #[cfg(not(target_os = "linux"))]
        assert!(matches!(default, PasteMethod::CtrlV));
    }

    #[test]
    fn test_overlay_position_default() {
        let default = default_overlay_position();
        
        // On Linux, should be None
        #[cfg(target_os = "linux")]
        assert!(matches!(default, OverlayPosition::None));
        
        // On other platforms, should be Bottom
        #[cfg(not(target_os = "linux"))]
        assert!(matches!(default, OverlayPosition::Bottom));
    }
}
