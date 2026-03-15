"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ImageIcon, MessageCircle, Copy, Check, Heart, Bookmark, Play } from "lucide-react";
import { ImageCarousel } from "@/components/image-carousel";
import { trackView, trackDwell, trackAction } from "@/lib/tracking";
import type { StormTweet } from "@/lib/types";

interface StormCardProps {
  tweet: StormTweet;
  onTap?: (tweet: StormTweet) => void;
}

function getFavorites(): string[] {
  try {
    const saved = localStorage.getItem("scroll-favorites");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function setFavorites(ids: string[]) {
  try {
    localStorage.setItem("scroll-favorites", JSON.stringify(ids));
  } catch {}
}

export function StormCard({ tweet, onTap }: StormCardProps) {
  const isFirst = tweet.tweetNumber === 1;
  const isLast = tweet.tweetNumber === tweet.totalTweets;
  const isSingle = tweet.totalTweets <= 1;
  const isMid = !isFirst && !isLast;

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const viewTracked = useRef(false);
  const dwellStart = useRef<number | null>(null);
  const totalDwell = useRef(0);

  // Load persisted state
  useEffect(() => {
    setLiked(getFavorites().includes(tweet.id));
    try {
      const saved = localStorage.getItem("scroll-saved");
      if (saved) {
        const list: StormTweet[] = JSON.parse(saved);
        setBookmarked(list.some((t) => t.id === tweet.id));
      }
    } catch {}
  }, [tweet.id]);

  // Viewport tracking: view + dwell time
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let viewTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Start dwell timer
            dwellStart.current = Date.now();

            // Track view after 1 second of visibility
            if (!viewTracked.current) {
              viewTimer = setTimeout(() => {
                viewTracked.current = true;
                trackView(tweet);
              }, 1000);
            }
          } else {
            // Left viewport - track dwell
            if (dwellStart.current) {
              const elapsed = Date.now() - dwellStart.current;
              totalDwell.current += elapsed;
              dwellStart.current = null;
            }

            if (viewTimer) {
              clearTimeout(viewTimer);
              viewTimer = null;
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (viewTimer) clearTimeout(viewTimer);

      // Track accumulated dwell on unmount
      if (dwellStart.current) {
        totalDwell.current += Date.now() - dwellStart.current;
      }
      if (totalDwell.current > 0) {
        trackDwell(tweet, totalDwell.current);
      }
    };
  }, [tweet]);

  const handleLearnMore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      trackAction("learn_more", tweet);
      onTap?.(tweet);
    },
    [tweet, onTap]
  );

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(tweet.text);
        setCopied(true);
        trackAction("copy", tweet);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    },
    [tweet]
  );

  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newLiked = !liked;
      setLiked(newLiked);
      if (newLiked) {
        setLikeAnim(true);
        setTimeout(() => setLikeAnim(false), 400);
      }
      trackAction(newLiked ? "like" : "unlike", tweet);
      const ids = getFavorites();
      if (newLiked) {
        if (!ids.includes(tweet.id)) ids.push(tweet.id);
      } else {
        const idx = ids.indexOf(tweet.id);
        if (idx >= 0) ids.splice(idx, 1);
      }
      setFavorites(ids);
    },
    [liked, tweet]
  );

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const newBookmarked = !bookmarked;
      setBookmarked(newBookmarked);
      trackAction(newBookmarked ? "bookmark" : "unbookmark", tweet);
      try {
        const saved = localStorage.getItem("scroll-saved");
        const list: StormTweet[] = saved ? JSON.parse(saved) : [];
        if (newBookmarked) {
          if (!list.some((t) => t.id === tweet.id)) list.push(tweet);
        } else {
          const idx = list.findIndex((t) => t.id === tweet.id);
          if (idx >= 0) list.splice(idx, 1);
        }
        localStorage.setItem("scroll-saved", JSON.stringify(list));
      } catch {}
    },
    [bookmarked, tweet]
  );

  return (
    <article
      ref={cardRef}
      className={`bg-[var(--card-bg)] px-4 transition-colors duration-150 hover:bg-[var(--bg)]/60 active:bg-[var(--bg)]/80 cursor-pointer press-card ${
        isFirst && !isSingle ? "border-b-0" : "border-b border-[var(--border)]"
      } ${isMid ? "border-b-0" : ""}`}
      onClick={() => onTap?.(tweet)}
    >
      <div className="max-w-2xl mx-auto flex gap-3 py-3">
        {/* Thread line column */}
        <div className="flex flex-col items-center flex-shrink-0 w-10 relative">
          {/* Line coming down from previous card */}
          {!isFirst && (
            <div className="absolute left-1/2 -translate-x-1/2 -top-3 w-0.5 h-6 bg-[var(--accent-muted)]/60" />
          )}

          {/* Avatar — only on first card of a thread */}
          {isFirst ? (
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 z-[1]">
              {tweet.ref.charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-[var(--accent-muted)] flex-shrink-0 mt-2 z-[1]" />
          )}

          {/* Line going down to next card */}
          {!isLast && !isSingle && (
            <div className="w-0.5 flex-1 mt-1 bg-[var(--accent-muted)]/60 mx-auto" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Label badge — only on first card */}
          {tweet.label && isFirst && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-1">
              {tweet.label}
            </span>
          )}

          {/* Header row — full on first, minimal on rest */}
          {isFirst ? (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-bold text-[15px] text-[var(--text)] truncate">
                {tweet.ref}
              </span>
              {tweet.totalTweets > 1 && (
                <span className="text-[var(--muted)] text-xs flex-shrink-0">
                  &middot; {tweet.totalTweets} posts
                </span>
              )}
            </div>
          ) : (
            <div className="mb-0.5 mt-0.5">
              <span className="text-[11px] text-[var(--muted)]">
                {tweet.tweetNumber}/{tweet.totalTweets}
              </span>
            </div>
          )}

          {/* Tweet text */}
          <p className="text-[15px] leading-[1.55] text-[var(--text)] whitespace-pre-wrap">
            {tweet.text}
          </p>

          {/* Single image */}
          {tweet.needsImage && !tweet.carousel && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)]">
              {tweet.imageData ? (
                <img
                  src={`data:${tweet.imageMimeType || "image/png"};base64,${tweet.imageData}`}
                  alt={`Illustration for ${tweet.ref}`}
                  className="w-full img-reveal"
                />
              ) : (
                <div className="relative">
                  <div
                    className="shimmer w-full"
                    style={{ height: 200 }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                      <ImageIcon className="w-5 h-5 text-[var(--muted)] animate-pulse" />
                    </div>
                    <span className="text-xs font-medium text-[var(--muted)] bg-white/70 backdrop-blur-sm px-3 py-1 rounded-full">
                      Generating illustration...
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video */}
          {tweet.videoUrl && tweet.videoReady && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)]">
              <video
                src={tweet.videoUrl}
                className="w-full"
                controls
                playsInline
                muted
                loop
                preload="metadata"
                poster=""
              />
            </div>
          )}

          {/* Video placeholder (generating) */}
          {tweet.videoPrompt && !tweet.videoUrl && !tweet.videoReady && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)]">
              <div className="relative bg-gradient-to-br from-[var(--accent-light)] to-[var(--bg)]" style={{ height: 200 }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <Play className="w-6 h-6 text-[var(--accent)] animate-pulse" />
                  </div>
                  <span className="text-xs font-medium text-[var(--muted)] px-3 py-1 rounded-full bg-white/70 backdrop-blur-sm">
                    Video generating...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Image carousel */}
          {tweet.carousel && tweet.carousel.length > 0 && (
            <ImageCarousel
              images={tweet.carousel}
              alt={`Illustrations for ${tweet.ref}`}
            />
          )}

          {/* Action bar — only on last card (or single card) */}
          {(isLast || isSingle) && (
            <div className="flex items-center justify-between mt-2 -ml-1.5 max-w-[300px]">
              <button
                className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)] transition-colors group cursor-pointer"
                onClick={handleLearnMore}
                title="View commentary"
              >
                <div className="p-2 rounded-full group-hover:bg-[var(--accent)]/10 group-active:bg-[var(--accent)]/15 transition-colors">
                  <MessageCircle className="w-[18px] h-[18px]" />
                </div>
              </button>

              <button
                className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                  copied ? "text-green-600" : "text-[var(--muted)] hover:text-green-600"
                }`}
                onClick={handleCopy}
                title={copied ? "Copied!" : "Copy text"}
              >
                <div className="p-2 rounded-full group-hover:bg-green-600/10 group-active:bg-green-600/15 transition-colors">
                  {copied ? <Check className="w-[18px] h-[18px]" /> : <Copy className="w-[18px] h-[18px]" />}
                </div>
              </button>

              <button
                className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                  liked ? "text-pink-500" : "text-[var(--muted)] hover:text-pink-500"
                }`}
                onClick={handleLike}
                title={liked ? "Unfavorite" : "Favorite"}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${
                    liked ? "bg-pink-500/10" : "group-hover:bg-pink-500/10 group-active:bg-pink-500/15"
                  } ${likeAnim ? "like-pop" : ""}`}
                >
                  <Heart className="w-[18px] h-[18px]" fill={liked ? "currentColor" : "none"} />
                </div>
              </button>

              <button
                className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                  bookmarked ? "text-[var(--accent)]" : "text-[var(--muted)] hover:text-[var(--accent)]"
                }`}
                onClick={handleSave}
                title={bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                <div
                  className={`p-2 rounded-full transition-colors ${
                    bookmarked ? "bg-[var(--accent)]/10" : "group-hover:bg-[var(--accent)]/10 group-active:bg-[var(--accent)]/15"
                  }`}
                >
                  <Bookmark className="w-[18px] h-[18px]" fill={bookmarked ? "currentColor" : "none"} />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
