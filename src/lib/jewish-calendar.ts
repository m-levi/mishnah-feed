import type { SourceType } from "./types";

export interface CalendarPick {
  slug: string;
  ref: string;
  sourceType: SourceType;
  displayName: string;
  context?: string; // extra context like parsha description
  label?: string; // badge label like "This Week's Parsha" or "Daf Yomi"
}

interface CalendarData {
  parsha: CalendarPick | null;
  dafYomi: CalendarPick | null;
  dailyMishnah: CalendarPick | null;
  hebrewDate: string;
}

// Cache calendar data for 12 hours
let calendarCache: { data: CalendarData; expires: number } | null = null;
const CACHE_TTL = 12 * 60 * 60 * 1000;

function parseSefariaUrl(url: string): { slug: string; ref: string } | null {
  // Examples:
  // "Exodus.35.1-40.38" → slug: "Exodus", ref: "35"
  // "Menachot.58" → slug: "Menachot", ref: "58a"
  // "Mishnah_Meilah.2.1-2" → slug: "Mishnah_Meilah", ref: "2"
  const parts = url.split(".");
  if (parts.length < 2) return null;
  const slug = parts[0];
  const ref = parts[1];
  return { slug, ref };
}

export async function getCalendarData(): Promise<CalendarData> {
  if (calendarCache && Date.now() < calendarCache.expires) {
    return calendarCache.data;
  }

  const result: CalendarData = {
    parsha: null,
    dafYomi: null,
    dailyMishnah: null,
    hebrewDate: "",
  };

  try {
    const res = await fetch("https://www.sefaria.org/api/calendars");
    if (!res.ok) return result;
    const data = await res.json();

    const items = data.calendar_items || [];

    for (const item of items) {
      const title = item.title?.en;
      const url = item.url;
      const displayValue = item.displayValue?.en;

      if (title === "Parashat Hashavua" && url) {
        const parsed = parseSefariaUrl(url);
        if (parsed) {
          // Get first aliyah for focused text
          const firstAliyah = item.extraDetails?.aliyot?.[0];
          let aliyahRef = parsed.ref;
          if (firstAliyah) {
            const aliyahParsed = parseSefariaUrl(firstAliyah.replace(/ /g, "."));
            if (aliyahParsed) aliyahRef = aliyahParsed.ref;
          }

          result.parsha = {
            slug: parsed.slug,
            ref: aliyahRef,
            sourceType: "chumash",
            displayName: `Parshas ${displayValue}`,
            context: item.description?.en || "",
            label: "This Week's Parsha",
          };
        }
      }

      if (title === "Daf Yomi" && url) {
        const parsed = parseSefariaUrl(url);
        if (parsed) {
          result.dafYomi = {
            slug: parsed.slug,
            ref: `${parsed.ref}a`,
            sourceType: "gemara",
            displayName: `Daf Yomi: ${displayValue}`,
            label: "Daf Yomi",
          };
        }
      }

      if (title === "Daily Mishnah" && url) {
        const parsed = parseSefariaUrl(url);
        if (parsed) {
          result.dailyMishnah = {
            slug: parsed.slug,
            ref: parsed.ref,
            sourceType: "mishnayos",
            displayName: `Daily Mishnah: ${displayValue}`,
            label: "Daily Mishnah",
          };
        }
      }

      // Extract Hebrew date from Tanya entry
      if (title === "Tanya Yomi" && item.displayValue?.en) {
        result.hebrewDate = item.displayValue.en;
      }
    }
  } catch (e) {
    console.error("Failed to fetch calendar:", e);
  }

  calendarCache = { data: result, expires: Date.now() + CACHE_TTL };
  return result;
}
