import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { getCategories, getDafOptions } from "@/lib/source-data";
import { getCalendarData } from "@/lib/jewish-calendar";
import { fetchTexts } from "@/lib/sefaria";
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

export async function POST() {
  try {
    // Get contextual calendar data
    const calendar = await getCalendarData();

    // Build picks: contextual first, then random
    const picks: {
      slug: string;
      ref: string;
      sourceType: SourceType;
      displayName: string;
      label?: string;
      context?: string;
    }[] = [];

    // 1. Weekly Parsha (always include)
    if (calendar.parsha) {
      picks.push(calendar.parsha);
    }

    // 2. Daf Yomi or Daily Mishnah (alternate)
    if (calendar.dafYomi && Math.random() > 0.5) {
      picks.push(calendar.dafYomi);
    } else if (calendar.dailyMishnah) {
      picks.push(calendar.dailyMishnah);
    } else if (calendar.dafYomi) {
      picks.push(calendar.dafYomi);
    }

    // 3. Fill remaining with random picks (target 5 total)
    while (picks.length < 5) {
      const pick = pickRandomItem();
      // Avoid duplicating slugs
      if (!picks.some((p) => p.slug === pick.slug && p.ref === pick.ref)) {
        picks.push(pick);
      }
    }

    // Fetch texts concurrently
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
        const textContent = texts
          .slice(0, 3)
          .map((t) => `Hebrew: ${t.hebrew}\nEnglish: ${t.english}`)
          .join("\n");
        const labelTag = pick.label ? ` [${pick.label}]` : "";
        const contextNote = pick.context
          ? `\nContext: ${pick.context.slice(0, 200)}`
          : "";
        return `--- ${pick.displayName} (${pick.sourceType})${labelTag} ---${contextNote}\n${textContent}`;
      })
      .join("\n\n");

    const prompt = `You're curating a "For You" Torah discovery feed. Think of yourself as a brilliant Torah educator who also happens to write viral Twitter threads. Your audience is frum, smart, and busy — they're scrolling. You need to STOP them.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings", "halacha", "mitzva/mitzvos", "Chazal", etc. No hashtags. No emojis.

YOUR JOB: Don't just summarize the text. Pull in commentary — Rashi, Ramban, Sforno, Bartenura, Tosafos, Midrash — and share surprising insights, lesser-known facts, fascinating machlokes, or connections between different parts of Torah that will make people go "I never knew that."

For [This Week's Parsha]: Don't just say "This Shabbos we read about X." Instead, find a surprising angle — a Rashi that reveals something unexpected, a Ramban that disagrees, a Midrash that changes the whole story. Make it feel like insider knowledge.

CRITICAL OUTPUT FORMAT: One JSON object per line. No other text. No markdown:
{"ref":"Source Name","n":1,"text":"1/ tweet text","label":"This Week's Parsha"}
{"ref":"Source Name","n":2,"text":"2/ tweet text","img":"image prompt"}

LENGTH VARIATION — THIS IS CRITICAL:
- At least 2 tweets should be SHORT: one sentence, under 60 characters. Like "This Rashi will blow your mind." or "Wait for it." or "Most people miss this."
- Some tweets: 2-3 sentences, 100-200 chars. The meat.
- At most 1-2 tweets: up to 280 chars, the deep dive with a line break for emphasis.
- The feed should feel SNAPPY. If every tweet is the same length, you've failed.

Rules:
- For parsha: 3-4 tweets. For others: 2-3 tweets.
- Thread numbering resets per source (1/, 2/, etc.)
- "ref" must match the source name EXACTLY as given
- Include "label" field if the source has a label tag
- Include exactly 2 "img" fields total — detailed prompts for clean educational illustrations on white background with labels
- Omit "img" for non-image tweets

Sources:
${textList}`;

    const encoder = new TextEncoder();

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
              // Skip thinking parts
              if ((part as Record<string, unknown>).thought) continue;
              if (!part.text) continue;
              buffer += part.text;
            }

            // Extract complete lines
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

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(tweet)}\n\n`
                  )
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

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify(tweet)}\n\n`
                  )
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
