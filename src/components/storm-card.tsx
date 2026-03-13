"use client";

import { useState, useEffect } from "react";
import { ImageIcon, MessageCircle, Copy, Check, Heart, Bookmark } from "lucide-react";
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

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);

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

  const handleLearnMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTap?.(tweet);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(tweet.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);

    if (newLiked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 400);
    }

    const ids = getFavorites();
    if (newLiked) {
      if (!ids.includes(tweet.id)) ids.push(tweet.id);
    } else {
      const idx = ids.indexOf(tweet.id);
      if (idx >= 0) ids.splice(idx, 1);
    }
    setFavorites(ids);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    try {
      const saved = localStorage.getItem("scroll-saved");
      const list: StormTweet[] = saved ? JSON.parse(saved) : [];
      if (newBookmarked) {
        if (!list.some((t) => t.id === tweet.id)) {
          list.push(tweet);
        }
      } else {
        const idx = list.findIndex((t) => t.id === tweet.id);
        if (idx >= 0) list.splice(idx, 1);
      }
      localStorage.setItem("scroll-saved", JSON.stringify(list));
    } catch {}
  };

  return (
    <article
      className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 transition-colors hover:bg-[var(--bg)]/60 cursor-pointer"
      onClick={() => onTap?.(tweet)}
    >
      <div className="max-w-2xl mx-auto flex gap-3 py-3">
        {/* Avatar column + thread line */}
        <div className="flex flex-col items-center flex-shrink-0 w-10 relative">
          {!isFirst && (
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-0.5 h-3 bg-[var(--border)]" />
          )}
          <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {tweet.ref.charAt(0).toUpperCase()}
          </div>
          {!isLast && (
            <div className="w-0.5 flex-1 mt-1 bg-[var(--border)] mx-auto" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Label badge */}
          {tweet.label && tweet.tweetNumber === 1 && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-1">
              {tweet.label}
            </span>
          )}

          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-[15px] text-[var(--text)] truncate">
              {tweet.ref}
            </span>
            {tweet.totalTweets > 0 && (
              <span className="text-[var(--muted)] text-sm flex-shrink-0">
                &middot; {tweet.tweetNumber}/{tweet.totalTweets}
              </span>
            )}
          </div>

          {/* Tweet text */}
          <p className="text-[15px] leading-[1.55] text-[var(--text)] whitespace-pre-wrap">
            {tweet.text}
          </p>

          {/* Image */}
          {tweet.needsImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)]">
              {tweet.imageData ? (
                <img
                  src={`data:${tweet.imageMimeType || "image/png"};base64,${tweet.imageData}`}
                  alt={`Illustration for ${tweet.ref}`}
                  className="w-full img-reveal"
                />
              ) : (
                <div className="relative">
                  <div className="shimmer w-full" style={{ height: 200 }} />
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

          {/* Action bar */}
          <div className="flex items-center justify-between mt-3 max-w-[280px]">
            {/* Commentary */}
            <button
              className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)] transition-colors group cursor-pointer"
              onClick={handleLearnMore}
              title="View commentary"
            >
              <div className="p-1.5 rounded-full group-hover:bg-[var(--accent)]/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
            </button>

            {/* Copy tweet text */}
            <button
              className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                copied
                  ? "text-green-600"
                  : "text-[var(--muted)] hover:text-green-600"
              }`}
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy text"}
            >
              <div className="p-1.5 rounded-full group-hover:bg-green-600/10 transition-colors">
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </div>
            </button>

            {/* Like / favorite */}
            <button
              className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                liked
                  ? "text-pink-500"
                  : "text-[var(--muted)] hover:text-pink-500"
              }`}
              onClick={handleLike}
              title={liked ? "Unfavorite" : "Favorite"}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  liked
                    ? "bg-pink-500/10"
                    : "group-hover:bg-pink-500/10"
                } ${likeAnim ? "like-pop" : ""}`}
              >
                <Heart
                  className="w-4 h-4"
                  fill={liked ? "currentColor" : "none"}
                />
              </div>
            </button>

            {/* Bookmark / save */}
            <button
              className={`flex items-center gap-1 transition-colors group cursor-pointer ${
                bookmarked
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--accent)]"
              }`}
              onClick={handleSave}
              title={bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              <div
                className={`p-1.5 rounded-full transition-colors ${
                  bookmarked
                    ? "bg-[var(--accent)]/10"
                    : "group-hover:bg-[var(--accent)]/10"
                }`}
              >
                <Bookmark
                  className="w-4 h-4"
                  fill={bookmarked ? "currentColor" : "none"}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
