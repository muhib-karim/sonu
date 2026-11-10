import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { commands, type AppSettings } from "@/bindings";
import { useSettingsStore } from "@/stores/settingsStore";
import { SonuShortcut } from "../SonuShortcut";

// `@/bindings`, `sonner` and `react-i18next` are mocked in src/test/setup.ts;
// the mocked `t` returns the key, so assertions name the translation key.
vi.mock("@tauri-apps/plugin-os", () => ({ type: () => "linux" }));

const settings = (binding: string): AppSettings => ({
  bindings: {
    transcribe: {
      id: "transcribe",
      name: "Transcribe",
      description: "Start transcription",
      default_binding: "ctrl+space",
      current_binding: binding,
    },
  },
  push_to_talk: true,
  audio_feedback: false,
});

/**
 * The reset control has an icon and no accessible name, so it is located
 * relative to the labelled "change shortcut" button it sits next to.
 */
const resetButton = (): HTMLElement => {
  const change = screen.getByRole("button", { name: "Change shortcut" });
  const reset = change.nextElementSibling;
  if (!(reset instanceof HTMLButtonElement)) {
    throw new Error("reset button not found next to the shortcut button");
  }
  return reset;
};

describe("SonuShortcut reset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    useSettingsStore.setState({
      settings: settings("alt+space"),
      defaultSettings: null,
      isLoading: false,
      isUpdating: {},
    });
  });

  it("shows the default shortcut again after a successful reset", async () => {
    vi.mocked(commands.resetBinding).mockResolvedValue({
      status: "ok",
      data: { success: true, binding: null, error: null },
    });
    vi.mocked(commands.getAppSettings).mockResolvedValue({
      status: "ok",
      data: settings("ctrl+space"),
    });
    render(<SonuShortcut shortcutId="transcribe" />);

    fireEvent.click(resetButton());

    await waitFor(() =>
      expect(
        useSettingsStore.getState().settings?.bindings.transcribe
          ?.current_binding,
      ).toBe("ctrl+space"),
    );
    expect(commands.resetBinding).toHaveBeenCalledWith("transcribe");
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Regression: a failed reset used to leave the old shortcut in place and
  // tell the user nothing.
  it("tells the user when the backend refuses the reset", async () => {
    vi.mocked(commands.resetBinding).mockResolvedValue({
      status: "error",
      error: "shortcut manager unavailable",
    });
    render(<SonuShortcut shortcutId="transcribe" />);

    fireEvent.click(resetButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.general.shortcut.errors.reset",
      ),
    );
    expect(
      useSettingsStore.getState().settings?.bindings.transcribe
        ?.current_binding,
    ).toBe("alt+space");
  });

  it("tells the user when the reset reports success: false", async () => {
    vi.mocked(commands.resetBinding).mockResolvedValue({
      status: "ok",
      data: {
        success: false,
        binding: null,
        error: "default shortcut is taken",
      },
    });
    render(<SonuShortcut shortcutId="transcribe" />);

    fireEvent.click(resetButton());

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "settings.general.shortcut.errors.reset",
      ),
    );
  });
});
