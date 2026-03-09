import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { text, ref } = await req.json();

    if (!text || !ref) {
      return NextResponse.json(
        { error: "Missing text or ref" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a Torah educator for a frum audience. A student just read this tweet about "${ref}":

"${text}"

Provide a deeper explanation in 2-3 short paragraphs. Include:
- The broader context of this teaching
- Relevant commentary from Rishonim or Acharonim if applicable
- A practical takeaway or application

Use standard Orthodox terminology: "Hashem" not "God", "halacha" not "Jewish law", "tefillah" not "prayer", "brachos" not "blessings", "Chazal", "mitzva/mitzvos", etc.

Keep it engaging and accessible but scholarly. Respond with ONLY the explanation text, no titles or headers.`,
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

    return NextResponse.json({ content: textBlock.text });
  } catch (error) {
    console.error("Learn more error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
