import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSettings } from '../useSettings';
import { commands } from '@/bindings';

describe('useSettings', () => {
  const mockSettings = {
    selected_microphone: null,
    audio_feedback: false,
    audio_feedback_volume: 1.0,
    sound_theme: 'default',
    start_hidden: false,
    autostart_enabled: false,
    update_checks_enabled: true,
    push_to_talk: true,
    selected_language: 'auto',
    translate_to_english: false,
    debug_mode: false,
    log_level: 'debug',
    custom_words: [],
    word_correction_threshold: 0.18,
    history_limit: 5,
    recording_retention_period: { type: 'preserve_limit' },
    paste_method: 'clipboard',
    clipboard_handling: 'paste',
    post_process_enabled: false,
    post_process_provider_id: 'openai',
    post_process_providers: [],
    post_process_api_keys: {},
    post_process_models: {},
    post_process_prompts: [],
    post_process_selected_prompt_id: null,
    mute_while_recording: false,
    append_trailing_space: false,
    app_language: 'en',
    show_waveform: true,
    offline_post_process_enabled: false,
    offline_llm_model: '',
    bindings: {
      transcribe: {
        id: 'transcribe',
        name: 'Transcribe',
        description: 'Start transcription',
        default_binding: 'alt',
        current_binding: 'alt',
      },
    },
    overlay_position: 'bottom',
    model_unload_timeout: 'never',
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should initialize with null settings', () => {
    vi.mocked(commands.getSettings).mockResolvedValue(mockSettings);
    
    const { result } = renderHook(() => useSettings());
    
    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('should load settings on mount', async () => {
    vi.mocked(commands.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue(mockSettings);
    
    const { result } = renderHook(() => useSettings());
    
    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });
    
    expect(result.current.settings?.audio_feedback).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update a setting', async () => {
    vi.mocked(commands.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.setSettings).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useSettings());
    
    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });
    
    await result.current.updateSetting('audio_feedback', true);
    
    expect(commands.setSettings).toHaveBeenCalledWith(expect.objectContaining({
      audio_feedback: true,
    }));
  });

  it('should reset a setting to default', async () => {
    vi.mocked(commands.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.setSettings).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => useSettings());
    
    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });
    
    await result.current.resetSetting('audio_feedback');
    
    expect(commands.setSettings).toHaveBeenCalled();
  });

  it('should return correct value from getSetting', async () => {
    vi.mocked(commands.getSettings).mockResolvedValue(mockSettings);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue(mockSettings);
    
    const { result } = renderHook(() => useSettings());
    
    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });
    
    const audioFeedback = result.current.getSetting('audio_feedback');
    expect(audioFeedback).toBe(false);
  });

  it('should handle errors when loading settings', async () => {
    vi.mocked(commands.getSettings).mockRejectedValue(new Error('Failed to load'));
    
    const { result } = renderHook(() => useSettings());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.settings).toBeNull();
  });
});
