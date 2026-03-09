import type { SourceText } from "./types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export async function fetchTexts(
  slug: string,
  ref: string // chapter number like "1" or daf like "2a"
): Promise<SourceText[]> {
  const fullRef = `${slug}.${ref}`;
  const url = `https://www.sefaria.org/api/v3/texts/${fullRef}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sefaria API error: ${res.status} for ${fullRef}`);
  }

  const data = await res.json();

  const hebrewVersion = data.versions?.find(
    (v: { language: string }) => v.language === "he"
  );
  const englishVersion = data.versions?.find(
    (v: { language: string }) => v.language === "en"
  );

  const hebrewTexts: string | string[] = hebrewVersion?.text || [];
  const englishTexts: string | string[] = englishVersion?.text || [];

  const displayRef = fullRef.replace(/_/g, " ");

  // Handle both array (chapter) and string (single segment) responses
  if (typeof hebrewTexts === "string") {
    return [
      {
        ref: displayRef,
        hebrew: hebrewTexts,
        english: stripHtml(typeof englishTexts === "string" ? englishTexts : ""),
        segmentNumber: 1,
      },
    ];
  }

  const hebrewArr = Array.isArray(hebrewTexts) ? hebrewTexts : [];
  const englishArr = Array.isArray(englishTexts) ? englishTexts : [];
  const count = Math.max(hebrewArr.length, englishArr.length);

  const results: SourceText[] = [];
  for (let i = 0; i < count; i++) {
    results.push({
      ref: `${displayRef}:${i + 1}`,
      hebrew: hebrewArr[i] || "",
      english: stripHtml(englishArr[i] || ""),
      segmentNumber: i + 1,
    });
  }

  return results;
}
