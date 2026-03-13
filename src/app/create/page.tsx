"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Sparkles,
  ChevronRight,
  ScrollText,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { getCategories, getDafOptions } from "@/lib/source-data";
import type {
  SourceType,
  ScrollType,
  CalendarType,
  StructuredConfig,
  CalendarConfig,
  CustomConfig,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

const SCROLL_TYPE_OPTIONS: {
  type: ScrollType;
  icon: typeof BookOpen;
  title: string;
  description: string;
  emoji: string;
}[] = [
  {
    type: "structured",
    icon: BookOpen,
    title: "Learn a Text",
    description: "Work through a Masechet, Sefer, or section chapter by chapter",
    emoji: "\uD83D\uDCDA",
  },
  {
    type: "calendar",
    icon: Calendar,
    title: "Follow the Calendar",
    description: "Daf Yomi, Daily Mishnah, or Weekly Parsha",
    emoji: "\uD83D\uDCC5",
  },
  {
    type: "custom",
    icon: Sparkles,
    title: "Custom Topic",
    description: "Explore a specific topic, commentator, or theme",
    emoji: "\u2728",
  },
];

const CALENDAR_OPTIONS: { type: CalendarType; label: string; emoji: string; description: string }[] = [
  { type: "daf_yomi", label: "Daf Yomi", emoji: "\uD83D\uDCD6", description: "Daily page of Talmud" },
  { type: "daily_mishnah", label: "Daily Mishnah", emoji: "\uD83D\uDCDC", description: "Daily Mishnah study" },
  { type: "parsha", label: "Weekly Parsha", emoji: "\uD83D\uDD4E", description: "This week's Torah portion" },
];

const EMOJI_OPTIONS = [
  "\uD83D\uDCDA", "\uD83D\uDCDC", "\uD83D\uDD4E", "\uD83D\uDCD6", "\u2728",
  "\uD83D\uDD25", "\uD83C\uDF1F", "\uD83D\uDCA1", "\uD83C\uDFAF", "\uD83D\uDC8E",
  "\uD83C\uDF3F", "\uD83C\uDF19", "\u2B50", "\uD83D\uDCE3", "\uD83D\uDCA7",
];

type Step = "type" | "configure" | "finalize";

export default function CreateScrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const [step, setStep] = useState<Step>("type");
  const [scrollType, setScrollType] = useState<ScrollType | null>(null);
  const [creating, setCreating] = useState(false);

  // Structured config
  const [sourceType, setSourceType] = useState<SourceType>("mishnayos");
  const [categoryIndex, setCategoryIndex] = useState(-1);
  const [itemIndex, setItemIndex] = useState(-1);

  // Calendar config
  const [calendarType, setCalendarType] = useState<CalendarType>("daf_yomi");

  // Custom config
  const [customTopic, setCustomTopic] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("");

  // Finalize
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverEmoji, setCoverEmoji] = useState("\uD83D\uDCDA");
  const [isPublic, setIsPublic] = useState(true);

  const categories = getCategories(sourceType);
  const selectedCategory = categoryIndex >= 0 ? categories[categoryIndex] : null;
  const selectedItem = selectedCategory && itemIndex >= 0 ? selectedCategory.items[itemIndex] : null;

  const handleSelectType = (type: ScrollType) => {
    setScrollType(type);
    if (type === "calendar") {
      setStep("configure");
    } else {
      setStep("configure");
    }
  };

  const handleContinueToFinalize = () => {
    // Auto-generate title
    if (!title) {
      if (scrollType === "structured" && selectedItem) {
        setTitle(`Learn ${selectedItem.name}`);
        setCoverEmoji("\uD83D\uDCDA");
      } else if (scrollType === "calendar") {
        const cal = CALENDAR_OPTIONS.find((c) => c.type === calendarType);
        setTitle(cal?.label || "Calendar Scroll");
        setCoverEmoji(cal?.emoji || "\uD83D\uDCC5");
      } else if (scrollType === "custom") {
        setTitle(customTopic || "Custom Scroll");
        setCoverEmoji("\u2728");
      }
    }
    setStep("finalize");
  };

  const canContinue = () => {
    if (scrollType === "structured") return selectedItem !== null;
    if (scrollType === "calendar") return true;
    if (scrollType === "custom") return customTopic.trim().length > 0;
    return false;
  };

  const handleCreate = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setCreating(true);

    let config: StructuredConfig | CalendarConfig | CustomConfig;
    let st: SourceType | "mixed" = "mixed";

    if (scrollType === "structured" && selectedItem) {
      config = { slug: selectedItem.slug, sourceType };
      st = sourceType;
    } else if (scrollType === "calendar") {
      config = { calendarType };
      st = calendarType === "daf_yomi" ? "gemara" : calendarType === "daily_mishnah" ? "mishnayos" : "chumash";
    } else {
      config = { topic: customTopic, teachingStyle: teachingStyle || undefined };
      st = "mixed";
    }

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch("/api/scrolls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title || "My Scroll",
          description: description || null,
          scroll_type: scrollType,
          source_type: st,
          config,
          is_public: isPublic,
          cover_emoji: coverEmoji,
        }),
      });

      if (!res.ok) throw new Error("Failed to create");

      const data = await res.json();
      router.push(`/scroll/${data.scroll.id}`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => {
              if (step === "type") router.back();
              else if (step === "configure") setStep("type");
              else setStep("configure");
            }}
            className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
          </button>
          <h1
            className="text-lg font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Create a Scroll
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Step 1: Choose Type */}
        {step === "type" && (
          <div className="space-y-3 fade-in">
            <p className="text-sm text-[var(--muted)] mb-4">
              What would you like to learn?
            </p>
            {SCROLL_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => handleSelectType(opt.type)}
                className="w-full flex items-center gap-4 p-4 bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] hover:border-[var(--accent)] hover:shadow-md transition-all cursor-pointer text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-2xl flex-shrink-0">
                  {opt.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--text)] text-sm">
                    {opt.title}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {opt.description}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === "configure" && scrollType === "structured" && (
          <div className="space-y-4 fade-in">
            <p className="text-sm text-[var(--muted)]">
              Choose what to learn
            </p>

            {/* Source type tabs */}
            <div className="flex gap-1 bg-[var(--bg)] rounded-xl p-1">
              {(["mishnayos", "gemara", "chumash"] as SourceType[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSourceType(st);
                    setCategoryIndex(-1);
                    setItemIndex(-1);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    sourceType === st
                      ? "bg-[var(--card-bg)] text-[var(--accent)] shadow-sm"
                      : "text-[var(--muted)]"
                  }`}
                >
                  {st === "mishnayos" ? "Mishnayos" : st === "gemara" ? "Gemara" : "Tanakh"}
                </button>
              ))}
            </div>

            {/* Category select */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                {sourceType === "chumash" ? "Section" : "Seder"}
              </label>
              <select
                value={categoryIndex}
                onChange={(e) => {
                  setCategoryIndex(parseInt(e.target.value));
                  setItemIndex(-1);
                }}
                className="select-field"
              >
                <option value={-1}>
                  Select {sourceType === "chumash" ? "section" : "seder"}...
                </option>
                {categories.map((c, i) => (
                  <option key={c.name} value={i}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Item select */}
            {selectedCategory && (
              <div className="fade-in">
                <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                  {sourceType === "chumash" ? "Sefer" : "Masechta"}
                </label>
                <select
                  value={itemIndex}
                  onChange={(e) => setItemIndex(parseInt(e.target.value))}
                  className="select-field"
                >
                  <option value={-1}>Select...</option>
                  {selectedCategory.items.map((m, i) => (
                    <option key={m.name} value={i}>
                      {m.name} ({m.useDaf ? `${m.chapters} dapim` : `${m.chapters} chapters`})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Preview selected */}
            {selectedItem && (
              <div className="bg-[var(--accent-light)] rounded-xl p-4 fade-in">
                <div className="flex items-center gap-3">
                  <ScrollText className="w-5 h-5 text-[var(--accent)]" />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">
                      {selectedItem.name}
                    </div>
                    <div className="text-xs text-[var(--muted)]">
                      {selectedItem.useDaf
                        ? `${(selectedItem.chapters - 1) * 2} dapim`
                        : `${selectedItem.chapters} chapters`}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleContinueToFinalize}
              disabled={!canContinue()}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-all disabled:opacity-30 cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {step === "configure" && scrollType === "calendar" && (
          <div className="space-y-3 fade-in">
            <p className="text-sm text-[var(--muted)] mb-2">
              Choose a calendar schedule
            </p>
            {CALENDAR_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => {
                  setCalendarType(opt.type);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  calendarType === opt.type
                    ? "bg-[var(--accent-light)] border-[var(--accent)]"
                    : "bg-[var(--card-bg)] border-[var(--border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <div className="text-2xl">{opt.emoji}</div>
                <div>
                  <div className="font-semibold text-sm text-[var(--text)]">{opt.label}</div>
                  <div className="text-xs text-[var(--muted)]">{opt.description}</div>
                </div>
              </button>
            ))}

            <button
              onClick={handleContinueToFinalize}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-all cursor-pointer mt-4"
            >
              Continue
            </button>
          </div>
        )}

        {step === "configure" && scrollType === "custom" && (
          <div className="space-y-4 fade-in">
            <p className="text-sm text-[var(--muted)]">
              Describe what you want to learn
            </p>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                Topic
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g., Abarbanel on Bereishit, Laws of Shabbos..."
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                Teaching Style (optional)
              </label>
              <input
                type="text"
                value={teachingStyle}
                onChange={(e) => setTeachingStyle(e.target.value)}
                placeholder="e.g., analytical, storytelling, practical halacha..."
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>

            <button
              onClick={handleContinueToFinalize}
              disabled={!canContinue()}
              className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-all disabled:opacity-30 cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Finalize */}
        {step === "finalize" && (
          <div className="space-y-4 fade-in">
            <p className="text-sm text-[var(--muted)]">
              Customize your scroll
            </p>

            {/* Emoji picker */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Cover
              </label>
              <div className="flex gap-2 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setCoverEmoji(emoji)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                      coverEmoji === emoji
                        ? "bg-[var(--accent-light)] border-2 border-[var(--accent)] scale-110"
                        : "bg-[var(--bg)] border border-[var(--border)] hover:scale-105"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What will learners get from this scroll?"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 resize-none"
              />
            </div>

            {/* Public toggle */}
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="w-full flex items-center justify-between p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] cursor-pointer"
            >
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">
                  Share publicly
                </div>
                <div className="text-xs text-[var(--muted)]">
                  Others can discover and follow this scroll
                </div>
              </div>
              <div
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  isPublic ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                    isPublic ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {creating ? (
                <div className="dot-pulse flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              ) : (
                <>
                  <ScrollText className="w-4 h-4" />
                  Create Scroll
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          message="Sign in to create and share scrolls"
        />
      )}
    </div>
  );
}
