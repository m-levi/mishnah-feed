import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { fetchCommentary } from "@/lib/sefaria";
import type { CommentaryTweet } from "@/lib/types";

export const runtime = "edge";

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
      ? `You are a Torah educator for a frum audience who makes meforshim come alive. A student tapped "Learn More" on this text about "${ref}":

"${text}"

Here is ACTUAL related commentary from classic meforshim (from Sefaria):

${commentaryContext}

Create a tweet storm (3-6 tweets, max 280 chars each) that makes these commentaries feel like insider knowledge. Each tweet should:
- Focus on a different commentator's perspective — ONLY use what they actually say above. Do NOT fabricate or embellish beyond what is provided.
- Lead with the most surprising or lesser-known insight from that commentator
- Start with the commentator's name in a way that creates intrigue: "Rashi drops a bombshell here..." or "The Ramban disagrees with everyone..."
- Accurately represent what the commentator says — ground every claim in the text above
- Be specific, not vague. Quote the actual detail that makes this interesting.
- Use thread numbering (1/, 2/, etc.)

Use standard Orthodox terminology: "Hashem" not "God", "halacha", "mitzva", "Chazal", etc.

End with a powerful reframe that ties the commentaries together.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "tweets": [
    { "commentator": "Rashi", "text": "1/ Rashi drops a bombshell here..." },
    { "commentator": "Ramban", "text": "2/ The Ramban disagrees..." }
  ]
}`
      : `You are a Torah educator for a frum audience who makes meforshim come alive. A student tapped "Learn More" on this text about "${ref}":

"${text}"

No additional commentary was found for this specific text. Create a tweet storm (3-5 tweets, max 280 chars each) providing a deeper analysis of the text itself. Each tweet should:
- Analyze the plain meaning (pshat) of what the text actually says
- Draw out implications, patterns, or important halachic/hashkafic points from the text
- Do NOT fabricate or attribute statements to specific commentators — instead, offer your own analysis
- Label insights as "deeper look", "takeaway", etc. — not as specific meforshim
- Lead with the most surprising angle to create intrigue
- Be specific and engaging, not vague summaries
- Use thread numbering (1/, 2/, etc.)

Use standard Orthodox terminology: "Hashem" not "God", "halacha", "mitzva", "Chazal", etc.

End with a takeaway that reframes how you see the original text.

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "tweets": [
    { "commentator": "Deeper Look", "text": "1/ The text here is teaching us..." },
    { "commentator": "Takeaway", "text": "2/ What stands out is..." }
  ]
}`;

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
        maxOutputTokens: 4000,
      },
    });

    // Extract text from non-thinking parts
    const responseParts = response.candidates?.[0]?.content?.parts || [];
    let jsonText = "";
    for (const part of responseParts) {
      if ((part as Record<string, unknown>).thought) continue;
      if (part.text) jsonText += part.text;
    }

    jsonText = jsonText.trim();
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
