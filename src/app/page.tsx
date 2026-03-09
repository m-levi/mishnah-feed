"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Share2, Check, RefreshCw } from "lucide-react";
import { InlinePicker } from "@/components/mishnah-selector";
import { StormCard } from "@/components/storm-card";
import { TweetSkeleton } from "@/components/tweet-skeleton";
import { LearnMoreModal } from "@/components/learn-more-modal";
import type { StormTweet, SourceType } from "@/lib/types";

type TabKey = "foryou" | "mishnayos" | "gemara" | "chumash";

const tabs: { key: TabKey; label: string }[] = [
  { key: "foryou", label: "For You" },
  { key: "mishnayos", label: "Mishnayos" },
  { key: "gemara", label: "Gemara" },
  { key: "chumash", label: "Tanakh" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("foryou");
  const [tweets, setTweets] = useState<StormTweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSelection, setCurrentSelection] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTweet, setSelectedTweet] = useState<StormTweet | null>(null);
  const imageQueueRef = useRef<Set<number>>(new Set());
  const hasAutoLoaded = useRef(false);

  // Auto-load discovery feed on first mount
  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    loadDiscoverFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDiscoverFeed = async () => {
    setIsLoading(true);
    setTweets([]);
    setError(null);
    setCurrentSelection("For You");
    setShareUrl(null);
    setCopied(false);
    imageQueueRef.current = new Set();

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setTweets(data.tweets);
    } catch {
      setError("Failed to load feed. Tap refresh to try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    if (tab === "foryou") {
      loadDiscoverFeed();
    } else {
      // Clear feed — user needs to pick from inline selector
      setTweets([]);
      setError(null);
      setShareUrl(null);
      setCurrentSelection("");
    }
  };

  const handleSelect = useCallback(
    async (
      slug: string,
      ref: string,
      sourceType: SourceType,
      displayName: string
    ) => {
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
        if (!res.ok) throw new Error("Failed to generate");
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
              handleUpdateTweet(item.index, {
                needsImage: false,
                imageLoading: false,
              });
            }
          })
          .catch(() => {
            handleUpdateTweet(item.index, {
              needsImage: false,
              imageLoading: false,
            });
          })
          .finally(() => {
            active--;
            processNext();
          });
      }
    };

    processNext();
  }, [tweets, handleUpdateTweet]);

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

  const showFeed = !isLoading && tweets.length > 0;
  const showEmpty = !isLoading && tweets.length === 0 && activeTab !== "foryou" && !error;
  const imagesLoading = tweets.some((t) => t.imageLoading);
  const imagesTotal = tweets.filter((t) => t.needsImage).length;
  const imagesDone = tweets.filter((t) => t.needsImage && t.imageData).length;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-[var(--card-bg)]/95 backdrop-blur-md border-b border-[var(--border)] no-print"
      >
        {/* Top row: logo + actions */}
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between">
          <h1
            className="text-lg font-semibold text-[var(--text)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MishnahFeed
          </h1>

          <div className="flex gap-0.5">
            {activeTab === "foryou" && (
              <button
                onClick={loadDiscoverFeed}
                disabled={isLoading}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                title="Refresh feed"
              >
                <RefreshCw
                  className={`w-4 h-4 text-[var(--muted)] ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            )}
            {showFeed && (
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg)] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                title="Share"
              >
                <Share2 className="w-4 h-4 text-[var(--muted)]" />
              </button>
            )}
          </div>
        </div>

        {/* Tab row */}
        <div className="max-w-2xl mx-auto flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors cursor-pointer relative ${
                activeTab === tab.key
                  ? "text-[var(--text)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[3px] rounded-full bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inline picker for source tabs */}
      {activeTab !== "foryou" && (
        <InlinePicker
          sourceType={activeTab as SourceType}
          onSelect={handleSelect}
          isLoading={isLoading}
        />
      )}

      {/* Feed info bar */}
      {showFeed && currentSelection && (
        <div className="bg-[var(--card-bg)] border-b border-[var(--border)] px-4 py-2">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <p className="text-sm text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)]">
                {currentSelection}
              </span>
              {" "}&middot; {tweets.length} tweets
            </p>
            {imagesLoading && (
              <span className="text-[11px] text-[var(--accent)] bg-[var(--accent-light)] px-2 py-0.5 rounded-full font-medium">
                {imagesDone}/{imagesTotal} images
              </span>
            )}
          </div>
        </div>
      )}

      {/* Share URL bar */}
      {shareUrl && (
        <div className="bg-[var(--accent-light)] border-b border-[var(--accent-muted)] px-4 py-2.5 no-print">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--accent-muted)] bg-[var(--card-bg)] text-sm text-[var(--text)] font-mono"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-semibold cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : null}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto mt-4 px-4 no-print">
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

      {/* Empty state for source tabs */}
      {showEmpty && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-[var(--muted)] text-[15px]">
            Pick a text above and tap <strong className="text-[var(--text)]">Go</strong> to generate a feed
          </p>
        </div>
      )}

      {/* Feed */}
      {showFeed && (
        <div>
          {tweets.map((tweet, i) => (
            <div
              key={tweet.id}
              className="fade-in"
              style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
            >
              <StormCard tweet={tweet} onTap={setSelectedTweet} />
            </div>
          ))}
        </div>
      )}

      {/* Learn more modal */}
      {selectedTweet && (
        <LearnMoreModal
          tweet={selectedTweet}
          onClose={() => setSelectedTweet(null)}
        />
      )}
    </div>
  );
}
