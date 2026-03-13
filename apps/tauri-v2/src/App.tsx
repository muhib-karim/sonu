import { useEffect, useState } from "react";
import { Toaster } from "sonner";
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

  // Check if onboarding is needed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const result = await commands.getAppSettings();
        if (result.status === "ok") {
          // If no model has been selected yet, show onboarding
          const s = result.data as any;
          if (!s.selected_model && !s.onboarding_completed) {
            setShowOnboarding(true);
          }
        }
      } catch {
        // Don't block on onboarding check failure
      }
    };
    checkOnboarding();
  }, []);

  // Maximize handler
  const handleDoubleClick = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <div className="dark h-screen flex flex-col select-none cursor-default bg-transparent">
          <Toaster theme="dark" />
          <Onboarding onModelSelected={() => setShowOnboarding(false)} />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="dark h-screen flex flex-col select-none cursor-default bg-transparent">
        {/* Custom Drag Region / Title Bar Overlay */}
        <div
          className="fixed top-0 left-0 w-full h-8 z-50 bg-transparent"
          data-tauri-drag-region
          onDoubleClick={handleDoubleClick}
        />

        <Toaster
          theme="dark"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "bg-surface/90 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-lg px-4 py-3 flex items-center gap-3 text-sm text-text",
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
        <div className="flex-1 flex overflow-hidden rounded-xl border border-white/[0.08] bg-background/80 backdrop-blur-xl m-2 shadow-2xl relative">
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
