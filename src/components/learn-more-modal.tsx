"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { StormTweet } from "@/lib/types";

interface Props {
  tweet: StormTweet;
  onClose: () => void;
}

export function LearnMoreModal({ tweet, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchMore = async () => {
      try {
        const res = await fetch("/api/learn-more", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: tweet.text, ref: tweet.ref }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setContent(data.content);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchMore();
    return () => { cancelled = true; };
  }, [tweet.text, tweet.ref]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 modal-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-lg max-h-[85vh] bg-[var(--card-bg)] rounded-t-2xl sm:rounded-2xl overflow-hidden modal-sheet z-10">
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-[85vh] px-6 pt-4 pb-8 sm:pt-6 sm:pb-6">
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
          <p className="text-[15px] leading-[1.7] text-[var(--text)] mb-6">
            {tweet.text}
          </p>

          {/* Divider */}
          <div className="border-t border-[var(--border)] mb-6" />

          {/* Deeper insight header */}
          <h3
            className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Deeper Insight
          </h3>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-3">
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-[95%] shimmer rounded" />
              <div className="h-4 w-[88%] shimmer rounded" />
              <div className="h-3 w-0" />
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-[92%] shimmer rounded" />
              <div className="h-4 w-[75%] shimmer rounded" />
              <div className="h-3 w-0" />
              <div className="h-4 w-full shimmer rounded" />
              <div className="h-4 w-[85%] shimmer rounded" />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">
              Could not load explanation. Please try again.
            </p>
          )}

          {/* Content */}
          {content && (
            <div className="text-[15px] leading-[1.75] text-[var(--text-secondary)] whitespace-pre-wrap fade-in">
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
