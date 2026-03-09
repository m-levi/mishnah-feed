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
      { name: "Berachos", hebrewName: "\u05D1\u05E8\u05DB\u05D5\u05EA", slug: "Mishnah_Berakhot", chapters: 9 },
      { name: "Peah", hebrewName: "\u05E4\u05D0\u05D4", slug: "Mishnah_Peah", chapters: 8 },
      { name: "Demai", hebrewName: "\u05D3\u05DE\u05D0\u05D9", slug: "Mishnah_Demai", chapters: 7 },
      { name: "Kilayim", hebrewName: "\u05DB\u05DC\u05D0\u05D9\u05DD", slug: "Mishnah_Kilayim", chapters: 9 },
      { name: "Sheviis", hebrewName: "\u05E9\u05D1\u05D9\u05E2\u05D9\u05EA", slug: "Mishnah_Sheviit", chapters: 10 },
      { name: "Terumos", hebrewName: "\u05EA\u05E8\u05D5\u05DE\u05D5\u05EA", slug: "Mishnah_Terumot", chapters: 11 },
      { name: "Maasros", hebrewName: "\u05DE\u05E2\u05E9\u05E8\u05D5\u05EA", slug: "Mishnah_Maasrot", chapters: 5 },
      { name: "Maaser Sheni", hebrewName: "\u05DE\u05E2\u05E9\u05E8 \u05E9\u05E0\u05D9", slug: "Mishnah_Maaser_Sheni", chapters: 5 },
      { name: "Challah", hebrewName: "\u05D7\u05DC\u05D4", slug: "Mishnah_Challah", chapters: 4 },
      { name: "Orlah", hebrewName: "\u05E2\u05E8\u05DC\u05D4", slug: "Mishnah_Orlah", chapters: 3 },
      { name: "Bikkurim", hebrewName: "\u05D1\u05D9\u05DB\u05D5\u05E8\u05D9\u05DD", slug: "Mishnah_Bikkurim", chapters: 4 },
    ],
  },
  {
    name: "Moed",
    hebrewName: "\u05DE\u05D5\u05E2\u05D3",
    items: [
      { name: "Shabbos", hebrewName: "\u05E9\u05D1\u05EA", slug: "Mishnah_Shabbat", chapters: 24 },
      { name: "Eruvin", hebrewName: "\u05E2\u05D9\u05E8\u05D5\u05D1\u05D9\u05DF", slug: "Mishnah_Eruvin", chapters: 10 },
      { name: "Pesachim", hebrewName: "\u05E4\u05E1\u05D7\u05D9\u05DD", slug: "Mishnah_Pesachim", chapters: 10 },
      { name: "Shekalim", hebrewName: "\u05E9\u05E7\u05DC\u05D9\u05DD", slug: "Mishnah_Shekalim", chapters: 8 },
      { name: "Yoma", hebrewName: "\u05D9\u05D5\u05DE\u05D0", slug: "Mishnah_Yoma", chapters: 8 },
      { name: "Sukkah", hebrewName: "\u05E1\u05D5\u05DB\u05D4", slug: "Mishnah_Sukkah", chapters: 5 },
      { name: "Beitzah", hebrewName: "\u05D1\u05D9\u05E6\u05D4", slug: "Mishnah_Beitzah", chapters: 5 },
      { name: "Rosh Hashanah", hebrewName: "\u05E8\u05D0\u05E9 \u05D4\u05E9\u05E0\u05D4", slug: "Mishnah_Rosh_Hashanah", chapters: 4 },
      { name: "Taanis", hebrewName: "\u05EA\u05E2\u05E0\u05D9\u05EA", slug: "Mishnah_Taanit", chapters: 4 },
      { name: "Megillah", hebrewName: "\u05DE\u05D2\u05D9\u05DC\u05D4", slug: "Mishnah_Megillah", chapters: 4 },
      { name: "Moed Katan", hebrewName: "\u05DE\u05D5\u05E2\u05D3 \u05E7\u05D8\u05DF", slug: "Mishnah_Moed_Katan", chapters: 3 },
      { name: "Chagigah", hebrewName: "\u05D7\u05D2\u05D9\u05D2\u05D4", slug: "Mishnah_Chagigah", chapters: 3 },
    ],
  },
  {
    name: "Nashim",
    hebrewName: "\u05E0\u05E9\u05D9\u05DD",
    items: [
      { name: "Yevamos", hebrewName: "\u05D9\u05D1\u05DE\u05D5\u05EA", slug: "Mishnah_Yevamot", chapters: 16 },
      { name: "Kesubos", hebrewName: "\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA", slug: "Mishnah_Ketubot", chapters: 13 },
      { name: "Nedarim", hebrewName: "\u05E0\u05D3\u05E8\u05D9\u05DD", slug: "Mishnah_Nedarim", chapters: 11 },
      { name: "Nazir", hebrewName: "\u05E0\u05D6\u05D9\u05E8", slug: "Mishnah_Nazir", chapters: 9 },
      { name: "Sotah", hebrewName: "\u05E1\u05D5\u05D8\u05D4", slug: "Mishnah_Sotah", chapters: 9 },
      { name: "Gittin", hebrewName: "\u05D2\u05D9\u05D8\u05D9\u05DF", slug: "Mishnah_Gittin", chapters: 9 },
      { name: "Kiddushin", hebrewName: "\u05E7\u05D9\u05D3\u05D5\u05E9\u05D9\u05DF", slug: "Mishnah_Kiddushin", chapters: 4 },
    ],
  },
  {
    name: "Nezikin",
    hebrewName: "\u05E0\u05D6\u05D9\u05E7\u05D9\u05DF",
    items: [
      { name: "Bava Kamma", hebrewName: "\u05D1\u05D1\u05D0 \u05E7\u05DE\u05D0", slug: "Mishnah_Bava_Kamma", chapters: 10 },
      { name: "Bava Metzia", hebrewName: "\u05D1\u05D1\u05D0 \u05DE\u05E6\u05D9\u05E2\u05D0", slug: "Mishnah_Bava_Metzia", chapters: 10 },
      { name: "Bava Basra", hebrewName: "\u05D1\u05D1\u05D0 \u05D1\u05EA\u05E8\u05D0", slug: "Mishnah_Bava_Batra", chapters: 10 },
      { name: "Sanhedrin", hebrewName: "\u05E1\u05E0\u05D4\u05D3\u05E8\u05D9\u05DF", slug: "Mishnah_Sanhedrin", chapters: 11 },
      { name: "Makkos", hebrewName: "\u05DE\u05DB\u05D5\u05EA", slug: "Mishnah_Makkot", chapters: 3 },
      { name: "Shevuos", hebrewName: "\u05E9\u05D1\u05D5\u05E2\u05D5\u05EA", slug: "Mishnah_Shevuot", chapters: 8 },
      { name: "Eduyos", hebrewName: "\u05E2\u05D3\u05D9\u05D5\u05EA", slug: "Mishnah_Eduyot", chapters: 8 },
      { name: "Avodah Zarah", hebrewName: "\u05E2\u05D1\u05D5\u05D3\u05D4 \u05D6\u05E8\u05D4", slug: "Mishnah_Avodah_Zarah", chapters: 5 },
      { name: "Pirkei Avos", hebrewName: "\u05D0\u05D1\u05D5\u05EA", slug: "Pirkei_Avot", chapters: 6 },
      { name: "Horayos", hebrewName: "\u05D4\u05D5\u05E8\u05D9\u05D5\u05EA", slug: "Mishnah_Horayot", chapters: 3 },
    ],
  },
  {
    name: "Kodashim",
    hebrewName: "\u05E7\u05D3\u05E9\u05D9\u05DD",
    items: [
      { name: "Zevachim", hebrewName: "\u05D6\u05D1\u05D7\u05D9\u05DD", slug: "Mishnah_Zevachim", chapters: 14 },
      { name: "Menachos", hebrewName: "\u05DE\u05E0\u05D7\u05D5\u05EA", slug: "Mishnah_Menachot", chapters: 13 },
      { name: "Chullin", hebrewName: "\u05D7\u05D5\u05DC\u05D9\u05DF", slug: "Mishnah_Chullin", chapters: 12 },
      { name: "Bechoros", hebrewName: "\u05D1\u05DB\u05D5\u05E8\u05D5\u05EA", slug: "Mishnah_Bekhorot", chapters: 9 },
      { name: "Arachin", hebrewName: "\u05E2\u05E8\u05DB\u05D9\u05DF", slug: "Mishnah_Arakhin", chapters: 9 },
      { name: "Temurah", hebrewName: "\u05EA\u05DE\u05D5\u05E8\u05D4", slug: "Mishnah_Temurah", chapters: 7 },
      { name: "Kerisos", hebrewName: "\u05DB\u05E8\u05D9\u05EA\u05D5\u05EA", slug: "Mishnah_Keritot", chapters: 6 },
      { name: "Meilah", hebrewName: "\u05DE\u05E2\u05D9\u05DC\u05D4", slug: "Mishnah_Meilah", chapters: 6 },
      { name: "Tamid", hebrewName: "\u05EA\u05DE\u05D9\u05D3", slug: "Mishnah_Tamid", chapters: 7 },
      { name: "Middos", hebrewName: "\u05DE\u05D9\u05D3\u05D5\u05EA", slug: "Mishnah_Middot", chapters: 5 },
      { name: "Kinnim", hebrewName: "\u05E7\u05D9\u05E0\u05D9\u05DD", slug: "Mishnah_Kinnim", chapters: 3 },
    ],
  },
  {
    name: "Tohoros",
    hebrewName: "\u05D8\u05D4\u05E8\u05D5\u05EA",
    items: [
      { name: "Keilim", hebrewName: "\u05DB\u05DC\u05D9\u05DD", slug: "Mishnah_Kelim", chapters: 30 },
      { name: "Ohalos", hebrewName: "\u05D0\u05D4\u05DC\u05D5\u05EA", slug: "Mishnah_Oholot", chapters: 18 },
      { name: "Negaim", hebrewName: "\u05E0\u05D2\u05E2\u05D9\u05DD", slug: "Mishnah_Negaim", chapters: 14 },
      { name: "Parah", hebrewName: "\u05E4\u05E8\u05D4", slug: "Mishnah_Parah", chapters: 12 },
      { name: "Tohoros", hebrewName: "\u05D8\u05D4\u05E8\u05D5\u05EA", slug: "Mishnah_Tohorot", chapters: 10 },
      { name: "Mikvaos", hebrewName: "\u05DE\u05E7\u05D5\u05D5\u05D0\u05D5\u05EA", slug: "Mishnah_Mikvaot", chapters: 10 },
      { name: "Niddah", hebrewName: "\u05E0\u05D3\u05D4", slug: "Mishnah_Niddah", chapters: 10 },
      { name: "Machshirin", hebrewName: "\u05DE\u05DB\u05E9\u05D9\u05E8\u05D9\u05DF", slug: "Mishnah_Makhshirin", chapters: 6 },
      { name: "Zavim", hebrewName: "\u05D6\u05D1\u05D9\u05DD", slug: "Mishnah_Zavim", chapters: 5 },
      { name: "Tevul Yom", hebrewName: "\u05D8\u05D1\u05D5\u05DC \u05D9\u05D5\u05DD", slug: "Mishnah_Tevul_Yom", chapters: 4 },
      { name: "Yadayim", hebrewName: "\u05D9\u05D3\u05D9\u05DD", slug: "Mishnah_Yadayim", chapters: 4 },
      { name: "Uktzin", hebrewName: "\u05E2\u05D5\u05E7\u05E6\u05D9\u05DF", slug: "Mishnah_Oktzin", chapters: 3 },
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
      { name: "Bereishis", hebrewName: "\u05D1\u05E8\u05D0\u05E9\u05D9\u05EA", slug: "Genesis", chapters: 50 },
      { name: "Shemos", hebrewName: "\u05E9\u05DE\u05D5\u05EA", slug: "Exodus", chapters: 40 },
      { name: "Vayikra", hebrewName: "\u05D5\u05D9\u05E7\u05E8\u05D0", slug: "Leviticus", chapters: 27 },
      { name: "Bamidbar", hebrewName: "\u05D1\u05DE\u05D3\u05D1\u05E8", slug: "Numbers", chapters: 36 },
      { name: "Devarim", hebrewName: "\u05D3\u05D1\u05E8\u05D9\u05DD", slug: "Deuteronomy", chapters: 34 },
    ],
  },
  {
    name: "Nevi'im",
    hebrewName: "\u05E0\u05D1\u05D9\u05D0\u05D9\u05DD",
    items: [
      { name: "Yehoshua", hebrewName: "\u05D9\u05D4\u05D5\u05E9\u05E2", slug: "Joshua", chapters: 24 },
      { name: "Shoftim", hebrewName: "\u05E9\u05D5\u05E4\u05D8\u05D9\u05DD", slug: "Judges", chapters: 21 },
      { name: "Shmuel I", hebrewName: "\u05E9\u05DE\u05D5\u05D0\u05DC \u05D0", slug: "I_Samuel", chapters: 31 },
      { name: "Shmuel II", hebrewName: "\u05E9\u05DE\u05D5\u05D0\u05DC \u05D1", slug: "II_Samuel", chapters: 24 },
      { name: "Melachim I", hebrewName: "\u05DE\u05DC\u05DB\u05D9\u05DD \u05D0", slug: "I_Kings", chapters: 22 },
      { name: "Melachim II", hebrewName: "\u05DE\u05DC\u05DB\u05D9\u05DD \u05D1", slug: "II_Kings", chapters: 25 },
      { name: "Yeshayahu", hebrewName: "\u05D9\u05E9\u05E2\u05D9\u05D4\u05D5", slug: "Isaiah", chapters: 66 },
      { name: "Yirmiyahu", hebrewName: "\u05D9\u05E8\u05DE\u05D9\u05D4\u05D5", slug: "Jeremiah", chapters: 52 },
      { name: "Yechezkel", hebrewName: "\u05D9\u05D7\u05D6\u05E7\u05D0\u05DC", slug: "Ezekiel", chapters: 48 },
      { name: "Hoshea", hebrewName: "\u05D4\u05D5\u05E9\u05E2", slug: "Hosea", chapters: 14 },
      { name: "Yoel", hebrewName: "\u05D9\u05D5\u05D0\u05DC", slug: "Joel", chapters: 4 },
      { name: "Amos", hebrewName: "\u05E2\u05DE\u05D5\u05E1", slug: "Amos", chapters: 9 },
      { name: "Ovadiah", hebrewName: "\u05E2\u05D5\u05D1\u05D3\u05D9\u05D4", slug: "Obadiah", chapters: 1 },
      { name: "Yonah", hebrewName: "\u05D9\u05D5\u05E0\u05D4", slug: "Jonah", chapters: 4 },
      { name: "Michah", hebrewName: "\u05DE\u05D9\u05DB\u05D4", slug: "Micah", chapters: 7 },
      { name: "Nachum", hebrewName: "\u05E0\u05D7\u05D5\u05DD", slug: "Nahum", chapters: 3 },
      { name: "Chavakuk", hebrewName: "\u05D7\u05D1\u05E7\u05D5\u05E7", slug: "Habakkuk", chapters: 3 },
      { name: "Tzefaniah", hebrewName: "\u05E6\u05E4\u05E0\u05D9\u05D4", slug: "Zephaniah", chapters: 3 },
      { name: "Chaggai", hebrewName: "\u05D7\u05D2\u05D9", slug: "Haggai", chapters: 2 },
      { name: "Zechariah", hebrewName: "\u05D6\u05DB\u05E8\u05D9\u05D4", slug: "Zechariah", chapters: 14 },
      { name: "Malachi", hebrewName: "\u05DE\u05DC\u05D0\u05DB\u05D9", slug: "Malachi", chapters: 3 },
    ],
  },
  {
    name: "Kesuvim",
    hebrewName: "\u05DB\u05EA\u05D5\u05D1\u05D9\u05DD",
    items: [
      { name: "Tehillim", hebrewName: "\u05EA\u05D4\u05DC\u05D9\u05DD", slug: "Psalms", chapters: 150 },
      { name: "Mishlei", hebrewName: "\u05DE\u05E9\u05DC\u05D9", slug: "Proverbs", chapters: 31 },
      { name: "Iyov", hebrewName: "\u05D0\u05D9\u05D5\u05D1", slug: "Job", chapters: 42 },
      { name: "Shir HaShirim", hebrewName: "\u05E9\u05D9\u05E8 \u05D4\u05E9\u05D9\u05E8\u05D9\u05DD", slug: "Song_of_Songs", chapters: 8 },
      { name: "Rus", hebrewName: "\u05E8\u05D5\u05EA", slug: "Ruth", chapters: 4 },
      { name: "Eichah", hebrewName: "\u05D0\u05D9\u05DB\u05D4", slug: "Lamentations", chapters: 5 },
      { name: "Koheles", hebrewName: "\u05E7\u05D4\u05DC\u05EA", slug: "Ecclesiastes", chapters: 12 },
      { name: "Esther", hebrewName: "\u05D0\u05E1\u05EA\u05E8", slug: "Esther", chapters: 10 },
      { name: "Daniel", hebrewName: "\u05D3\u05E0\u05D9\u05D0\u05DC", slug: "Daniel", chapters: 12 },
      { name: "Ezra", hebrewName: "\u05E2\u05D6\u05E8\u05D0", slug: "Ezra", chapters: 10 },
      { name: "Nechemiah", hebrewName: "\u05E0\u05D7\u05DE\u05D9\u05D4", slug: "Nehemiah", chapters: 13 },
      { name: "Divrei HaYamim I", hebrewName: "\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D0", slug: "I_Chronicles", chapters: 29 },
      { name: "Divrei HaYamim II", hebrewName: "\u05D3\u05D1\u05E8\u05D9 \u05D4\u05D9\u05DE\u05D9\u05DD \u05D1", slug: "II_Chronicles", chapters: 36 },
    ],
  },
];
