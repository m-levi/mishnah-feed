import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
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
    // Pick 4 random sources
    const picks = pickRandomItems(4);

    // Fetch texts concurrently
    const textResults = await Promise.allSettled(
      picks.map((p) => fetchTexts(p.slug, p.ref))
    );

    // Filter successful fetches
    const validTexts: {
      pick: (typeof picks)[0];
      texts: Awaited<ReturnType<typeof fetchTexts>>;
    }[] = [];

    for (let i = 0; i < textResults.length; i++) {
      const result = textResults[i];
      if (
        result.status === "fulfilled" &&
        result.value.length > 0
      ) {
        validTexts.push({ pick: picks[i], texts: result.value });
      }
    }

    if (validTexts.length === 0) {
      return NextResponse.json(
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

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are an engaging Torah educator for a frum audience. Create a discovery feed mixing insights from different Torah sources.

Use standard Orthodox terminology: "Hashem" not "God", "tefillah" not "prayer", "brachos" not "blessings", "halacha", "mitzva/mitzvos", "Chazal", etc.

For each source below, write 2-3 punchy, engaging tweets (max 280 chars each). Make each one grab attention and teach something interesting. Use thread numbering (1/, 2/, etc.) within each source.

Include exactly 2 image tweets across the entire feed. Choose tweets where a visual would help. Write detailed image prompts for clean educational illustrations with labels on white background.

Sources:
${textList}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "storms": [
    {
      "ref": "source display name",
      "tweets": ["1/ tweet...", "2/ tweet..."],
      "imageTweets": [{ "index": 0, "prompt": "detailed image description" }]
    }
  ]
}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response" },
        { status: 500 }
      );
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    const stormTweets: StormTweet[] = [];
    let globalIndex = 0;

    for (let stormIdx = 0; stormIdx < parsed.storms.length; stormIdx++) {
      const storm = parsed.storms[stormIdx];
      const pick = validTexts[Math.min(stormIdx, validTexts.length - 1)]?.pick;

      const imageMap = new Map<number, string>();
      const imageTweets = storm.imageTweets || [];
      for (const img of imageTweets) {
        if (img && typeof img.index === "number") {
          const prompt =
            img.prompt || img.imagePrompt || img.description || "";
          if (prompt) imageMap.set(img.index, prompt);
        }
      }

      for (let i = 0; i < storm.tweets.length; i++) {
        const imagePrompt = imageMap.get(i);
        stormTweets.push({
          id: `discover-${globalIndex}`,
          ref: storm.ref,
          slug: pick?.slug,
          sourceRef: pick?.ref,
          tweetNumber: i + 1,
          totalTweets: storm.tweets.length,
          text: storm.tweets[i],
          needsImage: !!imagePrompt,
          imagePrompt,
        });
        globalIndex++;
      }
    }

    return NextResponse.json({ tweets: stormTweets });
  } catch (error) {
    console.error("Discover error:", error);
    return NextResponse.json(
      { error: "Failed to generate discovery feed" },
      { status: 500 }
    );
  }
}
