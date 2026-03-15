import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { getCategories, getDafOptions } from "@/lib/source-data";
import { getCalendarData } from "@/lib/jewish-calendar";
import { fetchTexts } from "@/lib/sefaria";
import { supabase } from "@/lib/supabase";
import type { StormTweet, SourceType } from "@/lib/types";

export const runtime = "edge";

const allSourceTypes: SourceType[] = ["mishnayos", "gemara", "chumash"];

function pickRandomItem(): {
  slug: string;
  ref: string;
  sourceType: SourceType;
  displayName: string;
  label?: string;
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

export async function POST(req: Request) {
  try {
    // Extract user ID if available
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || null;
    void userId; // Will be used for personalization later

    // Step 1: Try to serve from cache first for INSTANT loading
    const { data: cachedItems, error: cacheError } = await supabase
      .from("cached_feeds")
      .select("id, slug, ref, source_type, display_name, label, tweets, tweet_count, created_at")
      .gt("expires_at", new Date().toISOString())
      .order("like_count", { ascending: false })
      .limit(8);

    const encoder = new TextEncoder();

    if (!cacheError && cachedItems && cachedItems.length >= 3) {
      // Serve cached content instantly
      const readable = new ReadableStream({
        start(controller) {
          let globalIndex = 0;

          for (const item of cachedItems) {
            const tweets = (item.tweets as StormTweet[]) || [];
            for (const tweet of tweets) {
              const enrichedTweet: StormTweet = {
                ...tweet,
                id: `discover-${globalIndex}`,
                cachedFeedId: item.id,
                label: tweet.label || item.label || undefined,
              };
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(enrichedTweet)}\n\n`)
              );
              globalIndex++;
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, total: globalIndex, cached: true })}\n\n`
            )
          );
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Step 2: Not enough cached content - generate fresh (and cache it)
    const calendar = await getCalendarData();

    const picks: {
      slug: string;
      ref: string;
      sourceType: SourceType;
      displayName: string;
      label?: string;
      context?: string;
    }[] = [];

    if (calendar.parsha) {
      picks.push(calendar.parsha);
    }

    if (calendar.dafYomi && Math.random() > 0.5) {
      picks.push(calendar.dafYomi);
    } else if (calendar.dailyMishnah) {
      picks.push(calendar.dailyMishnah);
    } else if (calendar.dafYomi) {
      picks.push(calendar.dafYomi);
    }

    while (picks.length < 5) {
      const pick = pickRandomItem();
      if (!picks.some((p) => p.slug === pick.slug && p.ref === pick.ref)) {
        picks.push(pick);
      }
    }

    const textResults = await Promise.allSettled(
      picks.map((p) => fetchTexts(p.slug, p.ref))
    );

    const validTexts: {
      pick: (typeof picks)[0];
      texts: Awaited<ReturnType<typeof fetchTexts>>;
    }[] = [];

    for (let i = 0; i < textResults.length; i++) {
      const result = textResults[i];
      if (result.status === "fulfilled" && result.value.length > 0) {
        validTexts.push({ pick: picks[i], texts: result.value });
      }
    }

    if (validTexts.length === 0) {
      return Response.json(
        { error: "Could not fetch any texts" },
        { status: 500 }
      );
    }

    const textList = validTexts
      .map(({ pick, texts }) => {
        // Send up to 6 segments for richer context and accuracy
        const textContent = texts
          .slice(0, 6)
          .map((t) => `[${t.ref}]\nHebrew: ${t.hebrew}\nEnglish: ${t.english}`)
          .join("\n\n");
        const labelTag = pick.label ? ` [${pick.label}]` : "";
        const contextNote = pick.context
          ? `\nContext: ${pick.context.slice(0, 200)}`
          : "";
        const segmentNote = texts.length > 6 ? `\n(Showing 6 of ${texts.length} segments)` : "";
        return `--- ${pick.displayName} (${pick.sourceType})${labelTag} ---${contextNote}${segmentNote}\n${textContent}`;
      })
      .join("\n\n");

    const prompt = `You are @TorahTakes, curating a "For You" Torah discovery feed. Your followers are frum Jews, 18-35, who SCROLL. You need to STOP their thumb.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings", "halacha", "mitzva/mitzvos", "Chazal", etc. No hashtags. No emojis. No cringe.

ACCURACY IS PARAMOUNT — NON-NEGOTIABLE:
- ONLY teach and explain what is ACTUALLY in the source texts provided below. Do NOT fabricate or invent teachings, stories, or commentary.
- If you reference a commentator (Rashi, Ramban, Bartenura, Tosafos, etc.), it MUST be something they actually say on this specific text. If you aren't certain, do NOT name them.
- You may explain the plain meaning (pshat), draw out implications, and highlight surprising details — but always grounded in the actual source text.
- It's better to deeply explain what the text DOES say than to fabricate what it doesn't.
- Use both the Hebrew and English provided to ensure accuracy.

YOUR JOB: Don't just summarize. Find the jaw-dropping angle that's genuinely in the text. The connection nobody noticed. The detail that changes everything. For [This Week's Parsha], find a genuinely surprising angle from what the text actually says. Make it feel like insider knowledge they'll share at the Shabbos table.

VIRAL MECHANICS:
- Hook in 8 words or fewer. "Most people miss this in the parsha." "The Gemara's answer is unexpected." "Rashi drops a bombshell here."
- SPECIFICITY wins. Not "interesting interpretation" but the actual detail that surprises.
- TENSION before resolution. Set up the question, make them need the answer.
- Each source should feel like discovering something new.

CRITICAL OUTPUT FORMAT: One JSON object per line. No other text. No markdown:
{"ref":"Source Name","n":1,"text":"1/ tweet text","label":"This Week's Parsha"}
{"ref":"Source Name","n":2,"text":"2/ tweet text","img":"image prompt"}

LENGTH VARIATION — CRITICAL:
- At least 2 tweets should be SHORT: one sentence, under 60 characters. Like "Read that again." or "Wait for it." or "Most people miss this."
- Some tweets: 2-3 sentences, 100-200 chars. The substance.
- At most 1-2 tweets: up to 280 chars, the deep dive with a line break for emphasis.
- The feed should feel SNAPPY. If every tweet is the same length, you've failed.

Rules:
- For parsha: 3-4 tweets. For others: 2-3 tweets.
- Thread numbering resets per source (1/, 2/, etc.)
- "ref" must match the source name EXACTLY as given
- Include "label" field if the source has a label tag
- Include exactly 2 "img" fields total across all sources
- Omit "img" for non-image tweets

Source texts (base ALL your content on these):
${textList}`;

    const allTweets: { tweet: StormTweet; pick: (typeof validTexts)[0]["pick"] }[] = [];

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const response = await ai.models.generateContentStream({
            model: GEMINI_TEXT_MODEL,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              thinkingConfig: { thinkingBudget: 2048 },
              maxOutputTokens: 8000,
            },
          });

          let buffer = "";
          let tweetIndex = 0;

          for await (const chunk of response) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;

            for (const part of parts) {
              if ((part as Record<string, unknown>).thought) continue;
              if (!part.text) continue;
              buffer += part.text;
            }

            const lines = buffer.split("\n");
            buffer = lines.pop()!;

            for (const line of lines) {
              const trimmed = line.trim();
              if (
                !trimmed ||
                trimmed === "```" ||
                trimmed === "```json" ||
                trimmed === "```jsonl"
              )
                continue;

              try {
                const parsed = JSON.parse(trimmed);
                if (!parsed.text) continue;

                const matchingPick = validTexts.find(
                  (vt) => vt.pick.displayName === parsed.ref
                )?.pick;

                const tweet: StormTweet = {
                  id: `discover-${tweetIndex}`,
                  ref: parsed.ref || "Torah",
                  slug: matchingPick?.slug,
                  sourceRef: matchingPick?.ref,
                  tweetNumber: parsed.n || 1,
                  totalTweets: 0,
                  text: parsed.text,
                  needsImage: !!parsed.img,
                  imagePrompt: parsed.img || undefined,
                  label: parsed.label || matchingPick?.label,
                };

                allTweets.push({ tweet, pick: matchingPick || validTexts[0].pick });
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(tweet)}\n\n`)
                );
                tweetIndex++;
              } catch {
                // Skip malformed lines
              }
            }
          }

          // Process remaining buffer
          const remaining = buffer.trim();
          if (remaining && remaining !== "```") {
            try {
              const parsed = JSON.parse(remaining);
              if (parsed.text) {
                const matchingPick = validTexts.find(
                  (vt) => vt.pick.displayName === parsed.ref
                )?.pick;

                const tweet: StormTweet = {
                  id: `discover-${tweetIndex}`,
                  ref: parsed.ref || "Torah",
                  slug: matchingPick?.slug,
                  sourceRef: matchingPick?.ref,
                  tweetNumber: parsed.n || 1,
                  totalTweets: 0,
                  text: parsed.text,
                  needsImage: !!parsed.img,
                  imagePrompt: parsed.img || undefined,
                  label: parsed.label || matchingPick?.label,
                };

                allTweets.push({ tweet, pick: matchingPick || validTexts[0].pick });
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(tweet)}\n\n`)
                );
                tweetIndex++;
              }
            } catch {
              // Skip
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, total: tweetIndex })}\n\n`
            )
          );

          // Cache each source's tweets in background
          if (allTweets.length > 0) {
            const bySlugRef = new Map<string, { tweets: StormTweet[]; pick: (typeof validTexts)[0]["pick"] }>();
            for (const { tweet, pick } of allTweets) {
              const key = `${pick.slug}:${pick.ref}`;
              if (!bySlugRef.has(key)) {
                bySlugRef.set(key, { tweets: [], pick });
              }
              bySlugRef.get(key)!.tweets.push(tweet);
            }

            for (const [, { tweets, pick }] of bySlugRef) {
              const finalTweets = tweets.map((t, i) => ({
                ...t,
                tweetNumber: i + 1,
                totalTweets: tweets.length,
              }));

              supabase
                .from("cached_feeds")
                .upsert(
                  {
                    slug: pick.slug,
                    ref: pick.ref,
                    source_type: pick.sourceType,
                    display_name: pick.displayName,
                    label: pick.label || null,
                    tweets: finalTweets,
                    tweet_count: finalTweets.length,
                    quality_score: finalTweets.length >= 2 ? 1.0 : 0.5,
                    expires_at: new Date(
                      Date.now() + 7 * 24 * 60 * 60 * 1000
                    ).toISOString(),
                  },
                  { onConflict: "slug,ref" }
                )
                .then(({ error }) => {
                  if (error) console.error("Discover cache error:", error);
                });
            }
          }
        } catch (error) {
          console.error("Discover streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Failed to generate discovery feed" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Discover error:", error);
    return Response.json(
      { error: "Failed to generate discovery feed" },
      { status: 500 }
    );
  }
}
