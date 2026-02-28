import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Info } from "lucide-react";

type Category = "personal" | "work" | "email" | "other";

interface StyleOption {
  id: string;
  name: string;
  description: string;
  example: string;
}

const STYLE_OPTIONS: Record<Category, StyleOption[]> = {
  personal: [
    {
      id: "casual",
      name: "Casual",
      description: "Relaxed and informal",
      example: "hey! just wanted to check in and see how you're doing 😊",
    },
    {
      id: "friendly",
      name: "Friendly",
      description: "Warm and approachable",
      example:
        "Hi there! Hope you're having a great day. Just wanted to touch base.",
    },
    {
      id: "brief",
      name: "Brief",
      description: "Short and to the point",
      example: "Quick update: meeting moved to 3pm. See you there.",
    },
  ],
  work: [
    {
      id: "professional",
      name: "Professional",
      description: "Formal business tone",
      example:
        "Dear Team, I am writing to provide an update on our quarterly objectives.",
    },
    {
      id: "direct",
      name: "Direct",
      description: "Clear and actionable",
      example:
        "Action required: Please review the attached document by Friday EOD.",
    },
    {
      id: "collaborative",
      name: "Collaborative",
      description: "Team-focused language",
      example:
        "Let's work together on this. I'd love to hear your thoughts and ideas.",
    },
  ],
  email: [
    {
      id: "formal",
      name: "Formal",
      description: "Traditional email format",
      example:
        "Dear Mr. Smith,\n\nI hope this email finds you well. I am writing to...",
    },
    {
      id: "concise",
      name: "Concise",
      description: "Get to the point quickly",
      example:
        "Subject: Q4 Report\n\nAttached is the Q4 report. Key findings on page 3.",
    },
    {
      id: "warm",
      name: "Warm",
      description: "Personable yet professional",
      example:
        "Hi Sarah,\n\nGreat catching up yesterday! As discussed, here are the details...",
    },
  ],
  other: [
    {
      id: "neutral",
      name: "Neutral",
      description: "No specific style applied",
      example:
        "The text will be transcribed as spoken without style modifications.",
    },
    {
      id: "technical",
      name: "Technical",
      description: "Precise and detailed",
      example:
        "The implementation follows the MVC pattern with dependency injection.",
    },
    {
      id: "creative",
      name: "Creative",
      description: "Expressive and unique",
      example:
        "Picture this: a world where ideas flow freely, unbound by convention...",
    },
  ],
};

const CATEGORY_INFO: Record<Category, string> = {
  personal:
    "This style applies in personal messengers. Available on desktop in English.",
  work: "This style applies in work-related applications like Slack and Teams.",
  email: "This style applies in email clients like Gmail and Outlook.",
  other: "This style applies in other contexts not covered above.",
};

export const StyleSettings: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<Category>("personal");
  const [selectedStyles, setSelectedStyles] = useState<
    Record<Category, string>
  >({
    personal: "casual",
    work: "professional",
    email: "formal",
    other: "neutral",
  });
  const [llmEnabled, setLlmEnabled] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sonu-styles");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedStyles(parsed.selectedStyles || selectedStyles);
        setLlmEnabled(parsed.llmEnabled || false);
      } catch (e) {
        console.error("Failed to load styles:", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(
      "sonu-styles",
      JSON.stringify({ selectedStyles, llmEnabled }),
    );
  }, [selectedStyles, llmEnabled]);

  const selectStyle = (styleId: string) => {
    setSelectedStyles({
      ...selectedStyles,
      [activeCategory]: styleId,
    });
  };

  const categories: { id: Category; label: string }[] = [
    { id: "personal", label: t("style.personal", "Personal messages") },
    { id: "work", label: t("style.work", "Work messages") },
    { id: "email", label: t("style.email", "Email") },
    { id: "other", label: t("style.other", "Other") },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">
        {t("style.title", "Style")}
      </h1>

      {/* Category Tabs */}
      <div className="flex gap-6 border-b border-zinc-700 pb-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-sm font-medium pb-3 border-b-2 transition-colors ${
              activeCategory === cat.id
                ? "border-zinc-400 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <Info size={20} className="text-amber-500 shrink-0" />
        <p className="text-sm">{CATEGORY_INFO[activeCategory]}</p>
      </div>

      {/* Style Options */}
      <div className="grid gap-3">
        {STYLE_OPTIONS[activeCategory].map((style) => (
          <div
            key={style.id}
            onClick={() => selectStyle(style.id)}
            className={`p-4 border rounded-xl cursor-pointer transition-all ${
              selectedStyles[activeCategory] === style.id
                ? "border-zinc-500 bg-zinc-800/50 shadow-sm"
                : "border-zinc-700 hover:border-zinc-600"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold">{style.name}</h3>
                <p className="text-xs text-zinc-500">{style.description}</p>
              </div>
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedStyles[activeCategory] === style.id
                    ? "border-zinc-400 bg-zinc-400"
                    : "border-zinc-600"
                }`}
              >
                {selectedStyles[activeCategory] === style.id && (
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </div>
            </div>
            <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{style.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
