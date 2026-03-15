import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { getCategories, getDafOptions } from "@/lib/source-data";
import { getCalendarData } from "@/lib/jewish-calendar";
import { fetchTexts } from "@/lib/sefaria";
import { supabase } from "@/lib/supabase";
import type { SourceType, StormTweet } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 300; // 5 min for background generation

const allSourceTypes: SourceType[] = ["mishnayos", "gemara", "chumash"];

function pickRandomItem(): {
  slug: string;
  ref: string;
  sourceType: SourceType;
  displayName: string;
} {
  const sourceType =
    allSourceTypes[Math.floor(Math.random() * allSourceTypes.length)];
  const categories = getCategories(sourceType);
  const category =
    categories[Math.floor(Math.random() * categories.length)];
  const item =
    category.items[Math.floor(Math.random() * category.items.length)];

  let ref: string;
  let displayName: string;

  if (item.useDaf) {
    const dafOptions = getDafOptions(Math.min(item.chapters, 30));
    const daf = dafOptions[Math.floor(Math.random() * dafOptions.length)];
    ref = daf.value;
    displayName = `${item.name} ${daf.label}`;
  } else {
    const chapter = Math.floor(Math.random() * item.chapters) + 1;
    ref = String(chapter);
    displayName = `${item.name} ${chapter}`;
  }

  return { slug: item.slug, ref, sourceType, displayName };
}

const TWEET_STORM_PROMPT = (sourceType: SourceType) => {
  const contexts: Record<SourceType, string> = {
    mishnayos: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They've seen a thousand "Torah thought" posts. They stop for YOURS.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings", "halacha", "Chazal", etc. This is a Mishnah.`,

    gemara: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They've seen a thousand "Torah thought" posts. They stop for YOURS.

Use standard yeshivish Gemara terminology: "shakla v'tarya", "machlokes", "svara", "kashya", "teirutz", "maskana", "kal v'chomer". Reference Amora'im and Tanna'im by proper titles. This is a Gemara sugya.`,

    chumash: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They've seen a thousand "Torah thought" posts. They stop for YOURS.

Use standard Orthodox terminology: "Hashem", "Hakadosh Baruch Hu", "parshas", "Klal Yisroel", "Eretz Yisroel". Reference Rashi, Ramban, Ibn Ezra, Sforno, and Midrashim. This is from Tanakh.`,
  };

  return contexts[sourceType];
};

const GENERATION_INSTRUCTIONS = `Your secret weapon: You don't just EXPLAIN Torah. You find the thing that makes someone's jaw drop, screenshot and share, or text to their chavrusa at 11pm.

The Rashi that contradicts what everyone learned in school. The Tosafos that asks exactly what you always wondered. The Midrash that sounds like it was written yesterday. The halacha l'maaseh that changes how you think about your morning.

VIRAL MECHANICS — what makes people stop scrolling:
- Hook in 8 words or fewer. If tweet 1/ doesn't stop the thumb, nothing else matters.
- "Most people read this wrong." "Your rebbe probably skipped this part." "The Gemara's answer is wild."
- SPECIFICITY is magnetic. Not "Rashi gives an interesting interpretation" but "Rashi says the malachim literally couldn't tell Sarah apart from Avraham's shadow."
- TENSION creates engagement. Set up a question, delay the answer.
- End with a REFRAME. Last tweet should make them see the text completely differently.

PACING (this separates viral from forgettable):
1/ THE STOP — 3-8 words. Creates a question mark in the reader's mind.
2/ THE SETUP — Context, just enough to understand the stakes. 1-2 sentences.
3/ THE TWIST — Short. Cognitive dissonance. "But here's the problem."
4/ THE DEPTH — Longest tweet. The Rashi. The Ramban. The Midrash. Actual substance.
5/ THE LAND — Short. Let the insight resonate. One-sentence reframe.
6-10/ Continue: short-long-short-long rhythm.

CRITICAL OUTPUT FORMAT: One JSON object per line. No markdown. No code fences:
{"n":1,"text":"1/ tweet text"}
{"n":2,"text":"2/ longer tweet with the setup and context","img":"detailed image prompt"}

LENGTH RULES (NON-NEGOTIABLE):
- At least 2 tweets MUST be one short sentence, under 50 chars.
  "This changes everything." / "Read that again." / "Nobody talks about this."
- Some tweets: 2-3 sentences, 100-200 chars.
- 1-2 tweets: up to 280 chars with line breaks for the deep dives.
- If every tweet is the same length, DELETE IT AND START OVER.

Rules:
- 6-10 tweets total
- EXACTLY 2 tweets with "img" field — detailed prompts for clean, modern educational illustrations on white background
- Omit "img" for all other tweets
- No hashtags. No emojis. No cringe.
- Thread numbering: 1/, 2/, etc.`;

async function generateAndCache(
  slug: string,
  ref: string,
  sourceType: SourceType,
  displayName: string,
  label?: string
): Promise<StormTweet[] | null> {
  try {
    const texts = await fetchTexts(slug, ref);
    if (texts.length === 0) return null;

    const textList = texts
      .slice(0, 8) // Limit text length
      .map(
        (t) =>
          `--- ${t.ref} ---\nHebrew: ${t.hebrew}\nEnglish: ${t.english}`
      )
      .join("\n\n");

    const prompt = `${TWEET_STORM_PROMPT(sourceType)}

${GENERATION_INSTRUCTIONS}

Text to break down:

${textList}`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
        maxOutputTokens: 8000,
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    let output = "";
    for (const part of parts) {
      if ((part as Record<string, unknown>).thought) continue;
      if (part.text) output += part.text;
    }

    const displayRef = slug.replace(/_/g, " ") + " " + ref;
    const tweets: StormTweet[] = [];
    let idx = 0;

    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "```" || trimmed.startsWith("```")) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (!parsed.text) continue;
        tweets.push({
          id: `cached-${slug}-${ref}-${idx}`,
          ref: displayRef,
          slug,
          sourceRef: ref,
          tweetNumber: parsed.n || idx + 1,
          totalTweets: 0,
          text: parsed.text,
          needsImage: !!parsed.img,
          imagePrompt: parsed.img || undefined,
          label,
        });
        idx++;
      } catch {
        // Skip malformed
      }
    }

    if (tweets.length === 0) return null;

    // Set total tweets
    const finalTweets = tweets.map((t) => ({
      ...t,
      totalTweets: tweets.length,
    }));

    // Cache in Supabase
    const { error } = await supabase.from("cached_feeds").upsert(
      {
        slug,
        ref,
        source_type: sourceType,
        display_name: displayName,
        label: label || null,
        tweets: finalTweets,
        tweet_count: finalTweets.length,
        quality_score: finalTweets.length >= 6 ? 1.0 : 0.5,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      { onConflict: "slug,ref" }
    );

    if (error) {
      console.error("Cache insert error:", error);
    }

    return finalTweets;
  } catch (err) {
    console.error(`Failed to generate ${slug} ${ref}:`, err);
    return null;
  }
}

export async function POST(req: Request) {
  // Verify cron secret or allow manual trigger
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow without secret in dev, but log warning
    console.warn("Pre-generate called without valid cron secret");
  }

  const results: { success: string[]; failed: string[] } = {
    success: [],
    failed: [],
  };

  try {
    // 1. Generate calendar items (highest priority)
    const calendar = await getCalendarData();
    const calendarPicks: {
      slug: string;
      ref: string;
      sourceType: SourceType;
      displayName: string;
      label: string;
    }[] = [];

    if (calendar.parsha) {
      calendarPicks.push({
        ...calendar.parsha,
        label: calendar.parsha.label || "This Week's Parsha",
      });
    }
    if (calendar.dafYomi) {
      calendarPicks.push({
        ...calendar.dafYomi,
        label: calendar.dafYomi.label || "Daf Yomi",
      });
    }
    if (calendar.dailyMishnah) {
      calendarPicks.push({
        ...calendar.dailyMishnah,
        label: calendar.dailyMishnah.label || "Daily Mishnah",
      });
    }

    // 2. Check which calendar items are already cached
    for (const pick of calendarPicks) {
      const { data: existing } = await supabase
        .from("cached_feeds")
        .select("id")
        .eq("slug", pick.slug)
        .eq("ref", pick.ref)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        results.success.push(`${pick.displayName} (already cached)`);
        continue;
      }

      const tweets = await generateAndCache(
        pick.slug,
        pick.ref,
        pick.sourceType,
        pick.displayName,
        pick.label
      );

      if (tweets) {
        results.success.push(pick.displayName);
      } else {
        results.failed.push(pick.displayName);
      }
    }

    // 3. Generate random picks to fill the cache (target 15-20 total cached items)
    const { count } = await supabase
      .from("cached_feeds")
      .select("*", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString());

    const currentCached = count || 0;
    const toGenerate = Math.max(0, 15 - currentCached);

    for (let i = 0; i < toGenerate; i++) {
      const pick = pickRandomItem();

      // Check if already cached
      const { data: existing } = await supabase
        .from("cached_feeds")
        .select("id")
        .eq("slug", pick.slug)
        .eq("ref", pick.ref)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const tweets = await generateAndCache(
        pick.slug,
        pick.ref,
        pick.sourceType,
        pick.displayName
      );

      if (tweets) {
        results.success.push(pick.displayName);
      } else {
        results.failed.push(pick.displayName);
      }
    }

    // 4. Clean up expired entries
    await supabase
      .from("cached_feeds")
      .delete()
      .lt("expires_at", new Date().toISOString());

    return Response.json({
      ok: true,
      generated: results.success.length,
      failed: results.failed.length,
      totalCached: currentCached + results.success.length,
      details: results,
    });
  } catch (error) {
    console.error("Pre-generate error:", error);
    return Response.json(
      { error: "Pre-generation failed", details: results },
      { status: 500 }
    );
  }
}
