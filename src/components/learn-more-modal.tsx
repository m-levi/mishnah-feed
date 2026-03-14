"use client";

import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import type { StormTweet, CommentaryTweet } from "@/lib/types";

interface Props {
  tweet: StormTweet;
  onClose: () => void;
}

export function LearnMoreModal({ tweet, onClose }: Props) {
  const [commentaryTweets, setCommentaryTweets] = useState<CommentaryTweet[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCommentary = async () => {
      try {
        const res = await fetch("/api/learn-more", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: tweet.text,
            ref: tweet.ref,
            slug: tweet.slug,
            sourceRef: tweet.sourceRef,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setCommentaryTweets(data.tweets || []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchCommentary();
    return () => {
      cancelled = true;
    };
  }, [tweet.text, tweet.ref, tweet.slug, tweet.sourceRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Color palette for commentator avatars
  const colors = [
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-700",
    },
    { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
    { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    {
      bg: "bg-violet-50",
      border: "border-violet-200",
      text: "text-violet-700",
    },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 modal-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-[var(--card-bg)] rounded-t-3xl sm:rounded-2xl overflow-hidden modal-sheet z-10">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border)]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] active:bg-[var(--border)] transition-colors cursor-pointer z-10"
        >
          <X className="w-4.5 h-4.5" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[85vh] px-5 pt-4 pb-8 sm:pt-6 sm:pb-6">
          {/* Source tag */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold text-[var(--accent)] bg-[var(--accent-light)] px-2.5 py-1 rounded-full">
              {tweet.ref}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {tweet.tweetNumber} of {tweet.totalTweets}
            </span>
          </div>

          {/* Original text */}
          <p className="text-[15px] leading-[1.7] text-[var(--text)] mb-5">
            {tweet.text}
          </p>

          {/* Commentary section */}
          <div className="border-t border-[var(--border)] pt-5">
            <h3
              className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-4 flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <BookOpen className="w-4 h-4" />
              Commentary
            </h3>

            {/* Loading skeleton */}
            {isLoading && (
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 skeleton-pulse"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="w-8 h-8 rounded-full shimmer flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-24 shimmer rounded" />
                      <div className="h-3.5 w-full shimmer rounded" />
                      <div className="h-3.5 w-[85%] shimmer rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500">
                Could not load commentary. Please try again.
              </p>
            )}

            {/* Commentary tweets */}
            {commentaryTweets.length > 0 && (
              <div>
                {commentaryTweets.map((ct, i) => {
                  const color = colors[i % colors.length];
                  const isLast = i === commentaryTweets.length - 1;
                  return (
                    <div
                      key={ct.id}
                      className="flex gap-3 fade-in"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Commentator avatar + thread line */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div
                          className={`w-8 h-8 rounded-full ${color.bg} border ${color.border} flex items-center justify-center ${color.text} font-bold text-xs`}
                        >
                          {ct.commentator.charAt(0)}
                        </div>
                        {!isLast && (
                          <div className="w-0.5 flex-1 mt-1 bg-[var(--border)]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-4">
                        <span
                          className={`font-bold text-[13px] ${color.text}`}
                        >
                          {ct.commentator}
                        </span>
                        <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)] mt-0.5">
                          {ct.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
