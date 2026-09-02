import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";
import packageInfo from "../../../package.json";

const Footer: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        // getVersion only fails outside the Tauri runtime (e.g. the e2e
        // browser context); fall back to the build version from package.json.
        console.error("Failed to get app version:", error);
        setVersion(packageInfo.version);
      }
    };

    fetchVersion();
  }, []);

  return (
    <div className="w-full border-t border-border pt-3 bg-sidebar">
      <div className="flex justify-between items-center text-xs px-4 pb-3 text-text-muted">
        <div className="flex items-center gap-4">
          <ModelSelector />
        </div>

        {/* Update Status */}
        <div className="flex items-center gap-1">
          <UpdateChecker />
          <span>•</span>
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>v{version}</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
