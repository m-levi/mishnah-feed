import type { SourceType } from "./types";

export interface SourceCategory {
  name: string;
  hebrewName: string;
  items: SourceItem[];
}

export interface SourceItem {
  name: string;
  hebrewName: string;
  slug: string;
  chapters: number; // for Mishnayos/Chumash: chapter count; for Gemara: last daf number
  useDaf?: boolean; // true for Gemara (2a, 2b, 3a...)
  segmentsPerChapter?: number[]; // mishnayot per perek (Mishnah) or verses per chapter (Tanakh)
}

/** Get the number of segments (mishnayot/verses) in a specific chapter */
export function getSegmentCount(item: SourceItem, chapter: number): number {
  if (!item.segmentsPerChapter) return 0;
  return item.segmentsPerChapter[chapter - 1] || 0;
}

/** Get total segments across all chapters */
export function getTotalSegments(item: SourceItem): number {
  if (!item.segmentsPerChapter) return 0;
  return item.segmentsPerChapter.reduce((a, b) => a + b, 0);
}

export function getCategories(sourceType: SourceType): SourceCategory[] {
  switch (sourceType) {
    case "mishnayos":
      return mishnayosCategories;
    case "gemara":
      return gemaraCategories;
    case "chumash":
      return tanakhCategories;
  }
}

// Look up an item from picker indices
export function getItemFromState(
  sourceType: SourceType,
  categoryIndex: number,
  itemIndex: number
): SourceItem | null {
  const categories = getCategories(sourceType);
  const cat = categories[categoryIndex];
  if (!cat) return null;
  return cat.items[itemIndex] || null;
}

// Calculate the next ref (next perek, daf, or chapter)
export function getNextRef(
  currentRef: string,
  item: SourceItem
): { ref: string; displayName: string } | null {
  if (item.useDaf) {
    const match = currentRef.match(/^(\d+)([ab])$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const side = match[2];
    let nextRef: string;
    if (side === "a") {
      nextRef = `${num}b`;
    } else {
      if (num + 1 > item.chapters) return null;
      nextRef = `${num + 1}a`;
    }
    return { ref: nextRef, displayName: `${item.name} ${nextRef}` };
  } else {
    const perekStr = currentRef.split(".")[0];
    const num = parseInt(perekStr);
    if (isNaN(num) || num + 1 > item.chapters) return null;
    const nextRef = String(num + 1);
    return { ref: nextRef, displayName: `${item.name} ${nextRef}` };
  }
}

// Generate daf options (2a, 2b, 3a, 3b, ... up to maxDaf)
export function getDafOptions(maxDaf: number): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  for (let d = 2; d <= maxDaf; d++) {
    options.push({ label: `${d}a`, value: `${d}a` });
    options.push({ label: `${d}b`, value: `${d}b` });
  }
  return options;
}

const mishnayosCategories: SourceCategory[] = [
  {
    name: "Zeraim",
    hebrewName: "\u05D6\u05E8\u05E2\u05D9\u05DD",
    items: [
      { name: "Berachos", hebrewName: "\u05D1\u05E8\u05DB\u05D5\u05EA", slug: "Mishnah_Berakhot", chapters: 9, segmentsPerChapter: [5,8,6,7,5,8,5,8,5] },
      { name: "Peah", hebrewName: "\u05E4\u05D0\u05D4", slug: "Mishnah_Peah", chapters: 8, segmentsPerChapter: [6,8,8,11,8,11,8,9] },
      { name: "Demai", hebrewName: "\u05D3\u05DE\u05D0\u05D9", slug: "Mishnah_Demai", chapters: 7, segmentsPerChapter: [4,5,6,7,11,12,8] },
      { name: "Kilayim", hebrewName: "\u05DB\u05DC\u05D0\u05D9\u05DD", slug: "Mishnah_Kilayim", chapters: 9, segmentsPerChapter: [9,11,7,9,8,9,8,6,10] },
      { name: "Sheviis", hebrewName: "\u05E9\u05D1\u05D9\u05E2\u05D9\u05EA", slug: "Mishnah_Sheviit", chapters: 10, segmentsPerChapter: [8,10,10,10,9,6,7,11,9,9] },
      { name: "Terumos", hebrewName: "\u05EA\u05E8\u05D5\u05DE\u05D5\u05EA", slug: "Mishnah_Terumot", chapters: 11, segmentsPerChapter: [10,6,9,13,9,6,7,12,7,12,10] },
      { name: "Maasros", hebrewName: "\u05DE\u05E2\u05E9\u05E8\u05D5\u05EA", slug: "Mishnah_Maasrot", chapters: 5, segmentsPerChapter: [8,8,10,6,8] },
      { name: "Maaser Sheni", hebrewName: "\u05DE\u05E2\u05E9\u05E8 \u05E9\u05E0\u05D9", slug: "Mishnah_Maaser_Sheni", chapters: 5, segmentsPerChapter: [7,10,13,12,15] },
      { name: "Challah", hebrewName: "\u05D7\u05DC\u05D4", slug: "Mishnah_Challah", chapters: 4, segmentsPerChapter: [9,8,10,11] },
      { name: "Orlah", hebrewName: "\u05E2\u05E8\u05DC\u05D4", slug: "Mishnah_Orlah", chapters: 3, segmentsPerChapter: [9,17,9] },
      { name: "Bikkurim", hebrewName: "\u05D1\u05D9\u05DB\u05D5\u05E8\u05D9\u05DD", slug: "Mishnah_Bikkurim", chapters: 4, segmentsPerChapter: [11,11,12,5] },
    ],
  },
  {
    name: "Moed",
    hebrewName: "\u05DE\u05D5\u05E2\u05D3",
    items: [
      { name: "Shabbos", hebrewName: "\u05E9\u05D1\u05EA", slug: "Mishnah_Shabbat", chapters: 24, segmentsPerChapter: [11,7,6,2,4,10,4,7,7,6,6,6,7,4,3,8,8,3,6,5,3,6,5,5] },
      { name: "Eruvin", hebrewName: "\u05E2\u05D9\u05E8\u05D5\u05D1\u05D9\u05DF", slug: "Mishnah_Eruvin", chapters: 10, segmentsPerChapter: [10,6,9,11,9,10,11,11,4,15] },
      { name: "Pesachim", hebrewName: "\u05E4\u05E1\u05D7\u05D9\u05DD", slug: "Mishnah_Pesachim", chapters: 10, segmentsPerChapter: [7,8,8,9,10,6,13,8,11,9] },
      { name: "Shekalim", hebrewName: "\u05E9\u05E7\u05DC\u05D9\u05DD", slug: "Mishnah_Shekalim", chapters: 8, segmentsPerChapter: [7,5,4,9,6,6,7,8] },
      { name: "Yoma", hebrewName: "\u05D9\u05D5\u05DE\u05D0", slug: "Mishnah_Yoma", chapters: 8, segmentsPerChapter: [8,7,11,6,7,8,5,9] },
      { name: "Sukkah", hebrewName: "\u05E1\u05D5\u05DB\u05D4", slug: "Mishnah_Sukkah", chapters: 5, segmentsPerChapter: [11,9,15,10,8] },
      { name: "Beitzah", hebrewName: "\u05D1\u05D9\u05E6\u05D4", slug: "Mishnah_Beitzah", chapters: 5, segmentsPerChapter: [10,10,8,7,7] },
      { name: "Rosh Hashanah", hebrewName: "\u05E8\u05D0\u05E9 \u05D4\u05E9\u05E0\u05D4", slug: "Mishnah_Rosh_Hashanah", chapters: 4, segmentsPerChapter: [9,9,8,9] },
      { name: "Taanis", hebrewName: "\u05EA\u05E2\u05E0\u05D9\u05EA", slug: "Mishnah_Taanit", chapters: 4, segmentsPerChapter: [7,10,9,8] },
      { name: "Megillah", hebrewName: "\u05DE\u05D2\u05D9\u05DC\u05D4", slug: "Mishnah_Megillah", chapters: 4, segmentsPerChapter: [11,6,6,10] },
      { name: "Moed Katan", hebrewName: "\u05DE\u05D5\u05E2\u05D3 \u05E7\u05D8\u05DF", slug: "Mishnah_Moed_Katan", chapters: 3, segmentsPerChapter: [10,5,9] },
      { name: "Chagigah", hebrewName: "\u05D7\u05D2\u05D9\u05D2\u05D4", slug: "Mishnah_Chagigah", chapters: 3, segmentsPerChapter: [8,7,8] },
    ],
  },
  {
    name: "Nashim",
    hebrewName: "\u05E0\u05E9\u05D9\u05DD",
    items: [
      { name: "Yevamos", hebrewName: "\u05D9\u05D1\u05DE\u05D5\u05EA", slug: "Mishnah_Yevamot", chapters: 16, segmentsPerChapter: [4,10,10,13,6,6,6,6,6,9,7,6,13,9,10,7] },
      { name: "Kesubos", hebrewName: "\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA", slug: "Mishnah_Ketubot", chapters: 13, segmentsPerChapter: [10,10,9,12,9,7,10,8,9,6,6,4,11] },
      { name: "Nedarim", hebrewName: "\u05E0\u05D3\u05E8\u05D9\u05DD", slug: "Mishnah_Nedarim", chapters: 11, segmentsPerChapter: [4,5,11,8,6,10,9,7,10,8,12] },
      { name: "Nazir", hebrewName: "\u05E0\u05D6\u05D9\u05E8", slug: "Mishnah_Nazir", chapters: 9, segmentsPerChapter: [7,10,7,7,7,11,4,2,5] },
      { name: "Sotah", hebrewName: "\u05E1\u05D5\u05D8\u05D4", slug: "Mishnah_Sotah", chapters: 9, segmentsPerChapter: [9,6,8,5,5,4,8,7,15] },
      { name: "Gittin", hebrewName: "\u05D2\u05D9\u05D8\u05D9\u05DF", slug: "Mishnah_Gittin", chapters: 9, segmentsPerChapter: [6,7,8,9,9,7,9,10,10] },
      { name: "Kiddushin", hebrewName: "\u05E7\u05D9\u05D3\u05D5\u05E9\u05D9\u05DF", slug: "Mishnah_Kiddushin", chapters: 4, segmentsPerChapter: [10,10,13,14] },
    ],
  },
  {
    name: "Nezikin",
    hebrewName: "\u05E0\u05D6\u05D9\u05E7\u05D9\u05DF",
    items: [
      { name: "Bava Kamma", hebrewName: "\u05D1\u05D1\u05D0 \u05E7\u05DE\u05D0", slug: "Mishnah_Bava_Kamma", chapters: 10, segmentsPerChapter: [4,6,11,9,7,6,7,7,12,10] },
      { name: "Bava Metzia", hebrewName: "\u05D1\u05D1\u05D0 \u05DE\u05E6\u05D9\u05E2\u05D0", slug: "Mishnah_Bava_Metzia", chapters: 10, segmentsPerChapter: [8,11,12,12,11,8,11,9,13,6] },
      { name: "Bava Basra", hebrewName: "\u05D1\u05D1\u05D0 \u05D1\u05EA\u05E8\u05D0", slug: "Mishnah_Bava_Batra", chapters: 10, segmentsPerChapter: [6,14,8,9,11,8,4,8,10,8] },
      { name: "Sanhedrin", hebrewName: "\u05E1\u05E0\u05D4\u05D3\u05E8\u05D9\u05DF", slug: "Mishnah_Sanhedrin", chapters: 11, segmentsPerChapter: [6,5,8,5,5,6,11,7,6,6,6] },
      { name: "Makkos", hebrewName: "\u05DE\u05DB\u05D5\u05EA", slug: "Mishnah_Makkot", chapters: 3, segmentsPerChapter: [10,8,16] },
      { name: "Shevuos", hebrewName: "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA", slug: "Mishnah_Shevuot", chapters: 8, segmentsPerChapter: [7,5,11,13,5,7,8,6] },
      { name: "Eduyos", hebrewName: "\u05E2\u05D3\u05D9\u05D5\u05EA", slug: "Mishnah_Eduyot", chapters: 8, segmentsPerChapter: [14,10,12,12,7,3,9,7] },
      { name: "Avodah Zarah", hebrewName: "\u05E2\u05D1\u05D5\u05D3\u05D4 \u05D6\u05E8\u05D4", slug: "Mishnah_Avodah_Zarah", chapters: 5, segmentsPerChapter: [9,7,10,12,12] },
      { name: "Pirkei Avos", hebrewName: "\u05D0\u05D1\u05D5\u05EA", slug: "Pirkei_Avot", chapters: 6, segmentsPerChapter: [18,16,18,22,23,11] },
      { name: "Horayos", hebrewName: "\u05D4\u05D5\u05E8\u05D9\u05D5\u05EA", slug: "Mishnah_Horayot", chapters: 3, segmentsPerChapter: [5,7,8] },
    ],
  },
  {
    name: "Kodashim",
    hebrewName: "\u05E7\u05D3\u05E9\u05D9\u05DD",
    items: [
      { name: "Zevachim", hebrewName: "\u05D6\u05D1\u05D7\u05D9\u05DD", slug: "Mishnah_Zevachim", chapters: 14, segmentsPerChapter: [4,5,6,6,8,7,6,12,7,8,8,6,8,10] },
      { name: "Menachos", hebrewName: "\u05DE\u05E0\u05D7\u05D5\u05EA", slug: "Mishnah_Menachot", chapters: 13, segmentsPerChapter: [4,5,7,5,9,7,6,7,9,9,9,5,11] },
      { name: "Chullin", hebrewName: "\u05D7\u05D5\u05DC\u05D9\u05DF", slug: "Mishnah_Chullin", chapters: 12, segmentsPerChapter: [7,10,7,7,5,7,6,6,8,4,2,5] },
      { name: "Bechoros", hebrewName: "\u05D1\u05DB\u05D5\u05E8\u05D5\u05EA", slug: "Mishnah_Bekhorot", chapters: 9, segmentsPerChapter: [7,9,4,10,6,12,7,10,8] },
      { name: "Arachin", hebrewName: "\u05E2\u05E8\u05DB\u05D9\u05DF", slug: "Mishnah_Arakhin", chapters: 9, segmentsPerChapter: [4,6,5,4,6,5,5,7,8] },
      { name: "Temurah", hebrewName: "\u05EA\u05DE\u05D5\u05E8\u05D4", slug: "Mishnah_Temurah", chapters: 7, segmentsPerChapter: [6,3,5,4,6,5,6] },
      { name: "Kerisos", hebrewName: "\u05DB\u05E8\u05D9\u05EA\u05D5\u05EA", slug: "Mishnah_Keritot", chapters: 6, segmentsPerChapter: [7,6,10,3,8,9] },
      { name: "Meilah", hebrewName: "\u05DE\u05E2\u05D9\u05DC\u05D4", slug: "Mishnah_Meilah", chapters: 6, segmentsPerChapter: [4,9,8,6,5,6] },
      { name: "Tamid", hebrewName: "\u05EA\u05DE\u05D9\u05D3", slug: "Mishnah_Tamid", chapters: 7, segmentsPerChapter: [4,5,9,3,6,3,4] },
      { name: "Middos", hebrewName: "\u05DE\u05D9\u05D3\u05D5\u05EA", slug: "Mishnah_Middot", chapters: 5, segmentsPerChapter: [9,6,8,7,4] },
      { name: "Kinnim", hebrewName: "\u05E7\u05D9\u05E0\u05D9\u05DD", slug: "Mishnah_Kinnim", chapters: 3, segmentsPerChapter: [4,5,6] },
    ],
  },
  {
    name: "Tohoros",
    hebrewName: "\u05D8\u05D4\u05E8\u05D5\u05EA",
    items: [
      { name: "Keilim", hebrewName: "\u05DB\u05DC\u05D9\u05DD", slug: "Mishnah_Kelim", chapters: 30, segmentsPerChapter: [9,8,8,4,11,4,6,11,8,8,9,8,8,8,6,8,17,9,10,7,3,10,5,17,9,9,12,10,8,4] },
      { name: "Ohalos", hebrewName: "\u05D0\u05D4\u05DC\u05D5\u05EA", slug: "Mishnah_Oholot", chapters: 18, segmentsPerChapter: [8,7,7,3,7,7,6,6,16,7,9,8,6,7,10,5,5,10] },
      { name: "Negaim", hebrewName: "\u05E0\u05D2\u05E2\u05D9\u05DD", slug: "Mishnah_Negaim", chapters: 14, segmentsPerChapter: [6,5,8,11,5,8,5,10,3,10,12,7,12,13] },
      { name: "Parah", hebrewName: "\u05E4\u05E8\u05D4", slug: "Mishnah_Parah", chapters: 12, segmentsPerChapter: [4,5,11,4,9,5,12,11,9,6,9,11] },
      { name: "Tohoros", hebrewName: "\u05D8\u05D4\u05E8\u05D5\u05EA", slug: "Mishnah_Tahorot", chapters: 10, segmentsPerChapter: [9,8,8,13,9,10,9,9,9,8] },
      { name: "Mikvaos", hebrewName: "\u05DE\u05E7\u05D5\u05D5\u05D0\u05D5\u05EA", slug: "Mishnah_Mikvaot", chapters: 10, segmentsPerChapter: [8,10,4,5,6,11,7,5,7,8] },
      { name: "Niddah", hebrewName: "\u05E0\u05D3\u05D4", slug: "Mishnah_Niddah", chapters: 10, segmentsPerChapter: [7,7,7,7,9,14,5,4,11,8] },
      { name: "Machshirin", hebrewName: "\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DF", slug: "Mishnah_Makhshirin", chapters: 6, segmentsPerChapter: [6,11,8,10,11,8] },
      { name: "Zavim", hebrewName: "\u05D6\u05D1\u05D9\u05DD", slug: "Mishnah_Zavim", chapters: 5, segmentsPerChapter: [6,4,3,7,12] },
      { name: "Tevul Yom", hebrewName: "\u05D8\u05D1\u05D5\u05DC \u05D9\u05D5\u05DD", slug: "Mishnah_Tevul_Yom", chapters: 4, segmentsPerChapter: [5,8,6,7] },
      { name: "Yadayim", hebrewName: "\u05D9\u05D3\u05D9\u05DD", slug: "Mishnah_Yadayim", chapters: 4, segmentsPerChapter: [5,4,5,8] },
      { name: "Uktzin", hebrewName: "\u05E2\u05D5\u05E7\u05E6\u05D9\u05DF", slug: "Mishnah_Oktzin", chapters: 3, segmentsPerChapter: [6,10,12] },
    ],
  },
];

const gemaraCategories: SourceCategory[] = [
  {
    name: "Zeraim",
    hebrewName: "\u05D6\u05E8\u05E2\u05D9\u05DD",
    items: [
      { name: "Berachos", hebrewName: "\u05D1\u05E8\u05DB\u05D5\u05EA", slug: "Berakhot", chapters: 64, useDaf: true },
    ],
  },
  {
    name: "Moed",
    hebrewName: "\u05DE\u05D5\u05E2\u05D3",
    items: [
      { name: "Shabbos", hebrewName: "\u05E9\u05D1\u05EA", slug: "Shabbat", chapters: 157, useDaf: true },
      { name: "Eruvin", hebrewName: "\u05E2\u05D9\u05E8\u05D5\u05D1\u05D9\u05DF", slug: "Eruvin", chapters: 105, useDaf: true },
      { name: "Pesachim", hebrewName: "\u05E4\u05E1\u05D7\u05D9\u05DD", slug: "Pesachim", chapters: 121, useDaf: true },
      { name: "Yoma", hebrewName: "\u05D9\u05D5\u05DE\u05D0", slug: "Yoma", chapters: 88, useDaf: true },
      { name: "Sukkah", hebrewName: "\u05E1\u05D5\u05DB\u05D4", slug: "Sukkah", chapters: 56, useDaf: true },
      { name: "Beitzah", hebrewName: "\u05D1\u05D9\u05E6\u05D4", slug: "Beitzah", chapters: 40, useDaf: true },
      { name: "Rosh Hashanah", hebrewName: "\u05E8\u05D0\u05E9 \u05D4\u05E9\u05E0\u05D4", slug: "Rosh_Hashanah", chapters: 35, useDaf: true },
      { name: "Taanis", hebrewName: "\u05EA\u05E2\u05E0\u05D9\u05EA", slug: "Taanit", chapters: 31, useDaf: true },
      { name: "Megillah", hebrewName: "\u05DE\u05D2\u05D9\u05DC\u05D4", slug: "Megillah", chapters: 32, useDaf: true },
      { name: "Moed Katan", hebrewName: "\u05DE\u05D5\u05E2\u05D3 \u05E7\u05D8\u05DF", slug: "Moed_Katan", chapters: 29, useDaf: true },
      { name: "Chagigah", hebrewName: "\u05D7\u05D2\u05D9\u05D2\u05D4", slug: "Chagigah", chapters: 27, useDaf: true },
    ],
  },
  {
    name: "Nashim",
    hebrewName: "\u05E0\u05E9\u05D9\u05DD",
    items: [
      { name: "Yevamos", hebrewName: "\u05D9\u05D1\u05DE\u05D5\u05EA", slug: "Yevamot", chapters: 122, useDaf: true },
      { name: "Kesubos", hebrewName: "\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA", slug: "Ketubot", chapters: 112, useDaf: true },
      { name: "Nedarim", hebrewName: "\u05E0\u05D3\u05E8\u05D9\u05DD", slug: "Nedarim", chapters: 91, useDaf: true },
      { name: "Nazir", hebrewName: "\u05E0\u05D6\u05D9\u05E8", slug: "Nazir", chapters: 66, useDaf: true },
      { name: "Sotah", hebrewName: "\u05E1\u05D5\u05D8\u05D4", slug: "Sotah", chapters: 49, useDaf: true },
      { name: "Gittin", hebrewName: "\u05D2\u05D9\u05D8\u05D9\u05DF", slug: "Gittin", chapters: 90, useDaf: true },
      { name: "Kiddushin", hebrewName: "\u05E7\u05D9\u05D3\u05D5\u05E9\u05D9\u05DF", slug: "Kiddushin", chapters: 82, useDaf: true },
    ],
  },
  {
    name: "Nezikin",
    hebrewName: "\u05E0\u05D6\u05D9\u05E7\u05D9\u05DF",
    items: [
      { name: "Bava Kamma", hebrewName: "\u05D1\u05D1\u05D0 \u05E7\u05DE\u05D0", slug: "Bava_Kamma", chapters: 119, useDaf: true },
      { name: "Bava Metzia", hebrewName: "\u05D1\u05D1\u05D0 \u05DE\u05E6\u05D9\u05E2\u05D0", slug: "Bava_Metzia", chapters: 119, useDaf: true },
      { name: "Bava Basra", hebrewName: "\u05D1\u05D1\u05D0 \u05D1\u05EA\u05E8\u05D0", slug: "Bava_Batra", chapters: 176, useDaf: true },
      { name: "Sanhedrin", hebrewName: "\u05E1\u05E0\u05D4\u05D3\u05E8\u05D9\u05DF", slug: "Sanhedrin", chapters: 113, useDaf: true },
      { name: "Makkos", hebrewName: "\u05DE\u05DB\u05D5\u05EA", slug: "Makkot", chapters: 24, useDaf: true },
      { name: "Shevuos", hebrewName: "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA", slug: "Shevuot", chapters: 49, useDaf: true },
      { name: "Avodah Zarah", hebrewName: "\u05E2\u05D1\u05D5\u05D3\u05D4 \u05D6\u05E8\u05D4", slug: "Avodah_Zarah", chapters: 76, useDaf: true },
      { name: "Horayos", hebrewName: "\u05D4\u05D5\u05E8\u05D9\u05D5\u05EA", slug: "Horayot", chapters: 14, useDaf: true },
    ],
  },
  {
    name: "Kodashim",
    hebrewName: "\u05E7\u05D3\u05E9\u05D9\u05DD",
    items: [
      { name: "Zevachim", hebrewName: "\u05D6\u05D1\u05D7\u05D9\u05DD", slug: "Zevachim", chapters: 120, useDaf: true },
      { name: "Menachos", hebrewName: "\u05DE\u05E0\u05D7\u05D5\u05EA", slug: "Menachot", chapters: 110, useDaf: true },
      { name: "Chullin", hebrewName: "\u05D7\u05D5\u05DC\u05D9\u05DF", slug: "Chullin", chapters: 142, useDaf: true },
      { name: "Bechoros", hebrewName: "\u05D1\u05DB\u05D5\u05E8\u05D5\u05EA", slug: "Bekhorot", chapters: 61, useDaf: true },
      { name: "Arachin", hebrewName: "\u05E2\u05E8\u05DB\u05D9\u05DF", slug: "Arakhin", chapters: 34, useDaf: true },
      { name: "Temurah", hebrewName: "\u05EA\u05DE\u05D5\u05E8\u05D4", slug: "Temurah", chapters: 34, useDaf: true },
      { name: "Kerisos", hebrewName: "\u05DB\u05E8\u05D9\u05EA\u05D5\u05EA", slug: "Keritot", chapters: 28, useDaf: true },
      { name: "Meilah", hebrewName: "\u05DE\u05E2\u05D9\u05DC\u05D4", slug: "Meilah", chapters: 22, useDaf: true },
      { name: "Tamid", hebrewName: "\u05EA\u05DE\u05D9\u05D3", slug: "Tamid", chapters: 33, useDaf: true },
      { name: "Niddah", hebrewName: "\u05E0\u05D3\u05D4", slug: "Niddah", chapters: 73, useDaf: true },
    ],
  },
];

const tanakhCategories: SourceCategory[] = [
  {
    name: "Chumash",
    hebrewName: "\u05D7\u05D5\u05DE\u05E9",
    items: [
      { name: "Bereishis", hebrewName: "\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA", slug: "Genesis", chapters: 50, segmentsPerChapter: [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,54,33,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26] },
      { name: "Shemos", hebrewName: "\u05E9\u05DE\u05D5\u05EA", slug: "Exodus", chapters: 40, segmentsPerChapter: [22,25,22,31,23,30,29,28,35,29,10,51,22,31,27,36,16,27,25,23,37,30,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38] },
      { name: "Vayikra", hebrewName: "\u05D5\u05D9\u05E7\u05E8\u05D0", slug: "Leviticus", chapters: 27, segmentsPerChapter: [17,16,17,35,26,23,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34] },
      { name: "Bamidbar", hebrewName: "\u05D1\u05DE\u05D3\u05D1\u05E8", slug: "Numbers", chapters: 36, segmentsPerChapter: [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,35,28,32,22,29,35,41,30,25,18,65,23,31,39,17,54,42,56,29,34,13] },
      { name: "Devarim", hebrewName: "\u05D3\u05D1\u05E8\u05D9\u05DD", slug: "Deuteronomy", chapters: 34, segmentsPerChapter: [46,37,29,49,30,25,26,20,29,22,32,31,19,29,23,22,20,22,21,20,23,29,26,22,19,19,26,69,28,20,30,52,29,12] },
    ],
  },
  {
    name: "Nevi'im",
    hebrewName: "\u05E0\u05D1\u05D9\u05D0\u05D9\u05DD",
    items: [
      { name: "Yehoshua", hebrewName: "\u05D9\u05D4\u05D5\u05E9\u05E2", slug: "Joshua", chapters: 24, segmentsPerChapter: [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33] },
      { name: "Shoftim", hebrewName: "\u05E9\u05D5\u05E4\u05D8\u05D9\u05DD", slug: "Judges", chapters: 21, segmentsPerChapter: [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25] },
      { name: "Shmuel I", hebrewName: "\u05E9\u05DE\u05D5\u05D0\u05DC \u05D0", slug: "I_Samuel", chapters: 31, segmentsPerChapter: [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,16,23,28,23,44,25,12,25,11,31,13] },
      { name: "Shmuel II", hebrewName: "\u05E9\u05DE\u05D5\u05D0\u05DC \u05D1", slug: "II_Samuel", chapters: 24, segmentsPerChapter: [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,32,44,26,22,51,39,25] },
      { name: "Melachim I", hebrewName: "\u05DE\u05DC\u05DB\u05D9\u05DD \u05D0", slug: "I_Kings", chapters: 22, segmentsPerChapter: [53,46,28,20,32,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,54] },
      { name: "Melachim II", hebrewName: "\u05DE\u05DC\u05DB\u05D9\u05DD \u05D1", slug: "II_Kings", chapters: 25, segmentsPerChapter: [18,25,27,44,27,33,20,29,37,36,20,22,25,29,38,20,41,37,37,21,26,20,37,20,30] },
      { name: "Yeshayahu", hebrewName: "\u05D9\u05E9\u05E2\u05D9\u05D4\u05D5", slug: "Isaiah", chapters: 66, segmentsPerChapter: [31,22,26,6,30,13,25,23,20,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,11,25,24] },
      { name: "Yirmiyahu", hebrewName: "\u05D9\u05E8\u05DE\u05D9\u05D4\u05D5", slug: "Jeremiah", chapters: 52, segmentsPerChapter: [19,37,25,31,31,30,34,23,25,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34] },
      { name: "Yechezkel", hebrewName: "\u05D9\u05D7\u05D6\u05E7\u05D0\u05DC", slug: "Ezekiel", chapters: 48, segmentsPerChapter: [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,44,37,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35] },
      { name: "Hoshea", hebrewName: "\u05D4\u05D5\u05E9\u05E2", slug: "Hosea", chapters: 14, segmentsPerChapter: [9,25,5,19,15,11,16,14,17,15,11,15,15,10] },
      { name: "Yoel", hebrewName: "\u05D9\u05D5\u05D0\u05DC", slug: "Joel", chapters: 4, segmentsPerChapter: [20,27,5,21] },
      { name: "Amos", hebrewName: "\u05E2\u05DE\u05D5\u05E1", slug: "Amos", chapters: 9, segmentsPerChapter: [15,16,15,13,27,14,17,14,15] },
      { name: "Ovadiah", hebrewName: "\u05E2\u05D5\u05D1\u05D3\u05D9\u05D4", slug: "Obadiah", chapters: 1, segmentsPerChapter: [21] },
      { name: "Yonah", hebrewName: "\u05D9\u05D5\u05E0\u05D4", slug: "Jonah", chapters: 4, segmentsPerChapter: [16,11,10,11] },
      { name: "Michah", hebrewName: "\u05DE\u05D9\u05DB\u05D4", slug: "Micah", chapters: 7, segmentsPerChapter: [16,13,12,14,14,16,20] },
      { name: "Nachum", hebrewName: "\u05E0\u05D7\u05D5\u05DD", slug: "Nahum", chapters: 3, segmentsPerChapter: [14,14,19] },
      { name: "Chavakuk", hebrewName: "\u05D7\u05D1\u05E7\u05D5\u05E7", slug: "Habakkuk", chapters: 3, segmentsPerChapter: [17,20,19] },
      { name: "Tzefaniah", hebrewName: "\u05E6\u05E4\u05E0\u05D9\u05D4", slug: "Zephaniah", chapters: 3, segmentsPerChapter: [18,15,20] },
      { name: "Chaggai", hebrewName: "\u05D7\u05D2\u05D9", slug: "Haggai", chapters: 2, segmentsPerChapter: [15,23] },
      { name: "Zechariah", hebrewName: "\u05D6\u05DB\u05E8\u05D9\u05D4", slug: "Zechariah", chapters: 14, segmentsPerChapter: [17,17,10,14,11,15,14,23,17,12,17,14,9,21] },
      { name: "Malachi", hebrewName: "\u05DE\u05DC\u05D0\u05DB\u05D9", slug: "Malachi", chapters: 3, segmentsPerChapter: [14,17,24] },
    ],
  },
  {
    name: "Kesuvim",
    hebrewName: "\u05DB\u05EA\u05D5\u05D1\u05D9\u05DD",
    items: [
      { name: "Tehillim", hebrewName: "\u05EA\u05D4\u05DC\u05D9\u05DD", slug: "Psalms", chapters: 150, segmentsPerChapter: [6,12,9,9,13,11,18,10,21,18,7,9,6,7,5,11,15,51,15,10,14,32,6,10,22,12,14,9,11,13,25,11,22,23,28,13,40,23,14,18,14,12,5,27,18,12,10,15,21,23,21,11,7,9,24,14,12,12,18,14,9,13,12,11,14,20,8,36,37,6,24,20,28,23,11,13,21,72,13,20,17,8,19,13,14,17,7,19,53,17,16,16,5,23,11,13,12,9,9,5,8,29,22,35,45,48,43,14,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,14,10,8,12,15,21,10,20,14,9,6] },
      { name: "Mishlei", hebrewName: "\u05DE\u05E9\u05DC\u05D9", slug: "Proverbs", chapters: 31, segmentsPerChapter: [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31] },
      { name: "Iyov", hebrewName: "\u05D0\u05D9\u05D5\u05D1", slug: "Job", chapters: 42, segmentsPerChapter: [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,32,26,17] },
      { name: "Shir HaShirim", hebrewName: "\u05E9\u05D9\u05E8 \u05D4\u05E9\u05D9\u05E8\u05D9\u05DD", slug: "Song_of_Songs", chapters: 8, segmentsPerChapter: [17,17,11,16,16,12,14,14] },
      { name: "Rus", hebrewName: "\u05E8\u05D5\u05EA", slug: "Ruth", chapters: 4, segmentsPerChapter: [22,23,18,22] },
      { name: "Eichah", hebrewName: "\u05D0\u05D9\u05DB\u05D4", slug: "Lamentations", chapters: 5, segmentsPerChapter: [22,22,66,22,22] },
      { name: "Koheles", hebrewName: "\u05E7\u05D4\u05DC\u05EA", slug: "Ecclesiastes", chapters: 12, segmentsPerChapter: [18,26,22,17,19,12,29,17,18,20,10,14] },
      { name: "Esther", hebrewName: "\u05D0\u05E1\u05EA\u05E8", slug: "Esther", chapters: 10, segmentsPerChapter: [22,23,15,17,14,14,10,17,32,3] },
      { name: "Daniel", hebrewName: "\u05D3\u05E0\u05D9\u05D0\u05DC", slug: "Daniel", chapters: 12, segmentsPerChapter: [21,49,33,34,30,29,28,27,27,21,45,13] },
      { name: "Ezra", hebrewName: "\u05E2\u05D6\u05E8\u05D0", slug: "Ezra", chapters: 10, segmentsPerChapter: [11,70,13,24,17,22,28,36,15,44] },
      { name: "Nechemiah", hebrewName: "\u05E0\u05D7\u05DE\u05D9\u05D4", slug: "Nehemiah", chapters: 13, segmentsPerChapter: [11,20,38,17,19,19,72,18,37,40,36,47,31] },
      { name: "Divrei HaYamim I", hebrewName: "\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D0", slug: "I_Chronicles", chapters: 29, segmentsPerChapter: [54,55,24,43,41,66,40,40,44,14,47,41,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30] },
      { name: "Divrei HaYamim II", hebrewName: "\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D1", slug: "II_Chronicles", chapters: 36, segmentsPerChapter: [18,17,17,22,14,42,22,18,31,19,23,16,23,14,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23] },
    ],
  },
];
