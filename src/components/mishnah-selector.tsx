"use client";

import { getCategories, getDafOptions } from "@/lib/source-data";
import type { SourceType, PickerState } from "@/lib/types";
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
  state: PickerState;
  onStateChange: (state: PickerState) => void;
}

export function InlinePicker({
  sourceType,
  onSelect,
  isLoading,
  state,
  onStateChange,
}: InlinePickerProps) {
  const { categoryIndex, itemIndex, perek, mishnah } = state;

  const categories = getCategories(sourceType);
  const selectedCategory =
    categoryIndex >= 0 ? categories[categoryIndex] : null;
  const selectedItem: SourceItem | null =
    selectedCategory && itemIndex >= 0
      ? selectedCategory.items[itemIndex]
      : null;

  const handleCategoryChange = (val: string) => {
    onStateChange({
      categoryIndex: parseInt(val),
      itemIndex: -1,
      perek: "",
      mishnah: "",
    });
  };

  const handleItemChange = (val: string) => {
    onStateChange({
      ...state,
      itemIndex: parseInt(val),
      perek: "",
      mishnah: "",
    });
  };

  const handlePerekChange = (val: string) => {
    onStateChange({ ...state, perek: val, mishnah: "" });
  };

  const handleMishnahChange = (val: string) => {
    onStateChange({ ...state, mishnah: val });
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
    <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-3 picker-slide-in">
      <div className="max-w-2xl mx-auto">
        <div className="flex gap-2 items-end flex-wrap">
          {/* Category */}
          <div className="flex-1 min-w-[90px]">
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
          <div className="flex-1 min-w-[100px]">
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
          <div className="w-[75px]">
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
            <div className="w-[65px]">
              <label className="block text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
                Mishnah
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={mishnah}
                onChange={(e) => handleMishnahChange(e.target.value)}
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
    </div>
  );
}
