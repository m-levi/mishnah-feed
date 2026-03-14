import { createClient } from "@supabase/supabase-js";
import { getCalendarData } from "@/lib/jewish-calendar";
import type { Scroll, ScrollItem } from "@/lib/types";

export const runtime = "edge";

function getSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

interface FeedEntry {
  scrollId: string;
  scrollTitle: string;
  scrollEmoji: string | null;
  scrollType: string;
  item: ScrollItem;
}

/**
 * GET: Combined "For You" feed from all followed scrolls.
 * Intelligently mixes content: calendar items first, then round-robin from other scrolls.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  // Get all followed scrolls with their details
  const { data: userScrolls, error } = await supabase
    .from("user_scrolls")
    .select("*, scroll:scrolls(*)")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false });

  if (error || !userScrolls || userScrolls.length === 0) {
    return Response.json({ feed: [], hasScrolls: (userScrolls?.length || 0) > 0 });
  }

  // Get read items for this user
  const { data: readItems } = await supabase
    .from("scroll_item_reads")
    .select("scroll_item_id")
    .eq("user_id", user.id);

  const readSet = new Set((readItems || []).map((r) => r.scroll_item_id));

  // For each scroll, get the next unread item(s)
  const feedEntries: FeedEntry[] = [];
  const calendarEntries: FeedEntry[] = [];

  // Update calendar scroll items if needed
  const calendar = await getCalendarData();

  for (const us of userScrolls) {
    const scroll = us.scroll as Scroll;
    if (!scroll) continue;

    // For calendar scrolls, check if we need to add today's item
    if (scroll.scroll_type === "calendar") {
      await ensureCalendarItem(supabase, scroll, calendar);
    }

    // Get next unread items for this scroll
    const { data: items } = await supabase
      .from("scroll_items")
      .select("*")
      .eq("scroll_id", scroll.id)
      .gte("position", us.current_position)
      .order("position", { ascending: true })
      .limit(2);

    if (!items || items.length === 0) continue;

    // Find first unread item
    const nextItem = items.find((it) => !readSet.has(it.id)) || items[0];

    const entry: FeedEntry = {
      scrollId: scroll.id,
      scrollTitle: scroll.title,
      scrollEmoji: scroll.cover_emoji,
      scrollType: scroll.scroll_type,
      item: nextItem,
    };

    if (scroll.scroll_type === "calendar") {
      calendarEntries.push(entry);
    } else {
      feedEntries.push(entry);
    }
  }

  // Build feed: calendar items first, then interleave structured/custom
  const feed = [...calendarEntries, ...feedEntries].slice(0, limit);

  return Response.json({
    feed,
    hasScrolls: true,
  });
}

async function ensureCalendarItem(
  supabase: ReturnType<typeof getSupabaseClient>,
  scroll: Scroll,
  calendar: Awaited<ReturnType<typeof getCalendarData>>
) {
  const config = scroll.config as { calendarType?: string };
  const today = new Date().toISOString().slice(0, 10);

  // Check if we already have today's item
  const { data: existingItems } = await supabase
    .from("scroll_items")
    .select("*")
    .eq("scroll_id", scroll.id)
    .order("position", { ascending: false })
    .limit(1);

  const lastItem = existingItems?.[0];
  const lastDate = lastItem?.created_at?.slice(0, 10);

  if (lastDate === today) return; // Already have today's item

  // Get today's calendar content
  let calendarItem = null;
  if (config.calendarType === "daf_yomi" && calendar.dafYomi) {
    calendarItem = calendar.dafYomi;
  } else if (config.calendarType === "daily_mishnah" && calendar.dailyMishnah) {
    calendarItem = calendar.dailyMishnah;
  } else if (config.calendarType === "parsha" && calendar.parsha) {
    calendarItem = calendar.parsha;
  }

  if (!calendarItem) return;

  const nextPosition = (lastItem?.position ?? -1) + 1;

  await supabase.from("scroll_items").insert({
    scroll_id: scroll.id,
    position: nextPosition,
    slug: calendarItem.slug,
    ref: calendarItem.ref,
    source_type: calendarItem.sourceType,
    display_name: calendarItem.displayName,
  });
}
