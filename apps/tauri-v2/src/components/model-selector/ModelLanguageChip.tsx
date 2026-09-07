import React from "react";
import { useTranslation } from "react-i18next";
import type { ModelInfo } from "@/bindings";
import { getModelLanguages } from "./modelRecommendation";

interface ModelLanguageChipProps {
  model: ModelInfo;
}

/**
 * Subtle chip showing a model's language coverage ("en" -> "EN",
 * several languages -> "Multilingual"). Renders nothing when the model
 * has no language coverage.
 */
const ModelLanguageChip: React.FC<ModelLanguageChipProps> = ({ model }) => {
  const { t } = useTranslation();
  const languages = getModelLanguages(model);

  if (languages.length === 0) return null;

  const isSingleLanguage = languages.length === 1;

  return (
    <span
      className={`inline-block rounded bg-accent-soft px-1 py-px text-[10px] font-medium text-accent ml-1.5 ${
        isSingleLanguage ? "uppercase" : ""
      }`}
    >
      {isSingleLanguage
        ? languages[0]
        : t("modelSelector.multilingual", "Multilingual")}
    </span>
  );
};

export default ModelLanguageChip;
