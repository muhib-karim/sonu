import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSettings } from "../useSettings";
import { commands } from "@/bindings";
import { useSettingsStore } from "@/stores/settingsStore";

describe("useSettings", () => {
  const mockSettings = {
    selected_microphone: null,
    audio_feedback: false,
    audio_feedback_volume: 1.0,
    sound_theme: "default",
    start_hidden: false,
    autostart_enabled: false,
    update_checks_enabled: true,
    push_to_talk: true,
    selected_language: "auto",
    translate_to_english: false,
    debug_mode: false,
    log_level: "debug",
    custom_words: [],
    word_correction_threshold: 0.18,
    history_limit: 5,
    recording_retention_period: { type: "preserve_limit" },
    paste_method: "clipboard",
    clipboard_handling: "paste",
    post_process_enabled: false,
    post_process_provider_id: "openai",
    post_process_providers: [],
    post_process_api_keys: {},
    post_process_models: {},
    post_process_prompts: [],
    post_process_selected_prompt_id: null,
    mute_while_recording: false,
    append_trailing_space: false,
    app_language: "en",
    show_waveform: true,
    offline_post_process_enabled: false,
    offline_llm_model: "",
    bindings: {
      transcribe: {
        id: "transcribe",
        name: "Transcribe",
        description: "Start transcription",
        default_binding: "alt",
        current_binding: "alt",
      },
    },
    overlay_position: "bottom",
    model_unload_timeout: "never",
    always_on_microphone: false,
    clamshell_microphone: null,
    selected_output_device: null,
  };

  /** Set up the standard mocks so store.initialize() can succeed. */
  const setupMocks = () => {
    vi.mocked(commands.getAppSettings).mockResolvedValue({
      status: "ok",
      data: mockSettings,
    } as any);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue({
      status: "ok",
      data: mockSettings,
    } as any);
    vi.mocked(commands.getAvailableMicrophones).mockResolvedValue({
      status: "ok",
      data: [],
    } as any);
    vi.mocked(commands.getAvailableOutputDevices).mockResolvedValue({
      status: "ok",
      data: [],
    } as any);
    vi.mocked(commands.checkCustomSounds).mockResolvedValue({
      start: false,
      stop: false,
    } as any);
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Reset zustand store to initial state between tests
    useSettingsStore.setState({
      settings: null,
      defaultSettings: null,
      isLoading: true,
      isUpdating: {},
      audioDevices: [],
      outputDevices: [],
      customSounds: { start: false, stop: false },
      postProcessModelOptions: {},
    });
  });

  it("should initialize with null settings", () => {
    setupMocks();

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("should load settings on mount", async () => {
    setupMocks();

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });

    expect(result.current.settings?.audio_feedback).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should update a setting", async () => {
    setupMocks();
    vi.mocked(commands.changeAudioFeedbackSetting).mockResolvedValue(
      undefined as any,
    );

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });

    await act(async () => {
      await result.current.updateSetting("audio_feedback", true);
    });

    // The store calls the per-key updater command, not a bulk setSettings
    expect(commands.changeAudioFeedbackSetting).toHaveBeenCalledWith(true);
    // Optimistic update should reflect in the settings
    expect(result.current.settings?.audio_feedback).toBe(true);
  });

  it("should reset a setting to default", async () => {
    setupMocks();
    vi.mocked(commands.changeAudioFeedbackSetting).mockResolvedValue(
      undefined as any,
    );

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });

    await act(async () => {
      await result.current.resetSetting("audio_feedback");
    });

    // resetSetting reads the default value and calls updateSetting → per-key updater
    expect(commands.changeAudioFeedbackSetting).toHaveBeenCalledWith(false);
  });

  it("should return correct value from getSetting", async () => {
    setupMocks();

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.settings).not.toBeNull();
    });

    const audioFeedback = result.current.getSetting("audio_feedback");
    expect(audioFeedback).toBe(false);
  });

  it("should handle errors when loading settings", async () => {
    // Return an error Result instead of rejecting
    vi.mocked(commands.getAppSettings).mockResolvedValue({
      status: "error",
      error: "Failed to load",
    } as any);
    vi.mocked(commands.getDefaultSettings).mockResolvedValue({
      status: "error",
      error: "Failed to load",
    } as any);
    vi.mocked(commands.getAvailableMicrophones).mockResolvedValue({
      status: "ok",
      data: [],
    } as any);
    vi.mocked(commands.getAvailableOutputDevices).mockResolvedValue({
      status: "ok",
      data: [],
    } as any);
    vi.mocked(commands.checkCustomSounds).mockResolvedValue({
      start: false,
      stop: false,
    } as any);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeNull();
  });
});
