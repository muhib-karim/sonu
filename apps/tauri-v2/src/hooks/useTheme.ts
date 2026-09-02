import { useEffect } from "react";
import { useSettings } from "../hooks/useSettings";

export type ResolvedTheme = "light" | "dark";

export const ACCENT_COLORS = [
  { id: "zinc", label: "Zinc", color: "#a1a1aa" },
  { id: "violet", label: "Violet", color: "#8b5cf6" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
  { id: "green", label: "Green", color: "#22c55e" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number]["id"];

const VALID_ACCENTS = new Set(ACCENT_COLORS.map((a) => a.id));

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const THEME_STORAGE_KEY = "sonu-theme";

/**
 * Mirrors the current theme settings to localStorage so the inline script in
 * index.html can restore the theme before first paint (no dark flash for
 * light-theme users while the backend settings load).
 */
function persistTheme(mode: string | undefined, accent: string | undefined) {
  try {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({
        theme_mode: mode ?? "dark",
        accent_color: accent ?? "zinc",
      }),
    );
  } catch {
    // localStorage may be unavailable; pre-paint restore then just falls
    // back to the static dark default.
  }
}

function resolveTheme(mode: string | undefined): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  if (mode === "system") return systemDark.matches ? "dark" : "light";
  // Settings still loading or unknown value: keep the historical default.
  return "dark";
}

function applyTheme(resolved: ResolvedTheme, accent: string | undefined) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
  const safeAccent =
    accent && VALID_ACCENTS.has(accent as AccentColor) ? accent : "zinc";
  root.setAttribute("data-accent", safeAccent);
}

/**
 * Applies the persisted theme mode + accent color to <html> and keeps the
 * resolved theme in sync with OS changes while mode is "system".
 */
export function useTheme() {
  const { settings } = useSettings();
  const mode = settings?.theme_mode;
  const accent = settings?.accent_color;

  useEffect(() => {
    applyTheme(resolveTheme(mode), accent);
    persistTheme(mode, accent);
  }, [mode, accent]);

  useEffect(() => {
    if (mode !== "system" && mode !== undefined) return;
    const onChange = () => applyTheme(resolveTheme(mode), accent);
    systemDark.addEventListener("change", onChange);
    return () => systemDark.removeEventListener("change", onChange);
  }, [mode, accent]);
}

export function resolvedTheme(mode: string | undefined): ResolvedTheme {
  return resolveTheme(mode);
}
