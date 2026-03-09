"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Printer, Share2, Check, BookOpen, Sparkles } from "lucide-react";
import { MishnahSelector } from "@/components/mishnah-selector";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import type { StormTweet, SourceType } from "@/lib/types";

export default function HomePage() {
  const [tweets, setTweets] = useState<StormTweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const imageQueueRef = useRef<Set<number>>(new Set());

  const handleSelect = useCallback(
    async (slug: string, ref: string, sourceType: SourceType, displayName: string) => {
      setIsLoading(true);
      setTweets([]);
      setError(null);
      setCurrentSelection(displayName);
      setShareUrl(null);
      setCopied(false);
      imageQueueRef.current = new Set();

      try {
        const res = await fetch("/api/tweet-storm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ref, sourceType }),
        });
        if (!res.ok) throw new Error("Failed to generate tweet storm");
        const data = await res.json();
        setTweets(data.tweets);
      } catch {
        setError("Failed to load. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleUpdateTweet = useCallback(
    (index: number, updates: Partial<StormTweet>) => {
      setTweets((prev) =>
        prev.map((t, i) => (i === index ? { ...t, ...updates } : t))
      );
    },
    []
  );

  // Async image loading
  useEffect(() => {
    if (tweets.length === 0) return;

    const tweetsNeedingImages = tweets
      .map((t, i) => ({ tweet: t, index: i }))
      .filter(
        ({ tweet, index }) =>
          tweet.needsImage &&
          tweet.imagePrompt &&
          !tweet.imageData &&
          !tweet.imageLoading &&
          !imageQueueRef.current.has(index)
      );

    if (tweetsNeedingImages.length === 0) return;

    const MAX_CONCURRENT = 2;
    let active = 0;
    const queue = [...tweetsNeedingImages];

    const processNext = () => {
      while (active < MAX_CONCURRENT && queue.length > 0) {
        const item = queue.shift()!;
        active++;
        imageQueueRef.current.add(item.index);
        handleUpdateTweet(item.index, { imageLoading: true });

        fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: item.tweet.imagePrompt }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.imageData) {
              handleUpdateTweet(item.index, {
                imageData: data.imageData,
                imageMimeType: data.mimeType,
                imageLoading: false,
              });
            } else {
              handleUpdateTweet(item.index, { needsImage: false, imageLoading: false });
            }
          })
          .catch(() => {
            handleUpdateTweet(item.index, { needsImage: false, imageLoading: false });
          })
          .finally(() => {
            active--;
            processNext();
          });
      }
    };

    processNext();
  }, [tweets, handleUpdateTweet]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (tweets.length === 0) return;
    setIsSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: currentSelection, tweets }),
      });
      if (!res.ok) throw new Error("Failed to share");
      const data = await res.json();
      setShareUrl(data.url);
    } catch {
      setError("Failed to create share link.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const imagesLoading = tweets.some((t) => t.imageLoading);
  const imagesTotal = tweets.filter((t) => t.needsImage).length;
  const imagesDone = tweets.filter((t) => t.needsImage && t.imageData).length;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="print:hidden">
        <MishnahSelector onSelect={handleSelect} isLoading={isLoading} />
      </div>

      <main>
        {/* Info bar with actions */}
        {currentSelection && !isLoading && tweets.length > 0 && (
          <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2.5">
            <div className="max-w-xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-[var(--muted)]">
                  <span className="font-semibold text-[var(--text)]">
                    {currentSelection}
                  </span>{" "}
                  &middot; {tweets.length} tweets
                </p>
                {imagesLoading && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    {imagesDone}/{imagesTotal} images
                  </span>
                )}
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={handleShare}
                  disabled={isSharing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer disabled:opacity-40"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {isSharing ? "Sharing..." : "Share"}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share URL bar */}
        {shareUrl && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 print:hidden">
            <div className="max-w-xl mx-auto flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-sm text-[var(--text)] font-mono"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : null}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="max-w-xl mx-auto mt-4 px-4 print:hidden">
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600 font-medium">
              {error}
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div>
            {Array.from({ length: 6 }, (_, i) => (
              <TweetSkeleton key={i} index={i} />
            ))}
          </div>
        )}

        {/* Tweet feed */}
        {!isLoading && tweets.length > 0 && (
          <div>
            {tweets.map((tweet) => (
              <StormCard key={tweet.id} tweet={tweet} />
            ))}
          </div>
        )}

        {/* Welcome state */}
        {!isLoading && tweets.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)] to-blue-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
              Welcome to MishnahFeed
            </h2>
            <p className="text-[var(--muted)] text-[15px] max-w-md leading-relaxed mb-6">
              Get an engaging tweet storm breakdown of Torah text. Pick your source above — Mishnayos, Gemara, or Chumash/Tanakh — and hit Learn.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)] bg-[var(--card-bg)] px-4 py-2 rounded-full border border-[var(--border)] shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Powered by AI with Orthodox Jewish terminology</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
