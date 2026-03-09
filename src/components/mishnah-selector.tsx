"use client";

import { useState } from "react";
import { BookOpen, BookMarked, ScrollText, ChevronRight } from "lucide-react";
import { getCategories, getDafOptions } from "@/lib/source-data";
import type { SourceType } from "@/lib/types";
import type { SourceItem } from "@/lib/source-data";

interface SelectorProps {
  onSelect: (slug: string, ref: string, sourceType: SourceType, displayName: string) => void;
  isLoading: boolean;
}

const sourceTypes: { key: SourceType; label: string; icon: typeof BookOpen; desc: string }[] = [
  { key: "mishnayos", label: "Mishnayos", icon: ScrollText, desc: "Oral Torah" },
  { key: "gemara", label: "Gemara", icon: BookMarked, desc: "Talmud Bavli" },
  { key: "chumash", label: "Tanakh", icon: BookOpen, desc: "Written Torah" },
];

export function MishnahSelector({ onSelect, isLoading }: SelectorProps) {
  const [sourceType, setSourceType] = useState<SourceType>("mishnayos");
  const [categoryIndex, setCategoryIndex] = useState<number>(-1);
  const [itemIndex, setItemIndex] = useState<number>(-1);
  const [perek, setPerek] = useState<string>("");
  const [mishnah, setMishnah] = useState<string>("");

  const categories = getCategories(sourceType);
  const selectedCategory = categoryIndex >= 0 ? categories[categoryIndex] : null;
  const selectedItem: SourceItem | null =
    selectedCategory && itemIndex >= 0 ? selectedCategory.items[itemIndex] : null;

  const handleSourceTypeChange = (type: SourceType) => {
    setSourceType(type);
    setCategoryIndex(-1);
    setItemIndex(-1);
    setPerek("");
    setMishnah("");
  };

  const handleCategoryChange = (val: string) => {
    setCategoryIndex(parseInt(val));
    setItemIndex(-1);
    setPerek("");
    setMishnah("");
  };

  const handleItemChange = (val: string) => {
    setItemIndex(parseInt(val));
    setPerek("");
    setMishnah("");
  };

  const handlePerekChange = (val: string) => {
    setPerek(val);
    setMishnah("");
  };

  const handleLearn = () => {
    if (!selectedItem || !perek) return;

    let ref = perek;
    if (sourceType === "mishnayos" && mishnah) {
      ref = `${perek}.${mishnah}`;
    }

    const displayName = mishnah
      ? `${selectedItem.name} ${perek}:${mishnah}`
      : `${selectedItem.name} ${perek}`;
    onSelect(selectedItem.slug, ref, sourceType, displayName);
  };

  const canLearn = selectedItem && perek !== "";

  const categoryLabel = sourceType === "chumash" ? "Section" : "Seder";
  const itemLabel = sourceType === "chumash" ? "Sefer" : "Masechta";
  const refLabel = sourceType === "gemara" ? "Daf" : "Perek";

  // Build breadcrumb
  const crumbs: string[] = [];
  if (selectedCategory) crumbs.push(selectedCategory.name);
  if (selectedItem) crumbs.push(selectedItem.name);
  if (perek) crumbs.push(sourceType === "gemara" ? `Daf ${perek}` : `Perek ${perek}`);
  if (mishnah) crumbs.push(`Mishnah ${mishnah}`);

  return (
    <div className="sticky top-0 z-10 bg-[var(--card-bg)] border-b border-[var(--border)] shadow-sm">
      {/* Top bar */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-extrabold text-[var(--text)] tracking-tight">
              MishnahFeed
            </span>
          </div>
          {crumbs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-[var(--muted)]">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  <span className={i === crumbs.length - 1 ? "text-[var(--text)] font-semibold" : ""}>
                    {c}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Source type cards */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--highlight)]">
        <div className="max-w-2xl mx-auto flex gap-2">
          {sourceTypes.map((st) => {
            const Icon = st.icon;
            const active = sourceType === st.key;
            return (
              <button
                key={st.key}
                onClick={() => handleSourceTypeChange(st.key)}
                className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all cursor-pointer border ${
                  active
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-md shadow-blue-500/20"
                    : "bg-[var(--card-bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent)]/40"
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : "text-[var(--accent)]"}`} />
                <div className="text-left min-w-0">
                  <div className={`text-sm font-bold leading-tight ${active ? "text-white" : ""}`}>
                    {st.label}
                  </div>
                  <div className={`text-[11px] leading-tight ${active ? "text-white/70" : "text-[var(--muted)]"}`}>
                    {st.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection row */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 items-end flex-wrap">
            {/* Category */}
            <div className="flex-1 min-w-[130px]">
              <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                {categoryLabel}
              </label>
              <select
                value={categoryIndex}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23536471%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8"
              >
                <option value={-1}>Choose...</option>
                {categories.map((c, i) => (
                  <option key={c.name} value={i}>
                    {c.name} ({c.hebrewName})
                  </option>
                ))}
              </select>
            </div>

            {/* Item */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                {itemLabel}
              </label>
              <select
                value={itemIndex}
                onChange={(e) => handleItemChange(e.target.value)}
                disabled={!selectedCategory}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23536471%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8"
              >
                <option value={-1}>Choose...</option>
                {selectedCategory?.items.map((m, i) => (
                  <option key={m.name} value={i}>
                    {m.name} ({m.hebrewName})
                  </option>
                ))}
              </select>
            </div>

            {/* Perek / Daf */}
            <div className="w-[100px]">
              <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                {refLabel}
              </label>
              <select
                value={perek}
                onChange={(e) => handlePerekChange(e.target.value)}
                disabled={!selectedItem}
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23536471%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8"
              >
                <option value="">...</option>
                {selectedItem &&
                  (selectedItem.useDaf
                    ? getDafOptions(selectedItem.chapters).map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))
                    : Array.from({ length: selectedItem.chapters }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </option>
                      )))}
              </select>
            </div>

            {/* Mishnah (mishnayos only) */}
            {sourceType === "mishnayos" && perek && (
              <div className="w-[110px]">
                <label className="block text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                  Mishnah
                </label>
                <select
                  value={mishnah}
                  onChange={(e) => setMishnah(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23536471%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-8"
                >
                  <option value="">All</option>
                  {Array.from({ length: 20 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Learn button */}
            <button
              onClick={handleLearn}
              disabled={!canLearn || isLoading}
              className="px-7 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97]"
            >
              {isLoading ? "Loading..." : "Learn"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
