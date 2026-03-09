import Anthropic from "@anthropic-ai/sdk";
import { fetchTexts } from "@/lib/sefaria";
import type { StormTweet, SourceType } from "@/lib/types";

const client = new Anthropic();

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
    const textList = texts
      .map(
        (t) =>
          `--- ${t.ref} ---\nHebrew: ${t.hebrew}\nEnglish: ${t.english}`
      )
      .join("\n\n");

    const context = sourceTypeContext[sourceType];

    const prompt = `${context}

Write a tweet storm (Twitter thread) breaking down the following text. Make it engaging, clear, and punchy — like a viral thread that makes people want to learn more Torah.

CRITICAL OUTPUT FORMAT: Output one JSON object per line. No other text before, after, or between lines. No markdown code fences. Every line must be independently parseable as JSON:
{"n":1,"text":"1/ The hook tweet..."}
{"n":2,"text":"2/ Next insight...","img":"detailed educational image prompt: clean diagram with labels on white background"}
{"n":3,"text":"3/ The takeaway..."}

Rules:
- Each tweet ≤ 280 characters
- Use thread numbering (1/, 2/, etc.)
- Start with an attention-grabbing hook
- Break down key concepts clearly
- Add context where helpful (who are the Tanna'im/Amora'im, what's the background)
- End with a powerful takeaway or mussar insight
- No full Hebrew text — English breakdown quoting key Hebrew terms
- Include EXACTLY 2 tweets with "img" field containing detailed image prompts for clean educational illustrations with labels on white background
- Omit "img" field entirely for non-image tweets
- Aim for 6-10 tweets total

Here is the text:

${textList}`;

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = client.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 8000,
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

                  const tweet: StormTweet = {
                    id: `storm-${slug}-${tweetIndex}`,
                    ref: displayRef,
                    slug,
                    sourceRef: ref,
                    tweetNumber: parsed.n || tweetIndex + 1,
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
                const tweet: StormTweet = {
                  id: `storm-${slug}-${tweetIndex}`,
                  ref: displayRef,
                  slug,
                  sourceRef: ref,
                  tweetNumber: parsed.n || tweetIndex + 1,
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

          // Send done signal
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
