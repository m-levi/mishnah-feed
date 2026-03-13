import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function getSupabaseClient(authHeader: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
  );
}

// POST: Follow a scroll
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_scrolls")
    .upsert(
      { user_id: user.id, scroll_id: id, is_creator: false },
      { onConflict: "user_id,scroll_id" }
    )
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ userScroll: data });
}

// DELETE: Unfollow a scroll
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseClient(authHeader);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_scrolls")
    .delete()
    .eq("user_id", user.id)
    .eq("scroll_id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
