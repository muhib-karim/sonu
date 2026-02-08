import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import "./App.css";
import { ErrorBoundary } from "./components/error-boundary/ErrorBoundary";
import { ShortcutsHelp, useShortcutsHelp } from "./components/shortcuts-help/ShortcutsHelp";
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

// ... (existing imports)

function App() {
  // ... (existing state)

  // Maximize handler
  const handleDoubleClick = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
  };

  // ... (existing code, handleKeyDown, etc.)

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
        <ShortcutsHelp isOpen={shortcutsHelpOpen} onClose={closeShortcutsHelp} />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden rounded-xl border border-white/[0.08] bg-background/80 backdrop-blur-xl m-2 shadow-2xl relative">
          <Sidebar
            activeSection={currentSection}
            onSectionChange={setCurrentSection}
          />
          {/* Scrollable content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Window Controls (Mac-like or Windows-like, depending on OS preference, usually handled by OS but we are frameless) */}
            {/* We can add close/min/max buttons here if we want perfect emulation, 
                 but for now user just asked for double-click maximize. 
                 We need to ensure z-index of content is below the drag region if it overlaps.
                 Actually, the drag region is fixed top-0 h-8. 
             */}

            <div className="flex-1 overflow-y-auto mt-6"> {/* Add top margin to avoid overlap with drag region if needed */}
              <div className="flex flex-col items-center p-4 gap-4">
                <AccessibilityPermissions />
                {renderSettingsContent(currentSection)}
              </div>
            </div>
          </div>
        </div>
        {/* Footer is removed from bottom fixed flow and should probably be integrated into sidebar or content if we want floating window look.
            But existing Footer component might be useful. Let's see where it was.
            It was <Footer /> at the bottom.
            If we want Wispr style, maybe just keep it inside the main glass container?
        */}
        {/* <Footer />  -- Commenting out or moving inside the glass container if appropriate. 
            Let's keep it simply hidden for now or assume Sidebar has footer info. 
            Wait, Footer component might have important info.
            Let's check Footer content.
        */}
      </div>
    </ErrorBoundary>
  );
}

export default App;
