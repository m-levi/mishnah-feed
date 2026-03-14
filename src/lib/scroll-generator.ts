import { getCategories, getDafOptions } from "./source-data";
import type {
  SourceType,
  ScrollType,
  ScrollConfig,
  StructuredConfig,
  CalendarConfig,
} from "./types";

export interface GeneratedItem {
  position: number;
  slug: string;
  ref: string;
  source_type: string;
  display_name: string;
}

/**
 * Generate scroll items for a structured scroll (e.g., "Learn Masechet Berakhot").
 * Produces one item per chapter/daf in order.
 */
export function generateStructuredItems(config: StructuredConfig): GeneratedItem[] {
  const categories = getCategories(config.sourceType);
  let item = null;

  for (const cat of categories) {
    for (const it of cat.items) {
      if (it.slug === config.slug) {
        item = it;
        break;
      }
    }
    if (item) break;
  }

  if (!item) return [];

  const items: GeneratedItem[] = [];

  if (item.useDaf) {
    const dafOptions = getDafOptions(item.chapters);
    const startIdx = config.startRef
      ? dafOptions.findIndex((d) => d.value === config.startRef)
      : 0;
    const endIdx = config.endRef
      ? dafOptions.findIndex((d) => d.value === config.endRef)
      : dafOptions.length - 1;

    for (let i = Math.max(0, startIdx); i <= Math.min(dafOptions.length - 1, endIdx); i++) {
      items.push({
        position: items.length,
        slug: item.slug,
        ref: dafOptions[i].value,
        source_type: config.sourceType,
        display_name: `${item.name} ${dafOptions[i].label}`,
      });
    }
  } else {
    const startChapter = config.startRef ? parseInt(config.startRef) : 1;
    const endChapter = config.endRef ? parseInt(config.endRef) : item.chapters;

    for (let ch = startChapter; ch <= endChapter; ch++) {
      items.push({
        position: items.length,
        slug: item.slug,
        ref: String(ch),
        source_type: config.sourceType,
        display_name: `${item.name} ${ch}`,
      });
    }
  }

  return items;
}

/**
 * Generate a single calendar item for today.
 * Calendar scrolls generate items on-demand rather than all at once.
 */
export function generateCalendarItemPlaceholder(
  config: CalendarConfig
): GeneratedItem {
  const typeMap: Record<string, { sourceType: string; label: string }> = {
    daf_yomi: { sourceType: "gemara", label: "Daf Yomi" },
    daily_mishnah: { sourceType: "mishnayos", label: "Daily Mishnah" },
    parsha: { sourceType: "chumash", label: "Weekly Parsha" },
  };

  const info = typeMap[config.calendarType] || typeMap.daf_yomi;

  return {
    position: 0,
    slug: "pending",
    ref: "pending",
    source_type: info.sourceType,
    display_name: info.label,
  };
}

/**
 * Generate scroll items based on scroll type and config.
 */
export function generateScrollItems(
  scrollType: ScrollType,
  config: ScrollConfig
): GeneratedItem[] {
  switch (scrollType) {
    case "structured":
      return generateStructuredItems(config as StructuredConfig);
    case "calendar":
      return [generateCalendarItemPlaceholder(config as CalendarConfig)];
    case "custom":
      return [];
  }
}

/**
 * Look up a source item by slug to get metadata.
 */
export function findSourceBySlug(
  slug: string
): { name: string; sourceType: SourceType; chapters: number; useDaf?: boolean } | null {
  const sourceTypes: SourceType[] = ["mishnayos", "gemara", "chumash"];

  for (const st of sourceTypes) {
    const categories = getCategories(st);
    for (const cat of categories) {
      for (const item of cat.items) {
        if (item.slug === slug) {
          return {
            name: item.name,
            sourceType: st,
            chapters: item.chapters,
            useDaf: item.useDaf,
          };
        }
      }
    }
  }

  return null;
}
