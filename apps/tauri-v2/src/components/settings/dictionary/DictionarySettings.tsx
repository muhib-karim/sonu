import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";

interface DictionaryWord {
  id: string;
  word: string;
  replacement?: string;
}

export const DictionarySettings: React.FC = () => {
  const { t } = useTranslation();
  const [words, setWords] = useState<DictionaryWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sonu-dictionary");
    if (saved) {
      try {
        setWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load dictionary:", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("sonu-dictionary", JSON.stringify(words));
  }, [words]);

  const addWord = () => {
    if (newWord.trim()) {
      const word: DictionaryWord = {
        id: Date.now().toString(),
        word: newWord.trim(),
      };
      setWords([...words, word]);
      setNewWord("");
      setShowAddModal(false);
    }
  };

  const deleteWord = (id: string) => {
    setWords(words.filter((w) => w.id !== id));
  };

  const startEdit = (word: DictionaryWord) => {
    setEditingId(word.id);
    setEditValue(word.word);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      setWords(
        words.map((w) =>
          w.id === editingId ? { ...w, word: editValue.trim() } : w,
        ),
      );
      setEditingId(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
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
                key={word.id}
                className="flex items-center justify-between py-3 px-1 group"
              >
                {editingId === word.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
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
                    <span className="text-sm">{word.word}</span>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(word)}
                        className="p-1.5 hover:bg-mid-gray/20 rounded transition-colors"
                      >
                        <Pencil size={14} className="text-mid-gray" />
                      </button>
                      <button
                        onClick={() => deleteWord(word.id)}
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
    </div>
  );
};
