"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Share2,
  Users,
  Check,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import { supabase } from "@/lib/supabase";
import type { Scroll, ScrollItem, StormTweet } from "@/lib/types";

export default function ScrollViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const [scroll, setScroll] = useState<Scroll | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<ScrollItem[]>([]);
  const [tweets, setTweets] = useState<StormTweet[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [copied, setCopied] = useState(false);
  const loadedPositionsRef = useRef(new Set<number>());

  const getAuthHeader = useCallback(async () => {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    return token ? `Bearer ${token}` : null;
  }, []);

  // Load scroll details
  useEffect(() => {
    async function load() {
      try {
        const authHeader = await getAuthHeader();
        const headers: Record<string, string> = {};
        if (authHeader) headers["Authorization"] = authHeader;

        const res = await fetch(`/api/scrolls/${id}`, { headers });
        if (!res.ok) throw new Error("Not found");

        const data = await res.json();
        setScroll(data.scroll);
        setItemCount(data.itemCount);
        setIsFollowing(data.isFollowing);
        if (data.userScroll) {
          setCurrentPosition(data.userScroll.current_position);
        }
      } catch {
        // scroll not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, getAuthHeader]);

  // Load content when scroll is loaded
  useEffect(() => {
    if (!scroll || loadedPositionsRef.current.has(currentPosition)) return;
    loadContent(currentPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scroll, currentPosition]);

  const loadContent = async (position: number) => {
    if (loadingContent || loadedPositionsRef.current.has(position)) return;
    setLoadingContent(true);
    loadedPositionsRef.current.add(position);

    try {
      const authHeader = await getAuthHeader();
      const headers: Record<string, string> = {};
      if (authHeader) headers["Authorization"] = authHeader;

      const res = await fetch(
        `/api/scrolls/${id}/feed?position=${position}&limit=1`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to load");

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setItems((prev) => [...prev, ...data.items]);
        // Flatten content into tweets
        for (const item of data.items) {
          if (item.content) {
            setTweets((prev) => [
              ...prev,
              ...item.content.map((t: StormTweet) => ({
                ...t,
                label: scroll?.title,
              })),
            ]);
          }
        }
      }
      setHasMore(data.hasMore);
    } catch {
      loadedPositionsRef.current.delete(position);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const authHeader = await getAuthHeader();
    if (!authHeader) return;

    if (isFollowing) {
      await fetch(`/api/scrolls/${id}/follow`, {
        method: "DELETE",
        headers: { Authorization: authHeader },
      });
      setIsFollowing(false);
    } else {
      await fetch(`/api/scrolls/${id}/follow`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      setIsFollowing(true);
    }
  };

  const handleNext = () => {
    const nextPos = currentPosition + 1;
    setCurrentPosition(nextPos);
    // Update in DB
    getAuthHeader().then((authHeader) => {
      if (!authHeader) return;
      supabase
        .from("user_scrolls")
        .update({ current_position: nextPos })
        .eq("user_id", user?.id || "")
        .eq("scroll_id", id);
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/scroll/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: scroll?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-lg mx-auto">
          <TweetSkeleton />
          <TweetSkeleton />
        </div>
      </div>
    );
  }

  if (!scroll) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--muted)] text-sm">Scroll not found</p>
          <button
            onClick={() => router.back()}
            className="mt-3 text-sm text-[var(--accent)] hover:underline cursor-pointer"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const progressPercent =
    scroll.scroll_type === "structured" && itemCount > 0
      ? Math.round((currentPosition / itemCount) * 100)
      : null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full hover:bg-[var(--bg)] active:bg-[var(--border)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{scroll.cover_emoji || "\uD83D\uDCDC"}</span>
              <h1
                className="text-base font-semibold text-[var(--text)] truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {scroll.title}
              </h1>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Share2 className="w-4 h-4 text-[var(--muted)]" />
            )}
          </button>
        </div>
      </div>

      {/* Scroll Info */}
      <div className="max-w-lg mx-auto px-4 py-4 border-b border-[var(--border)] bg-[var(--card-bg)]">
        {scroll.description && (
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {scroll.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
          {scroll.follower_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {scroll.follower_count} follower{scroll.follower_count !== 1 ? "s" : ""}
            </span>
          )}
          {itemCount > 0 && (
            <span>
              {itemCount} {scroll.scroll_type === "structured" ? "chapters" : "items"}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progressPercent !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--muted)] mb-1">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Follow button */}
        <button
          onClick={handleFollow}
          className={`mt-3 w-full py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${
            isFollowing
              ? "bg-[var(--bg)] text-[var(--text)] border border-[var(--border)]"
              : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          }`}
        >
          {isFollowing ? "Following" : "Follow Scroll"}
        </button>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto">
        {tweets.map((tweet) => (
          <StormCard key={tweet.id} tweet={tweet} />
        ))}

        {loadingContent && <TweetSkeleton />}

        {!loadingContent && hasMore && tweets.length > 0 && (
          <div className="p-4 flex justify-center">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
              Next
            </button>
          </div>
        )}

        {!hasMore && tweets.length > 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--muted)]">
              {scroll.scroll_type === "structured"
                ? "You've completed this scroll! \uD83C\uDF89"
                : "You're all caught up!"}
            </p>
          </div>
        )}

        {!loadingContent && tweets.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-[var(--muted)]">
              No content yet. Check back soon!
            </p>
          </div>
        )}
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          message="Sign in to follow scrolls and track your progress"
        />
      )}
    </div>
  );
}
