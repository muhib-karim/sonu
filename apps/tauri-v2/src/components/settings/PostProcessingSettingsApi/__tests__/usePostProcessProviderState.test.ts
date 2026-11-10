import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { commands, type AppSettings } from "@/bindings";
import { useSettingsStore } from "@/stores/settingsStore";
import { usePostProcessProviderState } from "../usePostProcessProviderState";

// `@/bindings`, `sonner` and `react-i18next` are mocked in src/test/setup.ts;
// the mocked `t` returns the key, so assertions name the translation key.

const settings = (): AppSettings => ({
  bindings: {},
  push_to_talk: true,
  audio_feedback: false,
  post_process_enabled: true,
  post_process_provider_id: "openai",
  post_process_providers: [
    { id: "openai", label: "OpenAI", base_url: "https://api.openai.com/v1" },
    {
      id: "custom",
      label: "Custom",
      base_url: "http://localhost:1234/v1",
      allow_base_url_edit: true,
    },
  ],
  post_process_models: { openai: "gpt-a" },
});

const ok = <T>(data: T) => ({ status: "ok" as const, data });
const err = (error: string) => ({ status: "error" as const, error });

const seedStore = (overrides: Partial<AppSettings> = {}) => {
  useSettingsStore.setState({
    settings: { ...settings(), ...overrides },
    defaultSettings: null,
    isLoading: false,
    isUpdating: {},
    postProcessModelOptions: {},
  });
};

describe("usePostProcessProviderState", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    seedStore();
    // Default: a reload returns whatever is currently stored.
    vi.mocked(commands.getAppSettings).mockImplementation(() =>
      Promise.resolve(ok(useSettingsStore.getState().settings!)),
    );
  });

  it("exposes the selected provider and its values from settings", () => {
    const { result } = renderHook(() => usePostProcessProviderState());

    expect(result.current.enabled).toBe(true);
    expect(result.current.selectedProviderId).toBe("openai");
    expect(result.current.baseUrl).toBe("https://api.openai.com/v1");
    expect(result.current.model).toBe("gpt-a");
    expect(result.current.isCustomProvider).toBe(false);
    expect(result.current.providerOptions).toEqual([
      { value: "openai", label: "OpenAI" },
      { value: "custom", label: "Custom" },
    ]);
    expect(result.current.modelOptions).toEqual([
      { value: "gpt-a", label: "gpt-a" },
    ]);
  });

  it("switches provider without a toast when the backend accepts it", async () => {
    vi.mocked(commands.setPostProcessProvider).mockResolvedValue(ok(null));
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleProviderSelect("custom"));

    await waitFor(() =>
      expect(result.current.selectedProviderId).toBe("custom"),
    );
    expect(commands.setPostProcessProvider).toHaveBeenCalledWith("custom");
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Regression: a refused provider switch used to be invisible to the user.
  it("tells the user and keeps the previous provider when the switch fails", async () => {
    vi.mocked(commands.setPostProcessProvider).mockResolvedValue(
      err("unknown provider"),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleProviderSelect("custom"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.postProcessing.api.errors.provider",
      ),
    );
    expect(result.current.selectedProviderId).toBe("openai");
  });

  it("does nothing when the selected provider is chosen again", async () => {
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleProviderSelect("openai"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(commands.setPostProcessProvider).not.toHaveBeenCalled();
  });

  it("saves an API key without a toast when the backend accepts it", async () => {
    vi.mocked(commands.changePostProcessApiKeySetting).mockResolvedValue(
      ok(null),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleApiKeyChange("  sk-test  "));

    await waitFor(() =>
      expect(commands.changePostProcessApiKeySetting).toHaveBeenCalledWith(
        "openai",
        "sk-test",
      ),
    );
    await waitFor(() => expect(result.current.isApiKeyUpdating).toBe(false));
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Regression: a value the backend refused used to look saved.
  it("tells the user when the API key was not saved", async () => {
    vi.mocked(commands.changePostProcessApiKeySetting).mockResolvedValue(
      err("keychain locked"),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleApiKeyChange("sk-test"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.postProcessing.api.errors.save",
      ),
    );
  });

  it("tells the user when the model was not saved", async () => {
    vi.mocked(commands.changePostProcessModelSetting).mockResolvedValue(
      err("settings store unreadable"),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleModelSet(" gpt-b "));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.postProcessing.api.errors.save",
      ),
    );
    expect(commands.changePostProcessModelSetting).toHaveBeenCalledWith(
      "openai",
      "gpt-b",
    );
  });

  it("tells the user when the custom base URL was not saved", async () => {
    seedStore({ post_process_provider_id: "custom" });
    vi.mocked(commands.changePostProcessBaseUrlSetting).mockResolvedValue(
      err("invalid url"),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleBaseUrlChange("https://llm.example/v1"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.postProcessing.api.errors.save",
      ),
    );
  });

  it("ignores base URL edits for providers that do not allow them", () => {
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleBaseUrlChange("https://llm.example/v1"));

    expect(commands.changePostProcessBaseUrlSetting).not.toHaveBeenCalled();
  });

  it("refreshes the model list and offers the fetched models", async () => {
    vi.mocked(commands.fetchPostProcessModels).mockResolvedValue(
      ok(["gpt-a", "gpt-b"]),
    );
    const { result } = renderHook(() => usePostProcessProviderState());

    act(() => result.current.handleRefreshModels());

    await waitFor(() =>
      expect(result.current.modelOptions).toEqual([
        { value: "gpt-a", label: "gpt-a" },
        { value: "gpt-b", label: "gpt-b" },
      ]),
    );
    expect(commands.fetchPostProcessModels).toHaveBeenCalledWith("openai");
  });
});
