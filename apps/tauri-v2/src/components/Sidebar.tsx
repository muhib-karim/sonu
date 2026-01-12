import React from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  BookOpen,
  FileText,
  StickyNote,
  Palette,
  Settings,
  History,
  FlaskConical,
  Info,
  Sparkles,
  Sliders,
} from "lucide-react";
import SonuLogo from "./icons/SonuLogo";
import { useSettings } from "../hooks/useSettings";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  HomeSettings,
  DictionarySettings,
  SnippetsSettings,
  NotesSettings,
  StyleSettings,
} from "./settings";

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
  dividerAfter?: boolean;
}

const SECTIONS_CONFIG: Record<string, SectionConfig> = {
  home: {
    labelKey: "sidebar.home",
    icon: Home,
    component: HomeSettings,
    enabled: () => true,
  },
  dictionary: {
    labelKey: "sidebar.dictionary",
    icon: BookOpen,
    component: DictionarySettings,
    enabled: () => true,
  },
  snippets: {
    labelKey: "sidebar.snippets",
    icon: FileText,
    component: SnippetsSettings,
    enabled: () => true,
  },
  notes: {
    labelKey: "sidebar.notes",
    icon: StickyNote,
    component: NotesSettings,
    enabled: () => true,
  },
  style: {
    labelKey: "sidebar.style",
    icon: Palette,
    component: StyleSettings,
    enabled: () => true,
    dividerAfter: true,
  },
  general: {
    labelKey: "sidebar.general",
    icon: Settings,
    component: GeneralSettings,
    enabled: () => true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Sliders,
    component: AdvancedSettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  history: {
    labelKey: "sidebar.history",
    icon: History,
    component: HistorySettings,
    enabled: () => true,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
};

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

export { SECTIONS_CONFIG };

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  return (
    <div className="sidebar flex flex-col w-52 h-full items-center px-3 py-4">
      {/* Logo Section */}
      <div className="w-full mb-4">
        <SonuLogo width={100} className="mx-auto" />
      </div>

      {/* Navigation */}
      <div className="flex flex-col w-full gap-0.5 flex-1">
        {availableSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const showDivider = section.dividerAfter;

          return (
            <React.Fragment key={section.id}>
              <div
                className={`flex gap-3 items-center px-3 py-2.5 w-full rounded-lg cursor-pointer transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-400 border-l-2 border-indigo-500"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                }`}
                onClick={() => onSectionChange(section.id)}
              >
                <Icon size={18} className={`shrink-0 ${isActive ? "text-indigo-400" : ""}`} />
                <p
                  className="text-sm font-medium truncate"
                  title={t(section.labelKey)}
                >
                  {t(section.labelKey)}
                </p>
              </div>
              {showDivider && (
                <div className="w-full h-px bg-white/5 my-3" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
