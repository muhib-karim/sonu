import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { useSettings } from "../../../hooks/useSettings";
import { ACCENT_COLORS, resolvedTheme } from "../../../hooks/useTheme";

const THEME_MODES = ["light", "dark", "system"] as const;

const SunIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const MonitorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="14" x="2" y="3" rx="2" />
    <line x1="8" x2="16" y1="21" y2="21" />
    <line x1="12" x2="12" y1="17" y2="21" />
  </svg>
);

const MODE_ICONS: Record<
  (typeof THEME_MODES)[number],
  React.FC<{ className?: string }>
> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

export const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSetting, isUpdating } = useSettings();

  const themeMode = settings?.theme_mode ?? "dark";
  const accentColor = settings?.accent_color ?? "zinc";
  const livePreview = settings?.show_live_preview ?? true;

  // Roving-tabindex arrow-key navigation for the theme radiogroup (APG).
  const handleThemeKeyNav = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)
    )
      return;
    event.preventDefault();
    const idx = THEME_MODES.indexOf(themeMode as (typeof THEME_MODES)[number]);
    const current = idx === -1 ? 0 : idx;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? (current + 1) % THEME_MODES.length
        : (current + THEME_MODES.length - 1) % THEME_MODES.length;
    const mode = THEME_MODES[next];
    updateSetting("theme_mode", mode);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-testid="theme-mode-${mode}"]`)
      ?.focus();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl pb-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("appearance.title", "Appearance")}
      </h1>

      <SettingsGroup
        title={t("appearance.theme.title", "Theme")}
        description={t(
          "appearance.theme.description",
          "Choose how SONU looks. System follows your OS setting.",
        )}
      >
        <div className="flex flex-col gap-3 px-4 py-3">
          <div
            className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-muted"
            role="radiogroup"
            aria-label={t("appearance.theme.title", "Theme")}
            onKeyDown={handleThemeKeyNav}
          >
            {THEME_MODES.map((mode) => {
              const Icon = MODE_ICONS[mode];
              const active = themeMode === mode;
              return (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={active}
                  tabIndex={active ? 0 : -1}
                  data-testid={`theme-mode-${mode}`}
                  onClick={() => updateSetting("theme_mode", mode)}
                  className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-surface text-text shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(`appearance.theme.modes.${mode}`, mode)}
                </button>
              );
            })}
          </div>
          <ThemePreview mode={themeMode} accent={accentColor} />
        </div>
      </SettingsGroup>

      <SettingsGroup
        title={t("appearance.accent.title", "Accent color")}
        description={t(
          "appearance.accent.description",
          "Used for highlights, focus rings, and the active states.",
        )}
      >
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color.id}
              data-testid={`accent-${color.id}`}
              aria-label={color.label}
              title={color.label}
              aria-pressed={accentColor === color.id}
              onClick={() => updateSetting("accent_color", color.id)}
              className={`w-7 h-7 rounded-full transition-all duration-150 ring-offset-2 ring-offset-surface ${
                accentColor === color.id
                  ? "ring-2 ring-accent scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: color.color }}
            />
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("appearance.recording.title", "Recording")}>
        <ToggleSwitch
          checked={livePreview}
          onChange={(enabled) => updateSetting("show_live_preview", enabled)}
          isUpdating={isUpdating("show_live_preview")}
          label={t(
            "appearance.livePreview.label",
            "Live transcription preview",
          )}
          description={t(
            "appearance.livePreview.description",
            "Show text while you speak in the recording overlay. Requires a local model.",
          )}
          descriptionMode="tooltip"
          grouped={true}
        />
      </SettingsGroup>
    </div>
  );
};

/* Mini preview card that reflects the chosen theme + accent immediately. */
const ThemePreview: React.FC<{ mode: string; accent: string }> = ({
  mode,
  accent,
}) => {
  const { t } = useTranslation();
  const resolved = resolvedTheme(mode);
  const accentHex =
    ACCENT_COLORS.find((c) => c.id === accent)?.color ?? "#a1a1aa";

  const dark = resolved === "dark";
  const bg = dark ? "#131316" : "#ffffff";
  const bgMuted = dark ? "#1c1c1f" : "#f4f4f5";
  const text = dark ? "#fafafa" : "#18181b";
  const textMuted = dark ? "#a1a1aa" : "#52525b";
  const border = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  return (
    <div
      className="rounded-lg border p-3 flex items-center gap-3 transition-colors duration-200"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${accentHex}26` }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full"
          style={{ backgroundColor: accentHex }}
        />
      </div>
      <div className="flex flex-col gap-1 flex-1">
        <div
          className="h-2 rounded-full w-2/3"
          style={{ backgroundColor: text, opacity: 0.85 }}
        />
        <div
          className="h-2 rounded-full w-1/3"
          style={{ backgroundColor: textMuted, opacity: 0.5 }}
        />
      </div>
      <div
        className="px-2.5 py-1 rounded-md text-xs font-medium"
        style={{ backgroundColor: bgMuted, color: textMuted }}
      >
        {t(`appearance.theme.modes.${mode}`, mode)}
      </div>
    </div>
  );
};
