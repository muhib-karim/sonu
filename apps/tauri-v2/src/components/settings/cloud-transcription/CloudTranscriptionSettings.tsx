import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Cloud,
  Zap,
  Server,
  Check,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Shield,
  Globe,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Clock,
  Gauge,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import type {
  CloudProviderInfo,
  CloudTranscriptionStatus,
} from "@/lib/types/cloud-transcription";
import { SettingsGroup } from "@/components/ui";
import { LANGUAGES } from "@/lib/constants/languages";
import { cn } from "@/lib/utils/cn";

// ─── Provider metadata ──────────────────────────────────────────────────────
const PROVIDER_META: Record<
  string,
  {
    icon: React.ReactNode;
    gradient: string;
    border: string;
    bg: string;
    tagColor: string;
    tagBg: string;
    badge: string;
    description: string;
    features: string[];
    signupUrl?: string;
    signupLabel?: string;
  }
> = {
  groq_cloud: {
    icon: <Zap className="w-5 h-5" />,
    gradient: "from-orange-500 to-amber-500",
    border: "border-orange-500/30",
    bg: "bg-orange-500/5",
    tagColor: "text-orange-400",
    tagBg: "bg-orange-500/15",
    badge: "Free Tier",
    description: "Ultra-fast Whisper inference powered by Groq LPU hardware",
    features: ["~2s latency", "Free 14,400 req/day", "whisper-large-v3-turbo"],
    signupUrl: "https://console.groq.com",
    signupLabel: "console.groq.com",
  },
  deepgram_cloud: {
    icon: <Cloud className="w-5 h-5" />,
    gradient: "from-blue-500 to-cyan-500",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    tagColor: "text-blue-400",
    tagBg: "bg-blue-500/15",
    badge: "High Accuracy",
    description: "Enterprise-grade Nova-2 model with smart formatting",
    features: ["Smart punctuation", "Auto language detect", "Nova-2 model"],
    signupUrl: "https://console.deepgram.com",
    signupLabel: "console.deepgram.com",
  },
  custom_cloud: {
    icon: <Server className="w-5 h-5" />,
    gradient: "from-emerald-500 to-teal-500",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    tagColor: "text-emerald-400",
    tagBg: "bg-emerald-500/15",
    badge: "Self-Hosted",
    description: "Connect to your own OpenAI Whisper-compatible server",
    features: ["Full privacy", "Custom models", "No rate limits"],
  },
};

// ─── Cloud Language Options ──────────────────────────────────────────────────
const CLOUD_LANGUAGES = [
  { value: "auto", label: "Auto Detect" },
  ...LANGUAGES.filter((l) => l.value !== "auto"),
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Animated status indicator dot */
const StatusDot: React.FC<{ active: boolean; color?: string }> = ({
  active,
  color = "bg-emerald-400",
}) => (
  <span className="relative flex h-2.5 w-2.5">
    {active && (
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
      />
    )}
    <span
      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? color : "bg-zinc-600"}`}
    />
  </span>
);

/** Provider card with selection, key input, and features */
const ProviderCard: React.FC<{
  provider: CloudProviderInfo;
  isSelected: boolean;
  onSelect: () => void;
  onApiKeyChange: (key: string) => void;
  onEndpointChange?: (endpoint: string) => void;
  apiKeyInput: string;
  endpointInput: string;
  onApiKeyInputChange: (key: string) => void;
  onEndpointInputChange: (endpoint: string) => void;
}> = ({
  provider,
  isSelected,
  onSelect,
  onApiKeyChange,
  onEndpointChange,
  apiKeyInput,
  endpointInput,
  onApiKeyInputChange,
  onEndpointInputChange,
}) => {
  const { t } = useTranslation();
  const meta = PROVIDER_META[provider.id];
  const [showKey, setShowKey] = useState(false);

  if (!meta) return null;

  return (
    <div
      className={cn(
        "group relative rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden",
        isSelected
          ? `${meta.border} ${meta.bg} ring-1 ring-white/5`
          : "border-white/[0.06] hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
      )}
      onClick={() => !isSelected && onSelect()}
    >
      {/* Selection indicator bar */}
      {isSelected && (
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${meta.gradient}`}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div
          className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${meta.gradient} text-white shadow-lg`}
        >
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">
              {provider.label}
            </span>
            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <p className="text-xs text-text/50 mt-0.5 leading-relaxed">
            {meta.description}
          </p>
        </div>
        {/* Badge */}
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.tagBg} ${meta.tagColor} whitespace-nowrap`}
        >
          {meta.badge}
        </span>
      </div>

      {/* Feature pills */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        {meta.features.map((feat) => (
          <span
            key={feat}
            className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-text/40 border border-white/[0.04]"
          >
            {feat}
          </span>
        ))}
        {provider.has_api_key && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <Check className="w-2.5 h-2.5" />
            {t("cloud_transcription.key_set")}
          </span>
        )}
      </div>

      {/* Expanded config panel (only for selected provider) */}
      {isSelected && (
        <div
          className="border-t border-white/[0.06] px-4 py-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* API Key field */}
          {provider.id !== "custom_cloud" && (
            <div>
              <label className="text-[11px] font-medium text-text/50 uppercase tracking-wider mb-1.5 block">
                {t("cloud_transcription.api_key")}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => onApiKeyInputChange(e.target.value)}
                    onBlur={() => onApiKeyChange(apiKeyInput)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onApiKeyChange(apiKeyInput);
                    }}
                    placeholder={
                      provider.has_api_key
                        ? "••••••••••••••••"
                        : t("cloud_transcription.enter_api_key")
                    }
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text placeholder:text-text/20 focus:outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition-all font-mono"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text/30 hover:text-text/60 transition-colors"
                    type="button"
                  >
                    {showKey ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
              {/* Signup hint */}
              {meta.signupUrl && !provider.has_api_key && (
                <a
                  href={meta.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 mt-2 text-[11px] ${meta.tagColor} hover:underline`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("cloud_transcription.get_free_key_at")} {meta.signupLabel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Custom endpoint fields */}
          {provider.allow_endpoint_edit && (
            <>
              <div>
                <label className="text-[11px] font-medium text-text/50 uppercase tracking-wider mb-1.5 block">
                  {t("cloud_transcription.server_endpoint")}
                </label>
                <input
                  type="text"
                  value={endpointInput}
                  onChange={(e) => onEndpointInputChange(e.target.value)}
                  onBlur={() => onEndpointChange?.(endpointInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onEndpointChange?.(endpointInput);
                  }}
                  placeholder="http://localhost:8000/v1/audio/transcriptions"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text placeholder:text-text/20 focus:outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition-all font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-text/50 uppercase tracking-wider mb-1.5 block">
                  {t("cloud_transcription.api_key_optional")}
                </label>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => onApiKeyInputChange(e.target.value)}
                  onBlur={() => onApiKeyChange(apiKeyInput)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApiKeyChange(apiKeyInput);
                  }}
                  placeholder={t("cloud_transcription.optional_placeholder")}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text placeholder:text-text/20 focus:outline-none focus:border-white/[0.16] focus:ring-1 focus:ring-white/[0.08] transition-all font-mono"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

/** Language dropdown with search */
const CloudLanguageSelector: React.FC<{
  value: string;
  onChange: (lang: string) => void;
}> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () =>
      CLOUD_LANGUAGES.filter((l) =>
        l.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const selectedLabel =
    CLOUD_LANGUAGES.find((l) => l.value === value)?.label || "Auto Detect";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-text hover:border-white/[0.16] transition-all min-w-[180px] justify-between"
        type="button"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-text/40" />
          <span>{selectedLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-text/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-white/[0.08] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("cloud_transcription.search_language")}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text/30 focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.value}
                onClick={() => {
                  onChange(lang.value);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/[0.04] transition-colors flex items-center justify-between ${
                  lang.value === value
                    ? "text-text bg-white/[0.04]"
                    : "text-text/70"
                }`}
                type="button"
              >
                <span>{lang.label}</span>
                {lang.value === value && (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const CloudTranscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CloudTranscriptionStatus | null>(null);
  const [providers, setProviders] = useState<CloudProviderInfo[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [endpointInput, setEndpointInput] = useState("");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [translateToEnglish, setTranslateToEnglish] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [statusResult, providersResult] = await Promise.all([
        invoke<CloudTranscriptionStatus>("get_cloud_transcription_status"),
        invoke<CloudProviderInfo[]>("get_cloud_providers"),
      ]);

      setStatus(statusResult);
      setProviders(providersResult);

      // Load language settings from main settings
      try {
        const settings =
          await invoke<Record<string, unknown>>("get_app_settings");
        if (settings) {
          setSelectedLanguage(
            (settings["selected_language"] as string) || "auto",
          );
          setTranslateToEnglish(
            (settings["translate_to_english"] as boolean) || false,
          );
        }
      } catch {
        // Language settings are part of main settings
      }

      // Initialize endpoint input from custom provider
      const customProvider = providersResult.find(
        (p: CloudProviderInfo) => p.id === "custom_cloud",
      );
      if (customProvider) {
        setEndpointInput(customProvider.api_endpoint);
      }
    } catch (err) {
      console.error("Failed to load cloud transcription settings:", err);
      toast.error(t("cloud_transcription.load_error"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist language settings when they change
  useEffect(() => {
    if (!isLoading && status?.enabled) {
      invoke("set_cloud_language", { language: selectedLanguage }).catch(
        (err) => console.error("Failed to save cloud language:", err),
      );
    }
  }, [selectedLanguage, isLoading, status?.enabled]);

  useEffect(() => {
    if (!isLoading && status?.enabled) {
      invoke("set_cloud_translate_to_english", {
        translate: translateToEnglish,
      }).catch((err) =>
        console.error("Failed to save cloud translate setting:", err),
      );
    }
  }, [translateToEnglish, isLoading, status?.enabled]);

  // Listen for cloud transcription events for toast notifications
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      unlisten = await listen<{
        event_type: string;
        message: string | null;
        error: string | null;
      }>("cloud-transcription-event", (event) => {
        const { event_type, error } = event.payload;
        if (event_type === "error" && error) {
          toast.error(error, { duration: 5000 });
        }
      });
    };

    setup();
    return () => unlisten?.();
  }, []);

  const handleToggle = async (enabled: boolean) => {
    try {
      await invoke("set_cloud_transcription_enabled", { enabled });
      await loadData();
      toast.success(
        enabled
          ? t("cloud_transcription.enabled_toast")
          : t("cloud_transcription.disabled_toast"),
      );
    } catch (err) {
      console.error("Failed to toggle cloud transcription:", err);
      toast.error(t("cloud_transcription.toggle_error"));
    }
  };

  const handleProviderSelect = async (providerId: string) => {
    try {
      await invoke("set_cloud_provider", { providerId });
      setTestResult(null);
      await loadData();
    } catch (err) {
      console.error("Failed to set cloud provider:", err);
      toast.error(t("cloud_transcription.provider_error"));
    }
  };

  const handleApiKeyChange = async (providerId: string, apiKey: string) => {
    if (!apiKey) return;
    try {
      await invoke("set_cloud_api_key", { providerId, apiKey });
      setTestResult(null);
      await loadData();
      toast.success(t("cloud_transcription.key_saved"));
    } catch (err) {
      console.error("Failed to set cloud API key:", err);
      toast.error(t("cloud_transcription.key_error"));
    }
  };

  const handleEndpointChange = async (providerId: string, endpoint: string) => {
    if (!endpoint) return;
    try {
      await invoke("set_cloud_endpoint", { providerId, endpoint });
      setTestResult(null);
      await loadData();
    } catch (err) {
      console.error("Failed to set cloud endpoint:", err);
      toast.error(t("cloud_transcription.endpoint_error"));
    }
  };

  const handleTestConnection = async () => {
    if (!status) return;
    setIsTesting(true);
    setTestResult(null);

    const currentProvider = providers.find((p) => p.id === status.provider_id);
    const apiKey = apiKeyInputs[status.provider_id] || "";
    const endpoint = currentProvider?.allow_endpoint_edit
      ? endpointInput
      : null;

    try {
      const result = await invoke<string>("test_cloud_connection", {
        providerId: status.provider_id,
        apiKey: apiKey,
        endpoint: endpoint,
      });
      setTestResult({ success: true, message: result });
      toast.success(t("cloud_transcription.connection_success"));
    } catch (err) {
      setTestResult({
        success: false,
        message: `${err}`,
      });
      toast.error(t("cloud_transcription.connection_failed"));
    } finally {
      setIsTesting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-3xl w-full mx-auto flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-text/30" />
          <span className="text-sm text-text/40">
            {t("cloud_transcription.loading")}
          </span>
        </div>
      </div>
    );
  }

  const isEnabled = status?.enabled ?? false;
  const selectedProvider = providers.find((p) => p.id === status?.provider_id);
  const hasValidConfig =
    selectedProvider?.has_api_key || selectedProvider?.id === "custom_cloud";

  return (
    <div className="max-w-3xl w-full mx-auto space-y-5">
      {/* ── Hero Toggle Section ─────────────────────────────────────────── */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border transition-all duration-500",
          isEnabled
            ? "border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.06] to-purple-500/[0.03] shadow-lg shadow-indigo-500/5"
            : "border-white/[0.06] bg-surface",
        )}
      >
        {/* Subtle gradient decoration */}
        {isEnabled && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        )}

        <div className="relative flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500",
                isEnabled
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 scale-100"
                  : "bg-white/[0.04] scale-95",
              )}
            >
              {isEnabled ? (
                <Wifi className="w-6 h-6 text-white" />
              ) : (
                <WifiOff className="w-6 h-6 text-text/30" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-text">
                  {t("cloud_transcription.title")}
                </h2>
                <StatusDot active={isEnabled && hasValidConfig === true} />
              </div>
              <p className="text-xs text-text/50 mt-0.5 max-w-md">
                {t("cloud_transcription.subtitle")}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <div className="w-12 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:shadow-md after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600" />
          </label>
        </div>

        {/* Quick stats bar when enabled and configured */}
        {isEnabled && hasValidConfig && (
          <div className="border-t border-white/[0.04] px-5 py-2.5 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[11px] text-text/40">
              <Gauge className="w-3 h-3" />
              <span>{t("cloud_transcription.faster_than_local")}</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5 text-[11px] text-text/40">
              <Shield className="w-3 h-3" />
              <span>{t("cloud_transcription.encrypted")}</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5 text-[11px] text-text/40">
              <Clock className="w-3 h-3" />
              <span>{t("cloud_transcription.auto_fallback")}</span>
            </div>
          </div>
        )}
      </div>

      {isEnabled && (
        <>
          {/* ── Provider Selection ────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {t("cloud_transcription.select_provider")}
              </h3>
            </div>
            <div className="space-y-2">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isSelected={status?.provider_id === provider.id}
                  onSelect={() => handleProviderSelect(provider.id)}
                  onApiKeyChange={(key) => handleApiKeyChange(provider.id, key)}
                  onEndpointChange={(ep) =>
                    handleEndpointChange(provider.id, ep)
                  }
                  apiKeyInput={apiKeyInputs[provider.id] ?? ""}
                  endpointInput={endpointInput}
                  onApiKeyInputChange={(key) =>
                    setApiKeyInputs((prev) => ({
                      ...prev,
                      [provider.id]: key,
                    }))
                  }
                  onEndpointInputChange={setEndpointInput}
                />
              ))}
            </div>
          </div>

          {/* ── Connection Test ───────────────────────────────────────────── */}
          <SettingsGroup>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isTesting
                      ? "bg-white/[0.04] text-text/40 cursor-wait"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-text border border-white/[0.08] hover:border-white/[0.16] active:scale-[0.98]",
                  )}
                  type="button"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t("cloud_transcription.testing")}
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      {t("cloud_transcription.test_connection")}
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs animate-in fade-in slide-in-from-left-2 duration-300",
                      testResult.success
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20",
                    )}
                  >
                    {testResult.success ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5" />
                    )}
                    <span className="max-w-xs truncate">
                      {testResult.message}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </SettingsGroup>

          {/* ── Language & Translate Settings ─────────────────────────────── */}
          <SettingsGroup title={t("cloud_transcription.language_title")}>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">
                    {t("cloud_transcription.transcription_language")}
                  </p>
                  <p className="text-xs text-text/40 mt-0.5">
                    {t("cloud_transcription.language_description")}
                  </p>
                </div>
                <CloudLanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                />
              </div>

              <div className="h-px bg-white/[0.04]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text">
                    {t("cloud_transcription.translate_to_english_label")}
                  </p>
                  <p className="text-xs text-text/40 mt-0.5">
                    {t("cloud_transcription.translate_to_english_desc")}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={translateToEnglish}
                    onChange={(e) => setTranslateToEnglish(e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:shadow-md after:transition-all peer-checked:bg-indigo-500" />
                </label>
              </div>
            </div>
          </SettingsGroup>

          {/* ── How It Works / Info Section ───────────────────────────────── */}
          <div className="space-y-2">
            <div className="px-1">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                {t("cloud_transcription.how_it_works_section")}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* How it works */}
              <div className="group flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/[0.06] hover:border-indigo-500/20 transition-all duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0 group-hover:bg-indigo-500/15 transition-colors duration-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text/80">
                    {t("cloud_transcription.how_it_works_title")}
                  </p>
                  <p className="text-xs text-text/40 mt-1 leading-relaxed">
                    {t("cloud_transcription.how_it_works_description")}
                  </p>
                </div>
              </div>

              {/* Privacy */}
              <div className="group flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 group-hover:bg-emerald-500/15 transition-colors duration-300">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text/80">
                    {t("cloud_transcription.privacy_title")}
                  </p>
                  <p className="text-xs text-text/40 mt-1 leading-relaxed">
                    {t("cloud_transcription.privacy_description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Disabled State CTA ───────────────────────────────────────────── */}
      {!isEnabled && (
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <ArrowRight className="w-4 h-4 text-text/20" />
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-text">
                {t("cloud_transcription.cta_title")}
              </p>
              <p className="text-xs text-text/40 mt-1 max-w-sm mx-auto leading-relaxed">
                {t("cloud_transcription.cta_description")}
              </p>
            </div>
            <button
              onClick={() => handleToggle(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-indigo-500/15"
              type="button"
            >
              <Wifi className="w-4 h-4" />
              {t("cloud_transcription.enable_button")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
