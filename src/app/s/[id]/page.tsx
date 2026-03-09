import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { SharedStormView } from "./shared-storm-view";
import type { StormTweet } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SharedStormPage({ params }: Props) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("shared_storms")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const tweets: StormTweet[] = data.tweets;

  return (
    <SharedStormView
      ref_={data.ref}
      tweets={tweets}
      createdAt={data.created_at}
    />
  );
}
