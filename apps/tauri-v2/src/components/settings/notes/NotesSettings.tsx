import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Search, Grid, List, RefreshCw, Trash2, Copy, Check, Play, Pause } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { commands, type HistoryEntry } from "@/bindings";
import { convertFileSrc } from "@tauri-apps/api/core";

type ViewMode = "list" | "grid";

// Color palette for visual notes (sticky note colors)
const NOTE_COLORS = [
  "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
  "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
  "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
  "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
  "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700",
  "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700",
];

export const NotesSettings: React.FC = () => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<HistoryEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Load notes from history (saved entries are treated as notes)
  const loadNotes = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok") {
        // Filter to only show saved entries as "notes"
        const savedNotes = result.data.filter((entry) => entry.saved);
        setNotes(savedNotes);
      }
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();

    // Listen for history updates
    const setupListener = async () => {
      const unlisten = await listen("history-updated", () => {
        loadNotes();
      });
      return unlisten;
    };

    let unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) unlisten();
      });
    };
  }, [loadNotes]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [audioElement]);

  const toggleRecording = async () => {
    // TODO: Integrate with dedicated notes recording
    // For now, this is a placeholder - users can use the global shortcut
    setIsRecording(!isRecording);
  };

  const deleteNote = async (id: number) => {
    try {
      await commands.deleteHistoryEntry(id);
      // Will be updated via event listener
    } catch (error) {
      console.error("Failed to delete note:", error);
    }
  };

  const copyToClipboard = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const toggleAudio = async (entry: HistoryEntry) => {
    if (playingId === entry.id) {
      // Stop playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingId(null);
      return;
    }

    // Get audio URL and play
    try {
      const result = await commands.getAudioFilePath(entry.file_name);
      if (result.status === "ok") {
        const url = convertFileSrc(result.data, "asset");

        // Stop any existing audio
        if (audioElement) {
          audioElement.pause();
        }

        const audio = new Audio(url);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => setPlayingId(null);
        audio.play();
        setAudioElement(audio);
        setPlayingId(entry.id);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    // Convert Unix timestamp (seconds) to milliseconds for JavaScript Date
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("time.justNow", "Just now");
    if (diffMins < 60) return t("time.minsAgo", "{{count}} min ago", { count: diffMins });
    if (diffHours < 24) return t("time.hoursAgo", "{{count}}h ago", { count: diffHours });
    if (diffDays < 7) return t("time.daysAgo", "{{count}}d ago", { count: diffDays });
    return date.toLocaleDateString();
  };

  const getNoteColor = (id: number) => {
    return NOTE_COLORS[id % NOTE_COLORS.length];
  };

  const filteredNotes = notes.filter((note) =>
    note.transcription_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("notes.title", "For quick thoughts you want to come back to")}
        </h1>
        <p className="text-sm text-mid-gray">
          {t("notes.subtitle", "Save transcriptions as notes by clicking the star icon in History")}
        </p>
      </div>

      {/* Recording Input Card - Informational */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative min-h-[80px] flex items-center">
          <div className="flex-1 text-sm text-zinc-400">
            <span className="text-zinc-100/70">
              {t("notes.placeholder", "Use your global shortcut (Alt) to dictate, then star it in History")}
            </span>
          </div>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center bg-zinc-700 text-zinc-300 cursor-default"
            title={t("notes.useShortcut", "Use Alt (or your configured hotkey) to start dictation")}
          >
            <Mic size={24} />
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
            {t("notes.recents", "Recents")} {filteredNotes.length > 0 && `(${filteredNotes.length})`}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-colors ${showSearch ? "bg-zinc-700 text-zinc-200" : "hover:bg-zinc-700/50 text-zinc-500"
                }`}
              title={t("notes.search", "Search")}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-500"
              title={t("notes.toggleView", "Toggle view")}
            >
              {viewMode === "grid" ? <List size={16} /> : <Grid size={16} />}
            </button>
            <button
              onClick={loadNotes}
              className="p-2 hover:bg-zinc-700/50 rounded-lg transition-colors text-zinc-500"
              title={t("notes.refresh", "Refresh")}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("notes.searchPlaceholder", "Search notes...")}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
              autoFocus
            />
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-500 border-t-transparent" />
          </div>
        ) : filteredNotes.length > 0 ? (
          /* Notes Grid/List */
          <div className={viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 gap-4"
            : "flex flex-col gap-3"
          }>
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`group relative rounded-xl border-2 transition-all hover:shadow-lg ${viewMode === "grid"
                  ? `${getNoteColor(note.id)} p-4 min-h-[140px] flex flex-col`
                  : "bg-background border-zinc-700 p-4 hover:border-zinc-500"
                  }`}
              >
                {/* Note Content */}
                <p className={`text-sm flex-1 ${viewMode === "grid" ? "line-clamp-4" : ""}`}>
                  {note.transcription_text}
                </p>

                {/* Footer */}
                <div className={`flex items-center justify-between mt-3 pt-2 ${viewMode === "grid" ? "border-t border-current/10" : ""
                  }`}>
                  <span className="text-xs text-zinc-500">
                    {formatDate(note.timestamp)}
                  </span>

                  {/* Actions */}
                  <div className={`flex items-center gap-1 ${viewMode === "grid" ? "opacity-0 group-hover:opacity-100" : ""
                    } transition-opacity`}>
                    <button
                      onClick={() => toggleAudio(note)}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title={playingId === note.id ? "Pause" : "Play"}
                    >
                      {playingId === note.id ? (
                        <Pause size={14} className="text-zinc-200" />
                      ) : (
                        <Play size={14} className="text-zinc-500" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(note.transcription_text, note.id)}
                      className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title={t("common.copy", "Copy")}
                    >
                      {copiedId === note.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} className="text-zinc-500" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                      title={t("common.delete", "Delete")}
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <Mic size={28} className="text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500 max-w-xs">
              {searchQuery
                ? t("notes.noResults", "No notes found")
                : t("notes.empty", "No notes yet. Star a transcription in History to save it as a note.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
