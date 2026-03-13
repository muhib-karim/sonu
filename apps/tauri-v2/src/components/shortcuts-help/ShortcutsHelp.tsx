import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

export interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Overlay
 *
 * Displays a modal with all available keyboard shortcuts.
 * Can be triggered by pressing Ctrl+/ (Cmd+/ on macOS)
 */
export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const shortcuts: Shortcut[] = [
    // Recording
    {
      keys: ["Ctrl", "Space"],
      description: t("shortcuts.toggle_recording", "Toggle recording"),
      category: "recording",
    },
    {
      keys: ["Ctrl", "Shift", "Space"],
      description: t("shortcuts.hold_to_record", "Hold to record (PTT)"),
      category: "recording",
    },
    {
      keys: ["Esc"],
      description: t("shortcuts.cancel_recording", "Cancel recording"),
      category: "recording",
    },

    // Navigation
    {
      keys: ["Ctrl", "/"],
      description: t("shortcuts.show_help", "Show keyboard shortcuts"),
      category: "navigation",
    },
    {
      keys: ["Ctrl", ","],
      description: t("shortcuts.open_settings", "Open settings"),
      category: "navigation",
    },
    {
      keys: ["Ctrl", "H"],
      description: t("shortcuts.open_history", "Open history"),
      category: "navigation",
    },

    // Text Editing
    {
      keys: ["Ctrl", "V"],
      description: t(
        "shortcuts.paste_transcription",
        "Paste last transcription",
      ),
      category: "editing",
    },
    {
      keys: ["Ctrl", "Z"],
      description: t("shortcuts.undo", "Undo last action"),
      category: "editing",
    },

    // Window
    {
      keys: ["Ctrl", "W"],
      description: t("shortcuts.close_window", "Close window"),
      category: "window",
    },
    {
      keys: ["Ctrl", "Q"],
      description: t("shortcuts.quit_app", "Quit application"),
      category: "window",
    },
    {
      keys: ["Ctrl", "M"],
      description: t("shortcuts.minimize", "Minimize to tray"),
      category: "window",
    },
  ];

  const categories = [
    { id: "all", label: t("shortcuts.categories.all", "All Shortcuts") },
    {
      id: "recording",
      label: t("shortcuts.categories.recording", "Recording"),
    },
    {
      id: "navigation",
      label: t("shortcuts.categories.navigation", "Navigation"),
    },
    { id: "editing", label: t("shortcuts.categories.editing", "Text Editing") },
    { id: "window", label: t("shortcuts.categories.window", "Window") },
  ];

  const filteredShortcuts =
    activeCategory === "all"
      ? shortcuts
      : shortcuts.filter((s) => s.category === activeCategory);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">
                {t("shortcuts.title", "Keyboard Shortcuts")}
              </h2>
              <p className="text-sm text-text-secondary">
                {t(
                  "shortcuts.subtitle",
                  "Press any shortcut to perform the action",
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            aria-label={t("buttons.close", "Close")}
          >
            <svg
              className="w-5 h-5 text-text-secondary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1 p-2 border-b border-border overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text hover:bg-background"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="space-y-2">
            {filteredShortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-primary/5 transition-colors"
              >
                <span className="text-text">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <React.Fragment key={keyIndex}>
                      <kbd className="px-2 py-1 bg-surface border border-border rounded text-sm font-mono text-text-secondary shadow-sm">
                        {key}
                      </kbd>
                      {keyIndex < shortcut.keys.length - 1 && (
                        <span className="text-text-secondary self-center">
                          +
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background/50">
          <p className="text-sm text-text-secondary text-center">
            {t(
              "shortcuts.customize_hint",
              "You can customize these shortcuts in Settings > Keyboard Shortcuts",
            )}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/**
 * Hook to manage shortcuts help visibility and keyboard trigger
 */
export const useShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ or Cmd+/
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};

export default ShortcutsHelp;
