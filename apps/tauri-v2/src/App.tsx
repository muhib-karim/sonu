import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import "./App.css";
import { ErrorBoundary } from "./components/error-boundary/ErrorBoundary";
import {
  ShortcutsHelp,
  useShortcutsHelp,
} from "./components/shortcuts-help/ShortcutsHelp";
import AccessibilityPermissions from "./components/AccessibilityPermissions";
import Footer from "./components/footer";
import Onboarding from "./components/onboarding";
import { Sidebar, SidebarSection, SECTIONS_CONFIG } from "./components/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { useTheme, resolvedTheme } from "./hooks/useTheme";
import { commands } from "@/bindings";

const renderSettingsContent = (section: SidebarSection) => {
  const ActiveComponent =
    SECTIONS_CONFIG[section]?.component || SECTIONS_CONFIG.general.component;
  return <ActiveComponent />;
};

import { getCurrentWindow } from "@tauri-apps/api/window";

function App() {
  const [currentSection, setCurrentSection] = useState<SidebarSection>("home");
  const { isOpen: shortcutsHelpOpen, close: closeShortcutsHelp } =
    useShortcutsHelp();
  const { settings } = useSettings();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { t } = useTranslation();

  useTheme();
  const theme = resolvedTheme(settings?.theme_mode);

  // Surface settings-persistence failures. API keys live only in the OS
  // keychain, so a failed write means the key is unrecoverable — the user must
  // be told rather than left believing it saved.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const setup = async () => {
      const stop = await listen<string>("settings-persist-error", (event) => {
        toast.error(
          t("settings.persist_error", {
            defaultValue: "Could not save your API key to the system keychain",
          }),
          { description: event.payload, duration: 10000 },
        );
      });
      // The listener may resolve after unmount; unregister immediately then.
      if (cancelled) {
        stop();
      } else {
        unlisten = stop;
      }
    };

    // Fire-and-forget on mount: `setup` handles its own errors.
    void setup();
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [t]);

  // Decide whether the first-run setup screen is needed.
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const result = await commands.getAppSettings();
        if (result.status !== "ok") return;

        if (result.data.selected_model) {
          return; // already set up
        }

        // A working cloud provider is a complete setup on its own — the user
        // does not need a local model, so don't force them through the download
        // flow. `has_api_key` is checked via the status command because API keys
        // are `#[serde(skip)]` and so are never present in `getAppSettings`.
        const cloudStatus = await commands.getCloudTranscriptionStatus();
        const cloudReady =
          cloudStatus.status === "ok" &&
          cloudStatus.data.enabled &&
          cloudStatus.data.has_api_key;

        if (!cloudReady) {
          setShowOnboarding(true);
        }
      } catch {
        // Don't block on onboarding check failure
      }
    };
    void checkOnboarding();
  }, []);

  // Maximize handler
  const handleDoubleClick = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <div className="h-screen flex flex-col select-none cursor-default bg-background">
          <Toaster theme={theme} />
          <Onboarding onModelSelected={() => setShowOnboarding(false)} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col select-none cursor-default bg-background">
        {/* Custom Drag Region / Title Bar Overlay */}
        <div
          className="fixed top-0 left-0 w-full h-8 z-50 bg-transparent"
          data-tauri-drag-region
          onDoubleClick={handleDoubleClick}
        />

        <Toaster
          theme={theme}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "bg-surface/90 backdrop-blur-md border border-border rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 text-sm text-text",
              title: "font-medium",
              description: "text-mid-gray",
            },
          }}
        />

        {/* Keyboard Shortcuts Help Overlay */}
        <ShortcutsHelp
          isOpen={shortcutsHelpOpen}
          onClose={closeShortcutsHelp}
        />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden rounded-xl border border-border bg-background/80 backdrop-blur-xl m-2 shadow-2xl relative">
          <Sidebar
            activeSection={currentSection}
            onSectionChange={setCurrentSection}
          />
          {/* Scrollable content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto mt-6">
              <div className="flex flex-col items-center p-4 gap-4">
                <AccessibilityPermissions />
                {renderSettingsContent(currentSection)}
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
