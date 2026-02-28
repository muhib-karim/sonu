import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { type ModelDownloadProgress } from "@/lib/types";

export interface ModelUpdateInfo {
  model_id: string;
  current_version: string;
  latest_version: string;
  changelog: string;
  download_url: string;
  is_required: boolean;
}

interface ModelUpdaterProps {
  onUpdateAvailable?: (updates: ModelUpdateInfo[]) => void;
}

/**
 * Model Update Checker Component
 *
 * Checks for available model updates and manages the update process.
 * Can be used as a standalone component or integrated into the settings page.
 */
export const ModelUpdater: React.FC<ModelUpdaterProps> = ({
  onUpdateAvailable,
}) => {
  const { t } = useTranslation();
  const [availableUpdates, setAvailableUpdates] = useState<ModelUpdateInfo[]>(
    [],
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});

  /**
   * Check for available model updates
   */
  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const updates = await invoke<ModelUpdateInfo[]>("check_model_updates");
      setAvailableUpdates(updates);

      if (updates.length > 0) {
        onUpdateAvailable?.(updates);
        toast.info(
          t("model.updates_available", "{{count}} model update(s) available", {
            count: updates.length,
          }),
          {
            duration: 5000,
            action: {
              label: t("buttons.view", "View"),
              onClick: () => showUpdateDialog(updates),
            },
          },
        );
      } else {
        toast.success(t("model.all_up_to_date", "All models are up to date"));
      }
    } catch (error) {
      console.error("Failed to check for model updates:", error);
      toast.error(
        t("errors.update_check_failed", "Failed to check for updates"),
      );
    } finally {
      setIsChecking(false);
    }
  }, [onUpdateAvailable, t]);

  /**
   * Download and install model updates
   */
  const installUpdate = useCallback(
    async (modelId: string) => {
      setIsUpdating(true);
      setDownloadProgress((prev) => ({ ...prev, [modelId]: 0 }));

      try {
        await invoke("download_model_update", { modelId });

        toast.success(
          t("model.update_installed", "Model {{model}} updated successfully", {
            model: modelId,
          }),
        );

        // Remove from available updates
        setAvailableUpdates((prev) =>
          prev.filter((u) => u.model_id !== modelId),
        );
      } catch (error) {
        console.error("Failed to install model update:", error);
        toast.error(
          t("errors.update_install_failed", "Failed to install update"),
        );
      } finally {
        setIsUpdating(false);
        setDownloadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[modelId];
          return newProgress;
        });
      }
    },
    [t],
  );

  /**
   * Install all available updates
   */
  const installAllUpdates = useCallback(async () => {
    for (const update of availableUpdates) {
      await installUpdate(update.model_id);
    }
  }, [availableUpdates, installUpdate]);

  /**
   * Show update dialog with details
   */
  const showUpdateDialog = (updates: ModelUpdateInfo[]) => {
    // This would typically open a modal dialog
    // For now, we'll just log to console
    console.log("Model updates available:", updates);
  };

  /**
   * Listen for download progress events
   */
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<ModelDownloadProgress>(
        "model-download-progress",
        (event) => {
          setDownloadProgress((prev) => ({
            ...prev,
            [event.payload.model_id]: event.payload.progress_percentage,
          }));
        },
      );
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, []);

  /**
   * Auto-check for updates on component mount (if enabled)
   */
  useEffect(() => {
    const shouldAutoCheck = true; // This would come from settings
    if (shouldAutoCheck) {
      // Delay the check to not interfere with app startup
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 30000); // Check after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  if (availableUpdates.length === 0 && !isChecking) {
    return (
      <button
        onClick={checkForUpdates}
        disabled={isChecking}
        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
      >
        {isChecking ? (
          <>
            <LoadingSpinner />
            {t("model.checking", "Checking...")}
          </>
        ) : (
          <>
            <RefreshIcon />
            {t("model.check_updates", "Check for Updates")}
          </>
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">
          {t("model.updates_available_title", "Model Updates Available")}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => checkForUpdates()}
            disabled={isChecking}
            className="px-3 py-1.5 text-sm bg-background border border-border rounded-md hover:bg-surface disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <RefreshIcon className="w-4 h-4" />
            {t("buttons.refresh", "Refresh")}
          </button>
          <button
            onClick={installAllUpdates}
            disabled={isUpdating || availableUpdates.length === 0}
            className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isUpdating ? (
              <>
                <LoadingSpinner />
                {t("model.updating", "Updating...")}
              </>
            ) : (
              t("model.update_all", "Update All")
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {availableUpdates.map((update) => (
          <div
            key={update.model_id}
            className="p-4 bg-surface border border-border rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-text">{update.model_id}</h4>
                <p className="text-sm text-text-secondary">
                  {t("model.version_info", "{{current}} → {{latest}}", {
                    current: update.current_version,
                    latest: update.latest_version,
                  })}
                </p>
              </div>
              {update.is_required && (
                <span className="px-2 py-1 text-xs bg-warning/10 text-warning rounded-full">
                  {t("model.required", "Required")}
                </span>
              )}
            </div>

            {update.changelog && (
              <div className="mb-3 text-sm text-text-secondary bg-background p-2 rounded">
                {update.changelog}
              </div>
            )}

            <div className="flex items-center justify-between">
              {downloadProgress[update.model_id] !== undefined ? (
                <div className="flex-1 mr-4">
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${downloadProgress[update.model_id]}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary mt-1">
                    {Math.round(downloadProgress[update.model_id])}%
                  </span>
                </div>
              ) : (
                <div />
              )}
              <button
                onClick={() => installUpdate(update.model_id)}
                disabled={
                  isUpdating || downloadProgress[update.model_id] !== undefined
                }
                className="px-3 py-1.5 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {downloadProgress[update.model_id] !== undefined
                  ? t("model.downloading", "Downloading...")
                  : t("buttons.update", "Update")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Loading spinner component
 */
const LoadingSpinner: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Refresh icon component
 */
const RefreshIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

/**
 * Hook to use model update checking
 */
export const useModelUpdater = () => {
  const [updates, setUpdates] = useState<ModelUpdateInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await invoke<ModelUpdateInfo[]>("check_model_updates");
      setUpdates(result);
      return result;
    } catch (error) {
      console.error("Failed to check for updates:", error);
      return [];
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    updates,
    isChecking,
    checkUpdates,
  };
};

export default ModelUpdater;
