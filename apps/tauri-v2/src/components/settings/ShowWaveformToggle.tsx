import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

interface ShowWaveformToggleProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ShowWaveformToggle: React.FC<ShowWaveformToggleProps> = ({
  descriptionMode = "inline",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();

  const showWaveform = getSetting("show_waveform") ?? true;

  const handleToggle = async (checked: boolean) => {
    await updateSetting("show_waveform", checked);
  };

  return (
    <ToggleSwitch
      label={t("settings.debug.showWaveform.label")}
      description={t("settings.debug.showWaveform.description")}
      checked={showWaveform}
      onChange={handleToggle}
      descriptionMode={descriptionMode}
      grouped={grouped}
    />
  );
};
