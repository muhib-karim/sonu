import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { commands, type ModelInfo } from "@/bindings";

// Minimal shared model state: the model list + current selection,
// refreshed on change events. (Download/select machinery lives in
// ModelSelector, which owns that state itself.)
export const useCurrentModel = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [currentModel, setCurrentModel] = useState<string>("");

  const loadCurrentModel = useCallback(async () => {
    try {
      const [modelsResult, currentResult] = await Promise.all([
        commands.getAvailableModels(),
        commands.getCurrentModel(),
      ]);
      if (modelsResult.status === "ok") setModels(modelsResult.data);
      if (currentResult.status === "ok") setCurrentModel(currentResult.data);
    } catch (err) {
      console.error("Failed to load models:", err);
    }
  }, []);

  useEffect(() => {
    void loadCurrentModel();
    const unlisten = listen("model-state-changed", () => {
      void loadCurrentModel();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [loadCurrentModel]);

  return { models, currentModel, loadCurrentModel };
};
