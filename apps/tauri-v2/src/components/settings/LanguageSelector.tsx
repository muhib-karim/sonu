import React from "react";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { Select } from "../ui/Select";
import { useSettings } from "../../hooks/useSettings";
import { useCurrentModel } from "../../hooks/useCurrentModel";
import { LANGUAGES } from "../../lib/constants/languages";

interface LanguageSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const unsupportedModels = ["parakeet-tdt-0.6b-v2", "parakeet-tdt-0.6b-v3"];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, resetSetting, isUpdating } = useSettings();
  const { currentModel } = useCurrentModel();

  const selectedLanguage = getSetting("selected_language") || "auto";
  const isUnsupported = unsupportedModels.includes(currentModel);
  const busy = isUpdating("selected_language");

  const handleReset = async () => {
    await resetSetting("selected_language");
  };

  return (
    <SettingContainer
      title={t("settings.general.language.title")}
      description={
        isUnsupported
          ? t("settings.general.language.descriptionUnsupported")
          : t("settings.general.language.description")
      }
      descriptionMode={descriptionMode}
      grouped={grouped}
      disabled={isUnsupported}
    >
      <div className="flex items-center space-x-1">
        <Select
          className="min-w-[200px]"
          value={isUnsupported ? "auto" : selectedLanguage}
          options={LANGUAGES}
          onChange={(value) => {
            if (value) void updateSetting("selected_language", value);
          }}
          placeholder={t("settings.general.language.searchPlaceholder")}
          disabled={busy || isUnsupported}
          isClearable={false}
        />
        <ResetButton onClick={handleReset} disabled={busy || isUnsupported} />
      </div>
      {busy && (
        <div className="absolute inset-0 bg-mid-gray/10 rounded flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-logo-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </SettingContainer>
  );
};
