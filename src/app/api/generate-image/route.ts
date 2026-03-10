import { ai, GEMINI_IMAGE_MODEL } from "@/lib/gemini";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 }
      );
    }

    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a clean, educational illustration: ${prompt}. Style: simple diagram with labels, muted colors, white background. No text overlays except labels.`,
            },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json({ imageData: null });
    }

    const imagePart = parts.find((p) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      return NextResponse.json({ imageData: null });
    }

    return NextResponse.json({
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json({ imageData: null });
  }
}
