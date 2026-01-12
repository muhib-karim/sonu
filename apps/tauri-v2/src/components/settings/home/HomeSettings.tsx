import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Mic, Zap, TrendingUp } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { commands, type HistoryEntry } from "@/bindings";
import { HandyShortcut } from "../HandyShortcut";


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
}> = ({ icon, label, value }) => (
  <div className="flex flex-col gap-2 p-4 bg-background rounded-xl border border-mid-gray/20 hover:border-indigo-500/50 hover:shadow-lg transition-all duration-200 min-w-[140px] flex-1">
    <div className="flex items-center gap-2">
      <div className="text-indigo-500">{icon}</div>
      <span className="text-xs text-mid-gray font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
    <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-mid-gray bg-clip-text text-transparent">
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

  useEffect(() => {
    loadHistory();
  }, []);


  const loadHistory = async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok" && result.data) {
        setHistory(result.data);
        calculateStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  };

  const calculateStats = (entries: HistoryEntry[]) => {
    // Estimate stats from history entries
    const totalWords = entries.reduce(
      (sum, e) => sum + (e.transcription_text?.split(/\s+/).filter(Boolean).length || 0),
      0
    );
    // Estimate 2 minutes average per entry
    const totalMinutes = entries.length * 2;
    const wpm = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0;
    // Estimate time saved: typing at 40 WPM vs speaking at 150 WPM
    const typingTime = totalWords / 40;
    const speakingTime = totalWords / 150;
    const timeSaved = Math.max(0, typingTime - speakingTime);

    setStats({
      totalDictationTime: Math.round(totalMinutes),
      wordsDictated: totalWords,
      timeSaved: Math.round(timeSaved),
      averageWpm: wpm || 150,
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("home.title", "Speak Everywhere")}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          icon={<Clock size={18} />}
          label={t("home.stats.dictationTime", "Dictation time")}
          value={`${stats.totalDictationTime} min`}
        />
        <StatCard
          icon={<Mic size={18} />}
          label={t("home.stats.wordsDictated", "Words dictated")}
          value={`${stats.wordsDictated.toLocaleString()}`}
        />
        <StatCard
          icon={<Zap size={18} />}
          label={t("home.stats.timeSaved", "Time saved")}
          value={`${stats.timeSaved} min`}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label={t("home.stats.avgSpeed", "Avg speed")}
          value={`${stats.averageWpm} WPM`}
        />
      </div>

      {/* Voice Activation Shortcut - Editable */}
      <SettingsGroup title={t("home.shortcut.title", "Voice Activation")}>
        <div className="flex flex-col gap-3 p-3">
          <p className="text-sm text-mid-gray">
            {t("home.shortcut.description", "Hold this key, speak, and release to transcribe.")}
          </p>
          <HandyShortcut shortcutId="transcribe" grouped={false} />
        </div>
      </SettingsGroup>

      {/* Quick Tips */}
      <div className="flex flex-col gap-2 py-2">
        <p className="text-xs text-mid-gray">
          {t("home.description", "SONU works in all your apps. Try it in email, messages, docs or anywhere else.")}
        </p>
      </div>


      {/* Privacy Card */}
      <SettingsGroup title={t("home.privacy.title", "Privacy")}>
        <div className="flex items-start gap-3 p-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-indigo-500"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium">
              {t("home.privacy.heading", "Your data stays private")}
            </h3>
            <p className="text-xs text-mid-gray mt-1">
              {t("home.privacy.description", "Your voice dictations are private with zero data retention. They are stored only on your device and cannot be accessed from anywhere else.")}
            </p>
          </div>
        </div>
      </SettingsGroup>

      {/* Recent History */}
      {history.length > 0 && (
        <SettingsGroup title={t("home.history.title", "Recent")}>
          <div className="flex flex-col divide-y divide-mid-gray/10">
            {history.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-4 py-3 px-1 hover:bg-mid-gray/5 rounded cursor-pointer group"
                onClick={() => copyToClipboard(entry.transcription_text)}
              >
                <span className="text-xs text-mid-gray min-w-[60px]">
                  {formatTime(entry.timestamp)}
                </span>
                <p className="text-sm flex-1 line-clamp-2">{entry.transcription_text}</p>
                <span className="text-xs text-mid-gray opacity-0 group-hover:opacity-100 transition-opacity">
                  {t("common.copy", "Copy")}
                </span>
              </div>
            ))}
          </div>
        </SettingsGroup>
      )}
    </div>
  );
};
