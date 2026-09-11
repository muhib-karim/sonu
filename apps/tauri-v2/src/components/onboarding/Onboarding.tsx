import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { commands, type ModelInfo } from "@/bindings";
import ModelCard from "./ModelCard";
import SonuLogo from "../icons/SonuLogo";
import { isRecommendedModel } from "../model-selector/modelRecommendation";

interface OnboardingProps {
  onModelSelected: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onModelSelected }) => {
  const { t } = useTranslation();
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const result = await commands.getAvailableModels();
      if (result.status === "ok") {
        // Only show downloadable models for onboarding
        setAvailableModels(result.data.filter((m) => !m.is_downloaded));
      } else {
        setError(t("onboarding.errors.loadModels"));
      }
    } catch (err) {
      console.error("Failed to load models:", err);
      setError(t("onboarding.errors.loadModels"));
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    setDownloading(true);
    setError(null);

    // Immediately transition to main app - download will continue in footer
    onModelSelected();

    // Report failures through a toast, not `setError`.
    //
    // `onModelSelected()` unmounts this component, so the `setError` calls that
    // used to live here wrote into a dead tree: the user was dropped into the
    // app with no model and no explanation of why. The toast renders from the
    // main app's `<Toaster>`, so it survives the transition.
    //
    // Reuses the existing `onboarding.errors.downloadModel` key so every
    // locale keeps working without a new translation.
    try {
      const result = await commands.downloadModel(modelId);
      if (result.status === "error") {
        console.error("Download failed:", result.error);
        toast.error(
          t("onboarding.errors.downloadModel", { error: result.error }),
          { duration: 15000 },
        );
      }
    } catch (err) {
      console.error("Download failed:", err);
      toast.error(
        t("onboarding.errors.downloadModel", { error: String(err) }),
        { duration: 15000 },
      );
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-4 inset-0 bg-background">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <SonuLogo size="xl" />
        <p className="text-text/70 max-w-md font-medium mx-auto">
          {t("onboarding.subtitle")}
        </p>
      </div>

      <div className="max-w-[600px] w-full mx-auto text-center flex-1 flex flex-col min-h-0">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4 shrink-0">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-4 ">
          {/* Recommended models first, then by size */}
          {[...availableModels]
            .sort(
              (a, b) =>
                Number(isRecommendedModel(b)) - Number(isRecommendedModel(a)) ||
                (isRecommendedModel(a) ? 0 : a.size_mb - b.size_mb),
            )
            .map((model) => (
              <ModelCard
                key={model.id}
                model={model}
                variant={isRecommendedModel(model) ? "featured" : "default"}
                disabled={downloading}
                onSelect={handleDownloadModel}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
