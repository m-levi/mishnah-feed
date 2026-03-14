import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function getSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");
  const supabase = getSupabaseClient(authHeader);

  // Get scroll details
  const { data: scroll, error } = await supabase
    .from("scrolls")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !scroll) {
    return Response.json({ error: "Scroll not found" }, { status: 404 });
  }

  // Get item count
  const { count } = await supabase
    .from("scroll_items")
    .select("*", { count: "exact", head: true })
    .eq("scroll_id", id);

  // Check if current user follows this scroll
  let isFollowing = false;
  let userScroll = null;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from("user_scrolls")
      .select("*")
      .eq("user_id", user.id)
      .eq("scroll_id", id)
      .maybeSingle();

    if (data) {
      isFollowing = true;
      userScroll = data;
    }
  }

  return Response.json({
    scroll,
    itemCount: count || 0,
    isFollowing,
    userScroll,
  });
}
