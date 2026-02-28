import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { commands, type OfflineLLMModelInfo } from "@/bindings";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { SettingContainer, SettingsGroup } from "@/components/ui";
import { useSettings } from "../../../hooks/useSettings";

interface DownloadProgress {
  model_id: string;
  downloaded: number;
  total: number;
  percentage: number;
}

interface DownloadStats {
  startTime: number;
  lastUpdate: number;
  totalDownloaded: number;
  speed: number;
}

const OfflineLLMModelCard: React.FC<{
  model: OfflineLLMModelInfo;
  isSelected: boolean;
  downloadProgress?: DownloadProgress;
  downloadStats?: DownloadStats;
  onSelect: (modelId: string) => void;
  onDownload: (modelId: string) => void;
  onDelete: (modelId: string) => void;
}> = ({
  model,
  isSelected,
  downloadProgress,
  downloadStats,
  onSelect,
  onDownload,
  onDelete,
}) => {
  const { t } = useTranslation();
  const isDownloading = model.is_downloading || !!downloadProgress;
  const percentage = downloadProgress
    ? Math.max(0, Math.min(100, Math.round(downloadProgress.percentage)))
    : 0;

  const formatSpeed = (speed: number): string => {
    if (speed < 1) {
      return `${Math.round(speed * 1024)} KB/s`;
    }
    return `${speed.toFixed(1)} MB/s`;
  };

  const formatSize = (mb: number): string => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isSelected
          ? "border-accent bg-accent/5"
          : "border-mid-gray/20 hover:border-mid-gray/40"
      } ${model.is_downloaded ? "cursor-pointer" : ""}`}
      onClick={() => model.is_downloaded && onSelect(model.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-text">{model.name}</h4>
            {isSelected && model.is_downloaded && (
              <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded">
                {t("modelSelector.active")}
              </span>
            )}
          </div>
          <p className="text-sm text-mid-gray mt-1">{model.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-mid-gray">
            <span>{formatSize(model.size_mb)}</span>
            <div className="flex items-center gap-1">
              <span>{t("onboarding.modelCard.speed")}:</span>
              <div className="w-16 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${model.speed_score * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span>{t("settings.offlineLLM.quality")}:</span>
              <div className="w-16 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${model.quality_score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isDownloading ? (
            <div className="text-center">
              <div className="w-20 h-1.5 bg-mid-gray/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-mid-gray mt-1 block">
                {percentage}%
                {downloadStats && downloadStats.speed > 0 && (
                  <span className="ml-1">
                    ({formatSpeed(downloadStats.speed)})
                  </span>
                )}
              </span>
            </div>
          ) : model.is_downloaded ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(model.id);
              }}
              className="text-xs text-red-500 hover:text-red-600 px-3 py-1.5 rounded border border-red-500/20 hover:border-red-500/40 transition-colors"
            >
              {t("common.delete")}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(model.id);
              }}
              className="text-xs text-accent hover:text-accent/80 px-3 py-1.5 rounded border border-accent/20 hover:border-accent/40 transition-colors"
            >
              {t("modelSelector.download")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const OfflineLLMToggle: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const enabled = getSetting("offline_post_process_enabled") || false;

  return (
    <ToggleSwitch
      checked={enabled}
      onChange={(enabled) =>
        updateSetting("offline_post_process_enabled", enabled)
      }
      isUpdating={isUpdating("offline_post_process_enabled")}
      label={t("settings.offlineLLM.toggle.label")}
      description={t("settings.offlineLLM.toggle.description")}
      descriptionMode="tooltip"
      grouped={true}
    />
  );
};

const OfflineLLMModelSelector: React.FC = () => {
  const { t } = useTranslation();
  const [models, setModels] = useState<OfflineLLMModelInfo[]>([]);
  const [currentModelId, setCurrentModelId] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<
    Map<string, DownloadProgress>
  >(new Map());
  const [downloadStats, setDownloadStats] = useState<
    Map<string, DownloadStats>
  >(new Map());
  const { getSetting } = useSettings();

  const enabled = getSetting("offline_post_process_enabled") || false;

  useEffect(() => {
    loadModels();
    loadCurrentModel();

    const downloadProgressUnlisten = listen<DownloadProgress>(
      "offline-llm-download-progress",
      (event) => {
        const progress = event.payload;
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.set(progress.model_id, progress);
          return newMap;
        });

        // Update download stats for speed calculation
        const now = Date.now();
        setDownloadStats((prev) => {
          const current = prev.get(progress.model_id);
          const newStats = new Map(prev);

          if (!current) {
            newStats.set(progress.model_id, {
              startTime: now,
              lastUpdate: now,
              totalDownloaded: progress.downloaded,
              speed: 0,
            });
          } else {
            const timeDiff = (now - current.lastUpdate) / 1000;
            const bytesDiff = progress.downloaded - current.totalDownloaded;

            if (timeDiff > 0.5) {
              const currentSpeed = bytesDiff / (1024 * 1024) / timeDiff;
              const validCurrentSpeed = Math.max(0, currentSpeed);
              const smoothedSpeed =
                current.speed > 0
                  ? current.speed * 0.8 + validCurrentSpeed * 0.2
                  : validCurrentSpeed;

              newStats.set(progress.model_id, {
                startTime: current.startTime,
                lastUpdate: now,
                totalDownloaded: progress.downloaded,
                speed: Math.max(0, smoothedSpeed),
              });
            }
          }

          return newStats;
        });
      },
    );

    const downloadCompleteUnlisten = listen<string>(
      "offline-llm-download-complete",
      (event) => {
        const modelId = event.payload;
        setDownloadProgress((prev) => {
          const newMap = new Map(prev);
          newMap.delete(modelId);
          return newMap;
        });
        setDownloadStats((prev) => {
          const newStats = new Map(prev);
          newStats.delete(modelId);
          return newStats;
        });
        loadModels();

        // Auto-select the newly downloaded model
        setTimeout(() => {
          handleModelSelect(modelId);
        }, 500);
      },
    );

    return () => {
      downloadProgressUnlisten.then((fn) => fn());
      downloadCompleteUnlisten.then((fn) => fn());
    };
  }, []);

  const loadModels = async () => {
    try {
      const result = await commands.getAvailableOfflineLlmModels();
      if (result.status === "ok") {
        setModels(result.data);
      }
    } catch (err) {
      console.error("Failed to load offline LLM models:", err);
    }
  };

  const loadCurrentModel = async () => {
    try {
      const result = await commands.getCurrentOfflineLlmModel();
      if (result.status === "ok") {
        setCurrentModelId(result.data);
      }
    } catch (err) {
      console.error("Failed to load current offline LLM model:", err);
    }
  };

  const handleModelSelect = async (modelId: string) => {
    try {
      setCurrentModelId(modelId);
      const result = await commands.setActiveOfflineLlmModel(modelId);
      if (result.status === "error") {
        console.error("Failed to set active offline LLM model:", result.error);
      }
    } catch (err) {
      console.error("Failed to select offline LLM model:", err);
    }
  };

  const handleModelDownload = async (modelId: string) => {
    try {
      const result = await commands.downloadOfflineLlmModel(modelId);
      if (result.status === "error") {
        console.error("Failed to download offline LLM model:", result.error);
      }
    } catch (err) {
      console.error("Failed to download offline LLM model:", err);
    }
  };

  const handleModelDelete = async (modelId: string) => {
    try {
      const result = await commands.deleteOfflineLlmModel(modelId);
      if (result.status === "ok") {
        await loadModels();
        if (currentModelId === modelId) {
          setCurrentModelId("");
        }
      }
    } catch (err) {
      console.error("Failed to delete offline LLM model:", err);
    }
  };

  if (!enabled) {
    return (
      <div className="p-4 bg-mid-gray/5 rounded-lg border border-mid-gray/20">
        <p className="text-sm text-mid-gray">
          {t("settings.offlineLLM.disabledNotice")}
        </p>
      </div>
    );
  }

  return (
    <SettingContainer
      title={t("settings.offlineLLM.modelSelector.title")}
      description={t("settings.offlineLLM.modelSelector.description")}
      descriptionMode="tooltip"
      layout="stacked"
      grouped={true}
    >
      <div className="space-y-3">
        {models.map((model) => (
          <OfflineLLMModelCard
            key={model.id}
            model={model}
            isSelected={currentModelId === model.id}
            downloadProgress={downloadProgress.get(model.id)}
            downloadStats={downloadStats.get(model.id)}
            onSelect={handleModelSelect}
            onDownload={handleModelDownload}
            onDelete={handleModelDelete}
          />
        ))}
        {models.length === 0 && (
          <p className="text-sm text-mid-gray text-center py-4">
            {t("common.loading")}
          </p>
        )}
      </div>
    </SettingContainer>
  );
};

export const OfflineLLMSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.offlineLLM.title")}>
        <OfflineLLMToggle />
        <OfflineLLMModelSelector />
      </SettingsGroup>

      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <h4 className="text-sm font-medium text-blue-400 mb-2">
          {t("settings.offlineLLM.info.title")}
        </h4>
        <p className="text-xs text-mid-gray">
          {t("settings.offlineLLM.info.description")}
        </p>
      </div>
    </div>
  );
};

export default OfflineLLMSettings;
