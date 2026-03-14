import { createClient } from "@supabase/supabase-js";
import { ai, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import { fetchTexts } from "@/lib/sefaria";
import type { StormTweet, SourceType } from "@/lib/types";

export const runtime = "edge";

function getSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

/**
 * GET: Fetch scroll items with content, generating on-demand if needed.
 * Returns items starting from the user's current position.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const position = parseInt(searchParams.get("position") || "0");
  const limit = parseInt(searchParams.get("limit") || "3");

  const authHeader = request.headers.get("authorization");
  const supabase = getSupabaseClient(authHeader);

  // Fetch items at the requested positions
  const { data: items, error } = await supabase
    .from("scroll_items")
    .select("*")
    .eq("scroll_id", id)
    .gte("position", position)
    .order("position", { ascending: true })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return Response.json({ items: [], hasMore: false });
  }

  // For items without content, generate it
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      if (item.content) return item;

      // Generate content on-demand
      try {
        const content = await generateItemContent(
          item.slug,
          item.ref,
          item.source_type as SourceType,
          item.display_name
        );

        // Cache the content back to DB
        await supabase
          .from("scroll_items")
          .update({ content, generated_at: new Date().toISOString() })
          .eq("id", item.id);

        return { ...item, content };
      } catch {
        return item;
      }
    })
  );

  // Check if there are more items
  const { count } = await supabase
    .from("scroll_items")
    .select("*", { count: "exact", head: true })
    .eq("scroll_id", id)
    .gt("position", items[items.length - 1].position);

  return Response.json({
    items: enrichedItems,
    hasMore: (count || 0) > 0,
  });
}

async function generateItemContent(
  slug: string,
  ref: string,
  sourceType: SourceType,
  displayName: string
): Promise<StormTweet[]> {
  const texts = await fetchTexts(slug, ref);
  if (!texts || texts.length === 0) return [];

  const combinedText = texts.map((t) => `${t.english}`).join("\n\n");

  const sourceLabel =
    sourceType === "mishnayos"
      ? "Mishnah"
      : sourceType === "gemara"
        ? "Gemara"
        : "Torah";

  const prompt = `You are a brilliant Torah teacher creating a short thread about ${displayName}.

Source text:
${combinedText}

Create 4-6 short, engaging posts (each under 280 characters) that teach this text in a clear, insightful way.
Use proper Orthodox Jewish terminology (Hashem, not God; daven, not pray).
Include the Hebrew terms where relevant.
For exactly 1 post, include an image prompt for an educational illustration.

Return as JSON array: [{"text": "...", "needsImage": false, "imagePrompt": null}, ...]`;

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: prompt,
    config: {
      temperature: 0.8,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  const responseText = response.text || "";

  // Parse JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map(
      (
        item: { text: string; needsImage?: boolean; imagePrompt?: string | null },
        i: number
      ) => ({
        id: `${slug}-${ref}-${i}`,
        ref: displayName,
        slug,
        sourceRef: ref,
        tweetNumber: i + 1,
        totalTweets: parsed.length,
        text: item.text,
        needsImage: item.needsImage || false,
        imagePrompt: item.imagePrompt || undefined,
        label: sourceLabel,
      })
    );
  } catch {
    return [];
  }
}
