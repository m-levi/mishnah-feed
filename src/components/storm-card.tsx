"use client";

import { ImageIcon, MessageCircle, Repeat2, Heart, BarChart3 } from "lucide-react";
import type { StormTweet } from "@/lib/types";

interface StormCardProps {
  tweet: StormTweet;
}

export function StormCard({ tweet }: StormCardProps) {
  const isFirst = tweet.tweetNumber === 1;
  const isLast = tweet.tweetNumber === tweet.totalTweets;

  return (
    <article className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 transition-colors card-enter">
      <div className="max-w-xl mx-auto flex gap-3 py-3">
        {/* Avatar column + thread line */}
        <div className="flex flex-col items-center flex-shrink-0 relative">
          {/* Thread line above (for non-first tweets) */}
          {!isFirst && (
            <div className="absolute top-0 w-0.5 h-3 bg-[var(--thread-line)]" />
          )}
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm mt-0">
            {tweet.ref.charAt(0).toUpperCase()}
          </div>
          {/* Thread line below */}
          {!isLast && (
            <div className="w-0.5 flex-1 mt-1 bg-[var(--thread-line)]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Header row */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-[15px] text-[var(--text)] truncate">
              {tweet.ref}
            </span>
            <span className="text-[var(--muted)] text-sm">
              &middot; {tweet.tweetNumber}/{tweet.totalTweets}
            </span>
          </div>

          {/* Tweet text */}
          <p className="text-[15px] leading-[1.5] text-[var(--text)] whitespace-pre-wrap">
            {tweet.text}
          </p>

          {/* Image area */}
          {tweet.needsImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-[var(--border)]">
              {tweet.imageData ? (
                <img
                  src={`data:${tweet.imageMimeType || "image/png"};base64,${tweet.imageData}`}
                  alt={`Illustration for ${tweet.ref}`}
                  className="w-full image-fade-in"
                />
              ) : (
                <div className="relative">
                  <div className="image-shimmer w-full" style={{ height: 200 }} />
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

          {/* Action bar (Twitter-style) */}
          <div className="flex items-center justify-between mt-3 max-w-[300px]">
            <button className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)] transition-colors group cursor-pointer">
              <div className="p-1.5 rounded-full group-hover:bg-[var(--accent)]/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
            </button>
            <button className="flex items-center gap-1 text-[var(--muted)] hover:text-green-500 transition-colors group cursor-pointer">
              <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                <Repeat2 className="w-4 h-4" />
              </div>
            </button>
            <button className="flex items-center gap-1 text-[var(--muted)] hover:text-pink-500 transition-colors group cursor-pointer">
              <div className="p-1.5 rounded-full group-hover:bg-pink-500/10 transition-colors">
                <Heart className="w-4 h-4" />
              </div>
            </button>
            <button className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)] transition-colors group cursor-pointer">
              <div className="p-1.5 rounded-full group-hover:bg-[var(--accent)]/10 transition-colors">
                <BarChart3 className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
