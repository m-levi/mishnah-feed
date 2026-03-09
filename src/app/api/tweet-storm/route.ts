import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
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
      return NextResponse.json(
        { error: "Missing slug, ref, or sourceType" },
        { status: 400 }
      );
    }

    const texts = await fetchTexts(slug, ref);

    if (texts.length === 0) {
      return NextResponse.json(
        { error: "No texts found" },
        { status: 404 }
      );
    }

    const textList = texts
      .map((t) => `--- ${t.ref} ---\nHebrew: ${t.hebrew}\nEnglish: ${t.english}`)
      .join("\n\n");

    const context = sourceTypeContext[sourceType];

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `${context}

Write a tweet storm (Twitter thread) breaking down the following text. Make it engaging, clear, and punchy — like a viral thread that makes people want to learn more Torah.

Rules:
- Start with a hook tweet that grabs attention
- Break down the key concepts clearly
- Add context where helpful (who are the Tanna'im/Amora'im, what's the background)
- End with a powerful takeaway or mussar insight
- Each tweet must be <=280 characters
- Use thread numbering (1/, 2/, etc.)
- No full Hebrew text — this is the English breakdown (but feel free to quote key Hebrew terms)

IMPORTANT - Illustrations: You MUST include exactly 2 tweets that get images. Every Torah text has visual concepts. Think creatively: physical objects, spatial layouts, diagrams of halachic measurements, timelines of machlokes, infographics comparing opinions, architectural diagrams, agricultural scenes, conceptual illustrations. Write detailed image prompts describing clean educational diagrams with labels on a white background.

Here is the text:

${textList}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "storms": [
    {
      "ref": "the reference",
      "tweets": [
        "1/ The hook tweet...",
        "2/ Next point...",
        "3/ The takeaway..."
      ],
      "imageTweets": [
        { "index": 0, "prompt": "detailed image description" }
      ]
    }
  ]
}`,
        },
      ],
    });

    if (message.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "Response too long — try a smaller selection" },
        { status: 500 }
      );
    }

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    const stormTweets: StormTweet[] = [];
    for (const storm of parsed.storms) {
      // Build a map of image tweet indices to their prompts
      const imageMap = new Map<number, string>();
      const imageTweets = storm.imageTweets || [];
      for (const img of imageTweets) {
        if (img && typeof img.index === "number") {
          // Claude may use "prompt", "imagePrompt", or "description"
          const prompt = img.prompt || img.imagePrompt || img.description || "";
          if (prompt) imageMap.set(img.index, prompt);
        }
      }
      // Also support legacy single imageTweet field
      if (imageMap.size === 0 && storm.imageTweet != null && storm.imagePrompt) {
        imageMap.set(storm.imageTweet, storm.imagePrompt);
      }

      for (let i = 0; i < storm.tweets.length; i++) {
        const imagePrompt = imageMap.get(i);
        stormTweets.push({
          id: `storm-${storm.ref}-${i}`,
          ref: storm.ref,
          tweetNumber: i + 1,
          totalTweets: storm.tweets.length,
          text: storm.tweets[i],
          needsImage: !!imagePrompt,
          imagePrompt: imagePrompt,
        });
      }
    }

    return NextResponse.json({ tweets: stormTweets });
  } catch (error) {
    console.error("Tweet storm error:", error);
    return NextResponse.json(
      { error: "Failed to generate tweet storm" },
      { status: 500 }
    );
  }
}
