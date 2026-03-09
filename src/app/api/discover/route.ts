import Anthropic from "@anthropic-ai/sdk";
import { getCategories, getDafOptions } from "@/lib/source-data";
import { fetchTexts } from "@/lib/sefaria";
import type { StormTweet, SourceType } from "@/lib/types";

const client = new Anthropic();

const allSourceTypes: SourceType[] = ["mishnayos", "gemara", "chumash"];

function pickRandomItems(count: number) {
  const picks: {
    slug: string;
    ref: string;
    sourceType: SourceType;
    displayName: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
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

    picks.push({ slug: item.slug, ref, sourceType, displayName });
  }

  return picks;
}

export async function POST() {
  try {
    const picks = pickRandomItems(4);

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
        return `--- ${pick.displayName} (${pick.sourceType}) ---\n${textContent}`;
      })
      .join("\n\n");

    const prompt = `You are an engaging Torah educator for a frum audience. Create a discovery feed mixing insights from different Torah sources.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings", "halacha", "mitzva/mitzvos", "Chazal", etc.

CRITICAL OUTPUT FORMAT: Output one JSON object per line. No other text. No markdown code fences. Every line must be independently parseable as JSON:
{"ref":"Source Name","n":1,"text":"1/ Engaging tweet..."}
{"ref":"Source Name","n":2,"text":"2/ Another tweet...","img":"detailed educational image prompt"}
{"ref":"Different Source","n":1,"text":"1/ New topic hook..."}

Rules:
- For each source, write 2-3 punchy tweets (≤280 chars each)
- Use thread numbering that resets per source (1/, 2/, etc.)
- "ref" field must match the source name EXACTLY as given above
- Include exactly 2 tweets total with "img" field across the entire feed (creative visuals, diagrams, illustrations)
- Make each tweet engaging and teach something interesting

Sources:
${textList}`;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            messages: [{ role: "user", content: prompt }],
          });

          let buffer = "";
          let tweetIndex = 0;

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              buffer += event.delta.text;

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

                  // Match back to pick for slug/sourceRef
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
