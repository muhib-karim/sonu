import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { ToggleSwitch } from "../../ui/ToggleSwitch";
import { useSettings } from "../../../hooks/useSettings";
import type { VoiceCommand } from "@/bindings";

export const DictionarySettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSetting } = useSettings();
  const [newWord, setNewWord] = useState("");
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const migratedRef = useRef(false);

  /**
   * The vocabulary lives in `settings.custom_words` — that is the list the
   * transcription pipeline actually consumes via `apply_custom_words`. It used
   * to be kept only in localStorage, so words added here had no effect on
   * recognition at all and the app had two unrelated word lists.
   */
  const words: string[] = settings?.custom_words ?? [];

  // One-time migration of entries written by the old localStorage-only version,
  // so nobody loses words they had already added.
  useEffect(() => {
    if (!settings || migratedRef.current) return;
    migratedRef.current = true;

    const raw = localStorage.getItem("sonu-dictionary");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Array<{ word?: string }>;
      const legacy = parsed
        .map((entry) => entry?.word?.trim())
        .filter((word): word is string => Boolean(word));

      if (legacy.length > 0) {
        const merged = [...words];
        const seen = new Set(merged.map((w) => w.toLowerCase()));
        for (const word of legacy) {
          if (!seen.has(word.toLowerCase())) {
            merged.push(word);
            seen.add(word.toLowerCase());
          }
        }
        if (merged.length !== words.length) {
          void updateSetting("custom_words", merged);
        }
      }

      localStorage.removeItem("sonu-dictionary");
    } catch (e) {
      console.error("Failed to migrate the legacy dictionary:", e);
    }
  }, [settings, words, updateSetting]);

  const addWord = async () => {
    const word = newWord.trim();
    if (!word) return;
    setNewWord("");
    setShowAddModal(false);

    // Case-insensitive de-duplication: the matcher compares lowercased forms.
    if (words.some((w) => w.toLowerCase() === word.toLowerCase())) {
      return;
    }
    await updateSetting("custom_words", [...words, word]);
  };

  const deleteWord = async (word: string) => {
    await updateSetting(
      "custom_words",
      words.filter((w) => w !== word),
    );
  };

  const startEdit = (word: string) => {
    setEditingWord(word);
    setEditValue(word);
  };

  const saveEdit = async () => {
    const next = editValue.trim();
    if (!editingWord || !next) return;

    await updateSetting(
      "custom_words",
      words.map((w) => (w === editingWord ? next : w)),
    );
    setEditingWord(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingWord(null);
    setEditValue("");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("dictionary.title", "Dictionary")}
        </h1>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus size={16} />
          {t("dictionary.newWord", "New word")}
        </Button>
      </div>

      {/* Add Word Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-mid-gray/20 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {t("dictionary.addWord", "Add to vocabulary")}
            </h2>
            <Input
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder={t("dictionary.placeholder", "Add a new word")}
              onKeyDown={(e) => e.key === "Enter" && addWord()}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setNewWord("");
                }}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={addWord}>
                {t("dictionary.add", "Add word")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Word List */}
      {words.length > 0 ? (
        <SettingsGroup>
          <div className="flex flex-col divide-y divide-mid-gray/10">
            {words.map((word) => (
              <div
                key={word}
                className="flex items-center justify-between py-3 px-1 group"
              >
                {editingWord === word ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      className="flex-1"
                    />
                    <Button size="sm" onClick={saveEdit}>
                      {t("common.save", "Save")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>
                      {t("common.cancel", "Cancel")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm">{word}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        aria-label={t("dictionary.editWord", "Edit word")}
                        onClick={() => startEdit(word)}
                        className="p-1.5 hover:bg-mid-gray/20 rounded transition-colors"
                      >
                        <Pencil size={14} className="text-mid-gray" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("dictionary.deleteWord", "Delete word")}
                        onClick={() => deleteWord(word)}
                        className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </SettingsGroup>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-mid-gray">
            {t(
              "dictionary.empty",
              'No words in your dictionary yet. Click "New word" to add one.',
            )}
          </p>
        </div>
      )}

      <VoiceCommandsSection />
    </div>
  );
};

/* Spoken commands & macros: built-in structural commands plus user-defined
   phrase → text replacements, applied to every transcription. */
const VoiceCommandsSection: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateSetting, isUpdating } = useSettings();
  const [newPhrase, setNewPhrase] = useState("");
  const [newReplacement, setNewReplacement] = useState("");

  const enabled = settings?.voice_commands_enabled ?? true;
  const macros = settings?.voice_commands ?? [];

  const addMacro = () => {
    const phrase = newPhrase.trim().toLowerCase();
    const replacement = newReplacement.trim();
    if (!phrase || !replacement) return;
    void updateSetting("voice_commands", [
      ...macros,
      { phrase, replacement } as VoiceCommand,
    ]);
    setNewPhrase("");
    setNewReplacement("");
  };

  const removeMacro = (index: number) => {
    void updateSetting(
      "voice_commands",
      macros.filter((_, i) => i !== index),
    );
  };

  return (
    <SettingsGroup
      title={t("voiceCommands.title", "Voice commands")}
      description={t(
        "voiceCommands.description",
        "Spoken commands and macros applied to every transcription.",
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-3">
        <ToggleSwitch
          checked={enabled}
          onChange={(value) => updateSetting("voice_commands_enabled", value)}
          isUpdating={isUpdating("voice_commands_enabled")}
          label={t("voiceCommands.enable.label", "Enable voice commands")}
          description={t(
            "voiceCommands.enable.description",
            'Recognize spoken commands like "new line" and "new paragraph" while dictating.',
          )}
          descriptionMode="tooltip"
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">
              {t("voiceCommands.macros.title", "Custom macros")}
            </span>
            <span className="text-xs text-mid-gray">
              {t(
                "voiceCommands.macros.description",
                "Say the phrase and SONU inserts the replacement.",
              )}
            </span>
          </div>

          {macros.map((macro, index) => (
            <div
              key={`${macro.phrase}-${index}`}
              className="flex items-center gap-2"
            >
              <span className="text-sm flex-1 truncate">
                &ldquo;{macro.phrase}&rdquo;
              </span>
              <span className="text-mid-gray">→</span>
              <span className="text-sm flex-1 truncate">
                {macro.replacement}
              </span>
              <button
                onClick={() => removeMacro(index)}
                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                aria-label={t("voiceCommands.remove", "Remove macro")}
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              placeholder={t(
                "voiceCommands.phrasePlaceholder",
                "Spoken phrase (e.g. my email)",
              )}
              className="flex-1"
            />
            <span className="text-mid-gray">→</span>
            <Input
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder={t(
                "voiceCommands.replacementPlaceholder",
                "Replacement text",
              )}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addMacro()}
            />
            <Button
              onClick={addMacro}
              className="gap-2"
              disabled={!newPhrase.trim() || !newReplacement.trim()}
            >
              <Plus size={16} />
              {t("voiceCommands.add", "Add macro")}
            </Button>
          </div>

          <p className="text-xs text-mid-gray">
            {t(
              "voiceCommands.builtIn.hint",
              'Built-in: "new line" inserts a line break, "new paragraph" starts a new paragraph.',
            )}
          </p>
        </div>
      </div>
    </SettingsGroup>
  );
};
