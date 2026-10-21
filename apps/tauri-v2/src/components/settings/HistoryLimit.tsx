import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import {
  MAX_HISTORY_LIMIT,
  parseHistoryLimit,
} from "../../lib/utils/settingsInput";
import { Input } from "../ui/Input";
import { SettingContainer } from "../ui/SettingContainer";

interface HistoryLimitProps {
  descriptionMode?: "tooltip" | "inline";
  grouped?: boolean;
}

export const HistoryLimit: React.FC<HistoryLimitProps> = ({
  descriptionMode = "inline",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const historyLimit = getSetting("history_limit") ?? 5;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseHistoryLimit(event.target.value);
    if (value !== null) {
      void updateSetting("history_limit", value);
    }
  };

  return (
    <SettingContainer
      title={t("settings.debug.historyLimit.title")}
      description={t("settings.debug.historyLimit.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
      layout="horizontal"
    >
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min="0"
          max={MAX_HISTORY_LIMIT}
          value={historyLimit}
          onChange={handleChange}
          disabled={isUpdating("history_limit")}
          className="w-20"
        />
        <span className="text-sm text-text">
          {t("settings.debug.historyLimit.entries")}
        </span>
      </div>
    </SettingContainer>
  );
};
