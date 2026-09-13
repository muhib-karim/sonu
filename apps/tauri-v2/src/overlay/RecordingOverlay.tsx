import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CancelIcon } from "../components/icons";
import { parsePreviewPayload, type PreviewText } from "./preview";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import { unwrapResult } from "@/lib/utils/result";
import { syncLanguageFromSettings } from "@/i18n";

type OverlayState = "recording" | "transcribing" | "done";

const EMPTY_PREVIEW: PreviewText = { stable: "", partial: "" };

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0));
  const [preview, setPreview] = useState<PreviewText>(EMPTY_PREVIEW);
  const [doneWordCount, setDoneWordCount] = useState(0);
  const [isCloudMode, setIsCloudMode] = useState(false);
  const smoothedLevelsRef = useRef<number[]>(Array(16).fill(0));
  /** Pending auto-hide timer, tracked so a new recording can cancel it. */
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Incremented on every show/hide. Async work captures the value it started
   * with and drops its result if the session has moved on, so a slow response
   * from an earlier recording cannot overwrite a newer one.
   */
  const sessionRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    // A listener that resolves after unmount must be unregistered immediately.
    // The previous implementation returned its cleanup from the inner async
    // function, so React never received it and every remount (including
    // StrictMode's deliberate double-invoke) leaked another set of listeners.
    const unlisteners: Array<() => void> = [];
    const track = (unlisten: () => void) => {
      if (disposed) {
        unlisten();
      } else {
        unlisteners.push(unlisten);
      }
    };

    const clearAutoHide = () => {
      if (autoHideTimerRef.current !== null) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };

    const setupEventListeners = async () => {
      // Check cloud transcription status
      try {
        const status = unwrapResult(
          await commands.getCloudTranscriptionStatus(),
        );
        if (!disposed) setIsCloudMode(status.enabled);
      } catch {
        // Local mode by default
      }

      // Listen for show-overlay event from Rust
      track(
        await listen("show-overlay", (event) => {
          // A new session starts here: cancel any pending auto-hide left over
          // from the previous recording, or it would hide this one mid-way.
          clearAutoHide();
          const session = ++sessionRef.current;

          // Apply the recording state synchronously. This used to await
          // `syncLanguageFromSettings()` first, so a slow IPC response could
          // land after a newer show/hide and resurrect stale state.
          setState(event.payload as OverlayState);
          setIsVisible(true);
          setPreview(EMPTY_PREVIEW);
          setDoneWordCount(0);
          // A fresh recording starts silent — don't flash the previous
          // recording's mic levels or a stale "Listening" label.
          setLevels(Array(9).fill(0));
          smoothedLevelsRef.current = Array(16).fill(0);

          // Language sync and the cloud re-check are independent of the state
          // above and must not delay it.
          void syncLanguageFromSettings();

          void (async () => {
            try {
              const status = unwrapResult(
                await commands.getCloudTranscriptionStatus(),
              );
              if (!disposed && sessionRef.current === session) {
                setIsCloudMode(status.enabled);
              }
            } catch {
              // Keep previous state
            }
          })();
        }),
      );

      // Listen for hide-overlay event from Rust
      track(
        await listen("hide-overlay", () => {
          clearAutoHide();
          sessionRef.current += 1; // invalidate in-flight work
          setIsVisible(false);
          setPreview(EMPTY_PREVIEW);
        }),
      );

      // Listen for mic-level updates
      track(
        await listen<number[]>("mic-level", (event) => {
          const newLevels = event.payload as number[];

          // Apply smoothing to reduce jitter
          const smoothed = smoothedLevelsRef.current.map((prev, i) => {
            const target = newLevels[i] || 0;
            return prev * 0.7 + target * 0.3;
          });

          smoothedLevelsRef.current = smoothed;
          setLevels(smoothed.slice(0, 9));
        }),
      );

      // Listen for preview text updates (streaming live transcription:
      // { stable, partial } — the confirmed prefix and the volatile tail).
      track(
        await listen("preview-text", (event) => {
          const parsed = parsePreviewPayload(event.payload);
          setPreview(parsed);
          setDoneWordCount(
            (parsed.stable + " " + parsed.partial).split(/\s+/).filter(Boolean)
              .length,
          );
        }),
      );

      // Listen for done state
      track(
        await listen<{ word_count?: number }>("transcription-done", (event) => {
          const session = sessionRef.current;
          setState("done");
          // Prefer the authoritative word count from the backend's final text;
          // fall back to the last preview-derived count we tracked.
          if (typeof event.payload?.word_count === "number") {
            setDoneWordCount(event.payload.word_count);
          }

          clearAutoHide();
          // `setTimeout` accepts a void callback; the async work is wrapped so
          // its rejection is handled rather than escaping as an unhandled
          // rejection on a timer.
          autoHideTimerRef.current = setTimeout(() => {
            autoHideTimerRef.current = null;
            void (async () => {
              // A new recording may have started during the delay; if so this
              // timer belongs to a finished session and must do nothing.
              if (disposed || sessionRef.current !== session) return;

              setIsVisible(false);
              // Hide the actual Tauri window after fade-out
              try {
                await getCurrentWindow().hide();
              } catch (e) {
                console.error("Failed to hide overlay window:", e);
              }
            })();
          }, 800);
        }),
      );
    };

    void setupEventListeners();

    return () => {
      disposed = true;
      clearAutoHide();
      unlisteners.forEach((unlisten) => unlisten());
      unlisteners.length = 0;
    };
  }, []);

  const handleCancel = () => {
    void commands.cancelOperation();
  };

  const getStateClass = () => {
    if (state === "transcribing") return "processing";
    if (state === "done") return "done";
    return "";
  };

  return (
    <div
      className={`recording-overlay ${isVisible ? "fade-in" : ""} ${getStateClass()} ${isCloudMode ? "cloud-mode" : ""}`}
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
          <div className="transcribing-indicator">
            <div className="transcribing-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        {state === "done" && (
          <div className="done-checkmark">
            <svg viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {state === "done" && (
          <span className="done-summary">
            {t("overlay.doneSummary", "{{count}} words", {
              count: doneWordCount,
            })}
          </span>
        )}
      </div>

      {/* Status text or preview on right */}
      <div className="overlay-right">
        {state === "recording" && !preview.stable && !preview.partial && (
          <span className="status-text">
            {t("overlay.listening", "Listening...")}
          </span>
        )}
        {state === "recording" && (preview.stable || preview.partial) && (
          <div className="preview-container">
            <span className="preview-text">
              <span className="preview-stable">{preview.stable}</span>
              <span className="preview-partial">{preview.partial}</span>
            </span>
          </div>
        )}
        {state === "transcribing" && (
          <span className="status-text transcribing-text">
            {isCloudMode
              ? t("overlay.cloudProcessing", "Cloud...")
              : t("overlay.transcribing", "Processing...")}
          </span>
        )}
      </div>

      {/* Cloud mode indicator dot */}
      {isCloudMode && state === "recording" && (
        <div className="cloud-indicator" title="Cloud transcription">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default RecordingOverlay;
