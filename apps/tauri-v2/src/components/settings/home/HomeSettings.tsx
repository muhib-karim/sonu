import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Mic,
  Zap,
  TrendingUp,
  Shield,
  Copy,
  Cloud,
  Cpu,
  Activity,
} from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { commands, type HistoryEntry } from "@/bindings";
import { SonuShortcut } from "../SonuShortcut";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

interface Stats {
  totalDictationTime: number;
  wordsDictated: number;
  timeSaved: number;
  averageWpm: number;
}

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}> = ({ icon, label, value, gradient }) => (
  <div className="group relative flex flex-col gap-2.5 p-4 bg-surface rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all duration-300 min-w-[130px] flex-1 overflow-hidden hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
    {/* Top gradient accent — always visible at low opacity, full on hover */}
    <div
      className={cn(
        "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r transition-opacity duration-300",
        gradient,
        "opacity-20 group-hover:opacity-100",
      )}
    />
    {/* Subtle corner glow on hover */}
    <div
      className={cn(
        "absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none",
        "opacity-0 group-hover:opacity-[0.06]",
        `bg-gradient-to-br ${gradient}`,
      )}
    />
    <div className="flex items-center gap-2 relative">
      <div className="text-text/40 group-hover:text-text/70 transition-colors duration-300">
        {icon}
      </div>
      <span className="text-[11px] text-text/40 font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
    <span className="text-2xl font-bold text-text tracking-tight relative tabular-nums">
      {value}
    </span>
  </div>
);

export const HomeSettings: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalDictationTime: 0,
    wordsDictated: 0,
    timeSaved: 0,
    averageWpm: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  const calculateStats = useCallback((entries: HistoryEntry[]) => {
    const totalWords = entries.reduce(
      (sum, e) =>
        sum + (e.transcription_text?.split(/\s+/).filter(Boolean).length || 0),
      0,
    );
    const totalMinutes = entries.length * 2;
    const wpm = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0;
    const typingTime = totalWords / 40;
    const speakingTime = totalWords / 150;
    const timeSaved = Math.max(0, typingTime - speakingTime);

    setStats({
      totalDictationTime: Math.round(totalMinutes),
      wordsDictated: totalWords,
      timeSaved: Math.round(timeSaved),
      averageWpm: wpm || 150,
    });
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok" && result.data) {
        setHistory(result.data);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, [calculateStats]);

  useEffect(() => {
    loadHistory();

    // Check cloud status
    invoke<{ enabled: boolean }>("get_cloud_transcription_status")
      .then((status) => setCloudEnabled(status.enabled))
      .catch((err) => {
        console.error("Failed to load cloud transcription status:", err);
        // Keep cloudEnabled as false on error, don't show toast as this is non-critical
      });

    const setupListener = async () => {
      const unlisten = await listen("history-updated", () => {
        loadHistory();
      });
      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) {
          unlisten();
        }
      });
    };
  }, [loadHistory]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("home.copied", "Copied to clipboard"));
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-3xl">
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-indigo-500/[0.06] via-surface to-purple-500/[0.04] p-6">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/[0.08] to-transparent rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/[0.06] to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-text via-text/90 to-text/70 bg-clip-text text-transparent">
            {t("home.title", "Speak Everywhere")}
          </h1>
          <p className="text-sm text-text/50 mt-1.5 max-w-lg leading-relaxed">
            {t(
              "home.description",
              "SONU works in all your apps. Try it in email, messages, docs or anywhere else.",
            )}
          </p>

          {/* Mode indicator */}
          <div className="flex items-center gap-3 mt-4">
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500",
                cloudEnabled
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-sm shadow-indigo-500/10"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10",
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className={cn(
                    "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                    cloudEnabled ? "bg-indigo-400" : "bg-emerald-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    cloudEnabled ? "bg-indigo-400" : "bg-emerald-400",
                  )}
                />
              </span>
              {cloudEnabled ? (
                <Cloud className="w-3 h-3" />
              ) : (
                <Cpu className="w-3 h-3" />
              )}
              {cloudEnabled
                ? t("home.mode.cloud", "Cloud Mode")
                : t("home.mode.local", "Local Mode")}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text/30">
              <Activity className="w-3 h-3" />
              <span>
                {t("home.transcriptions", "{{count}} transcriptions", {
                  count: history.length,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Clock size={16} />}
          label={t("home.stats.dictationTime", "Dictation time")}
          value={`${stats.totalDictationTime}m`}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={<Mic size={16} />}
          label={t("home.stats.wordsDictated", "Words")}
          value={stats.wordsDictated.toLocaleString()}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          icon={<Zap size={16} />}
          label={t("home.stats.timeSaved", "Time saved")}
          value={`${stats.timeSaved}m`}
          gradient="from-orange-500 to-amber-500"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label={t("home.stats.avgSpeed", "Avg speed")}
          value={`${stats.averageWpm}`}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* ── Voice Activation Shortcut ─────────────────────────────────── */}
      <SettingsGroup title={t("home.shortcut.title", "Voice Activation")}>
        <div className="flex flex-col gap-3 p-3">
          <p className="text-xs text-text/40 leading-relaxed">
            {t(
              "home.shortcut.description",
              "Hold this key, speak, and release to transcribe.",
            )}
          </p>
          <SonuShortcut shortcutId="transcribe" grouped={false} />
        </div>
      </SettingsGroup>

      {/* ── Privacy Card ──────────────────────────────────────────────── */}
      <div className="group flex items-start gap-3 p-4 rounded-xl bg-surface border border-white/[0.06] hover:border-emerald-500/20 transition-all duration-300">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 group-hover:bg-emerald-500/15 transition-colors duration-300">
          <Shield className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text/80 group-hover:text-text/90 transition-colors">
            {t("home.privacy.heading", "Your data stays private")}
          </p>
          <p className="text-xs text-text/40 mt-1 leading-relaxed">
            {t(
              "home.privacy.description",
              "Your voice dictations are private with zero data retention. They are stored only on your device and cannot be accessed from anywhere else.",
            )}
          </p>
        </div>
      </div>

      {/* ── Recent History ────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="space-y-2">
          <div className="px-1 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("home.history.title", "Recent")}
            </h3>
            <span className="text-[10px] text-text/20 tabular-nums">
              {history.length} {history.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-surface overflow-hidden divide-y divide-white/[0.04]">
            {history.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 py-3 px-4 hover:bg-white/[0.03] cursor-pointer group transition-all duration-200 active:bg-white/[0.05]"
                onClick={() => copyToClipboard(entry.transcription_text)}
              >
                <span className="text-[11px] text-text/30 min-w-[52px] mt-0.5 font-mono tabular-nums">
                  {formatTime(entry.timestamp)}
                </span>
                <p className="text-sm text-text/70 flex-1 line-clamp-2 leading-relaxed group-hover:text-text/80 transition-colors">
                  {entry.transcription_text}
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 mt-0.5 shrink-0">
                  <Copy className="w-3.5 h-3.5 text-text/30" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
