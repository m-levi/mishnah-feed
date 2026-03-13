import { createClient } from "@supabase/supabase-js";
import { generateScrollItems } from "@/lib/scroll-generator";
import type { ScrollType, ScrollConfig, ScrollSourceType } from "@/lib/types";

export const runtime = "edge";

function getSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

// POST: Create a new scroll
// GET: List scrolls (public/popular or user's own)
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      scroll_type,
      source_type,
      config,
      is_public = false,
      cover_emoji,
    } = body as {
      title: string;
      scroll_type: ScrollType;
      source_type: ScrollSourceType;
      config: ScrollConfig;
      description?: string;
      is_public?: boolean;
      cover_emoji?: string;
    };

    if (!title || !scroll_type || !source_type || !config) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the scroll
    const { data: scroll, error: scrollError } = await supabase
      .from("scrolls")
      .insert({
        creator_id: user.id,
        title,
        description: description || null,
        scroll_type,
        source_type,
        config,
        is_public,
        cover_emoji: cover_emoji || null,
      })
      .select()
      .single();

    if (scrollError) {
      return Response.json({ error: scrollError.message }, { status: 500 });
    }

    // Generate scroll items
    const items = generateScrollItems(scroll_type, config);

    if (items.length > 0) {
      const { error: itemsError } = await supabase
        .from("scroll_items")
        .insert(
          items.map((item) => ({
            scroll_id: scroll.id,
            position: item.position,
            slug: item.slug,
            ref: item.ref,
            source_type: item.source_type,
            display_name: item.display_name,
          }))
        );

      if (itemsError) {
        console.error("Error creating scroll items:", itemsError);
      }
    }

    // Auto-follow the scroll as creator
    await supabase.from("user_scrolls").insert({
      user_id: user.id,
      scroll_id: scroll.id,
      is_creator: true,
    });

    return Response.json({ scroll, itemCount: items.length });
  } catch (err) {
    return Response.json({ error: "Failed to create scroll" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "public"; // "public" | "mine" | "templates"
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const authHeader = request.headers.get("authorization");
  const supabase = getSupabaseClient(authHeader);

  if (mode === "mine") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_scrolls")
      .select("*, scroll:scrolls(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ scrolls: data });
  }

  // Public / template scrolls
  let query = supabase
    .from("scrolls")
    .select("*")
    .order("follower_count", { ascending: false })
    .range(offset, offset + limit - 1);

  if (mode === "templates") {
    query = query.eq("is_template", true);
  } else {
    query = query.eq("is_public", true);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  if (category && category !== "all") {
    query = query.eq("source_type", category);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ scrolls: data });
}
