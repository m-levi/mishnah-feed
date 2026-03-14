"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { getCategories } from "@/lib/source-data";
import type {
  SourceType,
  ScrollType,
  CalendarType,
  StructuredConfig,
  CalendarConfig,
  CustomConfig,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

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
  const [calendarType, setCalendarType] = useState<CalendarType | null>(null);

  // Custom config
  const [customTopic, setCustomTopic] = useState("");

  // Finalize
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const categories = getCategories(sourceType);
  const selectedCategory = categoryIndex >= 0 ? categories[categoryIndex] : null;
  const selectedItem = selectedCategory && itemIndex >= 0 ? selectedCategory.items[itemIndex] : null;

  const goBack = () => {
    if (step === "type") router.back();
    else if (step === "configure") setStep("type");
    else setStep("configure");
  };

  const handleCreate = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    setCreating(true);

    let config: StructuredConfig | CalendarConfig | CustomConfig;
    let st: SourceType | "mixed" = "mixed";
    let autoTitle = title;

    if (scrollType === "structured" && selectedItem) {
      config = { slug: selectedItem.slug, sourceType };
      st = sourceType;
      if (!autoTitle) autoTitle = selectedItem.name;
    } else if (scrollType === "calendar" && calendarType) {
      config = { calendarType };
      st = calendarType === "daf_yomi" ? "gemara" : calendarType === "daily_mishnah" ? "mishnayos" : "chumash";
      if (!autoTitle) autoTitle = calendarType === "daf_yomi" ? "Daf Yomi" : calendarType === "daily_mishnah" ? "Daily Mishnah" : "Weekly Parsha";
    } else {
      config = { topic: customTopic };
      st = "mixed";
      if (!autoTitle) autoTitle = customTopic;
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
          title: autoTitle || "My Scroll",
          scroll_type: scrollType,
          source_type: st,
          config,
          is_public: isPublic,
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
      {/* Minimal header */}
      <div className="sticky top-0 z-10 bg-[var(--bg)]">
        <div className="max-w-md mx-auto px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
          <button
            onClick={goBack}
            className="w-9 h-9 -ml-1 rounded-full hover:bg-[var(--card-bg)] active:bg-[var(--border)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 pb-12">
        {/* ── Step 1: What kind? ── */}
        {step === "type" && (
          <div className="fade-in">
            <h1
              className="text-2xl font-bold text-[var(--text)] mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              New scroll
            </h1>
            <p className="text-[13px] text-[var(--muted)] mb-8">
              Pick how you want to learn.
            </p>

            <div className="space-y-2">
              {([
                { type: "structured" as ScrollType, label: "Masechet or Sefer", sub: "Chapter by chapter" },
                { type: "calendar" as ScrollType, label: "Daily / Weekly", sub: "Daf Yomi, Mishnah, Parsha" },
                { type: "custom" as ScrollType, label: "Something else", sub: "Any topic you choose" },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => { setScrollType(opt.type); setStep("configure"); }}
                  className="w-full text-left px-4 py-3.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--accent-light)] border border-transparent hover:border-[var(--accent-muted)] transition-all cursor-pointer group"
                >
                  <span className="text-[14px] font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                    {opt.label}
                  </span>
                  <span className="block text-[12px] text-[var(--muted)] mt-0.5">
                    {opt.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2a: Structured ── */}
        {step === "configure" && scrollType === "structured" && (
          <div className="fade-in">
            <h1
              className="text-2xl font-bold text-[var(--text)] mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Choose a text
            </h1>
            <p className="text-[13px] text-[var(--muted)] mb-6">
              You&apos;ll go through it at your own pace.
            </p>

            {/* Source type pills */}
            <div className="flex gap-2 mb-5">
              {(["mishnayos", "gemara", "chumash"] as SourceType[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSourceType(st);
                    setCategoryIndex(-1);
                    setItemIndex(-1);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                    sourceType === st
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--text)]"
                  }`}
                >
                  {st === "mishnayos" ? "Mishnayos" : st === "gemara" ? "Gemara" : "Tanakh"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <select
                value={categoryIndex}
                onChange={(e) => { setCategoryIndex(parseInt(e.target.value)); setItemIndex(-1); }}
                className="select-field"
              >
                <option value={-1}>
                  {sourceType === "chumash" ? "Section" : "Seder"}...
                </option>
                {categories.map((c, i) => (
                  <option key={c.name} value={i}>{c.name}</option>
                ))}
              </select>

              {selectedCategory && (
                <select
                  value={itemIndex}
                  onChange={(e) => setItemIndex(parseInt(e.target.value))}
                  className="select-field fade-in"
                >
                  <option value={-1}>
                    {sourceType === "chumash" ? "Sefer" : "Masechta"}...
                  </option>
                  {selectedCategory.items.map((m, i) => (
                    <option key={m.name} value={i}>{m.name}</option>
                  ))}
                </select>
              )}
            </div>

            {selectedItem && (
              <div className="mt-5 fade-in">
                <p className="text-xs text-[var(--muted)] mb-4">
                  {selectedItem.useDaf
                    ? `${(selectedItem.chapters - 1) * 2} dapim`
                    : `${selectedItem.chapters} chapters`}
                </p>
                <button
                  onClick={() => {
                    setTitle(selectedItem.name);
                    setStep("finalize");
                  }}
                  className="w-full py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[14px] transition-colors cursor-pointer"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2b: Calendar ── */}
        {step === "configure" && scrollType === "calendar" && (
          <div className="fade-in">
            <h1
              className="text-2xl font-bold text-[var(--text)] mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Follow a schedule
            </h1>
            <p className="text-[13px] text-[var(--muted)] mb-6">
              New content arrives automatically.
            </p>

            <div className="space-y-2">
              {([
                { type: "daf_yomi" as CalendarType, label: "Daf Yomi", sub: "A page of Gemara, every day" },
                { type: "daily_mishnah" as CalendarType, label: "Daily Mishnah", sub: "The worldwide Mishnah cycle" },
                { type: "parsha" as CalendarType, label: "Weekly Parsha", sub: "This week's Torah portion" },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setCalendarType(opt.type)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                    calendarType === opt.type
                      ? "bg-[var(--accent-light)] border-[var(--accent-muted)]"
                      : "bg-[var(--card-bg)] border-transparent hover:bg-[var(--accent-light)]"
                  }`}
                >
                  <span className={`text-[14px] font-semibold ${calendarType === opt.type ? "text-[var(--accent)]" : "text-[var(--text)]"}`}>
                    {opt.label}
                  </span>
                  <span className="block text-[12px] text-[var(--muted)] mt-0.5">{opt.sub}</span>
                </button>
              ))}
            </div>

            {calendarType && (
              <button
                onClick={() => setStep("finalize")}
                className="w-full mt-6 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[14px] transition-colors cursor-pointer fade-in"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* ── Step 2c: Custom ── */}
        {step === "configure" && scrollType === "custom" && (
          <div className="fade-in">
            <h1
              className="text-2xl font-bold text-[var(--text)] mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What do you want to learn?
            </h1>
            <p className="text-[13px] text-[var(--muted)] mb-6">
              Describe a topic, commentator, or theme.
            </p>

            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Abarbanel on Bereishit"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[14px] text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />

            {customTopic.trim().length > 0 && (
              <button
                onClick={() => { setTitle(customTopic); setStep("finalize"); }}
                className="w-full mt-5 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[14px] transition-colors cursor-pointer fade-in"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* ── Step 3: Name & create ── */}
        {step === "finalize" && (
          <div className="fade-in">
            <h1
              className="text-2xl font-bold text-[var(--text)] mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Almost there
            </h1>
            <p className="text-[13px] text-[var(--muted)] mb-6">
              Give your scroll a name.
            </p>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="Scroll name"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-[14px] text-[var(--text)] placeholder:text-[var(--muted)]/60 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />

            {/* Public toggle */}
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="mt-4 flex items-center gap-3 text-left cursor-pointer group"
            >
              <div
                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  isPublic ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    isPublic ? "translate-x-[18px]" : "translate-x-0.5"
                  }`}
                />
              </div>
              <span className="text-[13px] text-[var(--muted)]">
                {isPublic ? "Anyone can find and follow this" : "Only you can see this"}
              </span>
            </button>

            <button
              onClick={handleCreate}
              disabled={creating || !title.trim()}
              className="w-full mt-8 py-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[14px] transition-all disabled:opacity-40 cursor-pointer"
            >
              {creating ? "Creating..." : "Create scroll"}
            </button>
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          message="Sign in to create scrolls"
        />
      )}
    </div>
  );
}
