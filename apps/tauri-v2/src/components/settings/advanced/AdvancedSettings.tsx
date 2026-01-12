import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShowOverlay } from "../ShowOverlay";
import { TranslateToEnglish } from "../TranslateToEnglish";
import { ModelUnloadTimeoutSetting } from "../ModelUnloadTimeout";
import { CustomWords } from "../CustomWords";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { StartHidden } from "../StartHidden";
import { AutostartToggle } from "../AutostartToggle";
import { PasteMethodSetting } from "../PasteMethod";
import { ClipboardHandlingSetting } from "../ClipboardHandling";

export const AdvancedSettings: React.FC = () => {
  const { t } = useTranslation();
  const [llmEnabled, setLlmEnabled] = useState(false);

  // Load LLM setting
  useEffect(() => {
    const saved = localStorage.getItem("sonu-styles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLlmEnabled(parsed.llmEnabled || false);
      } catch (e) {
        console.error("Failed to load LLM setting:", e);
      }
    }
  }, []);

  // Save LLM setting
  const toggleLlm = (enabled: boolean) => {
    setLlmEnabled(enabled);
    const saved = localStorage.getItem("sonu-styles");
    const parsed = saved ? JSON.parse(saved) : {};
    parsed.llmEnabled = enabled;
    localStorage.setItem("sonu-styles", JSON.stringify(parsed));
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.advanced.title")}>
        <StartHidden descriptionMode="tooltip" grouped={true} />
        <AutostartToggle descriptionMode="tooltip" grouped={true} />
        <ShowOverlay descriptionMode="tooltip" grouped={true} />
        <PasteMethodSetting descriptionMode="tooltip" grouped={true} />
        <ClipboardHandlingSetting descriptionMode="tooltip" grouped={true} />
        <TranslateToEnglish descriptionMode="tooltip" grouped={true} />
        <ModelUnloadTimeoutSetting descriptionMode="tooltip" grouped={true} />
        <CustomWords descriptionMode="tooltip" grouped />
      </SettingsGroup>

      {/* LLM Post-Processing */}
      <SettingsGroup title={t("style.llmSection", "AI Post-Processing")}>
        <div className="flex items-center justify-between p-3">
          <div className="flex-1">
            <h3 className="text-sm font-medium">
              {t("style.llmToggle", "Enable LLM Post-Processing")}
            </h3>
            <p className="text-xs text-mid-gray mt-1">
              {t("style.llmDescription", "Use AI model for advanced text transformation. Requires API key.")}
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={llmEnabled}
              onChange={(e) => toggleLlm(e.target.checked)}
            />
            <div className="relative w-11 h-6 bg-mid-gray/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
          </label>
        </div>
      </SettingsGroup>
    </div>
  );
};
