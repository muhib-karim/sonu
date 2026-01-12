import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CancelIcon } from "../components/icons";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import { syncLanguageFromSettings } from "@/i18n";

type OverlayState = "recording" | "transcribing" | "done";

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0));
  const [previewText, setPreviewText] = useState<string>("");
  const smoothedLevelsRef = useRef<number[]>(Array(16).fill(0));

  useEffect(() => {
    const setupEventListeners = async () => {
      // Listen for show-overlay event from Rust
      const unlistenShow = await listen("show-overlay", async (event) => {
        await syncLanguageFromSettings();
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
        setPreviewText("");
      });

      // Listen for hide-overlay event from Rust
      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
        setPreviewText("");
      });

      // Listen for mic-level updates
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];

        // Apply smoothing to reduce jitter
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.7 + target * 0.3;
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, 9));
      });

      // Listen for preview text updates (live transcription)
      const unlistenPreview = await listen<string>("preview-text", (event) => {
        setPreviewText(event.payload || "");
      });

      // Listen for done state
      const unlistenDone = await listen("transcription-done", () => {
        setState("done");
        // Auto-hide after showing checkmark
        setTimeout(() => {
          setIsVisible(false);
        }, 800);
      });

      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
        unlistenPreview();
        unlistenDone();
      };
    };

    setupEventListeners();
  }, []);

  const handleCancel = () => {
    commands.cancelOperation();
  };

  const getStateClass = () => {
    if (state === "transcribing") return "processing";
    if (state === "done") return "done";
    return "";
  };

  return (
    <div
      className={`recording-overlay ${isVisible ? "fade-in" : ""} ${getStateClass()}`}
    >
      {/* Cancel button on left */}
      {state === "recording" && (
        <div className="overlay-left">
          <div className="cancel-button" onClick={handleCancel}>
            <CancelIcon />
          </div>
        </div>
      )}

      {/* Waveform or status in middle */}
      <div className="overlay-middle">
        {state === "recording" && (
          <div className="bars-container">
            {levels.map((v, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  height: `${Math.min(20, 4 + Math.pow(v, 0.7) * 16)}px`,
                  opacity: Math.max(0.3, v * 1.5),
                }}
              />
            ))}
          </div>
        )}
        {state === "transcribing" && (
          <span className="transcribing-text">
            {t("overlay.transcribing", "Processing...")}
          </span>
        )}
        {state === "done" && (
          <div className="done-checkmark">
            <svg viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Status text or preview on right */}
      <div className="overlay-right">
        {state === "recording" && !previewText && (
          <span className="status-text">
            {t("overlay.listening", "Listening...")}
          </span>
        )}
        {state === "recording" && previewText && (
          <div className="preview-container">
            <span className="preview-text">{previewText}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;
