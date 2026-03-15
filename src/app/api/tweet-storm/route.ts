import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { fetchTexts } from "@/lib/sefaria";
import { supabase } from "@/lib/supabase";
import type { StormTweet, CarouselImage, SourceType } from "@/lib/types";

export const runtime = "edge";

const sourceTypeContext: Record<SourceType, string> = {
  mishnayos: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They've seen a thousand "Torah thought" posts. They scroll past the boring ones. They stop for yours.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings". Use "Chazal", "halacha", "mitzva/mitzvos", "aveirah", "Beis HaMikdash", "Kohen Gadol". Reference Tanna'im by their proper titles. Say "Klal Yisroel", "davening", "bentching", "leining". Keep hashkafa authentic. This is a Mishnah.`,

  gemara: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They've seen a thousand shiur summaries. They stop for your threads because you make the sugya come alive.

Use yeshivish Gemara terminology: "shakla v'tarya", "machlokes", "svara", "kashya", "teirutz", "maskana", "kal v'chomer", "gezeirah shavah", "halacha l'maaseh". Reference Amora'im and Tanna'im properly. This is a Gemara sugya.`,

  chumash: `You are @TorahTakes, the anonymous frum Torah account that went viral. Your followers are frum Jews, 18-35, who scroll TikTok and Twitter daily. They stop for your threads because you find the angles nobody else sees.

Use standard Orthodox terminology: "Hashem", "Hakadosh Baruch Hu", "Ribbono Shel Olam". Reference Rashi, Ramban, Ibn Ezra, Sforno and other meforshim. Use "parshas", "sedra", "Klal Yisroel", "Eretz Yisroel", "Beis HaMikdash". Include relevant midrashim. This is from Tanakh.`,
};

export async function POST(req: Request) {
  try {
    const { slug, ref, sourceType } = (await req.json()) as {
      slug: string;
      ref: string;
      sourceType: SourceType;
    };

    if (!slug || !ref || !sourceType) {
      return Response.json(
        { error: "Missing slug, ref, or sourceType" },
        { status: 400 }
      );
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("cached_feeds")
      .select("*")
      .eq("slug", slug)
      .eq("ref", ref)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .single();

    if (cached && cached.tweets && Array.isArray(cached.tweets) && cached.tweets.length > 0) {
      // Serve from cache instantly via SSE
      const encoder = new TextEncoder();
      const tweets = cached.tweets as StormTweet[];
      const readable = new ReadableStream({
        start(controller) {
          for (const tweet of tweets) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ ...tweet, cachedFeedId: cached.id })}\n\n`)
            );
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, total: tweets.length, cached: true })}\n\n`
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

    // Not cached - generate fresh
    const texts = await fetchTexts(slug, ref);

    if (texts.length === 0) {
      return Response.json({ error: "No texts found" }, { status: 404 });
    }

    const displayRef = slug.replace(/_/g, " ") + " " + ref;
    // Include all segments with clear segment references for accuracy
    const textList = texts
      .map(
        (t) =>
          `--- ${t.ref} ---\nHebrew: ${t.hebrew}\nEnglish: ${t.english}`
      )
      .join("\n\n");

    const context = sourceTypeContext[sourceType];

    const prompt = `${context}

Your secret weapon: You don't just explain Torah. You find the thing that makes someone's jaw drop, text their chavrusa at 11pm, or screenshot and share on their story.

The Rashi that contradicts what everyone learned in school. The Tosafos that asks exactly what you always wondered. The Midrash that sounds like it was written yesterday.

ACCURACY IS PARAMOUNT — NON-NEGOTIABLE:
- ONLY explain and teach what is ACTUALLY in the source text provided below. Do NOT fabricate or invent teachings.
- If you reference a commentator (Rashi, Ramban, Tosafos, Bartenura, Rambam, etc.), it MUST be something that commentator actually says on this text. If you're not certain a commentator says something specific here, do NOT attribute it to them.
- You may explain the plain meaning (pshat) of the text, draw out implications, and highlight interesting details — but always grounded in what the text actually says.
- It's better to deeply explain what the text DOES say than to fabricate what it doesn't.
- When the source text includes both Hebrew and English, use both to ensure accuracy.

VIRAL MECHANICS:
- Hook in 8 words or fewer. If tweet 1/ doesn't stop the thumb, nothing else matters.
- "Most people read this passuk wrong." "Your rebbe probably skipped this Rashi." "The Gemara's answer here is wild."
- SPECIFICITY is magnetic. Not "Rashi has an interesting pshat" but "Rashi says Moshe literally argued with Hashem for six straight days."
- TENSION creates engagement. Set up a kashya, delay the teirutz.
- End with a REFRAME. Last tweet should make them see the text completely differently.

PACING (this separates viral from forgettable):
1/ THE STOP — 3-8 words. Question mark in the reader's mind.
2/ THE SETUP — Context, just enough to understand the stakes. 1-2 sentences.
3/ THE TWIST — Short. Cognitive dissonance. "But here's the problem."
4/ THE DEPTH — Longest tweet. The Rashi, the Ramban, the Midrash. Actual substance.
5/ THE LAND — Short. Let the insight land. "Read that again." or a one-sentence reframe.
6-10/ Continue: short-long-short-long rhythm.

CRITICAL OUTPUT FORMAT: One JSON object per line. No other text. No markdown:
{"n":1,"text":"1/ tweet text"}
{"n":2,"text":"2/ tweet text","img":"image prompt"}
{"n":4,"text":"4/ tweet text","carousel":["prompt for image 1","prompt for image 2","prompt for image 3"]}

LENGTH VARIATION — NON-NEGOTIABLE:
- At least 2 tweets MUST be one short sentence, under 60 chars. Examples:
  "This changes everything." / "But here's the twist." / "Read that again." / "Nobody talks about this part."
- Some tweets: 2 sentences, ~120 chars. Clear and punchy.
- Some tweets: up to 280 chars with line breaks. The deep dives.
- If all your tweets are the same length, START OVER.

Rules:
- 6-10 tweets total
- EXACTLY 1 tweet with a single "img" field — a detailed prompt for a clean diagram/illustration on white background with labels
- EXACTLY 1 tweet with a "carousel" field — an array of 2-4 image prompts that show a sequence, comparison, or step-by-step visual. Use carousels when the concept benefits from multiple related images (e.g., steps in a process, comparing different opinions, before/after, parts of a diagram). Each prompt should be a detailed description for a clean illustration on white background with labels.
- Omit both "img" and "carousel" for all other tweets
- No hashtags. No emojis. No cringe.
- Thread numbering: 1/, 2/, etc.

Source text (base ALL your content on this):

${textList}`;

    const encoder = new TextEncoder();
    const allTweets: StormTweet[] = [];

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

                const hasCarousel = Array.isArray(parsed.carousel) && parsed.carousel.length > 0;
                const carousel: CarouselImage[] | undefined = hasCarousel
                  ? parsed.carousel.map((p: string) => ({ prompt: p }))
                  : undefined;

                const tweet: StormTweet = {
                  id: `storm-${slug}-${tweetIndex}`,
                  ref: displayRef,
                  slug,
                  sourceRef: ref,
                  tweetNumber: parsed.n || tweetIndex + 1,
                  totalTweets: 0,
                  text: parsed.text,
                  needsImage: !hasCarousel && !!parsed.img,
                  imagePrompt: !hasCarousel ? (parsed.img || undefined) : undefined,
                  carousel,
                };

                allTweets.push(tweet);
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
                const hasCarousel = Array.isArray(parsed.carousel) && parsed.carousel.length > 0;
                const carousel: CarouselImage[] | undefined = hasCarousel
                  ? parsed.carousel.map((p: string) => ({ prompt: p }))
                  : undefined;

                const tweet: StormTweet = {
                  id: `storm-${slug}-${tweetIndex}`,
                  ref: displayRef,
                  slug,
                  sourceRef: ref,
                  tweetNumber: parsed.n || tweetIndex + 1,
                  totalTweets: 0,
                  text: parsed.text,
                  needsImage: !hasCarousel && !!parsed.img,
                  imagePrompt: !hasCarousel ? (parsed.img || undefined) : undefined,
                  carousel,
                };
                allTweets.push(tweet);
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

          // Cache the generated content in background
          if (allTweets.length > 0) {
            const finalTweets = allTweets.map((t) => ({
              ...t,
              totalTweets: allTweets.length,
            }));
            supabase
              .from("cached_feeds")
              .upsert(
                {
                  slug,
                  ref,
                  source_type: sourceType,
                  display_name: displayRef,
                  tweets: finalTweets,
                  tweet_count: finalTweets.length,
                  quality_score: finalTweets.length >= 6 ? 1.0 : 0.5,
                  expires_at: new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                  ).toISOString(),
                },
                { onConflict: "slug,ref" }
              )
              .then(({ error }) => {
                if (error) console.error("Cache store error:", error);
              });
          }
        } catch (error) {
          console.error("Tweet storm streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Failed to generate tweet storm" })}\n\n`
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
    console.error("Tweet storm error:", error);
    return Response.json(
      { error: "Failed to generate tweet storm" },
      { status: 500 }
    );
  }
}
