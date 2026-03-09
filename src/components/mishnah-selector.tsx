"use client";

import { useState } from "react";
import { getCategories, getDafOptions } from "@/lib/source-data";
import type { SourceType } from "@/lib/types";
import type { SourceItem } from "@/lib/source-data";

interface InlinePickerProps {
  sourceType: SourceType;
  onSelect: (
    slug: string,
    ref: string,
    sourceType: SourceType,
    displayName: string
  ) => void;
  isLoading: boolean;
}

export function InlinePicker({
  sourceType,
  onSelect,
  isLoading,
}: InlinePickerProps) {
  const [categoryIndex, setCategoryIndex] = useState<number>(-1);
  const [itemIndex, setItemIndex] = useState<number>(-1);
  const [perek, setPerek] = useState<string>("");
  const [mishnah, setMishnah] = useState<string>("");

  const categories = getCategories(sourceType);
  const selectedCategory =
    categoryIndex >= 0 ? categories[categoryIndex] : null;
  const selectedItem: SourceItem | null =
    selectedCategory && itemIndex >= 0
      ? selectedCategory.items[itemIndex]
      : null;

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

  const handleGo = () => {
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

  const canGo = selectedItem && perek !== "";
  const categoryLabel = sourceType === "chumash" ? "Section" : "Seder";
  const itemLabel = sourceType === "chumash" ? "Sefer" : "Masechta";
  const refLabel = sourceType === "gemara" ? "Daf" : "Perek";

  return (
    <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-3">
      <div className="max-w-2xl mx-auto flex gap-2 items-end flex-wrap">
        {/* Category */}
        <div className="flex-1 min-w-[100px]">
          <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {categoryLabel}
          </label>
          <select
            value={categoryIndex}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="select-field text-[13px] py-2"
          >
            <option value={-1}>Choose...</option>
            {categories.map((c, i) => (
              <option key={c.name} value={i}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Item */}
        <div className="flex-1 min-w-[110px]">
          <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {itemLabel}
          </label>
          <select
            value={itemIndex}
            onChange={(e) => handleItemChange(e.target.value)}
            disabled={!selectedCategory}
            className="select-field text-[13px] py-2"
          >
            <option value={-1}>Choose...</option>
            {selectedCategory?.items.map((m, i) => (
              <option key={m.name} value={i}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Perek / Daf */}
        <div className="w-[80px]">
          <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            {refLabel}
          </label>
          <select
            value={perek}
            onChange={(e) => handlePerekChange(e.target.value)}
            disabled={!selectedItem}
            className="select-field text-[13px] py-2"
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
          <div className="w-[70px]">
            <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Mishnah
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={mishnah}
              onChange={(e) => setMishnah(e.target.value)}
              placeholder="All"
              className="select-field text-[13px] py-2 tabular-nums"
              style={{ paddingRight: 8 }}
            />
          </div>
        )}

        {/* Go button */}
        <button
          onClick={handleGo}
          disabled={!canGo || isLoading}
          className="px-5 py-2 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-[13px] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-[0.97] whitespace-nowrap"
        >
          {isLoading ? "..." : "Go"}
        </button>
      </div>
    </div>
  );
}
