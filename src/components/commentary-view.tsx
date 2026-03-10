"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, BookOpen } from "lucide-react";
import type { StormTweet, CommentaryTweet } from "@/lib/types";

interface Props {
  tweet: StormTweet;
  onBack: () => void;
}

export function CommentaryView({ tweet, onBack }: Props) {
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

  const colors = [
    { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
    { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
    { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700" },
    { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
    { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700" },
    { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text)]" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-[var(--text)] truncate">
              Commentary
            </h1>
            <p className="text-xs text-[var(--muted)] truncate">{tweet.ref}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24">
        {/* Original tweet */}
        <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] p-4 mb-6">
          {tweet.label && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] mb-2">
              {tweet.label}
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xs">
              {tweet.ref.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-sm text-[var(--text)]">
              {tweet.ref}
            </span>
            {tweet.totalTweets > 0 && (
              <span className="text-[var(--muted)] text-xs">
                {tweet.tweetNumber}/{tweet.totalTweets}
              </span>
            )}
          </div>
          <p className="text-[15px] leading-[1.6] text-[var(--text)] whitespace-pre-wrap">
            {tweet.text}
          </p>

          {/* Image if present */}
          {tweet.imageData && (
            <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border)]">
              <img
                src={`data:${tweet.imageMimeType || "image/png"};base64,${tweet.imageData}`}
                alt={`Illustration for ${tweet.ref}`}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Commentary section */}
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-[var(--accent)]" />
          <h2
            className="text-sm font-semibold text-[var(--accent)] uppercase tracking-wider"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What the Meforshim Say
          </h2>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4"
              >
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-28 shimmer rounded" />
                    <div className="h-3.5 w-full shimmer rounded" />
                    <div className="h-3.5 w-[80%] shimmer rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              Could not load commentary. Please try again.
            </p>
            <button
              onClick={onBack}
              className="mt-3 text-sm text-[var(--accent)] hover:underline cursor-pointer"
            >
              Go back
            </button>
          </div>
        )}

        {/* Commentary cards */}
        {commentaryTweets.length > 0 && (
          <div className="space-y-3">
            {commentaryTweets.map((ct, i) => {
              const color = colors[i % colors.length];
              return (
                <div
                  key={ct.id}
                  className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-full ${color.bg} border ${color.border} flex items-center justify-center ${color.text} font-bold text-sm flex-shrink-0`}
                    >
                      {ct.commentator.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-bold text-sm ${color.text}`}>
                        {ct.commentator}
                      </span>
                      <p className="text-[14px] leading-[1.65] text-[var(--text)] mt-1">
                        {ct.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
