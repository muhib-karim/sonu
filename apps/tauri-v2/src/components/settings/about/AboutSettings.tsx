import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../AppDataDirectory";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { Heart, Github, Coffee } from "lucide-react";

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("2.2.0");
      }
    };

    void fetchVersion();
  }, []);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.about.title")}>
        <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        <SettingContainer
          title={t("settings.about.version.title")}
          description={t("settings.about.version.description")}
          grouped={true}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="text-sm font-mono">v{version}</span>
        </SettingContainer>

        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>

      {/* SONU Project */}
      <SettingsGroup title={t("settings.about.sonuProject.title")}>
        <SettingContainer
          title={t("settings.about.sonuProject.sourceCode.title")}
          description={t("settings.about.sonuProject.sourceCode.description")}
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => openUrl("https://github.com/muhib-karim/sonu")}
          >
            <Github size={16} className="mr-2" />
            {t("settings.about.sourceCode.button")}
          </Button>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.sonuProject.support.title")}
          description={t("settings.about.sonuProject.support.description")}
          grouped={true}
        >
          <Button
            variant="primary"
            size="md"
            onClick={() => openUrl("https://ko-fi.com/ai_dev_2024")}
          >
            <Coffee size={16} className="mr-2" />
            {t("settings.about.sonuProject.support.button")}
          </Button>
        </SettingContainer>
      </SettingsGroup>

      {/* Original Handy Credits */}
      <SettingsGroup title={t("settings.about.handyCredits.title")}>
        <SettingContainer
          title={t("settings.about.handyCredits.description.title")}
          description={t("settings.about.handyCredits.description.text")}
          grouped={true}
          layout="stacked"
        >
          <div className="flex gap-2 mt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => openUrl("https://github.com/cjpais/Handy")}
            >
              <Github size={16} className="mr-2" />
              {t("settings.about.sourceCode.button")}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => openUrl("https://handy.computer/donate")}
            >
              <Heart size={16} className="mr-2" />
              {t("settings.about.supportDevelopment.button")}
            </Button>
          </div>
        </SettingContainer>
      </SettingsGroup>

      {/* Acknowledgments */}
      <SettingsGroup title={t("settings.about.acknowledgments.title")}>
        <SettingContainer
          title={t("settings.about.acknowledgments.whisper.title")}
          description={t("settings.about.acknowledgments.whisper.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="text-sm text-mid-gray">
            {t("settings.about.acknowledgments.whisper.details")}
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
