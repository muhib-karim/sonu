import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface ContextAwarenessToggleProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ContextAwarenessToggle: React.FC<ContextAwarenessToggleProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const enabled = getSetting("context_awareness_enabled");
    const contextAwarenessEnabled = enabled === undefined ? true : enabled;

    return (
      <ToggleSwitch
        checked={contextAwarenessEnabled}
        onChange={(enabled) =>
          updateSetting("context_awareness_enabled", enabled)
        }
        isUpdating={isUpdating("context_awareness_enabled")}
        label={t("style.contextAwareness.label")}
        description={t("style.contextAwareness.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  });
