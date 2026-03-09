import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { fetchCommentary } from "@/lib/sefaria";
import type { CommentaryTweet } from "@/lib/types";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { text, ref, slug, sourceRef } = await req.json();

    if (!text || !ref) {
      return NextResponse.json(
        { error: "Missing text or ref" },
        { status: 400 }
      );
    }

    // Try to fetch commentary from Sefaria
    let commentaryContext = "";
    if (slug && sourceRef) {
      const commentaries = await fetchCommentary(slug, sourceRef);
      if (commentaries.length > 0) {
        commentaryContext = commentaries
          .map(
            (c) =>
              `--- ${c.commentator} on ${c.sourceRef} ---\n${c.text || "(Hebrew only)"}`
          )
          .join("\n\n");
      }
    }

    const prompt = commentaryContext
      ? `You are a Torah educator for a frum audience. A student is reading this text about "${ref}":

"${text}"

Here is related commentary from classic meforshim:

${commentaryContext}

Create a tweet storm (3-6 tweets, max 280 chars each) breaking down the key commentary insights. Each tweet should:
- Focus on a different commentator's perspective
- Start with the commentator's name (e.g., "Rashi explains...", "The Bartenura notes...")
- Be engaging and accessible
- Use thread numbering (1/, 2/, etc.)

Use standard Orthodox terminology: "Hashem" not "God", "halacha", "mitzva", "Chazal", etc.

End with a powerful takeaway that synthesizes the commentaries.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "tweets": [
    { "commentator": "Rashi", "text": "1/ Rashi explains..." },
    { "commentator": "Bartenura", "text": "2/ The Bartenura..." }
  ]
}`
      : `You are a Torah educator for a frum audience. A student is reading this text about "${ref}":

"${text}"

Create a tweet storm (3-5 tweets, max 280 chars each) providing deeper commentary insights. Each tweet should:
- Focus on a different commentator (Rashi, Ramban, Bartenura, Tosafot Yom Tov, Rambam, Sforno, etc.)
- Start with the commentator's name
- Be engaging and accessible
- Use thread numbering (1/, 2/, etc.)

Use standard Orthodox terminology: "Hashem" not "God", "halacha", "mitzva", "Chazal", etc.

End with a takeaway tweet.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "tweets": [
    { "commentator": "Rashi", "text": "1/ Rashi explains..." },
    { "commentator": "Bartenura", "text": "2/ The Bartenura..." }
  ]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
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

    const tweets: CommentaryTweet[] = (parsed.tweets || []).map(
      (t: { commentator?: string; text: string }, i: number) => ({
        id: `commentary-${i}`,
        commentator: t.commentator || "Commentary",
        text: t.text,
        sourceRef: ref,
      })
    );

    return NextResponse.json({ tweets });
  } catch (error) {
    console.error("Learn more error:", error);
    return NextResponse.json(
      { error: "Failed to generate commentary" },
      { status: 500 }
    );
  }
}
