import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMocks } from "@tauri-apps/api/mocks";
import type { AppSettings, AudioDevice } from "@/bindings";
import { backendError, deferred, mockTauriCommands } from "@/test/ipc";
import { useSettingsStore } from "../settingsStore";

// These tests run the store against the REAL generated bindings and the real
// `invoke`; only the Tauri transport underneath is mocked (see `@/test/ipc`).
// That is the point: the store's error handling depends on the contract the
// bindings implement — a backend `Err` *resolves* `{ status: "error" }`, a
// transport failure *rejects* — and a hand-written mock of `@/bindings` cannot
// tell us whether the store honours it.
vi.unmock("@/bindings");
vi.unmock("@tauri-apps/api/core");

const DEFAULT_DEVICE: AudioDevice = {
  index: "default",
  name: "Default",
  is_default: true,
};

const baseSettings = (): AppSettings => ({
  bindings: {
    transcribe: {
      id: "transcribe",
      name: "Transcribe",
      description: "Start transcription",
      default_binding: "ctrl+space",
      current_binding: "ctrl+space",
    },
  },
  push_to_talk: true,
  audio_feedback: false,
  audio_feedback_volume: 1,
  always_on_microphone: false,
  selected_microphone: "Default",
  clamshell_microphone: "Default",
  selected_output_device: "Default",
  history_limit: 5,
  post_process_provider_id: "openai",
  post_process_models: {},
  context_awareness_enabled: true,
});

const store = () => useSettingsStore.getState();

/** Put the store in the "settings loaded" state without going through IPC. */
const seed = (overrides: Partial<AppSettings> = {}) => {
  useSettingsStore.setState({
    settings: { ...baseSettings(), ...overrides },
    isLoading: false,
  });
};

let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
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
  // The store logs every failure. Silence the output, keep the calls.
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  clearMocks();
  vi.restoreAllMocks();
});

describe("refreshSettings", () => {
  it("stores the settings, fills in missing device names and stops loading", async () => {
    mockTauriCommands({
      get_app_settings: () => ({
        ...baseSettings(),
        always_on_microphone: undefined,
        selected_microphone: null,
        clamshell_microphone: undefined,
        selected_output_device: null,
      }),
    });

    await store().refreshSettings();

    expect(store().isLoading).toBe(false);
    expect(store().settings).toMatchObject({
      audio_feedback: false,
      always_on_microphone: false,
      selected_microphone: "Default",
      clamshell_microphone: "Default",
      selected_output_device: "Default",
    });
  });

  it("keeps real device names as they are", async () => {
    mockTauriCommands({
      get_app_settings: () => ({
        ...baseSettings(),
        selected_microphone: "USB Mic",
        selected_output_device: "Speakers",
      }),
    });

    await store().refreshSettings();

    expect(store().settings?.selected_microphone).toBe("USB Mic");
    expect(store().settings?.selected_output_device).toBe("Speakers");
  });

  it("leaves settings empty and stops loading when the backend returns an error", async () => {
    mockTauriCommands({
      get_app_settings: () => backendError("settings store unreadable"),
    });

    await store().refreshSettings();

    expect(store().settings).toBeNull();
    expect(store().isLoading).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load settings:",
      "settings store unreadable",
    );
  });

  it("leaves settings empty and stops loading when the transport fails", async () => {
    mockTauriCommands({
      get_app_settings: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(store().refreshSettings()).resolves.toBeUndefined();

    expect(store().settings).toBeNull();
    expect(store().isLoading).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load settings:",
      expect.objectContaining({ message: "ipc channel closed" }),
    );
  });

  it("does not discard already loaded settings when a later refresh fails", async () => {
    seed({ history_limit: 42 });
    mockTauriCommands({
      get_app_settings: () => backendError("busy"),
    });

    await store().refreshSettings();

    expect(store().settings?.history_limit).toBe(42);
  });
});

describe.each([
  {
    action: "refreshAudioDevices",
    command: "get_available_microphones",
    field: "audioDevices",
    message: "Failed to load audio devices:",
  },
  {
    action: "refreshOutputDevices",
    command: "get_available_output_devices",
    field: "outputDevices",
    message: "Failed to load output devices:",
  },
] as const)("$action", ({ action, command, field, message }) => {
  it("puts a synthetic Default first and drops the backend's own default entry", async () => {
    mockTauriCommands({
      [command]: (): AudioDevice[] => [
        { index: "0", name: "Default", is_default: true },
        { index: "1", name: "default", is_default: false },
        { index: "2", name: "USB Device", is_default: false },
      ],
    });

    await store()[action]();

    expect(store()[field]).toEqual([
      DEFAULT_DEVICE,
      { index: "2", name: "USB Device", is_default: false },
    ]);
  });

  it("falls back to Default alone when the backend returns an error", async () => {
    mockTauriCommands({ [command]: () => backendError("no audio host") });

    await store()[action]();

    expect(store()[field]).toEqual([DEFAULT_DEVICE]);
  });

  it("falls back to Default alone when the transport fails", async () => {
    mockTauriCommands({
      [command]: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(store()[action]()).resolves.toBeUndefined();

    expect(store()[field]).toEqual([DEFAULT_DEVICE]);
    expect(errorSpy).toHaveBeenCalledWith(message, expect.any(Error));
  });
});

describe("loadDefaultSettings", () => {
  it("stores the defaults", async () => {
    mockTauriCommands({
      get_default_settings: () => ({ ...baseSettings(), history_limit: 99 }),
    });

    await store().loadDefaultSettings();

    expect(store().defaultSettings?.history_limit).toBe(99);
  });

  it("keeps defaults empty when the backend returns an error", async () => {
    mockTauriCommands({
      get_default_settings: () => backendError("no defaults"),
    });

    await store().loadDefaultSettings();

    expect(store().defaultSettings).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load default settings:",
      "no defaults",
    );
  });

  it("keeps defaults empty when the transport fails", async () => {
    mockTauriCommands({
      get_default_settings: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(store().loadDefaultSettings()).resolves.toBeUndefined();

    expect(store().defaultSettings).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load default settings:",
      expect.any(Error),
    );
  });
});

describe("custom sounds", () => {
  it("checkCustomSounds stores what the backend reports", async () => {
    mockTauriCommands({
      check_custom_sounds: () => ({ start: true, stop: false }),
    });

    await store().checkCustomSounds();

    expect(store().customSounds).toEqual({ start: true, stop: false });
  });

  it("checkCustomSounds keeps the previous value when the command rejects", async () => {
    useSettingsStore.setState({ customSounds: { start: true, stop: true } });
    mockTauriCommands({
      check_custom_sounds: () => backendError("cannot read sounds dir"),
    });

    await expect(store().checkCustomSounds()).resolves.toBeUndefined();

    expect(store().customSounds).toEqual({ start: true, stop: true });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to check custom sounds:",
      "cannot read sounds dir",
    );
  });

  it("playTestSound forwards the sound type", async () => {
    const ipc = mockTauriCommands({ play_test_sound: () => null });

    await store().playTestSound("stop");

    expect(ipc.callsTo("play_test_sound")).toEqual([
      { cmd: "play_test_sound", args: { soundType: "stop" } },
    ]);
  });

  it("playTestSound contains a playback failure", async () => {
    mockTauriCommands({
      play_test_sound: () => backendError("no output device"),
    });

    await expect(store().playTestSound("start")).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to play test sound (start):",
      "no output device",
    );
  });
});

describe("updateSetting", () => {
  it("applies the value optimistically, calls the per-key command and reports success", async () => {
    seed();
    const pending = deferred<null>();
    const ipc = mockTauriCommands({
      change_audio_feedback_setting: () => pending.promise,
    });

    const write = store().updateSetting("audio_feedback", true);

    // In flight: the UI already shows the new value and the key is busy.
    expect(store().settings?.audio_feedback).toBe(true);
    expect(store().isUpdatingKey("audio_feedback")).toBe(true);

    pending.resolve(null);
    await expect(write).resolves.toBe(true);

    expect(ipc.calls).toEqual([
      { cmd: "change_audio_feedback_setting", args: { enabled: true } },
    ]);
    expect(store().settings?.audio_feedback).toBe(true);
    expect(store().isUpdatingKey("audio_feedback")).toBe(false);
  });

  it("rolls the value back and returns false when the backend returns an error", async () => {
    seed();
    mockTauriCommands({
      change_audio_feedback_setting: () => backendError("disk full"),
    });

    await expect(store().updateSetting("audio_feedback", true)).resolves.toBe(
      false,
    );

    expect(store().settings?.audio_feedback).toBe(false);
    expect(store().isUpdatingKey("audio_feedback")).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to update setting audio_feedback:",
      expect.objectContaining({ message: "disk full" }),
    );
  });

  it("rolls the value back and returns false when the transport fails", async () => {
    seed();
    mockTauriCommands({
      change_audio_feedback_setting: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(store().updateSetting("audio_feedback", true)).resolves.toBe(
      false,
    );

    expect(store().settings?.audio_feedback).toBe(false);
    expect(store().isUpdatingKey("audio_feedback")).toBe(false);
  });

  it("reports a generic message when the backend error is not a string", async () => {
    seed();
    mockTauriCommands({
      change_audio_feedback_setting: () => {
        // A structured (non-string, non-Error) rejection value.
        throw { code: 42 };
      },
    });

    await expect(store().updateSetting("audio_feedback", true)).resolves.toBe(
      false,
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to update setting audio_feedback:",
      expect.objectContaining({ message: "Command failed" }),
    );
  });

  it("rolls back only the field that failed, not unrelated writes that succeeded meanwhile", async () => {
    seed();
    const failing = deferred<null>();
    mockTauriCommands({
      change_audio_feedback_setting: () => failing.promise,
      change_ptt_setting: () => null,
    });

    const first = store().updateSetting("audio_feedback", true);
    await expect(store().updateSetting("push_to_talk", false)).resolves.toBe(
      true,
    );

    failing.reject("disk full");
    await expect(first).resolves.toBe(false);

    expect(store().settings?.audio_feedback).toBe(false);
    expect(store().settings?.push_to_talk).toBe(false);
  });

  it("does not let an older failed write revert a newer successful one", async () => {
    seed({ history_limit: 5 });
    const older = deferred<null>();
    let call = 0;
    mockTauriCommands({
      update_history_limit: () => (++call === 1 ? older.promise : null),
    });

    const first = store().updateSetting("history_limit", 10);
    await expect(store().updateSetting("history_limit", 20)).resolves.toBe(
      true,
    );

    older.reject("stale write rejected");
    await expect(first).resolves.toBe(false);

    expect(store().settings?.history_limit).toBe(20);
    expect(warnSpy).toHaveBeenCalledWith(
      "Skipping rollback for 'history_limit': a newer write superseded it",
    );
  });

  it("keeps the key busy until the latest write settles", async () => {
    seed({ history_limit: 5 });
    const older = deferred<null>();
    const newer = deferred<null>();
    let call = 0;
    mockTauriCommands({
      update_history_limit: () =>
        ++call === 1 ? older.promise : newer.promise,
    });

    const first = store().updateSetting("history_limit", 10);
    const second = store().updateSetting("history_limit", 20);

    older.reject("stale write rejected");
    await first;
    expect(store().isUpdatingKey("history_limit")).toBe(true);

    newer.resolve(null);
    await second;
    expect(store().isUpdatingKey("history_limit")).toBe(false);
  });

  it.each([
    ["selected_microphone", "set_selected_microphone"],
    ["selected_output_device", "set_selected_output_device"],
  ] as const)(
    "%s sends the backend's lowercase default for 'Default' and null",
    async (key, command) => {
      seed();
      const ipc = mockTauriCommands({ [command]: () => null });

      await store().updateSetting(key, "Default");
      await store().updateSetting(key, null);
      await store().updateSetting(key, "USB Device");

      expect(ipc.callsTo(command).map((call) => call.args)).toEqual([
        { deviceName: "default" },
        { deviceName: "default" },
        { deviceName: "USB Device" },
      ]);
    },
  );

  it("clamshell_microphone sends the backend's lowercase default for 'Default'", async () => {
    seed();
    const ipc = mockTauriCommands({ set_clamshell_microphone: () => null });

    await store().updateSetting("clamshell_microphone", "Default");
    await store().updateSetting("clamshell_microphone", "Built-in Mic");

    expect(
      ipc.callsTo("set_clamshell_microphone").map((call) => call.args),
    ).toEqual([{ deviceName: "default" }, { deviceName: "Built-in Mic" }]);
  });

  it("warns about a key that has no backend command and still updates the store", async () => {
    seed();
    const ipc = mockTauriCommands({});

    await expect(
      store().updateSetting("post_process_provider_id", "anthropic"),
    ).resolves.toBe(true);

    expect(ipc.calls).toEqual([]);
    expect(store().settings?.post_process_provider_id).toBe("anthropic");
    expect(warnSpy).toHaveBeenCalledWith(
      "No handler for setting: post_process_provider_id",
    );
  });

  it.each(["bindings", "selected_model"] as const)(
    "does not warn for %s, which is persisted elsewhere",
    async (key) => {
      seed();
      mockTauriCommands({});

      await expect(
        store().updateSetting(key, store().settings?.[key]),
      ).resolves.toBe(true);

      expect(warnSpy).not.toHaveBeenCalled();
    },
  );

  it("still sends the command when settings have not loaded yet", async () => {
    const ipc = mockTauriCommands({
      change_audio_feedback_setting: () => null,
    });

    await expect(store().updateSetting("audio_feedback", true)).resolves.toBe(
      true,
    );

    expect(ipc.callsTo("change_audio_feedback_setting")).toHaveLength(1);
    expect(store().settings).toBeNull();
  });
});

describe("resetSetting", () => {
  it("writes the default value through updateSetting", async () => {
    seed({ history_limit: 50 });
    useSettingsStore.setState({
      defaultSettings: { ...baseSettings(), history_limit: 5 },
    });
    const ipc = mockTauriCommands({ update_history_limit: () => null });

    await store().resetSetting("history_limit");

    expect(ipc.calls).toEqual([
      { cmd: "update_history_limit", args: { limit: 5 } },
    ]);
    expect(store().settings?.history_limit).toBe(5);
  });

  it("does nothing while the defaults have not loaded", async () => {
    seed({ history_limit: 50 });
    const ipc = mockTauriCommands({});

    await store().resetSetting("history_limit");

    expect(ipc.calls).toEqual([]);
    expect(store().settings?.history_limit).toBe(50);
  });

  it("does nothing for a key the defaults do not define", async () => {
    seed({ theme_mode: "light" });
    useSettingsStore.setState({ defaultSettings: baseSettings() });
    const ipc = mockTauriCommands({});

    await store().resetSetting("theme_mode");

    expect(ipc.calls).toEqual([]);
    expect(store().settings?.theme_mode).toBe("light");
  });
});

describe("updateBinding", () => {
  const currentBinding = () =>
    store().settings?.bindings.transcribe?.current_binding;

  it("applies the binding optimistically and keeps it on success", async () => {
    seed();
    const pending = deferred<unknown>();
    const ipc = mockTauriCommands({ change_binding: () => pending.promise });

    const write = store().updateBinding("transcribe", "alt+space");

    expect(currentBinding()).toBe("alt+space");
    expect(store().isUpdatingKey("binding_transcribe")).toBe(true);

    pending.resolve({ success: true, binding: null, error: null });
    await expect(write).resolves.toBeUndefined();

    expect(ipc.calls).toEqual([
      {
        cmd: "change_binding",
        args: { id: "transcribe", binding: "alt+space" },
      },
    ]);
    expect(currentBinding()).toBe("alt+space");
    expect(store().isUpdatingKey("binding_transcribe")).toBe(false);
  });

  it("rolls back and rethrows when the backend returns an error", async () => {
    seed();
    mockTauriCommands({
      change_binding: () => backendError("shortcut already registered"),
    });

    await expect(
      store().updateBinding("transcribe", "alt+space"),
    ).rejects.toThrow("shortcut already registered");

    expect(currentBinding()).toBe("ctrl+space");
    expect(store().isUpdatingKey("binding_transcribe")).toBe(false);
  });

  it("rolls back and rethrows the reason when the command reports success: false", async () => {
    seed();
    mockTauriCommands({
      change_binding: () => ({
        success: false,
        binding: null,
        error: "conflicts with cancel",
      }),
    });

    await expect(
      store().updateBinding("transcribe", "alt+space"),
    ).rejects.toThrow("conflicts with cancel");

    expect(currentBinding()).toBe("ctrl+space");
  });

  it("uses a fallback message when success: false carries no reason", async () => {
    seed();
    mockTauriCommands({
      change_binding: () => ({ success: false, binding: null, error: null }),
    });

    await expect(
      store().updateBinding("transcribe", "alt+space"),
    ).rejects.toThrow("Failed to update binding");

    expect(currentBinding()).toBe("ctrl+space");
  });

  it("rolls back and rethrows when the transport fails", async () => {
    seed();
    mockTauriCommands({
      change_binding: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(
      store().updateBinding("transcribe", "alt+space"),
    ).rejects.toThrow("ipc channel closed");

    expect(currentBinding()).toBe("ctrl+space");
    expect(store().isUpdatingKey("binding_transcribe")).toBe(false);
  });
});

describe("resetBinding", () => {
  it("resets through the backend and reloads the settings it changed", async () => {
    seed({
      bindings: {
        transcribe: {
          ...baseSettings().bindings.transcribe!,
          current_binding: "alt+space",
        },
      },
    });
    const ipc = mockTauriCommands({
      reset_binding: () => ({ success: true, binding: null, error: null }),
      get_app_settings: () => baseSettings(),
    });

    await store().resetBinding("transcribe");

    expect(ipc.callsTo("reset_binding")).toEqual([
      { cmd: "reset_binding", args: { id: "transcribe" } },
    ]);
    expect(store().settings?.bindings.transcribe?.current_binding).toBe(
      "ctrl+space",
    );
    expect(store().isUpdatingKey("binding_transcribe")).toBe(false);
  });
});

describe("setPostProcessProvider", () => {
  it("selects the provider optimistically, persists it and reloads", async () => {
    seed();
    const pending = deferred<null>();
    const ipc = mockTauriCommands({
      set_post_process_provider: () => pending.promise,
      get_app_settings: () => ({
        ...baseSettings(),
        post_process_provider_id: "anthropic",
      }),
    });

    const write = store().setPostProcessProvider("anthropic");

    expect(store().settings?.post_process_provider_id).toBe("anthropic");
    expect(store().isUpdatingKey("post_process_provider_id")).toBe(true);

    pending.resolve(null);
    await write;

    expect(ipc.callsTo("set_post_process_provider")).toEqual([
      { cmd: "set_post_process_provider", args: { providerId: "anthropic" } },
    ]);
    expect(ipc.callsTo("get_app_settings")).toHaveLength(1);
    expect(store().settings?.post_process_provider_id).toBe("anthropic");
    expect(store().isUpdatingKey("post_process_provider_id")).toBe(false);
  });

  it("restores the previous provider when the transport fails", async () => {
    seed();
    mockTauriCommands({
      set_post_process_provider: () => {
        throw new Error("ipc channel closed");
      },
    });

    await store().setPostProcessProvider("anthropic");

    expect(store().settings?.post_process_provider_id).toBe("openai");
    expect(store().isUpdatingKey("post_process_provider_id")).toBe(false);
  });
});

describe("post-process provider settings", () => {
  it.each([
    {
      action: "updatePostProcessBaseUrl",
      command: "change_post_process_base_url_setting",
      value: "https://llm.example/v1",
      args: { providerId: "custom", baseUrl: "https://llm.example/v1" },
      busyKey: "post_process_base_url:custom",
    },
    {
      action: "updatePostProcessApiKey",
      command: "change_post_process_api_key_setting",
      value: "sk-test",
      args: { providerId: "custom", apiKey: "sk-test" },
      busyKey: "post_process_api_key:custom",
    },
    {
      action: "updatePostProcessModel",
      command: "change_post_process_model_setting",
      value: "gpt-test",
      args: { providerId: "custom", model: "gpt-test" },
      busyKey: "post_process_model:custom",
    },
  ] as const)(
    "$action persists the value and reloads settings",
    async ({ action, command, value, args, busyKey }) => {
      seed();
      const pending = deferred<null>();
      const ipc = mockTauriCommands({
        [command]: () => pending.promise,
        get_app_settings: () => ({ ...baseSettings(), history_limit: 77 }),
      });

      const write = store()[action]("custom", value);
      expect(store().isUpdatingKey(busyKey)).toBe(true);

      pending.resolve(null);
      await write;

      expect(ipc.callsTo(command)).toEqual([{ cmd: command, args }]);
      // The reload is what brings the persisted value back into the store.
      expect(store().settings?.history_limit).toBe(77);
      expect(store().isUpdatingKey(busyKey)).toBe(false);
    },
  );

  it("updatePostProcessApiKey drops the cached model list of that provider only", async () => {
    seed();
    useSettingsStore.setState({
      postProcessModelOptions: { custom: ["a", "b"], openai: ["gpt"] },
    });
    mockTauriCommands({
      change_post_process_api_key_setting: () => null,
      get_app_settings: () => baseSettings(),
    });

    await store().updatePostProcessApiKey("custom", "sk-new");

    expect(store().postProcessModelOptions).toEqual({
      custom: [],
      openai: ["gpt"],
    });
  });

  it("contains a transport failure and clears the busy flag", async () => {
    seed();
    mockTauriCommands({
      change_post_process_model_setting: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(
      store().updatePostProcessModel("custom", "gpt-test"),
    ).resolves.not.toThrow();

    expect(store().isUpdatingKey("post_process_model:custom")).toBe(false);
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to update post-process model:",
      expect.any(Error),
    );
  });
});

describe("fetchPostProcessModels", () => {
  it("returns the models and caches them per provider", async () => {
    const ipc = mockTauriCommands({
      fetch_post_process_models: () => ["gpt-a", "gpt-b"],
    });

    await expect(store().fetchPostProcessModels("openai")).resolves.toEqual([
      "gpt-a",
      "gpt-b",
    ]);

    expect(ipc.calls).toEqual([
      { cmd: "fetch_post_process_models", args: { providerId: "openai" } },
    ]);
    expect(store().postProcessModelOptions).toEqual({
      openai: ["gpt-a", "gpt-b"],
    });
    expect(store().isUpdatingKey("post_process_models_fetch:openai")).toBe(
      false,
    );
  });

  it("returns an empty list and keeps the cache when the backend returns an error", async () => {
    useSettingsStore.setState({
      postProcessModelOptions: { openai: ["cached"] },
    });
    mockTauriCommands({
      fetch_post_process_models: () => backendError("401 Unauthorized"),
    });

    await expect(store().fetchPostProcessModels("openai")).resolves.toEqual([]);

    expect(store().postProcessModelOptions).toEqual({ openai: ["cached"] });
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to fetch models:",
      "401 Unauthorized",
    );
    expect(store().isUpdatingKey("post_process_models_fetch:openai")).toBe(
      false,
    );
  });

  it("returns an empty list and keeps the cache when the transport fails", async () => {
    useSettingsStore.setState({
      postProcessModelOptions: { openai: ["cached"] },
    });
    mockTauriCommands({
      fetch_post_process_models: () => {
        throw new Error("ipc channel closed");
      },
    });

    await expect(store().fetchPostProcessModels("openai")).resolves.toEqual([]);

    expect(store().postProcessModelOptions).toEqual({ openai: ["cached"] });
    expect(store().isUpdatingKey("post_process_models_fetch:openai")).toBe(
      false,
    );
  });
});

describe("initialize", () => {
  const LOADERS = [
    "get_default_settings",
    "get_app_settings",
    "get_available_microphones",
    "get_available_output_devices",
    "check_custom_sounds",
  ] as const;

  const loadHandlers = () => ({
    get_default_settings: () => ({ ...baseSettings(), history_limit: 5 }),
    get_app_settings: () => ({ ...baseSettings(), history_limit: 30 }),
    get_available_microphones: (): AudioDevice[] => [
      { index: "1", name: "USB Mic", is_default: false },
    ],
    get_available_output_devices: (): AudioDevice[] => [],
    check_custom_sounds: () => ({ start: true, stop: true }),
  });

  it("loads settings, defaults, devices and custom sounds", async () => {
    const ipc = mockTauriCommands(loadHandlers());

    await store().initialize();

    for (const command of LOADERS) {
      expect(ipc.callsTo(command)).toHaveLength(1);
    }
    expect(store().isLoading).toBe(false);
    expect(store().settings?.history_limit).toBe(30);
    expect(store().defaultSettings?.history_limit).toBe(5);
    expect(store().audioDevices).toEqual([
      DEFAULT_DEVICE,
      { index: "1", name: "USB Mic", is_default: false },
    ]);
    expect(store().outputDevices).toEqual([DEFAULT_DEVICE]);
    expect(store().customSounds).toEqual({ start: true, stop: true });
  });

  it("shares one round of requests between concurrent callers", async () => {
    const ipc = mockTauriCommands(loadHandlers());

    await Promise.all([
      store().initialize(),
      store().initialize(),
      store().initialize(),
    ]);

    for (const command of LOADERS) {
      expect(ipc.callsTo(command)).toHaveLength(1);
    }
  });

  it("runs again when called after the previous run has settled", async () => {
    const ipc = mockTauriCommands(loadHandlers());

    await store().initialize();
    await store().initialize();

    for (const command of LOADERS) {
      expect(ipc.callsTo(command)).toHaveLength(2);
    }
  });

  it("finishes and loads what it can when one loader fails", async () => {
    mockTauriCommands({
      ...loadHandlers(),
      get_app_settings: () => backendError("settings store unreadable"),
    });

    await expect(store().initialize()).resolves.toBeUndefined();

    expect(store().isLoading).toBe(false);
    expect(store().settings).toBeNull();
    expect(store().defaultSettings?.history_limit).toBe(5);
    expect(store().audioDevices).toHaveLength(2);
  });
});

describe("selectors and setters", () => {
  it("getSetting is undefined before load and returns the value after", () => {
    expect(store().getSetting("history_limit")).toBeUndefined();

    seed({ history_limit: 12 });

    expect(store().getSetting("history_limit")).toBe(12);
  });

  it("isUpdatingKey is false for a key that was never written", () => {
    expect(store().isUpdatingKey("never_written")).toBe(false);
  });

  it("setUpdating tracks keys independently", () => {
    store().setUpdating("a", true);
    store().setUpdating("b", true);
    store().setUpdating("a", false);

    expect(store().isUpdatingKey("a")).toBe(false);
    expect(store().isUpdatingKey("b")).toBe(true);
  });

  it("setPostProcessModelOptions replaces one provider's list and keeps the others", () => {
    store().setPostProcessModelOptions("openai", ["gpt-a"]);
    store().setPostProcessModelOptions("custom", ["local"]);
    store().setPostProcessModelOptions("openai", ["gpt-b"]);

    expect(store().postProcessModelOptions).toEqual({
      openai: ["gpt-b"],
      custom: ["local"],
    });
  });

  it("the plain setters replace their slice of state", () => {
    store().setSettings(baseSettings());
    store().setDefaultSettings({ ...baseSettings(), history_limit: 1 });
    store().setLoading(false);
    store().setAudioDevices([DEFAULT_DEVICE]);
    store().setOutputDevices([DEFAULT_DEVICE]);
    store().setCustomSounds({ start: true, stop: false });

    expect(store().settings?.history_limit).toBe(5);
    expect(store().defaultSettings?.history_limit).toBe(1);
    expect(store().isLoading).toBe(false);
    expect(store().audioDevices).toEqual([DEFAULT_DEVICE]);
    expect(store().outputDevices).toEqual([DEFAULT_DEVICE]);
    expect(store().customSounds).toEqual({ start: true, stop: false });
  });
});
