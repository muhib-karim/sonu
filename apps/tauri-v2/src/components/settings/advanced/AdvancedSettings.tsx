import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "@/hooks/useSettings";
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
  // Read and write through the settings store. This component previously kept
  // its own `llmEnabled` state and called the backend directly, so the Sidebar
  // (which reads `post_process_enabled` from the store) never learned the new
  // value and the Post Processing nav item stayed hidden.
  const { settings, updateSetting } = useSettings();
  const llmEnabled = settings?.post_process_enabled ?? false;

  const toggleLlm = async (enabled: boolean) => {
    await updateSetting("post_process_enabled", enabled);
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
              {t(
                "style.llmDescription",
                "Use AI model for advanced text transformation. Requires API key.",
              )}
            </p>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={llmEnabled}
              onChange={(e) => toggleLlm(e.target.checked)}
            />
            <div className="relative w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
          </label>
        </div>
      </SettingsGroup>
    </div>
  );
};
