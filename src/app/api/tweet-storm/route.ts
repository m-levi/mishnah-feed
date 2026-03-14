import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { fetchTexts } from "@/lib/sefaria";
import type { StormTweet, CarouselImage, SourceType } from "@/lib/types";

export const runtime = "edge";

const sourceTypeContext: Record<SourceType, string> = {
  mishnayos: `You are an engaging Torah educator explaining a Mishnah to a frum audience. Use standard Orthodox terminology:
- Say "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings"
- Use "Chazal", "halacha", "mitzva/mitzvos", "aveirah", "Beis HaMikdash", "Kohen Gadol"
- Reference Tanna'im by their proper titles (Rabbi, Rabban, etc.)
- Say "Klal Yisroel", "Am Yisroel" where appropriate
- Use "davening", "bentching", "leining" etc. for common practices
- Keep the Torah hashkafa authentic — this is Torah learning, not academic study`,

  gemara: `You are an engaging Torah educator explaining a Gemara sugya to a frum audience. Use standard Orthodox terminology:
- Say "Hashem" not "God", reference the Gemara properly
- Use "Chazal", "shakla v'tarya", "machlokes", "svara", "kashya", "teirutz"
- Reference Amora'im and Tanna'im by proper titles
- Explain the back-and-forth of the sugya clearly
- Use "halacha l'maaseh", "maskana", "kal v'chomer", "gezeirah shavah" etc.
- Keep the Torah hashkafa authentic`,

  chumash: `You are an engaging Torah educator explaining pesukim from Tanakh to a frum audience. Use standard Orthodox terminology:
- Say "Hashem" not "God", "Hakadosh Baruch Hu", "Ribbono Shel Olam"
- Reference Rashi, Ramban, Ibn Ezra, Sforno and other meforshim where relevant
- Use "parshas", "sedra", "parashah" for Torah portions
- Reference "Klal Yisroel", "Eretz Yisroel", "Beis HaMikdash"
- Include relevant midrashim or meforshim insights
- Keep the Torah hashkafa authentic`,
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
    const segmentCount = texts.length;

    const context = sourceTypeContext[sourceType];

    const prompt = `${context}

Break down this Torah text as a tweet storm. You're a brilliant Torah educator on Twitter — your threads go viral because you make ancient wisdom feel alive and urgent.

ACCURACY IS PARAMOUNT — NON-NEGOTIABLE:
- ONLY explain and teach what is ACTUALLY in the source text provided below. Do NOT fabricate or invent teachings.
- If you reference a commentator (Rashi, Ramban, Tosafos, Bartenura, Rambam, etc.), it MUST be something that commentator actually says on this text. If you're not certain a commentator says something specific here, do NOT attribute it to them.
- You may explain the plain meaning (pshat) of the text, draw out implications, and highlight interesting details — but always grounded in what the text actually says.
- It's better to deeply explain what the text DOES say than to fabricate what it doesn't.
- When the source text includes both Hebrew and English, use both to ensure accuracy.

Your job: Make the actual content of this text feel alive, surprising, and worth reading. Find the "wait, THAT'S what it means?" moments that are genuinely there.

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

PACING:
1/ Hook — short, provocative, makes you want to keep reading
2/ Setup — a bit longer, gives context
3/ Tension — short again. "But wait."
4/ Payoff — the longest tweet. The real insight from the text.
5/ Reaction — short. Let it land.
...continue this rhythm.

Rules:
- 6-10 tweets total
- EXACTLY 1 tweet with a single "img" field — a detailed prompt for a clean diagram/illustration on white background with labels
- EXACTLY 1 tweet with a "carousel" field — an array of 2-4 image prompts that show a sequence, comparison, or step-by-step visual. Use carousels when the concept benefits from multiple related images (e.g., steps in a process, comparing different opinions, before/after, parts of a diagram). Each prompt should be a detailed description for a clean illustration on white background with labels.
- Omit both "img" and "carousel" for all other tweets
- No hashtags. No emojis.
- Thread numbering: 1/, 2/, etc.

Source text (base ALL your content on this):

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
