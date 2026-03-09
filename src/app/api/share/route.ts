import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { ref, tweets, sourceType } = await req.json();

    if (!ref || !tweets || tweets.length === 0) {
      return NextResponse.json(
        { error: "Missing ref or tweets" },
        { status: 400 }
      );
    }

    // Strip image data before saving (too large for DB)
    const tweetsForStorage = tweets.map(
      (t: { imageData?: string; imageMimeType?: string; imageLoading?: boolean; [key: string]: unknown }) => {
        const { imageData: _img, imageMimeType: _mime, imageLoading: _load, ...rest } = t;
        void _img; void _mime; void _load;
        return rest;
      }
    );

    const { data, error } = await supabase
      .from("shared_storms")
      .insert({
        source_type: sourceType || "mishnayos",
        ref,
        tweets: tweetsForStorage,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save" },
        { status: 500 }
      );
    }

    const baseUrl = req.headers.get("origin") || "http://localhost:3000";
    const url = `${baseUrl}/s/${data.id}`;

    return NextResponse.json({ url, id: data.id });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: "Failed to share" },
      { status: 500 }
    );
  }
}
