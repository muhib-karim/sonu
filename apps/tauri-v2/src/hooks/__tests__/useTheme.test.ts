import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSettingsStore } from "@/stores/settingsStore";
import { resolvedTheme, ACCENT_COLORS, useTheme } from "../useTheme";

describe("resolvedTheme", () => {
  it("resolves explicit light mode", () => {
    expect(resolvedTheme("light")).toBe("light");
  });

  it("resolves explicit dark mode", () => {
    expect(resolvedTheme("dark")).toBe("dark");
  });

  it("follows the OS preference in system mode", () => {
    // The matchMedia mock in test setup reports matches: false (light).
    expect(resolvedTheme("system")).toBe("light");
  });

  it("falls back to dark when mode is undefined (matches previous app behavior)", () => {
    // matchMedia mock in test setup reports matches: false (light), but an
    // undefined setting must keep the historical default: dark.
    expect(resolvedTheme(undefined)).toBe("dark");
  });
});

describe("ACCENT_COLORS", () => {
  it("contains unique ids with hex colors", () => {
    const ids = ACCENT_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ACCENT_COLORS) {
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("includes the default zinc accent", () => {
    expect(ACCENT_COLORS.some((c) => c.id === "zinc")).toBe(true);
  });
});

describe("useTheme", () => {
  const root = document.documentElement;
  const storedTheme = () =>
    JSON.parse(localStorage.getItem("sonu-theme") ?? "null") as unknown;

  // The module asks for this media query once, at import time. The matchMedia
  // mock from src/test/setup.ts returns a plain object per call, so the one
  // the hook holds is found by its query string.
  const systemDark = vi
    .mocked(window.matchMedia)
    .mock.results.map((call) => call.value as MediaQueryList)
    .find((query) => query.media === "(prefers-color-scheme: dark)")!;
  const setSystemDark = (matches: boolean) =>
    Object.assign(systemDark, { matches });

  const seed = (theme_mode?: string, accent_color?: string) =>
    useSettingsStore.setState({
      settings: {
        bindings: {},
        push_to_talk: true,
        audio_feedback: false,
        theme_mode,
        accent_color,
      },
      isLoading: false,
    });

  beforeEach(() => {
    localStorage.clear();
    root.className = "";
    root.removeAttribute("data-accent");
    vi.mocked(systemDark.addEventListener).mockClear();
    vi.mocked(systemDark.removeEventListener).mockClear();
  });

  afterEach(() => {
    setSystemDark(false);
  });

  it("applies the theme and accent to <html> and mirrors them to localStorage", () => {
    seed("light", "violet");

    renderHook(() => useTheme());

    expect(root.classList.contains("light")).toBe(true);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.getAttribute("data-accent")).toBe("violet");
    expect(storedTheme()).toEqual({
      theme_mode: "light",
      accent_color: "violet",
    });
  });

  it("uses dark and zinc while settings have not loaded", () => {
    useSettingsStore.setState({ settings: null, isLoading: false });

    renderHook(() => useTheme());

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.getAttribute("data-accent")).toBe("zinc");
    expect(storedTheme()).toEqual({ theme_mode: "dark", accent_color: "zinc" });
  });

  it("falls back to zinc for an accent that is not in the palette", () => {
    seed("dark", "hotpink");

    renderHook(() => useTheme());

    expect(root.getAttribute("data-accent")).toBe("zinc");
  });

  it("re-applies when the stored theme changes", () => {
    seed("dark", "zinc");
    renderHook(() => useTheme());

    act(() => {
      seed("light", "rose");
    });

    expect(root.classList.contains("light")).toBe(true);
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.getAttribute("data-accent")).toBe("rose");
  });

  it("follows the OS preference in system mode, including later changes", () => {
    seed("system", "zinc");

    renderHook(() => useTheme());

    // The mocked media query reports light.
    expect(root.classList.contains("light")).toBe(true);
    expect(systemDark.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );

    const onChange = vi.mocked(systemDark.addEventListener).mock
      .calls[0][1] as () => void;
    setSystemDark(true);
    act(() => {
      onChange();
    });

    expect(root.classList.contains("dark")).toBe(true);
    expect(root.classList.contains("light")).toBe(false);
  });

  it("does not listen for OS changes when the mode is explicit", () => {
    seed("dark", "zinc");

    renderHook(() => useTheme());

    expect(systemDark.addEventListener).not.toHaveBeenCalled();
  });

  it("stops listening for OS changes on unmount", () => {
    seed("system", "zinc");
    const { unmount } = renderHook(() => useTheme());

    unmount();

    expect(systemDark.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    );
  });
});
