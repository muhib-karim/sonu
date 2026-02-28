import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Textarea } from "../../ui/Textarea";

interface Snippet {
  id: string;
  title: string;
  text: string;
  createdAt: string;
}

export const SnippetsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sonu-snippets");
    if (saved) {
      try {
        setSnippets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load snippets:", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("sonu-snippets", JSON.stringify(snippets));
  }, [snippets]);

  const openAddModal = () => {
    setEditingSnippet(null);
    setTitle("");
    setText("");
    setShowModal(true);
  };

  const openEditModal = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setTitle(snippet.title);
    setText(snippet.text);
    setShowModal(true);
  };

  const saveSnippet = () => {
    if (title.trim() && text.trim()) {
      if (editingSnippet) {
        setSnippets(
          snippets.map((s) =>
            s.id === editingSnippet.id
              ? { ...s, title: title.trim(), text: text.trim() }
              : s,
          ),
        );
      } else {
        const snippet: Snippet = {
          id: Date.now().toString(),
          title: title.trim(),
          text: text.trim(),
          createdAt: new Date().toISOString(),
        };
        setSnippets([...snippets, snippet]);
      }
      closeModal();
    }
  };

  const deleteSnippet = (id: string) => {
    setSnippets(snippets.filter((s) => s.id !== id));
  };

  const copySnippet = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSnippet(null);
    setTitle("");
    setText("");
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("snippets.title", "Snippets")}
        </h1>
        <Button onClick={openAddModal} className="gap-2">
          <Plus size={16} />
          {t("snippets.new", "New snippet")}
        </Button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-mid-gray/20 rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {editingSnippet
                ? t("snippets.edit", "Edit snippet")
                : t("snippets.add", "Add snippet")}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("snippets.titleLabel", "Title")}
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("snippets.titlePlaceholder", "Snippet title")}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {t("snippets.textLabel", "Text")}
                </label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("snippets.textPlaceholder", "Snippet text")}
                  rows={6}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="secondary" onClick={closeModal}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button onClick={saveSnippet}>
                {editingSnippet
                  ? t("common.save", "Save changes")
                  : t("snippets.add", "Add snippet")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Snippet List */}
      {snippets.length > 0 ? (
        <SettingsGroup>
          <div className="flex flex-col divide-y divide-mid-gray/10">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="flex items-start justify-between py-4 px-1 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">{snippet.title}</h3>
                  <p className="text-xs text-mid-gray mt-1 line-clamp-2">
                    {snippet.text}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button
                    onClick={() => copySnippet(snippet.text)}
                    className="p-1.5 hover:bg-mid-gray/20 rounded transition-colors"
                    title={t("common.copy", "Copy")}
                  >
                    <Copy size={14} className="text-mid-gray" />
                  </button>
                  <button
                    onClick={() => openEditModal(snippet)}
                    className="p-1.5 hover:bg-mid-gray/20 rounded transition-colors"
                    title={t("common.edit", "Edit")}
                  >
                    <Pencil size={14} className="text-mid-gray" />
                  </button>
                  <button
                    onClick={() => deleteSnippet(snippet.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                    title={t("common.delete", "Delete")}
                  >
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SettingsGroup>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-mid-gray">
            {t(
              "snippets.empty",
              'No snippets yet. Click "New snippet" to add one.',
            )}
          </p>
        </div>
      )}
    </div>
  );
};
