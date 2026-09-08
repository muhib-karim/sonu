import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";
import { useCurrentModel } from "../../hooks/useCurrentModel";

interface TranslateToEnglishProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

const unsupportedTranslationModels = [
  "parakeet-tdt-0.6b-v2",
  "parakeet-tdt-0.6b-v3",
  "turbo",
];

export const TranslateToEnglish: React.FC<TranslateToEnglishProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const { currentModel, models } = useCurrentModel();

    const translateToEnglish = getSetting("translate_to_english") || false;
    const isDisabledTranslation =
      unsupportedTranslationModels.includes(currentModel);

    const description = useMemo(() => {
      if (isDisabledTranslation) {
        const currentModelDisplayName = models.find(
          (model) => model.id === currentModel,
        )?.name;
        return t(
          "settings.advanced.translateToEnglish.descriptionUnsupported",
          {
            model: currentModelDisplayName,
          },
        );
      }

      return t("settings.advanced.translateToEnglish.description");
    }, [t, models, currentModel, isDisabledTranslation]);

    return (
      <ToggleSwitch
        checked={translateToEnglish}
        onChange={(enabled) => updateSetting("translate_to_english", enabled)}
        isUpdating={isUpdating("translate_to_english")}
        disabled={isDisabledTranslation}
        label={t("settings.advanced.translateToEnglish.label")}
        description={description}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
    );
  },
);
